// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


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
var TestComponent = React.createClass({
  mixins: ['responsive'],
  render: function() {
    return <div>{this.state.profile}</div>
  }
});


// INITIAL RENDER
React.render(<TestComponent/>, document.body);
