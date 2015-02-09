// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


var TestComponent = React.createClass({

  getInitialState: function() {
    // give a default value so the initial render has a value to reference
    return { profile: 'small' };
  },

  componentDidMount: function() {
    window.addEventListener('resize', this.onResize);
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.onResize);
  },

  render: function() {
    return <div>{this.state.profile}</div>
  },

  onResize: function() {
    var width = $(this.getDOMNode()).width();
    this.setState({
      profile: width > 600 ? 'large' : 'small'
    })
  }
});


// INITIAL RENDER
React.render(<TestComponent/>, document.body);
