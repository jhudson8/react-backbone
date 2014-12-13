react-backbone
==============
Give [Backbone](http://backbonejs.org/) awareness to your [React](http://facebook.github.io/react/) components and so much more.

* give Backbone.Model / Backbone.Collection awareness to your React components
* mixins for updating on model change events, be aware of model xhr activity and model validation events and more
* add Backbone.View like declaritive events to your React components
* add dependency management to your React mixins
* use Backbone.Model-aware input components
* includes managed event bindings which will clean up when the React component is unmounted

Dependencies
--------------
* [jhudson8/react-mixin-manager](https://github.com/jhudson8/react-mixin-manager)
* [jhudson8/react-events](https://github.com/jhudson8/react-events)
* [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) (optional)

Installation
--------------
#### Browser:
with dependencies together
```
<script src=".../react[-min].js"></script>
<script src=".../underscore[-min].js"></script>
<script src=".../backbone[-min].js"></script>
<script src=".../react-backbone-with-deps[-min].js"></script>
```
or separate
```
<script src=".../react[-min].js"></script>
<script src=".../underscore[-min].js"></script>
<script src=".../backbone[-min].js"></script>
<script src=".../react-mixin-manager[-min].js"></script>
<script src=".../react-events[-min].js"></script>
<script src=".../backbone-xhr-events[-min].js"></script> (optional)
<script src=".../react-backbone[-min].js"></script>
```

#### CommonJS
with dependencies together
```
require('react-backbone/with-deps')(require('react'), require('backbone'), require('underscore'), require('jquery'));
```
or separate
```
var $ = require('jquery');
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
require('react-mixin-manager')(React);
require('react-events')(React);
require('react-backbone')(React, Backbone, _, $);
```

#### AMD
with dependencies together
```
require(
  ['react', 'backbone', 'underscore', 'jquery', react-backbone/with-deps'],
  function(React, Backbone, _, $, reactBackbone) {
    reactBackbone(React, Backbone, _, $); 
});
```
or separate
```
require(
  ['react', 'backbone', 'underscore', 'jquery', 'react-mixin-manager', 'react-events', 'react-backbone'],
  function(React, Backbone, _, $, reactMixinManager, reactEvents, reactBackbone) {
    reactMixinManager(React); 
    reactEvents(React); 
    reactBackbone(React, Backbone, _, $); 
});
```


API: Input Components
-------------
Low level backbone model-aware input components are provided.  These will

* set the correct value from the model if the *name* property matches the model attribute to be used
* contribute to [modelPopulate](#snippet/package/modelPopulate)

Each input component also has the following methods

* getValue: returns the input field value as it should be set on the model
* getDOMValue: returns the actual value attribute of the input field

In most cases, ```getValue``` and ```getDOMValue``` are the same.  But, for checkboxes, ```getValue``` will return an actual boolean representing whether the field is checked or not and ```getDOMValue``` will return the html ```value``` attribute.

The ```name``` property should be used on input components representing the model key the field should be initialized with (and what attribute key to use with modelPopulate).

This simple example shows how to use these components to get and set the model appropriately

```
    var Text = Backbone.input.Text;
    var TextArea = Backbone.input.TextArea;
    var Select = Backbone.input.Select;
    var CheckBox = Backbone.input.CheckBox;
    var RadioGroup = Backbone.input.RadioGroup;

    module.exports = React.createClass({
      mixins: ['modelPopulate'],

      getDefaultProps: function() {
        var model = new Backbone.Model({
          isBoy: true,
          firstName: 'John',
          lastName: 'Doe',
          hairColor: 'blonde',
          eyeColor: 'brown'
        });
        return {
          model: model
        };
      },

      render: function() {

        // the "getModel" method exists because the "modelPopulate" depends on the "modelAware" mixin which contains this method
        // note: the "name" property is used to retrieve the correct model value for the input field and the "ref" property is
        //    used to allow the input field to contribute to the modelPopulate command (the ref name does not matter... just need to get into "this.refs")
        var model = this.getModel();

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

      onSubmit: function(event) {
        event.preventDefault();
        var model = this.getModel();

        // the "modelPopulate" method exists because we included the "modelPopulate" mixin
        this.modelPopulate(function(model) {
          // if this callback fires, all inputs (identified with a ref) set the appropriate values on the model,
          // and the model validation passed
          console.log(model);
        });
      }
    });
```

*note: these components can still be set (will override model values) just like their wrapped components (```value``` and ```defaultValue```) and all other properties will be pushed through as well```

### Text
A model-aware component that is a very light wrapper around *React.DOM.input*.  The *type* attribute is *text* by default but will be overridden if the *type* property is defined.  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).

Nested content is N/A.

```
    var Text = Backbone.input.Text;

    var model = new Backbone.Model({age: 3});
    ...
    // assuming a model attribute "age" exists
    <Text type="number" name="age" model={model}/>
```

### TextArea
A model-aware component that is a very light wrapper around *React.DOM.textarea*.  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).

```
    var TextArea = Backbone.input.TextArea;

    var model = new Backbone.Model({description: 'foo'});
    ...
    // assuming a model attribute "description" exists
    <TextArea type="number" name="description" model={model}/>
```

### CheckBox
A model-aware component that is a very light wrapper around *React.DOM.input* (type=checkbox).  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).  The *value* property is not required (true/false) will be used but if the *value* property is specified, that value will be set on the model in the checked case.

```
    var CheckBox = Backbone.input.CheckBox;

    var model = new Backbone.Model({acceptTermsOfService: true});
    ...
    // assuming a model attribute "acceptTermsOfService" exists
    <CheckBox name="acceptTermsOfService" model={model}/>
```

### Select
A model-aware component that is a very light wrapper around *React.DOM.select*.  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).

```
    var Select = Backbone.input.Select;

    var model = new Backbone.Model({eyeColor: 'green'});
    ...
    // assuming a model attribute "eyeColor" exists
    <Select name="eyeColor" model={model}>
      <option value="blue">blue</option>
      <option value="green">green</option>
      <option value="brown">brown</option>
    </Select>
```

### RadioGroup
A model-aware component that should contain one or *React.DOM.input* (type=radio).  This component will initialize with the correct default value from the provided model using the "name" property as well as participate in the *modelPopulate* mixin (if the "ref" attribute is provided).

*note: this component does not create the radio buttons for you - it is only a wrapper for nested content provided by you to expose the functions necessary for getting and setting model values.*

```
    var RadioGroup = Backbone.input.RadioGroup;

    var model = new Backbone.Model({eyeColor: 'green'});
    ...
    // assuming a model attribute "eyeColor" exists
    <RadioGroup name="eyeColor" model={model}>
      <input type="radio" value="blue"/> blue
      <input type="radio" value="green"> green
      <input type="radio" value="brown"> brown
    </RadioGroup>
```


API: Mixins
--------------
These mixins can be referenced by their alias (see mixin examples) because they are registered using [jhudson8/react-mixin-manager](https://github.com/jhudson8/react-mixin-manager).


### modelAware

Utility methods which allows other mixins to depend on ```getModel``` and ```setModel``` methods.  This provides an single overridable mixin should you have non-standard model population requirements.

#### getModel()
*return the model associated with the current React component.*

The model can be set using the ```model``` property or by explicitely calling ```setModel```.


```
    React.createClass({
      mixins: ['modelAware']
    });
    ...
    <MyClass ref="myClass" model={model} key="foo"/>
    ...
    var model = this.refs.myClass.getModel();
```

#### setModel(model)
* ***model***: the Backbone model to set

Associate the model with the current React component which can be retrieved using ```getModel```.  When using this, all model event bindings
will be automatically transferred to the new model.


### collectionAware

Utility methods which allows other mixins to depend on ```getCollection``` and ```setCollection``` methods.  This provides an single overridable mixin should you have non-standard collection population requirements.

#### getCollection()
*return the collection associated with the current React component.*

The collection can be set using the ```collection``` property or by explicitely calling ```setCollection```.


```
    React.createClass({
      mixins: ['collectionAware']
    });
    ...
    <MyClass ref="myClass" collection={collection} key="foo"/>
    ...
    var collection = this.refs.myClass.getCollection();
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
* options: the model set options (Backbone.Model.set options parameter)
* model: the model to set the form values on or false if the default component bound model should not be used in favor or just returning the attributes.  If no model is provided the componet's bound model will be used.

*returns the attribute values*

Iterate all child components with a [ref](http://facebook.github.io/react/docs/more-about-refs.html) property and have each component set it's input value on the model attributes.
Components will only participate in model population if they implement ***getValue*** to return the value that should be set on the model.

If a component does not contain a ```getValue``` method but does contain a ```modelPopulate``` method (by including the ```modelPopulate``` mixin), the modelPopulate method on that component will be called as well with the attributes applied to the parent component's model.

If a model is provided, the attributes will be set on it as long as they pass model validation.
```
    React.create.Class({
      mixins: ['modelPopulate'],

      render: function() {
        // return a form with react-backbone input fields
      },
      onFormSubmit: function() {
        // use this.refs automatically to get the components that will populate the model
        this.modelPopulate(function(model) {
          // assuming the model validation passed, this callback will be executed
        });

        // or for more control
        var attributes = this.modelPopulate();

        // or for even more control
        var attributes = this.modelPopulate(specificComponentsToCheck);
      }
    });
```


### modelEvents
*depends on [modelAware](#snippet/package/modelAware), [listen](#snippet/package/listen), [events](#snippet/package/events)*

Utility mixin to support declarative model event bindings as well as expose managed model binding functions which are cleaned up when the component is unmounted.

This mixin should be included (instead of the "events" mixin) if any declarative model event bindings are used.

```
    var MyClass React.createClass({
      mixins: ['modelEvents'],

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

```
    var MyClass React.createClass({
      mixins: ['modelEvents'],

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

```
    var MyClass React.createClass({
      mixins: ['modelEvents'],

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

```
    var MyClass React.createClass({
      mixins: ['collectionEvents'],

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

```
    var MyClass React.createClass({
      mixins: ['collectionEvents'],

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

```
    var MyClass React.createClass({
      mixins: ['collectionEvents'],

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

When these occur, normalize the error payload using ```React.mixins.modelIndexErrors```.


```
    var MyClass React.createClass({
      mixins: ['modelInvalidAware'],

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


### collectionChangeAware
*depends on [collectionEvents](#snippet/package/collectionEvents)*

Will force a render if the associated collection fires the "reset", "add", "remove" or "sort" event.
If you want to force a render only on specific collection events, see [collectionUpdateOn](#snippet/package/collectionUpdateOn).


### backboneUpdateOn
Convienance mixin to include the [modelUpdateOn](#snippet/package/modelUpdateOn) and [collectionUpdateOn](#snippet/package/collectionUpdateOn) mixins.  Refer to those mixins for more details.


### modelUpdateOn
*depends on [modelEvents](#snippet/package/modelEvents)*

Listen to a specific event (or array of events).  When this event is fired, the component will be force updated.  The events to listen for are defined as the ```updateOn``` component property which can be a string or array of strings.  In addition, the declaring component can define the keys using parameters (see examples);

*when a parent component provides the event name(s) as the ```updateOn``` parameter*
```
    var MyComponent = React.createClass({
      mixins: ['modelUpdateOn'],
      ...
    });
    ...
    new MyComponent({updateOn: 'foo'});
    // or
    new MyComponent({updateOn: ['foo', 'bar']});
```

* when the child/declaring component provides the event name(s) as mixin parameters*
```
    var MyComponent = React.createClass({
      mixins: ['modelUpdateOn("foo", "bar")'],
      ...
    });

    // equivalent to

    var MyComponent = React.createClass({
      mixins: ['events'],

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
```
    var MyComponent = React.createClass({
      mixins: ['collectionUpdateOn'],
      ...
    });
    ...
    new MyComponent({updateOn: 'foo'});
    // or
    new MyComponent({updateOn: ['foo', 'bar']});
```

* when the child/declaring component provides the event name(s) as mixin parameters*
```
    var MyComponent = React.createClass({
      mixins: ['collectionUpdateOn("foo", "bar")'],
      ...
    });

    // equivalent to

    var MyComponent = React.createClass({
      mixins: ['events'],

      events: {
        model: {
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
```
    var MyComponent = React.createClass({
      mixins: ['modelLoadOn'],

      render: function() {
        if (this.state.loading) {
          ...
        } else {
          ...
        }
      }
    });
    ...
    new MyComponent({loadOn: 'read'});
    // or
    new MyComponent({loadOn: ['read', 'update']});
```

When the XHR event name(s) are statically defined by the owning component
```
    var MyComponent = React.createClass({
      mixins: ['modelLoadOn("read", "update")'],
      ...
    });
```


### collectionLoadOn
*depends on [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events), [collectionEvents](#snippet/package/collectionEvents)*

Gives any comonent the ability to listen to a specific async event(s).

See the docs in [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) for more details on the async events.

When this event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.

Use the ```loadOn``` property to define the specific async event name to bind to.  In addition, the declaring component can define the event names using parameters (see examples).

When the XHR event name(s) are dynamically provded as as the ```modelLoadOn``` parameter
```
    var MyComponent = React.createClass({
      mixins: ['collectionLoadOn'],

      render: function() {
        if (this.state.loading) {
          ...
        } else {
          ...
        }
      }
    });
    ...
    new MyComponent({loadOn: 'read'});
    // or
    new MyComponent({loadOn: ['read', 'update']});
```

When the XHR event name(s) are statically defined by the owning component
```
    var MyComponent = React.createClass({
      mixins: ['collectionLoadOn("read", "update")'],
      ...
    });
```


### loadWhile
#### loadWhile (options)
* ***options***: the optional Backbone options

*returns the options or a new options object if none was provided*

Set the state of the component with ```{loading: true}``` when this method is executed.  And wrap the ***success*** and ***error*** callbacks so that when ano one of them are called, the loading state will be set to false again.

```
    this.getModel().save(attributes, this.loadWhile());
    // or
    this.getModel().save(attributes, this.loadWhile({
      success: ...,
      error: ...,
      ...
    }));
```


### backboneXHRAware
Convienance mixin to include the [modelXHRAware](#snippet/package/modelXHRAware) and [collectionXHRAware](#snippet/package/collectionXHRAware) mixins.  Refer to those mixins for more details.


### modelXHRAware
*depends on [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events), [modelEvents](#snippet/package/modelEvents)*

Gives any comonent the ability to listen to ***all*** async events.

See the docs in [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) for more details on the async events.

When ***any*** XHR event is fired, the state attribute ```loading``` will be set to a truthy value.  state.loading will be set to a falsy value when the XHR activity is complete.

```
    React.createClass({
      mixins: ['modelXHRAware'],

      render: function() {
        if (this.state.loading) {
          // return something if we are loading
        } else {
          // return something if we are not loading
        }
      }
    });
```


### collectionXHRAware
*depends on [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events), [collectionEvents](#snippet/package/collectionEvents)*

Gives any comonent the ability to listen to ***all*** async events.

See the docs in [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events) for more details on the async events.

When ***any*** XHR event is fired, the state attribute ```loading``` will be set to a truthy value.  state.loading will be set to a falsy value when the XHR activity is complete.

```
    React.createClass({
      mixins: ['collectionXHRAware'],

      render: function() {
        if (this.state.loading) {
          // return something if we are loading
        } else {
          // return something if we are not loading
        }
      }
    });
```


API: Event Binding Definitions
--------------
Event listeners can be declared using the ```events``` attribute.  To add this support the ```events``` mixin ***must*** be included with your component mixins.  see [react-events](https://github.com/jhudson8/react-events) for details

### model events
In addition to providing mixins which give Backbone awareness to React components, declaritive model events are made available similar to the ```events``` hash in Backbone.View.

Model events can be defined using the ```model:``` prefix.

For example, by including the ```events``` mixin, you can do this:

```
    React.createClass({
      mixins: ['modelEvents'],

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

```
    React.createClass({
      mixins: ['collectionEvents'],

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
Memoizes a given function by caching the computed result.  see [_.memoize](http://underscorejs.org/#memoize) for more details

```
events: {
  '*memoize()->window:resize': 'onWindowResize'
}
```

### *delay
Invokes function after wait millisecond.  see [_.delay](http://underscorejs.org/#delay) for more details

```
events: {
  '*delay(1000)->window:resize': 'onWindowResize'
}
```

### *defer
Defers invoking the function until the current call stack has cleared.  see [_.defer](http://underscorejs.org/#defer) for more details

```
events: {
  '*defer()->window:resize': 'onWindowResize'
}
```


### *throttle
Creates and returns a new, throttled version of the passed function, that, when invoked repeatedly, will only actually call the original function at most once per every wait milliseconds.  see [_.throttle](http://underscorejs.org/#throttle) for more details

```
events: {
  '*throttle(1000)->window:resize': 'onWindowResize'
}
```


### *debounce
Creates and returns a new debounced version of the passed function which will postpone its execution until after wait milliseconds have elapsed since the last time it was invoked.  see [_.debounce](http://underscorejs.org/#debounce) for more details

```
events: {
  '*debounce(1000)->window:resize': 'onWindowResize'
}
```


### *once
Creates a version of the function that can only be called one time. Repeated calls to the modified function will have no effect, returning the value from the original call.  see [_.once](http://underscorejs.org/#once) for more details

```
events: {
  '*once()->window:resize': 'onWindowResize'
}
```


### *after
Creates a version of the function that will only be run after first being called count times.  see [_.after](http://underscorejs.org/#after) for more details

```
events: {
  '*after(3)->window:resize': 'onWindowResize'
}
```


### *before
Creates a version of the function that can be called no more than count times.  see [_.before](http://underscorejs.org/#before) for more details

```
events: {
  '*before(3)->window:resize': 'onWindowResize'
}
```


API
-------------
### React.mixins
#### getModelKey (component)
* ***component***: The ReactComponent that is associated with the model key specific property

Return the model key name associated with a component.  While this can be overridden to sute your needs, the default impl is as follows:

```
    if (reactComponent.getModelKey) {
      return component.getModelKey();
    }
    return component.props.name || component.props.key || component.props.ref;
```

#### modelIndexErrors (errors, component)
* ***errors***: the error payload from a model validation

Return the errors in a standardized format.  This can be overridden to suire your needs.  The default implementation will take errors in an array
```
    [{field1Key: message}, {field2Key: message}, ...]
```
to a single object
```
    { field1Key: errorMessage, field2Key: errorMessage, ... }
```
