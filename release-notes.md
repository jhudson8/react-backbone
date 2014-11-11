# Release Notes

## Development

[Commits](https://github.com/jhudson8/react-backbone/compare/v0.11.2...master)

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
