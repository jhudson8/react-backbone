react-backbone
==============
Connect [React](http://facebook.github.io/react/) to [React](http://facebook.github.io/react/) using a suite of focused mixins.

***Problem:*** [React](http://facebook.github.io/react/) components are unaware of [Backbone](http://backbonejs.org/) models by default which cause some to try to embed [React](http://facebook.github.io/react/) components inside a Backbone.View.

***Solution:*** [React](http://facebook.github.io/react/) components should completely replace Backbone.View.  By including some simple mixins, [React](http://facebook.github.io/react/) components can become model-aware and provide as much or more integration expected with a Backbone.View.


Docs
-------------
Instead of reading this README file, you can [view it in fancydocs](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone) for a better experience.



Installation
--------------
* Browser: include *react-backbone[.min].js* after the listed dependencies
* CommonJS: ```require('react-backbone')(require('react'), require('backbone'));```


Dependencies
--------------
* [React](http://facebook.github.io/react/)
* [Backbone](http://backbonejs.org/)
* [react-mixin-manager](https://github.com/jhudson8/react-mixin-manager) (>= 0.6.0)
* [backbone-async-event](https://github.com/jhudson8/backbone-async-event) (optional)
* [react-events](https://github.com/jhudson8/react-events) (>= 0.4.1 optional)


API: Mixins
--------------
The named mixins exists by including [react-mixin-manager](https://github.com/jhudson8/react-mixin-manager).

See [examples](https://github.com/jhudson8/react-backbone/blob/master/test/test.js#L78)


### modelAware

Utility methods which allows other mixins to depend on ```getModel``` and ```setModel``` methods.  This provides an single overridable mixin should you have non-standard model population requirements.

#### getModel()
*return the model associated with the current React component.*

The model can be set using the ```model``` property or by explicitely calling ```setModel```.

##### Examples

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

Associate the model with the current React component which can be retrieved using ```getModel```


### modelValueAware
*depends on modelAware*

Utility methods to get and set the model value for a specific attribute key.  This can be used by input components for example so the model attribute key can be abstracted away.

The ```key``` or ```ref``` attribute are used to specify the model key.  In addition, the component using this mixin can supply the key (see examples).

##### Examples

*allow the parent to set the "key" or "ref" model key attribute using the *key* or *ref* property
```
var MyComponent = React.createClass({
  mixins: ['modelValueAware']
});
...
new MyComponent({ref: 'foo'});

```

*allow the component to provide the model key attribute*
```
var MyComponent = React.createClass({
  mixins: ['modelValueAware("foo")']
});

```

#### getModelValue()

*returns the value from the model bound to the current React component (see ```modelAware```) using the appropriate attribute key (see ```modelValueAware```).*


#### setModelValue(value)
* ***value***: the model value to set

*returns true if the model was set successfully and false otherwise*

Set the value on the model bound to the current React component (see ```modelAware```) using the appropriate attribute key (see ```modelValueAware```).


### modelPopulate
*depends on modelAware*

Utility mixin used to iterate child components and have their associated model value be set on the parent component model.

#### modelPopulate (componentArray[, callback, options]) (callback[, options])
* componentArray: the array of components to iterate.  If falsy, all child components that contain a ```ref``` attribute will be used
* callback: the callback that will be executed ***only if*** the model passed validation when the attributes were set.  If provided, the model will be set automatically.
* options: the model set options (Backbone.Model.set options parameter)

*returns the attribute values*

Iterate child (or provided) components and have each component set it's ***UI*** input value on the model attributes.
Components will only participate in model population if they implement getUIValue to return the value that should be set on the model.

```
// use this.refs automatically to get the components that will populate the model
this.modelPopulate(function(model) {
  // assuming the model validation passed, this callback will be executed
});

// or for more control
var attributes = this.modelPopulate();

// or for even more control
var attributes = this.modelPopulate(specificComponentsToCheck);
```


### modelEventAware
*depends on modelAware*

Utility mixin to expose managed model binding functions which are cleaned up when the component is unmounted.

```
var MyClass React.createClass({
  mixins: ['modelEventAware'],
  getInitialState: function() {
    this.modelOn('change', this.onChange);
    return null;
  },
  onChange: function() { ... }
});
```

#### modelOn(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Equivalent to Backbone.Events.on


#### modelOnce(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Equivalent to Backbone.Events.once


#### modelOff(eventName, callback[, context])
* ***eventName***: the event name
* ***callback***: the event callback function
* ***context***: the callback context

Equivalent to Backbone.Events.off


### modelIndexErrors
Utility mixin to allow components to handle model validation error responses (used by the ```modelValidator``` mixin)

#### modelIndexErrors(errors)
* ***errors***: errors returned from the Backbone.Model.set ```invalid``` event

*return errors in the format of ```{ field1Key: errorMessage, field2Key: errorMessage, ... }```*

The expected input of the error object is ```[{field1Key: message}, {field2Key: message}, ...]```


### modelValidator
*depends on modelAware*

#### modelValidate(attributes, options)
* ***attributes***: the model attributes
* ***options***: the set options

*return the response from the model's validate method*

Call the associated model's validate method


### modelInvalidAware
*depends on modelEventAware, modelIndexErrors*

Allow components to be aware of field specific validation errors.

Listen for attribute specific model ```invalid``` events.  When these occur, normalize the error payload using the ```modelIndexErrors``` method from the ```modelIndexErrors``` mixin and set the components ```error``` state attribute with the normalized error value.

```
var MyClass React.createClass({
  mixins: ['modelInvalidAware'],
  render: function() {
    var error = this.state.error;
    if (error) {
      return 'Error: ' + error;
    } else {
      return 'No error';
    }
  }
});
```


### modelChangeAware
*depends on modelEventAware*

Will force a render if the associated model has changed.  The "change" events are for models or collections and include

* change
* reset
* add
* remove
* sort

If you want to force a render only on specific model events, see *modelUpdateOn*.


### modelUpdateOn
*depends on modelEventAware*

Listen to a specific event (or array of events).  When this event is fired, the component will be force updated.  The events to listen for are defined as the ```updateOn``` component property which can be an array or array of strings.  In addition, the declaring component can define the keys using parameters (see examples);

##### Examples

*parent component provides the event names as the ```updateOn``` parameter*
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

*declaring component provides the event names as mixin parameters*
```
var MyComponent = React.createClass({
  mixins: ['modelUpdateOn("foo", "bar")'],
  ...
});
```


### modelLoadOn
*depends on [jhudson8/backbone-async-event](https://github.com/jhudson8/backbone-async-event)*

Gives any comonent the ability to listen to a specific async event (or array of events).

See the docs in [jhudson8/backbone-async-event](https://github.com/jhudson8/backbone-async-event) for more details on the async events.

When this event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.

Use the ```loadOn``` property to define the specific async event name to bind to.  In addition, the declaring component can define the event names using parameters (see examples).

##### Examples

*parent component provides the event names as the ```modelLoadOn``` parameter*
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
new MyComponent({updateOn: ['read', 'update']});
```

*declaring component provides the event names as mixin parameters*
```
var MyComponent = React.createClass({
  mixins: ['modelUpdateOn("read", "update")'],
  ...
});
```


### modelAsyncAware
*depends on [jhudson8/backbone-async-event](https://github.com/jhudson8/backbone-async-event)*

Gives any comonent the ability to listen to ***all*** async events.

See the docs in [jhudson8/backbone-async-event](https://github.com/jhudson8/backbone-async-event) for more details on the async events.

When ***any*** async event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.

```
render: function() {
  if (this.state.loading) {
    // return something if we are loading
  } else {
    // return something if we are not loading
  }
}
```


Sections
--------

### Declaritive Model Event
In addition to providing mixins which give Backbone awareness to React components, declaritive model events are made available similar to the ```events``` hash in Backbone.View.

Model events can be defined using the ```model:``` prefix.

For example, by including the ```events``` mixin, you can do this:

```
React.createClass({
  mixins: ['events'],
  events: {
    'model:some-event': 'onSomeEvent',
    // will bind to a specific model set as "foo" on this.props or this.refs
    'model[foo]:some-event': 'onFooSomeEvent'
  },
  ...
});
```
In addition, Backbone.Events methods can be used on your component so your component allowing it to trigger events.

This requires [react-events](https://github.com/jhudson8/react-events) to be included.


### Event Callback Wrappers
The following event callback wrappers are implemented (see [react-events](https://github.com/jhudson8/react-events)  for more details)

* memoize
* delay
* defer
* throttle
* debounce
* once

For example
```
events: {
  '*throttle(300):window:resize': 'forceUpdate'
}
```

