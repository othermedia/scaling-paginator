ScalingPaginator = new JS.Class('ScalingPaginator', {
    include: [JS.State, Ojay.Observable],
    
    initialize: function(subject, options) {
        this._selector = subject;
        this._elements = {};
        
        options = this._options = options || {};
        options.perPage    = options.perPage    || this.klass.PER_PAGE;
        options.scrollTime = options.scrollTime || this.klass.SCROLL_TIME;
        options.pushFade   = options.pushFade   || this.klass.PUSH_FADE_TIME;
        options.pushSlide  = options.pushSlide  || this.klass.PUSH_SLIDE_TIME;
        options.direction  = options.direction  || this.klass.DIRECTION;
        options.easing     = options.easing     || this.klass.EASING;
        
        this.setState('CREATED');
    },
    
    getHTML: function() {
        return this._wrapper;
    },
    
    getRegion: function() {
        return this._items.reduce(function(region, item) {
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
    
    states: {
        CREATED: {
            setup: function() {
                this._container = Ojay(this._selector);
                this._items     = this._container.children().toArray();
                this._pages     = (this._items.length / this._options.perPage).ceil();
                this._page      = 0;
                
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
        },
        
        READY: {
            setPage: function(page, callback, scope) {
                if (page < 0 || (page > this._page && this.right() < 1)) return;
                
                this.setState('SCROLLING');
                this._container.animate({
                    left: {
                        to: -(this._pageWidth * page)
                    }
                }, this._options.scrollTime)
                ._(function() {
                    this._page = page;
                    this.setState('READY');
                    
                    if (typeof callback === 'function') {
                        callback.call(scope || null, this, this._page);
                    }
                    
                    this.notifyObservers('page', this._page);
                }.bind(this));
            },
            
            previous: function() {
                this.setPage(this._page - 1);
            },
            
            next: function() {
                this.setPage(this._page + 1);
            },
            
            addControls: function(klass) {
                var controls = new (klass || this.klass.Controls)(this);
                this._wrapper.insert(controls.getHTML(), 'after');
                return controls;
            }
        },
        
        SCROLLING: {}
    },
    
    left: function() {
        return this._page;
    },
    
    right: function() {
        var pageWidth      = this._pageWidth,
            containerWidth = this.getWidth(),
            viewportWidth  = this._wrapper.getWidth(),
            leftOffset     = this._page * pageWidth,
            availableWidth = containerWidth - viewportWidth - leftOffset,
            availablePages = (availableWidth / pageWidth).ceil();
        
        return availablePages;
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
                
                this.paginator.on('page', this._checkDisabled, this);
                Ojay(window).on('resize', this._checkDisabled, this);
                
                this._previous = prev;
                this._next     = next;
                
                this._checkDisabled();
                
                return this._html = html;
            },
            
            _checkDisabled: function() {
                this._previous[this.paginator.left() === 0 ? 'addClass' : 'removeClass']('disabled');
                this._next[this.paginator.right() === 0 ? 'addClass' : 'removeClass']('disabled');
            }
        })
    }
});
