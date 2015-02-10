// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);

// our event bus
var EventBus = _.clone(Backbone.Events);

// allow "app:{event name}" to be referenced in the events object
React.events.handle('app', {
  target: EventBus
});

// COMPONENTS

// ComponentA will listen to the global event bus for an event triggered by ComponentB (b:clicked)
// and will listen for an event from a child component (child:clicked)
var ComponentA = React.createClass({
  mixins: ['events'],

  events: {
    'ref:child:clicked': function(eventParam) {
      alert('child was clicked; the event param is "' + eventParam + '"');
    },
    'app:b:clicked': 'onComponentBClicked'
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
  }
});


// this is the child component that ComponentA will render out
var Component1Child = React.createClass({
  mixins: ['events'],

  render: function() {
    return (
      <div>
        <button type="button" onClick={this.triggerWith('clicked', 'foo')}>click me: Component1Child</button>
      </div>
    );
  }
});


// ComponentB will trigger the "b:clicked" global event (with an event parameter) that ComponentA will consume
var ComponentB = React.createClass({
  mixins: ['events'],

  render: function() {

    // call our scoped function on click so we can reference our "foo" parameter
    return (
      <div>
        <button type="button" onClick={this.triggerWith(EventBus, 'b:clicked')}>Click me: ComponentB</button>
      </div>
    );
  }
});



// INITIAL RENDER
// create DOM elements for the 2 top level components (ComponentA and ComponentB)
var aElement = document.createElement('div')
document.body.appendChild(aElement)
var bElement = document.createElement('div')
document.body.appendChild(bElement)

React.render(<ComponentA/>, aElement);
React.render(<ComponentB/>, bElement);
