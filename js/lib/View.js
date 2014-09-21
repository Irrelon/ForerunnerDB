// Import external names locally
var Shared,
	Core,
	Collection,
	CollectionInit,
	CoreInit,
	Overload;

Shared = require('./Shared');

/**
 * The view constructor.
 * @param viewName
 * @constructor
 */
var View = function (name, query, options) {
	this.init.apply(this, arguments);
};

View.prototype.init = function (name, query, options) {
	this._name = name;
	this._collections = [];
	this._groups = [];
	this._listeners = {};
	this._querySettings = {
		query: query,
		options: options
	};
	this._debug = {};

	this._privateData = new Collection('__FDB__view_privateData_' + this._name);
};

Shared.addModule('View', View);
Shared.inherit(View.prototype, Shared.chainSystem);

Collection = require('./Collection');
CollectionGroup = require('./CollectionGroup');
Overload = require('./Overload');
CollectionInit = Collection.prototype.init;
Core = Shared.modules.Core;
CoreInit = Core.prototype.init;

View.prototype.debug = new Overload([
	function () {
		return this._debug.all;
	},

	function (val) {
		if (val !== undefined) {
			if (typeof val === 'boolean') {
				this._debug.all = val;
				this.privateData().debug(val);
				this.publicData().debug(val);
				return this;
			} else {
				return this._debug.all;
			}
		}

		return this._debug.all;
	},

	function (type, val) {
		if (type !== undefined) {
			if (val !== undefined) {
				this._debug[type] = val;
				this.privateData().debug(type, val);
				this.publicData().debug(type, val);
				return this;
			}

			return this._debug[type];
		}

		return this._debug.all;
	}
]);

View.prototype.name = function (val) {
	if (val !== undefined) {
		this._name = val;
		return this;
	}

	return this._name;
};

/**
 * Queries the view data. See Collection.find() for more information.
 * @returns {*}
 */
View.prototype.find = function (query, options) {
	return this.publicData().find(query, options);
};

/**
 * Inserts into view data via the view collection. See Collection.insert() for more information.
 * @returns {*}
 */
