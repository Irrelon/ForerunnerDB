"use strict";

// Import external names locally
var Shared,
	Db,
	Collection,
	CollectionGroup,
	CollectionInit,
	DbInit,
	ReactorIO,
	ActiveBucket;

Shared = require('./Shared');

/**
 * Creates a new view instance.
 * @param {String} name The name of the view.
 * @param {Object=} query The view's query.
 * @param {Object=} options An options object.
 * @constructor
 */
var View = function (name, query, options) {
	this.init.apply(this, arguments);
};

View.prototype.init = function (name, query, options) {
	var self = this;

	this._name = name;
	this._listeners = {};
	this._querySettings = {};
	this._debug = {};

	this.query(query, false);
	this.queryOptions(options, false);

	this._collectionDroppedWrap = function () {
		self._collectionDropped.apply(self, arguments);
	};

	this._privateData = new Collection('__FDB__view_privateData_' + this._name);
};

Shared.addModule('View', View);
Shared.mixin(View.prototype, 'Mixin.Common');
Shared.mixin(View.prototype, 'Mixin.ChainReactor');
Shared.mixin(View.prototype, 'Mixin.Constants');
Shared.mixin(View.prototype, 'Mixin.Triggers');

Collection = require('./Collection');
CollectionGroup = require('./CollectionGroup');
ActiveBucket = require('./ActiveBucket');
ReactorIO = require('./ReactorIO');
CollectionInit = Collection.prototype.init;
Db = Shared.modules.Db;
DbInit = Db.prototype.init;

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(View.prototype, 'state');

/**
 * Gets / sets the current name.
 * @param {String=} val The new name to set.
 * @returns {*}
 */
Shared.synthesize(View.prototype, 'name');

/**
 * Gets / sets the current cursor.
 * @param {String=} val The new cursor to set.
 * @returns {*}
 */
Shared.synthesize(View.prototype, 'cursor', function (val) {
	if (val === undefined) {
		return this._cursor || {};
	}

	this.$super.apply(this, arguments);
});

/**
 * Executes an insert against the view's underlying data-source.
 * @see Collection::insert()
 */
View.prototype.insert = function () {
	this._from.insert.apply(this._from, arguments);
};

/**
 * Executes an update against the view's underlying data-source.
 * @see Collection::update()
 */
View.prototype.update = function () {
	this._from.update.apply(this._from, arguments);
};

/**
 * Executes an updateById against the view's underlying data-source.
 * @see Collection::updateById()
 */
View.prototype.updateById = function () {
	this._from.updateById.apply(this._from, arguments);
};

/**
 * Executes a remove against the view's underlying data-source.
 * @see Collection::remove()
 */
View.prototype.remove = function () {
	this._from.remove.apply(this._from, arguments);
};

/**
 * Queries the view data.
 * @see Collection::find()
 * @returns {Array} The result of the find query.
 */
View.prototype.find = function (query, options) {
	return this.publicData().find(query, options);
};

/**
 * Queries the view data by specific id.
 * @see Collection::findById()
 * @returns {Array} The result of the find query.
 */
View.prototype.findById = function (id, options) {
	return this.publicData().findById(id, options);
};

/**
 * Gets the module's internal data collection.
 * @returns {Collection}
 */
View.prototype.data = function () {
	return this._privateData;
};

/**
 * Sets the collection from which the view will assemble its data.
 * @param {Collection} collection The collection to use to assemble view data.
 * @returns {*} If no argument is passed, returns the current value of from,
 * otherwise returns itself for chaining.
 */
