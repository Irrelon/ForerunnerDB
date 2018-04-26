"use strict";

var Shared,
	Db,
	Metrics,
	KeyValueStore,
	Path,
	IndexHashMap,
	IndexBinaryTree,
	Index2d,
	Overload,
	ReactorIO,
	Condition,
	sharedPathSolver;

Shared = require('./Shared');

/**
 * Creates a new collection. Collections store multiple documents and
 * handle CRUD against those documents.
 * @constructor
 * @class
 */
var Collection = function (name, options) {
	this.init.apply(this, arguments);
};

/**
 * Creates a new collection. Collections store multiple documents and
 * handle CRUD against those documents.
 */
Collection.prototype.init = function (name, options) {
	// Ensure we have an options object
	options = options || {};
	
	// Set internals
	this.sharedPathSolver = sharedPathSolver;
	this._primaryKey = options.primaryKey || '_id';
	this._primaryIndex = new KeyValueStore('primary', {primaryKey: this.primaryKey()});
	this._primaryCrc = new KeyValueStore('primaryCrc', {primaryKey: this.primaryKey()});
	this._crcLookup = new KeyValueStore('crcLookup', {primaryKey: this.primaryKey()});
	this._name = name;
	this._data = [];
	this._metrics = new Metrics();

	this._options = options || {
		changeTimestamp: false
	};

	if (this._options.db) {
		this.db(this._options.db);
	}

	// Create an object to store internal protected data
	this._metaData = {};

	this._deferQueue = {
		insert: [],
		update: [],
		remove: [],
		upsert: [],
		async: []
	};

	this._deferThreshold = {
		insert: 100,
		update: 100,
		remove: 100,
		upsert: 100
	};

	this._deferTime = {
		insert: 1,
		update: 1,
		remove: 1,
		upsert: 1
	};

	this._deferredCalls = true;

	// Set the subset to itself since it is the root collection
	this.subsetOf(this);
};

Shared.addModule('Collection', Collection);
Shared.mixin(Collection.prototype, 'Mixin.Common');
Shared.mixin(Collection.prototype, 'Mixin.Events');
Shared.mixin(Collection.prototype, 'Mixin.ChainReactor');
Shared.mixin(Collection.prototype, 'Mixin.CRUD');
Shared.mixin(Collection.prototype, 'Mixin.Constants');
Shared.mixin(Collection.prototype, 'Mixin.Triggers');
Shared.mixin(Collection.prototype, 'Mixin.Sorting');
Shared.mixin(Collection.prototype, 'Mixin.Matching');
Shared.mixin(Collection.prototype, 'Mixin.Updating');
Shared.mixin(Collection.prototype, 'Mixin.Tags');

Metrics = require('./Metrics');
KeyValueStore = require('./KeyValueStore');
Path = require('./Path');
IndexHashMap = require('./IndexHashMap');
IndexBinaryTree = require('./IndexBinaryTree');
Index2d = require('./Index2d');
Db = Shared.modules.Db;
Overload = require('./Overload');
ReactorIO = require('./ReactorIO');
Condition = require('./Condition');
sharedPathSolver = new Path();

/**
 * Gets / sets the deferred calls flag. If set to true (default)
 * then operations on large data sets can be broken up and done
 * over multiple CPU cycles (creating an async state). For purely
 * synchronous behaviour set this to false.
 * @param {Boolean=} val The value to set.
 * @returns {Boolean}
 */
Shared.synthesize(Collection.prototype, 'deferredCalls');

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'state');

/**
 * Gets / sets the name of the collection.
 * @param {String=} val The name of the collection to set.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'name');

/**
 * Gets / sets the metadata stored in the collection.
 * @param {Object=} val The data to set.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'metaData');

/**
 * Gets / sets boolean to determine if the collection should be
 * capped or not.
 * @param {Boolean=} val The value to set.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'capped');

/**
 * Gets / sets capped collection size. This is the maximum number
 * of records that the capped collection will store.
 * @param {Number=} val The value to set.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'cappedSize');

/**
 * Adds a job id to the async queue to signal to other parts
 * of the application that some async work is currently being
 * done.
 * @param {String} key The id of the async job.
 * @private
 */
Collection.prototype._asyncPending = function (key) {
	this._deferQueue.async.push(key);
};

/**
 * Removes a job id from the async queue to signal to other
 * parts of the application that some async work has been
 * completed. If no further async jobs exist on the queue then
 * the "ready" event is emitted from this collection instance.
 * @param {String} key The id of the async job.
 * @private
 */
Collection.prototype._asyncComplete = function (key) {
	// Remove async flag for this type
	var index = this._deferQueue.async.indexOf(key);

	while (index > -1) {
		this._deferQueue.async.splice(index, 1);
		index = this._deferQueue.async.indexOf(key);
	}

	if (this._deferQueue.async.length === 0) {
		this.deferEmit('ready');
	}
};

/**
 * Get the data array that represents the collection's data.
 * This data is returned by reference and should not be altered outside
 * of the provided CRUD functionality of the collection as doing so
 * may cause unstable index behaviour within the collection.
 * @returns {Array}
 */
Collection.prototype.data = function () {
	return this._data;
};

/**
 * Drops a collection and all it's stored data from the database.
 * @param {Function=} callback A callback method to call once the
 * operation has completed.
 * @returns {boolean} True on success, false on failure.
 */
Collection.prototype.drop = function (callback) {
	var key;

	if (!this.isDropped()) {
		if (this._db && this._db._collection && this._name) {
			if (this.debug()) {
				console.log(this.logIdentifier() + ' Dropping');
			}

			this._state = 'dropped';

			this.emit('drop', this);

			delete this._db._collection[this._name];

			// Remove any reactor IO chain links
			if (this._collate) {
				for (key in this._collate) {
					if (this._collate.hasOwnProperty(key)) {
						this.collateRemove(key);
					}
				}
			}

			delete this._primaryKey;
			delete this._primaryIndex;
			delete this._primaryCrc;
			delete this._crcLookup;
			delete this._data;
			delete this._metrics;
			delete this._listeners;

			if (callback) { callback.call(this, false, true); }

			return true;
		}
	} else {
		if (callback) { callback.call(this, false, true); }

		return true;
	}

	if (callback) { callback.call(this, false, true); }
	return false;
};

/**
 * Gets / sets the primary key for this collection.
 * @param {String=} keyName The name of the primary key.
 * @returns {*}
 */
Collection.prototype.primaryKey = function (keyName) {
	if (keyName !== undefined) {
		if (this._primaryKey !== keyName) {
			var oldKey = this._primaryKey;
			this._primaryKey = keyName;

			// Set the primary key index primary key
			this._primaryIndex.primaryKey(keyName);

			// Rebuild the primary key index
			this.rebuildPrimaryKeyIndex();

			// Propagate change down the chain
			this.chainSend('primaryKey', {
				keyName: keyName,
				oldData: oldKey
			});
		}
		return this;
	}

	return this._primaryKey;
};

/**
 * Handles insert events and routes changes to binds and views as required.
 * @param {Array} inserted An array of inserted documents.
 * @param {Array} failed An array of documents that failed to insert.
 * @private
 */
Collection.prototype._onInsert = function (inserted, failed) {
	this.emit('insert', inserted, failed);
};

/**
 * Handles update events and routes changes to binds and views as required.
 * @param {Array} items An array of updated documents.
 * @private
 */
Collection.prototype._onUpdate = function (items) {
	this.emit('update', items);
};

/**
 * Handles remove events and routes changes to binds and views as required.
 * @param {Array} items An array of removed documents.
 * @private
 */
Collection.prototype._onRemove = function (items) {
	this.emit('remove', items);
};

/**
 * Handles any change to the collection by updating the
 * lastChange timestamp on the collection's metaData. This
 * only happens if the changeTimestamp option is enabled
 * on the collection (it is disabled by default).
 * @private
 */
Collection.prototype._onChange = function () {
	if (this._options.changeTimestamp) {
		// Record the last change timestamp
		this._metaData.lastChange = this.serialiser.convert(new Date());
	}
};

/**
 * Gets / sets the db instance this class instance belongs to.
 * @param {Db=} db The db instance.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'db', function (db) {
	if (db) {
		if (this.primaryKey() === '_id') {
			// Set primary key to the db's key by default
			this.primaryKey(db.primaryKey());

			// Apply the same debug settings
			this.debug(db.debug());
		}
	}

	return this.$super.apply(this, arguments);
});

/**
 * Gets / sets mongodb emulation mode.
 * @param {Boolean=} val True to enable, false to disable.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'mongoEmulation');

Collection.prototype.setData = new Overload('Collection.prototype.setData', {
	/**
	 * Sets the collection's data to the array / documents passed.  If any
	 * data already exists in the collection it will be removed before the
	 * new data is set via the remove() method, and the remove event will
	 * fire as well.
	 * @name setData
	 * @method Collection.setData
	 * @param {Array|Object} data The array of documents or a single document
	 * that will be set as the collections data.
	 */
	'*': function (data) {
		return this.$main.call(this, data, {});
	},

	/**
	 * Sets the collection's data to the array / documents passed.  If any
	 * data already exists in the collection it will be removed before the
	 * new data is set via the remove() method, and the remove event will
	 * fire as well.
	 * @name setData
	 * @method Collection.setData
	 * @param {Array|Object} data The array of documents or a single document
	 * that will be set as the collections data.
	 * @param {Object} options Optional options object.
	 */
	'*, object': function (data, options) {
		return this.$main.call(this, data, options);
	},

	/**
	 * Sets the collection's data to the array / documents passed.  If any
	 * data already exists in the collection it will be removed before the
	 * new data is set via the remove() method, and the remove event will
	 * fire as well.
	 * @name setData
	 * @method Collection.setData
	 * @param {Array|Object} data The array of documents or a single document
	 * that will be set as the collections data.
	 * @param {Function} callback Optional callback function.
	 */
	'*, function': function (data, callback) {
		return this.$main.call(this, data, {}, callback);
	},

	/**
	 * Sets the collection's data to the array / documents passed.  If any
	 * data already exists in the collection it will be removed before the
	 * new data is set via the remove() method, and the remove event will
	 * fire as well.
	 * @name setData
	 * @method Collection.setData
	 * @param {Array|Object} data The array of documents or a single document
	 * that will be set as the collections data.
	 * @param {*} options Optional options object.
	 * @param {Function} callback Optional callback function.
	 */
	'*, *, function': function (data, options, callback) {
		return this.$main.call(this, data, options, callback);
	},

	/**
	 * Sets the collection's data to the array / documents passed.  If any
	 * data already exists in the collection it will be removed before the
	 * new data is set via the remove() method, and the remove event will
	 * fire as well.
	 * @name setData
	 * @method Collection.setData
	 * @param {Array|Object} data The array of documents or a single document
	 * that will be set as the collections data.
	 * @param {*} options Optional options object.
	 * @param {*} callback Optional callback function.
	 */
	'*, *, *': function (data, options, callback) {
		return this.$main.call(this, data, options, callback);
	},

	/**
	 * Sets the collection's data to the array / documents passed.  If any
	 * data already exists in the collection it will be removed before the
	 * new data is set via the remove() method, and the remove event will
	 * fire as well.
	 * @name setData
	 * @method Collection.setData
	 * @param {Array|Object} data The array of documents or a single document
	 * that will be set as the collections data.
	 * @param {Object} options Optional options object.
	 * @param {Function} callback Optional callback function.
	 */
	'$main': function (data, options, callback) {
		if (this.isDropped()) {
			throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
		}

		if (data) {
			var deferredSetting = this.deferredCalls(),
				oldData = [].concat(this._data);

			// Switch off deferred calls since setData should be
			// a synchronous call
			this.deferredCalls(false);

			options = this.options(options);

			if (options.$decouple) {
				data = this.decouple(data);
			}

			if (!(data instanceof Array)) {
				data = [data];
			}

			// Remove all items from the collection
			this.remove({});

			// Insert the new data
			this.insert(data);

			// Switch deferred calls back to previous settings
			this.deferredCalls(deferredSetting);

			this._onChange();
			this.emit('setData', this._data, oldData);
		}

		if (callback) { callback.call(this); }

		return this;
	}
});

/**
 * Drops and rebuilds the primary key index for all documents
 * in the collection.
 * @param {Object=} options An optional options object.
 * @private
 */
Collection.prototype.rebuildPrimaryKeyIndex = function (options) {
	options = options || {
		$ensureKeys: undefined,
		$violationCheck: undefined
	};

	var ensureKeys = options && options.$ensureKeys !== undefined ? options.$ensureKeys : true,
		violationCheck = options && options.$violationCheck !== undefined ? options.$violationCheck : true,
		arr,
		arrCount,
		arrItem,
		pIndex = this._primaryIndex,
		crcIndex = this._primaryCrc,
		crcLookup = this._crcLookup,
		pKey = this._primaryKey,
		jString;

	// Drop the existing primary index
	pIndex.truncate();
	crcIndex.truncate();
	crcLookup.truncate();

	// Loop the data and check for a primary key in each object
	arr = this._data;
	arrCount = arr.length;

	while (arrCount--) {
		arrItem = arr[arrCount];

		if (ensureKeys) {
			// Make sure the item has a primary key
			this.ensurePrimaryKey(arrItem);
		}

		if (violationCheck) {
			// Check for primary key violation
			if (!pIndex.uniqueSet(arrItem[pKey], arrItem)) {
				// Primary key violation
				throw(this.logIdentifier() + ' Call to setData on collection failed because your data violates the primary key unique constraint. One or more documents are using the same primary key: ' + arrItem[this._primaryKey]);
			}
		} else {
			pIndex.set(arrItem[pKey], arrItem);
		}

		// Generate a hash string
		jString = this.hash(arrItem);

		crcIndex.set(arrItem[pKey], jString);
		crcLookup.set(jString, arrItem);
	}
};

