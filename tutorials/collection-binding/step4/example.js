// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
require('react-backbone');


// BACKBONE MODELS / COLLECTIONS

// simple model to parse github api repositories response
var Repositories = Backbone.Collection.extend({
  url: function() {
    return 'https://api.github.com/search/repositories?q=react&per_page=10&page=' + (this.page || 1);
  },
  // don't worry about paging data for this simple example
  parse: function(data) {
    return data.items;
  }
});


// REACT COMPONENTS

var RepositoryRow = React.createClass({
  render: function() {
    var model = this.props.model;

    return <tr><td>{model.get('full_name')}</td><td>{model.get('description')}</td></tr>;
  }
});

var RepositoriesView = React.createClass({
  mixins: ['collectionEvents'],

  events: {
    'collection:add': 'forceUpdate'
  },

  render: function() {
    var rows = this.props.collection.map(function(model) {
      return <RepositoryRow key={model.get('full_name')} model={model}/>;
    });

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
    collection.fetch();
  }
});


// START IT UP
var repositories = new Repositories();
repositories.fetch();
React.render(<RepositoriesView collection={repositories}/>, document.body);
