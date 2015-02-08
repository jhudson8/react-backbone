This is a simple progressive tutorial to get familiar with some of react-backbone collection handling mixins and functionality.  All mixins referenced have similar model-oriented siblings which can be used by replacing "collection" with "model".  For example "collectionChangeAware" to "modelChangeAware".

The source code can be found for each step in this tutorial in the current directory.  To run each example, download the code and ```cd``` into an individual step and run
```
npm install
webpack-dev-server
```
the browse to [http://localhost:8080](http://localhost:8080)


### Step 1: baseline
As a baseline, we'll create a small app that has no paging, no react-backbone integration that displays repositories from github using the ```react``` search term.

```
// BACKBONE MODELS / COLLECTIONS

// simple model to parse github api repositories response
var Repositories = Backbone.Collection.extend({
  url: 'https://api.github.com/search/repositories?q=react',
  // don't worry about paging data for this simple example
  parse: function(data) {
    return data.items;
  }
});


// REACT COMPONENTS

var RepositoryRow = React.createClass({
  render: function() {
    var model = this.props.model;

    return <tr><td>{model.get('name')}</td><td>{model.get('description')}</td></tr>
  }
});

var RepositoriesView = React.createClass({
  render: function() {
    var rows = this.props.collection.map(function(model) {
      return <RepositoryRow model={model}/>
    });

    return <table><tr><th>name</th><th>description</th></tr>{rows}</table>
  }
});


// START IT UP
var repositories = new Repositories();
repositories.fetch({
  success: function() {
    React.render(<RepositoriesView collection={repositories}/>, document.body);
  }
});
```

Notice that we have to wait until the collection has finished fetching before we render because the react component will not know that it needs to re-render if the collection changes after the component renders.


### Step 2: add paging

Update the Collection URL to support paging attributes
```
  url: function() {
    return 'https://api.github.com/search/repositories?q=react&per_page=10&page=' + (this.page || 1);
  },
```

Update the repositories view to show page navigation
```
...
    return (
    <div>
      <table><tr><th>name</th><th>description</th></tr>{rows}</table>
      <button onClick={this.nextPage} type="button">Next Page</button>
    </div>);
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

We will incrementally make thigs better with ```react-backbone``` while demonstrating different usages.

Use the ```collectionEvents``` mixin with the ```collectionOn``` method to bind to the ```reset``` collection event to force a render.

```
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

We don't need to wait for the collection to fully fetch before rendering the component anymore so remove that code.

```
  goToPage: function(increment) {
    var collection = this.props.collection,
        currentPage = collection.page || 1;
    collection.page = Math.max(currentPage + increment, 1);
    collection.fetch();
  }
```
and when we start the app
```
var repositories = new Repositories();
repositories.fetch();
React.render(<RepositoriesView collection={repositories}/>, document.body);
```


### Step 4: Use declarative events

Instead of binding to the ```add``` event in ```getInitialState``` we could just take adavantage of model/collection event declarations.

remove the getInitialState code and add the ```events``` hash
```
  events: {
    'collection:add': 'forceUpdate'
  }
```


### Step 5: Use the collectionChangeAware mixin

But wait, this could be even easier... just include the ```collectionChangeAware``` event instead of the ```collectionEvents``` mixin.  (note: you will still have ```collectionEvents``` mixin functions available because it is a dependency on the ```collectionChangeAware``` mixin).

remove the getInitialState code and add the ```events``` hash
```
  mixins: ['collectionChangeAware'],
```


### Step 6: Show a loading indicator while fetching

We can use the ```collectionXHRAware``` mixin to set the ```state.loading``` property when any collection bound to the component is fetching.

Add the ```collectionXHRAware``` mixin and use the ```state.loading``` attribute when rendering
```
var RepositoriesView = React.createClass({
  mixins: ['collectionChangeAware', 'collectionXHRAware'],
  render: function() {
    if (this.state.loading) {
      return 'Loading...';
    }
    ...
```
The githum API is pretty fast but if you watch closely you'll be able to see the loading indicator.

