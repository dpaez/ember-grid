App.Router.map(function(){

  this.route('search', {path:'/search/:data'});

});

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

App.SearchRoute = Ember.Route.extend({
  queryParams:['data'],
  model: function ( params ) {
    var data = params.data || {};
    return JSON.parse(data);
    //return this.store.findQuery('person', data);
  },
  /*serialize: function( params ){
    return {'name': params.name, 'age': params.age};
  },*/
  setupController: function (controller, model) {
    var query = model.data || {};
    var doneFn = function( result ){
      this.controller.set( 'content', result );
    };
    // TODO: check this -> Ember.$.getJSON
    console.log(query);
    this.store.find('person', {query: query}).then( doneFn );
    // controller.set('initialOffset', 0); // optional, set offset, for server-side pagination
    // controller.set('meta', this.store.metadataFor('person'));  // optional, set metadata
  },
  renderTemplate: function(){
    this.render('application', {outlet:'outlet'});
  }
});

App.IndexController = GRID.TableController.extend({
  offset: null,
  page: 0,
  limit: 10,
  modelType: 'person',  // TODO: make it optional or get it from somewhere else.
  //pageRouteName: '',
  //pageSearchName: '',
  toolbar: [
    GRID.ColumnSelector,
    GRID.Filter,
    GRID.ColumnServerSearch
  ],

  columns: [
  GRID.column('name', { display: 'always', search:true, placeholder:'Buscar por Nombre...' }),
  GRID.column('age', {search: true})
  ],
  actions:{
    updateContent: function( data ){
      this.set( 'content', data );
      this.set( 'meta', data.meta );
    }
  }

});

App.IndexView = GRID.TableView.extend();

Handlebars.registerHelper('equal', function(lvalue, rvalue, options) {
    if (arguments.length < 3)
        throw new Error("Handlebars Helper equal needs 2 parameters");
    if( lvalue!=rvalue ) {
        return options.inverse(this);
    } else {
        return options.fn(this);
    }
});