/**
 * Checks for a primary key on the document and assigns one if none
 * currently exists.
 * @param {Object} obj The object to check a primary key against.
 * @private
 */
Collection.prototype.ensurePrimaryKey = function (obj) {
	if (obj[this._primaryKey] === undefined) {
		// Assign a primary key automatically
		obj[this._primaryKey] = this.objectId();
	}
};

/**
 * Clears all data from the collection.
 * @returns {Collection}
 */
Collection.prototype.truncate = function () {
	var i;
	
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}
	// TODO: This should use remove so that chain reactor events are properly
	// TODO: handled, but ensure that chunking is switched off
	this.emit('truncate', this._data);

	// Clear all the data from the collection
	this._data.length = 0;

	// Re-create the primary index data
	this._primaryIndex = new KeyValueStore('primary', {primaryKey: this.primaryKey()});
	this._primaryCrc = new KeyValueStore('primaryCrc', {primaryKey: this.primaryKey()});
	this._crcLookup = new KeyValueStore('crcLookup', {primaryKey: this.primaryKey()});
	
	// Re-create any existing collection indexes
	// TODO: This might not be the most efficient way to do this, perhaps just re-creating
	// the indexes would be faster than calling rebuild?
	for (i in this._indexByName) {
		if (this._indexByName.hasOwnProperty(i)) {
			this._indexByName[i].rebuild();
		}
	}

	this._onChange();
	this.emit('immediateChange', {type: 'truncate'});
	this.deferEmit('change', {type: 'truncate'});

	return this;
};

/**
 * Inserts a new document or updates an existing document in a
 * collection depending on if a matching primary key exists in
 * the collection already or not.
 *
 * If the document contains a primary key field (based on the
 * collections's primary key) then the database will search for
 * an existing document with a matching id. If a matching
 * document is found, the document will be updated. Any keys that
 * match keys on the existing document will be overwritten with
 * new data. Any keys that do not currently exist on the document
 * will be added to the document.
 *
 * If the document does not contain an id or the id passed does
 * not match an existing document, an insert is performed instead.
 * If no id is present a new primary key id is provided for the
 * document and the document is inserted.
 *
 * @param {Object} obj The document object to upsert or an array
 * containing documents to upsert.
 * @param {Function=} callback Optional callback method.
 * @returns {Array} An array containing an object for each operation
 * performed. Each object contains two keys, "op" contains either "none",
 * "insert" or "update" depending on the type of operation that was
 * performed and "result" contains the return data from the operation
 * used.
 */
Collection.prototype.upsert = function (obj, callback) {
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}

	if (obj) {
		var queue = this._deferQueue.upsert,
			deferThreshold = this._deferThreshold.upsert,
			returnData = {},
			query,
			i;

		// Determine if the object passed is an array or not
		if (obj instanceof Array) {
			if (this._deferredCalls && obj.length > deferThreshold) {
				// Break up upsert into blocks
				this._deferQueue.upsert = queue.concat(obj);
				this._asyncPending('upsert');

				// Fire off the insert queue handler
				this.processQueue('upsert', callback);

				return {};
			} else {
				// Loop the array and upsert each item
				returnData = [];

				for (i = 0; i < obj.length; i++) {
					returnData.push(this.upsert(obj[i])[0]);
				}

				if (callback) { callback.call(this, returnData); }

				return returnData;
			}
		}

		// Determine if the operation is an insert or an update
		if (obj[this._primaryKey]) {
			// Check if an object with this primary key already exists
			query = {};
			query[this._primaryKey] = obj[this._primaryKey];

			if (this._primaryIndex.lookup(query)[0]) {
				// The document already exists with this id, this operation is an update
				returnData.op = 'update';
			} else {
				// No document with this id exists, this operation is an insert
				returnData.op = 'insert';
			}
		} else {
			// The document passed does not contain an id, this operation is an insert
			returnData.op = 'insert';
		}

		switch (returnData.op) {
			case 'insert':
				returnData.result = this.insert(obj, callback);
				break;

			case 'update':
				returnData.result = this.update(query, obj, {}, callback);
				break;

			default:
				break;
		}
		
		if (callback) { callback.call(this, [returnData]); }

		return [returnData];
	} else {
		if (callback) { callback.call(this, {op: 'none'}); }
	}

	return {};
};

/**
 * Executes a method against each document that matches query and returns an
 * array of documents that may have been modified by the method.
 * @param {Object=} query The optional query object.
 * @param {Object=} options Optional options object. If you specify an options object
 * you MUST also specify a query object.
 * @param {Function} func The method that each document is passed to. If this method
 * returns false for a particular document it is excluded from the results. If you
 * return a modified object from the one passed to it will be included in the results
 * as the modified version but will not affect the data in the collection at all.
 * Your function will be called with a single object as the first argument and will
 * be called once for every document in your initial query result.
 * @returns {Array}
 */
Collection.prototype.filter = function (query, options, func) {
	var temp;
	
	if (typeof query === 'function') {
		func = query;
		query = {};
		options = {};
	}
	
	if (typeof options === 'function') {
		if (func) {
			temp = func;
		}
		
		func = options;
		options = temp || {};
	}
	
	return (this.find(query, options)).filter(func);
};

/**
 * Executes a method against each document that matches query and then executes
 * an update based on the return data of the method.
 * @param {Object} query The query object.
 * @param {Function} func The method that each document is passed to. If this method
 * returns false for a particular document it is excluded from the update.
 * @param {Object=} options Optional options object passed to the initial find call.
 * @returns {Array}
 */
Collection.prototype.filterUpdate = function (query, func, options) {
	var items = this.find(query, options),
		results = [],
		singleItem,
		singleQuery,
		singleUpdate,
		pk = this.primaryKey(),
		i;

	for (i = 0; i < items.length; i++) {
		singleItem = items[i];
		singleUpdate = func(singleItem);

		if (singleUpdate) {
			singleQuery = {};
			singleQuery[pk] = singleItem[pk];

			results.push(this.update(singleQuery, singleUpdate));
		}
	}

	return results;
};

/**
 * Modifies an existing document or documents in a collection.
 * This will update all matches for 'query' with the data held
 * in 'update'. It will not overwrite the matched documents
 * with the update document.
 *
 * @param {Object} query The query that must be matched for a
 * document to be operated on.
 * @param {Object} update The object containing updated
 * key/values. Any keys that match keys on the existing document
 * will be overwritten with this data. Any keys that do not
 * currently exist on the document will be added to the document.
 * @param {Object=} options An options object.
 * @param {Function=} callback The callback method to call when
 * the update is complete.
 * @returns {Array} The items that were updated.
 */
Collection.prototype.update = function (query, update, options, callback) {
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}

	// Convert queries from mongo dot notation to forerunner queries
	if (this.mongoEmulation()) {
		this.convertToFdb(query);
		this.convertToFdb(update);
	} else {
		// Decouple the update data
		update = this.decouple(update);
	}
	
	// Detect $replace operations and set flag
	if (update.$replace) {
		// Make sure we have an options object
		options = options || {};
		
		// Set the $replace flag in the options object
		options.$replace = true;
		
		// Move the replacement object out into the main update object
		update = update.$replace;
	}

	// Handle transform
	update = this.transformIn(update);

	return this._handleUpdate(query, update, options, callback);
};

/**
 * Handles the update operation that was initiated by a call to update().
 * @param {Object} query The query that must be matched for a
 * document to be operated on.
 * @param {Object} update The object containing updated
 * key/values. Any keys that match keys on the existing document
 * will be overwritten with this data. Any keys that do not
 * currently exist on the document will be added to the document.
 * @param {Object=} options An options object.
 * @param {Function=} callback The callback method to call when
 * the update is complete.
 * @returns {Array} The items that were updated.
 * @private
 */
Collection.prototype._handleUpdate = function (query, update, options, callback) {
	var self = this,
		op = this._metrics.create('update'),
		dataSet,
		updated,
		updateCall = function (referencedDoc) {
			var oldDoc = self.decouple(referencedDoc),
				newDoc,
				triggerOperation,
				result;

			if (self.willTrigger(self.TYPE_UPDATE, self.PHASE_BEFORE) || self.willTrigger(self.TYPE_UPDATE, self.PHASE_AFTER)) {
				newDoc = self.decouple(referencedDoc);

				triggerOperation = {
					type: 'update',
					query: self.decouple(query),
					update: self.decouple(update),
					options: self.decouple(options),
					op: op
				};

				// Update newDoc with the update criteria so we know what the data will look
				// like AFTER the update is processed
				result = self.updateObject(newDoc, triggerOperation.update, triggerOperation.query, triggerOperation.options, '');

				if (self.processTrigger(triggerOperation, self.TYPE_UPDATE, self.PHASE_BEFORE, referencedDoc, newDoc) !== false) {
					// No triggers complained so let's execute the replacement of the existing
					// object with the new one
					self._removeFromIndexes(referencedDoc);
					result = self.updateObject(referencedDoc, newDoc, triggerOperation.query, triggerOperation.options, '');
					self._insertIntoIndexes(referencedDoc);
					
					// NOTE: If for some reason we would only like to fire this event if changes are actually going
					// to occur on the object from the proposed update then we can add "result &&" to the if
					self.processTrigger(triggerOperation, self.TYPE_UPDATE, self.PHASE_AFTER, oldDoc, newDoc);
				} else {
					// Trigger cancelled operation so tell result that it was not updated
					result = false;
				}
			} else {
				// No triggers complained so let's execute the replacement of the existing
				// object with the new one
				self._removeFromIndexes(referencedDoc);
				result = self.updateObject(referencedDoc, update, query, options, '');
				self._insertIntoIndexes(referencedDoc);
			}

			return result;
		};

	op.start();
	op.time('Retrieve documents to update');
	dataSet = this.find(query, {$decouple: false});
	op.time('Retrieve documents to update');

	if (dataSet.length) {
		op.time('Update documents');
		updated = dataSet.filter(updateCall);
		op.time('Update documents');

		if (updated.length) {
			if (this.debug()) {
				console.log(this.logIdentifier() + ' Updated some data');
			}

			op.time('Resolve chains');
			if (this.chainWillSend()) {
				this.chainSend('update', {
					query: query,
					update: update,
					dataSet: this.decouple(updated)
				}, options);
			}
			op.time('Resolve chains');

			this._onUpdate(updated);
			this._onChange();

			if (callback) { callback.call(this, updated || []); }

			this.emit('immediateChange', {type: 'update', data: updated});
			this.deferEmit('change', {type: 'update', data: updated});
		} else {
			if (callback) { callback.call(this, updated || []); }
		}
	} else {
		if (callback) { callback.call(this, updated || []); }
	}

	op.stop();

	// TODO: Should we decouple the updated array before return by default?
	return updated || [];
};

/**
 * Replaces an existing object with data from the new object without
 * breaking data references. It does this by removing existing keys
 * from the base object and then adding the passed object's keys to
 * the existing base object, thereby maintaining any references to
 * the existing base object but effectively replacing the object with
 * the new one.
 * @param {Object} currentObj The base object to alter.
 * @param {Object} newObj The new object to overwrite the existing one
 * with.
 * @returns {*} Chain.
 * @private
 */
Collection.prototype._replaceObj = function (currentObj, newObj) {
	var i;

	// Check if the new document has a different primary key value from the existing one
	// Remove item from indexes
	this._removeFromIndexes(currentObj);

	// Remove existing keys from current object
	for (i in currentObj) {
		if (currentObj.hasOwnProperty(i)) {
			delete currentObj[i];
		}
	}

	// Add new keys to current object
	for (i in newObj) {
		if (newObj.hasOwnProperty(i)) {
			currentObj[i] = newObj[i];
		}
	}

	// Update the item in the primary index
	if (!this._insertIntoIndexes(currentObj)) {
		throw(this.logIdentifier() + ' Primary key violation in update! Key violated: ' + currentObj[this._primaryKey]);
	}

	// Update the object in the collection data
	//this._data.splice(this._data.indexOf(currentObj), 1, newObj);

	return this;
};

/**
 * Helper method to update a document via it's id.
 * @param {String} id The id of the document.
 * @param {Object} update The object containing the key/values to
 * update to.
 * @param {Object=} options An options object.
 * @param {Function=} callback The callback method to call when
 * the update is complete.
 * @returns {Object} The document that was updated or undefined
 * if no document was updated.
 */
Collection.prototype.updateById = function (id, update, options, callback) {
	var searchObj = {},
		wrappedCallback;
	
	searchObj[this._primaryKey] = id;
	
	if (callback) {
		wrappedCallback = function (data) {
			callback(data[0]);
		};
	}
	
	return this.update(searchObj, update, options, wrappedCallback)[0];
};

