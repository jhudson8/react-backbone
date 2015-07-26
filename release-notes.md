# Release Notes

## Development

[Commits](https://github.com/jhudson8/react-backbone/compare/v1.0.5...master)

## v1.0.5 - July 25th, 2015
- fix specific XHRAware mixin... `modelXHRAware({read: "fetching", create: "creating", update: "updating"})` - 7a7b2c5


[Commits](https://github.com/jhudson8/react-backbone/compare/v1.0.4...v1.0.5)

## v1.0.4 - July 25th, 2015
- bug fix: don't try to rebind to new model/collection if it does not exist - 068f9bc


[Commits](https://github.com/jhudson8/react-backbone/compare/v1.0.3...v1.0.4)

## v1.0.3 - June 1st, 2015
- fix AMD reference - 926715a


[Commits](https://github.com/jhudson8/react-backbone/compare/v1.0.2...v1.0.3)

## v1.0.2 - May 26th, 2015
- [#4](https://github.com/jhudson8/react-backbone/issues/4) - Errors on script initialization
- fix bug when using the model/collection declaritive event bindings - 3e84c88
- null model check - b7f349d
- ensure state.loading is valid on first render (getInitialState response) - 09e1b2d


[Commits](https://github.com/jhudson8/react-backbone/compare/v1.0.1...v1.0.2)

## v1.0.1 - May 9th, 2015
- bug fix: in-browser source include loading - 14f1402


[Commits](https://github.com/jhudson8/react-backbone/compare/v1.0.0...v1.0.1)

## v1.0.0 - April 17th, 2015
There are no longer initialization requirements for react-backbone.  Now the dependencies are listed as peerDependencies

* "react": "*",
* "backbone": "*",
* "underscore": "*",
* "react-mixin-manager": ">=1.0",
* "react-events": ">=1.0",
* "backbone-xhr-events": ">=1.0"

So, you must include all of the modules as dependencies of your project.

The only initialization you need to do is just require the module

```
var ReactBackbone = require('react-backbone');
```

All input components are now available on ```ReactBackbone.input``` rather than ```Backbone.input```.  for example:

```
var ReactBackbone = require('react-backbone');
var Text = ReactBackbone.input.Text;
```

The following utility functions are now located on ```ReactBackbone```

* getModelKey
* modelIndexErrors
* getModelValue
* setModelValue

Also, the with-deps files have been removed as the dependencies are handled intrinsicly.



[Commits](https://github.com/jhudson8/react-backbone/compare/v0.26.0...v1.0.0)

## v0.26.0 - March 31st, 2015
- overhaul the loadWhile mixin - 2e52ce9

Exposes the ```loadWhile(callback[, loadingStateAttribute])``` function

* ***callback***: the function that will be executed containing any XHR activity to be monitored
* ***loadingStateAttribute***: the attribute ("loading" if not provided) to reference the loading state

Set the component state attribute ("loading" or loadingStateAttribute if provided) to a truthy value while *any* XHR activity is in progress as long as it was initiated during the execution of the callback function.

```javascript
    React.createComponent({
      mixins: ['loadWhile'],

      doSomething: function() {
        this.loadWhile(function() {
          // the "loading" attribute will be truthy as long as any of these fetches are in progress
          this.props.collection1.fetch();
          this.props.collection2.fetch();
          this.props.collection3.fetch();
        });
      }
    });
```


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.25.0...v0.26.0)

## v0.25.0 - March 30th, 2015
- add parameter awareness to the XHRAware mixin - aa1ba95

You can provide an optional argument to the mixin allowing you to specificy individual XHR events and the associated state attribute.  The key for each entry is the XHR event type and the value is the state attribute to indicate the XHR activity.  For example:

```javascript
    React.createClass({
      mixins: ['collectionXHRAware({read: "fetching"})'],
```

Will only listen for ```read``` events (fetch) and will use ```state.fetching``` instead of the standard ```state.loading```.

For more details on all XHR events [look here](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/bundle/jhudson8/backbone-xhr-events/section/XHR%20Method%20Reference?focus=outline)


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.24.1...v0.25.0)

## v0.24.1 - March 27th, 2015
- added onInvalid option awareness to the modelPopulate function - 7eddaaa
- remove jquery references - 9f53497

This is backwards compatible but you can now provide an ```onInvalid``` attribute to the modelPopulate options which will be called if the model fails validation.  The populated attributes object will be provided.

```javascript
this.modelPopulate(function(model) {
    // the model is valid
  }, {
    onInvalid: function(attributes) {
      // the model failed the validation check
    }
  }
});
```


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.24.0...v0.24.1)

## v0.24.0 - March 26th, 2015
- remove jquery as a dependency - acce9b0

If you are using [webpack](http://webpack.github.io/) you can easily remove jquery from your app (assuming you don't need it for other purposes) by doing the following

package.json
```
  dependencies: {
    // or some other $.ajax implementation
    "component-ajax": "0.0.2",
    "exoskeleton": "^0.7.0",
    ...
  }
```

webpack.config.js (npm install https://github.com/webpack/imports-loader)
```
    plugins: [
        new webpack.IgnorePlugin(/^jquery$/)
    ],
    loaders: [
        { test: /exoskeleton\.js$/,    loader: "imports?define=>false"}
    ],
    resolve: {
      alias: {
        backbone: 'exoskeleton/exoskeleton.js'
      }
    },
```

When initializing react-backbone
```
var ajax = require('component-ajax');
Backbone.ajax = function() {
  return ajax.apply(this, arguments);
};
```

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.23.3...v0.24.0)

## v0.23.3 - March 23rd, 2015
- react-mixin-manager 0.13.0 -> 0.13.1 - 8d00da2


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.23.2...v0.23.3)

## v0.23.2 - March 20th, 2015
Optimize model/collection cache usage


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.23.1...v0.23.2)

## v0.23.1 - March 20th, 2015
- optimizations - 5cb4f6a
- remove setModel/setCollection - 6308926

Compatibility notes:
This should really be a minor release but I just did one yesterday and it hasn't touched too many people - and no one should really be using setModel/setCollection methods.

Using setModel will override any property change (because it sets to state).  Because of this, I want to be more explicit about what is happening.  You can still do this but you must use getInitialState instead

```
    getInitialState: function() {
        return {
            model: myModel
        }
    }
```

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.23.0...v0.23.1)

## v0.23.0 - March 19th, 2015
- ensure models/collections from state have correct event bindings - 06c6b28
- prevent loading state updates on collections from sub-model XHR activity - 158e48c
- (optimization) prevent setState call with 2nd concurrent XHR event - beaec7f
- backbone-xhr-events 0.11.2 -> 0.12.0 - 430e78e


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.22.1...v0.23.0)

## v0.22.1 - March 17th, 2015
- bug fix: allow XHRAware mixin to be aware of current XHR activity during a model/collection property change - 77c8d27


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.22.0...v0.22.1)

## v0.22.0 - February 28th, 2015
- add modelFetch / collectionFetch mixin - 49a2f58
- remove ability to use "new" as modelAware parameter - e267711

The ```new``` ```modelAware/collectionAware``` special mixin parameter has been removed because, after second thought, this promotes using state for models which is an anti-pattern.

A ```modelFetch``` and 	```collectionFetch``` mixin has been added which will ensure that any bound models or collections will be fetched when the component is mounted (but they will not be fetch if they are already populated or currently fetching).

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.21.1...v0.22.0)

