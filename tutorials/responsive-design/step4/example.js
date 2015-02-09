// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


// simple function to return the state object that contains the "profile" value
function getStateValues (size, self) {
  var width = $(self.getDOMNode()).width();
  return {
    profile: width > size ? 'large' : 'small'
  };
}

// instead of using a standard object for the mixin attributes, we can use a function
// which returns the object to allow us to reference the function parameters in our mixin functions
React.mixins.add('responsive', function(size) {
  size = size || 600;

  return {
    // the "manageEvents" method is available because we import the "events" mixin
    mixins: ['events'],

    getInitialState: function() {

      // throttle an event handler every 300 ms which is bound to the "resize" window event
      this.manageEvents({
        '*throttle(300)->window:resize': function() {
          this.setState(getStateValues(size, this));
        }
      });

      // make a guess which will be replaced when the component is mounted
      return { profile: 'large' };
    },

    componentDidMount: function() {
      this.setState(getStateValues(size, this));
    }
  };
});


var TestComponent = React.createClass({
  // now the component width breakpoint will be at 500px
  mixins: ['responsive(500)'],

  render: function() {
    return <div>{this.state.profile}</div>
  }
});


// INITIAL RENDER
React.render(<TestComponent/>, document.body);
