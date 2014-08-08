window.GRID = Ember.Namespace.create();

GRID.QueryMixin = Ember.Mixin.create({
  query: '',

  queryProperties: [],

  filterableContentBinding: 'content',

  filteredContent: function () {
    var query = this.get('query');
    if (!query) return this;
    var qProps = this.get('queryProperties');
    return this.get('filterableContent').filter(function (row, index) {
      var props = row.getProperties(qProps);
      for (var prop in props) {
        if (props[prop] && props[prop].toString().indexOf(query) >= 0) {
          return true;
        }
      }
      return false;
    });
  }.property('query', 'queryProperties', 'filterableContent')
});

GRID.PaginatedMixin = Ember.Mixin.create({
  page: 0,
  limit: 15,
  pageRouteName: false,
  paginableContentBinding: 'content',

  total: Ember.computed(function () {
    var totalValue = 0;
    if ( this.store.metadataFor && this.modelType && this.store.metadataFor( this.modelType ).total ){
      totalValue = this.store.metadataFor( this.modelType ).total;
    }else{
      totalValue = this.get('paginableContent.length');
    }
    return totalValue;
  }).property('paginableContent.length'),

  offset: Ember.computed(function () {
    return this.get('page') * this.get('limit');
  }).property('page', 'limit'),

  paginatedContent: Ember.computed(function () {
    if (this.get('page') >= this.get('pages')) {
      this.set('page', 0);
    }
    return this.get('paginableContent').slice(this.get('offset'), this.get('offset') + this.get('limit'));

  }).property('@each', 'page', 'limit', 'paginableContent'),

  pages: Ember.computed(function () {
    return Math.ceil(this.get('total') / this.get('limit'));
  }).property('total', 'limit'),

  getOffset: function(){
    return this.get('page') * this.get('limit');
  },

  setPage: function ( offset ) {
    console.log('setting page: ',  offset);
    this.set('page', offset);
    if (this.get('pageRouteName')){
      this.transitionToRoute(this.get('pageRouteName'), {'offset': this.getOffset()});
    }
  },

  firstPage: function () {
    this.set('page', 0);
    if (this.get('pageRouteName')){
      this.transitionToRoute(this.get('pageRouteName'), {'offset': this.getOffset()});
    }
  },

  previousPage: function () {
    this.set('page', Math.max( this.get('page') - 1, 0 ));
    if (this.get('pageRouteName')){
      this.transitionToRoute(this.get('pageRouteName'), {'offset': this.getOffset()});
    }
  },

  nextPage: function () {
    this.set('page', Math.min( this.get('page') + 1, this.get('pages') - 1 ));
    if (this.get('pageRouteName')){
      this.transitionToRoute(this.get('pageRouteName'), {'offset': this.getOffset()});
    }
  },

  lastPage: function () {
    this.set('page', this.get('pages') - 1);
    if (this.get('pageRouteName')){
      this.transitionToRoute(this.get('pageRouteName'), {'offset': this.getOffset()});
    }
  }

});

GRID.TableController = Ember.ArrayProxy.extend(Ember.ControllerMixin, Ember.SortableMixin, GRID.QueryMixin, GRID.PaginatedMixin, {

  columns: [],

  paginableContentBinding: 'filteredContent',

  rowsBinding: 'paginatedContent',

  pageSearchName: 'search',

  queryProperties: function () {
    if (!this.get('visibleColumns')) return [];
    return this.get('visibleColumns').mapProperty('property');
  }.property('visibleColumns'),

  visibleColumns: function () {
    return this.get('columns').filterProperty('visible', true);
  }.property('columns.@each.visible'),

  toolbar: [],

  sortBy: function (property) {
    var props = this.get('sortProperties');
    if (!props) {
      this.set('sortProperties', [property]);
      this.set('sortAscending', true);
    } else if (props.get('firstObject') == property) {
      this.set('sortAscending', !this.get('sortAscending'));
    } else {
      props = props.without(property);
      props.insertAt(0, property);
      this.set('sortProperties', props);
      this.set('sortAscending', true);
    }
  }

});

// COLUMN DEFINITION