## v0.21.1 - February 22nd, 2015
- allow modelAware/collectionAware to create new models/collections - 18801d6

The following details are for the ```modelAware``` mixin but can also be applied to ```collectionAware```.

The ```new``` keyword can be used as the modelAware parameter if a new model should be created.  The model class must be provided as the ```Model``` component attribute.  The react component properties will be provided as the model constructor argument.

```javascript
    React.createClass({
      mixins: ['modelAware("new")'],
      Model: MyModelClass,

      render: function() {
        // model will be a new instance of MyModelClass
        var model = this.getModel();
      }
    }
    });
```

```new:fetch``` can be used instead of ```new``` to auto-fetch the model as well.  For example, the following code examples are functionally the same.

Without the ```new:fetch``` modelAware param

```javascript
    React.createClass({
      mixins: ['modelAware'],
      getInitialState: function() {
        var model = new MyModel(this.props);
        model.fetch();
        this.setModel(model);
        return null;
      }
    });
```

With the ```new:fetch``` modelAware param

```javascript
    React.createClass({
      mixins: ['modelAware("new:fetch")'],
      Model: MyModelClass
    });
```


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.21.0...v0.21.1)

## v0.21.0 - February 20th, 2015
- backbone-xhr-events -0.9.5 -> 0.11.2 - cecd748

