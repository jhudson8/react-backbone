// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


// MODEL
var MyModel = Backbone.Model.extend({
  // add a dumb validation method which ensures first/last name length are > 5
  validate: function(attributes) {
    var errors = [];
    if (attributes.hasOwnProperty('firstName')) {
      if (!attributes.firstName || attributes.firstName.length < 5) {
        errors.push({firstName: 'The first name must be > 5 characters'});
      }
    }
    if (attributes.hasOwnProperty('lastName')) {
      if (!attributes.lastName || attributes.lastName.length < 5) {
        errors.push({lastName: 'The last name must be > 5 characters'});
      }
    }
    return errors.length && errors;
  }
});


// COMPONENTS

// create a reusable components which represent a label with an input field
var Text = Backbone.input.Text;
var InputWithLabel = React.createClass({
  mixins: ['modelInvalidAware'],

  getInitialState: function() {
    return { id: _.uniqueId('form') };
  },

  render: function() {
    return <div>
      <label htmlFor={this.state.id}>{this.props.label}</label>
      <div>
        <Text id={this.state.id} type="text" ref="input" model={this.props.model} name={this.props.name} bind={{validateField: true}}/>
        {this.state.invalid}
      </div>
    </div>;
  },

  // allow the value of the input component to be retrieved
  getValue: function() {
    return this.refs.input.getValue();
  }
});

// and here is the overall form component
var TestComponent = React.createClass({
  render: function() {
    var model = this.props.model;

    // return the form and input contents
    return <form onSubmit={this.onSubmit}>
      <InputWithLabel ref="firstName" name="firstName" label="First Name" model={this.props.model}/>
      <InputWithLabel ref="lastName" name="lastName" label="Last Name" model={this.props.model}/>
      <button type="submit">Click me</button>
    </form>;
  },

  onSubmit: function(ev) {
    ev.preventDefault();
    if (model.isValid()) {
      this.setState({error: undefined});
      alert('model validated');
    }
  }
});


// INITIAL RENDER
var model = new MyModel({
  firstName: 'John',
  lastName: 'Doe'
});
React.render(<TestComponent model={model}/>, document.body);
