var jsdom = require('jsdom');
 
// move into beforeEach and flip global.window.close on to improve
// cleaning of environment during each test and prevent memory leaks
global.document = jsdom.jsdom('<html><body></body></html>', jsdom.level(1, 'core'));
global.window = document.parentWindow;
global.navigator = {
  userAgent: 'Mozilla/5.0'
};

var chai = require('chai'),
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    expect = chai.expect,
    React = require('react/addons'),
    Backbone = require('backbone'),
    _ = require('underscore'),
    $ = {
        options: [],
        ajax: function(options) {
          if (options.beforeSend) {
            if (options.beforeSend(this, options) === false) {
              return false;
            }
          }
          this.options.push(options);
        },
        success: function(data) {
          var options = this.options.pop();
          if (options.success) {
            options.success(data);
          }
        },
        error: function(error) {
          var options = this.options.pop();
          if (options.error) {
            options.error(error);
          }
        }
      };
chai.use(sinonChai);
Backbone.$ = $;
var TestUtils = React.addons.TestUtils;

var ReactMixinManager = require('react-mixin-manager');
var ReactEvents = require('react-events');
var ReactBackbone = require('../index');


function newComponent(attributes, mixins) {

  if (mixins) {
    mixins = ReactMixinManager.get(mixins);
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
    _.each(attributes, function(value, name) {
      obj[name] = value;
    });
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

  afterEach(function() {
    sinon.restore();
  });

  describe('modelIndexErrors', function() {
    it('should index errors', function() {
      var errors = [
        {foo: 'bar', abc: 'def'}
      ];
      errors = ReactBackbone.modelIndexErrors(errors);
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


  describe('modelFetch', function() {
    it('should call whenFetched on the default model', function() {
      var model = new Backbone.Model();
      model.whenFetched = sinon.spy();
      var obj = newComponent({props: {model: model}}, ['modelFetch']);
      obj.mount();
      expect(model.whenFetched.callCount).to.eql(1);
    });
    it('should call whenFetched on multiple custom models', function() {
      var model1 = new Backbone.Model(),
          model2 = new Backbone.Model();
      model1.whenFetched = sinon.spy();
      model2.whenFetched = sinon.spy();
      var obj = newComponent({props: {test1: model1, test2: model2}},
          ['modelAware("test1", "test2")', 'modelFetch']);
      obj.mount();
      expect(model1.whenFetched.callCount).to.eql(1);
      expect(model2.whenFetched.callCount).to.eql(1);
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

  describe('collectionFetch', function() {
    it('should call whenFetched on the default collection', function() {
      var collection = new Backbone.Collection();
      collection.whenFetched = sinon.spy();
      var obj = newComponent({props: {collection: collection}}, ['collectionFetch']);
      obj.mount();
      expect(collection.whenFetched.callCount).to.eql(1);
    });
    it('should call whenFetched on multiple custom collections', function() {
      var collection1 = new Backbone.Collection(),
          collection2 = new Backbone.Collection();
      collection1.whenFetched = sinon.spy();
      collection2.whenFetched = sinon.spy();
      var obj = newComponent({props: {test1: collection1, test2: collection2}},
          ['collectionAware("test1", "test2")', 'collectionFetch']);
      obj.mount();
      expect(collection1.whenFetched.callCount).to.eql(1);
      expect(collection2.whenFetched.callCount).to.eql(1);
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
      });
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
      expect(spy.callCount).to.eql(0);
      expect(attributes).to.eql({foo: 'bar'});
      expect(Model.prototype.validate).to.have.been.calledWith({foo: 'bar'});
    });
  });


  describe('getModelValue', function() {

    it('should get value from model using ReactBackbone.getModelValue(component) and set the model value using "key"', function() {
      var model = new Backbone.Model({foo: 'bar'}),
          obj = newComponent({props: {model: model, key: 'foo'}}, ['modelAware']);
      var val = ReactBackbone.getModelValue(obj);
      expect(val).to.eql('bar');

      ReactBackbone.setModelValue(obj, 'baz');
      expect(model.get('foo')).to.eql('baz');
    });

    it('should get and set the model value using "ref"', function() {
      var model = new Backbone.Model({foo: 'bar'}),
          obj = newComponent({props: {model: model, ref: 'foo'}}, ['modelAware']);
      expect(ReactBackbone.getModelValue(obj)).to.eql('bar');
      ReactBackbone.setModelValue(obj, 'baz');
      expect(model.get('foo')).to.eql('baz');
    });
  });


  describe('modelValidator', function() {
    var Model = Backbone.Model.extend({
      validate: function(attributes, options) {
        return options && options.rtn;
      }
    });

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

      // ensure the previous trigger *did not* call the handler
      model1.trigger('foo');
      expect(spy.callCount).to.eql(2); 
    });

    it('should accomodate multiple models', function() {
      var model1a = new Backbone.Model(),
          model1b = new Backbone.Model(),
          model2a = new Backbone.Model(),
          model2b = new Backbone.Model(),
          obj = newComponent({props: {foo: model1a, bar: model1b}}, ['modelAware("foo", "bar")', 'modelEvents']),
          spy = sinon.spy();

      obj.modelOn('theEvent', spy);
      obj.mount();
      model1a.trigger('theEvent');
      expect(spy.callCount).to.eql(1);
      model1b.trigger('theEvent');
      expect(spy.callCount).to.eql(2);

      // set another model and ensure the first was unbound
      obj.setProps({foo: model2a, bar: model2b});
      clock.tick(1);

      // ensure the new model is bound
      model2a.trigger('theEvent');
      expect(spy.callCount).to.eql(3);
      model2b.trigger('theEvent');
      expect(spy.callCount).to.eql(4);

      // ensure the previous trigger *did not* call the handler
      model1a.trigger('theEvent');
      expect(spy.callCount).to.eql(4);
      model1b.trigger('theEvent');
      expect(spy.callCount).to.eql(4);
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

      // ensure the previous trigger *did not* call the handler
      collection1.trigger('foo');
      expect(spy.callCount).to.eql(2);
    });

    it('should accomodate multiple collections', function() {
      var collection1a = new Backbone.Collection(),
          collection1b = new Backbone.Collection(),
          collection2a = new Backbone.Collection(),
          collection2b = new Backbone.Collection(),
          obj = newComponent({props: {foo: collection1a, bar: collection1b}}, ['collectionAware("foo", "bar")', 'collectionEvents']),
          spy = sinon.spy();

      obj.collectionOn('theEvent', spy);
      obj.mount();
      collection1a.trigger('theEvent');
      expect(spy.callCount).to.eql(1);
      collection1b.trigger('theEvent');
      expect(spy.callCount).to.eql(2);

      // set another model and ensure the first was unbound
      obj.setProps({foo: collection2a, bar: collection2b});
      clock.tick(1);

      // ensure the new model is bound
      collection2a.trigger('theEvent');
      expect(spy.callCount).to.eql(3);
      collection2b.trigger('theEvent');
      expect(spy.callCount).to.eql(4);

      // ensure the previous trigger *did not* call the handler
      collection1a.trigger('theEvent');
      expect(spy.callCount).to.eql(4);
      collection1b.trigger('theEvent');
      expect(spy.callCount).to.eql(4);
    });
  });

  describe('backboneChangeAware', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should work with both model and collection change events', function() {
      var model = new Backbone.Model(),
          collection = new Collection(),
          obj = newComponent({props: {model: model, collection: collection}}, ['backboneChangeAware']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      model.trigger('change');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);

      collection.trigger('reset');
      clock.tick(1);
      expect(spy.callCount).to.eql(2);
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


  describe('backboneUpdateOn', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });
    afterEach(function() {
      clock.restore();
    });

    it('should work for models and collections', function() {
      var model = new Backbone.Model(),
          collection = new Backbone.Collection(),
          obj = newComponent({props: {model: model, collection: collection, updateOn: 'foo'}}, ['backboneUpdateOn']),
          spy = sinon.spy();
      obj.forceUpdate = spy;

      obj.mount();
      expect(spy.callCount).to.eql(0);
      model.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(1);

      collection.trigger('foo');
      clock.tick(1);
      expect(spy.callCount).to.eql(2);
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

  describe('backboneLoadOn', function() {
    it('should loadOn with models and collections', function() {
      var model = new Backbone.Model(),
          collection = new Backbone.Collection(),
          obj = newComponent({props: {model: model, collection: collection, loadOn: 'foo'}}, ['backboneLoadOn']);

      obj.mount();
      // for the event binding
      expect(obj.setState.callCount).to.eql(1);
      Backbone.sync('foo', model, {url: 'foo'});
      // for the initial XHR activity
      expect(obj.setState.callCount).to.eql(2);
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(true);
      $.success();
      expect(obj.setState.callCount).to.eql(3);

      Backbone.sync('foo', collection, {url: 'foo'});
      expect(obj.setState.callCount).to.eql(4);
    });
  });

  describe('modelLoadOn', function() {
    it('should set loading state when an async event is triggered (success condition)', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model, loadOn: 'foo'}}, ['modelLoadOn']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', model, {url: 'foo'});
      // for the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(true);
      $.success();
      // completion of the loading state
      expect(obj.setState.callCount).to.eql(3);
      expect(!!obj.setState.getCall(2).args[0].loading).to.eql(false);
    });

    it('should set loading state when an async event is triggered (error condition)', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model, loadOn: 'foo'}}, ['modelLoadOn']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', model, {url: 'foo'});
      // for the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(true);
      $.error();
      // completion of the loading state
      expect(obj.setState.callCount).to.eql(3);
      expect(!!obj.setState.getCall(2).args[0].loading).to.eql(false);
    });

    it('should not error if no "loadOn" property is defined', function() {
      newComponent({props: {model: new Backbone.Model()}}, ['modelLoadOn']);
      // we are just looking for an error thrown in getInitialState
    });
  });


  describe('collectionLoadOn', function() {
    it('should set loading state when an async event is triggered (success condition)', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: { collection: collection, loadOn: 'foo' }}, ['collectionLoadOn']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', collection, { url: 'foo' });
      // set the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(true);
      $.success();
      // completion of the loading state
      expect(obj.setState.callCount).to.eql(3);
      expect(!!obj.setState.getCall(2).args[0].loading).to.eql(false);
    });

    it('should set loading state when an async event is triggered (error condition)', function() {
      var collection = new Backbone.Collection(),
          obj = newComponent({props: {collection: collection, loadOn: 'foo'}}, ['collectionLoadOn']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', collection, {url: 'foo'});
      // for the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(true);
      $.error();
      // completion of the loading state
      expect(obj.setState.callCount).to.eql(3);
      expect(!!obj.setState.getCall(2).args[0].loading).to.eql(false);
    });

    it('should not error if no "loadOn" property is defined', function() {
      newComponent({props: {collection: new Backbone.Collection()}}, ['collectionLoadOn']);
      // we are just looking for an error thrown in getInitialState
    });
  });


  describe('loadWhile', function() {
    it('should update the loading state attribute (simple scenario)', function() {
      var model = new Model(),
          obj = newComponent({}, ['loadWhile']);
      obj.mount();

      obj.loadWhile(function() {
        model.fetch();
      });
      expect(obj.state.loading).to.eql(model.xhrActivity);
      $.success();
      expect(obj.state.loading).to.eql(undefined);
    });

    it('should update the loading state attribute (multiple models / multiple XHR)', function() {
      var model1 = new Model(),
          model2 = new Model(),
          obj = newComponent({}, ['loadWhile']);
      obj.mount();

      obj.loadWhile(function() {
        model1.fetch();
        model2.fetch();
      });

      expect(model1.xhrActivity.length).to.eql(1);
      expect(model2.xhrActivity.length).to.eql(1);
      expect(obj.state.loading).to.eql([model1.xhrActivity[0], model2.xhrActivity[0]]);

      $.success();
      expect(obj.state.loading.length).to.eql(1);
      $.success();
      expect(obj.state.loading).to.eql(undefined);
    });

    it('should use the component as context', function() {
      var model = new Model(),
          obj = newComponent({}, ['loadWhile']);
      obj.mount();
      var context;
      obj.loadWhile(function() {
        context = this;
      });
      expect(context).to.eql(obj);
    });
  });


  describe('backboneXHRAware', function() {
    it('should include modelXHRAware and collectionXHRAware', function() {
      var model = new Backbone.Model(),
          collection = new Backbone.Collection(),
          obj = newComponent({props: {model: model, collection: collection}}, ['backboneXHRAware']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', model, {url: 'foo'});
      // for the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.setState.getCall(1).args[0].loading).to.eql([model.xhrActivity[0]]);
      $.success();
      // completion of the loading state
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.setState.getCall(2).args).to.eql([{loading: undefined}]);

      obj.setState.reset();
      Backbone.sync('foo', collection, {url: 'foo'});
      expect(obj.setState.callCount).to.eql(1);
      expect(obj.setState.getCall(0).args[0].loading).to.eql([collection.xhrActivity[0]]);
      $.success();
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.setState.getCall(1).args).to.eql([{loading: undefined}]);
    });

    it('should keep track of multiple requests and loading: false should only appear when all are done', function() {
      var model = new Backbone.Model(),
          collection = new Backbone.Collection(),
          obj = newComponent({props: {model: model, collection: collection}}, ['backboneXHRAware']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', model, {url: 'foo'});
      // for the the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.state.loading).to.eql([model.xhrActivity[0]]);

      Backbone.sync('foo', collection, {url: 'foo'});
      // no need to refresh so we shouldn't update the state with setState
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.state.loading).to.eql([
        model.xhrActivity[0], collection.xhrActivity[0]]);

      $.success();
      // no need to refresh so we shouldn't update the state with setState
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.state.loading).to.eql([model.xhrActivity[0]]);
      $.success();
      // now we should have refreshed
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.state.loading).to.eql(undefined);
    });
  });


  describe('modelXHRAware', function() {

    it('moch (success condition)', function() {
      var model = new Backbone.Model(),
          obj = newComponent({props: {model: model}}, ['modelXHRAware']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', model, {url: 'foo'});
      // for the the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.setState.getCall(1).args[0].loading).to.eql([model.xhrActivity[0]]);
      $.success();
      // loading complete
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.setState.getCall(2).args[0].loading).to.eql(undefined);

      Backbone.sync('bar', model, {url: 'foo'});
      // a new loading state
      expect(obj.setState.callCount).to.eql(4);
      expect(obj.setState.getCall(3).args[0].loading).to.eql([model.xhrActivity[0]]);
      $.success();
      // another loading complete
      expect(obj.setState.callCount).to.eql(5);
      expect(obj.setState.getCall(4).args[0].loading).to.eql(undefined);
    });

    it('should set loading state if the model is loading when set on the component', function() {
      var model = new Model();
      model.fetch();
      var obj = newComponent({props: {model: model}}, ['modelXHRAware']);
      expect(obj.setState.callCount).to.eql(0);
      obj.mount();
      // for the event bindings and another for the loading in progress
      expect(obj.setState.callCount).to.eql(1);

      expect(obj.state.loading).to.eql([model.xhrActivity[0]]);
      $.success();
      // loading complete
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.setState.getCall(1).args[0].loading).to.eql(undefined);
    });

    it('should set loading state if the model is loading after being set but before mounting', function() {
      var model = new Model(),
          obj = newComponent({props: {model: model}}, ['modelXHRAware']);
      model.fetch();
      expect(obj.setState.callCount).to.eql(0);
      obj.mount();
      // for the event bindings and another for the loading in progress
      expect(obj.setState.callCount).to.eql(2);

      expect(obj.setState.getCall(1).args[0].loading).to.eql([model.xhrActivity[0]]);
      $.success();
      // loading complete      
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.setState.getCall(2).args).to.eql([{loading: undefined}]);
    });

    it('should handle XHRAware arguments', function() {
      var model = new Model(),
          obj = newComponent({props: {model: model}}, ['modelXHRAware({read: "loading", foo: "abc", all: "def"})']);
      model.fetch();
      expect(obj.setState.callCount).to.eql(0);
      obj.mount();
      // for the event bindings and another for the loading in progress ("loading" and "def" for all)
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.state.loading).to.eql(model.xhrActivity);
      expect(obj.state.def).to.eql(model.xhrActivity);

      $.success();
      expect(obj.setState.callCount).to.eql(5);
      expect(obj.state.loading).to.eql(undefined);
      expect(obj.state.def).to.eql(undefined);
    });
  });


  describe('collectionXHRAware', function() {

    it('moch (success condition)', function() {
      var collection = new Collection(),
          obj = newComponent({props: { collection: collection }}, ['collectionXHRAware']);
      obj.mount();
      // for the event bindings
      expect(obj.setState.callCount).to.eql(1);

      Backbone.sync('foo', collection, { url: 'foo' });
      // loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.setState.getCall(1).args[0].loading).to.eql([collection.xhrActivity[0]]);
      $.success();
      // loading complete
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.setState.getCall(2).args[0].loading).to.eql(undefined);

      Backbone.sync('bar', collection, { url: 'foo' });
      // another loading state
      expect(obj.setState.callCount).to.eql(4);
      expect(obj.setState.getCall(3).args[0].loading).to.eql([collection.xhrActivity[0]]);
      $.success();
      // another loading complete
      expect(obj.setState.callCount).to.eql(5);
      expect(obj.setState.getCall(4).args[0].loading).to.eql(undefined);
    });

    it('should set loading state if the collection is loading when set on the component', function() {
      var collection = new Collection();
      collection.fetch();
      var obj = newComponent({props: { collection: collection }}, ['collectionXHRAware']);
      expect(obj.setState.callCount).to.eql(0);
      obj.mount();
      // for the event bindings and loading state
      expect(obj.setState.callCount).to.eql(1);
      expect(obj.state.loading).to.eql([collection.xhrActivity[0]]);
      $.success();
      // loading complete
      expect(obj.setState.callCount).to.eql(2);
      expect(!!obj.setState.getCall(1).args[0].loading).to.eql(false);
    });

    it('should set loading state if the collection is loading after being set but before mounting', function() {
      var collection = new Collection(),
          obj = newComponent({props: { collection: collection }}, ['collectionXHRAware']);
      collection.fetch();
      expect(obj.setState.callCount).to.eql(0);
      obj.mount();
      // for the event bindings and the loading state
      expect(obj.setState.callCount).to.eql(2);
      expect(obj.setState.getCall(1).args[0].loading).to.eql([collection.xhrActivity[0]]);
      $.success();
      // loading complete
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.setState.getCall(2).args).to.eql([{loading: undefined}]);
    });

    it('should handle XHRAware arguments', function() {
      var collection = new Collection(),
          obj = newComponent({props: {collection: collection}}, ['collectionXHRAware({read: "loading", foo: "abc", all: "def"})']);
      collection.fetch();
      expect(obj.setState.callCount).to.eql(0);
      obj.mount();
      // for the event bindings and another for the loading in progress ("loading" and "def" for all)
      expect(obj.setState.callCount).to.eql(3);
      expect(obj.state.loading).to.eql(collection.xhrActivity);
      expect(obj.state.def).to.eql(collection.xhrActivity);

      $.success();
      expect(obj.setState.callCount).to.eql(5);
      expect(obj.state.loading).to.eql(undefined);
      expect(obj.state.def).to.eql(undefined);
    });
  });


  describe('react-events integration', function() {
    it('should include events mixin, Backbone.Events for on/off/trigger mixin and the react-events "state" mixin', function() {
      var mixins = ReactMixinManager.get('events');
      expect(mixins.length).to.eql(3);
    });
    it('set ReactEvents.mixin to Backbone.Events', function() {
      expect(ReactEvents.mixin).to.eql(Backbone.Events);
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

  describe('input fields', function() {
    describe('two way binding', function() {
      it('should not do it if the bind property is not provided', function() {
        var TextBox = React.createFactory(ReactBackbone.input.Text),
            model = new Backbone.Model();
        model.set('foo', 'bar');
        var component = TestUtils.renderIntoDocument(new TextBox({name: 'foo', model: model}));
        expect(component.getValue()).to.eql('bar');
        var spy = sinon.spy();
        model.on('change:foo', spy);
        component.getDOMNode().value = 'a';
        TestUtils.Simulate.change(component.getDOMNode(), { target: { value: 'a' } });
        expect(spy.callCount).to.eql(0);
      });
      it('should do two way binding for standard input fields', function() {
        var TextBox = React.createFactory(ReactBackbone.input.Text),
            model = new Backbone.Model();
        model.set('foo', 'bar');
        var component = TestUtils.renderIntoDocument(new TextBox({name: 'foo', model: model, bind: true}));
        expect(component.getValue()).to.eql('bar');
        var spy = sinon.spy();
        model.on('change:foo', spy);
        component.getDOMNode().value = 'a';
        TestUtils.Simulate.change(component.getDOMNode(), { target: { value: 'a' } });
        expect(spy.callCount).to.eql(1);
        expect(spy.getCall(0).args[1]).to.eql('a');
      });
    });
  });

});
