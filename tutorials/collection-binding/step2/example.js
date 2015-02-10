// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


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

    return <tr><td>{model.get('full_name')}</td><td>{model.get('description')}</td></tr>
  }
});

var RepositoriesView = React.createClass({
  render: function() {
    var rows = this.props.collection.map(function(model) {
      return <RepositoryRow model={model}/>
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

    var self = this;
    collection.fetch({
      success: function() {
        self.forceUpdate();
      }
    })
  }
});


// START IT UP
var repositories = new Repositories();
repositories.fetch({
  success: function() {
    React.render(<RepositoriesView collection={repositories}/>, document.body);
  }
});
