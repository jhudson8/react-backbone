react-backbone
==============

backbone-aware mixins for react

Installation
==============
* Browser: include *react-backbone.js/react-backbone.min.js* after the listed dependencies
* CommonJS: ```require('react-backbone');```

Dependencies
--------------
* [React](http://facebook.github.io/react/)
* [react-mixin-dependencies](https://github.com/jhudson8/react-mixin-dependencies)
* [Backbone](http://backbonejs.org/)
* [backbone-async-event](https://github.com/jhudson8/backbone-async-event) (optional)


Mixins
==============
The ```React.mixins.get``` function is available from [react-mixin-dependencies](https://github.com/jhudson8/react-mixin-dependencies).

See [examples](https://github.com/jhudson8/react-backbone/blob/master/test/test.js#L78)


modelAccessor
--------------
```
React.createClass({
  mixins: React.mixins.get('modelAccessor')
});
```
Simple mixin that exposes getModel/setModel on the component.  The model can also be set by using the ```model``` property when constructing the component.


modelEventBinder
--------------
```
React.createClass({
  mixins: React.mixins.get('modelEventBinder')
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
  mixins: React.mixins.get('modelChangeListener')
});
```
Will force a render if the associated model has changed.  The "change" events are for models or collections and include
* change
* reset
* add
* remove
* sort


loadOn
--------------
*this mixin requires the inclusion of [backbone-async-event](https://github.com/jhudson8/backbone-async-event)*
```
var MyComponent = React.createClass({
  mixins: React.mixins.get('loadOn')
});
<MyComponent model: {myModel}, loadOn: "read"/>
myModel.fetch();
// MyComponent.state.loading is now true
```
Gives any comonent the ability to listen to a specific async event.  When this event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.  The specific async event to listen for is defined by the ```loadOn``` property value.


asyncListener
--------------
*this mixin requires the inclusion of [backbone-async-event](https://github.com/jhudson8/backbone-async-event)*
```
var MyComponent = React.createClass({
  mixins: React.mixins.get('asyncListener')
});
<MyComponent model: {myModel}/>
myModel.fetch();
// MyComponent.state.loading is now true
```
Gives any comonent the ability to listen to ***all*** async events.  When any async event is fired, the state attribute ```loading``` will be set to ```true```.  state.loading will be set to false when the async event is complete.
