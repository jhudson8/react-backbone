This is a simple progressive tutorial to get familiar with some of react-backbone collection handling mixins and functionality.  All mixins referenced have similar model-oriented siblings which can be used by replacing "collection" with "model".  For example "collectionChangeAware" to "modelChangeAware".

The source code can be found for each step in this tutorial in the current directory.  To run each example, download the code and ```cd``` into an individual step and run
```
npm install
webpack-dev-server
```
the browse to [http://localhost:8080](http://localhost:8080)


### Step 1: baseline

[view source](./step1/example.js)

As a baseline, we'll create a small app that has a model with a validation function and a form which will have input fields with default values from the model values and will message the user when the form is invalid (after a form submit).

```
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
    var InputWithLabel = React.createClass({
      getInitialState: function() {
        return { id: _.uniqueId('form') };
      },

      render: function() {
        return <div>
          <label htmlFor={this.state.id}>{this.props.label}</label>
          <div>
            <input id={this.state.id} type="text" name={this.props.name} ref="input" defaultValue={this.props.value}/>
          </div>
        </div>;
      },

      // allow the value of the input component to be retrieved
      getValue: function() {
        return $(this.refs.input.getDOMNode()).val();
      }
    });

    // and here is the overall form component
    var TestComponent = React.createClass({
      getInitialState: function() {
        // make sure this.state is not null
        return {};
      },

      // listen for the invalid event so we can message when the data is bad
      componentDidMount: function() {
        this.props.model.on('invalid', this.onInvalid);
      },
      componentWillUnmount: function() {
        this.props.model.off('invalid', this.onInvalid);
      },

      render: function() {
        var model = this.props.model,
            error = this.state.error;

        // if we've got an error, show it
        var errorComponent = error && (
          <div>
            Error: {error}
            <br/><br/>
          </div>
        );

        // return the form and input contents
        return <form onSubmit={this.onSubmit}>
          {errorComponent}
          <InputWithLabel ref="firstName" name="firstName" label="First Name" value={model.get('firstName')}/>
          <InputWithLabel ref="lastName" name="lastName" label="Last Name" value={model.get('lastName')}/>
          <button type="submit">Click me</button>
        </form>;
      },

      onSubmit: function(ev) {
        ev.preventDefault();
        var self = this,
            attr = {};

        // populate the attr object with the user input
        _.each(['firstName', 'lastName'], function(key) {
          attr[key] = self.refs[key].getValue();
        });

        // set the model input and alert if all is ok.  if there are validation issues, the
        // onInvalid method will be executed because of the model "invalid" bindings
        if (this.props.model.set(attr, {validate: true})) {
          this.setState({error: undefined});
          alert('model validated');
        }
      },

      onInvalid: function(model, errors) {
        // for simplicity, we'll just show the first error
        var errorStr = [];
        _.each(errors, function(error) {
          _.each(error, function(message, key) {
            errorStr.push(message);
          })
        });
        this.setState({error: errorStr.join(', ')});
      }
    });


    // INITIAL RENDER
    var model = new MyModel({
      firstName: 'John',
      lastName: 'Doe'
    });
    React.render(<TestComponent model={model}/>, document.body);
```


## Step 2: Use Backbone.input.Text to populate form fields with model values automatically
Replace out the standard React ```input``` component with [Backbone.input.Text](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/Text?focus=outline).

Update the InputWithLabel component so we only provide the model and keys and the Text component figures out the values.
```
    var Text = Backbone.input.Text;
    var InputWithLabel = React.createClass({
      getInitialState: function() {
        return { id: _.uniqueId('form') };
      },

      render: function() {
        return <div>
          <label htmlFor={this.state.id}>{this.props.label}</label>
          <div>
            <Text id={this.state.id} type="text" ref="input" model={this.props.model} name={this.props.name}/>
      ...
```

This component already have a ```getValue``` function so just use that

```
    // allow the value of the input component to be retrieved
    getValue: function() {
      return $(this.refs.input.getDOMNode()).val();
    }
```

And now we provide label, key and model to the component instead of label and value

```
    <InputWithLabel ref="firstName" name="firstName" label="First Name" model={this.props.model}/>
    <InputWithLabel ref="lastName" name="lastName" label="Last Name" model={this.props.model}/>
```

Now, if the model value changes and the input field has not been modified by the user, the input field value will be updated.


## Step 3: Use modelPopulate
Since our input component implements the getValue method and a name property is provided, we can use the [modelPopulate](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelPopulate?focus=outline) mixin to quickly populate the model from the input fields.

Simply our form submit code using ```modelPopulate```.  The function argument will only be called if the model is valid after applying the form field attributes.

```
    ev.preventDefault();
    this.modelPopulate(function(model) {
      this.setState({error: undefined});
      alert('model validated');
    });
```


## Step 4: 2 way binding
Depending on your needs, you can use 2 way binding so the model will be continually updated as the user makes input field changes.

Add the bind={true} Text attribute

```
    <Text id={this.state.id} type="text" ref="input" model={this.props.model} name={this.props.name} bind={true}/>
```

No need to call modelPopulate anymore, just check to see if the model is valid

```
    onSubmit: function(ev) {
      ev.preventDefault();
      if (model.isValid()) {
        this.setState({error: undefined});
        alert('model validated');
      }
    },
```

Right now, the model validate will not be called when the model is updated so you won't see the errors as you type but you will when you submit because of the ```model.isValid``` call.


## Step 5: Validate the model as you type
It is possible to validate input field values as the user types using the model validate functionality.  To do so, pass ```{validateField: true}``` as the ```bind``` parameter.

Note: you could also just pass ```{validate: true}``` but that will always validate ***all*** current model attributes rather than just the attributes that were changed.

```
    <Text id={this.state.id} type="text" ref="input" model={this.props.model} name={this.props.name} bind={{validateField: true}}/>
```

Now you will see error messages as you type but, notice that the error message isn't removed when the input field becomes valid.  This is because there is no ```valid``` event to listen to.  Let's listen to any ```change``` event using [modelEvents](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelEvents?focus=outline) and clear the validation state when the model is sucessfully changed.

Add the ```modelEvents``` mixin and the events hash

```
    var TestComponent = React.createClass({
      mixins: ['modelPopulate', 'modelEvents'],

      events: {
        'model:change': function() {
          this.setState({error: undefined});
        }
      },
      ...
```

Now the error message will be cleared when the field passes validation;


## Step 6: Field error messages
Use the [modelInvalidAware](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelInvalidAware?focus=outline) to allow the component to listen for ***field specific*** ```invalid``` events to display field level validation messages.

We have no need for our form level validation messages anymore so we will be removing the code we added in the last step and a lot more.

Add the ```modelInvalidAware``` mixin to the ```InputWithLabel``` component.

```
    var InputWithLabel = React.createClass({
      mixins: ['modelInvalidAware'],
  ...
```

When rendering, show the error message using ```this.state.invalid```

```
    render: function() {
      return <div>
        <label htmlFor={this.state.id}>{this.props.label}</label>
        <div>
          <Text id={this.state.id} type="text" ref="input" model={this.props.model} name={this.props.name} bind={{validateField: true}}/>
          {this.state.invalid}
        </div>
      </div>;
  },
```

Remove a lot of code...

We don't need to listen for the model change events to clear out the state so remove (but keep the "modelPopulate" mixin)

```
      mixins: ['modelPopulate', 'modelEvents'],

      events: {
        'model:change': function() {
          this.setState({error: undefined});
        }
      },
```

We don't need to listen for the ```invalid``` event in our form component anymore

```
    // listen for the invalid event so we can message when the data is bad
    componentDidMount: function() {
      this.props.model.on('invalid', this.onInvalid);
    },
    componentWillUnmount: function() {
      this.props.model.off('invalid', this.onInvalid);
    },
```

We don't need to render the form level error message so remove all that

```
  render: function() {
    var model = this.props.model,
        error = this.state.error;

    // if we've got an error, show it
    var errorComponent = error && (
      <div>
        Error: {error}
        <br/><br/>
      </div>
    );
```

and

```
    // don't use {errorComponent} when rendering
    return <form onSubmit={this.onSubmit}>
      {errorComponent}
```

We don't need to listen for invalid events at the form level so remove

```
    onInvalid: function(model, errors) {
      // for simplicity, we'll just show the first error
      var errorStr = [];
      _.each(errors, function(error) {
        _.each(error, function(message, key) {
          errorStr.push(message);
        })
      });
      this.setState({error: errorStr.join(', ')});
    }
```

Now, just type in the fields and see inline error message.  Our code just got a whole lot simpler.


## All done
All done but there is so much more you can do.  Check out more details about the [input field components](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/api/Input%20Components?focus=outline) to see what else you can do.
