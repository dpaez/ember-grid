App.IndexRoute = Ember.Route.extend({
  model: function () {
    return this.store.find('person');
  },
  setupController: function (controller, model) {
    controller.set('content', model);
    // controller.set('initialOffset', 0); // optional, set offset, for server-side pagination
    // controller.set('meta', this.store.metadataFor('person'));  // optional, set metadata
  }
});

App.IndexController = GRID.TableController.extend({
  offset: null,
  page: 0,
  limit: 10,
  modelType: 'person',  // TODO: make it optional or get it from somewhere else.
  //pageRouteName: ''
  toolbar: [
    GRID.ColumnSelector,
    GRID.Filter
  ],

  columns: [
  GRID.column('name', { display: 'always' }),
  GRID.column('age')
  ],
  actions:{
    updateContent: function( data ){
      this.set( 'content', data );
      this.set( 'meta', data.meta );
    }
  }

});

App.IndexView = GRID.TableView.extend();
