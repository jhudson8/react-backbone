/*!
 * react-backbone v0.1.2
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
    define(['react', 'underscore'], main);
  } else if (typeof exports !== 'undefined' && typeof require !== 'undefined') {
    module.exports = function(React) {
      main(React, require('underscore'));
    };
  } else {
    main(React, _);
  }
})(function(React, _) {

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
   * Simple overrideable mixin to get/set model values.  While this is trivial to do
   * it allows 3rd party to work with stubs which this can override.  It was designed
   * with https://github.com/jhudson8/react-semantic-ui in mind to be backbone model
   * friendly without actually depending on backbone models.  The model key is set
   * using the "key" property.
   */  
  React.mixins.add('modelValueAccessor', {
    getModelValue: function() {
      var key = this.props.key,
          model = this.getModel();
      if (model && key) {
        return model.get(key);
      }
    },

    setModelValue: function(value, options) {
      var key = this.props.key,
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

  /**
   * Gives any comonent the ability to mark the "loading" attribute in the state as true
   * when any async event of the given type (defined by the "key" property) occurs.
   */
  React.mixins.add('modelLoadOn', {
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
});
