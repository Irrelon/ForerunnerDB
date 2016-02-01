"use strict";

var Shared,
	Overload,
	Db,
	Collection,
	View2;

Shared = require('./Shared');
Overload = Shared.overload;
Db = Shared.modules.Db;

/**
 * Creates a new view instance.
 * @param {String} name The name of the view.
 * @param {Object=} query The view's query.
 * @param {Object=} options An options object.
 * @constructor
 */
View2 = function (name, query, options) {
	this.init.apply(this, arguments);
};

// Tell ForerunnerDB about our new module
Shared.addModule('View2', View2);

// Mixin some commonly used methods
Shared.mixin(View2.prototype, 'Mixin.Common');
Shared.mixin(View2.prototype, 'Mixin.ChainReactor');
Shared.mixin(View2.prototype, 'Mixin.Constants');
Shared.mixin(View2.prototype, 'Mixin.Events');

// Grab the collection module for use later
Collection = Shared.modules.Collection;

View2.prototype.init = function (name, query, options) {
	var self = this;

	// Set the view's name
	self.name(name);

	// Set the view query
	self.query(query);

	// Holds references to the reactor IO nodes that are connected
	// to this view from dependant data sources such as the "from"
	// and any joined sources in the active query
	self._io = {};

	// Wait for the db to be assigned before creating the internal
	// collections
	self.on('dbSet', function () {
		// Holds the view's un-transformed data that is filled from it's
		// "from" data source. This data also holds a reference to the
		// view's viewData collection via a primary key mapping
		// "_viewDataId". So if you want to find a document on the view
		// data and you only have the primary key of the source data you
		// can look up the source data document and then read it's
		// _viewDataId then lookup the id from the viewData collection
		// to get the view's actual data for the source primary key.
		// This is done so that transformations can take place on the view's
		// output data whilst queries coming from underlying data sources
		// will still match the data.
		self._sourceData = self.db().collection(self.name() + '_sourceData');
		self._viewData = self.db().collection(self.name() + '_viewData');
	});

	// Set the view's parent database
	if (options && options.db) {
		self.db(options.db);
	}
};

// Synthesize the getter/setter method "name()"
Shared.synthesize(View2.prototype, 'name');

View2.prototype.from = function (source, refresh) {
	var sourceObj;

	if (source !== undefined) {
		if (typeof source === 'string') {
			// Assume collection and grab it
			sourceObj = this._db.collection(source);
		} else {
			// Assume object and use it
			sourceObj = source;
		}

		// Check if we already have a data source
		if (this._from) {
			// Remove source dependency before creating new one
			this._io.from.drop();
			delete this._io.from;
			delete this._from;
		}

		// Assign the new from
		this._from = sourceObj;

		// Create a new reactor IO graph node that intercepts chain packets from the
		// view's "from" source and determines how they should be interpreted by
		// this view. If the view does not have a query then this reactor IO will
		// simply pass along the chain packet without modifying it.
		this._io = new ReactorIO(this._from, this, function (chainPacket) {

		});

		if (refresh || refresh === undefined) {
			this.refresh();
		}

		return this;
	}

	return this._from;
};

// Add a new method to the Collection module
View2.prototype.query = new Overload({
	'': function () {
		return this._query;
	},

	'object': function (query) {
		return this.$main.call(this, query, undefined, true);
	},

	'object, object': function (query, options) {
		return this.$main.call(this, query, options, true);
	},

	'object, boolean': function (query, refresh) {
		return this.$main.call(this, query, undefined, refresh);
	},

	'object, object, boolean': function (query, options, refresh) {
		return this.$main.call(this, query, options, refresh);
	},

	'$main': function (query, options, refresh) {
		this._queryData = this._queryData || {};
		this._queryData.query = query;

		if (options !== undefined) {
			this.queryOptions(options, false);
		}

		if (refresh) {
			this.refresh();
		}

		return this;
	}
});

View2.prototype.queryOptions = function (queryOptions, refresh) {
	if (queryOptions !== undefined) {
		this._queryData = this._queryData || {};
		this._queryData.options = queryOptions;

		if (refresh || refresh === undefined) {
			this.refresh();
		}
	}
};

View2.prototype.refresh = function () {

};

/**
 * Runs a query against the view's underlying data collection.
 * @returns {*}
 */
View2.prototype.find = function () {
	return this._viewData.find.apply(this._viewData, arguments);
};

Db.prototype.view = function (name) {
	if (name !== undefined) {
		var view;

		// Check for existing view by this name
		if (this._view && this._view[name]) {
			return this._view[name];
		}

		// Create the view
		this._view = this._view || {};
		this._view[name] = view = new View2(name, undefined, {db: this});

		this.emit('create', view, 'view', name);

		return view;
	}
};

/**
 * Gets / sets the name of the view.
 */
Shared.synthesize(View2.prototype, 'name');

/**
 * Gets / sets the view's parent database.
 */
View2.prototype.db = function (db) {
	if (db !== undefined) {
		this._db = db;
		this.emit('dbSet');

		return this;
	}

	return this._db;
};

// Tell ForerunnerDB that our module has finished loading
Shared.finishModule('View2');
module.exports = View2;