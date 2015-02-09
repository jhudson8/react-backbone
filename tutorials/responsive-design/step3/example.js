// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


// create a function for this mixin so we can reuse it
function getStateValues (self) {
  var width = $(self.getDOMNode()).width();
  return {
    profile: width > 600 ? 'large' : 'small'
  };
}

React.mixins.add('responsive', {
  mixins: ['events'],
  getInitialState: function() {
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
