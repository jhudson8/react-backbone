/*!
 * react-backbone
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

/*
  Container script which includes the following:
    jhudson8/backbone-xhr-events 0.11.2
    jhudson8/react-mixin-manager 0.13.0
    jhudson8/react-events 0.9.0
    jhudson8/react-backbone 0.21.1
*/
 (function(main) {
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      // with AMD
      //  require(
      //    ['react', 'backbone', 'underscore', 'jquery', react-backbone/with-deps'],
      //    function(React, Backbone, underscore, $, reactBackbone) {
      //      reactBackbone(React, Backbone, _, $); 
      //  });
      return main;
    });
  } else if (typeof exports !== 'undefined' && typeof require !== 'undefined') {
    // with CommonJS
    // require('react-backbone/with-deps')(require('react'), require('backbone'), require('underscore'), require('jquery'));
    module.exports = main;
  } else {
    main(React, Backbone, _, $);
  }
})(function(React, Backbone, _, $) {


// jhudson8/backbone-xhr-events
(function() {

    // ANY OVERRIDES MUST BE DEFINED BEFORE LOADING OF THIS SCRIPT
    // Backbone.xhrCompleteEventName: event triggered on models when all XHR requests have been completed
    var xhrCompleteEventName = Backbone.xhrCompleteEventName = Backbone.xhrCompleteEventName || 'xhr:complete';
    // the model attribute which can be used to return an array of all current XHR request events
    var xhrLoadingAttribute = Backbone.xhrModelLoadingAttribute = Backbone.xhrModelLoadingAttribute || 'xhrActivity';
    // Backbone.xhrEventName: the event triggered on models and the global bus to signal an XHR request
    var xhrEventName = Backbone.xhrEventName = Backbone.xhrEventName || 'xhr';
    // Backbone.xhrGlobalAttribute: global event handler attribute name (on Backbone) used to subscribe to all model xhr events
    var xhrGlobalAttribute = Backbone.xhrGlobalAttribute = Backbone.xhrGlobalAttribute || 'xhrEvents';

    // initialize the global event bus
    var globalXhrBus = Backbone[xhrGlobalAttribute] = _.extend({}, Backbone.Events);
    var SUCCESS = 'success';
    var ERROR = 'error';

    var Context = function(method, model, options) {
        this.method = method;
        this.model = model;
        this.options = options;
        this._handler = {};
    };
    _.extend(Context.prototype, {
        abort: function() {
            if (!this.aborted) {
                this.aborted = true;
                this.type = 'abort';
                this.triggerAll('abort');
                if (this.xhr) {
                    this.xhr.abort();
                }
            }
        },

        preventDefault: function() {
            this._defaultPrevented = true;
            return this._handler;
        },

        triggerAll: function() {
            var args = _.toArray(arguments);
            args.push(this);
            this.trigger.apply(this, args);
            _.each(this._forwardTo, function(context) {
                args.splice(args.length-1, 1, context);
                context.triggerAll.apply(context, args);
            });
        },

        pushLoadActivity: function() {
            var model = this.model,
                loads = model[xhrLoadingAttribute] = (model[xhrLoadingAttribute] || []);
            loads.push(this);
            _.each(this._forwardTo, function(context) {
                context.pushLoadActivity();
            });
        },

        removeLoadEntry: function() {
            function _remove(context) {
                var model = context.model,
                    loads = model[xhrLoadingAttribute] || [],
                    index = loads.indexOf(context);
                if (index >= 0) {
                    loads.splice(index, 1);
                }

                // if there are no more cuncurrent XHRs, model[xhrLoadingAttribute] should always be undefind
                if (loads.length === 0) {
                    model[xhrLoadingAttribute] = undefined;
                    model.trigger(xhrCompleteEventName, context);
                }
            }
            _remove(this);
            _.each(this._forwardTo, _remove);
        }
    }, Backbone.Events);


    // allow backbone to send xhr events on models
    var _sync = Backbone.sync;
    Backbone.sync = function(method, model, options) {
        options = options || {};
        var context = initializeXHRLoading(method, model, options);
        if (context._defaultPrevented) {
            // it is assumed that either context.options.success or context.options.error will be called
            return;
        }
        var xhr = _sync.call(this, method, model, options);
        context.xhr = xhr;
        return xhr;
    };

    // provide helper flags to determine model fetched status
    globalXhrBus.on(xhrEventName + ':read', function(context) {
        var model = context.model;
        context.on(SUCCESS, function() {
            model.hasBeenFetched = true;
            model.hadFetchError = false;
        });
        context.on(ERROR, function() {
            model.hadFetchError = true;
        });
    });

    // execute the callback directly if the model is fetch
    // initiate a fetch with this callback as the success option if not fetched
    // or plug into the current fetch if in progress
    Backbone.Model.prototype.whenFetched = Backbone.Collection.whenFetched = function(success, error) {
        var model = this;

        function successWrapper() {
            success(model);
        }
        if (this.hasBeenFetched) {
            return success(this);
        }
        // find current fetch call (if any)
        var _fetch = _.find(this[xhrLoadingAttribute], function(req) {
            return req.method === 'read';
        });
        if (_fetch) {
            _fetch.on('success', successWrapper);
            if (error) {
                _fetch.on('error', error);
            }
        } else {
            this.fetch({
                success: successWrapper,
                error: error
            });
        }
    };

    // forward all or some XHR events from the source object to the dest object
    Backbone.forwardXHREvents = function(sourceModel, destModel, typeOrCallback) {
        var handler = handleForwardedEvents(!_.isFunction(typeOrCallback) && typeOrCallback, sourceModel, destModel);
        if (_.isFunction(typeOrCallback)) {
            // forward the events *only* while the function is executing wile keeping "this" as the context
            try {
                sourceModel.on(xhrEventName, handler, destModel);
                typeOrCallback.call(this);
            } finally {
                Backbone.stopXHRForwarding(sourceModel, destModel);
            }
        } else {
            var eventName = typeOrCallback ? (xhrEventName + ':') + typeOrCallback : xhrEventName;
            sourceModel.on(eventName, handler, destModel);
        }
    };

    // stop the XHR forwarding
    Backbone.stopXHRForwarding = function(sourceModel, destModel, type) {
        type = type || '_all';
        var eventForwarders = getEventForwardingCache(sourceModel, destModel),
            handler = eventForwarders[type];
        if (handler) {
            delete eventForwarders[type];
            sourceModel.off(xhrEventName, handler, destModel);
        }

        // clear model cache
        var count = 0;
        _.each(eventForwarders, function() { count ++; });
        if (!count) {
            delete sourceModel._eventForwarders[destModel];
            _.each(sourceModel._eventForwarders, function() { count ++; });
            if (!count) {
                delete sourceModel._eventForwarders;
            }
        }
    };

    function getEventForwardingCache(sourceModel, destModel) {
        var eventForwarders = sourceModel._eventForwarders = (sourceModel._eventForwarders || {});
        if (!eventForwarders[destModel]) {
            eventForwarders[destModel] = {};
        }
        return eventForwarders[destModel];
    }

    function handleForwardedEvents(type, sourceModel, destModel) {
        var eventForwarders = getEventForwardingCache(sourceModel, destModel);

        type = type || '_all';
        var func = eventForwarders[type];
        if (!func) {
            // cache it so we can unbind when we need to
            func = function(sourceContext) {
                var forwardTo = sourceContext._forwardTo = (sourceContext._forwardTo || []);
                forwardTo.push(initializeXHRLoading(sourceContext.method, destModel, sourceContext.options || {}, true));
            };
            eventForwarders[type] = func;
        }
        return func;
    }

    // set up the XHR eventing behavior
    // "model" is to trigger events on and "sourceModel" is the model to provide to the success/error callbacks
    // these are the same unless there is event forwarding in which case the "sourceModel" is the model that actually
    // triggered the events and "model" is just forwarding those events
    function initializeXHRLoading(method, model, options, forwarding) {
        var eventName = options.event || method,
            context = new Context(method, model, options),
            scopedEventName = xhrEventName + ':' + eventName,
            finished;

        // at this point, all we can do is call the complete event
        var origCallbacks = {
            success: options.success,
            error: options.error
        };

        function finish(type) {
            if (!forwarding && !finished) {
                finished = true;
                context.removeLoadEntry();
                type = type || 'halt';

                // trigger the complete event
                context.triggerAll('complete', type);
            }
        }
        // allow complete callbacks to be executed from the preventDefault response
        context._handler.complete = finish;

        function wrapCallback(type) {

            function triggerEvents() {
                if (!finished) {

                    try {
                        var args = Array.prototype.slice.call(arguments, 0, 3);

                        // options callback
                        var typeCallback = origCallbacks[type];
                        if (typeCallback) {
                            typeCallback.apply(context, args);
                        }

                        // trigger the success/error event
                        args.splice(0, 0, type);
                        args.push(context);
                        context.triggerAll.apply(context, args);

                    } finally {
                        finish(type);
                    }
                }
            }
            // allow success/error callbacks to be executed from the preventDefault response
            context._handler[type] = triggerEvents;

            // success: (data, status, xhr);  error: (xhr, type, error)
            options[type] = function(p1, p2, p3) {

                if (!context._defaultPrevented) {
                    context.triggerAll('after-send', p1, p2, p3, type);

                    // if context.preventDefault is true, it is assumed that the option success or callback will be manually called
                    if (context._defaultPrevented) {
                        return;
                    } else if (context.data) {
                        p1 = context.data || p1;
                    }

                    triggerEvents(p1, p2, p3);
                }
            };
        }

        if (!forwarding) {
            // wrap the orig callbacks
            wrapCallback(SUCCESS);
            wrapCallback(ERROR);
        }

        // trigger the model xhr events
        model.trigger(xhrEventName, context, eventName);
        model.trigger(scopedEventName, context);

        if (!forwarding) {

            // don't call global events if this is XHR forwarding
            globalXhrBus.trigger(xhrEventName, context, eventName);
            globalXhrBus.trigger(scopedEventName, context);

            // allow for 1 last override
            var _beforeSend = options.beforeSend;
            options.beforeSend = function(xhr, settings) {
                context.xhr = xhr;
                context.xhrSettings = settings;

                if (_beforeSend) {
                    var rtn = _beforeSend.call(this, xhr, settings);
                    if (rtn === false) {
                        return rtn;
                    }
                }
                context.triggerAll('before-send', xhr, settings);
                if (context._defaultPrevented) {
                    return false;
                }
                context.pushLoadActivity();
            };
        }

        return context;
    }

    // allow fetch state flags to be reset if the collection has been reset or the model has been cleared
    _.each({
        'reset': Backbone.Collection,
        'clear': Backbone.Model
    }, function(Clazz, key) {
        var protoFunc = Clazz.prototype[key];
        Clazz.prototype[key] = function(models) {
            if (key === 'clear' || _.isUndefined(models)) {
                this.hasBeenFetched = this.hadFetchError = false;
            }
            protoFunc.apply(this, arguments);
        };
    });
  
})();


// jhudson8/react-mixin-manager
(function() {

    var _dependsOn, _dependsInjected, _mixins, _initiatedOnce;

    function setState(state, context) {
        if (context.isMounted()) {
            context.setState(state);
        } else if (context.state) {
            for (var name in state) {
                if (state.hasOwnProperty(name)) {
                    context.state[name] = state[name];
                }
            }
        } else {
            // if we aren't mounted, we will get an exception if we try to set the state
            // so keep a placeholder state until we're mounted
            // this is mainly useful if setModel is called on getInitialState
            var _state = context.__temporary_state || {};
            /*jshint -W004 */
            for (var name in state) {
                if (state.hasOwnProperty(name)) {
                    _state[name] = state[name];
                }
            }
            context.__temporary_state = _state;
        }
    }

    function getState(key, context) {
        var state = context.state,
            initState = context.__temporary_state;
        return (state && state[key]) || (initState && initState[key]);
    }

    /**
     * return the normalized mixin list
     * @param values {Array} list of mixin entries
     * @param index {Object} hash which contains a truthy value for all named mixins that have been added
     * @param initiatedOnce {Object} hash which collects mixins and their parameters that should be initiated once
     * @param rtn {Array} the normalized return array
     */
    function get(values, index, initiatedOnce, rtn) {
        /**
         * add the named mixin and all un-added dependencies to the return array
         * @param the mixin name
         */
        function addTo(name) {
            var indexName = name,
                match = name.match(/^([^\(]*)\s*\(([^\)]*)\)\s*/),
                params = match && match[2];
            name = match && match[1] || name;

            if (!index[indexName]) {
                if (params) {
                    // there can be no function calls here because of the regex match
                    /*jshint evil: true */
                    params = eval('[' + params + ']');
                }
                var mixin = _mixins[name],
                    checkAgain = false,
                    skip = false;

                if (mixin) {
                    if (typeof mixin === 'function') {
                        if (_initiatedOnce[name]) {
                            if (!initiatedOnce[name]) {
                                initiatedOnce[name] = [];
                                // add the placeholder so the mixin ends up in the right place
                                // we will replace all names with the appropriate mixins at the end
                                // (so we have all of the appropriate arguments)
                                mixin = name;
                            } else {
                                // but we only want to add it a single time
                                skip = true;
                            }
                            if (params) {
                                initiatedOnce[name].push(params);
                            }
                        } else {
                            mixin = mixin.apply(this, params || []);
                            checkAgain = true;
                        }
                    } else if (params) {
                        throw new Error('the mixin "' + name + '" does not support parameters');
                    }
                    get(_dependsOn[name], index, initiatedOnce, rtn);
                    get(_dependsInjected[name], index, initiatedOnce, rtn);

                    index[indexName] = true;
                    if (checkAgain) {
                        get([mixin], index, initiatedOnce, rtn);
                    } else if (!skip) {
                        checkForInlineMixins(mixin, rtn);
                        rtn.push(mixin);
                    }

                } else {
                    throw new Error('invalid mixin "' + name + '"');
                }
            }
        }

        // if the mixin has a "mixins" attribute, clone and add those dependencies first
        function checkForInlineMixins(mixin, rtn) {
            if (mixin.mixins) {
                get(mixin.mixins, index, initiatedOnce, rtn);
            }
        }

        function handleMixin(mixin) {
            if (mixin) {
                if (Array.isArray(mixin)) {
                    // flatten it out
                    get(mixin, index, initiatedOnce, rtn);
                } else if (typeof mixin === 'string') {
                    // add the named mixin and all of it's dependencies
                    addTo(mixin);
                } else {
                    checkForInlineMixins(mixin, rtn);

                    // just add the mixin normally
                    rtn.push(mixin);
                }
            }
        }

        if (Array.isArray(values)) {
            for (var i = 0; i < values.length; i++) {
                handleMixin(values[i]);
            }
        } else {
            handleMixin(values);
        }
    }

    /**
     * add the mixins that should be once initiated to the normalized mixin list
     * @param mixins {Object} hash of mixins keys and list of its parameters
     * @param rtn {Array} the normalized return array
     */
    function applyInitiatedOnceArgs(mixins, rtn) {

        /**
         * added once initiated mixins to return array
         */
        function addInitiatedOnce(name, mixin, params) {
            mixin = mixin.call(this, params || []);
            // find the name placeholder in the return arr and replace it with the mixin
            var index = rtn.indexOf(name);
            rtn.splice(index, 1, mixin);
        }

        for (var m in mixins) {
            if (mixins.hasOwnProperty(m)) {
                addInitiatedOnce(m, _mixins[m], mixins[m]);
            }
        }
    }

    // allow for registered mixins to be extract just by using the standard React.createClass
    var _createClass = React.createClass;
    React.createClass = function(spec) {
        if (spec.mixins) {
            spec.mixins = React.mixins.get(spec.mixins);
        }
        return _createClass.apply(React, arguments);
    };

    var namespaceMatch = /^[^\.]+\.(.*)/;
    function addMixin(name, mixin, depends, initiatedOnce) {

        function _add(name) {
            _mixins[name] = mixin;
            _dependsOn[name] = depends.length && depends;
            _initiatedOnce[name] = initiatedOnce && true;
        }

        _add(name);
        var match = name.match(namespaceMatch);
        // only include the non-namespaced mixin if it is not already taken
        if (match &&  !_mixins[match[1]]) {
            _add(match[1]);
        }
    }

    function GROUP() {
        // empty function which is used only as a placeholder to list dependencies
    }

    function mixinParams(args) {
        var name,
            options = args[0],
            initiatedOnce = false;

        if (typeof(options) === 'object') {
            name = options.name;
            initiatedOnce = options.initiatedOnce;
        } else {
            name = options;
        }

        if (!name || !name.length) {
            throw new Error('the mixin name hasn\'t been specified');
        }

        if (Array.isArray(args[1])) {
            return [name, args[1][0], Array.prototype.slice.call(args[1], 1), initiatedOnce];
        } else {
            return [name, args[1], Array.prototype.slice.call(args, 2), initiatedOnce];
        }
    }

    React.mixins = {
        /**
         * return the normalized mixins.  there can be N arguments with each argument being
         * - an array: will be flattened out to the parent list of mixins
         * - a string: will match against any registered mixins and append the correct mixin
         * - an object: will be treated as a standard mixin and returned in the list of mixins
         * any string arguments that are provided will cause any dependent mixins to be included
         * in the return list as well
         */
        get: function() {
            var rtn = [],
                index = {},
                initiatedOnce = {},
                _toClone, _mixin;

            get(Array.prototype.slice.call(arguments), index, initiatedOnce, rtn);
            applyInitiatedOnceArgs(initiatedOnce, rtn);
            // clone any mixins with a .mixins attribute and remove the attribute
            // because it has already been extracted out
            for (var i=0; i<rtn.length; i++) {
                if (rtn[i].mixins) {
                    _toClone = rtn[i];
                    _mixin = {};
                    for (var key in _toClone) {
                        if (_toClone.hasOwnProperty(key) && key !== 'mixins') {
                            _mixin[key] = _toClone[key];
                        }
                    }
                    rtn[i] = _mixin;
                }
            }
            return rtn;
        },

        /**
         * Inject dependencies that were not originally defined when a mixin was registered
         * @param name {string} the main mixin name
         * @param (any additional) {string} dependencies that should be registered against the mixin
         */
        inject: function(name) {
            var l = _dependsInjected[name];
            if (!l) {
                l = _dependsInjected[name] = [];
            }
            l.push(Array.prototype.slice.call(arguments, 1));
        },

        alias: function(name) {
            addMixin(name, GROUP, Array.prototype.slice.call(arguments, 1), false);
        },

        add: function( /* options, mixin */ ) {
            addMixin.apply(this, mixinParams(arguments));
        },

        exists: function(name) {
            return _mixins[name] || false;
        },

        _reset: function() {
            _dependsOn = {};
            _mixins = {};
            _dependsInjected = {};
            _initiatedOnce = {};
            load();
        }
    };

    function load() {
        /**
         * mixin that exposes a "deferUpdate" method which will call forceUpdate after a setTimeout(0) to defer the update.
         * This allows the forceUpdate method to be called multiple times while only executing a render 1 time.  This will
         * also ensure the component is mounted before calling forceUpdate.
         *
         * It is added to mixin manager directly because it serves a purpose that benefits when multiple plugins use it
         */
        React.mixins.defaultDeferUpdateInterval = 0;
        var fakeMaxInterval = 999999999;
        React.mixins.add({name: 'deferUpdate', initiatedOnce: true}, function(args) {
            var lowestInterval = fakeMaxInterval;
            for (var i=0; i<args.length; i++) {
                if (args[i].length > 0) {
                    lowestInterval = Math.min(lowestInterval, args[i]);
                }
            }
            if (lowestInterval === fakeMaxInterval) {
                lowestInterval = React.mixins.defaultDeferUpdateInterval;
            }

            function clearDeferState(context) {
                var timerId = context.state._deferUpdateTimer;
                if (timerId) {
                    clearTimeout(timerId);
                    delete context.state._deferUpdateTimer;
                }
            }

            return {
                getInitialState: function() {
                    // ensure that the state exists because we don't want to call setState (which will cause a render)
                    return {};
                },
                shouldComponentUpdate: function() {
                    if (this.state._deferUpdateTimer && lowestInterval > 0) {
                        // we will be updating soon - keep from rendering multiple times
                        return false;
                    }
                },
                componentDidUpdate: function() {
                    // if we just force updated, no need to update again
                    clearDeferState(this);
                },
                deferUpdate: function() {
                    if (lowestInterval < 0) {
                        return this.forceUpdate();
                    }
                    var state = this.state,
                        self = this;
                    clearDeferState(this);
                    state._deferUpdateTimer = setTimeout(function() {
                        clearDeferState(self);
                        if (self.isMounted()) {
                            self.forceUpdate();
                        }
                    }, lowestInterval);
                }
            };
        });

        /**
         * very simple mixin that ensures that the component state is an object.  This is useful if you
         * know a component will be using state but won't be initialized with a state to prevent a null check on render
         */
        React.mixins.add('state', {
            getInitialState: function() {
                return {};
            },

            componentWillMount: function() {
                // not directly related to this mixin but all of these mixins have this as a dependency
                // if setState was called before the component was mounted, the actual component state was
                // not set because it might not exist.  Convert the pretend state to the real thing
                // (but don't trigger a render)
                var _state = this.__temporary_state;
                if (_state) {
                    for (var key in _state) {
                        if (_state.hasOwnProperty(key)) {
                            this.state[key] = _state[key];
                        }
                    }
                    delete this.__temporary_state;
                }
            }
        });
        React.mixins.setState = setState;
        React.mixins.getState = getState;
    }

    React.mixins._reset();
  
})();


// jhudson8/react-events
(function() {

    var handlers = {},
        patternHandlers = [],
        splitter = /^([^:]+):?(.*)/,
        specialWrapper = /^\*([^\(]+)\(([^)]*)\)[->:]*(.*)/,
        noArgMethods = ['forceUpdate'],
        setState = React.mixins.setState,
        getState = React.mixins.getState,
        namespace = 'react-events' + '.';

    /**
     *  Allow events to be referenced in a hierarchical structure.  All parts in the
     * hierarchy will be appended together using ":" as the separator
     * window: {
     *   scroll: 'onScroll',
     *   resize: 'onResize'
     * }
     * will return as
     * {
     *   'window:scroll': 'onScroll',
     *   'window:resize': 'onResize'
     * }
     }
     */
    function normalizeEvents(events, rtn, prefix) {
        rtn = rtn || {};
        if (prefix) {
            prefix += ':';
        } else {
            prefix = '';
        }
        var value, valueType;
        for (var key in events) {
            if (events.hasOwnProperty(key)) {
                value = events[key];
                valueType = typeof value;
                if (valueType === 'string' || valueType === 'function') {
                    rtn[prefix + key] = value;
                } else if (value) {
                    normalizeEvents(value, rtn, prefix + key);
                }
            }
        }
        return rtn;
    }

    /**
     * Internal model event binding handler
     * (type(on|once|off), {event, callback, context, target})
     */
    function manageEvent(type, data) {
        /*jshint validthis:true */
        var _data = {
            type: type
        };
        for (var name in data) {
            if (data.hasOwnProperty(name)) {
                _data[name] = data[name];
            }
        }
        var watchedEvents = React.mixins.getState('__watchedEvents', this);
        if (!watchedEvents) {
            watchedEvents = [];
            setState({
                __watchedEvents: watchedEvents
            }, this);
        }
        _data.context = _data.context || this;
        watchedEvents.push(_data);

        // bind now if we are already mounted (as the mount function won't be called)
        var target = getTarget(_data.target, this);
        if (this.isMounted()) {
            if (target) {
                target[_data.type](_data.event, _data.callback, _data.context);
            }
        }
        if (type === 'off') {
            var watchedEvent;
            for (var i = 0; i < watchedEvents.length; i++) {
                watchedEvent = watchedEvents[i];
                if (watchedEvent.event === data.event &&
                    watchedEvent.callback === data.callback &&
                    getTarget(watchedEvent.target, this) === target) {
                    watchedEvents.splice(i, 1);
                }
            }
        }
    }

    // bind all registered events to the model
    function _watchedEventsBindAll(context) {
        var watchedEvents = getState('__watchedEvents', context);
        if (watchedEvents) {
            var data;
            for (var name in watchedEvents) {
                if (watchedEvents.hasOwnProperty(name)) {
                    data = watchedEvents[name];
                    var target = getTarget(data.target, context);
                    if (target) {
                        target[data.type](data.event, data.callback, data.context);
                    }
                }
            }
        }
    }

    // unbind all registered events from the model
    function _watchedEventsUnbindAll(keepRegisteredEvents, context) {
        var watchedEvents = getState('__watchedEvents', context);
        if (watchedEvents) {
            var data;
            for (var name in watchedEvents) {
                if (watchedEvents.hasOwnProperty(name)) {
                    data = watchedEvents[name];
                    var target = getTarget(data.target, context);
                    if (target) {
                        target.off(data.event, data.callback, data.context);
                    }
                }
            }
            if (!keepRegisteredEvents) {
                setState({
                    __watchedEvents: []
                }, context);
            }
        }
    }

    function getTarget(target, context) {
        if (typeof target === 'function') {
            return target.call(context);
        }
        return target;
    }

    /*
     * wrapper for event implementations - includes on/off methods
     */
    function createHandler(event, callback, context, dontWrapCallback) {
        if (!dontWrapCallback) {
            var _callback = callback,
                noArg;
            if (typeof callback === 'object') {
                // use the "callback" attribute to get the callback function.  useful if you need to reference the component as "this"
                /*jshint validthis:true */
                _callback = callback.callback.call(this);
            }
            if (typeof callback === 'string') {
                noArg = (noArgMethods.indexOf(callback) >= 0);
                _callback = context[callback];
            }
            if (!_callback) {
                throw 'no callback function exists for "' + callback + '"';
            }
            callback = function() {
                return _callback.apply(context, noArg ? [] : arguments);
            };
        }

        // check for special wrapper function
        var match = event.match(specialWrapper);
        if (match) {
            var specialMethodName = match[1],
                /*jshint evil: true */
                args = eval('[' + match[2] + ']'),
                rest = match[3],
                specialHandler = React.events.specials[specialMethodName];
            if (specialHandler) {
                if (args.length === 1 && args[0] === '') {
                    args = [];
                }
                callback = specialHandler.call(context, callback, args);
                return createHandler(rest, callback, context, true);
            } else {
                throw new Error('invalid special event handler "' + specialMethodName + "'");
            }
        }

        var parts = event.match(splitter),
            handlerName = parts[1],
            path = parts[2],
            handler = handlers[handlerName];

        // check pattern handlers if no match
        for (var i = 0; !handler && i < patternHandlers.length; i++) {
            if (handlerName.match(patternHandlers[i].pattern)) {
                handler = patternHandlers[i].handler;
            }
        }
        if (!handler) {
            throw new Error('no handler registered for "' + event + '"');
        }

        return handler.call(context, {
            key: handlerName,
            path: path
        }, callback);
    }

    // predefined templates of common handler types for simpler custom handling
    var handlerTemplates = {

        /**
         * Return a handler which will use a standard format of on(eventName, handlerFunction) and off(eventName, handlerFunction)
         * @param data {object} handler options
         *   - target {object or function()}: the target to bind to or function(name, event) which returns this target ("this" is the React component)
         *   - onKey {string}: the function attribute used to add the event binding (default is "on")
         *   - offKey {string}: the function attribute used to add the event binding (default is "off")
         */
        standard: function(data) {
            var accessors = {
                    on: data.onKey || 'on',
                    off: data.offKey || 'off'
                },
                target = data.target;
            return function(options, callback) {
                var path = options.path;

                function checkTarget(type, context) {
                    return function() {
                        var _target = (typeof target === 'function') ? target.call(context, path) : target;
                        if (_target) {
                            // register the handler
                            _target[accessors[type]](path, callback);
                        }
                    };
                }

                return {
                    on: checkTarget('on', this),
                    off: checkTarget('off', this),
                    initialize: data.initialize
                };
            };
        }
    };

    var eventManager = React.events = {
        // placeholder for special methods
        specials: {},

        /**
         * Register an event handler
         * @param identifier {string} the event type (first part of event definition)
         * @param handlerOrOptions {function(options, callback) *OR* options object}
         *
         * handlerOrOptions as function(options, callback) a function which returns the object used as the event handler.
         *      @param options {object}: will contain a *path* attribute - the event key (without the handler key prefix).
         *           if the custom handler was registered as "foo" and events hash was { "foo:abc": "..." }, the path is "abc"
         *      @param callback {function}: the callback function to be bound to the event
         *
         * handlerOrOptions as options: will use a predefined "standard" handler;  this assumes the event format of "{handler identifier}:{target identifier}:{event name}"
         *      @param target {object or function(targetIdentifier, eventName)} the target to bind/unbind from or the functions which retuns this target
         *      @param onKey {string} the attribute which identifies the event binding function on the target (default is "on")
         *      @param offKey {string} the attribute which identifies the event un-binding function on the target (default is "off")
         */
        handle: function(identifier, optionsOrHandler) {
            if (typeof optionsOrHandler !== 'function') {
                // it's options
                optionsOrHandler = handlerTemplates[optionsOrHandler.type || 'standard'](optionsOrHandler);
            }
            if (identifier instanceof RegExp) {
                patternHandlers.push({
                    pattern: identifier,
                    handler: optionsOrHandler
                });
            } else {
                handlers[identifier] = optionsOrHandler;
            }
        }
    };

    //// REGISTER THE DEFAULT EVENT HANDLERS
    if (typeof window !== 'undefined') {
        /**
         * Bind to window events
         * format: "window:{event name}"
         * example: events: { 'window:scroll': 'onScroll' }
         */
        eventManager.handle('window', {
            target: window,
            onKey: 'addEventListener',
            offKey: 'removeEventListener'
        });
    }

    var objectHandlers = {
        /**
         * Bind to events on components that are given a [ref](http://facebook.github.io/react/docs/more-about-refs.html)
         * format: "ref:{ref name}:{event name}"
         * example: "ref:myComponent:something-happened": "onSomethingHappened"
         */
        ref: function(refKey) {
            return this.refs[refKey];
        },

        /**
         * Bind to events on components that are provided as property values
         * format: "prop:{prop name}:{event name}"
         * example: "prop:componentProp:something-happened": "onSomethingHappened"
         */
        prop: function(propKey) {
            return this.props[propKey];
        }
    };

    function registerObjectHandler(key, objectFactory) {
        eventManager.handle(key, function(options, callback) {
            var parts = options.path.match(splitter),
                objectKey = parts[1],
                ev = parts[2],
                bound, componentState;
            return {
                on: function() {
                    var target = objectFactory.call(this, objectKey);
                    if (target) {
                        componentState = target.state || target;
                        target.on(ev, callback);
                        bound = target;
                    }
                },
                off: function() {
                    if (bound) {
                        bound.off(ev, callback);
                        bound = undefined;
                        componentState = undefined;
                    }
                },
                isStale: function() {
                    if (bound) {
                        var target = objectFactory.call(this, objectKey);
                        if (!target || (target.state || target) !== componentState) {
                            // if the target doesn't exist now and we were bound before or the target state has changed we are stale
                            return true;
                        }
                    } else {
                        // if we weren't bound before but the component exists now, we are stale
                        return true;
                    }
                }
            };
        });
    }

    for (var key in objectHandlers) {
        if (objectHandlers.hasOwnProperty(key)) {
            registerObjectHandler(key, objectHandlers[key]);
        }
    }

    /**
     * Allow binding to setInterval events
     * format: "repeat:{milis}"
     * example: events: { 'repeat:3000': 'onRepeat3Sec' }
     */
    eventManager.handle('repeat', function(options, callback) {
        var delay = parseInt(options.path, 10),
            id;
        return {
            on: function() {
                id = setInterval(callback, delay);
            },
            off: function() {
                id = !!clearInterval(id);
            }
        };
    });

    /**
     * Like setInterval events *but* will only fire when the user is actively viewing the web page
     * format: "!repeat:{milis}"
     * example: events: { '!repeat:3000': 'onRepeat3Sec' }
     */
    eventManager.handle('!repeat', function(options, callback) {
        var delay = parseInt(options.path, 10),
            keepGoing;

        function doInterval(suppressCallback) {
            if (suppressCallback !== true) {
                callback();
            }
            setTimeout(function() {
                if (keepGoing) {
                    requestAnimationFrame(doInterval);
                }
            }, delay);
        }
        return {
            on: function() {
                keepGoing = true;
                doInterval(true);
            },
            off: function() {
                keepGoing = false;
            }
        };
    });

    function handleEvents(events, context, initialize) {
        var handlers = getState('_eventHandlers', context) || [], handler;
        events = normalizeEvents(events);
        for (var ev in events) {
            if (events.hasOwnProperty(ev)) {
                handler = createHandler(ev, events[ev], context);
                if (handler.initialize) {
                    handler.initialize.call(context);
                }
                handlers.push(handler);
                if (initialize && context.isMounted()) {
                    handler.on.call(this);
                }
            }
        }
        return handlers;
    }

    //// REGISTER THE REACT MIXIN
    React.mixins.add(namespace + 'events', function() {
        var rtn = [{
            /**
             * Return a callback fundtion that will trigger an event on "this" when executed with the provided parameters
             */
            triggerWith: function() {
                var args = Array.prototype.slice.call(arguments),
                    target = this;

                // allow the first parameter to be the target
                if (typeof args[0] !== 'string') {
                    target = args[0];
                    args.splice(0, 1);
                }

                return function() {
                    target.trigger.apply(target, args);
                };
            },

            /**
             * Return a callback fundtion that will call the provided function with the provided arguments
             */
            callWith: function(callback) {
                var args = Array.prototype.slice.call(arguments, 1),
                    self = this;
                return function() {
                    callback.apply(self, args);
                };
            },

            manageEvents: function(events) {
                setState({
                    '_eventHandlers': handleEvents(events, this, true)
                }, this);
            },

            getInitialState: function() {
                return {
                    _eventHandlers: handleEvents(this.events, this)
                };
            },

            componentDidUpdate: function() {
                var handlers = getState('_eventHandlers', this),
                    handler;
                for (var i = 0; i < handlers.length; i++) {
                    handler = handlers[i];
                    if (handler.isStale && handler.isStale.call(this)) {
                        handler.off.call(this);
                        handler.on.call(this);
                    }
                }
            },

            componentDidMount: function() {
                var handlers = getState('_eventHandlers', this);
                for (var i = 0; i < handlers.length; i++) {
                    handlers[i].on.call(this);
                }
            },

            componentWillUnmount: function() {
                var handlers = getState('_eventHandlers', this);
                for (var i = 0; i < handlers.length; i++) {
                    handlers[i].off.call(this);
                }
            }
        }];

        function bind(func, context) {
            return function() {
                func.apply(context, arguments);
            };
        }
        var eventHandler = eventManager.mixin;
        if (eventHandler) {
            var eventHandlerMixin = {},
                state = {},
                key;
            var keys = ['on', 'once', 'off', 'trigger'];
            for (var i = 0; i < keys.length; i++) {
                key = keys[i];
                if (eventHandler[key]) {
                    eventHandlerMixin[key] = bind(eventHandler[key], state);
                }
            }
            eventHandlerMixin.getInitialState = function() {
                return {
                    __events: state
                };
            };
            rtn.push(eventHandlerMixin);
        }
        // React.eventHandler.mixin should contain impl for "on" "off" and "trigger"
        return rtn;
    }, 'state');

    /**
     * Allow for managed bindings to any object which supports on/off.
     */
    React.mixins.add(namespace + 'listen', {
        componentDidMount: function() {
            // sanity check to prevent duplicate binding
            _watchedEventsUnbindAll(true, this);
            _watchedEventsBindAll(this);
        },

        componentWillUnmount: function() {
            _watchedEventsUnbindAll(true, this);
        },

        // {event, callback, context, model}
        listenTo: function(target, ev, callback, context) {
            var data = ev ? {
                event: ev,
                callback: callback,
                target: target,
                context: context
            } : target;
            manageEvent.call(this, 'on', data);
        },

        listenToOnce: function(target, ev, callback, context) {
            var data = {
                event: ev,
                callback: callback,
                target: target,
                context: context
            };
            manageEvent.call(this, 'once', data);
        },

        stopListening: function(target, ev, callback, context) {
            var data = {
                event: ev,
                callback: callback,
                target: target,
                context: context
            };
            manageEvent.call(this, 'off', data);
        }
    });
  
})();


// jhudson8/react-backbone
(function() {

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
  
})();

});
