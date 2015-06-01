react-backbone
==============
Give [Backbone](http://backbonejs.org/) awareness to your [React](http://facebook.github.io/react/) components and so much more.

All react-model bindings is accomplished using mixins.  The general concept is to provide very atomic mixins to do specific things that work well together.  Depending on the needs of your react component, you can include as many mixins as appropriate.

The general features of this project are

* many mixins to force update components on model change events, be aware of XHR activity, model validation events and much more
* add Backbone.View like declaritive events for [models](#project/jhudson8/react-backbone/snippet/package/model%20events) and [collections](#project/jhudson8/react-backbone/snippet/package/collection%20events) to your React components
* add [dependency management](#project/jhudson8/react-backbone/bundle/jhudson8/react-mixin-manager) to your React mixins for better reuse
* provide low level Backbone.Model-aware [input components](#project/jhudson8/react-backbone/api/Input%20Components)
* add [managed event bindings](#project/jhudson8/react-backbone/bundle/jhudson8/react-events) which will clean up when the React component is unmounted
* enhance available declarative events by adding [callback wrappers](#project/jhudson8/react-backbone/api/Event%20Binding%20Definitions) like ```debounce```
* enhance Backbone.sync to provide [rich XHR awareness](#project/jhudson8/react-backbone/bundle/jhudson8/backbone-xhr-events) using Backbone Events

See the step-by-step [usage tutorials](#project/jhudson8/react-backbone/section/Usage%20tutorials) to help get started.


Dependencies
--------------
* [jhudson8/react-mixin-manager](https://github.com/jhudson8/react-mixin-manager)
* [jhudson8/react-events](https://github.com/jhudson8/react-events)
* [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) (optional)


Installation
--------------
#### Browser:

```
    ... include backbone, underscore, react ...
    <script src=".../backbone-xhr-events[-min].js"></script>
    <script src=".../react-mixin-manager[-min].js"></script>
    <script src=".../react-events[-min].js"></script>
    <script src=".../react-backbone[-min].js"></script>
```

#### CommonJS
```
    npm install --save backbone-xhr-events
    npm install --save react-mixin-manager
    npm install --save react-events
    npm install --save react-backbone
```

#### AMD
```
    AMD is supported if you really want to use it... but why would you do that to yourself?  Use webpack instead.
```


Sections
--------------
### Usage tutorials

* [Handling model/collection changes and XHR loading indicators](https://github.com/jhudson8/react-backbone/tree/master/tutorials/collection-binding)
* [Forms validation and input field binding](https://github.com/jhudson8/react-backbone/tree/master/tutorials/forms)
* [Using managed events and mixin dependencies to create a responsive component](https://github.com/jhudson8/react-backbone/tree/master/tutorials/responsive-design)
* [Custom event handlers and event driven applications](https://github.com/jhudson8/react-backbone/blob/master/tutorials/event-driven-app)


### Removing JQuery
If you are using [webpack](http://webpack.github.io/) you can easily remove jquery from your app (assuming you don't need it for other purposes) by doing the following

package.json
```
  dependencies: {
    // or some other $.ajax implementation
    "component-ajax": "0.0.2",
    "exoskeleton": "^0.7.0",
    ...
  }
```

webpack.config.js (npm install https://github.com/webpack/imports-loader)
```
    plugins: [
        new webpack.IgnorePlugin(/^jquery$/)
    ],
    loaders: [
        { test: /exoskeleton\.js$/,    loader: "imports?define=>false"}
    ],
    resolve: {
      alias: {
        backbone: 'exoskeleton/exoskeleton.js'
      }
    },
```

When initializing react-backbone
```
var ajax = require('component-ajax');
Backbone.ajax = function() {
  return ajax.apply(this, arguments);
};
```


### Multiple models and collections
React components, by default, will have a single bound model and/or collection (using the ```model``` and ```collection``` properties).  This behavior can be altered by specifically providing the ```modelAware``` or ```collectionAware``` mixin with parameters representing the proerty names.

The ```modelAware```/```collectionAware``` mixin is not required if you want to have only a single model/collection bound using the ```model```/```collection``` property.

#### Overriding the default model/collection keys
If you wanted to have a component that use the ```foo``` property for component model bindings

```javascript
    React.createClass({
      mixins: ['modelAware("foo")', 'modelEvents'],
      events: {
        'model:bar': function() {
          // this will be executed when the model assigned to the
          // "foo" property triggers the "bar" event
        }
      }
    });
```

#### Multiple object bindings
Or, if you want to have 2 components (identified by the ```foo``` and ```bar``` property names) that, for example, you want to listen to change events on

```javascript
    React.createClass({
      mixins: ['modelAware("foo", "bar")', 'modelChangeAware'],
      events: {
        'model:theEvent': function() {
          // this will be executed when the model assigned to the
          // "foo" or "bar" property triggers the "theEvent" event
        }
      },
      render: function() {
        // this will be executed when the model assigned to the
        // "foo" or "bar" property triggers the "change" event
        // because of the "modelChangeAware" mixin
      }
    });
```

The same functionality works with collection events as well.



API: Input Components
-------------
Low level backbone model-aware input components are provided.  These will

* provide an option for 2-way binding
* set the correct value from the model if the *name* property matches the model attribute to be used
* contribute to [modelPopulate](#snippet/package/modelPopulate)

Each input component also has the following methods

* ***getValue***: returns the input field value as it should be set on the model
* ***getDOMValue***: returns the actual value attribute of the input field

In most cases, ```getValue``` and ```getDOMValue``` are the same.  But, for checkboxes, ```getValue``` will return an actual boolean representing whether the field is checked or not and ```getDOMValue``` will return the html ```value``` attribute.

Each input component can accept the following properties (in addition to the standard DOM element properties)
* ***name***: should be used on input components representing the model key the field should be initialized with (and what attribute key to use with modelPopulate).
* **bind**: ```true``` to initiate 2-way binding (when the input field is updated, the model will be updated to match), ```{validate: true}``` to validate the entire model when the field is updated, ```{validateField: true}``` to validate *just* the updated field


### Text
A model-aware component that is a very light wrapper around *React.DOM.input*.  The *type* attribute is *text* by default but will be overridden if the *type* property is defined.  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).


```javascript
    var Text = ReactBackbone.input.Text;

    var model = new Backbone.Model({age: 3});
    ...
    // assuming a model attribute "age" exists
    // "ref" is not required but needed if you will be using modelPopulate;  the value does not matter
    // "name" is required;  that is how the Text component knows what model attribute to use
    // "model" is obviously required
    <Text ref="firstName" name="firstName" model={model}/>
```

### TextArea
A model-aware component that is a very light wrapper around *React.DOM.textarea*.  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).

```javascript
    var TextArea = ReactBackbone.input.TextArea;

    var model = new Backbone.Model({description: 'foo'});
    ...
    // assuming a model attribute "description" exists
    // "ref" is not required but needed if you will be using modelPopulate;  the value does not matter
    // "name" is required;  that is how the TextArea component knows what model attribute to use
    // "model" is obviously required
    <TextArea ref="description" name="description" model={model}/>
```

### CheckBox
A model-aware component that is a very light wrapper around *React.DOM.input* (type=checkbox).  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).  The *value* property is not required (true/false) will be used but if the *value* property is specified, that value will be set on the model in the checked case.

```javascript
    var CheckBox = ReactBackbone.input.CheckBox;

    var model = new Backbone.Model({acceptTermsOfService: true});
    ...
    // assuming a model attribute "acceptTermsOfService" exists
    // "ref" is not required but needed if you will be using modelPopulate;  the value does not matter
    // "name" is required;  that is how the CheckBox component knows what model attribute to use
    // "model" is obviously required
    <CheckBox ref="acceptTermsOfService" name="acceptTermsOfService" model={model}/>
```

### Select
A model-aware component that is a very light wrapper around *React.DOM.select*.  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).

```javascript
    var Select = ReactBackbone.input.Select;

    var model = new Backbone.Model({eyeColor: 'green'});
    ...
    // assuming a model attribute "eyeColor" exists
    // "ref" is not required but needed if you will be using modelPopulate;  the value does not matter
    // "name" is required;  that is how the Select component knows what model attribute to use
    // "model" is obviously required
    <Select ref="eyeColor" name="eyeColor" model={model}>
      <option value="blue">blue</option>
      <option value="green">green</option>
      <option value="brown">brown</option>
    </Select>
```

### RadioGroup
A model-aware component that should contain one or *React.DOM.input* (type=radio).  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).

*note: this component does not create the radio buttons for you - it is only a wrapper for nested content provided by you to expose the functions necessary for getting and setting model values.*

```javascript
    var RadioGroup = ReactBackbone.input.RadioGroup;

    var model = new Backbone.Model({eyeColor: 'green'});
    ...
    // assuming a model attribute "eyeColor" exists
    // "ref" is not required but needed if you will be using modelPopulate;  the value does not matter
    // "name" is required;  that is how the RadioGroup component knows what model attribute to use
    // "model" is obviously required
    <RadioGroup ref="eyeColor" name="eyeColor" model={model}>
      <input type="radio" value="blue"/> blue
      <input type="radio" value="green"> green
      <input type="radio" value="brown"> brown
    </RadioGroup>
```


API: Mixins
--------------
These mixins can be referenced by their alias (see mixin examples) because they are registered using [jhudson8/react-mixin-manager](https://github.com/jhudson8/react-mixin-manager).


### modelAware

Utility methods which allows other mixins to depend on the ```getModel``` function.  This provides an single overridable mixin should you have non-standard model population requirements.

#### getModel(callback)
* ***callback***: optional callback (function(model, propName)) for when there are multiple models

*return the single model associated with the current React component.*

The model can be set using the ```model``` property.

```javascript
    React.createClass({
      mixins: ['modelAware'] // or ['react-backbone.modelAware']
    });
    ...
    <MyClass model={model}/>
    ...
    // get the single (or first) model bound to this component
    var model = myClass.getModel();
```

There can actually be multiple models bound to a single component.  To access all bound models, a iterator callback method can be provided.

```javascript
    React.createClass({
      mixins: ['modelAware("foo", "bar")']
    });
    ...
    <MyClass foo={model1} bar={model2}/>
    ...
    // iterate all models bound to this component
    myClass.getModel(function(model, propName) {
      // will be called twice with (model1, "foo") and (model2, "bar")
    });
```


### collectionAware

Utility methods which allows other mixins to depend on the ```getCollection``` function.  This provides an single overridable mixin should you have non-standard collection population requirements.


#### getCollection(callback)
* ***callback***: optional callback (function(collection, propName)) for when there are multiple collections

*return the single collection associated with the current React component.*

The collection can be set using the ```collection``` property.

```javascript
    React.createClass({
      mixins: ['collectionAware'] // or ['react-backbone.collectionAware']
    });
    ...
    <MyClass collection={collection}/>
    ...
    // get the single (or first) collection bound to this component
    var collection = myClass.getCollection();
```

There can actually be multiple collections bound to a single component.  To access all bound collections, a iterator callback method can be provided.

```javascript
    React.createClass({
      mixins: ['collectionAware("foo", "bar")']
    });
    ...
    <MyClass foo={collection1} bar={collection2}/>
    ...
    // iterate all collection bound to this component
    myClass.getCollection(function(model, propName) {
      // will be called twice with (collection1, "foo") and (collection2, "bar")
    });
```


#### setCollection(collection)
* ***collection***: the Backbone collection to set

Associate the collection with the current React component which can be retrieved using ```getCollection```.  When using this, all collection event bindings will be automatically transferred to the new collection.


### modelPopulate
*depends on [modelAware](#snippet/package/modelAware)*

Utility mixin used to iterate child components and have their associated value set on a Backbone.Model.

#### modelPopulate ([componentArray][, callback][, options][, model])
* componentArray: the array of components to iterate.  If falsy, all child components that contain a ```ref``` attribute will be used
* callback: the callback that will be executed ***only if*** the model passed validation when the attributes were set.  If provided, the model will be set automatically.
* options: the. model set options (Backbone.Model.set options parameter).  Additional an ***onInvalid*** option attribute can be used to be notified if the model failed validation
* model: the model to set the form values on or false if the default component bound model should not be used in favor or just returning the attributes.  If no model is provided the componet's bound model will be used.

*returns the attribute values*

Iterate all child components with a [ref](http://facebook.github.io/react/docs/more-about-refs.html) property and have each component set it's input value on the model attributes.
Components will only participate in model population if they implement ***getValue*** to return the value that should be set on the model.

If a component does not contain a ```getValue``` method but does contain a ```modelPopulate``` method (by including the ```modelPopulate``` mixin), the modelPopulate method on that component will be called as well with the attributes applied to the parent component's model.

If it isn't working as expected

* make sure input fields have a ```ref``` attribute (that allows them to participate as fields in population)
* make sure input fields have a  ```name``` attribute (that is the model attribute association)
* make sure the component includes the ```modelPopulate``` mixin


If a model is provided, the attributes will be set on it as long as they pass model validation.

```javascript
    React.create.Class({
      mixins: ['modelPopulate'], // or ['react-backbone.modelPopulate']

      render: function() {
        var model = this.props.model;

        return (
          <form onSubmit={this.onSubmit}>
            Name:
            <Text ref="name" name="name" model={model}/>
            <br/>

            Summary:
            <TextArea ref="summary" name="summary" model={model}/>
            <br/>

            Accept Terms and Conditions?:
            <CheckBox ref="acceptTOC" name="acceptTOC" model={model}/>
            <br/>

            Hair Color:
            <Select ref="hairColor" name="hairColor" model={model}>
              <option value="black">black</option>
              <option value="blonde">blonde</option>
              <option value="brown">brown</option>
            </Select>
            <br/>

            Eye Color:
            <RadioGroup ref="eyeColor" name="eyeColor" model={model}>
              <input type="radio" name="eyeColor" value="blue"/> blue
              <input type="radio" name="eyeColor" value="brown"/> brown
              <input type="radio" name="eyeColor" value="green"/> green
            </RadioGroup>
            <br/>

            <button>Submit</button>
          </form>
        );
      },
      onFormSubmit: function() {
        // use this.refs automatically to get the components that will populate the model
        this.modelPopulate(function(model) {
          // if the model validation passed, this callback will be executed
        }, {
          onInvalid: function(attributes) {
            // these attributes did not pass model validation
          }
        });

        // or for more control
        var attributes = this.modelPopulate();

        // or for even more control
        var attributes = this.modelPopulate(specificComponentsToCheck);
      }
    });
```


### modelFetch

Mixin which will ensure any bound model(s) has been fetched (but will not initiate a fetch if a fetch is in progress or the model(s) has already been fetched).

```javascript
    React.createClass({
      mixins: ['modelFetch'] // or ['react-backbone.modelFetch']
    });
    ...

    // model.fetch will be called when the component is mounted
    <MyClass model={model}/>
```


### collectionFetch

Mixin which will ensure any bound collection(s) has been fetched (but will not initiate a fetch if a fetch is in progress or the collection(s) has already been fetched).

```javascript
    React.createClass({
      mixins: ['collectionFetch'] // or ['react-backbone.collectionFetch']
    });
    ...

    // collection.fetch will be called when the component is mounted
    <MyClass collection={collection}/>
```


### modelEvents
*depends on [modelAware](#snippet/package/modelAware), [listen](#snippet/package/listen), [events](#snippet/package/events)*

Utility mixin to support declarative model event bindings as well as expose managed model binding functions which are cleaned up when the component is unmounted.

This mixin should be included (instead of the "events" mixin) if any declarative model event bindings are used.

```javascript
    var MyClass React.createClass({
      mixins: ['modelEvents'], // or ['react-backbone.modelEvents']

      events: {
        'model:foo': 'onFoo',
        model: {
          bar: 'onBar'
        }
      },
      onFoo: function() { ... },
      onBar: function() { ... }
    });
```


#### modelOn(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Equivalent to Backbone.Events.on but will be unbound when the component is unmounted.  Also similar to the "listenTo" method except that if the model is changed, the previous model bindings will be removed and the new model will have the bindings applied.

```javascript
    var MyClass React.createClass({
      mixins: ['modelEvents'], // or ['react-backbone.modelEvents']

      getInitialState: function() {
        this.modelOn('change', this.onChange);
        return null;
      },
      onChange: function() { ... }
    });
```


#### modelOnce(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Equivalent to Backbone.Events.once but will be unbound when the component is unmounted.  Also similar to the "listenToOnce" method except that if the model is changed, the previous model bindings will be removed and the new model will have the bindings applied.

```javascript
    var MyClass React.createClass({
      mixins: ['modelEvents'], // or ['react-backbone.modelEvents']

      getInitialState: function() {
        this.modelOnce('change', this.onChange);
        return null;
      },
      onChange: function() { ... }
    });
```

#### modelOff(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Remove the provided modelOn / modelOnce event bindings.


### collectionEvents
*depends on [collectionAware](#snippet/package/collectionAware), [listen](#snippet/package/listen), [events](#snippet/package/events)*

Utility mixin to support declarative collection event bindings as well as expose managed collection binding functions which are cleaned up when the component is unmounted.

This mixin should be included (instead of the "events" mixin) if any declarative collection event bindings are used.

```javascript
    var MyClass React.createClass({
      mixins: ['collectionEvents'], // or ['react-backbone.collectionEvents']

      events: {
        'collection:foo': 'onFoo',
        collection: {
          bar: onBar
        }
      },
      onFoo: function() { ... },
      onBar: function() { ... }
    });
```


#### collectionOn(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Equivalent to Backbone.Events.on but will be unbound when the component is unmounted.  Also similar to the "listenTo" method except that if the collection is changed, the previous collection bindings will be removed and the new collection will have the bindings applied.

```javascript
    var MyClass React.createClass({
      mixins: ['collectionEvents'], // or ['react-backbone.collectionEvents']

      getInitialState: function() {
        this.collectionOn('reset', this.onReset);
        return null;
      },
      onReset: function() { ... }
    });
```


#### collectionOnce(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Equivalent to Backbone.Events.once but will be unbound when the component is unmounted.  Also similar to the "listenToOnce" method except that if the collection is changed, the previous model bindings will be removed and the new collection will have the bindings applied.

```javascript
    var MyClass React.createClass({
      mixins: ['collectionEvents'], // or ['react-backbone.collectionEvents']

      getInitialState: function() {
        this.collectionOnce('reset', this.onReset);
        return null;
      },
      onReset: function() { ... }
    });
```

#### collectionOff(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Remove the provided collectionOn / collectionOnce event bindings.


### modelValidator
*depends on [modelAware](#snippet/package/modelAware)*

#### modelValidate(attributes, options)
* ***attributes***: the model attributes
* ***options***: the set options

*return the response from the model's validate method (transformed with React.mixins.modelIndexErrors)*


### modelInvalidAware
*depends on [modelEvents](#snippet/package/modelEvents)*

Allow components to be aware of field specific validation errors.  The ```name``` property must be provide to tell this mixin which model attribute to listen to for ```invalid``` events.  When the event is triggered, the ```invalid``` state attribute will be set as the error message provided to the ```invalid``` event.  The state will not be unset by this mixin (as there is no ```valid``` model event).

If it isn't working as expected

* make sure the component has a ```name``` attribute (that allows them to listen for the invalid event)
* make sure the component includes the ```modelInvalidAware``` mixin

When these occur, normalize the error payload using ```React.mixins.modelIndexErrors```.

```javascript
    var MyClass React.createClass({
      mixins: ['modelInvalidAware'], // or ['react-backbone.modelInvalidAware']

      render: function() {
        var invalidMessage = this.state.invalid;
        if (invalidMessage) {
          return 'Error: ' + error;
        } else {
          return 'No error';
        }
      }
    });
```


### backboneChangeAware
Convienance mixin to include the [modelChangeAware](#snippet/package/modelChangeAware) and [collectionChangeAware](#snippet/package/collectionChangeAware) mixins.  Refer to those mixins for more details.


### modelChangeAware
*depends on [modelEvents](#snippet/package/modelEvents)*

Will force a render if the associated model fires the "change" event.
If you want to force a render only on specific model events, see [modelUpdateOn](#snippet/package/modelUpdateOn).

```javascript
    var MyClass React.createClass({
      mixins: ['modelChangeAware'], // or ['react-backbone.modelChangeAware']

      render: function() {
        // will be executed if the associated collection changes
      }
    });
```

*multiple models can be associated with the component for change-awareness.  see [multiple models/components](#section/Multiple%20models%20and%20collections)*


### collectionChangeAware
*depends on [collectionEvents](#snippet/package/collectionEvents)*

Will force a render if the associated collection fires the "reset", "add", "remove" or "sort" event.
If you want to force a render only on specific collection events, see [collectionUpdateOn](#snippet/package/collectionUpdateOn).

```javascript
    var MyClass React.createClass({
      mixins: ['collectionChangeAware'], // or ['react-backbone.collectionChangeAware']

      render: function() {
        // will be executed if the associated model changes
      }
    });
```

*multiple collections can be associated with the component for change-awareness.  see [multiple models/components](#section/Multiple%20models%20and%20collections)*

### backboneUpdateOn
Convienance mixin to include the [modelUpdateOn](#snippet/package/modelUpdateOn) and [collectionUpdateOn](#snippet/package/collectionUpdateOn) mixins.  Refer to those mixins for more details.


### modelUpdateOn
*depends on [modelEvents](#snippet/package/modelEvents)*

Listen to a specific event (or array of events).  When this event is fired, the component will be force updated.  The events to listen for are defined as the ```updateOn``` component property which can be a string or array of strings.  In addition, the declaring component can define the keys using parameters (see examples);

*when a parent component provides the event name(s) as the ```updateOn``` parameter*

```javascript
    var MyComponent = React.createClass({
      mixins: ['modelUpdateOn'], // or ['react-backbone.modelUpdateOn']
      ...
    });
    ...
    <MyComponent updateOn="foo" model={myModel}/>
    // or
    <MyComponent updateOn{['foo', 'bar']} model={myModel}/>
```

* when the child/declaring component provides the event name(s) as mixin parameters*

```javascript
    var MyComponent = React.createClass({
      mixins: ['modelUpdateOn("foo", "bar")'], // or ['react-backbone.modelUpdateOn("foo", "bar")']
      ...
    });

    // equivalent to

    var MyComponent = React.createClass({
      mixins: ['modelEvents'],

      events: {
        model: {
          foo: 'forceUpdate',
          bar: 'forceUpdate'
        }
      }
      ...
    });
```


### collectionUpdateOn
*depends on [modelEvents](#snippet/package/modelEvents)*

Listen to a specific event (or array of events).  When this event is fired, the component will be force updated.  The events to listen for are defined as the ```updateOn``` component property which can be a string or array of strings.  In addition, the declaring component can define the keys using parameters (see examples);

*when a parent component provides the event name(s) as the ```updateOn``` parameter*

```javascript
    var MyComponent = React.createClass({
      mixins: ['collectionUpdateOn'], // or ['react-backbone.collectionUpdateOn']
      ...
    });
    ...
    <MyComponent updateOn="foo" collection={myCollection}/>
    // or
    <MyComponent updateOn{['foo', 'bar']} collection={myCollection}/>
```

* when the child/declaring component provides the event name(s) as mixin parameters*

```javascript
    var MyComponent = React.createClass({
      mixins: ['collectionUpdateOn("foo", "bar")'], // or ['react-backbone.collectionUpdateOn("foo", "bar")']
      ...
    });

    // equivalent to

    var MyComponent = React.createClass({
      mixins: ['collectionEvents'], // or ['react-backbone.collectionEvents']

      events: {
        collection: {
          foo: 'forceUpdate',
          bar: 'forceUpdate'
        }
      }
      ...
    });
```


### backboneLoadOn
Convienance mixin to include the [modelLoadOn](#snippet/package/modelLoadOn) and [collectionLoadOn](#snippet/package/collectionLoadOn) mixins.  Refer to those mixins for more details.


### modelLoadOn
*depends on [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events), [modelEvents](#snippet/package/modelEvents)*

Gives any comonent the ability to listen to a specific async event(s).

See the docs in [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) for more details on the async events.

When this event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.

Use the ```loadOn``` property to define the specific async event name to bind to.  In addition, the declaring component can define the event names using parameters (see examples).

When the XHR event name(s) are dynamically provded as as the ```modelLoadOn``` parameter

```javascript
    var MyComponent = React.createClass({
      mixins: ['modelLoadOn'], // or ['react-backbone.modelLoadOn']

      render: function() {
        if (this.state.loading) {
          ...
        } else {
          ...
        }
      }
    });
    ...
    <MyComponent loadOn="read" model={myModel}/>
    // or
    <MyComponent loadOn={['read', 'update']} model={myModel}/>
```

For more details on all XHR events [look here](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/bundle/jhudson8/backbone-xhr-events/section/XHR%20Method%20Reference?focus=outline)


### collectionLoadOn
*depends on [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events), [collectionEvents](#snippet/package/collectionEvents)*

Gives any comonent the ability to listen to a specific async event(s).

See the docs in [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) for more details on the async events.

When this event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.

Use the ```loadOn``` property to define the specific async event name to bind to.  In addition, the declaring component can define the event names using parameters (see examples).

When the XHR event name(s) are dynamically provded as as the ```modelLoadOn``` parameter

```javascript
    var MyComponent = React.createClass({
      mixins: ['collectionLoadOn'], // or ['react-backbone.collectionLoadOn']

      render: function() {
        if (this.state.loading) {
          ...
        } else {
          ...
        }
      }
    });
    ...
    <MyComponent loadOn="read" collection={myCollection}/>
    // or
    <MyComponent loadOn={['read', 'update']} collection={myCollection}/>
```

For more details on all XHR events [look here](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/bundle/jhudson8/backbone-xhr-events/section/XHR%20Method%20Reference?focus=outline)


### loadWhile
#### loadWhile (callback[, loadingStateAttribute])
* ***callback***: the function that will be executed containing any XHR activity to be monitored
* ***loadingStateAttribute***: the attribute ("loading" if not provided) to reference the loading state

Set the component state attribute ("loading" or loadingStateAttribute if provided) to a truthy value while *any* XHR activity is in progress as long as it was initiated during the execution of the callback function.

```javascript
    React.createComponent({
      mixins: ['loadWhile'],

      doSomething: function() {
        this.loadWhile(function() {
          // the "loading" attribute will be truthy as long as any of these fetches are in progress
          this.props.collection1.fetch();
          this.props.collection2.fetch();
          this.props.collection3.fetch();
        });
      }
    });
```


### backboneXHRAware
Convienance mixin to include the [modelXHRAware](#snippet/package/modelXHRAware) and [collectionXHRAware](#snippet/package/collectionXHRAware) mixins.  Refer to those mixins for more details.


### modelXHRAware
*depends on [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events), [modelEvents](#snippet/package/modelEvents)*

Gives any comonent the ability to listen to ***all*** async events.

See the docs in [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) for more details on the async events.

When ***any*** XHR event is fired, the state attribute ```loading``` will be set to a truthy value.  state.loading will be set to a falsy value when the XHR activity is complete.

```javascript
    React.createClass({
      mixins: ['modelXHRAware'], // or ['react-backbone.modelXHRAware']

      render: function() {
        if (this.state.loading) {
          // return something if we are loading
        } else {
          // return something if we are not loading
        }
      }
    });
```

You can optional provide an object argument to the mixin allowing you to specificy individual mixin events and overriding the loading state attribute.  The key for each entry is the XHR event type and the value is the state attribute to indicate the loading activity.  For example:

```javascript
    React.createClass({
      mixins: ['modelXHRAware({read: "fetching"})'],
```
Will only listen for ```read``` events (fetch) and will use ```state.fetching``` instead of the standard ```state.loading```.

For more details on all XHR events [look here](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/bundle/jhudson8/backbone-xhr-events/section/XHR%20Method%20Reference?focus=outline)

*multiple models can be associated with the component for xhr-awareness.  see [multiple models/components](#section/Multiple%20models%20and%20collections)*

### collectionXHRAware
*depends on [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events), [collectionEvents](#snippet/package/collectionEvents)*

Gives any comonent the ability to listen to ***all*** async events.

See the docs in [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) for more details on the async events.

When ***any*** XHR event is fired, the state attribute ```loading``` will be set to a truthy value.  state.loading will be set to a falsy value when the XHR activity is complete.

```javascript
    React.createClass({
      mixins: ['collectionXHRAware'], // or ['react-backbone.collectionXHRAware']

      render: function() {
        if (this.state.loading) {
          // return something if we are loading
        } else {
          // return something if we are not loading
        }
      }
    });
```

You can optional provide an object argument to the mixin allowing you to specificy individual mixin events and overriding the loading state attribute.  The key for each entry is the XHR event type and the value is the state attribute to indicate the loading activity.  For example:

```javascript
    React.createClass({
      mixins: ['collectionXHRAware({read: "fetching"})'],
```
Will only listen for ```read``` events (fetch) and will use ```state.fetching``` instead of the standard ```state.loading```.

For more details on all XHR events [look here](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/bundle/jhudson8/backbone-xhr-events/section/XHR%20Method%20Reference?focus=outline)

*multiple collections can be associated with the component for xhr-awareness.  see [multiple models/components](#section/Multiple%20models%20and%20collections)*

API: Event Binding Definitions
--------------
Event listeners can be declared using the ```events``` attribute.  To add this support the ```events``` mixin ***must*** be included with your component mixins.  see [react-events](https://github.com/jhudson8/react-events) for details

### model events
In addition to providing mixins which give Backbone awareness to React components, declaritive model events are made available similar to the ```events``` hash in Backbone.View.

Model events can be defined using the ```model:``` prefix.

For example, by including the ```events``` mixin, you can do this:

```javascript
    React.createClass({
      mixins: ['modelEvents'], // or ['react-backbone.modelEvents']

      events: {
        'model:event1': 'onEvent1',
        model: {
          event2: 'onEvent2',
          event3: function() { ... }
        }
      },
      onEvent1: ...,
      onEvent2: ...
    });
```

And the model that is bound to the component (using the ```model``` property) will have ```event1```, ```event2``` and ```event3``` bound to the associated component functions.


### collection events
In addition to providing mixins which give Backbone awareness to React components, declaritive collection events are made available similar to the ```events``` hash in Backbone.View.

Collection events can be defined using the ```collection:``` prefix.

For example, by including the ```events``` mixin, you can do this:

```javascript
    React.createClass({
      mixins: ['collectionEvents'], // or ['react-backbone.collectionEvents']

      events: {
        'collection:event1': 'onEvent1',
        collection: {
          event2: 'onEvent2',
          event3: function() { ... }
        }
      },
      onEvent1: ...,
      onEvent2: ...
    });
```

And the collection that is bound to the component (using the ```collection``` property) will have ```event1```, ```event2``` and ```event3``` bound to the associated component functions.


### *memoize
*include the [events](#snippet/package/events) mixin*

Memoizes a given function by caching the computed result.  see [_.memoize](http://underscorejs.org/#memoize) for more details

```javascript
    mixins: ['events'],
    events: {
      '*memoize()->window:resize': 'onWindowResize'
    }
```

### *delay
*include the [events](#snippet/package/events) mixin*

Invokes function after wait millisecond.  see [_.delay](http://underscorejs.org/#delay) for more details

```javascript
    mixins: ['events'],
    events: {
      '*delay(1000)->window:resize': 'onWindowResize'
    }
```

### *defer
*include the [events](#snippet/package/events) mixin*

Defers invoking the function until the current call stack has cleared.  see [_.defer](http://underscorejs.org/#defer) for more details

```javascript
    mixins: ['events'],
    events: {
      '*defer()->window:resize': 'onWindowResize'
    }
```


### *throttle
*include the [events](#snippet/package/events) mixin*

Creates and returns a new, throttled version of the passed function, that, when invoked repeatedly, will only actually call the original function at most once per every wait milliseconds.  see [_.throttle](http://underscorejs.org/#throttle) for more details

```javascript
    mixins: ['events'],
    events: {
      '*throttle(1000)->window:resize': 'onWindowResize'
    }
```


### *debounce
*include the [events](#snippet/package/events) mixin*

Creates and returns a new debounced version of the passed function which will postpone its execution until after wait milliseconds have elapsed since the last time it was invoked.  see [_.debounce](http://underscorejs.org/#debounce) for more details

```javascript
    mixins: ['events'],
    events: {
      '*debounce(1000)->window:resize': 'onWindowResize'
    }
```


### *once
*include the [events](#snippet/package/events) mixin*

Creates a version of the function that can only be called one time. Repeated calls to the modified function will have no effect, returning the value from the original call.  see [_.once](http://underscorejs.org/#once) for more details

```javascript
    mixins: ['events'],
    events: {
      '*once()->window:resize': 'onWindowResize'
    }
```


### *after
*include the [events](#snippet/package/events) mixin*

Creates a version of the function that will only be run after first being called count times.  see [_.after](http://underscorejs.org/#after) for more details

```javascript
    mixins: ['events'],
    events: {
      '*after(3)->window:resize': 'onWindowResize'
    }
```


### *before
*include the [events](#snippet/package/events) mixin*

Creates a version of the function that can be called no more than count times.  see [_.before](http://underscorejs.org/#before) for more details

```javascript
    mixins: ['events'],
    events: {
      '*before(3)->window:resize': 'onWindowResize'
    }
```


API
-------------
### react-backbone
#### getModelKey (component)
* ***component***: The ReactComponent that is associated with the model key specific property

Return the model key name associated with a component.  This just returns the ```name``` property but this function can be overridden to suit your needs.

```javascript
    require('react-backbone').getModelKey(myComponent);
```

#### modelIndexErrors (errors, component)
* ***errors***: the error payload from a model validation

Return the errors in a standardized format.  This can be overridden to suire your needs.  The default implementation will take errors in an array

```javascript
    [{field1Key: message}, {field2Key: message}, ...]
```

to a single object

```javascript
    { field1Key: errorMessage, field2Key: errorMessage, ... }
```


#### getModelValue (component)
* ***component***: The associated React component

Return the value associated with the model specific to the React component.  The React component must include the ```modelAware``` mixin (or another that depends on ```modelAware```) and have the ```name``` property matching the requested model attribute.

```javascript
    require('react-backbone').getModelValue(myComponent);
```
