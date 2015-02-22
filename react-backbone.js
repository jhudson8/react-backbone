/*!
 * react-backbone v0.21.1
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
            //    ['react', 'backbone', 'underscore', 'jquery', react-backbone'], function(React, Backbone, _, $, reactBackbone) {
            //    reactBackbone(React, Backbone, _, $); 
            //  });
            return main;
        });
    } else if (typeof exports !== 'undefined' && typeof require !== 'undefined') {
        // with CommonJS
        // require('react-backbone')(require('react'), require('backbone'), require('underscore')), require('jquery'));
        module.exports = main;
    } else {
        main(React, Backbone, _, $);
    }
})(function(React, Backbone, _, $) {

    // main body start
    // create local references to existing vars
    var namespace = 'react-backbone.',
        xhrEventName = Backbone.xhrEventName,
        xhrModelLoadingAttribute = Backbone.xhrModelLoadingAttribute,
        getState = React.mixins.getState,
        setState = React.mixins.setState,
        logDebugWarnings = React.reactBackboneDebugWarnings,
        NEW = /^new:?(.*)/;
    if (_.isUndefined(logDebugWarnings)) {
        logDebugWarnings = true;
    }

    // use Backbone.Events as the events impl if none is already defined
    React.events.mixin = React.events.mixin || Backbone.Events;

    function addMixin() {
        var args = _.toArray(arguments);
        if (_.isString(args)) {
            args[0] = namespace + args[0];
        } else {
            args.name = namespace + args.name;
        }
        React.mixins.add.apply(React.mixins, args);
    }

    function firstModel(component) {
        if (component.getModel) {
            return component.getModel();
        }
    }

    function getModelOrCollections(type, context, callback, props) {
        if (type === 'collection') {
            return context.getCollection(callback, props);
        } else {
            return context.getModel(callback, props);
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
     * Return a callback function that will provide the model or collection
     */
    function targetModelOrCollections(type, context, modelOrCollectionToUse) {
        return function() {
            if (modelOrCollectionToUse) {
                return modelOrCollectionToUse;
            }
            return getModelOrCollections(type, context);
        };
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
                for (var name in data) {
                    if (data.hasOwnProperty(name)) {
                        rtn[name] = data[name];
                    }
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
        var model = firstModel(component);
        if (model) {
            var key = getKey(component);
            return callback(key, model);
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
    function modelOrCollectionOnOrOnce(modelType, type, args, _this, _modelOrCollection) {
        var modelEvents = getModelAndCollectionEvents(modelType, _this);
        var ev = args[0];
        var cb = args[1];
        var ctx = args[2];
        modelEvents[ev] = {
            type: type,
            ev: ev,
            cb: cb,
            ctx: ctx
        };

        function _on(modelOrCollection) {
            _this[type === 'on' ? 'listenTo' : 'listenToOnce'](modelOrCollection, ev, cb, ctx);
        }
        if (_modelOrCollection) {
            _on(_modelOrCollection);
        } else {
            getModelOrCollections(modelType, _this, _on);
        }
    }

    function unbindAndRebind(type, unbindModel, bindModel, context) {
        if (unbindModel === bindModel) {
            // nothing to do
            return;
        }
        var events = getModelAndCollectionEvents(type, context);
        if (unbindModel) {
            // turn off models that will be replaced
            _.each(events, function(eventData) {
                this.stopListening(unbindModel, eventData.ev, eventData.cb, eventData.ctx);
            }, context);
        }
        if (bindModel) {
            _.each(events, function(eventData) {
                modelOrCollectionOnOrOnce(type, eventData.type, [eventData.ev, eventData.cb, eventData.ctx], this, bindModel);
            }, context);
        }
    }

    /**
     * Return all bound model events
     */
    function getModelAndCollectionEvents(type, context) {
        var key = '__' + type + 'Events',
            modelEvents = getState(key, context);
        if (!modelEvents) {
            modelEvents = {};
            var stateVar = {};
            stateVar[key] = modelEvents;
            setState(stateVar, context);
        }
        return modelEvents;
    }

    // loading state helpers
    function pushLoadingState(xhrEvent, modelOrCollection, context) {
        var currentLoads = getState('loading', context);
        if (!currentLoads) {
            currentLoads = [];
        }
        if (_.isArray(currentLoads)) {
            currentLoads.push(xhrEvent);
            setState({
                loading: currentLoads
            }, context);
            xhrEvent.on('complete', function() {
                popLoadingState(xhrEvent, modelOrCollection, context);
            });
        }
    }

    // remove the xhrEvent from the loading state
    function popLoadingState(xhrEvent, modelOrCollection, context) {
        var currentLoads = getState('loading', context);
        if (_.isArray(currentLoads)) {
            var i = currentLoads.indexOf(xhrEvent);
            while (i >= 0) {
                currentLoads.splice(i, 1);
                i = currentLoads.indexOf(xhrEvent);
            }
            if (!currentLoads.length) {
                setState({
                    loading: false
                }, context);
            }
        }
    }

    // if there is any current xhrEvent that match the method, add a reference to it with this context
    function joinCurrentModelActivity(method, modelOrCollection, context) {
        var xhrActivity = modelOrCollection[xhrModelLoadingAttribute];
        if (xhrActivity) {
            _.each(xhrActivity, function(xhrEvent) {
                if (!method || xhrEvent.method === method) {
                    // this is one that is applicable
                    pushLoadingState(xhrEvent, modelOrCollection, context);
                }
            });
        }
    }

    // helpers to get and set a model value when only the component is known
    Backbone.input = Backbone.input || {};
    var getModelValue = Backbone.input.getModelValue = function(component) {
        return ifModelAndKey(component, function(key, model) {
            return model.get(key);
        });
    };
    Backbone.input.setModelValue = function(component, value, options) {
        return ifModelAndKey(component, function(key, model) {
            return model.set(key, value, options);
        });
    };

    // create mixins that are duplicated for both models and collections
    _.each([{
        type: 'model',
        defaultParams: [['model']],
        capType: 'Model',
        changeEvents: ['change']
    }, {
        type: 'collection',
        defaultParams: [['collection']],
        capType: 'Collection',
        changeEvents: ['add', 'remove', 'reset', 'sort']
    }], function(typeData) {
        var getThings = 'get' + typeData.capType;

        /**
         * Simple overrideable mixin to get/set models or collections.  Model/Collection can
         * be set on props or by calling setModel or setCollection.
         * This will return the *first* model (if there are multiple models) but a callback method
         * can be provided as the first parameter function(model, propName) which will be called
         * for every available model.
         */
        var typeAware = function(referenceArgs) {
            // use initiatedOnce format so model prop names can be changed (or multiple can be used)
            // for example, to get all model change monitoring with models set as "foo" and "bar" props, simply use
            // this will not render as a result of 2 way binding (unless the bind attribute is not === true)
            // mixins: ['modelAware("foo", "bar")', 'modelChangeAware']
            var rtn = {};
            rtn[getThings] = function(callback, props) {
                var _referenceArgs = referenceArgs,
                    propsProvided = !!props;
                props = props || this.props;
                if (!_referenceArgs || _referenceArgs.length === 0) {
                    _referenceArgs = typeData.defaultParams;
                }

                var firstModel, singleReferenceArgs;
                for (var i=0; i<_referenceArgs.length; i++) {
                    singleReferenceArgs = _referenceArgs[i];
                    for (var j=0; j<singleReferenceArgs.length; j++) {
                        var propName = singleReferenceArgs[j],
                            obj = getState(propName, this) || props[propName];

                        // if the "new" keyword is used, create a new model/collection using the
                        // "Model" or "Collection" attribute of the React component
                        if (!obj) {
                            var newMatch = propName.match(NEW);
                            if (newMatch) {
                                // create the new model/collection
                                obj = new this[typeData.capType](this.props);
                                if (newMatch[1] === 'fetch') {
                                    // and fetch if applicable
                                    obj.fetch();
                                }
                                var stateObj = [];
                                stateObj[propName] = obj;
                                setState(stateObj, this);
                            }
                        }

                        if (obj) {
                            firstModel = firstModel || obj;
                            if (callback) {
                                callback.call(this, obj, propName);
                            } else {
                                return obj;
                            }
                        } else if (propsProvided && callback && propName) {
                            // make callback anyway to let callers know of the prop transition
                            callback.call(this, undefined, propName);
                        }
                    }
                }
                return firstModel;
            };
            rtn['set' + typeData.capType] = function(model, key) {
                key = key || typeData.type;
                var stateData = {};
                var prevModel;
                this.getModel(function(model, _key) {
                    if (_key === key) {
                        prevModel = model;
                    }
                });
                // unbind previous model
                unbindAndRebind(typeData.type, prevModel, model, this);
                stateData[key] = model;
            };
            return rtn;
        };
        addMixin({ name: typeData.type + 'Aware', initiatedOnce: true }, typeAware, 'state');

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
                getModelOrCollections(typeData.type, this, function(obj, propName) {
                    if (logDebugWarnings && !obj.off || !obj.on) {
                        console.error('props.' + propName + ' does not implement on/off functions - you will see event binding problems (object logged to console below)');
                        console.log(obj);
                    }
                });
                return {};
            },

            componentWillReceiveProps: function(props) {
                // watch for model or collection changes by property so it can be un/rebound
                getModelOrCollections(typeData.type, this, function(obj, propName) {
                    var currentObj = this.props[propName];
                    unbindAndRebind(typeData.type, currentObj, obj, this);
                }, props);
            },
        };
        typeEvents[typeData.type + 'On'] = function( /* ev, callback, context */ ) {
            modelOrCollectionOnOrOnce(typeData.type, 'on', arguments, this);
        };
        typeEvents[typeData.type + 'Once'] = function( /* ev, callback, context */ ) {
            modelOrCollectionOnOrOnce(typeData.type, 'once', arguments, this);
        };
        typeEvents[typeData.type + 'Off'] = function(ev, callback, context, _modelOrCollection) {
            var events = getModelAndCollectionEvents(typeData.type, this);
            delete events[ev];
            this.stopListening(targetModelOrCollections(typeData.type, this, _modelOrCollection), ev, callback, context);
        };
        addMixin(typeData.type + 'Events', typeEvents, typeData.type + 'Aware', 'listen', 'events');

        /**
         * Mixin used to force render any time the model has changed
         */
        var changeAware = {
            getInitialState: function() {
                _.each(typeData.changeEvents, function(eventName) {
                    this[typeData.type + 'On'](eventName, function(model, options) {
                        if (!options || !options.twoWayBinding) {
                            this.deferUpdate();
                        }
                    }, this);
                }, this);
            }
        };
        addMixin(typeData.type + 'ChangeAware', changeAware, typeData.type + 'Events', 'listen', 'events', 'deferUpdate');

        // THE FOLLING MIXINS ASSUME THE INCLUSION OF [backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events)

        var xhrFactory = {
            getInitialState: function(keys, self) {
                function whenXHRActivityHappens(xhrEvents) {
                    getModelOrCollections(typeData.type, self, function(modelOrCollection) {
                        pushLoadingState(xhrEvents, modelOrCollection, self);
                    });
                }

                if (!keys) {
                    self[typeData.type + 'On'](xhrEventName, function(xhrEvents) {
                        whenXHRActivityHappens(xhrEvents);
                    });
                } else {
                    modelOrCollectionEventHandler(typeData.type, keys, self, xhrEventName + ':{key}', whenXHRActivityHappens);
                }
                return {};
            },

            componentWillMount: function(keys, self) {
                // make sure the model didn't get into a non-loading state before mounting
                getModelOrCollections(typeData.type, self, function(modelOrCollection) {
                    // we may bind an extra for any getInitialState bindings but
                    // the cleanup logic will deal with duplicate bindings
                    if (!keys) {
                        joinCurrentModelActivity(keys, modelOrCollection, self);
                    } else {
                        var _keys = _.isArray(keys) ? keys : self.props[keys];
                        if (!_keys) {
                            return;
                        } else if (!_.isArray(_keys)) {
                            _keys = [_keys];
                        }
                        _.each(_keys, function(key) {
                            joinCurrentModelActivity(key, modelOrCollection, self);
                        });
                    }
                });
            }
        };

        /**
         * If the model executes *any* XHR activity, the internal state "loading" attribute
         * will be set to true and, if an error occurs with loading, the "error" state attribute
         * will be set with the error contents
         */
        var xhrAware = {
            getInitialState: function() {
                return xhrFactory.getInitialState(undefined, this);
            },

            componentWillMount: function() {
                return xhrFactory.componentWillMount(undefined, this);
            }
        };
        addMixin(typeData.type + 'XHRAware', xhrAware, typeData.type + 'Events');

        /**
         * Gives any comonent the ability to mark the "loading" attribute in the state as true
         * when any async event of the given type (defined by the "key" property) occurs.
         */
        var loadOn = function() {
            var keys = arguments.length > 0 ? Array.prototype.slice.call(arguments, 0) : undefined;
            return {
                getInitialState: function() {
                    return xhrFactory.getInitialState(keys || 'loadOn', this);
                },

                componentWillMount: function() {
                    return xhrFactory.componentWillMount(keys || 'loadOn', this);
                }
            };
        };
        addMixin(typeData.type + 'LoadOn', loadOn, typeData.type + 'Events');

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
        addMixin(typeData.type + 'UpdateOn', updateOn, typeData.type + 'Events', 'deferUpdate');

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
        var _modelOrCollctionPattern = new RegExp('^' + typeData.type + '(\\[.+\\])?$');
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

    // add helper methods to include both model and collection mixins using a single mixin
    _.each(['XHRAware', 'ChangeAware', 'LoadOn', 'UpdateOn'], function(mixinKey) {
        React.mixins.alias('backbone' + mixinKey, 'model' + mixinKey, 'collection' + mixinKey);
    });

    /**
     * Iterate through the provided list of components (or use this.refs if components were not provided) and
     * return a set of attributes.  If a callback is provided as the 2nd parameter and this component includes
     * the "modelAware" mixin, set the attributes on the model and execute the callback if there is no validation error.
     */
    addMixin('modelPopulate', {
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
            if (_.isUndefined(model)) {
                model = firstModel(this);
            }

            var attributes = {};
            if (!components) {
                // if not components were provided, use "refs" (http://facebook.github.io/react/docs/more-about-refs.html)
                components = _.map(this.refs, function(value) {
                    return value;
                });
            }

            _.each(components, function(component) {
                // the component *must* implement getValue or modelPopulate to participate
                if (component.getValue) {
                    var key = getKey(component);
                    if (key) {
                        var value = component.getValue();
                        attributes[key] = value;
                    }
                } else if (component.modelPopulate && component.getModels) {
                    if (!model && !drillDown) {
                        // if we aren't populating to models, this is not necessary
                        return;
                    }
                    var _model = firstModel(component);
                    var testModel = model || (options && options.populateModel);
                    if (_model === testModel) {
                        var _attributes = component.modelPopulate(_.extend({
                            populateModel: testModel
                        }, options), true);
                        _.defaults(attributes, _attributes);
                    }
                }
            });

            if (model) {
                if (model.set(attributes, {
                    validate: true
                })) {
                    if (callback) {
                        callback.call(this, model);
                    }
                }
            }

            return attributes;
        }
    }, 'modelAware');

    /**
     * Intercept (and return) the options which will set the loading state (state.loading = true) when this is called and undo
     * the state once the callback has completed
     */
    addMixin('loadWhile', {
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
                };
            }
            wrap('error');
            wrap('success');
            setState({
                loading: true
            }, this);
            return options;
        }
    });

    /**
     * Expose a "modelValidate(attributes, options)" method which will run the backbone model validation
     * against the provided attributes.  If invalid, a truthy value will be returned containing the
     * validation errors.
     */
    addMixin('modelValidator', {
        modelValidate: function(attributes, options) {
            var model = firstModel(this);
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
    addMixin('modelInvalidAware', {
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
                this.modelOn('change:' + key, function() {
                    // if the change was successful, assume we are no longer invalid
                    setState({
                        invalid: undefined
                    }, this);
                });
            }
            return {};
        }
    }, 'modelEvents');

    var specials = React.events.specials;
    if (specials) {
        // add underscore wrapped special event handlers
        var reactEventSpecials = ['memoize', 'delay', 'defer', 'throttle', 'debounce', 'once', 'after', 'before'];
        _.each(reactEventSpecials, function(name) {
            specials[name] = specials[name] || function(callback, args) {
                args.splice(0, 0, callback);
                return _[name].apply(_, args);
            };
        });
    }

    function twoWayBinding(context) {
        var props = context.props,
            bind = props.bind;
        if (!bind || bind === 'false') {
            return props.onChange;
        } else {
            var options = (_.isString(bind) || bind === true) ? {twoWayBinding: true} : bind;
            return function(ev) {
                var model = context.getModel(),
                    key = getKey(context),
                    toSet = {};
                toSet[key] = context.getValue();
                if (model && key) {
                    if (options.validateField) {
                        // special validation which won't include all model attributes when validating
                        var error = model.validate(toSet, options);
                        if (error) {
                            model.trigger('invalid', model, error, _.extend(options, {validationError: error}));
                        } else {
                            model.set(toSet, options);
                        }
                    } else {
                        model.set(toSet, options);
                    }
                }
                if (context.props.onChange) {
                    context.props.onChange(ev);
                }
            };
        }
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
                return React.DOM[type](_.extend(props, attributes, this.props,
                    {onChange: twoWayBinding(this)}), this.props.children);
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
            mixins: ['modelAware'],
            render: function() {
                var props = _.clone(this.props);
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

                if (!this.state) {
                    this.state = {};
                }
                var changeHandler = this.state.changeHandler = twoWayBinding(this);
                if (changeHandler) {
                    $(this.getDOMNode()).on('change', 'input', changeHandler);
                }
            },
            componentWillUnmount: function() {
                var changeHandler = this.state && this.state.changeHandler;
                if (changeHandler) {
                    $(this.getDOMNode()).off('change', changeHandler);
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
                    return $(this.getDOMNode()).val();
                }
            }
        })
    });
    // main body end

});