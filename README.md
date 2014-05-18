react-backbone
==============
***Problem:*** [React](http://facebook.github.io/react/) components are unaware of [Backbone](http://backbonejs.org/) models by default which cause some to try to embed [React](http://facebook.github.io/react/) components inside a Backbone.View.

***Solution:*** [React](http://facebook.github.io/react/) components should completely replace Backbone.View.  By including some simple mixins, [React](http://facebook.github.io/react/) components can become model-aware and provide as much or more integration expected with a Backbone.View.


Installation
==============
* Browser: include *react-backbone[.min].js* after the listed dependencies
* CommonJS: ```require('react-backbone')(require('react'), require('backbone'));```

Dependencies
--------------
* [React](http://facebook.github.io/react/)
* [Backbone](http://backbonejs.org/)
* [react-mixin-manager](https://github.com/jhudson8/react-mixin-manager) (>= 0.3.0)
* [backbone-async-event](https://github.com/jhudson8/backbone-async-event) (optional)
* [react-events](https://github.com/jhudson8/react-events) (>= 0.2.0 optional)


Mixins
==============
The named mixins exists by including [react-mixin-manager](https://github.com/jhudson8/react-mixin-manager).

See [examples](https://github.com/jhudson8/react-backbone/blob/master/test/test.js#L78)


modelAccessor
--------------
```
React.createClass({
  mixins: ['modelAccessor']
});
...
<MyClass ref="myClass" model={model} key="foo"/>
...
var model = this.refs.myClass.getModel();
```
Simple mixin that exposes getModel/setModel on the component.  The model can also be set by using the ```model``` property when constructing the component.


modelValueAccessor
--------------
```
React.createClass({
  mixins: ['modelValueAccessor']
});
...
<MyClass ref="myClass" model={model} key="foo"/>
...
this.refs.myClass.setModelValue('some value');
```
Simple mixin that exposes getModelValue/setModelValue on the component.  By default it uses the ```key``` property to get the model key;


modelEventBinder
--------------
```
var MyClass React.createClass({
  mixins: ['modelEventBinder'],
  getInitialState: function() {
    this.modelOn('change', this.onChange);
    return null;
  },
  onChange: function() { ... }
});
```
Exposes model event binding functions that will be cleaned up when the component is unmounted and not actually executed until the component
is mounted.
* ```modelOn(eventName, callback[, context])```;  similar to model.on.  the "context" used if not provided is the React component.
* ```modelOnce(eventName, callback[, context])```;  similar to model.once.  the "context" used if not provided is the React component.
* ```modelOff(eventName, callback[, context])```;  similar to model.off.  the "context" used if not provided is the React component.

***By including [react-events](https://github.com/jhudson8/react-events) you can use declarative bindings like the following:***
```
React.createClass({
  mixins: ['events', 'modelEventBinder'],
  events: {
    'model:change': 'onChange'
  },
  onChange: function() { ... }
});
```

modelFieldValidator
--------------
```
var MyClass React.createClass({
  mixins: ['modelFieldValidator'],
  render: function() {
    var error = this.state && this.state.error;
    if (error) {
      return 'Error: ' + error;
    } else {
      return 'No error';
    }
  }
});
...
<MyClass model={model} key="firstName"/>
...
// this would normally be triggered on validation - this is just for example purposes
model.trigger('invalid', model, {fistName: 'Invalid first name'});
```
Using the ```key``` property, bind to the model and look for ```invalid``` events.  If an ```invalid``` event is triggered, set the ```error``` state to the field error message.  Replace the ```modelIndexErrors``` mixin to override the current error indexing behavior.

The default error list format is expected to be
```{ field1Key: errorMessage, field2Key: errorMessage, ... } ```
or
```[{ field1Key: errorMessage}, {field2Key: errorMessage}, ... ]```


modelIndexErrors
--------------
Mixin that exposes a ```modelIndexErrors``` method which returns model validation errors in a standard format.  This is meant to be overridden if a different format is desired.  to do so, use the mixin ```replace``` method using [react-mixin-manager](https://github.com/jhudson8/react-mixin-manager).


modelChangeListener
--------------
```
React.createClass({
  mixins: ['modelChangeListener']
});
```
Will force a render if the associated model has changed.  The "change" events are for models or collections and include
* change
* reset
* add
* remove
* sort


modelUpdateOn
--------------
```
var MyComponent = React.createClass({
  mixins: ['modelUpdateOn']
});
<MyComponent model={myModel}, updateOn: "change:something"/>
myModel.set({something: 'foo'})
// MyComponent will be updated
```
Gives any comonent the ability to listen to a specific event (or array of events).  When this event is fired, the component will be force updated.


modelLoadOn
--------------
*this mixin requires the inclusion of [backbone-async-event](https://github.com/jhudson8/backbone-async-event)*
```
var MyComponent = React.createClass({
  mixins: ['modelLoadOn']
});
<MyComponent model={myModel}, loadOn: "read"/>
myModel.fetch();
// MyComponent.state.loading is now true
```
Gives any comonent the ability to listen to a specific async event (or array of events).  When this event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.  The specific async event to listen for is defined by the ```loadOn``` property value.


modelAsyncListener
--------------
*this mixin requires the inclusion of [backbone-async-event](https://github.com/jhudson8/backbone-async-event)*
```
var MyComponent = React.createClass({
  mixins: ['modelAsyncListener']
});
<MyComponent model={myModel}/>
myModel.fetch();
// MyComponent.state.loading is now true
```
Gives any comonent the ability to listen to ***all*** async events.  When any async event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.
