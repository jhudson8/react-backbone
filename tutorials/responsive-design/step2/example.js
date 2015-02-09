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
    var resizeListener = _.throttle(this.onResize, 300);
    window.addEventListener('resize', resizeListener);
    // so we can keep a reference to the callback to unbind
    this.state.resizeListener = resizeListener;
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.state.resizeListener);
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