/**
 * Internal method for document updating.
 * @param {Object} doc The document to update.
 * @param {Object} update The object with key/value pairs to update
 * the document with.
 * @param {Object} query The query object that we need to match to
 * perform an update.
 * @param {Object} options An options object.
 * @param {String} path The current recursive path.
 * @param {String} opType The type of update operation to perform,
 * if none is specified default is to set new data against matching
 * fields.
 * @returns {Boolean} True if the document was updated with new /
 * changed data or false if it was not updated because the data was
 * the same.
 * @private
 */
Collection.prototype.updateObject = function (doc, update, query, options, path, opType) {
	// TODO: This method is long, try to break it into smaller pieces
	update = this.decouple(update);

	// Clear leading dots from path
	path = path || '';
	if (path.substr(0, 1) === '.') { path = path.substr(1, path.length -1); }

	//var oldDoc = this.decouple(doc),
	var	updated = false,
		recurseUpdated = false,
		operation,
		tmpArray,
		tmpIndex,
		tmpCount,
		tempIndex,
		tempKey,
		replaceObj,
		pk,
		pathInstance,
		sourceIsArray,
		updateIsArray,
		i;
	
	// Check if we have a $replace flag in the options object
	if (options && options.$replace === true) {
		operation = true;
		
		replaceObj = update;
		pk = this.primaryKey();
		
		// Loop the existing item properties and compare with
		// the replacement (never remove primary key)
		for (tempKey in doc) {
			if (doc.hasOwnProperty(tempKey) && tempKey !== pk) {
				if (replaceObj[tempKey] === undefined) {
					// The new document doesn't have this field, remove it from the doc
					this._updateUnset(doc, tempKey);
					updated = true;
				}
			}
		}
		
		// Loop the new item props and update the doc
		for (tempKey in replaceObj) {
			if (replaceObj.hasOwnProperty(tempKey) && tempKey !== pk) {
				this._updateOverwrite(doc, tempKey, replaceObj[tempKey]);
				updated = true;
			}
		}
		
		// Early exit
		return updated;
	}
	
	// DEVS PLEASE NOTE -- Early exit could have occurred above and code below will never be reached - Rob Evans - CEO - 05/08/2016

	// Loop each key in the update object
	for (i in update) {
		if (update.hasOwnProperty(i)) {
			// Reset operation flag
			operation = false;

			// Check if the property starts with a dollar (function)
			if (!operation && i.substr(0, 1) === '$') {
				// Check for commands
				switch (i) {
					case '$key':
					case '$index':
					case '$data':
					case '$min':
					case '$max':
						// Ignore some operators
						operation = true;
						break;

					case '$each':
						operation = true;

						// Loop over the array of updates and run each one
						tmpCount = update.$each.length;
						for (tmpIndex = 0; tmpIndex < tmpCount; tmpIndex++) {
							recurseUpdated = this.updateObject(doc, update.$each[tmpIndex], query, options, path);

							if (recurseUpdated) {
								updated = true;
							}
						}

						updated = updated || recurseUpdated;
						break;

					case '$replace':
						operation = true;
						replaceObj = update.$replace;
						pk = this.primaryKey();

						// Loop the existing item properties and compare with
						// the replacement (never remove primary key)
						for (tempKey in doc) {
							if (doc.hasOwnProperty(tempKey) && tempKey !== pk) {
								if (replaceObj[tempKey] === undefined) {
									// The new document doesn't have this field, remove it from the doc
									this._updateUnset(doc, tempKey);
									updated = true;
								}
							}
						}

						// Loop the new item props and update the doc
						for (tempKey in replaceObj) {
							if (replaceObj.hasOwnProperty(tempKey) && tempKey !== pk) {
								this._updateOverwrite(doc, tempKey, replaceObj[tempKey]);
								updated = true;
							}
						}
						break;

					case '$overwrite':
					case '$inc':
					case '$push':
					case '$splicePush':
					case '$splicePull':
					case '$addToSet':
					case '$pull':
					case '$pop':
					case '$move':
					case '$cast':
					case '$unset':
					case '$pullAll':
					case '$mul':
					case '$rename':
					case '$toggle':
						operation = true;

						// Now run the operation
						recurseUpdated = this.updateObject(doc, update[i], query, options, path, i);
						updated = updated || recurseUpdated;
						break;

					default:
						// This is an unknown operator or just
						// a normal field with a dollar starting
						// character so ignore it
						operation = false;
						break;
				}
			}

			// Check if the key has a .$ at the end, denoting an array lookup
			if (!operation && this._isPositionalKey(i)) {
				operation = true;

				// Modify i to be the name of the field
				i = i.substr(0, i.length - 2);

				pathInstance = new Path(path + '.' + i);

				// Check if the key is an array and has items
				if (doc[i] && doc[i] instanceof Array && doc[i].length) {
					tmpArray = [];

					// Loop the array and find matches to our search
					for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
						if (this._match(doc[i][tmpIndex], pathInstance.value(query)[0], options, '', {})) {
							tmpArray.push(tmpIndex);
						}
					}

					// Loop the items that matched and update them
					for (tmpIndex = 0; tmpIndex < tmpArray.length; tmpIndex++) {
						recurseUpdated = this.updateObject(doc[i][tmpArray[tmpIndex]], update[i + '.$'], query, options, path + '.' + i, opType);
						updated = updated || recurseUpdated;
					}
				}
			}

			if (!operation) {
				if (!opType && typeof(update[i]) === 'object') {
					if (doc[i] !== null && typeof(doc[i]) === 'object') {
						// Check if we are dealing with arrays
						sourceIsArray = doc[i] instanceof Array;
						updateIsArray = update[i] instanceof Array;

						if (sourceIsArray || updateIsArray) {
							// Check if the update is an object and the doc is an array
							if (!updateIsArray && sourceIsArray) {
								// Update is an object, source is an array so match the array items
								// with our query object to find the one to update inside this array

								// Loop the array and find matches to our search
								for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
									recurseUpdated = this.updateObject(doc[i][tmpIndex], update[i], query, options, path + '.' + i, opType);
									updated = updated || recurseUpdated;
								}
							} else {
								// Either both source and update are arrays or the update is
								// an array and the source is not, so set source to update
								if (doc[i] !== update[i]) {
									this._updateProperty(doc, i, update[i]);
									updated = true;
								}
							}
						} else {
							// Check if the doc key is a date instance
							if (doc[i] instanceof Date) {
								// The doc key is a date object, assign the new date
								this._updateProperty(doc, i, update[i]);
								updated = true;
							} else {
								// The doc key is an object so traverse the
								// update further
								recurseUpdated = this.updateObject(doc[i], update[i], query, options, path + '.' + i, opType);
								updated = updated || recurseUpdated;
							}
						}
					} else {
						if (doc[i] !== update[i]) {
							this._updateProperty(doc, i, update[i]);
							updated = true;
						}
					}
				} else {
					switch (opType) {
						case '$inc':
							var doUpdate = true;

							// Check for a $min / $max operator
							if (update[i] > 0) {
								if (update.$max) {
									// Check current value
									if (doc[i] >= update.$max) {
										// Don't update
										doUpdate = false;
									}
								}
							} else if (update[i] < 0) {
								if (update.$min) {
									// Check current value
									if (doc[i] <= update.$min) {
										// Don't update
										doUpdate = false;
									}
								}
							}

							if (doUpdate) {
								this._updateIncrement(doc, i, update[i]);
								updated = true;
							}
							break;

						case '$cast':
							// Casts a property to the type specified if it is not already
							// that type. If the cast is an array or an object and the property
							// is not already that type a new array or object is created and
							// set to the property, overwriting the previous value
							switch (update[i]) {
								case 'array':
									if (!(doc[i] instanceof Array)) {
										// Cast to an array
										this._updateProperty(doc, i, update.$data || []);
										updated = true;
									}
									break;

								case 'object':
									if (!(doc[i] instanceof Object) || (doc[i] instanceof Array)) {
										// Cast to an object
										this._updateProperty(doc, i, update.$data || {});
										updated = true;
									}
									break;

								case 'number':
									if (typeof doc[i] !== 'number') {
										// Cast to a number
										this._updateProperty(doc, i, Number(doc[i]));
										updated = true;
									}
									break;

								case 'string':
									if (typeof doc[i] !== 'string') {
										// Cast to a string
										this._updateProperty(doc, i, String(doc[i]));
										updated = true;
									}
									break;

								default:
									throw(this.logIdentifier() + ' Cannot update cast to unknown type: ' + update[i]);
							}

							break;

						case '$push':
							// Check if the target key is undefined and if so, create an array
							if (doc[i] === undefined) {
								// Initialise a new array
								this._updateProperty(doc, i, []);
							}

							// Check that the target key is an array
							if (doc[i] instanceof Array) {
								// Check for a $position modifier with an $each
								if (update[i].$position !== undefined && update[i].$each instanceof Array) {
									// Grab the position to insert at
									tempIndex = update[i].$position;

									// Loop the each array and push each item
									tmpCount = update[i].$each.length;
									for (tmpIndex = 0; tmpIndex < tmpCount; tmpIndex++) {
										this._updateSplicePush(doc[i], tempIndex + tmpIndex, update[i].$each[tmpIndex]);
									}
								} else if (update[i].$each instanceof Array) {
									// Do a loop over the each to push multiple items
									tmpCount = update[i].$each.length;
									for (tmpIndex = 0; tmpIndex < tmpCount; tmpIndex++) {
										this._updatePush(doc[i], update[i].$each[tmpIndex]);
									}
								} else {
									// Do a standard push
									this._updatePush(doc[i], update[i]);
								}
								updated = true;
							} else {
								throw(this.logIdentifier() + ' Cannot push to a key that is not an array! (' + i + ')');
							}
							break;

						case '$pull':
							if (doc[i] instanceof Array) {
								tmpArray = [];

								// Loop the array and find matches to our search
								for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
									if (this._match(doc[i][tmpIndex], update[i], options, '', {})) {
										tmpArray.push(tmpIndex);
									}
								}

								tmpCount = tmpArray.length;

								// Now loop the pull array and remove items to be pulled
								while (tmpCount--) {
									this._updatePull(doc[i], tmpArray[tmpCount]);
									updated = true;
								}
							}
							break;

						case '$pullAll':
							if (doc[i] instanceof Array) {
								if (update[i] instanceof Array) {
									tmpArray = doc[i];
									tmpCount = tmpArray.length;

									if (tmpCount > 0) {
										// Now loop the pull array and remove items to be pulled
										while (tmpCount--) {
											for (tempIndex = 0; tempIndex < update[i].length; tempIndex++) {
												if (tmpArray[tmpCount] === update[i][tempIndex]) {
													this._updatePull(doc[i], tmpCount);
													tmpCount--;
													updated = true;
												}
											}

											if (tmpCount < 0) {
												break;
											}
										}
									}
								} else {
									throw(this.logIdentifier() + ' Cannot pullAll without being given an array of values to pull! (' + i + ')');
								}
							}
							break;

						case '$addToSet':
							// Check if the target key is undefined and if so, create an array
							if (doc[i] === undefined) {
								// Initialise a new array
								this._updateProperty(doc, i, []);
							}

							// Check that the target key is an array
							if (doc[i] instanceof Array) {
								// Loop the target array and check for existence of item
								var targetArr = doc[i],
									targetArrIndex,
									targetArrCount = targetArr.length,
									objHash,
									addObj = true,
									optionObj = (options && options.$addToSet),
									hashMode,
									pathSolver;

								// Check if we have an options object for our operation
								if (update[i].$key) {
									hashMode = false;
									pathSolver = new Path(update[i].$key);
									objHash = pathSolver.value(update[i])[0];

									// Remove the key from the object before we add it
									delete update[i].$key;
								} else if (optionObj && optionObj.key) {
									hashMode = false;
									pathSolver = new Path(optionObj.key);
									objHash = pathSolver.value(update[i])[0];
								} else {
									objHash = this.jStringify(update[i]);
									hashMode = true;
								}

								for (targetArrIndex = 0; targetArrIndex < targetArrCount; targetArrIndex++) {
									if (hashMode) {
										// Check if objects match via a string hash (JSON)
										if (this.jStringify(targetArr[targetArrIndex]) === objHash) {
											// The object already exists, don't add it
											addObj = false;
											break;
										}
									} else {
										// Check if objects match based on the path
										if (objHash === pathSolver.value(targetArr[targetArrIndex])[0]) {
											// The object already exists, don't add it
											addObj = false;
											break;
										}
									}
								}

								if (addObj) {
									this._updatePush(doc[i], update[i]);
									updated = true;
								}
							} else {
								throw(this.logIdentifier() + ' Cannot addToSet on a key that is not an array! (' + i + ')');
							}
							break;

						case '$splicePush':
							// Check if the target key is undefined and if so, create an array
							if (doc[i] === undefined) {
								// Initialise a new array
								this._updateProperty(doc, i, []);
							}

							// Check that the target key is an array
							if (doc[i] instanceof Array) {
								tempIndex = update.$index;

								if (tempIndex !== undefined) {
									delete update.$index;

									// Check for out of bounds index
									if (tempIndex > doc[i].length) {
										tempIndex = doc[i].length;
									}

									this._updateSplicePush(doc[i], tempIndex, update[i]);
									updated = true;
								} else {
									throw(this.logIdentifier() + ' Cannot splicePush without a $index integer value!');
								}
							} else {
								throw(this.logIdentifier() + ' Cannot splicePush with a key that is not an array! (' + i + ')');
							}
							break;

						case '$splicePull':
							// Check that the target key is not undefined
							if (doc[i] !== undefined) {
								// Check that the target key is an array
								if (doc[i] instanceof Array) {
									tempIndex = update[i].$index;

									if (tempIndex !== undefined) {

										// Check for in bounds index
										if (tempIndex < doc[i].length) {
											this._updateSplicePull(doc[i], tempIndex);
											updated = true;
										}
									} else {
										throw(this.logIdentifier() + ' Cannot splicePull without a $index integer value!');
									}
								} else {
									throw(this.logIdentifier() + ' Cannot splicePull from a key that is not an array! (' + i + ')');
								}
							}
							break;

						case '$move':
							if (doc[i] instanceof Array) {
								// Loop the array and find matches to our search
								for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
									if (this._match(doc[i][tmpIndex], update[i], options, '', {})) {
										var moveToIndex = update.$index;

										if (moveToIndex !== undefined) {
											delete update.$index;

											this._updateSpliceMove(doc[i], tmpIndex, moveToIndex);
											updated = true;
										} else {
											throw(this.logIdentifier() + ' Cannot move without a $index integer value!');
										}
										break;
									}
								}
							} else {
								throw(this.logIdentifier() + ' Cannot move on a key that is not an array! (' + i + ')');
							}
							break;

						case '$mul':
							this._updateMultiply(doc, i, update[i]);
							updated = true;
							break;

						case '$rename':
							this._updateRename(doc, i, update[i]);
							updated = true;
							break;

						case '$overwrite':
							this._updateOverwrite(doc, i, update[i]);
							updated = true;
							break;

						case '$unset':
							this._updateUnset(doc, i);
							updated = true;
							break;

						case '$clear':
							this._updateClear(doc, i);
							updated = true;
							break;

						case '$pop':
							if (doc[i] instanceof Array) {
								if (this._updatePop(doc[i], update[i])) {
									updated = true;
								}
							} else {
								throw(this.logIdentifier() + ' Cannot pop from a key that is not an array! (' + i + ')');
							}
							break;

						case '$toggle':
							// Toggle the boolean property between true and false
							this._updateProperty(doc, i, !doc[i]);
							updated = true;
							break;

						default:
							if (doc[i] !== update[i]) {
								this._updateProperty(doc, i, update[i]);
								updated = true;
							}
							break;
					}
				}
			}
		}
	}

	return updated;
};

