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

// intitialize mixin-dependencies
require('react-mixin-manager')(React);
// initialize backbone-async-event
require('backbone-async-event')(Backbone);
// add react-backbone mixins
require('../index')(React);

function newComponent(props, list) {
  var obj = {
    props: props || {},
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
      for (var i=0; i<list.length; i++) {
        var func = list[i][method];
        if (func) {
          rtn.push(func.apply(this, Array.prototype.slice.call(arguments, 1)));
        }
      }
      return rtn;
    }
  }
  var state, aggregateState;
  for (var i=0; i<list.length; i++) {
    var mixin = list[i];
    for (var name in mixin) {
      obj[name] = mixin[name];
    }
    state = obj.getInitialState && obj.getInitialState();
    if (state) {
      if (!aggregateState) aggregateState = {};
      _.defaults(aggregateState, state);
    }
  }
  obj.state = aggregateState;
  return obj;
}

var Model = Backbone.Model.extend({
  url: 'foo'
});

describe('modelAccessor', function() {

  it('should get and set the model', function() {
    var model = new Backbone.Model(),
        obj = newComponent({model: model}, React.mixins.get('modelAccessor'));
    expect(obj.getModel()).to.eql(model);

    var model2 = new Backbone.Model();
    obj.setModel(model2);
    expect(obj.getModel()).to.eql(model2);    
  });

});

describe('modelEventBinder', function() {

  it('should not do event binding until node is mounted', function() {
    var model = new Backbone.Model(),
        obj = newComponent({model: model}, React.mixins.get('modelEventBinder'));
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
        obj = newComponent({model: model}, React.mixins.get('modelEventBinder')),
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
        obj = newComponent({model: model}, React.mixins.get('modelEventBinder')),
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
        obj = newComponent({model: model1}, React.mixins.get('modelEventBinder')),
        spy = sinon.spy();

    obj.modelOn('foo', spy);
    obj.mount();
    model1.trigger('foo');
    expect(spy.callCount).to.eql(1);

    // set another model and ensure the first was unbound
    obj.setModel(model2);
    model1.trigger('foo');
    expect(spy.callCount).to.eql(1); // ensure the previous trigger *did not* call the handler
    model2.trigger('foo');
    expect(spy.callCount).to.eql(2);
  });
});

describe('modelChangeListener', function() {

  it('should listen to all events and force an update', function() {
    var model = new Backbone.Model(),
        obj = newComponent({model: model}, React.mixins.get('modelChangeListener')),
        spy = sinon.spy();
    obj.forceUpdate = spy;
    
    obj.mount();
    expect(spy.callCount).to.eql(0);
    model.trigger('change');
    expect(spy.callCount).to.eql(1);
    model.trigger('reset');
    expect(spy.callCount).to.eql(2);
    model.trigger('add');
    expect(spy.callCount).to.eql(3);
    model.trigger('remove');
    expect(spy.callCount).to.eql(4);
    model.trigger('sort');
    expect(spy.callCount).to.eql(5);
  });
});


// THE FOLLING TESTS ASSUME THE INCLUSION OF [backbone-async-event](https://github.com/jhudson8/backbone-async-event)

describe('modelLoadOn', function() {

  it('should set loading state when an async event is triggered (success condition)', function() {
    var model = new Backbone.Model(),
        obj = newComponent({model: model, loadOn: 'foo'}, React.mixins.get('modelLoadOn')),
        spy = sinon.spy();
    obj.setState = spy;
    obj.mount();

    Backbone.sync('foo', model, {url: 'foo'});
    expect(spy).to.have.been.calledWith({loading: true});
    $.success();
    expect(spy).to.have.been.calledWith({loading: false});
    expect(spy.callCount).to.eql(2);
  });

  it('should set loading state when an async event is triggered (error condition)', function() {
    var model = new Backbone.Model(),
        obj = newComponent({model: model, loadOn: 'foo'}, React.mixins.get('modelLoadOn')),
        spy = sinon.spy();
    obj.setState = spy;
    obj.mount();

    obj.mount();

    Backbone.sync('foo', model, {url: 'foo'});
    expect(spy).to.have.been.calledWith({loading: true});
    $.error();
    expect(spy).to.have.been.calledWith({loading: false});
    expect(spy.callCount).to.eql(2);
  });

  it('should not error if no "loadOn" property is defined', function() {
    newComponent({model: new Backbone.Model()}, React.mixins.get('modelLoadOn'));
    // we are just looking for an error thrown in getInitialState
  });
});

describe('modelAsyncListener', function() {

  it('should set loading state when *any* async event is triggered (success condition)', function() {
    var model = new Backbone.Model(),
        obj = newComponent({model: model}, React.mixins.get('modelAsyncListener')),
        spy = sinon.spy();
    obj.setState = spy;
    obj.mount();

    expect(spy.callCount).to.eql(0);
    Backbone.sync('foo', model, {url: 'foo'});
    expect(spy.callCount).to.eql(1);
    expect(spy.getCall(0).args).to.eql([{loading: true}]);
    $.success();
    expect(spy.callCount).to.eql(2);
    expect(spy.getCall(1).args).to.eql([{loading: false}]);
    expect(spy.callCount).to.eql(2);

    Backbone.sync('bar', model, {url: 'foo'});
    $.success();
    expect(spy.callCount).to.eql(4);
    expect(spy.getCall(2).args).to.eql([{loading: true}]);
    expect(spy.getCall(3).args).to.eql([{loading: false}]);
  });

  it('should set loading state if the model is loading when set on the component', function() {
    var model = new Model();
    model.fetch();
    var obj = newComponent({model: model}, React.mixins.get('modelAsyncListener')),
        spy = sinon.spy();
    obj.setState = spy;
    obj.mount();
    expect(obj.state.loading).to.eql(true);
    expect(spy.callCount).to.eql(0);
    $.success();
    expect(spy.getCall(0).args).to.eql([{loading: false}]);
  });

  it('should set loading state if the model is loading after being set but before mounting', function() {
    var model = new Model(),
        obj = newComponent({model: model}, React.mixins.get('modelAsyncListener')),
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
