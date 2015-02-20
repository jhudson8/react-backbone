// initialize react-backbone
var React = require('react');
var Backbone = require('backbone');
var _ = require('underscore');
var $ = require('jquery');
require('react-backbone/with-deps')(React, Backbone, _, $);

// SIMULATED LATENCY
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
  mixins: ['collectionAware("repositories")', 'collectionChangeAware', 'collectionXHRAware'],

  render: function() {
    if (this.state.loading) {
      return <div>'Loading...'</div>;
    }

    var rows = this.props.repositories.map(function(model) {
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
    var repositories = this.props.repositories,
        currentPage = repositories.page || 1;
    repositories.page = currentPage + 1;
    repositories.fetch();
  }
});


// START IT UP
var repositories = new Repositories();
repositories.fetch();
React.render(<RepositoriesView repositories={repositories}/>, document.body);
