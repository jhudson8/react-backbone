/*!
 * react-backbone v0.13.8
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
    define([], function() {
      // with AMD
      //  require(
      //    ['react', 'backbone', 'underscore', 'react-backbone'], function(React, Backbone, _, reactBackbone) {
      //    reactBackbone(React, Backbone, _); 
      //  });
      return main;
    });
  } else if (typeof exports !== 'undefined' && typeof require !== 'undefined') {
    // with CommonJS
    // require('react-backbone')(require('react'), require('backbone'), require('underscore'));
    module.exports = main;
  } else {
    main(React, Backbone, _);
  }
})(function(React, Backbone, _) {

  var xhrEventName = Backbone.xhrEventName;
  var xhrCompleteEventName = Backbone.xhrCompleteEventName;
  var xhrModelLoadingAttribute = Backbone.xhrModelLoadingAttribute;

  var getState = React.mixins.getState;
  var setState = React.mixins.setState;

  // use Backbone.Events as the events impl if none is already defined
  React.events.mixin = React.events.mixin || Backbone.Events;

  /**
   * Return the model specified by a ReactComponent property key
   */
  function getModelByPropkey(key, context, useGetModel) {
    var model;
    if (key) {
      model = context.props[key];
      if (!model) {
        throw new Error('No model found for "' + key + '"');
      }
    } else if (useGetModel) {
      model = context.getModel();
    }
    return model;
  }

  function getModelOrCollection(type, context, props) {
    if (type === 'collection') {
      return context.getCollection(props);
    } else {
      return context.getModel(props)
    }
  }

  /**
   * Return either an array of elements (if src provided is not an array)
   * or undefined if the src is undefined
   */
  function ensureArray(src) {
    if (!src) {
      return;
    }
    if (_.isArray(src)) {
      return src;
    }
    return [src];
  }

  /**
   * Return a callback function that will provide the model
   */
  function targetModel(modelToUse) {
    return function() {
      if (modelToUse) {
        return modelToUse;
      }
      if (this.getModel) {
        return this.getModel();
      }
    }
  }

  /**
   * Return a model attribute key used for attribute specific operations
   */
  function getKey(context) {
    if (context.getModelKey) {
      return context.getModelKey();
    }
    return context.props.name || context.props.key || context.props.ref;
  }
  React.mixins.getModelKey = getKey;

  /**
   * Returns model validation errors in a standard format.
   * expected return is { field1Key: errorMessage, field2Key: errorMessage, ... }
   *
   * This implementation will look for [{field1Key: message}, {field2Key: message}, ...]
   */
  function modelIndexErrors(errors, context) {
    if (context && context.modelIndexErrors) {
      return context.modelIndexErrors(errors);
    }
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
  React.mixins.modelIndexErrors = modelIndexErrors;

  /**
   * Return the callback function (key, model) if both the model exists
   * and the model key is available
   */
  function ifModelAndKey(component, callback) {
    if (component.getModel) {
      var key = getKey(component);
      var model = component.getModel();
      if (model) {
        return callback(key, model);
      }
    }
  }

  /**
   * Utility method used to handle model/collection events
   */
  function modelOrCollectionEventHandler(type, identifier, context, eventFormat, callback) {
    var keys = Array.isArray(identifier) ? identifier : ensureArray(context.props[identifier]),
      key, eventName;
    if (keys) {
      // register the event handlers to watch for these events
      for (var i = 0; i < keys.length; i++) {
        key = keys[i];
        eventName = eventFormat.replace('{key}', key);
        context[type + 'On'](eventName, _.bind(callback, context), this);
      }
      return keys;
    }
  }

  /**
   * Provide modelOn and modelOnce argument with proxied arguments
   * arguments are event, callback, context
   */
  function modelOnOrOnce(modelType, type, args, _this, _modelOrCollection) {
    var modelEvents = getModelEvents(_this);
    var ev = args[0];
    var cb = args[1];
    var ctx = args[2];
    modelEvents[ev] = {type: type, ev: ev, cb: cb, ctx: ctx};
    var modelOrCollection = _modelOrCollection || getModelOrCollection(modelType, _this);
    if (modelOrCollection) {
      _this[type === 'on' ? 'listenTo' : 'listenToOnce'](modelOrCollection, ev, cb, ctx);
    }
  }

  /**
   * Return all bound model events
   */
  function getModelEvents(context) {
    var modelEvents = getState('__modelEvents', context);
    if (!modelEvents) {
      modelEvents = {};
      setState({__modelEvents: modelEvents}, context);
    }
    return modelEvents;
  }


  Backbone.input = Backbone.input || {};
  var getModelValue = Backbone.input.getModelValue = function(component) {
    return ifModelAndKey(component, function(key, model) {
      return model.get(key);
    });
  };
  var setModelValue = Backbone.input.setModelValue = function(component, value, options) {
    return ifModelAndKey(component, function(key, model) {
      return model.set(key, value, options);
    });
  }


  _.each([{
    type: 'model',
    capType: 'Model',
    changeEvents: ['change']
  }, {
    type: 'collection',
    capType: 'Collection',
    changeEvents: ['add', 'remove', 'reset', 'sort']
  }], function(typeData) {

    /**
     * Simple overrideable mixin to get/set models or collections.  Model/Collection can
     * be set on props or by calling setModel or setCollection
     */
    var typeAware = {};
    typeAware['get' + typeData.capType] = function(props) {
      props = props || this.props;
      return getState(typeData.type, this) || props[typeData.type];
    };
    typeAware['set' + typeData.capType] = function(modelOrCollection, _suppressState) {
      var preModelOrCollection = getModelOrCollection(typeData.type, this, this.props);
      var modelEvents = getModelEvents(this);
      _.each(modelEvents, function(data) {
        this.modelOff(data.ev, data.cb, data.ctx, preModelOrCollection);
        modelOnOrOnce(typeData.type, data.type, [data.ev, data.cb, data.ctx], this, modelOrCollection);
      }, this);
      if (_suppressState !== true) {
        setState(typeData.type, modelOrCollection);
      }
    }
    React.mixins.add(typeData.type + 'Aware', typeAware, 'state');


    /**
     * Exposes model binding registration functions that will
     * be cleaned up when the component is unmounted and not actually registered
     * until the component is mounted.  The context will be "this" if not provided.
     *
     * This is similar to the "listenTo" mixin but model event bindings here will
     * be transferred to another model if a new one is set on the props.
     */
    var typeEvents = {
      getInitialState: function() {
        // model sanity check
        var modelOrCollection = getModelOrCollection(typeData.type, this);
        if (modelOrCollection) {
          if (!modelOrCollection.off || !modelOrCollection.on) {
            console.error('the model/collection does not implement on/off functions - you will see problems');
            console.log(modelOrCollection);
          }
        }
        return {};
      },

      componentWillReceiveProps: function(props) {
        var preModelOrCollection = getModelOrCollection(typeData.type, this);
        var postModelOrCollection = getModelOrCollection(typeData.type, this, props);
        if (preModelOrCollection !== postModelOrCollection) {
          this['set' + typeData.capType](postModelOrCollection, true);
        }
      },
    };
    typeEvents[typeData.type + 'On'] = function(ev, callback, context) {
      modelOnOrOnce(typeData.type, 'on', arguments, this);
    };
    typeEvents[typeData.type + 'Once'] = function(ev, callback, context) {
      modelOnOrOnce(typeData.type, 'once', arguments, this);
    };
    typeEvents[typeData.type + 'Off'] = function(ev, callback, context, _modelOrCollection) {
      var modelEvents = getModelEvents(this);
      delete modelEvents[ev];
      this.stopListening(targetModel(_modelOrCollection), ev, callback, context);
    };
    React.mixins.add(typeData.type + 'Events', typeEvents, typeData.type + 'Aware', 'listen', 'events');

    /**
     * Mixin used to force render any time the model has changed
     */
    var changeAware = {
      getInitialState: function() {
        _.each(typeData.changeEvents, function(eventName) {
          this[typeData.type + 'On'](eventName, function() {
            this.deferUpdate();
          }, this);
        }, this);
      }
    }
    React.mixins.add(typeData.type + 'ChangeAware', changeAware, typeData.type + 'Events', 'listen', 'events', 'deferUpdate');


    // THE FOLLING MIXINS ASSUME THE INCLUSION OF [backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events)

    /**
     * If the model executes *any* XHR activity, the internal state "loading" attribute
     * will be set to true and, if an error occurs with loading, the "error" state attribute
     * will be set with the error contents
     */
    var xhrAware = {
      getInitialState: function() {
        this[typeData.type + 'On'](xhrEventName, function(eventName, events) {
          setState({
            loading: true
          }, this);

          var modelOrCollection = getModelOrCollection(typeData.type, this);
          events.on('success', function() {
            setState({
              loading: modelOrCollection[xhrModelLoadingAttribute]
            }, this);
          }, this);
          events.on('error', function(error) {
            setState({
              loading: modelOrCollection[xhrModelLoadingAttribute],
              error: error
            }, this);
          }, this);
        });

        var modelOrCollection = getModelOrCollection(typeData.type, this);
        return {
          loading: modelOrCollection && modelOrCollection[xhrModelLoadingAttribute]
        };
      },

      componentDidMount: function() {
        // make sure the model didn't get into a non-loading state before mounting
        var state = this.state,
          modelOrCollection = getModelOrCollection(typeData.type, this);
        if (modelOrCollection) {
          var loading = modelOrCollection[xhrModelLoadingAttribute];
          if (loading) {
            // we're still loading yet but we haven't yet bound to this event
            this[typeData.type + 'Once'](xhrCompleteEventName, function() {
              setState({
                loading: false
              }, this);
            });
            if (!state.loading) {
              setState({
                loading: true
              }, this);
            }
          } else if (state.loading) {
            setState({
              loading: false
            }, this);
          }
        }
      }
    };
    React.mixins.add(typeData.type + 'XHRAware', xhrAware, typeData.type + 'Events');


    /**
     * Gives any comonent the ability to mark the "loading" attribute in the state as true
     * when any async event of the given type (defined by the "key" property) occurs.
     */
    var loadOn = function() {
      var keys = arguments.length > 0 ? Array.prototype.slice.call(arguments, 0) : undefined;
      return {
        getInitialState: function() {
          keys = modelOrCollectionEventHandler(typeData.type, keys || 'loadOn', this, xhrEventName + ':{key}', function(events) {
            var modelOrCollection = getModelOrCollection(typeData.type, this);
            setState({
              loading: modelOrCollection[xhrModelLoadingAttribute]
            }, this);
            events.on('complete', function() {
              setState({
                loading: false
              }, this);
            }, this);
          });

          // see if we are currently loading something
          var modelOrCollection = getModelOrCollection(typeData.type, this);
          if (modelOrCollection) {
            var currentLoads = modelOrCollection.loading,
              key;
            if (currentLoads) {
              var clearLoading = function() {
                setState({
                  loading: false
                }, this);
              }
              for (var i = 0; i < currentLoads.length; i++) {
                var keyIndex = keys.indexOf(currentLoads[i].method);
                if (keyIndex >= 0) {
                  // there is currently an async event for this key
                  key = keys[keyIndex];
                  currentLoads[i].on('complete', clearLoading, this);
                  return {
                    loading: modelOrCollection[xhrModelLoadingAttribute]
                  };
                }
              }
            }
          }
          return {};
        },

        /**
         * Intercept (and return) the options which will set the loading state (state.loading = true) when this is called and undo
         * the state once the callback has completed
         */
        loadWhile: function(options) {
          options = options || {};
          var self = this;

          function wrap(type) {
            var _callback = options[type];
            options[type] = function() {
              setState({
                loading: false
              }, self);
              if (_callback) {
                _callback.apply(this, arguments);
              }
            }
          }
          wrap('error');
          wrap('success');
          setState({
            loading: true
          }, this);
          return options;
        }
      };
    };
    React.mixins.add(typeData.type + 'LoadOn', loadOn, typeData.type + 'Events');


    /**
     * Gives any comonent the ability to force an update when an event is fired
     */
    var updateOn = function() {
      var keys = arguments.length > 0 ? Array.prototype.slice.call(arguments, 0) : undefined;
      return {
        getInitialState: function() {
          modelOrCollectionEventHandler(typeData.type, keys || 'updateOn', this, '{key}', function() {
            this.deferUpdate();
          });
        }
      };
    };
    React.mixins.add(typeData.type + 'UpdateOn', updateOn, typeData.type + 'Events', 'deferUpdate');


    /**
     * Support the "model:{event name}" event, for example:
     * events {
     *   'model:something-happened': 'onSomethingHappened'
     * }
     * ...
     * onSomethingHappened: function() { ... }
     *
     * When using these model events, you *must* include the "model/collectionEvents" mixin
     */
    var _modelOrCollctionPattern = new RegExp('^' + typeData.type + '(\[.+\])?$');
    React.events.handle(_modelOrCollctionPattern, function(options, callback) {
      return {
        on: function() {
          if (!this[typeData.type + 'On']) {
            throw new Error('use the ' + typeData.type + ' "Events" mixin instead of "events"');
          }
          this[typeData.type + 'On'](options.path, callback);
        },
        off: function() { /* NOP, modelOn will clean up */ }
      };
    });

  });


  /**
   * Iterate through the provided list of components (or use this.refs if components were not provided) and
   * return a set of attributes.  If a callback is provided as the 2nd parameter and this component includes
   * the "modelAware" mixin, set the attributes on the model and execute the callback if there is no validation error.
   */
  React.mixins.add('modelPopulate', {
    modelPopulate: function() {
      var components, callback, options, model, drillDown;
      // determine the function args
      _.each(arguments, function(value) {
        if (value instanceof Backbone.Model) {
          model = value;
        } else if (_.isBoolean(value)) {
          drillDown = true;
          model = false;
        } else if (_.isArray(value)) {
          components = value;
        } else if (_.isFunction(value)) {
          callback = value;
        } else {
          options = value;
        }
      });
      if (_.isUndefined(model) && this.getModel) {
        model = this.getModel();
      }

      var attributes = {};
      if (!components) {
        // if not components were provided, use "refs" (http://facebook.github.io/react/docs/more-about-refs.html)
        components = _.map(this.refs, function(value) {
          return value;
        });
      }
      var models = {};
      _.each(components, function(component) {
        // the component *must* implement getValue or modelPopulate to participate
        if (component.getValue) {
          var key = getKey(component)
          if (key) {
            var value = component.getValue();
            attributes[key] = value;
          }
        } else if (component.modelPopulate && component.getModel) {
          if (!model && !drillDown) {
            // if we aren't populating to models, this is not necessary
            return;
          }
          var _model = component.getModel();
          var testModel = model || (options && options.populateModel);
          if (_model === testModel) {
            var _attributes = component.modelPopulate(_.extend({populateModel: testModel}, options), true);
            _.defaults(attributes, _attributes);
          }
        }
      });

      if (model) {
        if (model.set(attributes, {validate: true})) {
          callback.call(this, model);
        }
      }

      return attributes;
    }
  }, 'modelAware');


  /**
   * Expose a "modelValidate(attributes, options)" method which will run the backbone model validation
   * against the provided attributes.  If invalid, a truthy value will be returned containing the
   * validation errors.
   */
  React.mixins.add('modelValidator', {
    modelValidate: function(attributes, options) {
      var model = this.getModel();
      if (model && model.validate) {
        return modelIndexErrors(model.validate(attributes, options), this) || false;
      }
    }
  }, 'modelAware');


  /**
   * Using the "key" property, bind to the model and look for invalid events.  If an invalid event
   * is found, set the "error" state to the field error message.  Use React.mixins.modelIndexErrors
   * to return the expected error format: { field1Key: errorMessage, field2Key: errorMessage, ... }
   */
  React.mixins.add('modelInvalidAware', {
    getInitialState: function() {
      var key = getKey(this);
      if (key) {
        this.modelOn('invalid', function(model, errors) {
          var _errors = modelIndexErrors(errors, this) || {};
          var message = _errors && _errors[key];
          if (message) {
            setState({
              invalid: message
            }, this);
          }
        });
      }
      return {};
    }
  }, 'modelEventAware');


  var specials = React.events.specials;
  if (specials) {
    // add underscore wrapped special event handlers
    function parseArgs(args) {
      var arg;
      for (var i = 0; i < args.length; i++) {
        arg = args[i];
        if (arg === 'true') {
          arg = true;
        } else if (arg === 'false') {
          arg = false;
        } else if (arg.match(/^[0-9]+$/)) {
          arg = parseInt(arg);
        } else if (arg.match(/^[0-9]+\.[0-9]+/)) {
          arg = parseFloat(arg);
        }
        args[i] = arg;
      }
      return args;
    }
    var reactEventSpecials = ['memoize', 'delay', 'defer', 'throttle', 'debounce', 'once', 'after', 'before'];
    _.each(reactEventSpecials, function(name) {
      specials[name] = specials[name] || function(callback, args) {
        args = parseArgs(args);
        args.splice(0, 0, callback);
        return _[name].apply(_, args);
      };
    });
  }


  // Standard input components that implement react-backbone model awareness
  var _inputClass = function(type, attributes, isCheckable, classAttributes) {
    return React.createClass(_.extend({
      mixins: ['modelAware'],
      render: function() {
        var props = {};
        var defaultValue = getModelValue(this);
        if (isCheckable) {
          props.defaultChecked = defaultValue;
        } else {
          props.defaultValue = defaultValue;
        }
        return React.DOM[type](_.extend(props, attributes, this.props), this.props.children);
      },
      getValue: function() {
        if (this.isMounted()) {
          if (isCheckable) {
            var el = this.getDOMNode();
            return (el.checked && (el.value || true)) || false;
          } else {
            return $(this.getDOMNode()).val();
          }
        }
      },
      getDOMValue: function() {
        if (this.isMounted()) {
          return $(this.getDOMNode()).val();
        }
      }
    }, classAttributes));
  };

  Backbone.input = Backbone.input || {};
  _.defaults(Backbone.input, {
    Text: _inputClass('input', {
      type: 'text'
    }),
    TextArea: _inputClass('textarea'),
    Select: _inputClass('select', undefined, undefined),
    CheckBox: _inputClass('input', {
      type: 'checkbox'
    }, true),
    RadioGroup: React.createClass({
      render: function() {
        var props = this.props;
        props.ref = 'input';
        return React.DOM[props.tag || 'span'](props, props.children);
      },
      componentDidMount: function() {
        // select the appropriate radio button
        var value = getModelValue(this);
        if (value) {
          var selector = 'input[value="' + value.replace('"', '\\"') + '"]';
          var el = $(this.getDOMNode()).find(selector);
          el.attr('checked', 'checked');
        }
      },
      getValue: function() {
        if (this.isMounted()) {
          var selector = 'input[type="radio"]';
          var els = $(this.getDOMNode()).find(selector);
          for (var i = 0; i < els.length; i++) {
            if (els[i].checked) {
              return els[i].value;
            }
          }
        }
      },
      getDOMValue: function() {
        if (this.isMounted()) {
          var selector = 'input[type="radio"]';
          return $(this.getDOMNode()).val();
        }
      }
    })
  });

});