/**
 * Determines if the passed key has an array positional mark
 * (a dollar at the end of its name).
 * @param {String} key The key to check.
 * @returns {Boolean} True if it is a positional or false if not.
 * @private
 */
Collection.prototype._isPositionalKey = function (key) {
	return key.substr(key.length - 2, 2) === '.$';
};

/**
 * Removes any documents from the collection that match the search
 * query key/values.
 * @param {Object=} query The query identifying the documents to remove. If no
 * query object is passed, all documents will be removed from the collection.
 * @param {Object=} options An options object.
 * @param {Function=} callback A callback method.
 * @returns {Array} An array of the documents that were removed.
 */
Collection.prototype.remove = function (query, options, callback) {
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}

	var self = this,
		dataSet,
		index,
		arrIndex,
		returnArr,
		removeMethod,
		triggerOperation,
		doc,
		newDoc;

	if (typeof(options) === 'function') {
		callback = options;
		options = {};
	}

	// Convert queries from mongo dot notation to forerunner queries
	if (this.mongoEmulation()) {
		this.convertToFdb(query);
	}

	if (query instanceof Array) {
		returnArr = [];

		for (arrIndex = 0; arrIndex < query.length; arrIndex++) {
			returnArr.push(this.remove(query[arrIndex], {noEmit: true}));
		}

		if (!options || (options && !options.noEmit)) {
			this._onRemove(returnArr);
		}

		if (callback) { callback.call(this, false, returnArr); }
		return returnArr;
	} else {
		returnArr = [];
		dataSet = this.find(query, {$decouple: false});

		if (dataSet.length) {
			removeMethod = function (dataItem) {
				// Remove the item from the collection's indexes
				self._removeFromIndexes(dataItem);

				// Remove data from internal stores
				index = self._data.indexOf(dataItem);
				self._dataRemoveAtIndex(index);

				returnArr.push(dataItem);
			};

			// Remove the data from the collection
			for (var i = 0; i < dataSet.length; i++) {
				doc = dataSet[i];

				if (self.willTrigger(self.TYPE_REMOVE, self.PHASE_BEFORE) || self.willTrigger(self.TYPE_REMOVE, self.PHASE_AFTER)) {
					triggerOperation = {
						type: 'remove'
					};

					newDoc = self.decouple(doc);

					if (self.processTrigger(triggerOperation, self.TYPE_REMOVE, self.PHASE_BEFORE, newDoc, newDoc) !== false) {
						// The trigger didn't ask to cancel so execute the removal method
						removeMethod(doc);

						self.processTrigger(triggerOperation, self.TYPE_REMOVE, self.PHASE_AFTER, newDoc, newDoc);
					}
				} else {
					// No triggers to execute
					removeMethod(doc);
				}
			}

			if (returnArr.length) {
				//op.time('Resolve chains');
				self.chainSend('remove', {
					query: query,
					dataSet: returnArr
				}, options);
				//op.time('Resolve chains');

				if (!options || (options && !options.noEmit)) {
					this._onRemove(returnArr);
				}

				this._onChange();
				this.emit('immediateChange', {type: 'remove', data: returnArr});
				this.deferEmit('change', {type: 'remove', data: returnArr});
			}
		}

		if (callback) { callback.call(this, false, returnArr); }
		return returnArr;
	}
};

/**
 * Helper method that removes a document that matches the given id.
 * @param {String} id The id of the document to remove.
 * @returns {Object} The document that was removed or undefined if
 * nothing was removed.
 */
Collection.prototype.removeById = function (id) {
	var searchObj = {};
	searchObj[this._primaryKey] = id;
	return this.remove(searchObj)[0];
};

/**
 * Processes a deferred action queue.
 * @param {String} type The queue name to process.
 * @param {Function} callback A method to call when the queue has processed.
 * @param {Object=} resultObj A temp object to hold results in.
 */
Collection.prototype.processQueue = function (type, callback, resultObj) {
	var self = this,
		queue = this._deferQueue[type],
		deferThreshold = this._deferThreshold[type],
		deferTime = this._deferTime[type],
		dataArr,
		result;

	resultObj = resultObj || {
		deferred: true
	};

	if (queue.length) {
		// Process items up to the threshold
		if (queue.length > deferThreshold) {
			// Grab items up to the threshold value
			dataArr = queue.splice(0, deferThreshold);
		} else {
			// Grab all the remaining items
			dataArr = queue.splice(0, queue.length);
		}

		result = self[type](dataArr);

		switch (type) {
			case 'insert':
				resultObj.inserted = resultObj.inserted || [];
				resultObj.failed = resultObj.failed || [];

				resultObj.inserted = resultObj.inserted.concat(result.inserted);
				resultObj.failed = resultObj.failed.concat(result.failed);
				break;
		}

		// Queue another process
		setTimeout(function () {
			self.processQueue.call(self, type, callback, resultObj);
		}, deferTime);
	} else {
		if (callback) { callback.call(this, resultObj); }

		this._asyncComplete(type);
	}

	// Check if all queues are complete
	if (!this.isProcessingQueue()) {
		this.deferEmit('queuesComplete');
	}
};

/**
 * Checks if any CRUD operations have been deferred and are still waiting to
 * be processed.
 * @returns {Boolean} True if there are still deferred CRUD operations to process
 * or false if all queues are clear.
 */
Collection.prototype.isProcessingQueue = function () {
	var i;

	for (i in this._deferQueue) {
		if (this._deferQueue.hasOwnProperty(i)) {
			if (this._deferQueue[i].length) {
				return true;
			}
		}
	}

	return false;
};

/**
 * Inserts a document or array of documents into the collection.
 * @param {Object|Array} data Either a document object or array of document
 * @param {Number=} index Optional index to insert the record at.
 * @param {Collection.insertCallback=} callback Optional callback called
 * once the insert is complete.
 */
Collection.prototype.insert = function (data, index, callback) {
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}

	if (typeof(index) === 'function') {
		callback = index;
		index = this._data.length;
	} else if (index === undefined) {
		index = this._data.length;
	}

	data = this.transformIn(data);
	return this._insertHandle(data, index, callback);
};
/**
 * The insert operation's callback.
 * @name Collection.insertCallback
 * @callback Collection.insertCallback
 * @param {Object} result The result object will contain two arrays (inserted
 * and failed) which represent the documents that did get inserted and those
 * that didn't for some reason (usually index violation). Failed items also
 * contain a reason. Inspect the failed array for further information.
 *
 * A third field called "deferred" is a boolean value to indicate if the
 * insert operation was deferred across more than one CPU cycle (to avoid
 * blocking the main thread).
 */

/**
 * Inserts a document or array of documents into the collection.
 * @param {Object|Array} data Either a document object or array of document
 * @param {Number=} index Optional index to insert the record at.
 * @param {Collection.insertCallback=} callback Optional callback called
 * once the insert is complete.
 */
Collection.prototype._insertHandle = function (data, index, callback) {
	var //self = this,
		queue = this._deferQueue.insert,
		deferThreshold = this._deferThreshold.insert,
		//deferTime = this._deferTime.insert,
		inserted = [],
		failed = [],
		insertResult,
		resultObj,
		i;

	if (data instanceof Array) {
		// Check if there are more insert items than the insert defer
		// threshold, if so, break up inserts so we don't tie up the
		// ui or thread
		if (this._deferredCalls && data.length > deferThreshold) {
			// Break up insert into blocks
			this._deferQueue.insert = queue.concat(data);
			this._asyncPending('insert');

			// Fire off the insert queue handler
			this.processQueue('insert', callback);

			return;
		} else {
			// Loop the array and add items
			for (i = 0; i < data.length; i++) {
				insertResult = this._insert(data[i], index + i);

				if (insertResult === true) {
					inserted.push(data[i]);
				} else {
					failed.push({
						doc: data[i],
						reason: insertResult
					});
				}
			}
		}
	} else {
		// Store the data item
		insertResult = this._insert(data, index);

		if (insertResult === true) {
			inserted.push(data);
		} else {
			failed.push({
				doc: data,
				reason: insertResult
			});
		}
	}

	resultObj = {
		deferred: false,
		inserted: inserted,
		failed: failed
	};

	this._onInsert(inserted, failed);
	if (callback) { callback.call(this, resultObj); }

	this._onChange();
	this.emit('immediateChange', {type: 'insert', data: inserted, failed: failed});
	this.deferEmit('change', {type: 'insert', data: inserted, failed: failed});

	return resultObj;
};

/**
 * Internal method to insert a document into the collection. Will
 * check for index violations before allowing the document to be inserted.
 * @param {Object} doc The document to insert after passing index violation
 * tests.
 * @param {Number=} index Optional index to insert the document at.
 * @returns {Boolean|Object} True on success, false if no document passed,
 * or an object containing details about an index violation if one occurred.
 * @private
 */
Collection.prototype._insert = function (doc, index) {
	if (doc) {
		var self = this,
			indexViolation,
			triggerOperation,
			insertMethod,
			newDoc,
			capped = this.capped(),
			cappedSize = this.cappedSize();

		this.ensurePrimaryKey(doc);

		// Check indexes are not going to be broken by the document
		indexViolation = this.insertIndexViolation(doc);

		insertMethod = function (doc) {
			// Add the item to the collection's indexes
			self._insertIntoIndexes(doc);

			// Check index overflow
			if (index > self._data.length) {
				index = self._data.length;
			}

			// Insert the document
			self._dataInsertAtIndex(index, doc);

			// Check capped collection status and remove first record
			// if we are over the threshold
			if (capped && self._data.length > cappedSize) {
				// Remove the first item in the data array
				self.removeById(self._data[0][self._primaryKey]);
			}

			//op.time('Resolve chains');
			if (self.chainWillSend()) {
				self.chainSend('insert', {
					dataSet: self.decouple([doc])
				}, {
					index: index
				});
			}
			//op.time('Resolve chains');
		};

		if (!indexViolation) {
			if (self.willTrigger(self.TYPE_INSERT, self.PHASE_BEFORE) || self.willTrigger(self.TYPE_INSERT, self.PHASE_AFTER)) {
				triggerOperation = {
					type: 'insert'
				};

				if (self.processTrigger(triggerOperation, self.TYPE_INSERT, self.PHASE_BEFORE, {}, doc) !== false) {
					insertMethod(doc);

					if (self.willTrigger(self.TYPE_INSERT, self.PHASE_AFTER)) {
						// Clone the doc so that the programmer cannot update the internal document
						// on the "after" phase trigger
						newDoc = self.decouple(doc);

						self.processTrigger(triggerOperation, self.TYPE_INSERT, self.PHASE_AFTER, {}, newDoc);
					}
				} else {
					// The trigger just wants to cancel the operation
					return 'Trigger cancelled operation';
				}
			} else {
				// No triggers to execute
				insertMethod(doc);
			}

			return true;
		} else {
			return 'Index violation in index: ' + indexViolation;
		}
	}

	return 'No document passed to insert';
};

