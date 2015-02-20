This is a progressive tutorial to get familiar with some of react-backbone collection handling mixins and functionality.

All mixins referenced have similar model-oriented siblings which can be used by replacing "collection" with "model".  For example "collectionChangeAware" to "modelChangeAware".

### Running the examples
The source code can be found for each step in this tutorial in the [current directory](./).  To run each example, download the code and ```cd``` into an individual step and run

```
  npm install
  webpack-dev-server
```

then browse to [http://localhost:8080](http://localhost:8080)


### Step 1: baseline

As a baseline, we'll create a small app that uses the [github API](https://developer.github.com/v3/) and displays repositories from github using the ```react``` search term but has no pagination and no react-backbone integration.

[view source](./step1/example.js)

Notice that we have to wait until the collection has finished fetching before we render because the react component will not know that it needs to re-render if the collection changes after the component renders.


### Step 2: add pagination

[view source](./step2/example.js)

Update the Collection URL to support pagination attributes

```javascript
    url: function() {
      return 'https://api.github.com/search/repositories?q=react&per_page=10&page=' + (this.page || 1);
    },
```

Update the repositories view to show page navigation

```javascript
        ...
        return (
          <div>
            <table><tr><th>name</th><th>description</th></tr>{rows}</table>
            <button onClick={this.nextPage} type="button">Next Page</button>
          </div>
        );
      },

      nextPage: function() {
        var collection = this.props.collection,
            currentPage = collection.page || 1;
        collection.page = currentPage + 1;

        var self = this;
        collection.fetch({
          success: function() {
            self.forceUpdate();
          }
        })
      }
```

Notice how we have to manually call ```forceUpdate``` after we fetch the next/previous page.


### Step 3: react-backbone event bindings

[view source](./step3/example.js)

We will incrementally make thigs better with ```react-backbone``` while demonstrating different usages.

Use the [collectionEvents mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionEvents?focus=outline) with the [collectionOn function](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/method/collectionEvents/collectionOn?focus=outline) to bind to the ```add``` collection event to force a render.

```javascript
    var RepositoriesView = React.createClass({
      mixins: ['collectionEvents'],

      getInitialState: function() {
        var self = this;
        this.collectionOn('add', function() {
          this.forceUpdate();
        });
        return null;
      },
      ...
```

We don't need to wait for the collection to fully fetch before rendering so that code now looks like

```javascript
    goToPage: function(increment) {
      var collection = this.props.collection,
          currentPage = collection.page || 1;
      collection.page = Math.max(currentPage + increment, 1);
      collection.fetch();
    }
```

And when we start the app, remove the success handler and just render synchronously.

```javascript
    var repositories = new Repositories();
    repositories.fetch();
    React.render(<RepositoriesView collection={repositories}/>, document.body);
```


### Step 4: Use declarative events

[view source](./step4/example.js)

Instead of binding to the ```add``` event in ```getInitialState``` we could just take adavantage of [model](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelEvents?focus=outline) / [collection](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionEvents?focus=outline) event declarations.

Remove the ```getInitialState``` code and add the ```events``` object.

```javascript
    var RepositoriesView = React.createClass({
      mixins: ['collectionEvents'],

      events: {
        'collection:add': 'forceUpdate'
      },
      ...
```


### Step 5: Use the collectionChangeAware mixin

[view source](./step5/example.js)

But wait, this could be even easier... just include the [collectionChangeAware mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionChangeAware?focus=outline) instead of the [collectionEvents mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionEvents?focus=outline) to automatically render the component when the collection changes.  (note: you will still have [collectionEvents mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionEvents?focus=outline) functions available because it is a dependency of the [collectionChangeAware mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionChangeAware?focus=outline).


```javascript
    var RepositoriesView = React.createClass({
      mixins: ['collectionChangeAware'],
      ...
```

And remove the ```events``` object that we added in the previous step.


### Step 6: Show a loading indicator while fetching

[view source](./step6/example.js)

We can use the [collectionXHRAware mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionXHRAware?focus=outline) which will set ```state.loading``` to a truthy value when any collection bound to the component is performing any XHR activity ([by listening to enhanced XHR events](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/bundle/jhudson8/backbone-xhr-events?focus=outline)).

Add the [collectionXHRAware mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionXHRAware?focus=outline) and use the ```state.loading``` attribute when rendering

```javascript
    var RepositoriesView = React.createClass({
      mixins: ['collectionChangeAware', 'collectionXHRAware'],

      render: function() {
        if (this.state.loading) {
          return 'Loading...';
        }
        ...
```

The [github API](https://developer.github.com/v3/) is pretty fast but if you watch closely you'll be able to see the loading indicator.


### Step 7: Add similated latency

In order to easily view the loading indicator, we will use [advanced XHR lifecycle events](https://github.com/jhudson8/backbone-xhr-events) to add a simulated 1 second network delay.

The following code which we will add to the top of the file (but could be anywhere) will listen for XHR activity of *any* model, cancel the original response so we can push the same response 1 second later.

```
    // Backbone.xhrEvents is a global event emitter for XHR activity
    // the "xhr" event is triggered when Backbone.sync is executed (any model/colleciton XHR activity)
    Backbone.xhrEvents.on('xhr', function(context) {

      // now, bind to the "after-send" event of this specific XHR request lifecycle
      context.on('after-send', function(p1, p2, p3, responseType) {

        // after the response has been returned, prevent the default operation so the success handler isn't called
        // handler (context.preventDefault return value) has error/success/compelete methods to simulate any scenario
        var handler = context.preventDefault();

        if (responseType === 'success') {
          setTimeout(function() {

            // after a 1 second delay, simulate the exact same success response that we got a second ago
            var successOrErrorMethod = handler.success(p1, p2, p3);
          }, 1000);
        }
      });
    });
```


### Step 8: Change collection property name

[view source](./step7/example.js)

By default, you must use the ```collection``` or ```model``` property name if you want proper binding support but you can change that to use a different property name or even support multiple collection/model bindings to a single react component.

All collection mixins depend on the [collectionAware mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionAware?focus=outline) (and all model mixins depend on the [modelAware mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/modelAware?focus=outline)).

We can use [mixin parameters](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/bundle/jhudson8/react-mixin-manager/section/Advanced%20Features/Mixins%20With%20Parameters?focus=outline) of the [collectionAware mixin](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/snippet/package/collectionAware?focus=outline) to override the supported property name from ```collection``` to ```repositories```

```javascript
    mixins: ['collectionAware("repositories")', 'collectionChangeAware', 'collectionXHRAware'],
```

And change all references from ```props.collection``` to ```props.repositories```

```javascript
    React.render(<RepositoriesView repositories={repositories}/>, document.body);
    ...
```

There are more to replace out... above is an example of a single replacement.


### All done

All done but there is so much more you can do.  Check out some of the [other mixins](http://jhudson8.github.io/fancydocs/index.html#project/jhudson8/react-backbone/api/Mixins?focus=outline).
