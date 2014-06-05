/*!
 * react-backbone v0.3.1
 * https://github.com/jhudson8/react-backbone
 * 
 * Copyright (c) 2014 Joe Hudson<joehud_AT_gmail.com>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
 (function(main) {
  if (typeof define === 'function' && define.amd) {
    define(['react', 'backbone', 'underscore'], main);
  } else if (typeof exports !== 'undefined' && typeof require !== 'undefined') {
    module.exports = function(React, Backbone) {
      main(React, Backbone, require('underscore'));
    };
  } else {
    main(React, Backbone, _);
  }
})(function(React, Backbone, _) {

  function eventParser(src) {
    if (!src) {
      return;
    }
    if (_.isArray(src)) {
      return src;
    }
    return [src];
  }

  function getKey(context) {
    return context.props.key || context.props.ref;
  }

  function modelEventHandler(identifier, context, eventFormat, callback) {
    var keys = eventParser(context.props[identifier]),
        key, eventName;
    if (keys) {
      // register the event handlers to watch for these events
      for (var i=0; i<keys.length; i++) {
        key = keys[i];
        eventName = eventFormat.replace('{key}', key);
        context.modelOn(eventName, _.bind(callback, context), this);
      }
      return keys;
    }
  }


  /**
   * Internal model event binding handler
   */
  function onEvent(type, eventName, callback, context) {
    context = context || this;
    var modelEvents, eventsParent = this;
    if (this.state) {
      modelEvents = this.state.__modelEvents;
      eventsParent = this.state;
    } else {
      modelEvents = this.__modelEvents;
    }
    if (!modelEvents) {
      // don't call setState because this should not trigger a render
      modelEvents = eventsParent.__modelEvents = {};
    }
    modelEvents[eventName] = {type: type, callback: callback, context: context};
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
      return this.props.model;
    },

    setModel: function(model) {
      if (this._modelUnbindAll) {
        this._modelUnbindAll(true);
      }
      this.setProps({model: model});
      if (this._modelBindAll && this.isMounted()) {
        // bind all events if using modelEventBinder
        this._modelBindAll();
      }
    }
  });

  /**
   * Simple overrideable mixin to get/set model values.  While this is trivial to do
   * it allows 3rd party to work with stubs which this can override.  It was designed
   * with https://github.com/jhudson8/react-semantic-ui in mind to be backbone model
   * friendly without actually depending on backbone models.  The model key is set
   * using the "key" or "ref" property.
   */  
  React.mixins.add('modelValueAccessor', {
    getModelValue: function() {
      var key = getKey(this),
          model = this.getModel();
      if (model && key) {
        return model.get(key);
      }
    },

    setModelValue: function(value, options) {
      var key = getKey(this),
          model = this.getModel();
      if (model && key) {
        return model.set(key, value, options);
      }
    }
  }, 'modelAccessor');

  /**
   * Exposes model binding registration functions that will
   * be cleaned up when the component is unmounted and not actually registered
   * until the component is mounted.  The context will be "this" if not provided.
   */
  React.mixins.add('modelEventBinder', {
    getInitialState: function() {
      return {};
    },

    // model.on
    modelOn: function (eventName, callback, context) {
      onEvent.call(this, 'on', eventName, callback, context);
    },

    // model.once
    modelOnce: function (eventName, callback, context) {
      onEvent.call(this, 'once', eventName, callback, context);
    },

    modelOff: function (eventName, callback, context) {
      var modelEvents = this.state.__modelEvents;
      if (modelEvents) {
        var data = modelEvents[eventName],
            model = this.getModel();
        if (model && data) {
          model.off(eventName, callback, context || this);
        } else if (data) {
          delete modelEvents[eventName];
        }
      }
    },

    // bind all registered events to the model
    _modelBindAll: function() {
      var modelEvents = this.__modelEvents;
      if (modelEvents) {
        // if events were registered before this time, move the cache to state
        delete this.__modelEvents;
        // don't use setState because there is no need to trigger a render
        this.state.__modelEvents = modelEvents;
      }

      modelEvents = this.state.__modelEvents;
      if (modelEvents) {
        var model = this.getModel();
        if (model) {
          _.each(modelEvents, function(data, eventName) {
            model[data.type](eventName, data.callback, data.context);
          });
        }
      }
    },

    // unbind all registered events from the model
    _modelUnbindAll: function(keepRegisteredEvents) {
      var modelEvents = this.state.__modelEvents;
      if (modelEvents) {
        var model = this.getModel();
        if (model) {
          _.each(modelEvents, function(data, eventName) {
            model.off(eventName, data.callback, data.context);
          });
        }
        if (!keepRegisteredEvents) {
          delete this.state.__modelEvents;
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
   * If the model executes *any* asynchronous activity, the internal state "loading" attribute
   * will be set to true and, if an error occurs with loading, the "error" state attribute
   * will be set with the error contents
   */
  React.mixins.add('modelAsyncListener', {
    getInitialState: function() {
      this.modelOn('async', function(eventName, events) {
        this.setState({loading: true});

        var model = this.getModel();
        events.on('success', function() {
          if (this.isMounted()) {
            this.setState({loading: !!model.isLoading()});
          }
        }, this);
        events.on('error', function(error) {
          if (this.isMounted()) {
            this.setState({loading: !!model.isLoading(), error: error});
          }
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

  /**
   * Using the "key" property, bind to the model and look for invalid events.  If an invalid event
   * is found, set the "error" state to the field error message.  Use the "modelIndexErrors" mixin
   * to return the expected error format: { field1Key: errorMessage, field2Key: errorMessage, ... }
   */
  React.mixins.add('modelInvalidBinder', {
    getInitialState: function() {
      var key = getKey(this);
      if (key) {
        this.modelOn('invalid', function(model, errors) {
          errors = this.modelIndexErrors(errors) || {};
          var message = errors[key];
          if (message) {
            this.setState({
              error: message
            });
          }
        });
      }
      return {};
    }
  }, 'modelIndexErrors', 'modelEventBinder');

  /**
   * Expose an indexModelErrors method which returns model validation errors in a standard format.
   * expected return is { field1Key: errorMessage, field2Key: errorMessage, ... }
   * 
   * This implementation will look for [{field1Key: message}, {field2Key: message}, ...]
   */
  React.mixins.add('modelIndexErrors', {
    modelIndexErrors: function(errors) {
      if (Array.isArray(errors)) {
        var rtn = {};
        _.each(errors, function(data) {
          var key, message;
          for (var name in data) {
            rtn[name] = data[name];
          }
        });
        return rtn;
      } else {
        return errors;
      }
    }
  });

  /**
   * Gives any comonent the ability to mark the "loading" attribute in the state as true
   * when any async event of the given type (defined by the "key" property) occurs.
   */
  React.mixins.add('modelLoadOn', {
    getInitialState: function() {
      var keys = modelEventHandler('loadOn', this, 'async:{key}', function(events) {
        this.setState({loading: true});
        events.on('complete', function() {
          if (this.isMounted()) {
            this.setState({loading: false});
          }
        }, this);
      });

      // see if we are currently loading something
      var model = this.getModel();
      if (model) {
        var currentLoads = model.isLoading(),
            key;
        if (currentLoads) {
          var clearLoading = function() {
            if (this.isMounted()) {
              this.setState({loading: false});
            }
          }
          for (var i=0; i<currentLoads.length; i++) {
            var keyIndex = keys.indexOf(currentLoads[i].method);
            if (keyIndex >= 0) {
              // there is currently an async event for this key
              key = keys[keyIndex];
              currentLoads[i].on('complete', clearLoading, this);
              return {loading: true};
            }
          }
        }
      }
      return {};
    }
  }, 'modelEventBinder');

  /**
   * Gives any comonent the ability to force an update when an event is fired
   */
  React.mixins.add('modelUpdateOn', {
    getInitialState: function() {
      var keys = modelEventHandler('updateOn', this, '{key}', function() {
        this.forceUpdate();
      });
    },

    updateOnModelEvent: function(/* events */) {
      function doUpdate() {
        this.forceUpdate();
      }
      _.each(arguments, function(event) {
        this.modelOn(event, doUpdate);
      }, this);
    }
  }, 'modelEventBinder');

  // if [react-events](https://github.com/jhudson8/react-events) is included, set Backbone.Events as the default Events mixin
  if (React.events) {
    React.events.mixin = React.events.mixin || Backbone.Events;

    /**
     * Support the "model:{event name}" event, for example:
     * events {
     *   'model:something-happened': 'onSomethingHappened'
     * }
     * ...
     * onSomethingHappened: function() { ... }
     * 
     * When using these model events, you *must* include the "modelEventBinder" mixin
     */
    React.events.handle('model', function(options, callback) {
      return {
        on: function() {
          this.modelOn(options.path, callback);
        },
        off: function() { /* NOP, modelOn will clean up */ }
      };
    });
  }
});