See [backbone-xhr-events release notes](https://github.com/jhudson8/backbone-xhr-events/blob/master/release-notes.md) for more details but there are API changed if you are using the advanced XHR lifecycle binding (if you bind to any "xhr" events).  If you do not, no changes need to be made in your app


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.20.0...v0.21.0)

## v0.20.0 - February 15th, 2015
- react-mixin-manager 0.12.0 -> 0.13.0 & react-events 0.8.1 -> 0.9.0 - e99863d
- add react-mixin-manager 0.12.0 hard dependency notification - 5e9eddc

incorporate the latest namespece-related changes for react-mixin-manager and react-events.  There was a notable API change in react-mixin-manager which you can see with the react-mixin-manager/release-notes.md.  (basically the React.mixins.replace method was removed and React.mixins.add will always replace).

Getting close to a 1.0 release


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.19.0...v0.20.0)

## v0.19.0 - February 14th, 2015
- use "react-backbone" namespace - 9789aa1

You *must* upgrade to react-mixin-manager 0.12.0

Any mixin can be prefixed with "react-backbone".  This allows if reuse the react-backbone mixin names if desired.

For example
```
    mixins: ['react-backbone.modelAware']
```

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.18.2...v0.19.0)

## v0.18.2 - February 11th, 2015
This is not a bug fix release.  The only purpose of this release is to allow the tutorial links on the README will be correct in external references to this project.


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.18.1...v0.18.2)

## v0.18.1 - February 10th, 2015
- bump react-events 0.8.0 -> 0.8.1 - fdf4b09


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.18.0...v0.18.1)

## v0.18.0 - February 9th, 2015
- update dependencies - e1eb0dd

* react-mixin-manager 0.11.1 -> 0.11.2
* react-events 0.7.9 -> 0.8.0

Take a look at the [new tutorials](https://github.com/jhudson8/react-backbone/tree/master/tutorials) to help get the most out of react-backbone

- add the responsive design tutorial - ac983da
- add the forms tutorial - f5a4f4f
- add collection handling / XHR totirial - dabc288

- add the "validateField" 2 way binding option - aed43d9
- make the "modelInvalidAware" mixin to reset state when the model changes - 6d8ee5b

The bind input field can be the folling values

* ```true``` to initiate 2-way binding (when the input field is updated, the model will be updated to match)
* ```{validate: true}``` to validate the entire model when the field is updated
* ```{validateField: true}``` to validate *just* the updated field


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.17.2...v0.18.0)

## v0.17.2 - February 5th, 2015
- react-mixin-manager 0.10 -> 0.11 - 0bebe92

All react-backbone mixins use the deferUpdate mixin from react-mixin-manager.  deferUpdate has been updated to allow more explicit control of how long a forceRender is called after the component update request occurs.  The default is 0 which should be good in most situations because most changes that would cause an update from model events would be within the same event loop.  However, this provides additional global and component level options.

[See more details](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-mixin-manager/method/deferUpdate/deferUpdate?focus=outline)


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.17.1...v0.17.2)

## v0.17.1 - January 29th, 2015
- fix 2 way binding for composite RadioGroup component - 62f4c3c


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.17.0...v0.17.1)

## v0.17.0 - January 28th, 2015
- add 2 way input field binding (using the bind={true} option) - 476ef03

you can now use the ```bind``` attribute for any Backbone.input.* component to include 2-way binding support so the model will be updated as the input field is changed
```
  var Text = Backbone.input.Text;
  <Text name="foo" model={model} bind={true}/>
``

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.16.0...v0.17.0)

## v0.16.0 - December 30th, 2014
- add multiple model/collection bindings to a single component - 4aa9be5

Compatibility notes:
This is backwards compatible with the previous release but you can now have multiple managed models/collections for a single component.  This can be useful if you want to monitor model changes or listen for XHR activity for more than 1 model/collection (or if you just don't like using the "model/collection" property and want a more custom property name for each component).  See the docs for details but, an example is below

```
    React.createClass({
     // "modelChangeAware" will update the component when either the "foo" or "bar" models trigger a "change" event
      mixins: ['modelAware("foo", "bar")', 'modelChangeAware'],
      events: {
        'model:theEvent': function() {
          // will be executed when either the model assigned to the "foo" or the "bar" property triggers the "theEvent" event
        }
      }
    });
