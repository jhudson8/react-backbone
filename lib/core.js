/**
 * Dependencies
 * - (react-mixin-dependencies)[https://github.com/jhudson8/react-mixin-dependencies]
 * - optional (backbone-async-event)[https://github.com/jhudson8/backbone-async-event]
 */
function(React, Backbone, _) {

  /**
   * Internal model event binding handler
   */
  function onEvent(type, eventName, callback, context) {
    context = context || this;
    if (!this.__modelEvents) {
      this.__modelEvents = {};
    }
    this.__modelEvents[eventName] = {type: type, callback: callback, context: context};
    if (this.isMounted()) {
      var model = this.getModel();
      if (model) {
        model[type](eventName, callback, context);
      }
    }
  }

  /**
   * Simple overrideable mixin to get/set models.  Model can
   * be set on props or by calling setModel
   */  
  React.mixins.add('modelAccessor', {
    getModel: function() {
      return this.model || this.props.model;
    },

    setModel: function(model) {
      if (this._modelUnbindAll) {
        this._modelUnbindAll(true);
      }
      this.model = model;
      if (this._modelBindAll && this.isMounted()) {
        // bind all events if using modelEventBinder
        this._modelBindAll();
      }
    }
  });

  /**
   * Exposes model binding registration functions that will
   * be cleaned up when the component is unmounted and not actually registered
   * until the component is mounted.  The context will be "this" if not provided.
   */
  React.mixins.add('modelEventBinder', {
    // model.on
    modelOn: function (eventName, callback, context) {
      onEvent.call(this, 'on', eventName, callback, context);
    },

    // model.once
    modelOnce: function (eventName, callback, context) {
      onEvent.call(this, 'once', eventName, callback, context);
    },

    modelOff: function (eventName, callback, context) {
      if (this.__modelEvents) {
        var data = this.__modelEvents[eventName],
            model = this.getModel();
        if (model && data) {
          model.off(eventName, callback, context || this);
        } else if (data) {
          delete this.__modelEvents[eventName];
        }
      }
    },

    // bind all registered events to the model
    _modelBindAll: function() {
      if (this.__modelEvents) {
        var model = this.getModel();
        if (model) {
          _.each(this.__modelEvents, function(data, eventName) {
            model[data.type](eventName, data.callback, data.context);
          });
        }
      }
    },

    // unbind all registered events from the model
    _modelUnbindAll: function(keepRegisteredEvents) {
      if (this.__modelEvents) {
        var model = this.getModel();
        if (model) {
          _.each(this.__modelEvents, function(data, eventName) {
            model.off(eventName, data.callback, data.context);
          });
        }
        if (!keepRegisteredEvents) {
          delete this.__modelEvents;
        }
      }
    },

    componentDidMount: function() {
      // sanity check to prevent duplicate binding
      this._modelUnbindAll(true);
      this._modelBindAll(true);
    },

    componentWillUnmount: function() {
      this._modelUnbindAll(true);
    }
  }, 'modelAccessor');

  /**
   * Mixin used to force render any time the model has changed
   */
  React.mixins.add('modelChangeListener', {
    getInitialState: function() {
      _.each(['change', 'reset', 'add', 'remove', 'sort'], function(type) {
        this.modelOn(type, function() { this.forceUpdate(); });
      }, this);
      return null;
    }
  }, 'modelEventBinder');


  // THE FOLLING MIXINS ASSUME THE INCLUSION OF [backbone-async-event](https://github.com/jhudson8/backbone-async-event)

  /**
   * Gives any comonent the ability to mark the "loading" attribute in the state as true
   * when any async event of the given type (defined by the "key" property) occurs.
   */
  React.mixins.add('loadOn', {
    getInitialState: function() {
      var key = this.props.loadOn;
      this.modelOn('async:' + key, function(events) {
        this.setState({loading: true});
        events.on('complete', function() {
          this.setState({loading: false});
        }, this);
      });
      return {};
    }
  }, 'modelEventBinder');

  /**
   * If the model executes *any* asynchronous activity, the internal state "loading" attribute
   * will be set to true and, if an error occurs with loading, the "error" state attribute
   * will be set with the error contents
   */
  React.mixins.add('asyncListener', {
    getInitialState: function() {
      this.modelOn('async', function(eventName, events) {
        this.setState({loading: true});

        var model = this.getModel();
        events.on('success', function() {
          this.setState({loading: !!model.isLoading()});
        }, this);
        events.on('error', function(error) {
          this.setState({loading: !!model.isLoading(), error: error});
        }, this);
      });

      var model = this.getModel();
      if (model && model.isLoading()) {
        return {loading: true};
      }
      return {};
    },

    componentDidMount: function() {
      // make sure the model didn't get into a non-loading state before mounting
      var state = this.state,
          model = this.getModel();
      if (model) {
        if (model.isLoading()) {
          // we're still loading yet but we haven't yet bound to this event
          this.modelOnce('async:load-complete', function() {
            this.setState({loading: false});
          });
          if (!state.loading) {
            this.setState({loading: true});
          }
        } else if (state.loading) {
          this.setState({loading: false});
        }
      }
    }
  }, 'modelEventBinder');
}