View.prototype.setData = function (data, oldData) {
	// Decouple the data to ensure we are working with our own copy
	data = this._privateData.decouple(data);

	// Modify transform data
	this._transformSetData(data);

	if (this.debug()) {
		console.log('ForerunnerDB.View: Setting data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
	}

	return this._privateData.setData(data);
};


/**
 * Inserts into view data via the view collection. See Collection.insert() for more information.
 * @returns {*}
 */
View.prototype.insert = function (data, index, callback) {
	// Decouple the data to ensure we are working with our own copy
	data = this._privateData.decouple(data);

	if (typeof(index) === 'function') {
		callback = index;
		index = this._privateData.length;
	} else if (index === undefined) {
		index = this._privateData.length;
	}

	// Modify transform data
	this._transformInsert(data, index);

	if (this.debug()) {
		console.log('ForerunnerDB.View: Inserting some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
	}

	return this._privateData._insertHandle(data, index, callback);
};

/**
 * Updates into view data via the view collection. See Collection.update() for more information.
 * @returns {*}
 */
View.prototype.update = function (query, update) {
	// Modify transform data
	if (this.debug()) {
		console.log('ForerunnerDB.View: Updating some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
	}

	var updates = this._privateData.update(query, update),
		primaryKey,
		tQuery,
		item;

	if (this._transformEnabled && this._transformIn) {
		primaryKey = this._publicData.primaryKey();

		for (var i = 0; i < updates.length; i++) {
			tQuery = {};
			item = updates[i];
			tQuery[primaryKey] = item[primaryKey];

			this._transformUpdate(tQuery, item);
		}
	}

	return updates;
};

/**
 * Removed from view data via the view collection. See Collection.remove() for more information.
 * @returns {*}
 */
View.prototype.remove = function (query) {
	// Modify transform data
	this._transformRemove(query);

	if (this.debug()) {
		console.log('ForerunnerDB.View: Removing some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
	}

	return this._privateData.remove(query);
};

View.prototype.link = function (outputTargetSelector, templateSelector) {
	var publicData = this.publicData();
	if (this.debug()) {
		console.log('ForerunnerDB.View: Setting up data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
	}
	return publicData.link(outputTargetSelector, templateSelector);
};

View.prototype.unlink = function (outputTargetSelector, templateSelector) {
	var publicData = this.publicData();
	if (this.debug()) {
		console.log('ForerunnerDB.View: Removing data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
	}
	return publicData.unlink(outputTargetSelector, templateSelector);
};

View.prototype.from = function (collection) {
	if (collection !== undefined) {
		if (typeof(collection) === 'string') {
			collection = this._db.collection(collection);
		}

		this._addCollection(collection);
	}

	return this;
};

View.prototype._addCollection = function (collection) {
	if (this._collections.indexOf(collection) === -1) {
		this._collections.push(collection);
		collection._addView(this);

		var collData = collection.find(this._querySettings.query, this._querySettings.options);

		this._transformPrimaryKey(collection.primaryKey());
		this._transformInsert(collData);

		this._privateData.primaryKey(collection.primaryKey());
		this._privateData.insert(collData);
	}
	return this;
};

View.prototype._removeCollection = function (collection) {
	var collectionIndex = this._collections.indexOf(collection);
	if (collectionIndex > -1) {
		this._collections.splice(collection, 1);
		collection._removeView(this);
		this._privateData.remove(collection.find(this._querySettings.query, this._querySettings.options));
	}

	return this;
};

View.prototype.on = function () {
	this._privateData.on.apply(this._privateData, arguments);
};

View.prototype.off = function () {
	this._privateData.off.apply(this._privateData, arguments);
};

View.prototype.emit = function () {
	this._privateData.emit.apply(this._privateData, arguments);
};

/**
 * Drops a view and all it's stored data from the database.
 * @returns {boolean} True on success, false on failure.
 */
View.prototype.drop = function () {
	if (this._collections && this._collections.length) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('ForerunnerDB.View: Dropping view ' + this._name);
		}

		this.emit('drop');

		// Loop collections and remove us from them
		var arrCount = this._collections.length;
		while (arrCount--) {
			this._removeCollection(this._collections[arrCount]);
		}

		// Drop the view's internal collection
		this._privateData.drop();

		return true;
	}

	return false;
};

/**
 * Gets / sets the DB the view is bound against. Automatically set
 * when the db.oldView(viewName) method is called.
 * @param db
 * @returns {*}
 */
View.prototype.db = function (db) {
	if (db !== undefined) {
		this._db = db;
		this.privateData().db(db);
		this.publicData().db(db);
		return this;
	}

	return this._db;
};

/**
 * Gets the primary key for this view from the assigned collection.
 * @returns {String}
 */
View.prototype.primaryKey = function () {
	return this._privateData.primaryKey();
};

/**
 * Gets / sets the query that the view uses to build it's data set.
 * @param {Object=} query
 * @param {Boolean=} options An options object.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 */
View.prototype.queryData = function (query, options, refresh) {
	if (query !== undefined) {
		this._querySettings.query = query;
	}

	if (options !== undefined) {
		this._querySettings.options = options;
	}

	if (query !== undefined || options !== undefined) {
		if (refresh === undefined || refresh === true) {
			this.refresh();
		}

		return this;
	}

	return this._querySettings;
};

/**
 * Add data to the existing query.
 * @param {Object} obj The data whose keys will be added to the existing
 * query object.
 * @param {Boolean} overwrite Whether or not to overwrite data that already
 * exists in the query object. Defaults to true.
 * @param {Boolean=} refresh Whether or not to refresh the view data set
 * once the operation is complete. Defaults to true.
 */
View.prototype.queryAdd = function (obj, overwrite, refresh) {
	var query = this._querySettings.query,
		i;

	if (obj !== undefined) {
		// Loop object properties and add to existing query
		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				if (query[i] === undefined || (query[i] !== undefined && overwrite)) {
					query[i] = obj[i];
				}
			}
		}
	}

	if (refresh === undefined || refresh === true) {
		this.refresh();
	}
};

/**
 * Remove data from the existing query.
 * @param {Object} obj The data whose keys will be removed from the existing
 * query object.
 * @param {Boolean=} refresh Whether or not to refresh the view data set
 * once the operation is complete. Defaults to true.
 */
View.prototype.queryRemove = function (obj, refresh) {
	var query = this._querySettings.query,
		i;

	if (obj !== undefined) {
		// Loop object properties and add to existing query
		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				delete query[i];
			}
		}
	}

	if (refresh === undefined || refresh === true) {
		this.refresh();
	}
};