```

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.15.0...v0.16.0)

## v0.15.0 - December 12th, 2014
- null check on modelPopulate callback - 8362f80
- requre jquery as last factory param - 6db6460
- rename composite mixins to use a "backbone" prefix - 0f9fc42

Compatibility notes:
If you are using the input components (Backbone.input) you must add the jquery as an additional argument to the react-backbone method (see install instructions for details)
```
require('react-backbone')(React, Backbone, _, $);
```

The following mixin names have changed
"XHRAware" is now "backboneXHRAware"
"changeAware" is now "backboneChangeAware"
"loadOn" is now "backboneLoadOn"
"updateOn" is now "backboneUpdateOn"

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.14.3...v0.15.0)

## v0.14.3 - December 11th, 2014
- update dependencies (patch releases) - b2411a6
- code cleanup - 83dad97


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.14.2...v0.14.3)

## v0.14.2 - December 9th, 2014
- keep track of monitored xhr activity as state truthy value - 7bf735c
You will now have a truthy value for state.loading instead of a boolean.  This provides the ability to keep track of multiple simultaneous XHR requests (for example, a model fetch and collection fetch).  Previously, state.loading would have gone to false after the first fetch returned (even if the second was still active)

As long as you just comparing truthy values, no code changes are required.  Do this:
```
    if (this.state.loading) {
```
Do not do dhis
```
    if (this.state.loading === true) {
```

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.14.1...v0.14.2)

## v0.14.1 - December 7th, 2014
- add "XHRAware", "changeAware", "loadOn", "updateOn" mixins - 839061a

These are basically convienance mixins which include both the model and collection functionality


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.14.0...v0.14.1)

## v0.14.0 - December 6th, 2014
- add collection mixins - 543dc0b
   - collectionAware
   - collectionEvents
   - collectionChangeAware
   - collectionXHRAware
   - collectionLoadOn
   - collectionUpdateOn

- add declarative collections support
```
    events: {
      'collection:reset': 'onReset'
    }
```
- add "loadWhile" mixin (extracted from the loadWhile mixin that was previously in the "modelLoadOn" mixin)

A ReactComponent can now have both a bound model and/or a bound collection

Compatibility notes:
- collections are no longer supported using modelChangeAware: collectionChangeAware must be used instead
- "modelEventAware" mixin has been removed and "modelEvents" should be used in it's place


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.8...v0.14.0)

## v0.13.8 - December 4th, 2014
- sync "with-deps" - 0cba56f
- bug fix: modelIndexErrors - 94c146d


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.7...v0.13.8)

## v0.13.7 - December 4th, 2014
- include backbone-xhr-events bug fix (0.9.2) to "with-deps" script - 8cd4200


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.6...v0.13.7)

## v0.13.6 - December 4th, 2014
- fix modelPopulate to support population of nested components - fea3a35


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.5...v0.13.6)

## v0.13.5 - December 2nd, 2014
with-deps
- backbone-xhr-events 0.9.0 -> 0.9.1
- react-events 0.7.5 -> 0.7.6
- react-backbone 0.13.4 -> 0.13.5 - 674c06e

react-backbone
- add error detection to make debugging easier - 005644a
- rename modelEventAware mixin to modelEvents (modelEventAware is still useable... for now) - 24149cb
- update docs to reference the need for name and ref with input components - 91b66a0
- remove the "modelIndexErrors" mixin in favor of React.mixins.modelIndexErrors - ad960d1
- Add React.mixins.getModelKey helper method - 70c5475


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.4...v0.13.5)

## v0.13.4 - December 1st, 2014
- with-deps react-mixin-manager 0.9.1 -> 0.9.2; react-events 0.7.4 -> 0.7.5 - caf9317


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.3...v0.13.4)

## v0.13.3 - November 29th, 2014
No react-backbone updates... bringing react-events up to date (0.7.2 -> 0.7.4) in react-backbone-with-deps.js


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.2...v0.13.3)

## v0.13.2 - November 26th, 2014
- add additional file which includes all dependencies (not react, backbone) - 9e816ed
CommonJS
```
require('react-backbone/with-deps')(require('react'), require('backbone'), require('underscore'));
```
AMD
```
require(
  ['react', 'backbone', 'underscore', react-backbone/with-deps'],
  function(React, Backbone, underscore, reactBackbone) {
    reactBackbone(React, Backbone, _); 
});
```

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.1...v0.13.2)

## v0.13.1 - November 26th, 2014
- for AMD, you must execute the function with params (see README AMD install instructions) - 51adfbe
```
require(
  ['react', 'backbone', 'underscore', react-backbone'], function(React, Backbone, _, reactBackbone) {
  reactBackbone(React, Backbone, _); 
});
```
- The underscore impl must be provided to the CommonJS function (see README CommonJS install instructions)
```
require('react-backbone')(require('react'), require('backbone'), require('underscore'));
```


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.13.0...v0.13.1)

## v0.13.0 - November 25th, 2014
- remove support for "model[propKey]" declaritive event in favor of "prop[propKey]" react-events definition - 4ded30b
- use react-events "listen" mixin for modelOn/modelOnce/modelOff events - e88dc8f
- remove "listenTo" mixin (now part of "listen" react-events mixin) - 68bdfc8

Compatibility notes:
jhudson8/react-events is now a hard dependency (in addition to react-mixin-manager) for react-backbone as the "listenTo" functionality was moved to react-events named as the "listen" mixin
all references to declarative events like "model:someEvent" are fine but any specific prop key references like "model[foo]:someEvent" need to be changed to react-event prop bindings "prop:foo:someEvent"

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.12.1...v0.13.0)

## v0.12.1 - November 20th, 2014
- support react 0.12 (allow "name" prop to identify model key) - 8b0b693
- add error detection - e7b8834


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.12.0...v0.12.1)

## v0.12.0 - November 14th, 2014
- add additional method signatures for modelPopulate - e6c1c6c
- for modelPopulate, change getModelValue to just getValue and getUIModelValue to getDOMValue - e36d774
- remove "modelValueAware" mixin to use Backbone.input.getModel and Backbone.input.setModel instead - 906ac23

Compatibility notes:
this is *not* backwards compatible if you were using the "modelValueAware" mixin or referencing the "getModelValue" or "setModelValue" methos.
component.getModelValue is now referenced as Backbone.input.getModelValue(component) and the same with setModelValue
note: these methods are used to set a value that is on the model which is bound to a component

modelPopulate now references the "getValue" method to get the value which should be set on the model.  This used to be "getModelValue"
the Backbone.input components also now support getDOMValue which returns the actual form input value.  Usually "getValue" and "getDOMValue" are the same but they can be different in the case of a checkbox.

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.11.3...v0.12.0)

## v0.11.3 - November 11th, 2014
- add "listenTo" mixin - 3d2969c


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.11.2...v0.11.3)

## v0.11.2 - November 11th, 2014
- scoping bug fixes - f770b47
- check this.key and this.ref to support React 0.12 - 1295da8


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.11.1...v0.11.2)

## v0.11.1 - November 2nd, 2014
- add react-mixin-manager package keyword - 15f3f2e


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.11.0...v0.11.1)

## v0.11.0 - November 1st, 2014
- reference new backbone-xhr-events project instead of backbone-async-event
- change modelAsyncAware mixin name to modelXHRAware - 5825464

see new backbone-xhr-events project at https://github.com/jhudson8/backbone-xhr-events

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.10.2...v0.11.0)

## v0.10.2 - September 20th, 2014
- bug fix: setModel to set model in state rather than props - 5b2e91c
- getModel to use props.model or props.collection - c24093e
- gracefully handle state mutation for an unmounted component - 8af8d71

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.10.1...master)

## v0.10.1 - September 7th, 2014
- add "react-component" keyword - 3cabfa1

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.10.0...v0.10.1)

## v0.10.0 - July 27th, 2014
- add the "loadWhile" method to the "modelLoadOn" mixin - dfe7d7e

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.9.0...v0.10.0)

## v0.9.0 - July 20th, 2014
- add low level backbone aware input components (Text, TextArea, CheckBox, Select, RadioGroup) - 6da1970

## v0.8.0 - July 19th, 2014
- support mixin parameters for "modelValueAware" - efea304
- support mixin parameters for "modelLoadOn" in addition to the "loadOn" property - 0db26d6
- support mixin parameters for "modelUpdateOn" and remove the updateOnModelEvent method - d8b246b, 36c2dfc

Compatibility notes:
* note that the updateOnModelEvent method has been removed in favor of mixin parameters for "modelLoadOn"
* note that the react-mixin-manager dependency version has changed


[Commits](https://github.com/jhudson8/react-backbone/compare/v0.7.1...v0.8.0)

## v0.7.1 - July 18th, 2014
- ensure this.state exists before binding/undinding model events - 6e41527

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.7.0...v0.7.1)

## v0.7.0 - July 18th, 2014
- bind "this" as context for modelPopulate callback - 505baa8
- modelPopulate queries component values using getUIValue rather than getModelValue - 2d88c99

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.6.3...v0.7.0)

## v0.6.3 - June 17th, 2014
- fix bower.json - 8320142
- update dependencies docs - 5c9a6c1
- update docs - 618afca

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.6.2...v0.6.3)

## v0.6.2 - June 16th, 2014
- add non-default mode support for declarative event bindings (with react-events) but standard behavior still works
    you can now provide prop/ref key name with "model[keyName]:eventName": "handlerMethod" - 81844a1
- add bower.json - 5442f8e

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.6.1...v0.6.2)

## v0.6.1 - June 14th, 2014
- use deferUpdate (react-mixin-manager >= 0.5.0) instead of forceUpdate This allows for a reset which will fire an add event for every model in a collection and then a reset event (all will call deferUpdate) but will only execute a forceUpdate 1 time. - 22522e1

Compatibility notes:
This requires an update of react-mixin-manager to >= 0.5.0.  It really shouldn't be a patch release but I just made a release yesterday and I do not think it has been downloaded.

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.6.0...v0.6.1)

## v0.6.0 - June 13th, 2014
- add the "modelPopulate" mixin - 9cd2ae7

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.5.0...v0.6.0)

## v0.5.0 - June 12th, 2014
- standardize mixin names  - 4d18967
    modelAccessor -> modelAware
    modelValueAccessor -> modelValueAware 
    modelEventBinder -> modelEventAware 
    modelInvalidBinder -> modelInvalidAware 
    modelChangeListener -> modelChangeAware 
    modelAsyncListener -> modelAsyncAware

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.4.1...v0.5.0)

## v0.4.1 - June 12th, 2014
- add react-events specials implentations (memoize, delay, defer, throttle, debounce, once) - fe4be7a

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.4.0...v0.4.1)

## v0.4.0 - June 4th, 2014
- add the "modelValidator" mixin - 7da404a
- rename "modelFieldValidator" mixin to "modelInvalidBinder" - 1a4ad9b

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.3.1...v0.4.0)

## v0.3.1 - June 4th, 2014
- use key *or* ref attribute to obtain context model keys - 3aed887

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.3.0...v0.3.1)

## v0.3.0 - May 22nd, 2014
- bug fix: only execute modelLoadOn mixin state change if we are still mounted - e860bc6
- add collection reset note to README for modelChangeListener mixing - 62d1bf1
- update README - 7c2df8f
- jshint optimization - 992fadb
- always provide a default initial state to any mixin that potentially modifies state - 91c6f51
- add "updateOnModelEvent" method to the modelUpdateOn mixin - d427678
- always use this.props.model when setting model (instead of just this.model) - 3843a44
- move model event registration cache to "this.state" instead of just "this" - 83338dd, 6dc1164

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.2.0...v0.3.0)

## v0.2.0 - May 18th, 2014
- integrate nicely with https://github.com/jhudson8/react-events add "events" handler for "model:eventName" - a2a5105
- add modelUpdateOn mixing - 59f1c78
- add modelIndexErrors mixin - bf689c3
- add modelFieldValidator mixin - e40b239
- allow the loadOn attribute (for modelLoadOn mixing) to be either a string or an array of strings - 5588e49
- bug fix: only modify state if mounted - 717a8d1
- required Backbone to be provided with commonJS - ce05ffd
- fix author email address - 19f7a52
- add modelValueAccessor mixin - 8a1c630

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.1.2...v0.2.0)

## v0.1.2 - May 10th, 2014
- change mixin names to ensure all begin with "model" for consistency - 1e9b978
- react-mixin-dependencies -> react-mixin-manager - a806dec
- change mixin references - 02cc313
- move some dependencies to devDependencies - f981850

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.1.1...v0.1.2)

## v0.1.1 - May 10th, 2014
- use single file for browser/commonjs/amd and provide React impl for commonjs initializer - 4cb85e2
- small README changes - ef79742
- added dependency listings - 2bbcaa0
- added example link - 531d9dd
- update README - 369f506
- initial commit - 89b0462

[Commits](https://github.com/jhudson8/react-backbone/compare/16c85f9...v0.1.1)
