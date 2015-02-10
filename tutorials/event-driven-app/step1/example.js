// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);

// our event bus
var EventBus = _.clone(Backbone.Events);


// COMPONENTS

// ComponentA will listen to the global event bus for an event triggered by ComponentB (b:clicked)
// and will listen for an event from a child component (child:clicked)
var ComponentA = React.createClass({

  componentDidMount: function() {
    // bind to the event bus to call our method onComponentBClicked when the global event "b:clicked" is triggered
    EventBus.on('b:clicked', this.onComponentBClicked);

    // bind to our child component "child:clicked" event
    // this won't even deal with the case if the child component changes on a re-render so keep
    // in mind that there is additional effort for an apples-to-apples comparision that we are skipping for this tutorial
    this.refs.child.on('clicked', this.onChildClicked);
  },
  componentWillUnmount: function() {
    EventBus.off('b:clicked', this.onComponentBClicked);
  },

  render: function() {
    return (
      <div>
        <Component1Child ref="child"/>
      </div>
    );
  },

  onComponentBClicked: function() {
    alert('component B is clicked');
  },

  onChildClicked: function(eventParam) {
    alert('child was clicked; the event param is "' + eventParam + '"');
  }
});


// this is the child component that ComponentA will render out
var Component1Child = React.createClass({

  // we want to be able to trigger an event from this class and provide on/off methods
  // some people might just include Backbone.Events as a mixin but that is not correct as it will not use this.state as the context
  trigger: function() {
    return Backbone.Events.trigger.apply(this.state, arguments);
  },
  on: function() {
    return Backbone.Events.on.apply(this.state, arguments);
  },
  off: function() {
    return Backbone.Events.off.apply(this.state, arguments);
  },

  render: function() {

    // say we have a parameter that we want to provide to the event call (if we were iterating a set of children)
    var eventParam = 'foo';
    var self = this;
    var triggerEvent = function() {
      self.triggerEvent(eventParam);
    };

    return (
      <div>
        <button type="button" onClick={triggerEvent}>click me: Component1Child</button>
      </div>
    );
  },

  triggerEvent: function(eventParam) {
    this.trigger('clicked', eventParam);
  }
});


// ComponentB will trigger the "b:clicked" global event (with an event parameter) that ComponentA will consume
var ComponentB = React.createClass({
  render: function() {

    // call our scoped function on click so we can reference our "foo" parameter
    return (
      <div>
        <button type="button" onClick={this.triggerGlobalEvent}>Click me: ComponentB</button>
      </div>
    );
  },

  triggerGlobalEvent: function() {
    // this will be triggered when this component's button is clicked
    EventBus.trigger('b:clicked');
  },
});



// INITIAL RENDER
// create DOM elements for the 2 top level components (ComponentA and ComponentB)
var aElement = document.createElement('div')
document.body.appendChild(aElement)
var bElement = document.createElement('div')
document.body.appendChild(bElement)

React.render(<ComponentA/>, aElement);
React.render(<ComponentB/>, bElement);
