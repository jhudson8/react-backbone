/* global, describe, it, beforeEach, afterEach */

var chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect,
    React = require('react'),
    Backbone = require('backbone'),
    _ = require('underscore'),
    $ = {
        options: [],
        ajax: function(options) {
          this.options.push(options);
        },
        success: function(data) {
          var options = this.options.pop();
          options.success && options.success(data);
        },
        error: function(error) {
          var options = this.options.pop();
          options.error && options.error(error);
        }
      };
chai.use(sinonChai);
Backbone.$ = $;

// intitialize dependencies
require('react-mixin-manager')(React);
require('backbone-xhr-events')(Backbone);
require('react-events')(React);
// add react-backbone mixins
require('../index')(React, Backbone);

function newComponent(attributes, mixins) {

  if (mixins) {
    mixins = React.mixins.get(mixins);
  } else {
    mixins = [];
  }

  var obj = {
    setState: sinon.spy(function(state) {
      this.state = _.extend(this.state || {}, state);
    }),
    setProps: function(props) {
      this.trigger('componentWillReceiveProps', props);
      this.props = this.props || {};
      _.extend(this.props, props);
    },
    mount: function() {
      this._mounted = true;
      this.trigger('componentWillMount');
      this.trigger('componentDidMount');
    },
    unmount: function() {
      this._mounted = false;
      this.trigger('componentWillUnmount');
      this.trigger('componentDidUnmount');
    },

    isMounted: function() { return this._mounted; },
    trigger: function(method) {
      var rtn = [];
      for (var i=0; i<mixins.length; i++) {
        var func = mixins[i][method];
        if (func) {
          rtn.push(func.apply(this, Array.prototype.slice.call(arguments, 1)));
        }
      }
      return rtn;
    }
  };
  if (attributes) {
    for (var name in attributes) {
      obj[name] = attributes[name];
    }
  }

  var state, aggregateState;

  for (var i=0; i<mixins.length; i++) {
    var mixin = mixins[i];
    _.defaults(obj, mixin);
    state = mixin.getInitialState && mixin.getInitialState.call(obj);
    if (state) {
      if (!aggregateState) {
        aggregateState = {};
      }
      _.defaults(aggregateState, state);
    }
  }
  obj.state = aggregateState;
  return obj;
}

var Model = Backbone.Model.extend({
  url: 'foo'
});

