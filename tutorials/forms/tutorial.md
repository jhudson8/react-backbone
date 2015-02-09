This is a simple progressive tutorial to get familiar with some of react-backbone collection handling mixins and functionality.

All mixins referenced have similar model-oriented siblings which can be used by replacing "collection" with "model".  For example "collectionChangeAware" to "modelChangeAware".


### Running the examples
The source code can be found for each step in this tutorial in the current directory.  To run each example, download the code and ```cd``` into an individual step and run

```
  npm install
  webpack-dev-server
```

then browse to [http://localhost:8080](http://localhost:8080)


### Step 1: baseline

As a baseline, we'll create a small app that has a model with a validation function and a form which will have input fields with default values from the model values and will message the user when the form is invalid (after a form submit).

[view source](./step1/example.js)


### Step 2: Use Backbone.input.Text components

[view source](./step2/example.js)

We can use [Backbone.input.Text](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/Text?focus=outline) components to populate form fields with model values automatically.

Replace out the standard React ```input``` component with ```Backbone.input.Text```.

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

This ```Backbone.input.Text``` component already has a ```getValue``` function so just use it in our ```InputWithLabel``` component.

```
    // allow the value of the input component to be retrieved
    getValue: function() {
      return this.refs.input.getValue();
    }
```

And now we provide label, key and model to the component instead of label and value

```
    <InputWithLabel ref="firstName" name="firstName" label="First Name" model={this.props.model}/>
    <InputWithLabel ref="lastName" name="lastName" label="Last Name" model={this.props.model}/>
```

Now, if the model value changes and the input field has not been modified by the user, the input field value will be updated.


## Step 3: Use modelPopulate

[view source](./step3/example.js)

Since our input component implements the getValue method and a name property is provided, we can use the [modelPopulate](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelPopulate?focus=outline) mixin to quickly populate the model from the input fields.

Include the ```modelPopulate``` mixin

```
    var TestComponent = React.createClass({
      mixins: ['modelPopulate'],
      ...
```

Simply our form submit code using ```modelPopulate```.  The function argument will only be called if the model is valid after applying the form field attributes.

```
    ev.preventDefault();
    this.modelPopulate(function(model) {
      this.setState({error: undefined});
      alert('model validated');
    });
```


## Step 4: 2 way binding

[view source](./step4/example.js)

Depending on your needs, you can use 2 way binding so the model will be continually updated as the user makes input field changes.

Add the bind={true} Text attribute

```
    <Text id={this.state.id} type="text" ref="input" model={this.props.model} name={this.props.name} bind={true}/>
```

No need to call modelPopulate anymore, just check to see if the model is valid and remove the ```modelPopulate``` mixin we included in the previous step.

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

[view source](./step5/example.js)

It is possible to validate input field values as the user types using the model validate functionality.  To do so, pass ```{validateField: true}``` as the ```bind``` parameter.

Note: you could also just pass ```{validate: true}``` but that will always validate ***all*** current model attributes rather than just the attributes that were changed.

```
    <Text id={this.state.id} type="text" ref="input" model={this.props.model} name={this.props.name} bind={{validateField: true}}/>
```

Now you will see error messages as you type but, notice that the error message isn't removed when the input field becomes valid.  This is because there is no ```valid``` event to listen to.  Let's listen to any ```change``` event using [modelEvents](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelEvents?focus=outline) and clear the validation state when the model is sucessfully changed.

Add the ```modelEvents``` mixin and the events hash

```
    var TestComponent = React.createClass({
      mixins: ['modelEvents'],

      events: {
        'model:change': function() {
          this.setState({error: undefined});
        }
      },
      ...
```

Now the error message will be cleared when the field passes validation;


## Step 6: Field level error messages

[view source](./step6/example.js)

Use the [modelInvalidAware](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelInvalidAware?focus=outline) mixin to allow the component to listen for ***field specific*** ```invalid``` events to display field level validation messages.

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

The ```onInvalid``` method won't be called anymore so remove that

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
