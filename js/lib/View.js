// Import external names locally
var Shared,
	Core,
	Collection,
	CollectionInit,
	CoreInit,
	ReactorIO;

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
Shared.inherit(View.prototype, Shared.chainReactor);

Collection = require('./Collection');
CollectionGroup = require('./CollectionGroup');
ReactorIO = require('./ReactorIO');
CollectionInit = Collection.prototype.init;
Core = Shared.modules.Core;
CoreInit = Core.prototype.init;

Shared.synthesize(View.prototype, 'name');

/**
 * Gets / sets debug flag that can enable debug message output to the
 * console if required.
 * @param {Boolean} val The value to set debug flag to.
 * @return {Boolean} True if enabled, false otherwise.
 */
/**
 * Sets debug flag for a particular type that can enable debug message
 * output to the console if required.
 * @param {String} type The name of the debug type to set flag for.
 * @param {Boolean} val The value to set debug flag to.
 * @return {Boolean} True if enabled, false otherwise.
 */
View.prototype.debug = Shared.common.debug;

/**
 * Executes an insert against the data-source this view is linked to.
 */
View.prototype.insert = function () {
	this._from.insert.apply(this._from, arguments);
};

/**
 * Executes an update against the data-source this view is linked to.
 */
View.prototype.update = function () {
	this._from.update.apply(this._from, arguments);
};

/**
 * Executes an updateById against the data-source this view is linked to.
 */
View.prototype.updateById = function () {
	this._from.updateById.apply(this._from, arguments);
};

/**
 * Executes a remove against the data-source this view is linked to.
 */
View.prototype.remove = function () {
	this._from.remove.apply(this._from, arguments);
};

/**
 * Queries the view data. See Collection.find() for more information.
 * @returns {*}
 */
View.prototype.find = function (query, options) {
	return this.publicData().find(query, options);
};

/**
 * Data-binds the view data to the elements matched by the passed selector.
 * @param {String} outputTargetSelector The jQuery element selector to select the element
 * into which the data-bound rendered items will be placed. All existing HTML will be
 * removed from this element.
 * @param {String|Object} templateSelector This can either be a jQuery selector identifying
 * which template element to get the template HTML from that each item in the view's data
 * will use when rendering to the screen, or you can pass an object with a template key
 * containing a string that represents the HTML template such as:
 *     { template: '<div>{{:name}}</div>' }
 * @returns {*}
 */
