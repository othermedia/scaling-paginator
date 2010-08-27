ScalingPaginator = new JS.Class('ScalingPaginator', {
    include: [JS.State, Ojay.Observable],
    
    initialize: function(subject, options) {
        this._selector = subject;
        
        this._options = options = options || {};
        options.scrollTime    = options.scrollTime    || this.klass.SCROLL_TIME;
        options.pushFade      = options.pushFade      || this.klass.PUSH_FADE_TIME;
        options.pushSlide     = options.pushSlide     || this.klass.PUSH_SLIDE_TIME;
        options.direction     = (options.direction    || this.klass.DIRECTION).toLowerCase();
        options.easing        = options.easing        || this.klass.EASING;
        options.fitToViewport = options.fitToViewport || this.klass.FIT_VIEWPORT;
        
        if (typeof options.offsets == 'object') {
            options.offsts = ['top', 'right', 'bottom', 'left'].reduce(function(offsets, side) {
                offsets[side] = options.offsets[side] || this.klass.OFFSETS[side];
                return offsets;
            }.bind(this), {});
        } else {
            options.offsets = this.klass.OFFSETS;
        }
        
        this.setState('CREATED');
    },
    
    /**
     * If the paginator is aligned to the left, we can determine whether there
     * are pages to the left quite cheaply by checking the index; otherwise,
     * we need to do some more expensive calculations.
     */
    hasLeft: function() {
        if (this.position.align === 'left') {
            return this.position.index > 0;
        } else {
            return this.getLeftPages().length > 0;
        }
    },
    
    onFirstPage: function() {
        return this.position.align == 'left' && !this.hasLeft();
    },
    
    /**
     * Similarly to `hasLeft`, if the paginator is aligned to the right it's
     * easy to determine whether there are pages to the right; otherwise, we
     * need to use the `getRightPages` method to split the available elements
     * into pages.
     */
    hasRight: function() {
        if (this.position.align === 'right') {
            return this.position.index < this._elements.length - 1;
        } else {
            return this.getRightPages().length > 0;
        }
    },
    
    onLastPage: function() {
        return this.position.align == 'right' && !this.hasRight();
    },
    
    hasSinglePage: function() {
        return this.getSize() <= this.getViewportSize();
    },
    
    getLeftPages: function() {
        var leftAligned = this.position.align === 'left',
            index       = this.position.index,
            left, pages;
        
        if (!leftAligned) index += 1;
        
        left  = this._elements.slice(0, index).reverse();
        pages = this.makePages(left).reverse();
        
        if (!leftAligned) pages.pop();
        
        return pages.map(function(p) { return p.reverse(); });
    },
    
    getRightPages: function() {
        var right = this._elements.slice(this.position.index),
            pages = this.makePages(right);
        
        if (this.position.align !== 'right') pages.shift();
        
        return pages;
    },
    
    getVisibleElements: function() {
        var rightAligned = this.position.align == 'right',
            elements     = rightAligned ?
                               this._elements.slice(0, this.position.index) :
                               this._elements.slice(this.position.index),
            pages        = this.makePages(elements),
            currentPage  = pages[rightAligned ? pages.length - 1 : 0],
            nextPage, nextItem;
        
        if (!currentPage) return [];
        
        if ((nextPage = pages[rightAligned ? pages.length - 2 : 1]) &&
            (nextItem = nextPage[rightAligned ? nextPage.length - 1 : 0])) {
            currentPage.push(nextItem);
        }
        
        return currentPage;
    },
    
    elementVisible: function(element) {
        return this.getVisibleElements().indexOf(element) > -1;
    },
    
    /**
     * Splits the elements of the paginator up into 'pages' based on the width
     * of the container and the width of the available elements.
     */
    makePages: function(elements) {
        var containerSize = this.getViewportSize(),
            pageSize = 0, self = this;
        
        return (elements || []).reduce(function(pages, element) {
            var elementSize = element[self.getSizeMethod()]();
            
            pageSize += elementSize;
            
            if (pageSize > containerSize) {
                pageSize = elementSize;
                pages.push([element]);
            } else {
                pages[pages.length - 1].push(element);
            }
            
            return pages;
        }, [[]]);
    },
    
    /**
     * Calculates the distance right or left which the container should be
     * offset by in order to position it according to the index and alignment
     * provided.
     */
    getOffset: function(position) {
        var index = position.index,
            ends  = position.align === 'left' ? [0, index] : [index + 1],
            self  = this;
        return Array.prototype.slice.apply(this._elements, ends).reduce(function(o, e) {
            return o - e[self.getSizeMethod()]();
        }, 0);
    },
    
    states: {
        READY: {
            previous: function() {
                var pages = this.getLeftPages(),
                    align, last, index;
                
                if (pages.length < 1) return;
                
                if (pages.length === 1) {
                    align = 'left';
                    index = 0;
                } else {
                    last  = pages[pages.length - 1];
                    align = this.position.align;
                    index = this.position.index - last.length;
                }
                
                this.setPosition({
                    align: align,
                    index: index
                });
            },
            
            next: function() {
                var pages = this.getRightPages(),
                    align, first, index;
                
                if (pages.length < 1) return;
                
                if (pages.length === 1) {
                    align = 'right';
                    index = this._elements.length - 1;
                } else {
                    first = pages[0];
                    align = this.position.align;
                    index = this.position.index + first.length;
                }
                
                this.setPosition({
                    align: align,
                    index: index
                });
            },
            
            setPosition: function(position, options) {
                var thisAlign = this.getAlign(this.position.align),
                    thisIndex = this.position.index,
                    align     = this.getAlign(position.align),
                    index     = position.index,
                    animation = {},
                    style, offset, animTime;
                
                options = options || {};
                
                if ((align === thisAlign && index === thisIndex) ||
                    (index < 0 || index >= this._elements.length)) return this;
                
                // If changing the direction of alignment, we need to unset any
                // existing 'left' or 'right' property (as appropriate) on the
                // elements' container so as to avoid positioning clashes and
                // give a base offset to animate from.
                if (align !== thisAlign) {
                    style  = {};
                    offset = this.getSize() -
                             this.getViewportSize() +
                             this.getOffset(this.position);
                    style[thisAlign] = '';
                    style[align] = -offset + 'px';
                    this._container.setStyle(style);
                }
                
                animTime = typeof options.animTime == 'number' ?
                    options.animTime : this._options.scrollTime;
                animation[align] = {to: this.getOffset(position)};
                
                this.setState('SCROLLING');
                
                return this._container.animate(animation, animTime)._(function() {
                    this.position = position;
                    this.setState('READY');
                    
                    if (typeof callback === 'function') {
                        callback.call(scope || null, this, this.position);
                    }
                    
                    if (options.silent !== true) {
                        this.notifyObservers('positionChange', this.position);
                        if (thisAlign !== align) this.notifyObservers('directionChange', align);
                    }
                }.bind(this))._(this);
            },
            
            addControls: function(klass) {
                var controls = new (klass || this.klass.Controls)(this);
                this._wrapper.insert(controls.getHTML(), 'after');
                return controls;
            },
            
            push: function(item) {
                var onLastPage = this.onLastPage(), hasSinglePage, style;
                
                item = Ojay(item);
                this._elements.push(item);
                if (!onLastPage && (hasSinglePage = this.hasSinglePage())) {
                    item.setStyle({opacity: 0});
                }
                this._container.insert(item, 'bottom');
                
                style = {};
                style[this.getDirectionProperty()] = this.getSize() + 'px';
                style[this.getAlign(this.position.align)] = this.getOffset(this.position) + 'px';
                this._container.setStyle(style);
                
                if (onLastPage) {
                    item.setStyle({opacity: 0});
                    this.setPosition({align: 'right', index: this._elements.length - 1},
                        {animTime: this._options.pushSlide})
                    ._(item).animate({opacity: {to: 1}}, this._options.pushFade);
                } else {
                    if (hasSinglePage) item.animate({opacity: {to: 1}}, this._options.pushFade);
                    this.notifyObservers('positionChange', this.position);
                }
                
                return this;
            },
            
            pop: function() {
                var popped     = this._elements[this._elements.length - 1],
                    onLastPage = this.onLastPage(),
                    self = this, reset;
                
                if (!popped) return;
                
                reset = function(last) {
                    var elementVisible = self.elementVisible(popped),
                        style          = {};
                    
                    self._elements.pop();
                    if (last) self.position.index = self._elements.length - 1;
                    
                    style[self.getDirectionProperty()] = self.getSize() + 'px';
                    style[self.getAlign(self.position.align)] = self.getOffset(self.position) + 'px';
                    
                    if (elementVisible) {
                        popped.animate({opacity: {from: 1, to: 0}}, self._options.pushFade).remove()
                        ._(function() {
                            self._container.setStyle(style);
                            self.notifyObservers('positionChange', self.position);
                        });
                    } else {
                        popped.remove();
                        self._container.setStyle(style);
                        self.notifyObservers('positionChange', self.position);
                    }
                };
                
                if (onLastPage && this._elements.length > 1) {
                    popped.animate({opacity: {from: 1, to: 0}}, this._options.pushFade)
                    ._(this).setPosition({align: 'right', index: this._elements.length - 2},
                        {silent: true, animTime: this._options.pushSlide})
                    ._(reset.partial(true));
                } else {
                    reset();
                }
                
                return popped;
            },
            
            unshift: function(item) {
                var onFirstPage = this.onFirstPage(), hasSinglePage, style;
                
                item = Ojay(item);
                this._elements.unshift(item);
                if (!onFirstPage && (hasSinglePage = this.hasSinglePage())) {
                    item.setStyle({opacity: 0});
                }
                this._container.insert(item, 'top');
                this.position.index += 1;
                
                style = {};
                style[this.getDirectionProperty()] = this.getSize() + 'px';
                style[this.getAlign(this.position.align)] = this.getOffset(this.position) + 'px';
                this._container.setStyle(style);
                
                if (onFirstPage) {
                    item.setStyle({opacity: 0});
                    this.setPosition({align: 'left', index: 0},
                        {animTime: this._options.pushSlide})
                    ._(item).animate({opacity: {to: 1}}, this._options.pushFade);
                } else {
                    if (hasSinglePage) item.animate({opacity: {to: 1}}, this._options.pushFade);
                    this.notifyObservers('positionChange', this.position);
                }
                
                return this;
            },
            
            shift: function() {
                var shifted     = this._elements[0],
                    onFirstPage = this.onFirstPage(),
                    self = this, reset;
                
                if (!shifted) return;
                
                reset = function(last) {
                    var elementVisible = self.elementVisible(shifted),
                        style          = {};
                    
                    self._elements.shift();
                    if (last) self.position.index = 0;
                    
                    style[self.getDirectionProperty()] = self.getSize() + 'px';
                    style[self.getAlign(self.position.align)] = self.getOffset(self.position) + 'px';
                    
                    if (elementVisible) {
                        shifted.animate({opacity: {from: 1, to: 0}}, self._options.pushFade).remove()
                        ._(function() {
                            self._container.setStyle(style);
                            self.notifyObservers('positionChange', self.position);
                        });
                    } else {
                        shifted.remove();
                        self._container.setStyle(style);
                        self.notifyObservers('positionChange', self.position);
                    }
                };
                
                if (onFirstPage && this._elements.length > 1) {
                    shifted.animate({opacity: {from: 1, to: 0}}, this._options.pushFade)
                    ._(this).setPosition({align: 'left', index: 1},
                        {silent: true, animTime: this._options.pushSlide})
                    ._(reset.partial(true));
                } else {
                    reset();
                }
                
                return shifted;
            },
            
            resize: function() {
                var portsize     = this._options.fitToViewport ?
                        Ojay.getViewportSize() : this._wrapper.parents().getRegion(),
                    direction    = this.getDirectionProperty(),
                    style        = {};
                
                if (this._options.direction == 'vertical') {
                    style.height = portsize.height -
                                   this._options.offsets.top -
                                   this._options.offsets.bottom + 'px';
                } else {
                    style.width = portsize.width -
                                  this._options.offsets.left -
                                  this._options.offsets.right + 'px';
                }
                
                this._wrapper.setStyle(style);
                
                return this;
            }
        },
        
        /**
         * State-changing operations shouldn't be possible while the paginator
         * is scrolling.
         */
        SCROLLING: {},
        
        CREATED: {
            setup: function() {
                this._container = Ojay(this._selector);
                this._elements  = this._container.children().map(Ojay);
                this.position   = {align: 'left', index: 0};
                
                var style = {
                    overflow:     'hidden',
                    position:     'relative',
                    marginTop:    0,
                    marginRight:  0,
                    marginBottom: 0,
                    marginLeft:   0,
                    border:       'none',
                    padding:      0
                }, r = this.getRegion(), x, y;
                
                if (this._options.direction == 'vertical') {
                    x = r.pageWidth;
                    y = r.height;
                    style['width']  = x + 'px';
                    style['height'] = this._container.getHeight() + 'px';
                    style.marginTop    = this._options.offsets.top  + 'px';
                    style.marginBottom = this._options.offsets.top + 'px';
                } else {
                    x = r.width;
                    y = r.pageHeight;
                    style['height'] = y + 'px';
                    style['width']  = 'auto';
                    style.marginLeft  = this._options.offsets.left + 'px';
                    style.marginRight = this._options.offsets.right + 'px';
                }
                
                this._wrapper = Ojay(Ojay.HTML.div({className: 'paginator ' + this._options.direction}));
                
                this._wrapper.setStyle(style);
                
                this._container.setStyle({
                    position: 'absolute',
                    width:    x + 'px',
                    height:   y + 'px',
                    top:      0,
                    left:     0
                });
                
                this._container.insert(this._wrapper, 'before');
                this._wrapper.insert(this._container);
                
                Ojay(window).on('resize', this.resize, this);
                
                this.setState('READY');
                this.resize();
            },
            
            getHTML: function() {
                return this.setup();
            }
        }
    },
    
    getHTML: function() {
        return this._wrapper;
    },
    
    getRegion: function() {
        return this._elements.reduce(function(region, item) {
            item = Ojay(item);
            
            var x = item.getWidth(), y = item.getHeight();
            
            region.width  += x;
            region.height += y;
            
            if (x > region.pageWidth) {
                region.pageWidth = x;
            }
            
            if (y > region.pageHeight) {
                region.pageHeight = y;
            }
            
            return region;
        }, {height: 0, width: 0, pageHeight: 0, pageWidth: 0});
    },
    
    getSize: function() {
        return this.getRegion()[this._options.direction == 'vertical' ? 'height' : 'width'];
    },
    
    getViewportSize: function() {
        return this._wrapper[this.getSizeMethod()]();
    },
    
    getDirectionProperty: function() {
        return this._options.direction == 'vertical' ? 'height' : 'width';
    },
    
    getSizeMethod: function() {
        return this._options.direction == 'vertical' ? 'getHeight' : 'getWidth';
    },
    
    getAlign: function(align) {
        if (this._options.direction != 'vertical') {
            return align;
        } else {
            return align == 'right' ? 'bottom' : 'top';
        }
    },
    
    extend: {
        SCROLL_TIME:     0.5,
        PUSH_FADE_TIME:  0.5,
        PUSH_SLIDE_TIME: 0.3,
        DIRECTION:       'horizontal',
        EASING:          'default',
        OFFSETS:         {top: 0, right: 0, bottom: 0, left: 0},
        FIT_VIEWPORT:    false,
        
        Controls: new JS.Class('ScalingPaginator.Controls', {
            initialize: function(paginator) {
                this.paginator = paginator;
            },
            
            previous: function() {
                this.paginator.previous();
            },
            
            next: function() {
                this.paginator.next();
            },
            
            getHTML: function() {
                if (this._html) return this._html;
                
                var self = this, html, prev, next;
                
                html = Ojay(Ojay.HTML.div({className: 'paginator-controls horizontal'}, function(H) {
                    self._previous = prev = Ojay(H.div({className: 'previous'}, 'Previous'));
                    self._next     = next = Ojay(H.div({className: 'next'}, 'Next'));
                }));
                
                [prev, next].forEach(function(ctrl) {
                    ctrl.on('mouseover').addClass('hovered');
                    ctrl.on('mouseout').removeClass('hovered');
                });
                
                prev.on('click', this.previous, this);
                next.on('click', this.next, this);
                
                this.paginator.on('positionChange', this._checkDisabled, this);
                Ojay(window).on('resize', this._checkDisabled, this);
                
                this._checkDisabled();
                
                return this._html = html;
            },
            
            _checkDisabled: function() {
                this._previous[this.paginator.hasLeft() ? 'removeClass' : 'addClass']('disabled');
                this._next[this.paginator.hasRight() ? 'removeClass' : 'addClass']('disabled');
            }
        })
    }
});