/**
 * Inserts a document into the internal collection data array at
 * Inserts a document into the internal collection data array at
 * the specified index.
 * @param {Number} index The index to insert at.
 * @param {Object} doc The document to insert.
 * @private
 */
Collection.prototype._dataInsertAtIndex = function (index, doc) {
	this._data.splice(index, 0, doc);
};

/**
 * Removes a document from the internal collection data array at
 * the specified index.
 * @param {Number} index The index to remove from.
 * @private
 */
Collection.prototype._dataRemoveAtIndex = function (index) {
	this._data.splice(index, 1);
};

/**
 * Replaces all data in the collection's internal data array with
 * the passed array of data.
 * @param {Array} data The array of data to replace existing data with.
 * @private
 */
Collection.prototype._dataReplace = function (data) {
	// Clear the array - using a while loop with pop is by far the
	// fastest way to clear an array currently
	while (this._data.length) {
		this._data.pop();
	}

	// Append new items to the array
	this._data = this._data.concat(data);
};

/**
 * Inserts a document into the collection indexes.
 * @param {Object} doc The document to insert.
 * @private
 */
Collection.prototype._insertIntoIndexes = function (doc) {
	var arr = this._indexByName,
		arrIndex,
		violated,
		hash = this.hash(doc),
		pk = this._primaryKey;

	// Insert to primary key index
	violated = this._primaryIndex.uniqueSet(doc[pk], doc);
	this._primaryCrc.uniqueSet(doc[pk], hash);
	this._crcLookup.uniqueSet(hash, doc);

	// Insert into other indexes
	for (arrIndex in arr) {
		if (arr.hasOwnProperty(arrIndex)) {
			arr[arrIndex].insert(doc);
		}
	}

	return violated;
};

/**
 * Removes a document from the collection indexes.
 * @param {Object} doc The document to remove.
 * @private
 */
Collection.prototype._removeFromIndexes = function (doc) {
	var arr = this._indexByName,
		arrIndex,
		hash = this.hash(doc),
		pk = this._primaryKey;

	// Remove from primary key index
	this._primaryIndex.unSet(doc[pk]);
	this._primaryCrc.unSet(doc[pk]);
	this._crcLookup.unSet(hash);

	// Remove from other indexes
	for (arrIndex in arr) {
		if (arr.hasOwnProperty(arrIndex)) {
			arr[arrIndex].remove(doc);
		}
	}
};

/**
 * Updates collection index data for the passed document.
 * @param {Object} oldDoc The old document as it was before the update (must be
 * actual reference to original document).
 * @param {Object} newDoc The document as it now is after the update.
 * @private
 */
Collection.prototype._updateIndexes = function (oldDoc, newDoc) {
	this._removeFromIndexes(oldDoc);
	this._insertIntoIndexes(newDoc);
};

/**
 * Rebuild collection indexes.
 * @private
 */
Collection.prototype._rebuildIndexes = function () {
	var arr = this._indexByName,
		arrIndex;

	// Remove from other indexes
	for (arrIndex in arr) {
		if (arr.hasOwnProperty(arrIndex)) {
			arr[arrIndex].rebuild();
		}
	}
};

/**
 * Uses the passed query to generate a new collection with results
 * matching the query parameters.
 *
 * @param {Object} query The query object to generate the subset with.
 * @param {Object=} options An options object.
 * @returns {*}
 */
Collection.prototype.subset = function (query, options) {
	var result = this.find(query, options),
		coll;

	coll = new Collection();
	coll.db(this._db);

	coll.subsetOf(this)
		.primaryKey(this._primaryKey)
		.setData(result);

	return coll;
};

/**
 * Gets / sets the collection that this collection is a subset of.
 * @param {Collection=} collection The collection to set as the parent of this subset.
 * @returns {Collection}
 */
Shared.synthesize(Collection.prototype, 'subsetOf');

/**
 * Checks if the collection is a subset of the passed collection.
 * @param {Collection} collection The collection to test against.
 * @returns {Boolean} True if the passed collection is the parent of
 * the current collection.
 */
Collection.prototype.isSubsetOf = function (collection) {
	return this._subsetOf === collection;
};

/**
 * Find the distinct values for a specified field across a single collection and
 * returns the values as a results array.
 * @param {String} path The field path to return distinct values for e.g. "person.name".
 * @param {Object=} query The query to use to filter the documents used to return values from.
 * @param {Object=} options The query options to use when running the query.
 * @returns {Array}
 */
Collection.prototype.distinct = function (path, query, options) {
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}

	var data = this.find(query, options),
		pathSolver = new Path(),
		valueUsed = {},
		distinctValues = [],
		aggregatedValues,
		value,
		i;
	
	// Get path values as an array
	aggregatedValues = pathSolver.aggregate(data, path);
	
	// Loop the data and build array of distinct values
	for (i = 0; i < aggregatedValues.length; i++) {
		value = aggregatedValues[i];
		
		if (value && !valueUsed[value]) {
			valueUsed[value] = true;
			distinctValues.push(value);
		}
	}

	return distinctValues;
};

/**
 * Helper method to find a document by it's id.
 * @param {String} id The id of the document.
 * @param {Object=} options The options object, allowed keys are sort and limit.
 * @returns {Array} The items that were updated.
 */
Collection.prototype.findById = function (id, options) {
	var searchObj = {};
	searchObj[this._primaryKey] = id;
	return this.find(searchObj, options)[0];
};

/**
 * Finds all documents that contain the passed string or search object
 * regardless of where the string might occur within the document. This
 * will match strings from the start, middle or end of the document's
 * string (partial match).
 * @param {String} search The string to search for. Case sensitive.
 * @param {Object=} options A standard find() options object.
 * @returns {Array} An array of documents that matched the search string.
 */
Collection.prototype.peek = function (search, options) {
	// Loop all items
	var arr = this._data,
		arrCount = arr.length,
		arrIndex,
		arrItem,
		tempColl = new Collection(),
		typeOfSearch = typeof search;

	if (typeOfSearch === 'string') {
		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			// Get json representation of object
			arrItem = this.jStringify(arr[arrIndex]);

			// Check if string exists in object json
			if (arrItem.indexOf(search) > -1) {
				// Add this item to the temp collection
				tempColl.insert(arr[arrIndex]);
			}
		}

		return tempColl.find({}, options);
	} else {
		return this.find(search, options);
	}
};

/**
 * Provides a query plan / operations log for a query.
 * @param {Object} query The query to execute.
 * @param {Object=} options Optional options object.
 * @returns {Object} The query plan.
 */
Collection.prototype.explain = function (query, options) {
	var result = this.find(query, options);
	return result.__fdbOp._data;
};

/**
 * Generates an options object with default values or adds default
 * values to a passed object if those values are not currently set
 * to anything.
 * @param {Object=} obj Optional options object to modify.
 * @returns {Object} The options object.
 */
Collection.prototype.options = function (obj) {
	obj = obj || {};
	obj.$decouple = obj.$decouple !== undefined ? obj.$decouple : true;
	obj.$explain = obj.$explain !== undefined ? obj.$explain : false;
	
	return obj;
};

/**
 * Queries the collection based on the query object passed.
 * @param {Object} query The query key/values that a document must match in
 * order for it to be returned in the result array.
 * @param {Object=} options An optional options object.
 * @param {Function=} callback !! DO NOT USE, THIS IS NON-OPERATIONAL !!
 * Optional callback. If specified the find process
 * will not return a value and will assume that you wish to operate under an
 * async mode. This will break up large find requests into smaller chunks and
 * process them in a non-blocking fashion allowing large datasets to be queried
 * without causing the browser UI to pause. Results from this type of operation
 * will be passed back to the callback once completed.
 *
 * @returns {Array} The results array from the find operation, containing all
 * documents that matched the query.
 */
Collection.prototype.find = function (query, options, callback) {
	// Convert queries from mongo dot notation to forerunner queries
	if (this.mongoEmulation()) {
		this.convertToFdb(query);
	}

	if (callback) {
		// Check the size of the collection's data array

		// Split operation into smaller tasks and callback when complete
		callback.call(this, 'Callbacks for the find() operation are not yet implemented!', []);
		return [];
	}

	return this._find.call(this, query, options, callback);
};

