Scaling Paginator
=================

This library provides a paginator which scales to fill its container. It can be
used to create user interfaces which scale to fill the entire browser viewport.

Its API is similar to that of [Ojay's `Paginatable` module][paginateable], and
it is described in detail below.


Creating your document
----------------------

The HTML required for a scaling paginator is relatively trivial; all that's
needed is a container element and some child elements, which will become the
items of the paginator. Ideally they should have fixed widths and heights;
however, these values can be heterogenous. For horizontal paginators, items
should be floated left.

    <div id="items">
        <img alt="Item 1" src="item1.jpg">
        <img alt="Item 2" src="item2.jpg">
        <img alt="Item 3" src="item3.jpg">
        <img alt="Item 4" src="item4.jpg">
        <img alt="Item 5" src="item5.jpg">
    </div>

Don't add margins, borders or padding to the container, as they will be
removed.


Setting up a paginator
----------------------

To set up a `ScalingPaginator`, you need to specify the container, either as a
CSS selector, a DOM reference or an Ojay collection. You can also pass in an
options object; see the next section for the available configuration options.
Once you have created your paginator, it needs to be initialised by running the
`setup` method.

    var pager = new ScalingPaginator('#items', {
        direction:  'horizontal',
        scrollTime: 0.75
    });
    pager.setup();

To add a set of controls,

    pager.addControls();


Options
-------

The `ScalingPaginator` class has a number of options which can be set when an
instance of the class is created. All options have a default value, and the
options parameter is itself not required by the constructor.

### `direction`

Scaling paginators can be oriented either vertically or horizontally. To select
a direction, pass in either `vertical` or `horizontal` as the value of the
`direction` property of the options object. The default orientation is
horizontal.

### `offsets`

This option allows one to set `top`, `right`, `bottom` and `left` amounts that
the container should be offset by from the browser viewport. It has the effect
of setting margins of those values, in pixels, and provides a way to create
space for controls etc. The `offsets` option should be an object with zero or
more side properties, e.g.

    {
        top:    20,
        right:  150,
        bottom: 10,
        left:   100
    }

### `scrollTime`

This option sets how long it should take to animate from one page to another.
The value should be a number, representing the time in seconds (e.g. `1.5`
means 1.5 seconds). The default is 0.5 seconds.

### `easing`

The easing function to use when animating from one page to another. The list of
available easing functions can be seen in the
[YAHOO.util.Easing documentation][easing]. The default is `easeBoth`.

### `pushSlide`

The amount of time the slide animation takes when shifting existing elements of
a paginator along to add a new element. The default is 0.5 seconds.

### `pushFade`

The amount of time it takes to fade in a new element of a paginator. The
default is 0.3 seconds.

  [paginateable]: http://ojay.othermedia.org/articles/paginator.html
  [easing]:       http://developer.yahoo.com/yui/docs/YAHOO.util.Easing.html
