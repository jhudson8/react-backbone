This is a progressive tutorial demonstrating managed events and mixin dependencies.

In a perfect world, responsive design can be handled only using CSS and media queries.  But sometimes, you need to render differently based on a device profile.  We will create a mixin which will set a state attribute called ```profile``` which will either have the value of ```large``` or ```small``` depending on the width of the component.


### Running the examples
The source code can be found for each step in this tutorial in the [current directory](./).  To run each example, download the code and ```cd``` into an individual step and run

```
  npm install
  webpack-dev-server
```

then browse to [http://localhost:8080](http://localhost:8080)


### Step 1: baseline

As a baseline, we'll create a component which contains all the code to listen for window resize events and set a state value accordingly so that the component will render when the window resizes.

[view source](./step1/example.js)

In this first pass, the ```onResize``` callback will be executed any time the resize event is triggered.  This is not ideal so we will handle that in the next step.

While this isn't an extreme amount of code, it clouds the component logic, is cumbersome and has potential for memory leaks considering the manual window event bindings.


### Step 2: Throttle the resize listener

[view source](./step2/example.js)

Throttle the resize handler and keep a reference to the throttled callback function so we can properly unbind.

```javascript
    componentDidMount: function() {

      var resizeListener = _.throttle(this.onResize, 300);
      window.addEventListener('resize', resizeListener);

      // so we can keep a reference to the callback to unbind
      this.state.resizeListener = resizeListener;
    },
```

and unbind our throttled listener callback.

```javascript
    componentWillUnmount: function() {
      window.removeEventListener('resize', this.state.resizeListener);
    },
```


### Step 3: Create a mixin using react-backbone managed event bindings

[view source](./step3/example.js)

We are now going to [register a mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-mixin-manager?focus=outline) using [managed events](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-events?focus=outline).

We no longer have to worry about unbinding our resize listener.  We will also be using the [throttle callback wrapper](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/*throttle?focus=outline).

```javascript
    // simple function to return the state object that contains the "profile" value
    function getStateValues (self) {
      var width = $(self.getDOMNode()).width();
      return {
        profile: width > 600 ? 'large' : 'small'
      };
    }

    // this mixin *should* live in a separate file thus making the actual component code *very* simple
    React.mixins.add('responsive', {

      // the "manageEvents" method is available because we import the "events" mixin
      mixins: ['events'],

      getInitialState: function() {

        // throttle an event handler every 300 ms which is bound to the "resize" window event
        this.manageEvents({
          '*throttle(300)->window:resize': function() {
            this.setState(getStateValues(this));
          }
        });

        // make a guess which will be replaced when the component is mounted
        return { profile: 'large' };
      },

      componentDidMount: function() {
        this.setState(getStateValues(this));
      }
    });


    // MEANINGFUL COMPONENT CODE
    // notice how easy it is to see what this component is doing now
    var TestComponent = React.createClass({
      mixins: ['responsive'],

      render: function() {
        return <div>{this.state.profile}</div>
      }
    });
```


### Step 4: Allow components to set the responsive breakpoint

[view source](./step4/example.js)

```react-backbone``` mixins have the ability to [accept parameters](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-mixin-manager/section/Advanced%20Features/Mixins%20With%20Parameters?focus=outline) defined by the components that reference them.

Refactor our utility function to allow the width to be provided

```javascript
    function getStateValues (size, self) {
      var width = $(self.getDOMNode()).width();
      return {
        profile: width > size ? 'large' : 'small'
      };
    }
```

Wrap the mixin definition in a function callback which accepts a paramter (the responsive breakpoint width).

```javascript
    // instead of using a standard object for the mixin attributes, we can use a function
    // which returns the object to allow us to reference the function parameters in our mixin
    React.mixins.add('responsive', function(size) {
      size = size || 600;

      return {
        mixins: ['events'],

        getInitialState: function() {
          this.manageEvents({
            '*throttle(300)->window:resize': function() {
              this.setState(getStateValues(size, this));
            }
        ...
```

Provide the mixin parameter when we create our component class

```javascript
    var TestComponent = React.createClass({
      // now the component width breakpoint will be at 500px
      mixins: ['responsive(500)'],

      render: function() {
        return <div>{this.state.profile}</div>
      }
    });
```

The component code is now very simple and declaritive using mixins with parameters.


### All done

All done but there is so much more you can do.  Check out some of the [other managed events](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-events/api/Event%20Binding%20Definitions?focus=outline) or [event callback wrappers](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/api/Event%20Binding%20Definitions?focus=outline).