GRID.Column = Ember.Object.extend({
  property: null,

  header: function () {
    if (!this.get('property')) return '';
    return this.get('property').capitalize();
  }.property('property'),

  display: true,
  visible: function () {
    return this.get('display') !== false;
  }.property('display'),

  always: function () {
    return this.get('display') === 'always';
  }.property('display'),

  label: true,
  labelable: function(){
    return this.get('label') !== false;
  }.property('label'),

  placeholder: '',
  placeholderVal: function(){
    return this.get('placeholder');
  }.property('placeholder'),

  search: false,
  searchable: function(){
    return this.get('search') !== false;
  }.property('search'),

  formatter: '{{view.content.%@}}',
  viewClass: function () {
    var formatter = this.get('formatter');
    if (GRID.CellView.detect(formatter)) {
      return formatter;
    } else {
      Ember.assert('Formatter has to be extended CellView or Handlebar template', Ember.typeOf(formatter) === 'string');
      var property = this.get('property');
      if (!property) {
        property = 'constructor';
      }
      var template = this.get('formatter').fmt(property);
      return GRID.CellView.extend({
        template: Ember.Handlebars.compile(template)
      });
    }
  }.property()
});

GRID.column = function (property, options) {
  if (Ember.typeOf(property) === 'object') {
    options = property;
    property = null;
  }
  var column = GRID.Column.create({
    property: property
  });
  if (options) {
    for (var key in options) {
      column.set(key, options[key]);
    }
  }
  return column;
};

// VIEWS

GRID.TableView = Ember.View.extend({
  classNames: ['ember-grid'],
  defaultTemplate: Ember.Handlebars.compile('{{view GRID.ToolbarView}}{{view GRID.InnerTableView}}{{view GRID.FooterView}}')
});

GRID.ToolbarView = Ember.ContainerView.extend({
  classNames: ['table-toolbar'],
  classNameBindings: ['childViews.length::hide'],
  childViewsBinding: 'controller.toolbar'
});

GRID.InnerTableView = Ember.View.extend({
  tagName: 'table',
  classNames: ['table', 'table-condensed'],
  attributeBindings: ['style'],
  style: 'margin: 0;',
  defaultTemplate: Ember.Handlebars.compile('<thead>{{view GRID.HeaderView}}</thead>{{view GRID.BodyView}}')
});

GRID.HeaderView = Ember.CollectionView.extend({
  tagName: 'tr',
  contentBinding: 'controller.visibleColumns',
  classNames: ['table-header'],
  itemViewClass: Ember.View.extend({
    tagName: 'th',
    template: Ember.Handlebars.compile('{{view.content.header}}<span></span>'),
    classNames: ['table-header-cell'],

    classNameBindings: ['sort'],
    sort: function () {
      if (this.get('controller.sortProperties.firstObject') == this.get('content.property')) {
        return this.get('controller.sortAscending') ? 'sort-asc' : 'sort-desc';
      }
    }.property('controller.sortProperties', 'controller.sortAscending'),

    click: function () {
      this.get('controller').sortBy(this.get('content.property'));
    }
  })
});

GRID.BodyView = Ember.CollectionView.extend({
  tagName: 'tbody',
  contentBinding: 'controller.rows',
  classNames: ['table-body'],
  itemViewClass: 'GRID.RowView',
  emptyView: Ember.View.extend({
    tagName: 'tr',
    template: Ember.Handlebars.compile('<td {{bindAttr colspan="controller.columns.length"}} class="muted">Nothing to display.</td>')
  }),
  didInsertElement: function(){
    if ( this.get('controller').on ){
      this.get('controller').on('deactivate', this, this.deactivate);
    }
  },
  deactivate: function(){
    this.$().find('.active').removeClass('active');
  },
});

GRID.RowView = Ember.ContainerView.extend({
  tagName: 'tr',
  classNames: ['table-row'],
  rowBinding: 'content',
  columnsBinding: 'controller.visibleColumns',

  columnsDidChange: function () {
    if (this.get('columns')) {
      this.clear();
      this.get('columns').forEach(function (column) {
        var cell = column.get('viewClass').create({
          column: column,
          content: this.get('row')
        });
        this.pushObject(cell);
      }, this);
    }
  }.observes('columns.@each'),

  click: function () {
    this.$().toggleClass('active');
    var model = this.get('row');
    if ( this.$().hasClass('active') ){
      model.set('active', true);
    }else{
      model.set('active', false);
    }
  },

  init: function () {
    this._super();
    this.columnsDidChange();
  }
});