Collection.prototype._find = function (query, options) {
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}

	// TODO: This method is quite long, break into smaller pieces
	query = query || {};

	var op = this._metrics.create('find'),
		pk = this.primaryKey(),
		self = this,
		analysis,
		scanLength,
		requiresTableScan = true,
		resultArr,
		joinIndex,
		joinSource = {},
		joinQuery,
		joinPath,
		joinSourceKey,
		joinSourceType,
		joinSourceIdentifier,
		joinSourceData,
		resultRemove = [],
		i, j, k,
		fieldListOn = [],
		fieldListOff = [],
		elemMatchPathSolver,
		elemMatchSubArr,
		elemMatchSpliceArr,
		matcherTmpOptions = {},
		result,
		cursor = {},
		pathSolver,
		waterfallCollection,
		matcher;

	if (!(options instanceof Array)) {
		options = this.options(options);
	}

	matcher = function (doc) {
		return self._match(doc, query, options, 'and', matcherTmpOptions);
	};

	op.start();
	if (query) {
		// Check if the query is an array (multi-operation waterfall query)
		if (query instanceof Array) {
			waterfallCollection = this;

			// Loop the query operations
			for (i = 0; i < query.length; i++) {
				// Execute each operation and pass the result into the next
				// query operation
				waterfallCollection = waterfallCollection.subset(query[i], options && options[i] ? options[i] : {});
			}

			return waterfallCollection.find();
		}

		// Pre-process any data-changing query operators first
		if (query.$findSub) {
			// Check we have all the parts we need
			if (!query.$findSub.$path) {
				throw('$findSub missing $path property!');
			}

			return this.findSub(
				query.$findSub.$query,
				query.$findSub.$path,
				query.$findSub.$subQuery,
				query.$findSub.$subOptions
			);
		}

		if (query.$findSubOne) {
			// Check we have all the parts we need
			if (!query.$findSubOne.$path) {
				throw('$findSubOne missing $path property!');
			}

			return this.findSubOne(
				query.$findSubOne.$query,
				query.$findSubOne.$path,
				query.$findSubOne.$subQuery,
				query.$findSubOne.$subOptions
			);
		}

		// Get query analysis to execute best optimised code path
		op.time('analyseQuery');
		analysis = this._analyseQuery(self.decouple(query), options, op);
		op.time('analyseQuery');
		op.data('analysis', analysis);

		// Check if the query tries to limit by data that would only exist after
		// the join operation has been completed
		if (analysis.hasJoin && analysis.queriesJoin) {
			// The query has a join and tries to limit by it's joined data
			// Get references to the join sources
			op.time('joinReferences');
			for (joinIndex = 0; joinIndex < analysis.joinsOn.length; joinIndex++) {
				joinSourceData = analysis.joinsOn[joinIndex];
				joinSourceKey = joinSourceData.key;

				joinSourceType = joinSourceData.type;
				joinSourceIdentifier = joinSourceData.id;

				joinPath = new Path(analysis.joinQueries[joinSourceKey]);
				joinQuery = joinPath.value(query)[0];

				joinSource[joinSourceIdentifier] = this._db[joinSourceType](joinSourceKey).subset(joinQuery);

				// Remove join clause from main query
				delete query[analysis.joinQueries[joinSourceKey]];
			}
			op.time('joinReferences');
		}

		// Check if an index lookup can be used to return this result
		if (analysis.indexMatch.length && (!options || (options && !options.$skipIndex))) {
			op.data('index.potential', analysis.indexMatch);
			op.data('index.used', analysis.indexMatch[0].index);

			// Get the data from the index
			op.time('indexLookup');
			resultArr = [].concat(analysis.indexMatch[0].lookup) || [];
			op.time('indexLookup');

			// Check if the index coverage is all keys, if not we still need to table scan it
			if (analysis.indexMatch[0].keyData.totalKeyCount === analysis.indexMatch[0].keyData.score) {
				// Don't require a table scan to find relevant documents
				requiresTableScan = false;
			}
		} else {
			op.flag('usedIndex', false);
		}

		if (requiresTableScan) {
			if (resultArr && resultArr.length) {
				scanLength = resultArr.length;
				op.time('tableScan: ' + scanLength);
				// Filter the source data and return the result
				resultArr = resultArr.filter(matcher);
			} else {
				// Filter the source data and return the result
				scanLength = this._data.length;
				op.time('tableScan: ' + scanLength);
				resultArr = this._data.filter(matcher);
			}

			op.time('tableScan: ' + scanLength);
		}

		// Order the array if we were passed a sort clause
		if (options.$orderBy) {
			op.time('sort');
			resultArr = this.sort(options.$orderBy, resultArr);
			op.time('sort');
		}

		if (options.$page !== undefined && options.$limit !== undefined) {
			// Record paging data
			cursor.page = options.$page;
			cursor.pages = Math.ceil(resultArr.length / options.$limit);
			cursor.records = resultArr.length;

			// Check if we actually need to apply the paging logic
			if (options.$page && options.$limit > 0) {
				op.data('cursor', cursor);

				// Skip to the page specified based on limit
				resultArr.splice(0, options.$page * options.$limit);
			}
		}

		if (options.$skip) {
			cursor.skip = options.$skip;

			// Skip past the number of records specified
			resultArr.splice(0, options.$skip);
			op.data('skip', options.$skip);
		}

		if (options.$limit && resultArr && resultArr.length > options.$limit) {
			cursor.limit = options.$limit;

			resultArr.length = options.$limit;
			op.data('limit', options.$limit);
		}

		if (options.$decouple) {
			// Now decouple the data from the original objects
			op.time('decouple');
			resultArr = this.decouple(resultArr);
			op.time('decouple');
			op.data('flag.decouple', true);
		}

		// Now process any joins on the final data
		if (options.$join) {
			resultRemove = resultRemove.concat(this.applyJoin(resultArr, options.$join, joinSource));
			op.data('flag.join', true);
		}

		// Process removal queue
		if (resultRemove.length) {
			op.time('removalQueue');
			this.spliceArrayByIndexList(resultArr, resultRemove);
			op.time('removalQueue');
		}

		if (options.$transform) {
			op.time('transform');
			for (i = 0; i < resultArr.length; i++) {
				resultArr.splice(i, 1, options.$transform(resultArr[i]));
			}
			op.time('transform');
			op.data('flag.transform', true);
		}

		// Process transforms
		if (this._transformEnabled && this._transformOut) {
			op.time('transformOut');
			resultArr = this.transformOut(resultArr);
			op.time('transformOut');
		}

		op.data('results', resultArr.length);
	} else {
		resultArr = [];
	}

	// Check for an $as operator in the options object and if it exists
	// iterate over the fields and generate a rename function that will
	// operate over the entire returned data array and rename each object's
	// fields to their new names
	// TODO: Enable $as in collection find to allow renaming fields
	/*if (options.$as) {
		renameFieldPath = new Path();
		renameFieldMethod = function (obj, oldFieldPath, newFieldName) {
			renameFieldPath.path(oldFieldPath);
			renameFieldPath.rename(newFieldName);
		};

		for (i in options.$as) {
			if (options.$as.hasOwnProperty(i)) {

			}
		}
	}*/

	if (!options.$aggregate) {
		// Generate a list of fields to limit data by
		// Each property starts off being enabled by default (= 1) then
		// if any property is explicitly specified as 1 then all switch to
		// zero except _id.
		//
		// Any that are explicitly set to zero are switched off.
		op.time('scanFields');
		for (i in options) {
			if (options.hasOwnProperty(i) && i.indexOf('$') !== 0) {
				if (options[i] === 1) {
					fieldListOn.push(i);
				} else if (options[i] === 0) {
					fieldListOff.push(i);
				}
			}
		}
		op.time('scanFields');

		// Limit returned fields by the options data
		if (fieldListOn.length || fieldListOff.length) {
			op.data('flag.limitFields', true);
			op.data('limitFields.on', fieldListOn);
			op.data('limitFields.off', fieldListOff);

			op.time('limitFields');

			// We have explicit fields switched on or off
			for (i = 0; i < resultArr.length; i++) {
				result = resultArr[i];

				for (j in result) {
					if (result.hasOwnProperty(j)) {
						if (fieldListOn.length) {
							// We have explicit fields switched on so remove all fields
							// that are not explicitly switched on

							// Check if the field name is not the primary key
							if (j !== pk) {
								if (fieldListOn.indexOf(j) === -1) {
									// This field is not in the on list, remove it
									delete result[j];
								}
							}
						}

						if (fieldListOff.length) {
							// We have explicit fields switched off so remove fields
							// that are explicitly switched off
							if (fieldListOff.indexOf(j) > -1) {
								// This field is in the off list, remove it
								delete result[j];
							}
						}
					}
				}
			}

			op.time('limitFields');
		}

		// Now run any projections on the data required
		if (options.$elemMatch) {
			op.data('flag.elemMatch', true);
			op.time('projection-elemMatch');

			for (i in options.$elemMatch) {
				if (options.$elemMatch.hasOwnProperty(i)) {
					elemMatchPathSolver = new Path(i);

					// Loop the results array
					for (j = 0; j < resultArr.length; j++) {
						elemMatchSubArr = elemMatchPathSolver.value(resultArr[j])[0];

						// Check we have a sub-array to loop
						if (elemMatchSubArr && elemMatchSubArr.length) {

							// Loop the sub-array and check for projection query matches
							for (k = 0; k < elemMatchSubArr.length; k++) {

								// Check if the current item in the sub-array matches the projection query
								if (self._match(elemMatchSubArr[k], options.$elemMatch[i], options, '', {})) {
									// The item matches the projection query so set the sub-array
									// to an array that ONLY contains the matching item and then
									// exit the loop since we only want to match the first item
									elemMatchPathSolver.set(resultArr[j], i, [elemMatchSubArr[k]]);
									break;
								}
							}
						}
					}
				}
			}

			op.time('projection-elemMatch');
		}

		if (options.$elemsMatch) {
			op.data('flag.elemsMatch', true);
			op.time('projection-elemsMatch');

			for (i in options.$elemsMatch) {
				if (options.$elemsMatch.hasOwnProperty(i)) {
					elemMatchPathSolver = new Path(i);

					// Loop the results array
					for (j = 0; j < resultArr.length; j++) {
						elemMatchSubArr = elemMatchPathSolver.value(resultArr[j])[0];

						// Check we have a sub-array to loop
						if (elemMatchSubArr && elemMatchSubArr.length) {
							elemMatchSpliceArr = [];

							// Loop the sub-array and check for projection query matches
							for (k = 0; k < elemMatchSubArr.length; k++) {

								// Check if the current item in the sub-array matches the projection query
								if (self._match(elemMatchSubArr[k], options.$elemsMatch[i], options, '', {})) {
									// The item matches the projection query so add it to the final array
									elemMatchSpliceArr.push(elemMatchSubArr[k]);
								}
							}

							// Now set the final sub-array to the matched items
							elemMatchPathSolver.set(resultArr[j], i, elemMatchSpliceArr);
						}
					}
				}
			}

			op.time('projection-elemsMatch');
		}
	}

	// Process aggregation
	if (options.$aggregate) {
		op.data('flag.aggregate', true);
		op.time('aggregate');
		pathSolver = new Path();
		resultArr = pathSolver.aggregate(resultArr, options.$aggregate);
		op.time('aggregate');
	}

	// Now process any $groupBy clause
	if (options.$groupBy) {
		op.data('flag.group', true);
		op.time('group');
		resultArr = this.group(options.$groupBy, resultArr);
		op.time('group');
	}

	op.stop();
	resultArr.__fdbOp = op;
	resultArr.$cursor = cursor;
	return resultArr;
};

/**
 * Returns one document that satisfies the specified query criteria. If multiple
 * documents satisfy the query, this method returns the first document to match
 * the query.
 * @returns {*}
 */
Collection.prototype.findOne = function () {
	return (this.find.apply(this, arguments))[0];
};

/**
 * Gets the index in the collection data array of the first item matched by
 * the passed query object.
 * @param {Object} query The query to run to find the item to return the index of.
 * @param {Object=} options An options object.
 * @returns {Number}
 */
Collection.prototype.indexOf = function (query, options) {
	var item = this.find(query, {$decouple: false})[0],
		sortedData;

	if (item) {
		if (!options || options && !options.$orderBy) {
			// Basic lookup from order of insert
			return this._data.indexOf(item);
		} else {
			// Trying to locate index based on query with sort order
			options.$decouple = false;
			sortedData = this.find(query, options);

			return sortedData.indexOf(item);
		}
	}

	return -1;
};

/**
 * Returns the index of the document identified by the passed item's primary key.
 * @param {*} itemLookup The document whose primary key should be used to lookup
 * or the id to lookup.
 * @param {Object=} options An options object.
 * @returns {Number} The index the item with the matching primary key is occupying.
 */
Collection.prototype.indexOfDocById = function (itemLookup, options) {
	var item,
		sortedData;

	if (typeof itemLookup !== 'object') {
		item = this._primaryIndex.get(itemLookup);
	} else {
		item = this._primaryIndex.get(itemLookup[this._primaryKey]);
	}

	if (item) {
		if (!options || options && !options.$orderBy) {
			// Basic lookup
			return this._data.indexOf(item);
		} else {
			// Sorted lookup
			options.$decouple = false;
			sortedData = this.find({}, options);

			return sortedData.indexOf(item);
		}
	}

	return -1;
};

/**
 * Removes a document from the collection by it's index in the collection's
 * data array.
 * @param {Number} index The index of the document to remove.
 * @returns {Object} The document that has been removed or false if none was
 * removed.
 */
Collection.prototype.removeByIndex = function (index) {
	var doc,
		docId;

	doc = this._data[index];

	if (doc !== undefined) {
		doc = this.decouple(doc);
		docId = doc[this.primaryKey()];

		return this.removeById(docId);
	}

	return false;
};

/**
 * Gets / sets the collection transform options.
 * @param {Object} obj A collection transform options object.
 * @returns {*}
 */
Collection.prototype.transform = function (obj) {
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

		return this;
	}

	return {
		enabled: this._transformEnabled,
		dataIn: this._transformIn,
		dataOut: this._transformOut
	};
};

/**
 * Transforms data using the set transformIn method.
 * @param {Object} data The data to transform.
 * @returns {*}
 */
Collection.prototype.transformIn = function (data) {
	if (this._transformEnabled && this._transformIn) {
		if (data instanceof Array) {
			var finalArr = [],
				transformResult,
				i;

			for (i = 0; i < data.length; i++) {
				transformResult = this._transformIn(data[i]);

				// Support transforms returning multiple items
				if (transformResult instanceof Array) {
					finalArr = finalArr.concat(transformResult);
				} else {
					finalArr.push(transformResult);
				}
			}

			return finalArr;
		} else {
			return this._transformIn(data);
		}
	}

	return data;
};

/**
 * Transforms data using the set transformOut method.
 * @param {Object} data The data to transform.
 * @returns {*}
 */
Collection.prototype.transformOut = function (data) {
	if (this._transformEnabled && this._transformOut) {
		if (data instanceof Array) {
			var finalArr = [],
				transformResult,
				i;

			for (i = 0; i < data.length; i++) {
				transformResult = this._transformOut(data[i]);

				// Support transforms returning multiple items
				if (transformResult instanceof Array) {
					finalArr = finalArr.concat(transformResult);
				} else {
					finalArr.push(transformResult);
				}
			}

			return finalArr;
		} else {
			return this._transformOut(data);
		}
	}

	return data;
};

/**
 * Sorts an array of documents by the given sort path.
 * @param {*} sortObj The keys and orders the array objects should be sorted by.
 * @param {Array} arr The array of documents to sort.
 * @returns {Array}
 */
Collection.prototype.sort = function (sortObj, arr) {
	// Convert the index object to an array of key val objects
	var self = this,
		keys = sharedPathSolver.parse(sortObj, true);

	if (keys.length) {
		// Execute sort
		arr.sort(function (a, b) {
			// Loop the index array
			var i,
				indexData,
				result = 0;

			for (i = 0; i < keys.length; i++) {
				indexData = keys[i];

				if (indexData.value === 1) {
					result = self.sortAsc(sharedPathSolver.get(a, indexData.path), sharedPathSolver.get(b, indexData.path));
				} else if (indexData.value === -1) {
					result = self.sortDesc(sharedPathSolver.get(a, indexData.path), sharedPathSolver.get(b, indexData.path));
				}

				if (result !== 0) {
					return result;
				}
			}

			return result;
		});
	}

	return arr;
};

/**
 * Groups an array of documents into multiple array fields, named by the value
 * of the given group path.
 * @param {*} groupObj The key path the array objects should be grouped by.
 * @param {Array} arr The array of documents to group.
 * @returns {Object}
 */
Collection.prototype.group = function (groupObj, arr) {
	// Convert the index object to an array of key val objects
	var keys = sharedPathSolver.parse(groupObj, true),
		groupPathSolver = new Path(),
		groupValue,
		groupResult = {},
		keyIndex,
		i;

	if (keys.length) {
		for (keyIndex = 0; keyIndex < keys.length; keyIndex++) {
			groupPathSolver.path(keys[keyIndex].path);

			// Execute group
			for (i = 0; i < arr.length; i++) {
				groupValue = groupPathSolver.get(arr[i]);
				groupResult[groupValue] = groupResult[groupValue] || [];
				groupResult[groupValue].push(arr[i]);
			}
		}
	}

	return groupResult;
};

// Commented as we have a new method that was originally implemented for binary trees.
// This old method actually has problems with nested sort objects
/*Collection.prototype.sortold = function (sortObj, arr) {
	// Make sure we have an array object
	arr = arr || [];

	var	sortArr = [],
		sortKey,
		sortSingleObj;

	for (sortKey in sortObj) {
		if (sortObj.hasOwnProperty(sortKey)) {
			sortSingleObj = {};
			sortSingleObj[sortKey] = sortObj[sortKey];
			sortSingleObj.___fdbKey = String(sortKey);
			sortArr.push(sortSingleObj);
		}
	}

	if (sortArr.length < 2) {
		// There is only one sort criteria, do a simple sort and return it
		return this._sort(sortObj, arr);
	} else {
		return this._bucketSort(sortArr, arr);
	}
};*/