View.prototype.from = function (collection) {
	var self = this;

	if (collection !== undefined) {
		// Check if we have an existing from
		if (this._from) {
			// Remove the listener to the drop event
			this._from.off('drop', this._collectionDroppedWrap);
			delete this._from;
		}

		if (typeof(collection) === 'string') {
			collection = this._db.collection(collection);
		}

		this._from = collection;
		this._from.on('drop', this._collectionDroppedWrap);

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

			// Check if we have a constraining query
			if (self._querySettings.query) {
				if (chainPacket.type === 'insert') {
					data = chainPacket.data;

					// Check if the data matches our query
					if (data instanceof Array) {
						filteredData = [];

						for (i = 0; i < data.length; i++) {
							if (self._privateData._match(data[i], self._querySettings.query, 'and', {})) {
								filteredData.push(data[i]);
								doSend = true;
							}
						}
					} else {
						if (self._privateData._match(data, self._querySettings.query, 'and', {})) {
							filteredData = data;
							doSend = true;
						}
					}

					if (doSend) {
						this.chainSend('insert', filteredData);
					}

					return true;
				}

				if (chainPacket.type === 'update') {
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
							pk = self._privateData.primaryKey();
							var $or = [],
								removeQuery = {
									query: {
										$or: $or
									}
								};

							for (i = 0; i < diff.remove.length; i++) {
								$or.push({_id: diff.remove[i][pk]});
							}

							this.chainSend('remove', removeQuery);
						}

						// Return true to stop further propagation of the chain packet
						return true;
					} else {
						// Returning false informs the chain reactor to continue propagation
						// of the chain packet down the graph tree
						return false;
					}
				}
			}

			// Returning false informs the chain reactor to continue propagation
			// of the chain packet down the graph tree
			return false;
		});

		var collData = collection.find(this._querySettings.query, this._querySettings.options);

		this._transformPrimaryKey(collection.primaryKey());
		this._transformSetData(collData);

		this._privateData.primaryKey(collection.primaryKey());
		this._privateData.setData(collData);

		if (this._querySettings.options && this._querySettings.options.$orderBy) {
			this.rebuildActiveBucket(this._querySettings.options.$orderBy);
		} else {
			this.rebuildActiveBucket();
		}

		return this;
	}

	return this._from;
};

/**
 * Handles when an underlying collection the view is using as a data
 * source is dropped.
 * @param {Collection} collection The collection that has been dropped.
 * @private
 */
View.prototype._collectionDropped = function (collection) {
	if (collection) {
		// Collection was dropped, remove from view
		delete this._from;
	}
};

/**
 * Creates an index on the view.
 * @see Collection::ensureIndex()
 * @returns {*}
 */
View.prototype.ensureIndex = function () {
	return this._privateData.ensureIndex.apply(this._privateData, arguments);
};

/**
 * The chain reaction handler method for the view.
 * @param {Object} chainPacket The chain reaction packet to handle.
 * @private
 */