View.prototype.link = function (outputTargetSelector, templateSelector) {
	var publicData = this.publicData();
	if (this.debug()) {
		console.log('ForerunnerDB.View: Setting up data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
	}

	publicData.link(outputTargetSelector, templateSelector);

	return this;
};

View.prototype.unlink = function (outputTargetSelector, templateSelector) {
	var publicData = this.publicData();
	if (this.debug()) {
		console.log('ForerunnerDB.View: Removing data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
	}

	publicData.unlink(outputTargetSelector, templateSelector);

	return this;
};

/**
 * If the view has been data-bound to a DOM element this call
 * will return true.
 * @returns {Boolean} True if data-bound, false otherwise.
 */
View.prototype.isLinked = function () {
	return this._privateData.isLinked();
};

/**
 * Returns a non-referenced version of the passed object / array.
 * @param {Object} data The object or array to return as a non-referenced version.
 * @returns {*}
 */
View.prototype.decouple = Shared.common.decouple;

/**
 * Sets the collection from which the view will assemble its data.
 * @param {Collection} collection The collection to use to assemble view data.
 * @returns {View}
 */
View.prototype.from = function (collection) {
	var self = this;

	if (collection !== undefined) {
		if (typeof(collection) === 'string') {
			collection = this._db.collection(collection);
		}

		this._from = collection;

		// Create a new reactor IO graph node that intercepts chain packets from the
		// view's "from" collection and determines how they should be interpreted by
		// this view. If the view does not have a query then this reactor IO will
		// simply pass along the chain packet without modifying it.
		this._io = new ReactorIO(collection, this, function (chainPacket) {
			var data,
				diff,
				query,
				filteredData,
				doSend,
				pk,
				i;

			if (chainPacket.type === 'insert') {
				// Check if we have a constraining query
				if (self._querySettings.query) {
					data = chainPacket.data;

					// Check if the data matches our query
					if (data instanceof Array) {
						filteredData = [];

						for (i = 0; i < data.length; i++) {
							if (self._privateData._match(data[i], self._querySettings.query, 'and')) {
								filteredData.push(data[i]);
								doSend = true;
							}
						}
					} else {
						if (self._privateData._match(data, self._querySettings.query, 'and')) {
							filteredData = data;
							doSend = true;
						}
					}

					if (doSend) {
						this.chainSend('insert', filteredData);
					}

					return true;
				}

				return false;
			}

			if (chainPacket.type === 'update') {
				// Check if we have a constraining query
				if (self._querySettings.query) {
					// Do a DB diff between this view's data and the underlying collection it reads from
					// to see if something has changed
					diff = self._privateData.diff(self._from.subset(self._querySettings.query, self._querySettings.options));

					if (diff.insert.length || diff.remove.length) {
						// Now send out new chain packets for each operation
						if (diff.insert.length) {
							this.chainSend('insert', diff.insert);
						}

						if (diff.update.length) {
							pk = self._privateData.primaryKey();
							for (i = 0; i < diff.update.length; i++) {
								query = {};
								query[pk] = diff.update[i][pk];

								this.chainSend('update', {
									query: query,
									update: diff.update[i]
								});
							}
						}

						if (diff.remove.length) {
							var $or = [],
								removeQuery = {
									$or: $or
								};

							for (i = 0; i < diff.remove.length; i++) {
								$or.push({_id: diff.remove[i][pk]});
							}

							this.chainSend('remove', removeQuery);
						}

						// Return true to stop further propagation of the chain packet
						return true;
					} else {
						return false;
					}
				} else {
					return false;
				}
			}
		});

		var collData = collection.find(this._querySettings.query, this._querySettings.options);

		this._transformPrimaryKey(collection.primaryKey());
		this._transformInsert(collData);

		this._privateData.primaryKey(collection.primaryKey());
		this._privateData.insert(collData);
	}

	return this;
};

View.prototype.ensureIndex = function () {
	return this._privateData.ensureIndex.apply(this._privateData, arguments);
};

View.prototype._chainHandler = function (chainPacket) {
	var self = this,
		index,
		tempData,
		dataIsArray,
		updates,
		finalUpdates,
		primaryKey,
		tQuery,
		item,
		currentIndex,
		i;

	switch (chainPacket.type) {
		case 'setData':
			if (this.debug()) {
				console.log('ForerunnerDB.View: Setting data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
			}

			// Decouple the data to ensure we are working with our own copy
			chainPacket.data = this.decouple(chainPacket.data);

			// Modify transform data
			this._transformSetData(chainPacket.data);
			this._privateData.setData(chainPacket.data);
			break;

		case 'insert':
			if (this.debug()) {
				console.log('ForerunnerDB.View: Inserting some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
			}

			// Decouple the data to ensure we are working with our own copy
			chainPacket.data = this.decouple(chainPacket.data);

			// Make sure we are working with an array
			if (!(chainPacket.data instanceof Array)) {
				chainPacket.data = [chainPacket.data];
			}

			// Set the insert index to the passed index, or if none, the end of the view data array
			index = this._privateData._data.length;

			// Modify transform data
			this._transformInsert(chainPacket.data, index);
			this._privateData._insertHandle(chainPacket.data, index);

			this._refreshSort(chainPacket.data);
			break;

		case 'update':
			if (this.debug()) {
				console.log('ForerunnerDB.View: Updating some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
			}

			primaryKey = this._privateData.primaryKey();

			// Do the update
			updates = this._privateData.update(
				chainPacket.data.query,
				chainPacket.data.update,
				chainPacket.data.options
			);

			this._refreshSort(updates);

			if (this._transformEnabled && this._transformIn) {
				primaryKey = this._publicData.primaryKey();

				for (i = 0; i < updates.length; i++) {
					tQuery = {};
					item = updates[i];
					tQuery[primaryKey] = item[primaryKey];

					this._transformUpdate(tQuery, item);
				}
			}
			break;

		case 'remove':
			if (this.debug()) {
				console.log('ForerunnerDB.View: Removing some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
			}

			// Modify transform data
			this._transformRemove(chainPacket.data.query, chainPacket.options);
			this._privateData.remove(chainPacket.data.query, chainPacket.options);
			break;

		default:
			break;
	}
};

View.prototype._refreshSort = function () {
	if (this._querySettings.options && this._querySettings.options.$orderBy) {
		var self = this;

		/*if (this._refreshSortDebounce) {
			// Cancel the current debounce
			clearTimeout(this._refreshSortDebounce);
		}

		// Set a timeout to do the refresh sort
		this._refreshSortDebounce = setTimeout(function () {
			self._refreshSortAction();
		}, 10);*/

		self._refreshSortAction();
	}
};

View.prototype._refreshSortAction = function () {
	var tempData,
		currentIndex,
		refreshData,
		index,
		i;

	delete this._refreshSortDebounce;
	//refreshData = this._privateData._data;

	// Create a temp data array from existing view data
	//tempData = [].concat(this._privateData._data);

	// Run the new array through the sorting system
	tempData = this._privateData.find({}, {$orderBy: this._querySettings.options.$orderBy, $decouple: false});

	// Now we have sorted data, determine where to move the updated documents
	// Order updates by their index location
	/*tempData.sort(function (a, b) {
		return tempData.indexOf(a) - tempData.indexOf(b);
	});*/

	// Loop and add each one to the correct place
	for (i = 0; i < tempData.length; i++) {
		currentIndex = this._privateData._data.indexOf(tempData[i]);
		index = tempData.indexOf(tempData[i]);

		if (currentIndex !== index) {
			// Modify the document position within the collection
			this._privateData._updateSpliceMove(this._privateData._data, currentIndex, index);
		}
	}
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
	if (this._from) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('ForerunnerDB.View: Dropping view ' + this._name);
		}

		// Clear io and chains
		this._io.drop();

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
		if (options.$decouple === undefined) { options.$decouple = true; }

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
View.prototype.refresh = function () {
	if (this._from) {
		var sortedData,
			pubData = this.publicData();

		// Re-grab all the data for the view from the collection
		this._privateData.remove();
		pubData.remove();

		this._privateData.insert(this._from.find(this._querySettings.query, this._querySettings.options));

		if (pubData._linked) {
			// Update data and observers
			//var transformedData = this._privateData.find();
			// TODO: Shouldn't this data get passed into a transformIn first?
			// TODO: This breaks linking because its passing decoupled data and overwriting non-decoupled data
			//jQuery.observable(pubData._data).refresh(transformedData);
		}
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
 * Takes the passed data and uses it to set transform methods and globally
 * enable or disable the transform system for the view.
 * @param {Object} obj The new transform system settings "enabled", "dataIn" and "dataOut":
 * {
 * 	"enabled": true,
 * 	"dataIn": function (data) { return data; },
 * 	"dataOut": function (data) { return data; }
 * }
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
 * Returns the non-transformed data the view holds as a collection
 * reference.
 * @return {Collection} The non-transformed collection reference.
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

View.prototype._transformUpdate = function (query, update, options) {
	if (this._transformEnabled && this._publicData) {
		this._publicData.update(query, update, options);
	}
};

View.prototype._transformRemove = function (query, options) {
	if (this._transformEnabled && this._publicData) {
		this._publicData.remove(query, options);
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

/**
 * Creates a view and assigns the collection as its data source.
 * @param {String} name The name of the new view.
 * @param {Object} query The query to apply to the new view.
 * @param {Object} options The options object to apply to the view.
 * @returns {*}
 */
Collection.prototype.view = function (name, query, options) {
	if (this._db && this._db._views ) {
		if (!this._db._views[name]) {
			var view = new View(name, query, options)
				.db(this._db)
				._addCollection(this);

			this._views = this._views || [];
			this._views.push(view);

			return view;
		} else {
			throw('Cannot create a view using this collection because one with this name already exists: ' + name);
		}
	}
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