/**
 * Gets / sets the query being used to generate the view data.
 * @param {Object=} query The query to set.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 */
View.prototype.query = function (query, refresh) {
	if (query !== undefined) {
		this._querySettings.query = query;

		if (refresh === undefined || refresh === true) {
			this.refresh();
		}
		return this;
	}

	return this._querySettings.query;
};

/**
 * Gets / sets the query options used when applying sorting etc to the
 * view data set.
 * @param {Object=} options An options object.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 */
View.prototype.queryOptions = function (options, refresh) {
	if (options !== undefined) {
		this._querySettings.options = options;
		if (options.decouple === undefined) { options.decouple = true; }

		if (refresh === undefined || refresh === true) {
			this.refresh();
		}
		return this;
	}

	return this._querySettings.options;
};

/**
 * Refreshes the view data such as ordering etc.
 */
View.prototype.refresh = function (force) {
	var sortedData,
		collection,
		pubData = this.publicData(),
		i;

	// Re-grab all the data for the view from the collections
	this._privateData.remove();
	pubData.remove();

	for (i = 0; i < this._collections.length; i++) {
		collection = this._collections[i];
		this._privateData.insert(collection.find(this._querySettings.query, this._querySettings.options));
	}

	sortedData = this._privateData.find({}, this._querySettings.options);

	if (pubData._linked) {
		// Update data and observers
		// TODO: Shouldn't this data get passed into a transformIn first?
		jQuery.observable(pubData._data).refresh(sortedData);
	} else {
		// Update the underlying data with the new sorted data
		this._privateData._data.length = 0;
		this._privateData._data = this._privateData._data.concat(sortedData);
	}

	return this;
};

/**
 * Returns the number of documents currently in the view.
 * @returns {Number}
 */
View.prototype.count = function () {
	return this._privateData && this._privateData._data ? this._privateData._data.length : 0;
};

/**
 * Takes an object with the keys "enabled", "dataIn" and "dataOut":
 * {
 * 	"enabled": true,
 * 	"dataIn": function (data) { return data; },
 * 	"dataOut": function (data) { return data; }
 * }
 * @param obj
 * @returns {*}
 */
View.prototype.transform = function (obj) {
	if (obj !== undefined) {
		if (typeof obj === "object") {
			if (obj.enabled !== undefined) {
				this._transformEnabled = obj.enabled;
			}

			if (obj.dataIn !== undefined) {
				this._transformIn = obj.dataIn;
			}

			if (obj.dataOut !== undefined) {
				this._transformOut = obj.dataOut;
			}
		} else {
			if (obj === false) {
				// Turn off transforms
				this._transformEnabled = false;
			} else {
				// Turn on transforms
				this._transformEnabled = true;
			}
		}

		// Update the transformed data object
		this._transformPrimaryKey(this.privateData().primaryKey());
		this._transformSetData(this.privateData().find());
		return this;
	}

	return {
		enabled: this._transformEnabled,
		dataIn: this._transformIn,
		dataOut: this._transformOut
	};
};