View.prototype._chainHandler = function (chainPacket) {
	var //self = this,
		arr,
		count,
		index,
		insertIndex,
		//tempData,
		//dataIsArray,
		updates,
		//finalUpdates,
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

			// Get the new data from our underlying data source sorted as we want
			var collData = this._from.find(this._querySettings.query, this._querySettings.options);

			// Modify transform data
			this._transformSetData(collData);
			this._privateData.setData(collData);
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

			if (this._querySettings.options && this._querySettings.options.$orderBy) {
				// Loop the insert data and find each item's index
				arr = chainPacket.data;
				count = arr.length;

				for (index = 0; index < count; index++) {
					insertIndex = this._activeBucket.insert(arr[index]);

					// Modify transform data
					this._transformInsert(chainPacket.data, insertIndex);
					this._privateData._insertHandle(chainPacket.data, insertIndex);
				}
			} else {
				// Set the insert index to the passed index, or if none, the end of the view data array
				insertIndex = this._privateData._data.length;

				// Modify transform data
				this._transformInsert(chainPacket.data, insertIndex);
				this._privateData._insertHandle(chainPacket.data, insertIndex);
			}
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

			if (this._querySettings.options && this._querySettings.options.$orderBy) {
				// TODO: This would be a good place to improve performance by somehow
				// TODO: inspecting the change that occurred when update was performed
				// TODO: above and determining if it affected the order clause keys
				// TODO: and if not, skipping the active bucket updates here

				// Loop the updated items and work out their new sort locations
				count = updates.length;
				for (index = 0; index < count; index++) {
					item = updates[index];

					// Remove the item from the active bucket (via it's id)
					this._activeBucket.remove(item);

					// Get the current location of the item
					currentIndex = this._privateData._data.indexOf(item);

					// Add the item back in to the active bucket
					insertIndex = this._activeBucket.insert(item);

					if (currentIndex !== insertIndex) {
						// Move the updated item to the new index
						this._privateData._updateSpliceMove(this._privateData._data, currentIndex, insertIndex);
					}
				}
			}

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

/**
 * Listens for an event.
 * @see Mixin.Events::on()
 */
View.prototype.on = function () {
	return this._privateData.on.apply(this._privateData, arguments);
};

/**
 * Cancels an event listener.
 * @see Mixin.Events::off()
 */
View.prototype.off = function () {
	return this._privateData.off.apply(this._privateData, arguments);
};

/**
 * Emits an event.
 * @see Mixin.Events::emit()
 */
View.prototype.emit = function () {
	return this._privateData.emit.apply(this._privateData, arguments);
};

/**
 * Find the distinct values for a specified field across a single collection and
 * returns the results in an array.
 * @param {String} key The field path to return distinct values for e.g. "person.name".
 * @param {Object=} query The query to use to filter the documents used to return values from.
 * @param {Object=} options The query options to use when running the query.
 * @returns {Array}
 */
View.prototype.distinct = function (key, query, options) {
	return this._privateData.distinct.apply(this._privateData, arguments);
};

/**
 * Gets the primary key for this view from the assigned collection.
 * @see Collection::primaryKey()
 * @returns {String}
 */
View.prototype.primaryKey = function () {
	return this._privateData.primaryKey();
};

/**
 * Drops a view and all it's stored data from the database.
 * @returns {boolean} True on success, false on failure.
 */
View.prototype.drop = function () {
	if (this._state !== 'dropped') {
		if (this._from) {
			this._from.off('drop', this._collectionDroppedWrap);
			this._from._removeView(this);

			if (this.debug() || (this._db && this._db.debug())) {
				console.log('ForerunnerDB.View: Dropping view ' + this._name);
			}

			this._state = 'dropped';

			// Clear io and chains
			if (this._io) {
				this._io.drop();
			}

			// Drop the view's internal collection
			if (this._privateData) {
				this._privateData.drop();
			}

			if (this._db && this._name) {
				delete this._db._view[this._name];
			}

			this.emit('drop', this);

			delete this._chain;
			delete this._from;
			delete this._privateData;
			delete this._io;
			delete this._listeners;
			delete this._querySettings;
			delete this._db;

			return true;
		}
	} else {
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
 * Gets / sets the query object and query options that the view uses
 * to build it's data set. This call modifies both the query and
 * query options at the same time.
 * @param {Object=} query The query to set.
 * @param {Boolean=} options The query options object.
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
	this._querySettings.query = this._querySettings.query || {};

	var query = this._querySettings.query,
		i;

	if (obj !== undefined) {
		// Loop object properties and add to existing query
		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				if (query[i] === undefined || (query[i] !== undefined && overwrite !== false)) {
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

	if (query) {
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
	}
};

/**
 * Gets / sets the query being used to generate the view data. It
 * does not change or modify the view's query options.
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
 * Gets / sets the orderBy clause in the query options for the view.
 * @param {Object=} val The order object.
 * @returns {*}
 */
View.prototype.orderBy = function (val) {
	if (val !== undefined) {
		var queryOptions = this.queryOptions() || {};
		queryOptions.$orderBy = val;

		this.queryOptions(queryOptions);
		return this;
	}

	return (this.queryOptions() || {}).$orderBy;
};

/**
 * Gets / sets the page clause in the query options for the view.
 * @param {Number=} val The page number to change to (zero index).
 * @returns {*}
 */
View.prototype.page = function (val) {
	if (val !== undefined) {
		var queryOptions = this.queryOptions() || {};

		// Only execute a query options update if page has changed
		if (val !== queryOptions.$page) {
			queryOptions.$page = val;
			this.queryOptions(queryOptions);
		}

		return this;
	}

	return (this.queryOptions() || {}).$page;
};

/**
 * Jump to the first page in the data set.
 * @returns {*}
 */
View.prototype.pageFirst = function () {
	return this.page(0);
};

/**
 * Jump to the last page in the data set.
 * @returns {*}
 */
View.prototype.pageLast = function () {
	var pages = this.cursor().pages,
		lastPage = pages !== undefined ? pages : 0;

	return this.page(lastPage - 1);
};

/**
 * Move forward or backwards in the data set pages by passing a positive
 * or negative integer of the number of pages to move.
 * @param {Number} val The number of pages to move.
 * @returns {*}
 */
View.prototype.pageScan = function (val) {
	if (val !== undefined) {
		var pages = this.cursor().pages,
			queryOptions = this.queryOptions() || {},
			currentPage = queryOptions.$page !== undefined ? queryOptions.$page : 0;

		currentPage += val;

		if (currentPage < 0) {
			currentPage = 0;
		}

		if (currentPage >= pages) {
			currentPage = pages - 1;
		}

		return this.page(currentPage);
	}
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
		} else {
			this.rebuildActiveBucket(options.$orderBy);
		}
		return this;
	}

	return this._querySettings.options;
};

View.prototype.rebuildActiveBucket = function (orderBy) {
	if (orderBy) {
		var arr = this._privateData._data,
			arrCount = arr.length;

		// Build a new active bucket
		this._activeBucket = new ActiveBucket(orderBy);
		this._activeBucket.primaryKey(this._privateData.primaryKey());

		// Loop the current view data and add each item
		for (var i = 0; i < arrCount; i++) {
			this._activeBucket.insert(arr[i]);
		}
	} else {
		// Remove any existing active bucket
		delete this._activeBucket;
	}
};

/**
 * Refreshes the view data such as ordering etc.
 */
View.prototype.refresh = function () {
	if (this._from) {
		var pubData = this.publicData(),
			refreshResults;

		// Re-grab all the data for the view from the collection
		this._privateData.remove();
		pubData.remove();

		refreshResults = this._from.find(this._querySettings.query, this._querySettings.options);
		this.cursor(refreshResults.$cursor);

		this._privateData.insert(refreshResults);

		this._privateData._data.$cursor = refreshResults.$cursor;
		pubData._data.$cursor = refreshResults.$cursor;

		/*if (pubData._linked) {
			// Update data and observers
			//var transformedData = this._privateData.find();
			// TODO: Shouldn't this data get passed into a transformIn first?
			// TODO: This breaks linking because its passing decoupled data and overwriting non-decoupled data
			// TODO: Is this even required anymore? After commenting it all seems to work
			// TODO: Might be worth setting up a test to check transforms and linking then remove this if working?
			//jQuery.observable(pubData._data).refresh(transformedData);
		}*/
	}

	if (this._querySettings.options && this._querySettings.options.$orderBy) {
		this.rebuildActiveBucket(this._querySettings.options.$orderBy);
	} else {
		this.rebuildActiveBucket();
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

// Call underlying
View.prototype.subset = function () {
	return this.publicData().subset.apply(this._privateData, arguments);
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
			this._transformEnabled = obj !== false;
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
 * Executes a method against each document that matches query and returns an
 * array of documents that may have been modified by the method.
 * @param {Object} query The query object.
 * @param {Function} func The method that each document is passed to. If this method
 * returns false for a particular document it is excluded from the results.
 * @param {Object=} options Optional options object.
 * @returns {Array}
 */
View.prototype.filter = function (query, func, options) {
	return (this.publicData()).filter(query, func, options);
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
 *
 * The public data collection is also used by data binding to only
 * changes to the publicData will show in a data-bound element.
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
	this._view = [];
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
	if (this._db && this._db._view ) {
		if (!this._db._view[name]) {
			var view = new View(name, query, options)
				.db(this._db)
				.from(this);

			this._view = this._view || [];
			this._view.push(view);

			return view;
		} else {
			throw('ForerunnerDB.Collection "' + this.name() + '": Cannot create a view using this collection because a view with this name already exists: ' + name);
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
		this._view.push(view);
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
		var index = this._view.indexOf(view);
		if (index > -1) {
			this._view.splice(index, 1);
		}
	}

	return this;
};

// Extend DB with views init
Db.prototype.init = function () {
	this._view = {};
	DbInit.apply(this, arguments);
};

/**
 * Gets a view by it's name.
 * @param {String} viewName The name of the view to retrieve.
 * @returns {*}
 */
Db.prototype.view = function (viewName) {
	// Handle being passed an instance
	if (viewName instanceof View) {
		return viewName;
	}

	if (!this._view[viewName]) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('Db.View: Creating view ' + viewName);
		}
	}

	this._view[viewName] = this._view[viewName] || new View(viewName).db(this);
	return this._view[viewName];
};

/**
 * Determine if a view with the passed name already exists.
 * @param {String} viewName The name of the view to check for.
 * @returns {boolean}
 */
Db.prototype.viewExists = function (viewName) {
	return Boolean(this._view[viewName]);
};

/**
 * Returns an array of views the DB currently has.
 * @returns {Array} An array of objects containing details of each view
 * the database is currently managing.
 */
Db.prototype.views = function () {
	var arr = [],
		view,
		i;

	for (i in this._view) {
		if (this._view.hasOwnProperty(i)) {
			view = this._view[i];

			arr.push({
				name: i,
				count: view.count(),
				linked: view.isLinked !== undefined ? view.isLinked() : false
			});
		}
	}

	return arr;
};

Shared.finishModule('View');
module.exports = View;