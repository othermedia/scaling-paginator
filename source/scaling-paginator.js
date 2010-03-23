ScalingPaginator = new JS.Class('ScalingPaginator', {
    include: [JS.State, Ojay.Observable],
    
    initialize: function(subject, options) {
        this._selector = subject;
        
        options = this._options = options || {};
        options.perPage    = options.perPage    || this.klass.PER_PAGE;
        options.scrollTime = options.scrollTime || this.klass.SCROLL_TIME;
        options.pushFade   = options.pushFade   || this.klass.PUSH_FADE_TIME;
        options.pushSlide  = options.pushSlide  || this.klass.PUSH_SLIDE_TIME;
        options.direction  = options.direction  || this.klass.DIRECTION;
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
            return this.getLeftPages().length > 1;
        }
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
            return this.getRightPages().length > 1;
        }
    },
    
    getLeftPages: function() {
        var left  = this._elements.slice(0, this.position.index + 1).reverse(),
            pages = this.makePages(left).reverse();
        
        return pages.map(function(p) { return p.reverse(); });
    },
    
    getRightPages: function() {
        var right = this._elements.slice(this.position.index + 1),
            pages = this.makePages(right);
        
        return pages;
    },
    
    /**
     * Splits the elements of the paginator up into 'pages' based on the width
     * of the container and the width of the available elements.
     */
    makePages: function(elements) {
        var containerWidth = this._wrapper.getWidth(),
            pageWidth      = 0;
        
        return (elements || []).reduce(function(pages, element) {
            pageWidth += element.getWidth();
            
            if (pageWidth > containerWidth) {
                pageWidth = 0;
                pages.push([element]);
            } else {
                pages[pages.length - 1].push(element);
            }
            
            return pages;
        }.bind(this), [[]]);
    },
    
    /**
     * Calculates the distance right or left which the container should be
     * offset by in order to position it according to the index and alignment
     * provided.
     */
    getOffset: function(position) {
        var index = position.index,
            ends  = position.align === 'left' ? [0, index] : [index + 1];
        return [].slice.apply(this._elements, ends).reduce(function(o, e) {
            return o - e.getWidth();
        }, 0);
    },
    
    states: {
        READY: {
            previous: function() {
                var pages = this.getLeftPages(),
                    align, last, index;
                
                if (pages.length < 1) return;
                
                align = pages.length === 1 ? 'left' : this.position.align;
                last  = pages[pages.length - 1];
                index = this.position.index - last.length;
                
                this.setPosition({
                    align: align,
                    index: index
                });
            },
            
            next: function() {
                var pages = this.getRightPages(),
                    align, first, index;
                
                if (pages.length < 1) return;
                
                align = pages.length === 1 ? 'right' : this.position.align;
                first = pages[0];
                index = this.position.index + first.length;
                
                this.setPosition({
                    align: align,
                    index: index
                });
            },
            
            setPosition: function(position) {
                var thisAlign = this.position.align,
                    thisIndex = this.position.index,
                    align     = position.align,
                    index     = position.index,
                    animation = {};
                
                if (align === thisAlign && index === thisIndex)  return;
                if (index < 0 || index >= this._elements.length) return;
                
                // If changing the direction of alignment, we need to unset any
                // existing 'left' or 'right' property (as appropriate) on the
                // elements' container so as to avoid positioning clashes and
                // give a base offset to animate from.
                if (align !== thisAlign) {
                    var style = {};
                    style[thisAlign] = '';
                    style[align] = this.getOffset(this.position) + 'px';
                    this._container.setStyle(style);
                }
                
                animation[align] = {to: this.getOffset(position)};
                
                this.setState('SCROLLING');
                
                return this._container.animate(animation, this._options.scrollTime)
                ._(function() {
                    this.position = position;
                    this.setState('READY');
                    
                    if (typeof callback === 'function') {
                        callback.call(scope || null, this, this.position);
                    }
                    
                    this.notifyObservers('positionChange', this.position);
                    
                    if (thisAlign !== align) {
                        this.notifyObservers('directionChange', align);
                    }
                }.bind(this));
            },
            
            addControls: function(klass) {
                var controls = new (klass || this.klass.Controls)(this);
                this._wrapper.insert(controls.getHTML(), 'after');
                return controls;
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
                
                this._pageWidth = r.pageWidth * this._options.perPage;
                
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
    
    extend: {
        PER_PAGE:        5,
        SCROLL_TIME:     0.5,
        PUSH_FADE_TIME:  0.3,
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
                
                var html, prev, next;
                
                html = Ojay(Ojay.HTML.div({className: 'paginator-controls horizontal'}, function(H) {
                    prev = Ojay(H.div({className: 'previous'}, 'Previous'));
                    next = Ojay(H.div({className: 'next'}, 'Next'));
                }));
                
                [prev, next].forEach(function(ctrl) {
                    ctrl.on('mouseover').addClass('hovered');
                    ctrl.on('mouseout').removeClass('hovered');
                });
                
                prev.on('click', this.previous, this);
                next.on('click', this.next, this);
                
                this.paginator.on('positionChange', this._checkDisabled, this);
                Ojay(window).on('resize', this._checkDisabled, this);
                
                this._previous = prev;
                this._next     = next;
                
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