describe('react-backbone', function() {
  describe('modelAware', function() {

    it('should get the model using props.model', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelAware']);
      expect(obj.getModel()).to.eql(model);
    });

    it('should get the model using props.collection', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {collection: model}}, ['modelAware']);
      expect(obj.getModel()).to.eql(model);
    });

    it('should set the model', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelAware']);
      expect(obj.getModel()).to.eql(model);

      var model2 = new Backbone.Model();
      obj.setModel(model2);
      expect(obj.getModel()).to.eql(model2);
    });
  });

  describe('modelPopulate', function() {

    it('should iterate components and call getUIModelValue to set attributes', function() {
      var obj = newComponent({}, ['modelPopulate']);
      var components = [
        {
          props: {
            ref: 'foo'
          },
          getUIModelValue: function() {
            return 'bar';
          }
        }
      ];
      var attributes = obj.modelPopulate(components);
      expect(attributes).to.eql({foo: 'bar'});
    });

    it('should iterate components and call getModelValue to set attributes using refs', function() {
      var obj = newComponent({}, ['modelPopulate']);
      var component = {
        props: {
          ref: 'foo'
        },
        getUIModelValue: function() {
          return 'bar';
        }
      };
      obj.refs = {
        foo: component
      };
      var attributes = obj.modelPopulate();
      expect(attributes).to.eql({foo: 'bar'});
    });

    it('should set values on model if a callback is provided', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelAware', 'modelPopulate']);
      var component = {
        props: {
          ref: 'foo'
        },
        getUIModelValue: function() {
          return 'bar';
        }
      };
      obj.refs = {
        foo: component
      };
      var spy = sinon.spy(),
          attributes = obj.modelPopulate(spy);
      expect(spy).to.have.been.called;
      expect(attributes).to.eql({foo: 'bar'});
    });

    it('should not execute the callback if the validation fails', function() {
      var Model = Backbone.Model.extend({
        validate: sinon.spy(function() {
          // just return something so it looks like validation failed
          return 'fail';
        })
      })
      var model = new Model(),
          obj = newComponent({props: {model: model}}, ['modelAware', 'modelPopulate']);
      var component = {
        props: {
          ref: 'foo'
        },
        getUIModelValue: function() {
          return 'bar';
        }
      };
      obj.refs = {
        foo: component
      };
      var spy = sinon.spy(),
          attributes = obj.modelPopulate(spy);
      expect(spy).to.not.have.been.called;
      expect(attributes).to.eql({foo: 'bar'});
      expect(Model.prototype.validate).to.have.been.calledWith({foo: 'bar'});
    });
  });

  describe('modelValueAware', function() {

    it('should get and set the model value using "key"', function() {
      var model = new Backbone.Model({foo: 'bar'}),
          obj = newComponent({props: {model: model, key: 'foo'}}, ['modelValueAware']);
      expect(obj.getModelValue()).to.eql('bar');
      obj.setModelValue('baz');
      expect(model.get('foo')).to.eql('baz');
    });

    it('should get and set the model value using "ref"', function() {
      var model = new Backbone.Model({foo: 'bar'}),
          obj = newComponent({props: {model: model, ref: 'foo'}}, ['modelValueAware']);
      expect(obj.getModelValue()).to.eql('bar');
      obj.setModelValue('baz');
      expect(model.get('foo')).to.eql('baz');
    });
  });

  describe('modelValidator', function() {
    var Model = Backbone.Model.extend({
      validate: function(attributes, options) {
        return options && options.rtn;
      }
    })

    it('should return undefined if no model exists or the model does not implement "validate"', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelValidator']);
      expect(obj.modelValidate()).to.eql(undefined);
    });
    it('should return false if "validate" returns a falsy value', function() {
      var model = new Model(),
          obj = newComponent({props: {model: model}}, ['modelValidator']);
      expect(obj.modelValidate()).to.eql(false);
    });
    it('should return the same value if "validate" returns a truthy value', function() {
      var model = new Model(),
          obj = newComponent({props: {model: model}}, ['modelValidator']);
      expect(obj.modelValidate(undefined, {rtn: 'foo'})).to.eql('foo');
    });
  });


  describe('listenTo', function() {
    it('should start listening to a target', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['listenTo']),
          spy = sinon.spy();
      obj.listenTo(model, 'foo', spy);
      model.trigger('foo');
      // we shouldn't bind yet because we aren't mounted
      expect(spy.callCount).to.eql(0);

      obj.mount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // we shouldn't bind now because we will be unmounted
      obj.unmount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // mount again and ensure that we rebind
      obj.mount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(2);
      obj.unmount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(2);
    });

    it('should stop listening to a target', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['listenTo']),
          spy = sinon.spy();
      obj.listenTo(model, 'foo', spy);
      obj.mount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);

      obj.stopListening(model, 'foo', spy);
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);
    });
  });


  describe('modelEventAware', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should not do event binding until node is mounted', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelEventAware']),
          spy = sinon.spy();
      obj.modelOn('foo', spy);
      model.trigger('foo');
      // we shouldn't bind yet because we aren't mounted
      expect(spy.callCount).to.eql(0);

      obj.mount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // we shouldn't bind now because we will be unmounted
      obj.unmount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // mount again and ensure that we rebind
      obj.mount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(2);
      obj.unmount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(2);
    });

    it('should bind if model does not exist when registered', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelEventAware']),
          spy = sinon.spy();

      // setting model before mounting
      obj.modelOn('foo', spy);
      obj.setModel(model);
      // we shouldn't bind yet because we are not mounted
      model.trigger('foo');
      expect(spy.callCount).to.eql(0);

      obj.mount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);
    });

    it('should bind if component has already been mounted when setting model', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelEventAware']),
          spy = sinon.spy();

      obj.modelOn('foo', spy);
      obj.mount();
      obj.setModel(model);
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);
    });

    it('should unbind a previous model and rebind to a new model', function() {
      var model1 = new Backbone.Model(),
          model2 = new Backbone.Model(),
          obj = newComponent({props: {model: model1}}, ['modelEventAware']),
          spy = sinon.spy();

      obj.modelOn('foo', spy);
      obj.mount();
      model1.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // set another model and ensure the first was unbound
      obj.setModel(model2);
      model2.trigger('foo');
      expect(spy.callCount).to.eql(2);

      model1.trigger('foo');
      expect(spy.callCount).to.eql(2); // ensure the previous trigger *did not* call the handler
    });

    it('should transfer bindings if a new model property is provided', function() {
      var model1 = new Backbone.Model(),
          model2 = new Backbone.Model(),
          obj = newComponent({props: {model: model1}}, ['modelEventAware']),
          spy = sinon.spy();
// joe
      obj.modelOn('foo', spy);
      obj.mount();
      model1.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // set another model and ensure the first was unbound
      obj.setProps({model: model2});
      clock.tick(1);

      model2.trigger('foo');
      expect(spy.callCount).to.eql(2);

      model1.trigger('foo');
      expect(spy.callCount).to.eql(2); // ensure the previous trigger *did not* call the handler
    });
  });

  describe('modelChangeAware', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should listen to all events and force an update', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelChangeAware']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      model.trigger('change');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
      model.trigger('reset');
      clock.tick(1);
      expect(spy.callCount).to.eql(2);
      model.trigger('add');
      clock.tick(1);
      expect(spy.callCount).to.eql(3);
      model.trigger('remove');
      clock.tick(1);
      expect(spy.callCount).to.eql(4);
      model.trigger('sort');
      clock.tick(1);
      expect(spy.callCount).to.eql(5);
    });
  });

  describe('modelUpdateOn', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should listen to provided events and force an update', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model, updateOn: 'foo'}}, ['modelUpdateOn']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      model.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
    });

    it('should listen to provided events (as array) and force an update', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model, updateOn: ['foo', 'bar']}}, ['modelUpdateOn']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      model.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
      model.trigger('bar');
      clock.tick(1);
      expect(spy.callCount).to.eql(2);
    });

    it('should listen to declaring component provided events and force an update', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelUpdateOn("foo", "bar")']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      model.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
      model.trigger('bar');
      clock.tick(1);
      expect(spy.callCount).to.eql(2);
    });
  });


  // THE FOLLING TESTS ASSUME THE INCLUSION OF [backbone-xhr-events](https://github.com/jhudson8/backbone-xhr-events)

  describe('modelLoadOn', function() {

    it('should not call setState if the component is not mounted (but still set the loading state attribute)', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model, loadOn: 'foo'}}, ['modelLoadOn']);

      // initialize the plugins
      obj.mount();

      // make it look like we aren't mounted
      obj._mounted = false;
      Backbone.sync('foo', model, {url: 'foo'});
      expect(obj.setState).to.not.have.been.called;
      expect(!!obj.state.loading).to.eql(true);

      obj._mounted = true;
      $.success();
      expect(obj.setState).to.have.been.calledWith({loading: false});
      expect(obj.setState.callCount).to.eql(1);
    });

    it('should set loading state when an async event is triggered (success condition)', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model, loadOn: 'foo'}}, ['modelLoadOn']);
      obj.mount();

      Backbone.sync('foo', model, {url: 'foo'});
      expect(!!obj.setState.getCall(0).args[0].loading).to.eql(true);
      $.success();
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(false);
      expect(obj.setState.callCount).to.eql(2);
    });

    it('should set loading state when an async event is triggered (error condition)', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model, loadOn: 'foo'}}, ['modelLoadOn']);
      obj.mount();

      Backbone.sync('foo', model, {url: 'foo'});
      expect(!!obj.setState.getCall(0).args[0].loading).to.eql(true);
      $.error();
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(false);
      expect(obj.setState.callCount).to.eql(2);
    });

    it('should not error if no "loadOn" property is defined', function() {
      newComponent({props: {model: new Backbone.Model()}}, ['modelLoadOn']);
      // we are just looking for an error thrown in getInitialState
    });

    it('should support mixin parameters instead of the "loadOn" property', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelLoadOn("foo"))']),
          spy = sinon.spy();
      obj.setState = spy;
      obj.mount();

      Backbone.sync('foo', model, {url: 'foo'});
      expect(!!obj.setState.getCall(0).args[0].loading).to.eql(true);
      $.success();
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(false);
      expect(spy.callCount).to.eql(2);
    });

    describe('loadWhile', function() {
      it('should provide a return callback if none is supplied', function() {
        var model = new Backbone.Model(),
            obj = newComponent({props: {model: model}}, ['modelLoadOn']),
            spy = sinon.spy();
        obj.setState = spy;
        obj.mount();

        var options = obj.loadWhile();
        expect(spy).to.have.been.calledWith({loading: true});
        expect(!!options.success).to.eql(true);
        expect(!!options.error).to.eql(true);
        options.success();
        expect(spy).to.have.been.calledWith({loading: false});
        options.error();
        expect(spy.callCount).to.eql(3);
        expect(spy).to.have.been.calledWith({loading: false});
      });
      it('should wrap callback functions if they are supplied', function() {
        var model = new Backbone.Model(),
            obj = newComponent({props: {model: model}}, ['modelLoadOn']),
            spy = sinon.spy();
        obj.setState = spy;
        obj.mount();

        var _success = sinon.spy();
        var _error = sinon.spy();
        var options = obj.loadWhile({
          success: _success,
          error: _error
        });
        expect(spy).to.have.been.calledWith({loading: true});
        options.success('foo');
        expect(spy).to.have.been.calledWith({loading: false});
        expect(_success).to.have.been.calledWith('foo')
        options.error('bar');
        expect(_error).to.have.been.calledWith('bar')
        expect(spy.callCount).to.eql(3);
        expect(spy).to.have.been.calledWith({loading: false});
      });
    });
  });

  describe('modelXHRAware', function() {

    it('moch (success condition)', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelXHRAware']),
          spy = sinon.spy();
      obj.setState = spy;
      obj.mount();

      expect(spy.callCount).to.eql(0);
      Backbone.sync('foo', model, {url: 'foo'});
      expect(spy.callCount).to.eql(1);
      expect(spy.getCall(0).args).to.eql([{loading: true}]);
      $.success();
      expect(spy.callCount).to.eql(2);
      expect(!!spy.getCall(1).args[0].loading).to.eql(false);
      expect(spy.callCount).to.eql(2);

      Backbone.sync('bar', model, {url: 'foo'});
      $.success();
      expect(spy.callCount).to.eql(4);
      expect(!!spy.getCall(2).args[0].loading).to.eql(true);
      expect(!!spy.getCall(3).args[0].loading).to.eql(false);
    });

    it('should set loading state if the model is loading when set on the component', function() {
      var model = new Model();
      model.fetch();
      var obj = newComponent({props: {model: model}}, ['modelXHRAware']),
          spy = sinon.spy();
      obj.setState = spy;
      obj.mount();
      expect(!!obj.state.loading).to.eql(true);
      expect(spy.callCount).to.eql(0);
      $.success();
      expect(!!spy.getCall(0).args[0].loading).to.eql(false);
    });

    it('should set loading state if the model is loading after being set but before mounting', function() {
      var model = new Model(),
          obj = newComponent({props: {model: model}}, ['modelXHRAware']),
          spy = sinon.spy();
      obj.setState = spy;
      model.fetch();
      expect(spy.callCount).to.eql(0);
      obj.mount();
      expect(spy.callCount).to.eql(1);
      expect(spy.getCall(0).args).to.eql([{loading: true}]);
      $.success();
      expect(spy.callCount).to.eql(2);
      expect(spy.getCall(1).args).to.eql([{loading: false}]);
    });
  });

  describe('react-events integration', function() {
    it('should include events mixin *and* Backbone.Events for on/off/trigger mixin', function() {
      var mixins = React.mixins.get('events');
      expect(mixins.length).to.eql(2);
    });
    it('set React.events.mixin to Backbone.Events', function() {
      expect(React.events.mixin).to.eql(Backbone.Events);
      var obj = newComponent({}, ['events', 'modelEventAware']);
      expect(!!obj.on).to.eql(true);
      expect(!!obj.off).to.eql(true);
    });
    it('should do model binding', function() {
      var model = new Model(),
          spy = sinon.spy(),
          obj = newComponent({
            props: {model: model},
            events: {
              'model:change': 'onChange'
            },
            onChange: spy
          }, ['events', 'modelEventAware']);
      obj.mount();
      model.set({foo: 'bar'});
      expect(spy.callCount).to.eql(1);
    });
    it('should do ref/prop model binding', function() {
      var model = new Model(),
          spy = sinon.spy(),
          obj = newComponent({
            props: {foo: model},
            refs: {},
            events: {
              'model[foo]:change': 'onChange'
            },
            onChange: spy
          }, ['events', 'modelEventAware']);
      debugger;
      obj.mount();
      model.set({foo: 'bar'});
      expect(spy.callCount).to.eql(1);
    });
  });
});
