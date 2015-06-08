react-backbone
==============
Give [Backbone](http://backbonejs.org/) awareness to your [React](http://facebook.github.io/react/) components and so much more.

* give Backbone.Model / Backbone.Collection awareness to your React components
* mixins for updating on model change events, be aware of model xhr activity and model validation events and more
* add Backbone.View like declaritive events to your React components
* add dependency management to your React mixins
* use Backbone.Model-aware input components
* includes managed event bindings which will clean up when the React component is unmounted

This project indludes/depends on the following other projects

* [jhudson8/react-mixin-manager](https://github.com/jhudson8/react-mixin-manager)
* [jhudson8/react-events](https://github.com/jhudson8/react-events)
* [jhudson8/backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events)


## Common Examples

```
    React.createClass({
      mixins: ['modelChangeAware'],

      render: function() {
        // will be called any time this.props.model is changed
      }
    });
```

```
    React.createClass({
      mixins: ['modelXHRAware'],

      render: function() {
        // this.state.loading will be truthy during any XHR activity initiated by this.props.model
      }
    });
```

```
    React.createClass({
      mixins: ['modelEvents'],

      events: {
        'model:foo': 'onFoo',
        '*throttle(300)->model:foo': 'onThrottledFoo'
        ''
      },

      onFoo: function() {
        will be executed when this.props.model triggers the "foo" event
      },

      onThrottledFoo: function() {
        will be executed and throttled (300ms) when this.props.model triggers the "foo" event
      },
    });
```

## Docs

[View the installation and API docs](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone)


## Tutorials

* [Handling model/collection changes and XHR loading indicators](https://github.com/jhudson8/react-backbone/tree/master/tutorials/collection-binding)
* [Forms validation and input field binding](https://github.com/jhudson8/react-backbone/tree/master/tutorials/forms)
* [Using managed events and mixin dependencies to create a responsive component](https://github.com/jhudson8/react-backbone/tree/master/tutorials/responsive-design)
* [Custom event handlers and event driven applications](https://github.com/jhudson8/react-backbone/blob/master/tutorials/event-driven-app)
