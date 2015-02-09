// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


// create a function for this mixin so we can reuse it in this function
function getStateValues (size, self) {
  var width = $(self.getDOMNode()).width();
  return {
    profile: width > size ? 'large' : 'small'
  };
}

React.mixins.add('responsive', function(size) {
  size = size || 600;
  return {
    mixins: ['events'],

    getInitialState: function() {
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
