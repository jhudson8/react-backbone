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
require('backbone-xhr-events')(Backbone, _);
require('react-events')(React);
// add react-backbone mixins
require('../index')(React, Backbone, _);

// just make sure the "with-deps" file is not hosed since it is a copy
require('../with-deps')(_.clone(React), _.clone(Backbone), _);

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
  obj.props = obj.props || {};

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
var Collection = Backbone.Collection.extend({
  url: 'foo'
});

describe('react-backbone', function() {

  describe('modelIndexErrors', function() {
    it('should index errors', function() {
      var errors = [
        {foo: 'bar', abc: 'def'}
      ];
      errors = React.mixins.modelIndexErrors(errors);
      expect(errors.foo).to.eql('bar');
      expect(errors.abc).to.eql('def');
    });
  });


  describe('modelAware', function() {

    it('should get the model using props.model', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelAware']);
      expect(obj.getModel()).to.eql(model);
    });

    it('should set the model', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelAware']);
      expect(obj.getModel()).to.eql(model);

      var model2 = new Backbone.Model();
      obj.setProps({model: model2});
      expect(obj.getModel()).to.eql(model2);
    });
  });


  describe('collectionAware', function() {

    it('should get the collection using props.collection', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionAware']);
      expect(obj.getCollection()).to.eql(collection);
    });

    it('should set the collection', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionAware']);
      expect(obj.getCollection()).to.eql(collection);

      var collection2 = new Backbone.Collection();
      obj.setProps({collection: collection2});
      expect(obj.getCollection()).to.eql(collection2);
    });
  });


  describe('modelPopulate', function() {

    it('should iterate components and call getValue to set attributes', function() {
      var obj = newComponent({}, ['modelPopulate']);
      var components = [
        {
          props: {
            ref: 'foo'
          },
          getValue: function() {
            return 'bar';
          }
        }
      ];
      var attributes = obj.modelPopulate(components, false);
      expect(attributes).to.eql({foo: 'bar'});
    });

    it('should iterate components and call getValue to set attributes using refs', function() {
      var obj = newComponent({}, ['modelPopulate']);
      var component = {
        props: {
          ref: 'foo'
        },
        getValue: function() {
          return 'bar';
        }
      };
      obj.refs = {
        foo: component
      };
      var attributes = obj.modelPopulate(false);
      expect(attributes).to.eql({foo: 'bar'});
    });

    it('should set values on model if a callback is provided', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelAware', 'modelPopulate']);
      var component = {
        props: {
          ref: 'foo'
        },
        getValue: function() {
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
        getValue: function() {
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


  describe('getModelValue', function() {

    it('should get value from model using Backbone.input.getModelValue(component) and set the model value using "key"', function() {
      var model = new Backbone.Model({foo: 'bar'}),
          obj = newComponent({props: {model: model, key: 'foo'}}, ['modelAware']);
      var val = Backbone.input.getModelValue(obj);
      expect(val).to.eql('bar');

      Backbone.input.setModelValue(obj, 'baz');
      expect(model.get('foo')).to.eql('baz');
    });

    it('should get and set the model value using "ref"', function() {
      var model = new Backbone.Model({foo: 'bar'}),
          obj = newComponent({props: {model: model, ref: 'foo'}}, ['modelAware']);
      expect(Backbone.input.getModelValue(obj)).to.eql('bar');
      Backbone.input.setModelValue(obj, 'baz');
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


  describe('modelEvents', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should not do event binding until node is mounted', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelEvents']),
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
          obj = newComponent({props: {model: model}}, ['modelEvents']),
          spy = sinon.spy();

      // setting model before mounting
      obj.modelOn('foo', spy);
      obj.setProps({model: model});
      // we shouldn't bind yet because we are not mounted
      model.trigger('foo');
      expect(spy.callCount).to.eql(0);

      obj.mount();
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);
    });

    it('should bind if component has already been mounted when setting model', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelEvents']),
          spy = sinon.spy();

      obj.modelOn('foo', spy);
      obj.mount();
      obj.setProps({model: model});
      model.trigger('foo');
      expect(spy.callCount).to.eql(1);
    });

    it('should unbind a previous model and rebind to a new model', function() {
      var model1 = new Backbone.Model(),
          model2 = new Backbone.Model(),
          obj = newComponent({props: {model: model1}}, ['modelEvents']),
          spy = sinon.spy();

      obj.modelOn('foo', spy);
      obj.mount();
      model1.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // set another model and ensure the first was unbound
      obj.setProps({model: model2});
      model2.trigger('foo');
      expect(spy.callCount).to.eql(2);

      model1.trigger('foo');
      expect(spy.callCount).to.eql(2); // ensure the previous trigger *did not* call the handler
    });

    it('should transfer bindings if a new model property is provided', function() {
      var model1 = new Backbone.Model(),
          model2 = new Backbone.Model(),
          obj = newComponent({props: {model: model1}}, ['modelEvents']),
          spy = sinon.spy();

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


  describe('collectionEvents', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should not do event binding until node is mounted', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionEvents']),
          spy = sinon.spy();
      obj.collectionOn('foo', spy);
      collection.trigger('foo');
      // we shouldn't bind yet because we aren't mounted
      expect(spy.callCount).to.eql(0);

      obj.mount();
      collection.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // we shouldn't bind now because we will be unmounted
      obj.unmount();
      collection.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // mount again and ensure that we rebind
      obj.mount();
      collection.trigger('foo');
      expect(spy.callCount).to.eql(2);
      obj.unmount();
      collection.trigger('foo');
      expect(spy.callCount).to.eql(2);
    });

    it('should bind if collection does not exist when registered', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionEvents']),
          spy = sinon.spy();

      // setting model before mounting
      obj.collectionOn('foo', spy);
      obj.setProps({collection: collection});
      // we shouldn't bind yet because we are not mounted
      collection.trigger('foo');
      expect(spy.callCount).to.eql(0);

      obj.mount();
      collection.trigger('foo');
      expect(spy.callCount).to.eql(1);
    });

    it('should bind if component has already been mounted when setting collection', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionEvents']),
          spy = sinon.spy();

      obj.collectionOn('foo', spy);
      obj.mount();
      obj.setProps({collection: collection});
      collection.trigger('foo');
      expect(spy.callCount).to.eql(1);
    });

    it('should unbind a previous collection and rebind to a new collection', function() {
      var collection1 = new Backbone.Collection(),
          collection2 = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection1}}, ['collectionEvents']),
          spy = sinon.spy();

      obj.collectionOn('foo', spy);
      obj.mount();
      collection1.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // set another collection and ensure the first was unbound
      obj.setProps({collection: collection2});
      collection2.trigger('foo');
      expect(spy.callCount).to.eql(2);

      collection1.trigger('foo');
      expect(spy.callCount).to.eql(2); // ensure the previous trigger *did not* call the handler
    });

    it('should transfer bindings if a new collection property is provided', function() {
      var collection1 = new Backbone.Collection(),
          collection2 = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection1}}, ['collectionEvents']),
          spy = sinon.spy();

      obj.collectionOn('foo', spy);
      obj.mount();
      collection1.trigger('foo');
      expect(spy.callCount).to.eql(1);

      // set another model and ensure the first was unbound
      obj.setProps({collection: collection2});
      clock.tick(1);

      collection2.trigger('foo');
      expect(spy.callCount).to.eql(2);

      collection1.trigger('foo');
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

    it('should listen to model change events and force an update', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelChangeAware']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      model.trigger('change');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
    });
  });


  describe('collectionChangeAware', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should listen to collection change events (reset, add, remove, sort) and force an update', function() {
      var collection = new Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionChangeAware']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      collection.trigger('reset');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
      collection.trigger('add');
      clock.tick(1);
      expect(spy.callCount).to.eql(2);
      collection.trigger('remove');
      clock.tick(1);
      expect(spy.callCount).to.eql(3);
      collection.trigger('sort');
      clock.tick(1);
      expect(spy.callCount).to.eql(4);
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


  describe('collectionUpdateOn', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should listen to provided events and force an update', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection, updateOn: 'foo'}}, ['collectionUpdateOn']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      collection.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
    });

    it('should listen to provided events (as array) and force an update', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection, updateOn: ['foo', 'bar']}}, ['collectionUpdateOn']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      collection.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
      collection.trigger('bar');
      clock.tick(1);
      expect(spy.callCount).to.eql(2);
    });

    it('should listen to declaring component provided events and force an update', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionUpdateOn("foo", "bar")']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      collection.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);
      collection.trigger('bar');
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
  });


  describe('collectionLoadOn', function() {

    it('should not call setState if the component is not mounted (but still set the loading state attribute)', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: { collection: collection, loadOn: 'foo' }}, ['collectionLoadOn']);

      // initialize the plugins
      obj.mount();

      // make it look like we aren't mounted
      obj._mounted = false;
      Backbone.sync('foo', collection, { url: 'foo' });
      expect(obj.setState).to.not.have.been.called;
      expect(!!obj.state.loading).to.eql(true);

      obj._mounted = true;
      $.success();
      expect(obj.setState).to.have.been.calledWith({loading: false});
      expect(obj.setState.callCount).to.eql(1);
    });

    it('should set loading state when an async event is triggered (success condition)', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: { collection: collection, loadOn: 'foo' }}, ['collectionLoadOn']);
      obj.mount();

      Backbone.sync('foo', collection, { url: 'foo' });
      expect(!!obj.setState.getCall(0).args[0].loading).to.eql(true);
      $.success();
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(false);
      expect(obj.setState.callCount).to.eql(2);
    });

    it('should set loading state when an async event is triggered (error condition)', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection, loadOn: 'foo'}}, ['collectionLoadOn']);
      obj.mount();

      Backbone.sync('foo', collection, {url: 'foo'});
      expect(!!obj.setState.getCall(0).args[0].loading).to.eql(true);
      $.error();
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(false);
      expect(obj.setState.callCount).to.eql(2);
    });

    it('should not error if no "loadOn" property is defined', function() {
      newComponent({props: {collection: new Backbone.Collection()}}, ['collectionLoadOn']);
      // we are just looking for an error thrown in getInitialState
    });

    it('should support mixin parameters instead of the "loadOn" property', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionLoadOn("foo"))']),
          spy = sinon.spy();
      obj.setState = spy;
      obj.mount();

      Backbone.sync('foo', collection, {url: 'foo'});
      expect(!!obj.setState.getCall(0).args[0].loading).to.eql(true);
      $.success();
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(false);
      expect(spy.callCount).to.eql(2);
    });

  });


  describe('loadWhile', function() {
    it('should provide a return callback if none is supplied', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['loadWhile']),
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
          obj = newComponent({props: {model: model}}, ['loadWhile']),
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


  describe('collectionXHRAware', function() {

    it('moch (success condition)', function() {
      var collection = new Collection(),
          obj = newComponent({props: { collection: collection }}, ['collectionXHRAware']),
          spy = sinon.spy();
      obj.setState = spy;
      obj.mount();

      expect(spy.callCount).to.eql(0);
      Backbone.sync('foo', collection, { url: 'foo' });
      expect(spy.callCount).to.eql(1);
      expect(spy.getCall(0).args).to.eql([{ loading: true }]);
      $.success();
      expect(spy.callCount).to.eql(2);
      expect(!!spy.getCall(1).args[0].loading).to.eql(false);
      expect(spy.callCount).to.eql(2);

      Backbone.sync('bar', collection, { url: 'foo' });
      $.success();
      expect(spy.callCount).to.eql(4);
      expect(!!spy.getCall(2).args[0].loading).to.eql(true);
      expect(!!spy.getCall(3).args[0].loading).to.eql(false);
    });

    it('should set loading state if the collection is loading when set on the component', function() {
      var collection = new Collection();
      collection.fetch();
      var obj = newComponent({props: { collection: collection }}, ['collectionXHRAware']),
          spy = sinon.spy();
      obj.setState = spy;
      obj.mount();
      expect(!!obj.state.loading).to.eql(true);
      expect(spy.callCount).to.eql(0);
      $.success();
      expect(!!spy.getCall(0).args[0].loading).to.eql(false);
    });

    it('should set loading state if the collection is loading after being set but before mounting', function() {
      var collection = new Collection(),
          obj = newComponent({props: { collection: collection }}, ['collectionXHRAware']),
          spy = sinon.spy();
      obj.setState = spy;
      collection.fetch();
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
    it('should include events mixin, Backbone.Events for on/off/trigger mixin and the react-events "state" mixin', function() {
      var mixins = React.mixins.get('events');
      expect(mixins.length).to.eql(3);
    });
    it('set React.events.mixin to Backbone.Events', function() {
      expect(React.events.mixin).to.eql(Backbone.Events);
      var obj = newComponent({}, ['modelEvents']);
      expect(!!obj.on).to.eql(true);
      expect(!!obj.off).to.eql(true);
    });
    it('should do model declarative event binding', function() {
      var model = new Model(),
          spy1 = sinon.spy(),
          spy2 = sinon.spy(),
          obj = newComponent({
            props: { model: model },
            events: {
              'model:foo': 'onFoo',
              model: {
                bar: 'onBar'
              }
            },
            onFoo: spy1,
            onBar: spy2
          }, ['events', 'modelEvents']);
      obj.mount();
      model.trigger('foo');
      model.trigger('bar');
      expect(spy1.callCount).to.eql(1);
      expect(spy2.callCount).to.eql(1);
    });
    it('should do collection declarative event binding', function() {
      var collection = new Collection(),
          spy1 = sinon.spy(),
          spy2 = sinon.spy(),
          obj = newComponent({
            props: { collection: collection },
            events: {
              'collection:foo': 'onFoo',
              collection: {
                bar: 'onBar'
              }
            },
            onFoo: spy1,
            onBar: spy2
          }, ['events', 'collectionEvents']);
      obj.mount();
      collection.trigger('foo');
      collection.trigger('bar');
      expect(spy1.callCount).to.eql(1);
      expect(spy2.callCount).to.eql(1);
    });
  });
});