GRID.CellView = Ember.View.extend({
  tagName: 'td'
});

// PAGINATION

GRID.FooterView = Ember.View.extend({
  classNames: ['table-footer'],
  defaultTemplate: Ember.Handlebars.compile('{{view GRID.PageView}}{{view GRID.PaginationView}}')
});

GRID.PageListView = Ember.ContainerView.extend({

  tagName: 'ul',

  firstPageView: Ember.View.extend({
    tagName: 'li',
    classNameBindings: ['parentView.hasFirstPage::disabled'],
    template: Ember.Handlebars.compile('<a href="javascript:void(0);" {{action firstPage target="view.parentView"}}>&laquo;</a>')
  }),

  prevPageView: Ember.View.extend({
    tagName: 'li',
    classNameBindings: ['parentView.hasPrevPage::disabled'],
    template: Ember.Handlebars.compile('<a href="javascript:void(0);" {{action prevPage target="view.parentView"}}>&lsaquo;</a>')
  }),

  pageView: Ember.View.extend({
    tagName: 'li',
    classNameBindings: ['content.isActive:active'],
    template: Ember.Handlebars.compile('<a href="javascript:void(0);" {{action setPage view.content target="view.parentView"}}>{{view.content.page}}</a>')
  }),

  nextPageView: Ember.View.extend({
    tagName: 'li',
    classNameBindings: ['parentView.hasNextPage::disabled'],
    template: Ember.Handlebars.compile('<a href="javascript:void(0);" {{action nextPage target="view.parentView"}}>&rsaquo;</a>')
  }),

  lastPageView: Ember.View.extend({
    tagName: 'li',
    classNameBindings: ['parentView.hasLastPage::disabled'],
    template: Ember.Handlebars.compile('<a href="javascript:void(0);" {{action lastPage target="view.parentView"}}>&raquo;</a>')
  }),

  init: function () {
    this._super();
    this.refreshPageListItems();
    this.lastPageVisited = undefined;
  },

  refreshPageListItems: function () {
    var pages = this.get('pages');

    this.clear();
    this.pushObject(this.get('firstPageView').create());
    this.pushObject(this.get('prevPageView').create());
    var self = this;
    this.get('pages').forEach(function (page) {
      var pageView = self.get('pageView').create({
        content: page
      });
      self.pushObject(pageView);
    });
    this.pushObject(this.get('nextPageView').create());
    this.pushObject(this.get('lastPageView').create());
  }.observes('pages'),

  pages: [],

  visiblePages: 3,

  createPages: function () {
    if (!this.get('controller')) return [];
    var page = this.get('controller.page');
    var pages = this.get('controller.pages');
    var pagesFrom = Math.max(0, page - this.visiblePages);
    var pagesTo = Math.min(pages, page + this.visiblePages + 1);
    var limit = this.get('controller.limit');

    pages = [];
    for (var i = pagesFrom; i < pagesTo; i++) {
      pages.push({
        index: i,
        page: i + 1,
        isActive: (i == page)
      });
    }
    this.set('pages', pages);
  },

  didControllerContentChanged: function () {
    this.createPages();
    var pages = this.get('controller.pages');
    var page = this.get('controller.page');
    this.set('pagesCount', pages);
    this.set('hasNextPage', page + 1 < pages);
    this.set('hasPrevPage', page > 0);
    this.set('hasFirstPage', page > 0);
    this.set('hasLastPage', page + 1 < pages);
  }.observes('controller', 'controller.pages', 'controller.page'),

  setPage: function (context) {
    this.get('controller').set('page', context.index);
    this.get('controller').setPage( context.index );
  },

  firstPage: function () {
    if (!this.get('hasFirstPage')) return;

    this.get('controller').firstPage();
  },

  lastPage: function () {
    if (!this.get('hasLastPage')) return;

    this.get('controller').lastPage();
  },

  prevPage: function () {
    if (!this.get('hasPrevPage')) return;

    this.get('controller').previousPage();
  },

  nextPage: function () {
    if (!this.get('hasNextPage')) return;

    this.get('controller').nextPage();
  }
});