/**
 * REMOVED AS SUPERCEDED BY BETTER SORT SYSTEMS
 * Takes array of sort paths and sorts them into buckets before returning final
 * array fully sorted by multi-keys.
 * @param keyArr
 * @param arr
 * @returns {*}
 * @private
 */
/*Collection.prototype._bucketSort = function (keyArr, arr) {
	var keyObj = keyArr.shift(),
		arrCopy,
		bucketData,
		bucketOrder,
		bucketKey,
		buckets,
		i,
		finalArr = [];

	if (keyArr.length > 0) {
		// Sort array by bucket key
		arr = this._sort(keyObj, arr);

		// Split items into buckets
		bucketData = this.bucket(keyObj.___fdbKey, arr);
		bucketOrder = bucketData.order;
		buckets = bucketData.buckets;

		// Loop buckets and sort contents
		for (i = 0; i < bucketOrder.length; i++) {
			bucketKey = bucketOrder[i];

			arrCopy = [].concat(keyArr);
			finalArr = finalArr.concat(this._bucketSort(arrCopy, buckets[bucketKey]));
		}

		return finalArr;
	} else {
		return this._sort(keyObj, arr);
	}
};*/

 /**
 * Takes an array of objects and returns a new object with the array items
 * split into buckets by the passed key.
 * @param {String} key The key to split the array into buckets by.
 * @param {Array} arr An array of objects.
 * @returns {Object}
 */
/*Collection.prototype.bucket = function (key, arr) {
	var i,
			oldField,
			field,
			fieldArr = [],
			buckets = {};

	for (i = 0; i < arr.length; i++) {
		field = String(arr[i][key]);

		if (oldField !== field) {
			fieldArr.push(field);
			oldField = field;
		}

		buckets[field] = buckets[field] || [];
		buckets[field].push(arr[i]);
	}

	return {
		buckets: buckets,
		order: fieldArr
	};
};*/

/**
 * Sorts array by individual sort path.
 * @param {String} key The path to sort by.
 * @param {Array} arr The array of objects to sort.
 * @returns {Array|*}
 * @private
 */
Collection.prototype._sort = function (key, arr) {
	var self = this,
		sorterMethod,
		pathSolver = new Path(),
		dataPath = pathSolver.parse(key, true)[0];

	pathSolver.path(dataPath.path);

	if (dataPath.value === 1) {
		// Sort ascending
		sorterMethod = function (a, b) {
			var valA = pathSolver.value(a)[0],
				valB = pathSolver.value(b)[0];

			return self.sortAsc(valA, valB);
		};
	} else if (dataPath.value === -1) {
		// Sort descending
		sorterMethod = function (a, b) {
			var valA = pathSolver.value(a)[0],
				valB = pathSolver.value(b)[0];

			return self.sortDesc(valA, valB);
		};
	} else {
		throw(this.logIdentifier() + ' $orderBy clause has invalid direction: ' + dataPath.value + ', accepted values are 1 or -1 for ascending or descending!');
	}

	return arr.sort(sorterMethod);
};

/**
 * Internal method that takes a search query and options and
 * returns an object containing details about the query which
 * can be used to optimise the search.
 *
 * @param {Object} query The search query to analyse.
 * @param {Object} options The query options object.
 * @param {Operation} op The instance of the Operation class that
 * this operation is using to track things like performance and steps
 * taken etc.
 * @returns {Object}
 * @private
 */
Collection.prototype._analyseQuery = function (query, options, op) {
	var analysis = {
			queriesOn: [{id: '$collection.' + this._name, type: 'colletion', key: this._name}],
			indexMatch: [],
			hasJoin: false,
			queriesJoin: false,
			joinQueries: {},
			query: query,
			options: options
		},
		joinSourceIndex,
		joinSourceKey,
		joinSourceType,
		joinSourceIdentifier,
		joinMatch,
		joinSources = [],
		joinSourceReferences = [],
		queryPath,
		index,
		indexMatchData,
		indexRef,
		indexRefName,
		indexLookup,
		pathSolver,
		queryKeyCount,
		pkQueryType,
		lookupResult,
		i;

	// Check if the query is a primary key lookup
	op.time('checkIndexes');
	pathSolver = new Path();
	queryKeyCount = pathSolver.parseArr(query, {
		ignore:/\$/,
		verbose: true
	}).length;

	if (queryKeyCount) {
		if (query[this._primaryKey] !== undefined) {
			// Check suitability of querying key value index
			pkQueryType = typeof query[this._primaryKey];

			if (pkQueryType === 'string' || pkQueryType === 'number' || query[this._primaryKey] instanceof Array) {
				// Return item via primary key possible
				op.time('checkIndexMatch: Primary Key');
				lookupResult = [].concat(this._primaryIndex.lookup(query, options, op));

				analysis.indexMatch.push({
					lookup: lookupResult,
					keyData: {
						matchedKeys: [this._primaryKey],
						totalKeyCount: queryKeyCount,
						score: 1
					},
					index: this._primaryIndex
				});
				op.time('checkIndexMatch: Primary Key');
			}
		}

		// Check if an index can speed up the query
		for (i in this._indexById) {
			if (this._indexById.hasOwnProperty(i)) {
				indexRef = this._indexById[i];
				indexRefName = indexRef.name();

				op.time('checkIndexMatch: ' + indexRefName);
				indexMatchData = indexRef.match(query, options);

				if (indexMatchData.score > 0) {
					// This index can be used, store it
					indexLookup = [].concat(indexRef.lookup(query, options, op));

					analysis.indexMatch.push({
						lookup: indexLookup,
						keyData: indexMatchData,
						index: indexRef
					});
				}
				op.time('checkIndexMatch: ' + indexRefName);

				if (indexMatchData.score === queryKeyCount) {
					// Found an optimal index, do not check for any more
					break;
				}
			}
		}
		op.time('checkIndexes');

		// Sort array descending on index key count (effectively a measure of relevance to the query)
		if (analysis.indexMatch.length > 1) {
			op.time('findOptimalIndex');
			analysis.indexMatch.sort(function (a, b) {
				if (a.keyData.score > b.keyData.score) {
					// This index has a higher score than the other
					return -1;
				}

				if (a.keyData.score < b.keyData.score) {
					// This index has a lower score than the other
					return 1;
				}

				// The indexes have the same score but can still be compared by the number of records
				// they return from the query. The fewer records they return the better so order by
				// record count
				if (a.keyData.score === b.keyData.score) {
					return a.lookup.length - b.lookup.length;
				}
			});
			op.time('findOptimalIndex');
		}
	}

	// Check for join data
	if (options.$join) {
		analysis.hasJoin = true;
		// Loop all join operations
		for (joinSourceIndex = 0; joinSourceIndex < options.$join.length; joinSourceIndex++) {
			// Loop the join sources and keep a reference to them
			for (joinSourceKey in options.$join[joinSourceIndex]) {
				if (options.$join[joinSourceIndex].hasOwnProperty(joinSourceKey)) {
					joinMatch = options.$join[joinSourceIndex][joinSourceKey];

					joinSourceType = joinMatch.$sourceType || 'collection';
					joinSourceIdentifier = '$' + joinSourceType + '.' + joinSourceKey;

					joinSources.push({
						id: joinSourceIdentifier,
						type: joinSourceType,
						key: joinSourceKey
					});

					// Check if the join uses an $as operator
					if (options.$join[joinSourceIndex][joinSourceKey].$as !== undefined) {
						joinSourceReferences.push(options.$join[joinSourceIndex][joinSourceKey].$as);
					} else {
						joinSourceReferences.push(joinSourceKey);
					}
				}
			}
		}

		// Loop the join source references and determine if the query references
		// any of the sources that are used in the join. If there no queries against
		// joined sources the find method can use a code path optimised for this.

		// Queries against joined sources requires the joined sources to be filtered
		// first and then joined so requires a little more work.
		for (index = 0; index < joinSourceReferences.length; index++) {
			// Check if the query references any source data that the join will create
			queryPath = this._queryReferencesSource(query, joinSourceReferences[index], '');

			if (queryPath) {
				analysis.joinQueries[joinSources[index].key] = queryPath;
				analysis.queriesJoin = true;
			}
		}

		analysis.joinsOn = joinSources;
		analysis.queriesOn = analysis.queriesOn.concat(joinSources);
	}

	return analysis;
};

/**
 * Checks if the passed query references a source object (such
 * as a collection) by name.
 * @param {Object} query The query object to scan.
 * @param {String} sourceName The source name to scan for in the query.
 * @param {String=} path The path to scan from.
 * @returns {*}
 * @private
 */
Collection.prototype._queryReferencesSource = function (query, sourceName, path) {
	var i;

	for (i in query) {
		if (query.hasOwnProperty(i)) {
			// Check if this key is a reference match
			if (i === sourceName) {
				if (path) { path += '.'; }
				return path + i;
			} else {
				if (typeof(query[i]) === 'object') {
					// Recurse
					if (path) { path += '.'; }
					path += i;
					return this._queryReferencesSource(query[i], sourceName, path);
				}
			}
		}
	}

	return false;
};

/**
 * Returns the number of documents currently in the collection.
 * @returns {Number}
 */
Collection.prototype.count = function (query, options) {
	if (!query) {
		return this._data.length;
	} else {
		// Run query and return count
		return this.find(query, options).length;
	}
};

/**
 * Finds sub-documents from the collection's documents.
 * @param {Object} match The query object to use when matching
 * parent documents from which the sub-documents are queried.
 * @param {String} path The path string used to identify the
 * key in which sub-documents are stored in parent documents.
 * @param {Object=} subDocQuery The query to use when matching
 * which sub-documents to return.
 * @param {Object=} subDocOptions The options object to use
 * when querying for sub-documents.
 * @returns {*}
 */
Collection.prototype.findSub = function (match, path, subDocQuery, subDocOptions) {
	return this._findSub(this.find(match), path, subDocQuery, subDocOptions);
};

Collection.prototype._findSub = function (docArr, path, subDocQuery, subDocOptions) {
	var pathHandler = new Path(path),
		docCount = docArr.length,
		docIndex,
		subDocArr,
		subDocCollection = new Collection('__FDB_temp_' + this.objectId()).db(this._db),
		subDocResults,
		resultObj = {
			parents: docCount,
			subDocTotal: 0,
			subDocs: [],
			pathFound: false,
			err: ''
		};

	subDocOptions = subDocOptions || {};

	for (docIndex = 0; docIndex < docCount; docIndex++) {
		subDocArr = pathHandler.value(docArr[docIndex])[0];
		if (subDocArr) {
			subDocCollection.setData(subDocArr);
			subDocResults = subDocCollection.find(subDocQuery, subDocOptions);
			
			if (subDocOptions.$returnFirst && subDocResults.length) {
				return subDocResults[0];
			}

			if (subDocOptions.$split) {
				resultObj.subDocs.push(subDocResults);
			} else {
				resultObj.subDocs = resultObj.subDocs.concat(subDocResults);
			}

			resultObj.subDocTotal += subDocResults.length;
			resultObj.pathFound = true;
		}
	}

	// Drop the sub-document collection
	subDocCollection.drop();

	if (!resultObj.pathFound) {
		resultObj.err = 'No objects found in the parent documents with a matching path of: ' + path;
	}

	// Check if the call should not return stats, if so return only subDocs array
	if (subDocOptions.$stats) {
		return resultObj;
	} else {
		return resultObj.subDocs;
	}
};

/**
 * Finds the first sub-document from the collection's documents
 * that matches the subDocQuery parameter.
 * @param {Object} match The query object to use when matching
 * parent documents from which the sub-documents are queried.
 * @param {String} path The path string used to identify the
 * key in which sub-documents are stored in parent documents.
 * @param {Object=} subDocQuery The query to use when matching
 * which sub-documents to return.
 * @param {Object=} subDocOptions The options object to use
 * when querying for sub-documents.
 * @returns {Object}
 */
Collection.prototype.findSubOne = function (match, path, subDocQuery, subDocOptions) {
	return this.findSub(match, path, subDocQuery, subDocOptions)[0];
};

/**
 * Checks that the passed document will not violate any index rules if
 * inserted into the collection.
 * @param {Object} doc The document to check indexes against.
 * @returns {Boolean} Either false (no violation occurred) or true if
 * a violation was detected.
 */
Collection.prototype.insertIndexViolation = function (doc) {
	var indexViolated,
		arr = this._indexByName,
		arrIndex,
		arrItem;

	// Check the item's primary key is not already in use
	if (this._primaryIndex.get(doc[this._primaryKey])) {
		indexViolated = this._primaryIndex;
	} else {
		// Check violations of other indexes
		for (arrIndex in arr) {
			if (arr.hasOwnProperty(arrIndex)) {
				arrItem = arr[arrIndex];

				if (arrItem.unique()) {
					if (arrItem.violation(doc)) {
						indexViolated = arrItem;
						break;
					}
				}
			}
		}
	}

	return indexViolated ? indexViolated.name() : false;
};

