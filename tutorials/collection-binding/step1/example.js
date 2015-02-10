// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);


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

    return <table><tr><th>name</th><th>description</th></tr>{rows}</table>;
  }
});


// START IT UP
var repositories = new Repositories();
repositories.fetch({
  success: function() {
    React.render(<RepositoriesView collection={repositories}/>, document.body);
  }
});
