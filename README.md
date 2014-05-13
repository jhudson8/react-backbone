react-backbone
==============

backbone-aware mixins for react

Installation
==============
* Browser: include *react-backbone[.min].js* after the listed dependencies
* CommonJS: ```require('react-backbone')(require('react'));```

Dependencies
--------------
* [React](http://facebook.github.io/react/)
* [Backbone](http://backbonejs.org/)
* [react-mixin-manager](https://github.com/jhudson8/react-mixin-manager)
* [backbone-async-event](https://github.com/jhudson8/backbone-async-event) (optional)


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
  mixins: ['modelEventBinder']
});
```
Exposes model event binding functions that will be cleaned up when the component is unmounted and not actually executed until the component
is mounted.
* modelOn(eventName, callback[, context]);  similar to model.on.  the "context" used if not provided is the React component.
* modelOnce(eventName, callback[, context]);  similar to model.once.  the "context" used if not provided is the React component.
* modelOff(eventName, callback[, context]);  similar to model.off.  the "context" used if not provided is the React component.


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


modelLoadOn
--------------
*this mixin requires the inclusion of [backbone-async-event](https://github.com/jhudson8/backbone-async-event)*
```
var MyComponent = React.createClass({
  mixins: ['modelLoadOn']
});
<MyComponent model: {myModel}, loadOn: "read"/>
myModel.fetch();
// MyComponent.state.loading is now true
```
Gives any comonent the ability to listen to a specific async event.  When this event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.  The specific async event to listen for is defined by the ```loadOn``` property value.


modelAsyncListener
--------------
*this mixin requires the inclusion of [backbone-async-event](https://github.com/jhudson8/backbone-async-event)*
```
var MyComponent = React.createClass({
  mixins: ['modelAsyncListener']
});
<MyComponent model: {myModel}/>
myModel.fetch();
// MyComponent.state.loading is now true
```
Gives any comonent the ability to listen to ***all*** async events.  When any async event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.