GRID.PaginationView = Ember.ContainerView.extend({
  tagName: 'div',
  classNames: ['pagination', 'pagination-small', 'pagination-right', 'table-pagination'],
  childViews: ['pageList'],
  pageList: function () {
    return GRID.PageListView.create();
  }.property()
});

GRID.PageView = Ember.View.extend({
  classNames: ['pull-left', 'table-page'],
  defaultTemplate: Ember.Handlebars.compile('{{#if view.first}}Mostrando {{view.first}} a {{view.last}} de {{view.amount}}{{/if}}'),
  init: function(){
    var page = this.get('controller.page');
    var limit = this.get('controller.limit');
    var length = this.get('controller.filteredContent.length');
    this.set('first', page * limit + 1);
    this.set('last', ((page * limit) + limit));
    this.set('amount', this.getWithDefault('controller.meta.total', length));
    if ( this.get('controller.initialOffset') ){
      var offPage = (this.get('controller.initialOffset') / 10);
      if ( (offPage !== this.lastPageVisited) && (offPage !== page) ){
        this.lastPageVisited = offPage;
        this.set('controller.page', offPage);
      }
    }
  },
  didPageChanged: function () {
    var page = this.get('controller.page');
    var limit = this.get('controller.limit');
    var length = this.get('controller.filteredContent.length');
    this.set('first', page * limit + 1);
    this.set('last', Math.min( page * limit + length, page * limit + limit ));
    this.set('amount', this.getWithDefault('controller.meta.total', length));
  }.observes('controller.page', 'controller.filteredContent.length')
});

// COMPONENTS

GRID.ColumnSelector = Ember.View.extend({
  classNames: ['btn-group'],
  defaultTemplate: Ember.Handlebars.compile(
    '<button class="btn dropdown-toggle" data-toggle="dropdown"><i class="icon-th-list"></i> <span class="caret"></span></button>' +
    '<ul class="dropdown-menu dropdown-column-selector">' +
    '{{#each columns}}' +
    '<li><label class="checkbox">{{view Ember.Checkbox checkedBinding="display" disabledBinding="always"}} {{header}}</label></li>' +
    '{{/each}}' +
    '</ul>'),
  click: function(){
    this.$().find('.dropdown-menu').toggleClass('enabled');
  }
});

GRID.Filter = Ember.View.extend({
  tagName: 'form',
  classNames: ['form-search', 'btn-group', 'table-filter'],
  defaultTemplate: Ember.Handlebars.compile('{{view Ember.TextField class="search-query input-medium" placeholder="Filtrar..." valueBinding="query"}}')
});

GRID.ColumnServerSearch = Ember.View.extend({
  tagName: 'form',
  classNames: ['form-search', 'server-filter'],
  defaultTemplate: Ember.Handlebars.compile(
    '{{#each columns}}' +
    '{{#if searchable }}' +
    '<span class="column-search-item">' +
    '{{#if labelable }} <label>{{header}}: {{/if}}' +
    '{{ view Ember.TextField name=header viewName=header valueBinding="content.data" classNames="column-search-control" placeholder=placeholderVal}} ' +
    '{{#if labelable }}</label>{{/if}}' +
    '</span>' +
    '{{/if}}' +
    '{{/each}}' +
    '<button class="btn btn-submit" name="column-server-search"> Buscar </button>'
  ),
  submit: function( event ){
    event.stopPropagation();
    event.preventDefault();
    var target = event.currentTarget || false;
    var elem;
    var req = {};
    if (!target) return false;
    //req.type = this.get('controller.modelType');
    for (var i=0; i<target.length-1; i++){
      elem = target[ i ];
      if ( elem && typeof elem.name === 'string' ){
        req[ elem.name.toLowerCase() ] = elem.value;
      }
    }

    this.get('controller').transitionToRoute(this.get('controller.pageSearchName'), { 'data': JSON.stringify(req) });

  }
});
