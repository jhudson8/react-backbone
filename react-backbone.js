/*!
 * react-backbone v1.0.5
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
        define(['react-mixin-manager', 'react-events', 'react', 'backbone', 'underscore', 'backbone-xhr-events'],
            function(ReactMixinManager, ReactEvents, React, Backbone, _) {
            // AMD
            return main(ReactMixinManager, ReactEvents, React, Backbone, _);
        });
    } else if (typeof exports !== 'undefined' && typeof require !== 'undefined') {
        // CommonJS
        // just initialize backbone-xhr-events
        require('backbone-xhr-events');

        module.exports = main(
            require('react-mixin-manager'),
            require('react-events'),
            require('react'),
            require('backbone'),
            require('underscore')
        );
    } else {
        main(ReactMixinManager, ReactEvents, React, Backbone, _);
    }
})(function(ReactMixinManager, ReactEvents, React, Backbone, _) {

    // create local references to existing vars
    var namespace = 'react-backbone.',
        xhrEventName = Backbone.xhrEventName,
        xhrModelLoadingAttribute = Backbone.xhrModelLoadingAttribute,
        getState = ReactMixinManager.getState,
        setState = ReactMixinManager.setState,
        xhrGlobalEvents = Backbone[Backbone.xhrGlobalAttribute],
        LOADING_STATE_NAME = 'loading',
        CAP_ON = 'On',
        CAP_EVENTS = 'Events',
        EVENTS = 'events',
        CHANGE = 'change',
        ALL_XHR_ACTIVITY = 'all',
        LISTEN = 'listen',
        DEFER_UPDATE = 'deferUpdate',
        COLLECTION = 'collection',
        MODEL = 'model',
        rtn = {};

    // use Backbone.Events as the events impl if none is already defined
    if (!ReactEvents.mixin) {
        ReactEvents.mixin = Backbone.Events;
    }

    function logDebugWarnings() {
        var doLog = React.reactBackboneDebugWarnings;
        return _.isUndefined(doLog) || doLog;
    }

    function addMixin() {
        var args = _.toArray(arguments);
        if (_.isString(args)) {
            args[0] = namespace + args[0];
        } else {
            args.name = namespace + args.name;
        }
        ReactMixinManager.add.apply(ReactMixinManager, args);
    }

    function firstModel(component) {
        if (component.getModel) {
            return component.getModel();
        }
    }

    function getModelOrCollections(type, context, callback, props) {
        if (type === COLLECTION) {
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
    rtn.getModelKey = getKey;

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
    rtn.modelIndexErrors = modelIndexErrors;

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
        var keys = identifier;
        if (_.isString(keys)) {
            keys = ensureArray(context.props[keys]);
        }

        var isArray = _.isArray(keys);
        _.each(keys, function(value, key) {
            if (isArray) {
                key = value;
                value = undefined;
            }
            var eventName;
            if (_.isString(eventFormat)) {
                eventName = eventFormat.replace('{key}', key);
            } else {
                eventName = eventFormat(key);
            }
            context[type + CAP_ON](eventName, _.bind(callback, { key: key, value: value }), this);
        }, this);
        // we would have missed this with _.each
        if (!keys && _.isFunction(eventFormat)) {
            var eventName = eventFormat(undefined);
            if (eventName) {
                context[type + CAP_ON](eventName, _.bind(callback, {}), this);
            }
        }
        return keys;
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
        if (modelEvents.__bound) {
            if (_modelOrCollection) {
                _on(_modelOrCollection);
            } else {
                getModelOrCollections(modelType, _this, _on);
            }
        }
    }

    function unbindAndRebind(options) {
        var type = options.type,
            context = options.context,
            events = getModelAndCollectionEvents(type, context),
            bound = events.__bound;

        events.__bound = true;

        function unbindAndRebindModel(unbindModel, bindModel) {
            if (bound && unbindModel === bindModel) {
                return;
            }
            if (bound && unbindModel) {
                context.trigger(type + ':unbind', bindModel);
                // turn off models that will be replaced
                _.each(events, function(eventData) {
                    if (eventData && eventData !== true) {
                        this.stopListening(unbindModel, eventData.ev, eventData.cb, eventData.ctx);
                    }
                }, context);
            }
            if (bindModel) {
                context.trigger(type + ':bind', bindModel);
                _.each(events, function(eventData) {
                    if (eventData && eventData !== true) {
                        modelOrCollectionOnOrOnce(type, eventData.type,
                            [eventData.ev, eventData.cb, eventData.ctx], this, bindModel);
                    }
                }, context);
            }
        }

        getModelOrCollections(type, context, function(obj, propName) {
            var currentObj = this.props[propName];
            unbindAndRebindModel(currentObj, obj);
            if (currentObj !== obj && currentObj) {
                this.trigger(type + ':set', obj, propName, currentObj);
            }
        }, options.props || context.props);
    }

    /**
     * Return all bound model events
     */
    function getModelAndCollectionEvents(type, context) {
        var key = '__' + type + CAP_EVENTS,
            modelEvents = getState(key, context);
        if (!modelEvents) {
            modelEvents = {};
            var stateVar = {};
            stateVar[key] = modelEvents;
            setState(stateVar, context, false);
        }
        return modelEvents;
    }

    // loading state helpers
    function pushLoadingState(xhrEvent, stateName, modelOrCollection, context, force) {
        var currentLoads = getState(stateName, context),
            currentlyLoading = currentLoads && currentLoads.length;
        if (!currentLoads) {
            currentLoads = [];
        }
        if (_.isArray(currentLoads)) {
            if (_.indexOf(currentLoads, xhrEvent) >= 0) {
                if (!force) {
                    return;
                }
                
            } else {
                currentLoads.push(xhrEvent);
            }
            
            if (!currentlyLoading) {
                var toSet = {};
                toSet[stateName] = currentLoads;
                setState(toSet, context);
            }

            xhrEvent.on('complete', function() {
                popLoadingState(xhrEvent, stateName, modelOrCollection, context);
            });
        }
    }

    // remove the xhrEvent from the loading state
    function popLoadingState(xhrEvent, stateName, modelOrCollection, context) {
        var currentLoads = getState(stateName, context);
        if (_.isArray(currentLoads)) {
            var i = currentLoads.indexOf(xhrEvent);
            while (i >= 0) {
                currentLoads.splice(i, 1);
                i = currentLoads.indexOf(xhrEvent);
            }
            if (!currentLoads.length) {
                var toSet = {};
                toSet[stateName] = undefined;
                setState(toSet, context);
            }
        }
    }

    // if there is any current xhrEvent that match the method, add a reference to it with this context
    function joinCurrentModelActivity(method, stateName, modelOrCollection, context, force) {
        var xhrActivity = modelOrCollection[xhrModelLoadingAttribute];
        if (xhrActivity) {
            _.each(xhrActivity, function(xhrEvent) {
                if (!method || method === ALL_XHR_ACTIVITY || xhrEvent.method === method) {
                    // this is one that is applicable
                    pushLoadingState(xhrEvent, stateName, modelOrCollection, context, force);
                }
            });
        }
    }

    // helpers to get and set a model value when only the component is known
    var getModelValue = rtn.getModelValue = function(component) {
        return ifModelAndKey(component, function(key, model) {
            return model.get(key);
        });
    };
    rtn.setModelValue = function(component, value, options) {
        return ifModelAndKey(component, function(key, model) {
            return model.set(key, value, options);
        });
    };

    // create mixins that are duplicated for both models and collections
    _.each([{
        type: MODEL,
        defaultParams: [[MODEL]],
        capType: 'Model',
        changeEvents: [CHANGE],
        cachedKey: '__cachedModels'
    }, {
        type: COLLECTION,
        defaultParams: [[COLLECTION]],
        capType: 'Collection',
        changeEvents: [CHANGE, 'add', 'remove', 'reset', 'sort'],
        cachedKey: '__cachedCollections'
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
            var rtn = {
                getInitialState: function() {
                    return {};
                },
                componentWillReceiveProps: function() {
                    // watch for model or collection changes by property so it can be un/rebound
                    this.state[typeData.cachedKey] = undefined;
                }
            };
            rtn[getThings] = function(callback, props) {
                // normally we wouldn't keep this kind of thing in state but we are clearing
                // this state value any time the properties change
                var _cached = !props && this.state && this.state[typeData.cachedKey];
                if (!_cached) {
                    _cached = {};

                    var _referenceArgs = referenceArgs,
                        propsProvided = !!props;
                    props = props || this.props;
                    if (!_referenceArgs || _referenceArgs.length === 0) {
                        _referenceArgs = typeData.defaultParams;
                    }

                    var singleReferenceArgs;
                    for (var i=0; i<_referenceArgs.length; i++) {
                        singleReferenceArgs = _referenceArgs[i];
                        for (var j=0; j<singleReferenceArgs.length; j++) {
                            var propName = singleReferenceArgs[j],
                                obj = getState(propName, this) || props[propName];
                            if (obj) {
                                _cached[propName] = obj;


                            } else if (propsProvided && callback && propName) {
                                // make callback anyway to let callers know of the prop transition
                                callback.call(this, undefined, propName);
                            }
                        }
                    }

                    // if appropriate, set the cache
                    if (!propsProvided && this.state) {
                        this.state[typeData.cachedKey] = _cached;
                    }
                }

                var firstModel;
                _.each(_cached, function(obj, propName) {
                    firstModel = firstModel || obj;
                    if (callback) {
                        callback.call(this, obj, propName);
                    } 
                }, this);

                return firstModel;
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
                    if ((!obj.off || !obj.on) && logDebugWarnings()) {
                        console.error('props.' + propName + ' does not implement on/off functions - you will see event binding problems (object logged to console below)');
                        console.log(obj);
                    }
                });
                return null;
            },

            componentWillReceiveProps: function(props) {
                // watch for model or collection changes by property so it can be un/rebound
                unbindAndRebind({
                    context: this,
                    props: props,
                    type: typeData.type
                });
            },

            componentDidMount: function() {
                unbindAndRebind({
                    context: this,
                    type: typeData.type
                });
            }
        };
        typeEvents[typeData.type + CAP_ON] = function( /* ev, callback, context */ ) {
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
        addMixin(typeData.type + CAP_EVENTS, typeEvents, typeData.type + 'Aware', LISTEN, EVENTS);

        /**
         * Mixin used to force render any time the model has changed
         */
        var changeAware = {
            getInitialState: function() {
                _.each(typeData.changeEvents, function(eventName) {
                    this[typeData.type + CAP_ON](eventName, function(model, options) {
                        if (!options || !options.twoWayBinding) {
                            this.deferUpdate();
                        }
                    }, this);
                }, this);
            }
        };
        addMixin(typeData.type + 'ChangeAware', changeAware, typeData.type + CAP_EVENTS, LISTEN, EVENTS, DEFER_UPDATE);

        /**
         * Mixin used to force render any time the model has changed
         */
        var typeFetch = {
            getInitialState: function() {
                function doFetch(modelOrCollection) {
                    modelOrCollection.whenFetched(function() {});
                }
                this.on(typeData.type + ':bind', doFetch);
                this['get' + typeData.capType](doFetch);
            }
        };
        addMixin(typeData.type + 'Fetch', typeFetch, typeData.type + CAP_EVENTS);


        var xhrFactory = {
            getInitialState: function(keys, self) {
                console.log(keys);
                function whenXHRActivityHappens(xhrEvents) {
                    // ensure we don't bubble model xhr loading to collection
                    if (typeData.type === COLLECTION && xhrEvents.model instanceof Backbone.Model) {
                        return;
                    }
                    pushLoadingState(xhrEvents, this.value || LOADING_STATE_NAME, xhrEvents.model,
                        self, rtn);
                }

                var keyFormatter = function(key) {
                    if (!key || key === ALL_XHR_ACTIVITY) {
                        return xhrEventName;
                    } else {
                        return xhrEventName + ':' + key;
                    }
                };


                modelOrCollectionEventHandler(typeData.type, keys, self, keyFormatter,
                    whenXHRActivityHappens);

                // return the initial state
                var rtn = [];
                getModelOrCollections(typeData.type, self, function(obj) {
                    if (obj) {
                        _.each(obj[xhrModelLoadingAttribute], function(xhrActivity) {
                            var match = false;
                            if (!keys || keys === ALL_XHR_ACTIVITY) {
                                match = true;
                            } else {
                                if (_.isArray(keys)) {
                                    if (keys.indexOf(xhrActivity.event) >= 0 || xhrActivity.event === keys) {
                                        match = true;
                                    }
                                } else if (keys[xhrActivity.event]) {
                                    match = keys[xhrActivity.event];
                                }
                            }
                            if (match) {
                                rtn.push(xhrActivity);
                            }
                        });
                    }
                }, self.props);
                if (rtn.length > 0) {
                    var _rtn = {};
                    _rtn[LOADING_STATE_NAME] = rtn;
                    return _rtn;
                } else {
                    return null;
                }
            },

            componentDidMount: function(keys, self) {
                var _keys = keys;
                if (_.isString(_keys)) {
                    _keys = [_keys];
                }
                var isArr = _.isArray(keys);

                function _join(modelOrCollection) {
                    // we may bind an extra for any getInitialState bindings but
                    // the cleanup logic will deal with duplicate bindings
                    if (!keys) {
                        joinCurrentModelActivity(ALL_XHR_ACTIVITY, LOADING_STATE_NAME,
                            modelOrCollection, self, true);
                    } else {
                        _.each(_keys, function(value, key) {
                            if (isArr) {
                                key = value;
                                value = LOADING_STATE_NAME;
                            }
                            joinCurrentModelActivity(key, value, modelOrCollection,
                                self, true);
                        });
                    }
                }

                // make sure the model didn't get into a non-loading state before mounting
                getModelOrCollections(typeData.type, self, function(modelOrCollection) {
                    _join(modelOrCollection);
                });
                self.on(typeData.type + ':set', function(modelOrCollection) {
                    if (modelOrCollection) {
                        _join(modelOrCollection);
                    }
                });
            }
        };

        /**
         * If the model executes *any* XHR activity, the internal state "loading" attribute
         * will be set to true and, if an error occurs with loading, the "error" state attribute
         * will be set with the error contents
         */
        var xhrAware = function() {
            var args;
            if (arguments.length === 0) {
                args = undefined;
            } else if (arguments.length === 1) {
                args = arguments[0];
            }

            return {
                getInitialState: function() {
                    return xhrFactory.getInitialState(args, this);
                },

                componentDidMount: function() {
                    return xhrFactory.componentDidMount(args, this);
                }
            };
        };
        addMixin(typeData.type + 'XHRAware', xhrAware, typeData.type + CAP_EVENTS);

        /**
         * Gives any comonent the ability to mark the "loading" attribute in the state as true
         * when any async event of the given type (defined by the "key" property) occurs.
         */
        var loadOn = {
            getInitialState: function() {
                return xhrFactory.getInitialState(this.props.loadOn, this);
            },

            componentDidMount: function() {
                return xhrFactory.componentDidMount(this.props.loadOn, this);
            }
        };
        addMixin(typeData.type + 'LoadOn', loadOn, typeData.type + CAP_EVENTS);

        /**
         * Gives any comonent the ability to force an update when an event is fired
         */
        var updateOn = function() {
            var keys = arguments.length > 0 ? Array.prototype.slice.call(arguments, 0) : undefined;
            return {
                getInitialState: function() {
                    var self = this;
                    modelOrCollectionEventHandler(typeData.type, keys || 'updateOn', this, '{key}', function() {
                        self.deferUpdate();
                    });
                }
            };
        };
        addMixin(typeData.type + 'UpdateOn', updateOn, typeData.type + CAP_EVENTS, DEFER_UPDATE);

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
        ReactEvents.handle(_modelOrCollctionPattern, function(options, callback) {
            return {
                on: function() {
                    if (!this[typeData.type + CAP_ON]) {
                        throw new Error('use the "' + typeData.type + 'Events" mixin instead of "events"');
                    }
                    this[typeData.type + CAP_ON](options.path, callback);
                },
                off: function() { /* NOP, modelOn will clean up */ }
            };
        });

    });

    // add helper methods to include both model and collection mixins using a single mixin
    _.each(['XHRAware', 'ChangeAware', 'LoadOn', 'UpdateOn'], function(mixinKey) {
        ReactMixinManager.alias('backbone' + mixinKey, MODEL + mixinKey, COLLECTION + mixinKey);
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
                if (component.modelPopulate) {
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
                } else if (component.getValue) {
                    var key = getKey(component);
                    if (key) {
                        var value = component.getValue();
                        attributes[key] = value;
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
                } else if (options && options.onInvalid) {
                    options.onInvalid.call(this, attributes);
                }
            }

            return attributes;
        }
    }, 'modelAware');

    /**
     * Set the component state attribute "loading" (or 2nd param if exists) to a
     * truthy value while any XHR activity initiated within the callback function
     * is in progress.
     */
    addMixin('loadWhile', {
        loadWhile: function(callback, loadingStateName) {
            loadingStateName = loadingStateName || LOADING_STATE_NAME;

            var self = this;
            function handler(context) {
                var loadContext = getState(loadingStateName, self);
                if (!loadContext) {
                    loadContext = [];
                }
                loadContext.push(context);
                context.on('complete', function() {
                    loadContext = getState(loadingStateName, self);
                    loadContext.splice(loadContext.indexOf(context, 1));
                    if (!loadContext.length) {
                        var toSet = {};
                        toSet[loadingStateName] = undefined;
                        setState(toSet, self);
                    }
                });
                var toSet = {};
                toSet[loadingStateName] = loadContext;
                setState(toSet, self);
            }

            xhrGlobalEvents.on(xhrEventName, handler);
            try {
                callback.call(this);
            } finally {
                xhrGlobalEvents.off(xhrEventName, handler);
            }
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
     * is found, set the "error" state to the field error message.  Use require('react-backbone').modelIndexErrors
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
            return null;
        }
    }, 'modelEvents');


    var specials = ReactEvents.specials;
    if (specials) {
        // add underscore wrapped special event handlers
        var reactEventSpecials = ['memoize', 'delay', 'defer', 'throttle', 'debounce',
                'once', 'after', 'before'];
        _.each(reactEventSpecials, function(name) {
            specials[name] = specials[name] || function(callback, args) {
                args.splice(0, 0, callback);
                return _[name].apply(_, args);
            };
        });
    }


    /******************************************
     * Input components
     */

    function getElement(context) {
        return context.getDOMNode();
    }

    function getElementValue(context) {
        return getElement(context).value;
    }

    function findSubElementByAttribute(context, tagName, key, value) {
        var el = context.getDOMNode(),
            matches = el.getElementsByTagName(tagName),
            rtn = [];
        for (var i=0; i<matches.length; i++) {
            if (matches[i][key] === value) {
                rtn.push(matches[i]);
            }
        }
        return rtn;
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
                        return el.checked ? true : false;
                    } else {
                        return getElementValue(this);
                    }
                }
            },
            getDOMValue: function() {
                if (this.isMounted()) {
                    return getElementValue(this);
                }
            }
        }, classAttributes));
    };


    rtn.input = {};
    _.defaults(rtn.input, {
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
                    var el = findSubElementByAttribute(
                        this, 'input', 'value', value.replace('"', '\\"'))[0];
                    if (el) {
                        el.checked = 'checked';
                    }
                }

                if (!this.state) {
                    this.state = {};
                }
                var changeHandler = this.state.changeHandler = twoWayBinding(this);
                if (changeHandler) {
                    getElement(this).addEventListener(CHANGE, changeHandler);
                }
            },
            componentWillUnmount: function() {
                var changeHandler = this.state && this.state.changeHandler;
                if (changeHandler) {
                    getElement(this).removeEventListener(CHANGE, changeHandler);
                }
            },
            getValue: function() {
                if (this.isMounted()) {
                    var els = findSubElementByAttribute(
                        this, 'input', 'type', 'radio');
                    for (var i = 0; i < els.length; i++) {
                        if (els[i].checked) {
                            return els[i].value;
                        }
                    }
                }
            },
            getDOMValue: function() {
                if (this.isMounted()) {
                    return getElementValue(this);
                }
            }
        })
    });

    return rtn;
});