/**
 * Creates an index on the specified keys.
 * @param {Object} keys The object containing keys to index.
 * @param {Object} options An options object.
 * @returns {*}
 */
Collection.prototype.ensureIndex = function (keys, options) {
	if (this.isDropped()) {
		throw(this.logIdentifier() + ' Cannot operate in a dropped state!');
	}

	this._indexByName = this._indexByName || {};
	this._indexById = this._indexById || {};

	var index,
		time = {
			start: new Date().getTime()
		};

	if (options) {
		if (options.type) {
			// Check if the specified type is available
			if (Shared.index[options.type]) {
				// We found the type, generate it
				index = new Shared.index[options.type](keys, options, this);
			} else {
				throw(this.logIdentifier() + ' Cannot create index of type "' + options.type + '", type not found in the index type register (Shared.index)');
			}
		} else {
			// Create default index type
			index = new IndexHashMap(keys, options, this);
		}
	} else {
		// Default
		index = new IndexHashMap(keys, options, this);
	}

	// Check the index does not already exist
	if (this._indexByName[index.name()]) {
		// Index already exists
		return {
			err: 'Index with that name already exists'
		};
	}

	/*if (this._indexById[index.id()]) {
		// Index already exists
		return {
			err: 'Index with those keys already exists'
		};
	}*/

	// Create the index
	index.rebuild();

	// Add the index
	this._indexByName[index.name()] = index;
	this._indexById[index.id()] = index;

	time.end = new Date().getTime();
	time.total = time.end - time.start;

	this._lastOp = {
		type: 'ensureIndex',
		stats: {
			time: time
		}
	};

	return {
		index: index,
		id: index.id(),
		name: index.name(),
		state: index.state()
	};
};

/**
 * Gets an index by it's name.
 * @param {String} name The name of the index to retreive.
 * @returns {*}
 */
Collection.prototype.index = function (name) {
	if (this._indexByName) {
		return this._indexByName[name];
	}
};

/**
 * Gets the last reporting operation's details such as run time.
 * @returns {Object}
 */
Collection.prototype.lastOp = function () {
	return this._metrics.list();
};

/**
 * Generates a difference object that contains insert, update and remove arrays
 * representing the operations to execute to make this collection have the same
 * data as the one passed.
 * @param {Collection} collection The collection to diff against.
 * @returns {{}}
 */
Collection.prototype.diff = function (collection) {
	var diff = {
		insert: [],
		update: [],
		remove: []
	};

	var pk = this.primaryKey(),
		arr,
		arrIndex,
		arrItem,
		arrCount;

	// Check if the primary key index of each collection can be utilised
	if (pk !== collection.primaryKey()) {
		throw(this.logIdentifier() + ' Diffing requires that both collections have the same primary key!');
	}

	// Use the collection primary key index to do the diff (super-fast)
	arr = collection._data;

	// Check if we have an array or another collection
	while (arr && !(arr instanceof Array)) {
		// We don't have an array, assign collection and get data
		collection = arr;
		arr = collection._data;
	}

	arrCount = arr.length;

	// Loop the collection's data array and check for matching items
	for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
		arrItem = arr[arrIndex];

		// Check for a matching item in this collection
		if (this._primaryIndex.get(arrItem[pk])) {
			// Matching item exists, check if the data is the same
			if (this._primaryCrc.get(arrItem[pk]) !== collection._primaryCrc.get(arrItem[pk])) {
				// The documents exist in both collections but data differs, update required
				diff.update.push(arrItem);
			}
		} else {
			// The document is missing from this collection, insert required
			diff.insert.push(arrItem);
		}
	}

	// Now loop this collection's data and check for matching items
	arr = this._data;
	arrCount = arr.length;

	for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
		arrItem = arr[arrIndex];

		if (!collection._primaryIndex.get(arrItem[pk])) {
			// The document does not exist in the other collection, remove required
			diff.remove.push(arrItem);
		}
	}

	return diff;
};

Collection.prototype.collateAdd = new Overload('Collection.prototype.collateAdd', {
	/**
	 * Adds a data source to collate data from and specifies the
	 * key name to collate data to.
	 * @func collateAdd
	 * @memberof Collection
	 * @param {Collection} collection The collection to collate data from.
	 * @param {String=} keyName Optional name of the key to collate data to.
	 * If none is provided the record CRUD is operated on the root collection
	 * data.
	 */
	'object, string': function (collection, keyName) {
		var self = this;

		self.collateAdd(collection, function (packet) {
			var obj1,
				obj2;

			switch (packet.type) {
				case 'insert':
					if (keyName) {
						obj1 = {
							$push: {}
						};

						obj1.$push[keyName] = self.decouple(packet.data.dataSet);
						self.update({}, obj1);
					} else {
						self.insert(packet.data.dataSet);
					}
					break;

				case 'update':
					if (keyName) {
						obj1 = {};
						obj2 = {};

						obj1[keyName] = packet.data.query;
						obj2[keyName + '.$'] = packet.data.update;

						self.update(obj1, obj2);
					} else {
						self.update(packet.data.query, packet.data.update);
					}
					break;

				case 'remove':
					if (keyName) {
						obj1 = {
							$pull: {}
						};

						obj1.$pull[keyName] = {};
						obj1.$pull[keyName][self.primaryKey()] = packet.data.dataSet[0][collection.primaryKey()];

						self.update({}, obj1);
					} else {
						self.remove(packet.data.dataSet);
					}
					break;

				default:
			}
		});
	},

	/**
	 * Adds a data source to collate data from and specifies a process
	 * method that will handle the collation functionality (for custom
	 * collation).
	 * @func collateAdd
	 * @memberof Collection
	 * @param {Collection} collection The collection to collate data from.
	 * @param {Function} process The process method.
	 */
	'object, function': function (collection, process) {
		if (typeof collection === 'string') {
			// The collection passed is a name, not a reference so get
			// the reference from the name
			collection = this._db.collection(collection, {
				autoCreate: false,
				throwError: false
			});
		}

		if (collection) {
			this._collate = this._collate || {};
			this._collate[collection.name()] = new ReactorIO(collection, this, process);

			return this;
		} else {
			throw('Cannot collate from a non-existent collection!');
		}
	}
});

Collection.prototype.collateRemove = function (collection) {
	if (typeof collection === 'object') {
		// We need to have the name of the collection to remove it
		collection = collection.name();
	}

	if (collection) {
		// Drop the reactor IO chain node
		this._collate[collection].drop();

		// Remove the collection data from the collate object
		delete this._collate[collection];

		return this;
	} else {
		throw('No collection name passed to collateRemove() or collection not found!');
	}
};

/**
 * Creates a condition handler that will react to changes in data on the
 * collection.
 * @example Create a condition handler that reacts when data changes.
 * 	var coll = db.collection('test'),
 * 		condition = coll.when({_id: 'test1', val: 1})
 * 		.then(function () {
 * 			console.log('Condition met!');
 *	 	})
 *	 	.else(function () {
 *	 		console.log('Condition un-met');
 *	 	});
 *
 *	 	coll.insert({_id: 'test1', val: 1});
 *
 * @see Condition
 * @param {Object} query The query that will trigger the condition's then()
 * callback.
 * @returns {Condition}
 */
Collection.prototype.when = function (query) {
	var queryId = this.objectId();

	this._when = this._when || {};
	this._when[queryId] = this._when[queryId] || new Condition(this, queryId, query);

	return this._when[queryId];
};

Db.prototype.collection = new Overload('Db.prototype.collection', {
	/**
	 * Get a collection with no name (generates a random name). If the
	 * collection does not already exist then one is created for that
	 * name automatically.
	 * @name collection
	 * @method Db.collection
	 * @func collection
	 * @memberof Db
	 * @returns {Collection}
	 */
	'': function () {
		return this.$main.call(this, {
			name: this.objectId()
		});
	},

	/**
	 * Get a collection by name. If the collection does not already exist
	 * then one is created for that name automatically.
	 * @name collection
	 * @method Db.collection
	 * @func collection
	 * @memberof Db
	 * @param {Object} data An options object or a collection instance.
	 * @returns {Collection}
	 */
	'object': function (data) {
		// Handle being passed an instance
		if (data instanceof Collection) {
			if (data.state() !== 'droppped') {
				return data;
			} else {
				return this.$main.call(this, {
					name: data.name()
				});
			}
		}

		return this.$main.call(this, data);
	},

	/**
	 * Get a collection by name. If the collection does not already exist
	 * then one is created for that name automatically.
	 * @name collection
	 * @method Db.collection
	 * @func collection
	 * @memberof Db
	 * @param {String} collectionName The name of the collection.
	 * @returns {Collection}
	 */
	'string': function (collectionName) {
		return this.$main.call(this, {
			name: collectionName
		});
	},

	/**
	 * Get a collection by name. If the collection does not already exist
	 * then one is created for that name automatically.
	 * @name collection
	 * @method Db.collection
	 * @func collection
	 * @memberof Db
	 * @param {String} collectionName The name of the collection.
	 * @param {String} primaryKey Optional primary key to specify the
	 * primary key field on the collection objects. Defaults to "_id".
	 * @returns {Collection}
	 */
	'string, string': function (collectionName, primaryKey) {
		return this.$main.call(this, {
			name: collectionName,
			primaryKey: primaryKey
		});
	},

	/**
	 * Get a collection by name. If the collection does not already exist
	 * then one is created for that name automatically.
	 * @name collection
	 * @method Db.collection
	 * @func collection
	 * @memberof Db
	 * @param {String} collectionName The name of the collection.
	 * @param {Object} options An options object.
	 * @returns {Collection}
	 */
	'string, object': function (collectionName, options) {
		options.name = collectionName;

		return this.$main.call(this, options);
	},

	/**
	 * Get a collection by name. If the collection does not already exist
	 * then one is created for that name automatically.
	 * @name collection
	 * @method Db.collection
	 * @func collection
	 * @memberof Db
	 * @param {String} collectionName The name of the collection.
	 * @param {String} primaryKey Optional primary key to specify the
	 * primary key field on the collection objects. Defaults to "_id".
	 * @param {Object} options An options object.
	 * @returns {Collection}
	 */
	'string, string, object': function (collectionName, primaryKey, options) {
		options.name = collectionName;
		options.primaryKey = primaryKey;

		return this.$main.call(this, options);
	},
	
	'$main': function (options) {
		var self = this,
			name = options.name;

		if (!name) {
			if (!options || (options && options.throwError !== false)) {
				throw(this.logIdentifier() + ' Cannot get collection with undefined name!');
			}
			
			return;
		}
		
		if (this._collection[name]) {
			return this._collection[name];
		}
		
		if (options && options.autoCreate === false) {
			if (options && options.throwError !== false) {
				throw(this.logIdentifier() + ' Cannot get collection ' + name + ' because it does not exist and auto-create has been disabled!');
			}

			return undefined;
		}

		if (this.debug()) {
			console.log(this.logIdentifier() + ' Creating collection ' + name);
		}

		this._collection[name] = this._collection[name] || new Collection(name, options).db(this);
		this._collection[name].mongoEmulation(this.mongoEmulation());

		if (options.primaryKey !== undefined) {
			this._collection[name].primaryKey(options.primaryKey);
		}

		if (options.capped !== undefined) {
			// Check we have a size
			if (options.size !== undefined) {
				this._collection[name].capped(options.capped);
				this._collection[name].cappedSize(options.size);
			} else {
				throw(this.logIdentifier() + ' Cannot create a capped collection without specifying a size!');
			}
		}

		// Listen for events on this collection so we can fire global events
		// on the database in response to it
		self._collection[name].on('change', function () {
			self.emit('change', self._collection[name], 'collection', name);
		});

		self.deferEmit('create', self._collection[name], 'collection', name);

		return this._collection[name];
	}
});

/**
 * Determine if a collection with the passed name already exists.
 * @memberof Db
 * @param {String} viewName The name of the collection to check for.
 * @returns {boolean}
 */
Db.prototype.collectionExists = function (viewName) {
	return Boolean(this._collection[viewName]);
};

/**
 * Returns an array of collections the DB currently has.
 * @memberof Db
 * @param {String|RegExp=} search The optional search string or
 * regular expression to use to match collection names against.
 * @returns {Array} An array of objects containing details of each
 * collection the database is currently managing.
 */
Db.prototype.collections = function (search) {
	var arr = [],
		collections = this._collection,
		collection,
		i;

	if (search) {
		if (!(search instanceof RegExp)) {
			// Turn the search into a regular expression
			search = new RegExp(search);
		}
	}

	for (i in collections) {
		if (collections.hasOwnProperty(i)) {
			collection = collections[i];

			if (search) {
				if (search.exec(i)) {
					arr.push({
						name: i,
						count: collection.count(),
						linked: collection.isLinked !== undefined ? collection.isLinked() : false
					});
				}
			} else {
				arr.push({
					name: i,
					count: collection.count(),
					linked: collection.isLinked !== undefined ? collection.isLinked() : false
				});
			}
		}
	}

	arr.sort(function (a, b) {
		return a.name.localeCompare(b.name);
	});

	return arr;
};

Shared.finishModule('Collection');
module.exports = Collection;