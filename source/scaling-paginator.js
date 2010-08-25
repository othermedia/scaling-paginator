ScalingPaginator = new JS.Class('ScalingPaginator', {
    include: [JS.State, Ojay.Observable],
    
    initialize: function(subject, options) {
        this._selector = subject;
        
        this._options = options = options || {};
        options.scrollTime = options.scrollTime || this.klass.SCROLL_TIME;
        options.pushFade   = options.pushFade   || this.klass.PUSH_FADE_TIME;
        options.pushSlide  = options.pushSlide  || this.klass.PUSH_SLIDE_TIME;
        options.direction  = (options.direction || this.klass.DIRECTION).toLowerCase();
        options.easing     = options.easing     || this.klass.EASING;
        
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
        return this.getWidth() <= this.getViewportWidth();
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
    
    /**
     * Splits the elements of the paginator up into 'pages' based on the width
     * of the container and the width of the available elements.
     */
    makePages: function(elements) {
        var containerWidth = this.getViewportWidth(),
            pageWidth      = 0;
        
        return (elements || []).reduce(function(pages, element) {
            var elementWidth = element.getWidth();
            
            pageWidth += elementWidth;
            
            if (pageWidth > containerWidth) {
                pageWidth = elementWidth;
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
            ends  = position.align === 'left' ? [0, index] : [index + 1];
        return Array.prototype.slice.apply(this._elements, ends).reduce(function(o, e) {
            return o - e.getWidth();
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
                var thisAlign = this.position.align,
                    thisIndex = this.position.index,
                    align     = position.align,
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
                    offset = this.getWidth() -
                             this.getViewportWidth() +
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
                
                style = {width: this.getWidth() + 'px'};
                style[this.position.align] = this.getOffset(this.position) + 'px';
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
                    if (last) self.position.index = self._elements.length - 1;
                    self._elements.pop();
                    var style = {width: self.getWidth() + 'px'};
                    style[self.position.align] = self.getOffset(self.position) + 'px';
                    if (self.hasSinglePage() && !onLastPage) {
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
                
                style = {width: this.getWidth() + 'px'};
                style[this.position.align] = this.getOffset(this.position) + 'px';
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
                    if (last) self.position.index = 0;
                    self._elements.shift();
                    var style = {width: self.getWidth() + 'px'};
                    style[self.position.align] = self.getOffset(self.position) + 'px';
                    if (self.hasSinglePage() && !onFirstPage) {
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
                
                this.position = {
                    align: 'left',
                    index: 0
                };
                
                var r = this.getRegion(),
                    x = r.width,
                    y = r.pageHeight;
                
                this._wrapper = Ojay(Ojay.HTML.div({className: 'paginator horizontal'}));
                
                this._wrapper.setStyle({
                    overflow: 'hidden',
                    position: 'relative',
                    height:   y + 'px',
                    margin:  0,
                    border:  'none',
                    padding: 0
                });
                
                this._container.setStyle({
                    position: 'absolute',
                    width:    x + 'px',
                    height:   y + 'px'
                });
                
                this._container.insert(this._wrapper, 'before');
                this._wrapper.insert(this._container);
                
                Ojay(window).on('resize', this._right, this);
                
                this.setState('READY');
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
            
            region.width += x;
            
            if (x > region.pageWidth) {
                region.pageWidth = x;
            }
            
            if (y > region.pageHeight) {
                region.pageHeight = y;
            }
            
            return region;
        }, {width: 0, pageHeight: 0, pageWidth: 0});
    },

    
    getWidth: function() {
        return this.getRegion().width;
    },
    
    getHeight: function() {
        return this.getRegion().height;
    },
    
    getViewportWidth: function() {
        return this._wrapper.getWidth();
    },
    
    extend: {
        SCROLL_TIME:     0.5,
        PUSH_FADE_TIME:  0.5,
        PUSH_SLIDE_TIME: 0.3,
        DIRECTION:       'horizontal',
        EASING:          'default',
        
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