/**
 * Returns the non-transformed data the view holds.
 */
View.prototype.privateData = function () {
	return this._privateData;
};

/**
 * Returns a data object representing the public data this view
 * contains. This can change depending on if transforms are being
 * applied to the view or not.
 *
 * If no transforms are applied then the public data will be the
 * same as the private data the view holds. If transforms are
 * applied then the public data will contain the transformed version
 * of the private data.
 */
View.prototype.publicData = function () {
	if (this._transformEnabled) {
		return this._publicData;
	} else {
		return this._privateData;
	}
};

/**
 * Updates the public data object to match data from the private data object
 * by running private data through the dataIn method provided in
 * the transform() call.
 * @private
 */
View.prototype._transformSetData = function (data) {
	if (this._transformEnabled) {
		// Clear existing data
		this._publicData = new Collection('__FDB__view_publicData_' + this._name);
		this._publicData.db(this._privateData._db);
		this._publicData.transform({
			enabled: true,
			dataIn: this._transformIn,
			dataOut: this._transformOut
		});

		this._publicData.setData(data);
	}
};

View.prototype._transformInsert = function (data, index) {
	if (this._transformEnabled && this._publicData) {
		this._publicData.insert(data, index);
	}
};

View.prototype._transformUpdate = function (query, update) {
	if (this._transformEnabled && this._publicData) {
		this._publicData.update(query, update);
	}
};

View.prototype._transformRemove = function (query) {
	if (this._transformEnabled && this._publicData) {
		this._publicData.remove(query);
	}
};

View.prototype._transformPrimaryKey = function (key) {
	if (this._transformEnabled && this._publicData) {
		this._publicData.primaryKey(key);
	}
};

// Extend collection with view init
Collection.prototype.init = function () {
	this._views = [];
	CollectionInit.apply(this, arguments);
};

Collection.prototype.view = function (name, query, options) {
	var view = new View(name, query, options)
		.db(this._db)
		._addCollection(this);

	this._views = this._views || [];
	this._views.push(view);

	return view;
};

/**
 * Adds a view to the internal view lookup.
 * @param {View} view The view to add.
 * @returns {Collection}
 * @private
 */
Collection.prototype._addView = CollectionGroup.prototype._addView = function (view) {
	if (view !== undefined) {
		this._views.push(view);
	}

	return this;
};

/**
 * Removes a view from the internal view lookup.
 * @param {View} view The view to remove.
 * @returns {Collection}
 * @private
 */
Collection.prototype._removeView = CollectionGroup.prototype._removeView = function (view) {
	if (view !== undefined) {
		var index = this._views.indexOf(view);
		if (index > -1) {
			this._views.splice(index, 1);
		}
	}

	return this;
};

// Extend DB with views init
Core.prototype.init = function () {
	this._views = {};
	CoreInit.apply(this, arguments);
};

/**
 * Gets a view by it's name.
 * @param {String} viewName The name of the view to retrieve.
 * @returns {*}
 */
Core.prototype.view = function (viewName) {
	if (!this._views[viewName]) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('Core.View: Creating view ' + viewName);
		}
	}

	this._views[viewName] = this._views[viewName] || new View(viewName).db(this);
	return this._views[viewName];
};

/**
 * Determine if a view with the passed name already exists.
 * @param {String} viewName The name of the view to check for.
 * @returns {boolean}
 */
Core.prototype.viewExists = function (viewName) {
	return Boolean(this._views[viewName]);
};

/**
 * Returns an array of views the DB currently has.
 * @returns {Array} An array of objects containing details of each view
 * the database is currently managing.
 */
Core.prototype.views = function () {
	var arr = [],
		i;

	for (i in this._views) {
		if (this._views.hasOwnProperty(i)) {
			arr.push({
				name: i,
				count: this._views[i].count()
			});
		}
	}

	return arr;
};

module.exports = View;