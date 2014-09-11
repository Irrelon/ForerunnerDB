var Shared,
	Core,
	Overload,
	Metrics,
	KeyValueStore,
	Path,
	Index,
	Crc;

Shared = require('./ForerunnerDB.Shared');

/**
 * Collection object used to store data.
 * @constructor
 */
var Collection = function (name) {
	this.init.apply(this, arguments);
};

Collection.prototype.init = function (name) {
	this._primaryKey = '_id';
	this._primaryIndex = new KeyValueStore('primary');
	this._primaryCrc = new KeyValueStore('primaryCrc');
	this._crcLookup = new KeyValueStore('crcLookup');
	this._name = name;
	this._data = [];
	this._groups = [];
	this._metrics = new Metrics();
	this._linked = 0;
	this._debug = {};

	this._deferQueue = {
		insert: [],
		update: [],
		remove: [],
		upsert: []
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

	// Set the subset to itself since it is the root collection
	this._subsetOf(this);
};

Shared.modules.Collection = Collection;

Overload = require('./ForerunnerDB.Overload');
Metrics = require('./ForerunnerDB.Metrics');
KeyValueStore = require('./ForerunnerDB.KeyValueStore');
Path = require('./ForerunnerDB.Path');
Index = require('./ForerunnerDB.Index');
Crc = require('./ForerunnerDB.Crc');
Core = Shared.modules.Core;

Collection.prototype.debug = new Overload([
	function () {
		return this._debug.all;
	},

	function (val) {
		if (val !== undefined) {
			if (typeof val === 'boolean') {
				this._debug.all = val;

				// Update the views to use this debug setting
				for (var i = 0; i < this._views.length; i++) {
					this._views[i].debug(val);
				}
				return this;
			} else {
				return this._debug[val] || (this._db && this._db._debug && this._db._debug[val]) || this._debug.all;
			}
		}

		return this._debug.all;
	},

	function (type, val) {
		if (type !== undefined) {
			if (val !== undefined) {
				this._debug[type] = val;

				// Update the views to use this debug setting
				for (var i = 0; i < this._views.length; i++) {
					this._views[i].debug(type, val);
				}
				return this;
			}

			return this._debug[type] || (this._db && this._db._debug && this._db._debug[type]);
		}

		return this._debug.all;
	}
]);

/**
 * Returns a checksum of a string.
 * @param {String} string The string to checksum.
 * @return {String} The checksum generated.
 */
Collection.prototype.crc = Crc;

/**
 * Gets / sets the name of the collection.
 * @param {String} val The name of the collection to set.
 * @returns {*}
 */
Collection.prototype.name = function (val) {
	if (val !== undefined) {
		this._name = val;
		return this;
	}

	return this._name;
};

Collection.prototype.on = new Overload([
	function(event, listener) {
		this._listeners = this._listeners || {};
		this._listeners[event] = this._listeners[event] || {};
		this._listeners[event]['*'] = this._listeners[event]['*'] || [];
		this._listeners[event]['*'].push(listener);

		return this;
	},

	function(event, id, listener) {
		this._listeners = this._listeners || {};
		this._listeners[event] = this._listeners[event] || {};
		this._listeners[event][id] = this._listeners[event][id] || [];
		this._listeners[event][id].push(listener);

		return this;
	}
]);

Collection.prototype.off = new Overload([
	function (event) {
		if (this._listeners && this._listeners[event] && event in this._listeners) {
			delete this._listeners[event];
		}

		return this;
	},

	function(event, listener) {
		var arr,
			index;

		if (typeof(listener) === 'string') {
			if (this._listeners && this._listeners[event] && this._listeners[event][listener]) {
				delete this._listeners[event][listener];
			}
		} else {
			if (event in this._listeners) {
				arr = this._listeners[event]['*'];
				index = arr.indexOf(listener);

				if (index > -1) {
					arr.splice(index, 1);
				}
			}
		}

		return this;
	},

	function (event, id, listener) {
		if (this._listeners && event in this._listeners) {
			var arr = this._listeners[event][id],
				index = arr.indexOf(listener);

			if (index > -1) {
				arr.splice(index, 1);
			}
		}
	}
]);

Collection.prototype.emit = function(event, data) {
	this._listeners = this._listeners || {};

	if (event in this._listeners) {
		// Handle global emit
		if (this._listeners[event]['*']) {
			var arr = this._listeners[event]['*'],
				arrCount = arr.length,
				arrIndex;

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				arr[arrIndex].apply(this, Array.prototype.slice.call(arguments, 1));
			}
		}

		// Handle individual emit
		if (data instanceof Array) {
			// Check if the array is an array of objects in the collection
			if (data[0] && data[0][this._primaryKey]) {
				// Loop the array and check for listeners against the primary key
				var listenerIdArr = this._listeners[event],
					listenerIdCount,
					listenerIdIndex;

				arrCount = data.length;

				for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
					if (listenerIdArr[data[arrIndex][this._primaryKey]]) {
						// Emit for this id
						listenerIdCount = listenerIdArr[data[arrIndex][this._primaryKey]].length;
						for (listenerIdIndex = 0; listenerIdIndex < listenerIdCount; listenerIdIndex++) {
							listenerIdArr[data[arrIndex][this._primaryKey]][listenerIdIndex].apply(this, Array.prototype.slice.call(arguments, 1));
						}
					}
				}
			}
		}
	}

	return this;
};

/**
 * Drops a collection and all it's stored data from the database.
 * @returns {boolean} True on success, false on failure.
 */
Collection.prototype.drop = function () {
	if (this._db && this._name) {
		if (this.debug()) {
			console.log('Dropping collection ' + this._name);
		}

		this.emit('drop');

		delete this._db._collection[this._name];

		var groupArr = [],
			i;

		// Copy the group array because if we call removeCollection on a group
		// it will alter the groups array of this collection mid-loop!
		for (i = 0; i < this._groups.length; i++) {
			groupArr.push(this._groups[i]);
		}

		// Loop any groups we are part of and remove ourselves from them
		for (i = 0; i < groupArr.length; i++) {
			this._groups[i].removeCollection(this);
		}

		return true;
	}

	return false;
};

/**
 * Gets / sets the primary key for this collection.
 * @param {String=} keyName The name of the primary key.
 * @returns {*}
 */
Collection.prototype.primaryKey = function (keyName) {
	if (keyName !== undefined) {
		this._primaryKey = keyName;

		// Set the primary key index primary key
		this._primaryIndex.primaryKey(keyName);

		// Rebuild the primary key index
		this._rebuildPrimaryKeyIndex();
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
 * Gets / sets the db instance the collection belongs to.
 * @param {DB} db The db instance.
 * @returns {*}
 */
Collection.prototype.db = function (db) {
	if (db !== undefined) {
		this._db = db;
		return this;
	}

	return this._db;
};

/**
 * Sets the collection's data to the array of documents passed.
 * @param data
 * @param options Optional options object.
 * @param callback Optional callback function.
 */
Collection.prototype.setData = function (data, options, callback) {
	if (data) {
		var op = this._metrics.create('setData');
		op.start();

		if (!(data instanceof Array)) {
			data = [data];
		}

		op.time('transformIn');
		data = this.transformIn(data);
		op.time('transformIn');

		var oldData = this._data;

		// Overwrite the data
		this._data = [];

		if (data.length) {
			this._data = this._data.concat(data);
		}

		// Update the primary key index
		op.time('_rebuildPrimaryKeyIndex');
		this._rebuildPrimaryKeyIndex(options);
		op.time('_rebuildPrimaryKeyIndex');

		op.stop();

		this.emit('setData', this._data, oldData);
	}

	if (callback) { callback(false); }

	return this;
};

/**
 * Drops and rebuilds the primary key index for all documents in the collection.
 * @param {Object=} options An optional options object.
 * @private
 */
Collection.prototype._rebuildPrimaryKeyIndex = function (options) {
	var ensureKeys = options && options.ensureKeys !== undefined ? options.ensureKeys : true,
		violationCheck = options && options.violationCheck !== undefined ? options.violationCheck : true,
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
			this._ensurePrimaryKey(arrItem);
		}

		if (violationCheck) {
			// Check for primary key violation
			if (!pIndex.uniqueSet(arrItem[pKey], arrItem)) {
				// Primary key violation
				throw('Call to setData failed because your data violates the primary key unique constraint. One or more documents are using the same primary key: ' + arrItem[this._primaryKey]);
			}
		} else {
			jString = JSON.stringify(arrItem);
			pIndex.set(arrItem[pKey], arrItem);
			crcIndex.set(arrItem[pKey], jString);
			crcLookup.set(jString, arrItem);
		}
	}
};

/**
 * Checks for a primary key on the document and assigns one if none
 * currently exists.
 * @param {Object} obj The object to check a primary key against.
 * @private
 */
Collection.prototype._ensurePrimaryKey = function (obj) {
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
	this.emit('truncate', this._data);
	this._data.length = 0;

	this.deferEmit('change');
	return this;
};

/**
 * Modifies an existing document or documents in a collection. This will update
 * all matches for 'query' with the data held in 'update'. It will not overwrite
 * the matched documents with the update document.
 *
 * @param {Object} obj The document object to upsert or an array containing
 * documents to upsert.
 *
 * If the document contains a primary key field (based on the collections's primary
 * key) then the database will search for an existing document with a matching id.
 * If a matching document is found, the document will be updated. Any keys that
 * match keys on the existing document will be overwritten with new data. Any keys
 * that do not currently exist on the document will be added to the document.
 *
 * If the document does not contain an id or the id passed does not match an existing
 * document, an insert is performed instead. If no id is present a new primary key
 * id is provided for the item.
 *
 * @param {Function=} callback Optional callback method.
 * @returns {Object} An object containing two keys, "op" contains either "insert" or
 * "update" depending on the type of operation that was performed and "result"
 * contains the return data from the operation used.
 */
Collection.prototype.upsert = function (obj, callback) {
	if (obj) {
		var queue = this._deferQueue.upsert,
			deferThreshold = this._deferThreshold.upsert;
		//deferTime = this._deferTime.upsert;

		var returnData = {},
			query,
			i;

		// Determine if the object passed is an array or not
		if (obj instanceof Array) {
			if (obj.length > deferThreshold) {
				// Break up upsert into blocks
				this._deferQueue.upsert = queue.concat(obj);

				// Fire off the insert queue handler
				this.processQueue('upsert', callback);

				return;
			} else {
				// Loop the array and upsert each item
				returnData = [];

				for (i = 0; i < obj.length; i++) {
					returnData.push(this.upsert(obj[i]));
				}

				if (callback) { callback(); }

				return returnData;
			}
		}

		// Determine if the operation is an insert or an update
		if (obj[this._primaryKey]) {
			// Check if an object with this primary key already exists
			query = {};
			query[this._primaryKey] = obj[this._primaryKey];

			//TODO: Could be optimised to use the primary index lookup now?
			if (this.count(query)) {
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
				returnData.result = this.insert(obj);
				break;

			case 'update':
				returnData.result = this.update(query, obj);
				break;
		}

		return returnData;
	} else {
		if (callback) { callback(); }
	}

	return;
};

/**
 * Modifies an existing document or documents in a collection. This will update
 * all matches for 'query' with the data held in 'update'. It will not overwrite
 * the matched documents with the update document.
 *
 * @param {Object} query The query that must be matched for a document to be
 * operated on.
 * @param {Object} update The object containing updated key/values. Any keys that
 * match keys on the existing document will be overwritten with this data. Any
 * keys that do not currently exist on the document will be added to the document.
 * @param {Object=} options An options object.
 * @returns {Array} The items that were updated.
 */
Collection.prototype.update = function (query, update, options) {
	// Decouple the update data
	update = this.decouple(update);

	// Handle transform
	update = this.transformIn(update);

	if (this.debug()) {
		console.log('Updating some collection data for collection "' + this.name() + '"');
	}

	var self = this,
		op = this._metrics.create('update'),
		pKey = this._primaryKey,
		dataSet,
		updated,
		updateCall = function (doc) {
			if (update && update[pKey] !== undefined && update[pKey] != doc[pKey]) {
				// Remove item from primary index
				self._primaryIndex.unSet(doc[pKey]);

				var result = self._updateObject(doc, update, query, options, '');

				// Update the item in the primary index
				if (self._primaryIndex.uniqueSet(doc[pKey], doc)) {
					return result;
				} else {
					throw('Primary key violation in update! Key violated: ' + doc[pKey]);
				}
			} else {
				return self._updateObject(doc, update, query, options, '');
			}
		},
		views = this._views,
		viewIndex;

	op.start();
	op.time('Retrieve documents to update');
	dataSet = this.find(query, {decouple: false});
	op.time('Retrieve documents to update');

	if (dataSet.length) {
		op.time('Update documents');
		updated = dataSet.filter(updateCall);
		op.time('Update documents');

		if (updated.length) {
			// Loop views and pass them the update query
			if (views && views.length) {
				if (this.debug('views')) {
					console.log('Updating views from collection: ' + this.name());
				}
				op.time('Inform views of update');
				for (viewIndex = 0; viewIndex < views.length; viewIndex++) {
					views[viewIndex].update(query, update);
				}
				op.time('Inform views of update');
			}

			this._onUpdate(updated);
			this.deferEmit('change', {type: 'update', data: updated});
		}
	}

	op.stop();

	return updated || [];
};

/**
 * Helper method to update a document from it's id.
 * @param {String} id The id of the document.
 * @param {Object} update The object containing the key/values to update to.
 * @returns {Array} The items that were updated.
 */
Collection.prototype.updateById = function (id, update) {
	var searchObj = {};
	searchObj[this._primaryKey] = id;
	return this.update(searchObj, update);
};

/**
 * Internal method for document updating.
 * @param {Object} doc The document to update.
 * @param {Object} update The object with key/value pairs to update the document with.
 * @param query
 * @param options
 * @param path
 * @returns {Boolean} True if the document was updated with new / changed data or
 * false if it was not updated because the data was the same.
 * @private
 */
Collection.prototype._updateObject = function (doc, update, query, options, path) {
	update = this.decouple(update);

	// Clear leading dots from path
	path = path || '';
	if (path.substr(0, 1) === '.') { path = path.substr(1, path.length -1); }

	var updated = false,
		recurseUpdated = false,
		operation,
		tmpArray,
		tmpIndex,
		tmpCount,
		pathInstance,
		sourceIsArray,
		updateIsArray,
		i, k;

	for (i in update) {
		if (update.hasOwnProperty(i)) {
			// Reset operation flag
			operation = false;

			// Check if the property starts with a dollar (function)
			if (i.substr(0, 1) === '$') {
				// Check for commands
				switch (i) {
					case '$inc':
						operation = true;

						// Do an increment operation
						for (k in update[i]) {
							if (update[i].hasOwnProperty(k) && k.substr(0, 1) !== '$') {
								if (typeof doc[k] === 'number') {
									this._updateIncrement(doc, k, update[i][k]);
									updated = true;
								} else {
									throw("Cannot increment field that is not a number! (" + k + ")!");
								}
							}
						}
						break;

					case '$push':
						operation = true;

						// Do a push operation
						for (k in update[i]) {
							if (update[i].hasOwnProperty(k) && k.substr(0, 1) !== '$') {
								if (doc[k] instanceof Array) {
									this._updatePush(doc[k], update[i][k]);
									updated = true;
								} else {
									throw("Cannot push to a key that is not an array! (" + k + ")!");
								}
							}
						}
						break;

					case '$addToSet':
						operation = true;

						// Do a push operation checking first that no other item
						// exists that matches the item to push
						for (k in update[i]) {
							if (update[i].hasOwnProperty(k) && k.substr(0, 1) !== '$') {
								if (doc[k] instanceof Array) {
									// Loop the target array and check for existence of item
									var targetArr = doc[k],
										targetArrIndex,
										targetArrCount = targetArr.length,
										objHash,
										addObj = true,
										optionObj = (options && options.$addToSet),
										hashMode,
										pathSolver;

									// Check if we have an options object for our operation
									if (optionObj && optionObj.key) {
										hashMode = false;
										pathSolver = new Path(optionObj.key);
										objHash = pathSolver.value(update[i][k])[0];
									} else {
										objHash = JSON.stringify(update[i][k]);
										hashMode = true;
									}

									for (targetArrIndex = 0; targetArrIndex < targetArrCount; targetArrIndex++) {
										if (hashMode) {
											// Check if objects match via a string hash (JSON)
											if (JSON.stringify(targetArr[targetArrIndex]) === objHash) {
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
										this._updatePush(doc[k], update[i][k]);
										updated = true;
									}
								} else {
									throw("Cannot push to a key that is not an array! (" + k + ")!");
								}
							}
						}
						break;

					case '$splicePush':
						operation = true;

						// Do a splice operation
						for (k in update[i]) {
							if (update[i].hasOwnProperty(k) && k.substr(0, 1) !== '$') {
								if (doc[k] instanceof Array) {
									var tempIndex = update[i].$index;

									if (tempIndex !== undefined) {
										delete update[i][k].$index;
										this._updateSplicePush(doc[k], tempIndex, update[i][k]);
										updated = true;
									} else {
										throw("Cannot splicePush without a $index integer value!");
									}
								} else {
									throw("Cannot splicePush with a key that is not an array! (" + k + ")!");
								}
							}
						}
						break;

					case '$move':
						operation = true;

						// Do a move operation
						for (k in update[i]) {
							if (update[i].hasOwnProperty(k) && k.substr(0, 1) !== '$') {
								if (doc[k] instanceof Array) {
									// Loop the array and find matches to our search
									for (tmpIndex = 0; tmpIndex < doc[k].length; tmpIndex++) {
										if (this._match(doc[k][tmpIndex], update[i][k])) {
											var moveToIndex = update[i].$index;

											if (moveToIndex !== undefined) {
												this._updateSpliceMove(doc[k], tmpIndex, moveToIndex);
												updated = true;
											} else {
												throw("Cannot move without a $index integer value!");
											}
											break;
										}
									}
								} else {
									throw("Cannot pull from a key that is not an array! (" + k + ")!");
								}
							}
						}
						break;

					case '$pull':
						operation = true;

						// Do a pull operation
						for (k in update[i]) {
							if (update[i].hasOwnProperty(k) && k.substr(0, 1) !== '$') {
								if (doc[k] instanceof Array) {
									tmpArray = [];

									// Loop the array and find matches to our search
									for (tmpIndex = 0; tmpIndex < doc[k].length; tmpIndex++) {
										if (this._match(doc[k][tmpIndex], update[i][k])) {
											tmpArray.push(tmpIndex);
										}
									}

									tmpCount = tmpArray.length;

									// Now loop the pull array and remove items to be pulled
									while (tmpCount--) {
										this._updatePull(doc[k], tmpArray[tmpCount]);
										updated = true;
									}
								} else {
									throw("Cannot pull from a key that is not an array! (" + k + ")!");
								}
							}
						}
						break;
				}
			}

			// Check if the key has a .$ at the end, denoting an array lookup
			if (i.substr(i.length - 2, 2) === '.$') {
				operation = true;

				// Modify i to be the name of the field
				i = i.substr(0, i.length - 2);

				pathInstance = new Path(path + '.' + i);

				// Check if the key is an array and has items
				if (doc[i] && doc[i] instanceof Array && doc[i].length) {
					tmpArray = [];

					// Loop the array and find matches to our search
					for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
						if (this._match(doc[i][tmpIndex], pathInstance.value(query)[0])) {
							tmpArray.push(tmpIndex);
						}
					}

					// Loop the items that matched and update them
					for (tmpIndex = 0; tmpIndex < tmpArray.length; tmpIndex++) {
						recurseUpdated = this._updateObject(doc[i][tmpArray[tmpIndex]], update[i + '.$'], query, options, path + '.' + i);
						if (recurseUpdated) {
							updated = true;
						}
					}
				}
			}

			if (!operation) {
				if (typeof(update[i]) === 'object') {
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
									recurseUpdated = this._updateObject(doc[i][tmpIndex], update[i], query, options, path + '.' + i);
									if (recurseUpdated) {
										updated = true;
									}
								}
							} else {
								// Either both source and update are arrays or the update is
								// an array and the source is not, so set source to update
								this._updateProperty(doc, i, update[i]);
								updated = true;
							}
						} else {
							// The doc key is an object so traverse the
							// update further
							recurseUpdated = this._updateObject(doc[i], update[i], query, options, path + '.' + i);
							if (recurseUpdated) {
								updated = true;
							}
						}
					} else {
						this._updateProperty(doc, i, update[i]);
						updated = true;
					}
				} else {
					if (doc[i] !== update[i]) {
						this._updateProperty(doc, i, update[i]);
						updated = true;
					}
				}
			}
		}
	}

	return updated;
};

/**
 * Updates a property on an object depending on if the collection is
 * currently running data-binding or not.
 * @param {Object} doc The object whose property is to be updated.
 * @param {String} prop The property to update.
 * @param {*} val The new value of the property.
 * @private
 */
Collection.prototype._updateProperty = function (doc, prop, val) {
	if (this._linked) {
		$.observable(doc).setProperty(prop, val);

		if (this.debug()) {
			console.log('ForerunnerDB.Collection: Setting data-bound document property "' + prop + '" for collection "' + this.name() + '"');
		}
	} else {
		doc[prop] = val;

		if (this.debug()) {
			console.log('ForerunnerDB.Collection: Setting non-data-bound document property "' + prop + '" for collection "' + this.name() + '"');
		}
	}
};

/**
 * Changes the index of an item in the passed array.
 * @param {Array} arr The array to modify.
 * @param {Number} indexFrom The index to move the item from.
 * @param {Number} indexTo The index to move the item to.
 * @private
 */
Collection.prototype._updateSpliceMove = function (arr, indexFrom, indexTo) {
	if (this._linked) {
		$.observable(arr).move(indexFrom, indexTo);

		if (this.debug()) {
			console.log('ForerunnerDB.Collection: Moving data-bound document array index from "' + indexFrom + '" to "' + indexTo + '" for collection "' + this.name() + '"');
		}
	} else {
		arr.splice(indexTo, 0, arr.splice(indexFrom, 1)[0]);

		if (this.debug()) {
			console.log('ForerunnerDB.Collection: Moving non-data-bound document array index from "' + indexFrom + '" to "' + indexTo + '" for collection "' + this.name() + '"');
		}
	}
};

/**
 * Inserts an item into the passed array at the specified index.
 * @param {Array} arr The array to insert into.
 * @param {Number} index The index to insert at.
 * @param {Object} doc The document to insert.
 * @private
 */
Collection.prototype._updateSplicePush = function (arr, index, doc) {
	if (arr.length > index) {
		if (this._linked) {
			$.observable(arr).insert(index, doc);
		} else {
			arr.splice(index, 0, doc);
		}
	} else {
		if (this._linked) {
			$.observable(arr).insert(doc);
		} else {
			arr.push(doc);
		}
	}
};

/**
 * Inserts an item at the end of an array.
 * @param {Array} arr The array to insert the item into.
 * @param {Object} doc The document to insert.
 * @private
 */
Collection.prototype._updatePush = function (arr, doc) {
	if (this._linked) {
		$.observable(arr).insert(doc);
	} else {
		arr.push(doc);
	}
};

/**
 * Removes an item from the passed array.
 * @param {Array} arr The array to modify.
 * @param {Number} index The index of the item in the array to remove.
 * @private
 */
Collection.prototype._updatePull = function (arr, index) {
	if (this._linked) {
		$.observable(arr).remove(index);
	} else {
		arr.splice(index, 1);
	}
};

/**
 * Increments a value for a property on a document by the passed number.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to increment by.
 * @private
 */
Collection.prototype._updateIncrement = function (doc, prop, val) {
	if (this._linked) {
		$.observable(doc).setProperty(prop, doc[prop] + val);
	} else {
		doc[prop] += val;
	}
};

/**
 * Removes any documents from the collection that match the search query
 * key/values.
 * @param {Object} query The query object.
 * @returns {Array} An array of the documents that were removed.
 */
Collection.prototype.remove = function (query) {
	var self = this,
		dataSet,
		index,
		views = this._views,
		viewIndex,
		dataItem,
		arrIndex,
		returnArr;

	if (query instanceof Array) {
		returnArr = [];

		for (arrIndex = 0; arrIndex < query.length; arrIndex++) {
			returnArr.push(this.remove(query[arrIndex]));
		}

		return returnArr;
	} else {
		dataSet = this.find(query, {decouple: false});
		if (dataSet.length) {
			// Remove the data from the collection
			for (var i = 0; i < dataSet.length; i++) {
				dataItem = dataSet[i];

				// Remove the item from the collection's indexes
				this._removeIndex(dataItem);

				// Remove data from internal stores
				index = this._data.indexOf(dataItem);

				if (this._linked) {
					$.observable(this._data).remove(index);
				} else {
					this._data.splice(index, 1);
				}
			}

			// Loop views and pass them the remove query
			if (views && views.length) {
				for (viewIndex = 0; viewIndex < views.length; viewIndex++) {
					views[viewIndex].remove(query);
				}
			}

			this._onRemove(dataSet);
			this.deferEmit('change', {type: 'remove', data: dataSet});
		}

		return dataSet;
	}
};

/**
 * Helper method that removes a document that matches the given id.
 * @param {String} id The id of the document to remove.
 * @returns {Array} An array of documents that were removed.
 */
Collection.prototype.removeById = function (id) {
	var searchObj = {};
	searchObj[this._primaryKey] = id;
	return this.remove(searchObj);
};

/**
 * Queues an event to be fired. This has automatic de-bouncing so that any
 * events of the same type that occur within 100 milliseconds of a previous
 * one will all be wrapped into a single emit rather than emitting tons of
 * events for lots of chained inserts etc.
 * @private
 */
Collection.prototype.deferEmit = function () {
	var self = this,
		args;

	if (!this._noEmitDefer && (!this._db || (this._db && !this._db._noEmitDefer))) {
		args = arguments;

		// Check for an existing timeout
		if (this._changeTimeout) {
			clearTimeout(this._changeTimeout);
		}

		// Set a timeout
		this._changeTimeout = setTimeout(function () {
			if (self.debug()) { console.log('ForerunnerDB.Collection: Emitting ' + args[0]); }
			self.emit.apply(self, args);
		}, 100);
	} else {
		this.emit.apply(this, arguments);
	}
};

/**
 * Processes a deferred action queue.
 * @param {String} type The queue name to process.
 * @param {Function} callback A method to call when the queue has processed.
 */
Collection.prototype.processQueue = function (type, callback) {
	var queue = this._deferQueue[type],
		deferThreshold = this._deferThreshold[type],
		deferTime = this._deferTime[type];

	if (queue.length) {
		var self = this,
			dataArr;

		// Process items up to the threshold
		if (queue.length) {
			if (queue.length > deferThreshold) {
				// Grab items up to the threshold value
				dataArr = queue.splice(0, deferThreshold);
			} else {
				// Grab all the remaining items
				dataArr = queue.splice(0, queue.length);
			}

			this[type](dataArr);
		}

		// Queue another process
		setTimeout(function () {
			self.processQueue(type, callback);
		}, deferTime);
	} else {
		if (callback) { callback(); }
	}
};

/**
 * Inserts a document or array of documents into the collection.
 * @param {Object||Array} data Either a document object or array of document
 * @param {Number=} index Optional index to insert the record at.
 * @param {Function=} callback Optional callback called once action is complete.
 * objects to insert into the collection.
 */
Collection.prototype.insert = function (data, index, callback) {
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
 * Inserts a document or array of documents into the collection.
 * @param {Object||Array} data Either a document object or array of document
 * @param {Number=} index Optional index to insert the record at.
 * @param {Function=} callback Optional callback called once action is complete.
 * objects to insert into the collection.
 */
Collection.prototype._insertHandle = function (data, index, callback) {
	var self = this,
		queue = this._deferQueue.insert,
		deferThreshold = this._deferThreshold.insert,
		deferTime = this._deferTime.insert,
		inserted = [],
		failed = [],
		insertResult,
		views = this._views,
		viewIndex,
		i;

	if (data instanceof Array) {
		// Check if there are more insert items than the insert defer
		// threshold, if so, break up inserts so we don't tie up the
		// ui or thread
		if (data.length > deferThreshold) {
			// Break up insert into blocks
			this._deferQueue.insert = queue.concat(data);

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

	// Loop views and pass them the insert query
	if (views && views.length) {
		for (viewIndex = 0; viewIndex < views.length; viewIndex++) {
			views[viewIndex].insert(data, index);
		}
	}

	this._onInsert(inserted, failed);
	if (callback) { callback(); }
	this.deferEmit('change', {type: 'insert', data: inserted});

	return {
		inserted: inserted,
		failed: failed
	};
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
		var indexViolation;

		this._ensurePrimaryKey(doc);

		// Check indexes are not going to be broken by the document
		indexViolation = this.insertIndexViolation(doc);

		if (!indexViolation) {
			// Add the item to the collection's indexes
			this._insertIndex(doc);

			// Insert the document
			if (this._linked) {
				$.observable(this._data).insert(index, doc);
			} else {
				this._data.splice(index, 0, doc);
			}

			return true;
		} else {
			return 'Index violation in index: ' + indexViolation;
		}
	}

	return 'No document passed to insert';
};

/**
 * Inserts a document into the collection indexes.
 * @param {Object} doc The document to insert.
 * @private
 */
Collection.prototype._insertIndex = function (doc) {
	var arr = this._indexByName,
		arrIndex,
		jString = JSON.stringify(doc);

	// Insert to primary key index
	this._primaryIndex.uniqueSet(doc[this._primaryKey], doc);
	this._primaryCrc.uniqueSet(doc[this._primaryKey], jString);
	this._crcLookup.uniqueSet(jString, doc);

	// Insert into other indexes
	for (arrIndex in arr) {
		if (arr.hasOwnProperty(arrIndex)) {
			arr[arrIndex].insert(doc);
		}
	}
};

/**
 * Removes a document from the collection indexes.
 * @param {Object} doc The document to remove.
 * @private
 */
Collection.prototype._removeIndex = function (doc) {
	var arr = this._indexByName,
		arrIndex,
		jString = JSON.stringify(doc);

	// Remove from primary key index
	this._primaryIndex.unSet(doc[this._primaryKey]);
	this._primaryCrc.unSet(doc[this._primaryKey]);
	this._crcLookup.unSet(jString);

	// Remove from other indexes
	for (arrIndex in arr) {
		if (arr.hasOwnProperty(arrIndex)) {
			arr[arrIndex].remove(doc);
		}
	}
};

/**
 * Uses the passed query to generate a new collection with results
 * matching the query parameters.
 *
 * @param query
 * @param options
 * @returns {*}
 */
Collection.prototype.subset = function (query, options) {
	var result = this.find(query, options);

	return new Collection()
		._subsetOf(this)
		.primaryKey(this._primaryKey)
		.setData(result);
};

/**
 * Gets the collection that this collection is a subset of.
 * @returns {Collection}
 */
Collection.prototype.subsetOf = function () {
	return this.__subsetOf;
};

/**
 * Sets the collection that this collection is a subset of.
 * @param {Collection} collection The collection to set as the parent of this subset.
 * @returns {*} This object for chaining.
 * @private
 */
Collection.prototype._subsetOf = function (collection) {
	this.__subsetOf = collection;
	return this;
};

/**
 * Find the distinct values for a specified field across a single collection and
 * returns the results in an array.
 * @param {String} key The field path to return distinct values for e.g. "person.name".
 * @param {Object=} query The query to use to filter the documents used to return values from.
 * @param {Object=} options The query options to use when running the query.
 * @returns {Array}
 */
Collection.prototype.distinct = function (key, query, options) {
	var data = this.find(query, options),
		pathSolver = new Path(key),
		valueUsed = {},
		distinctValues = [],
		value,
		i;

	// Loop the data and build array of distinct values
	for (i = 0; i < data.length; i++) {
		value = pathSolver.value(data[i])[0];

		if (value && !valueUsed[value]) {
			valueUsed[value] = true;
			distinctValues.push(value);
		}
	}

	return distinctValues;
};

/**
 * Returns a non-referenced version of the passed object / array.
 * @param {Object} data The object or array to return as a non-referenced version.
 * @returns {*}
 */
Collection.prototype.decouple = function (data) {
	return JSON.parse(JSON.stringify(data));
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
 * @param search The string to search for. Case sensitive.
 * @param options A standard find() options object.
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
			arrItem = JSON.stringify(arr[arrIndex]);

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
 * Queries the collection based on the query object passed.
 * @param {Object} query The query key/values that a document must match in
 * order for it to be returned in the result array.
 * @param {Object=} options An optional options object.
 *
 * @returns {Array} The results array from the find operation, containing all
 * documents that matched the query.
 */
Collection.prototype.find = function (query, options) {
	query = query || {};
	options = options || {};

	options.decouple = options.decouple !== undefined ? options.decouple : true;

	var op = this._metrics.create('find'),
		self = this,
		analysis,
		finalQuery,
		requiresTableScan = true,
		resultArr,
		joinCollectionIndex,
		joinIndex,
		joinCollection = {},
		joinQuery,
		joinPath,
		joinCollectionName,
		joinCollectionInstance,
		joinMatch,
		joinMatchIndex,
		joinSearch,
		joinMulti,
		joinRequire,
		joinFindResults,
		resultCollectionName,
		resultIndex,
		resultRemove = [],
		index,
		i,
		matcher = function (doc) {
			return self._match(doc, query, 'and');
		};

	op.start();
	if (query) {
		// Get query analysis to execute best optimised code path
		op.time('analyseQuery');
		analysis = this._analyseQuery(query, options, op);
		op.time('analyseQuery');
		op.data('analysis', analysis);

		if (analysis.hasJoin && analysis.queriesJoin) {
			// The query has a join and tries to limit by it's joined data
			// Get an instance reference to the join collections
			op.time('joinReferences');
			for (joinIndex = 0; joinIndex < analysis.joinsOn.length; joinIndex++) {
				joinCollectionName = analysis.joinsOn[joinIndex];
				joinPath = new Path(analysis.joinQueries[joinCollectionName]);
				joinQuery = joinPath.value(query)[0];
				joinCollection[analysis.joinsOn[joinIndex]] = this._db.collection(analysis.joinsOn[joinIndex]).subset(joinQuery);
			}
			op.time('joinReferences');
		}

		// Check if an index lookup can be used to return this result
		if (analysis.indexMatch.length && (!options || (options && !options.skipIndex))) {
			op.data('index.potential', analysis.indexMatch);
			op.data('index.used', analysis.indexMatch[0].index);

			// Get the data from the index
			op.time('indexLookup');
			resultArr = analysis.indexMatch[0].lookup;
			op.time('indexLookup');

			// Check if the index coverage is all keys, if not we still need to table scan it
			if (analysis.indexMatch[0].keyData.totalKeyCount === analysis.indexMatch[0].keyData.matchedKeyCount) {
				// Require a table scan to find relevant documents
				requiresTableScan = false;
			}
		} else {
			op.flag('usedIndex', false);
		}

		if (requiresTableScan) {
			op.time('tableScan');
			if (resultArr && resultArr.length) {
				// Filter the source data and return the result
				resultArr = resultArr.filter(matcher);
			} else {
				// Filter the source data and return the result
				resultArr = this._data.filter(matcher);
			}

			// Order the array if we were passed a sort clause
			if (options.sort) {
				op.time('sort');
				resultArr = this.sort(options.sort, resultArr);
				op.time('sort');
			}
			op.time('tableScan');
		}

		if (options.limit && resultArr && resultArr.length > options.limit) {
			resultArr.length = options.limit;
			op.data('limit', options.limit);
		}

		if (options.decouple) {
			// Now decouple the data from the original objects
			op.time('decouple');
			resultArr = this.decouple(resultArr);
			op.time('decouple');
			op.data('flag.decouple', true);
		}

		// Now process any joins on the final data
		if (options.join) {
			for (joinCollectionIndex = 0; joinCollectionIndex < options.join.length; joinCollectionIndex++) {
				for (joinCollectionName in options.join[joinCollectionIndex]) {
					if (options.join[joinCollectionIndex].hasOwnProperty(joinCollectionName)) {
						// Set the key to store the join result in to the collection name by default
						resultCollectionName = joinCollectionName;

						// Get the join collection instance from the DB
						joinCollectionInstance = this._db.collection(joinCollectionName);

						// Get the match data for the join
						joinMatch = options.join[joinCollectionIndex][joinCollectionName];

						// Loop our result data array
						for (resultIndex = 0; resultIndex < resultArr.length; resultIndex++) {
							// Loop the join conditions and build a search object from them
							joinSearch = {};
							joinMulti = false;
							joinRequire = false;
							for (joinMatchIndex in joinMatch) {
								if (joinMatch.hasOwnProperty(joinMatchIndex)) {
									// Check the join condition name for a special command operator
									if (joinMatchIndex.substr(0, 1) === '$') {
										// Special command
										switch (joinMatchIndex) {
											case '$as':
												// Rename the collection when stored in the result document
												resultCollectionName = joinMatch[joinMatchIndex];
												break;

											case '$multi':
												// Return an array of documents instead of a single matching document
												joinMulti = joinMatch[joinMatchIndex];
												break;

											case '$require':
												// Remove the result item if no matching join data is found
												joinRequire = joinMatch[joinMatchIndex];
												break;

											default:
												// Check for a double-dollar which is a back-reference to the root collection item
												if (joinMatchIndex.substr(0, 3) === '$$.') {
													// Back reference
													// TODO: Support complex joins
												}
												break;
										}
									} else {
										// TODO: Could optimise this by caching path objects
										// Get the data to match against and store in the search object
										joinSearch[joinMatchIndex] = new Path(joinMatch[joinMatchIndex]).value(resultArr[resultIndex])[0];
									}
								}
							}

							// Do a find on the target collection against the match data
							joinFindResults = joinCollectionInstance.find(joinSearch);

							// Check if we require a joined row to allow the result item
							if (!joinRequire || (joinRequire && joinFindResults[0])) {
								// Join is not required or condition is met
								resultArr[resultIndex][resultCollectionName] = joinMulti === false ? joinFindResults[0] : joinFindResults;
							} else {
								// Join required but condition not met, add item to removal queue
								resultRemove.push(resultArr[resultIndex]);
							}
						}
					}
				}
			}

			op.data('flag.join', true);
		}

		// Process removal queue
		op.time('removalQueue');
		for (i = 0; i < resultRemove.length; i++) {
			index = resultArr.indexOf(resultRemove[i]);

			if (index > -1) {
				resultArr.splice(index, 1);
			}
		}
		op.time('removalQueue');

		if (options.transform) {
			op.time('transform');
			for (i = 0; i < resultArr.length; i++) {
				resultArr.splice(i, 1, options.transform(resultArr[i]));
			}
			op.time('transform');
			op.data('flag.transform', true);
		}

		// Process transforms
		op.time('transformOut');
		resultArr = this.transformOut(resultArr);
		op.time('transformOut');

		op.stop();

		resultArr.__fdbOp = op;

		return resultArr;
	} else {
		op.stop();

		resultArr = [];
		resultArr.__fdbOp = op;

		return resultArr;
	}
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
			if (obj === false) {
				// Turn off transforms
				this._transformEnabled = false;
			} else {
				// Turn on transforms
				this._transformEnabled = true;
			}
		}

		return this;
	}

	return {
		enabled: this._transformEnabled,
		dataIn: this._transformIn,
		dataOut: this._transformOut
	}
};

/**
 * Transforms data using the set transformIn method.
 * @param {Object} data The data to transform.
 * @returns {*}
 */
Collection.prototype.transformIn = function (data) {
	if (this._transformEnabled && this._transformIn) {
		if (data instanceof Array) {
			var finalArr = [], i;

			for (i = 0; i < data.length; i++) {
				finalArr[i] = this._transformIn(data[i]);
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
			var finalArr = [], i;

			for (i = 0; i < data.length; i++) {
				finalArr[i] = this._transformOut(data[i]);
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
	// Make sure we have an array object
	arr = arr || [];

	var	sortArr = [],
		sortKey,
		sortSingleObj;

	for (sortKey in sortObj) {
		if (sortObj.hasOwnProperty(sortKey)) {
			sortSingleObj = {};
			sortSingleObj[sortKey] = sortObj[sortKey];
			sortSingleObj.___fdbKey = sortKey;
			sortArr.push(sortSingleObj);
		}
	}

	if (sortArr.length < 2) {
		// There is only one sort criteria, do a simple sort and return it
		return this._sort(sortObj, arr);
	} else {
		return this._bucketSort(sortArr, arr);
	}
};

/**
 * Takes array of sort paths and sorts them into buckets before returning final
 * array fully sorted by multi-keys.
 * @param keyArr
 * @param arr
 * @returns {*}
 * @private
 */
Collection.prototype._bucketSort = function (keyArr, arr) {
	var keyObj = keyArr.shift(),
		arrCopy,
		buckets,
		i,
		finalArr = [];

	if (keyArr.length > 0) {
		// Sort array by bucket key
		arr = this._sort(keyObj, arr);

		// Split items into buckets
		buckets = this.bucket(keyObj.___fdbKey, arr);

		// Loop buckets and sort contents
		for (i in buckets) {
			if (buckets.hasOwnProperty(i)) {
				arrCopy = [].concat(keyArr);
				finalArr = finalArr.concat(this._bucketSort(arrCopy, buckets[i]));
			}
		}

		return finalArr;
	} else {
		return this._sort(keyObj, arr);
	}
};

/**
 * Sorts array by individual sort path.
 * @param key
 * @param arr
 * @returns {Array|*}
 * @private
 */
Collection.prototype._sort = function (key, arr) {
	var sorterMethod,
		pathSolver = new Path(),
		dataPath = pathSolver.parse(key, true)[0];

	pathSolver.path(dataPath.path);

	if (dataPath.value === 1) {
		// Sort ascending
		sorterMethod = function (a, b) {
			var valA = pathSolver.value(a)[0],
				valB = pathSolver.value(b)[0];

			if (typeof(valA) === 'string' && typeof(valB) === 'string') {
				return valA.localeCompare(valB);
			} else {
				if (valA > valB) {
					return 1;
				} else if (valA < valB) {
					return -1;
				}
			}

			return 0;
		};
	} else {
		// Sort descending
		sorterMethod = function (a, b) {
			var valA = pathSolver.value(a)[0],
				valB = pathSolver.value(b)[0];

			if (typeof(valA) === 'string' && typeof(valB) === 'string') {
				return valA.localeCompare(valB) === 1 ? -1 : 1;
			} else {
				if (valA > valB) {
					return -1;
				} else if (valA < valB) {
					return 1;
				}
			}

			return 0;
		};
	}

	return arr.sort(sorterMethod);
};

/**
 * Takes an array of objects and returns a new object with the array items
 * split into buckets by the passed key.
 * @param {String} key The key to split the array into buckets by.
 * @param {Array} arr An array of objects.
 * @returns {Object}
 */
Collection.prototype.bucket = function (key, arr) {
	var i,
		buckets = {};

	for (i = 0; i < arr.length; i++) {
		buckets[arr[i][key]] = buckets[arr[i][key]] || [];
		buckets[arr[i][key]].push(arr[i]);
	}

	return buckets;
};

/**
 * Internal method that takes a search query and options and returns an object
 * containing details about the query which can be used to optimise the search.
 *
 * @param query
 * @param options
 * @param op
 * @returns {Object}
 * @private
 */
Collection.prototype._analyseQuery = function (query, options, op) {
	var analysis = {
			queriesOn: [this._name],
			indexMatch: [],
			hasJoin: false,
			queriesJoin: false,
			joinQueries: {},
			query: query,
			options: options
		},
		joinCollectionIndex,
		joinCollectionName,
		joinCollections = [],
		joinCollectionReferences = [],
		queryPath,
		index,
		indexMatchData,
		indexRef,
		indexRefName,
		indexLookup,
		pathSolver,
		i;

	// Check if the query is a primary key lookup
	op.time('checkIndexes');
	if (query[this._primaryKey] !== undefined) {
		// Return item via primary key possible
		op.time('checkIndexMatch: Primary Key');
		pathSolver = new Path();
		analysis.indexMatch.push({
			lookup: this._primaryIndex.lookup(query, options),
			keyData: {
				matchedKeys: [this._primaryKey],
				matchedKeyCount: 1,
				totalKeyCount: pathSolver.countKeys(query)
			},
			index: this._primaryIndex
		});
		op.time('checkIndexMatch: Primary Key');
	}

	// Check if an index can speed up the query
	for (i in this._indexById) {
		if (this._indexById.hasOwnProperty(i)) {
			indexRef = this._indexById[i];
			indexRefName = indexRef.name();

			op.time('checkIndexMatch: ' + indexRefName);
			indexMatchData = indexRef.match(query, options);
			indexLookup = indexRef.lookup(query, options);

			if (indexMatchData.matchedKeyCount > 0) {
				// This index can be used, store it
				analysis.indexMatch.push({
					lookup: indexLookup,
					keyData: indexMatchData,
					index: indexRef
				});
			}
			op.time('checkIndexMatch: ' + indexRefName);

			if (indexMatchData.totalKeyCount === indexMatchData.matchedKeyCount) {
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
			if (a.keyData.totalKeyCount === a.keyData.matchedKeyCount) {
				// This index matches all query keys so will return the correct result instantly
				return -1;
			}

			if (b.keyData.totalKeyCount === b.keyData.matchedKeyCount) {
				// This index matches all query keys so will return the correct result instantly
				return 1;
			}

			// The indexes don't match all the query keys, check if both these indexes match
			// the same number of keys and if so they are technically equal from a key point
			// of view, but can still be compared by the number of records they return from
			// the query. The fewer records they return the better so order by record count
			if (a.keyData.matchedKeyCount === b.keyData.matchedKeyCount) {
				return a.lookup.length - b.lookup.length;
			}

			// The indexes don't match all the query keys and they don't have matching key
			// counts, so order them by key count. The index with the most matching keys
			// should return the query results the fastest
			return b.keyData.matchedKeyCount - a.keyData.matchedKeyCount; // index._keyCount
		});
		op.time('findOptimalIndex');
	}

	// Check for join data
	if (options.join) {
		analysis.hasJoin = true;

		// Loop all join operations
		for (joinCollectionIndex = 0; joinCollectionIndex < options.join.length; joinCollectionIndex++) {
			// Loop the join collections and keep a reference to them
			for (joinCollectionName in options.join[joinCollectionIndex]) {
				if (options.join[joinCollectionIndex].hasOwnProperty(joinCollectionName)) {
					joinCollections.push(joinCollectionName);

					// Check if the join uses an $as operator
					if ('$as' in options.join[joinCollectionIndex][joinCollectionName]) {
						joinCollectionReferences.push(options.join[joinCollectionIndex][joinCollectionName]['$as']);
					} else {
						joinCollectionReferences.push(joinCollectionName);
					}
				}
			}
		}

		// Loop the join collection references and determine if the query references
		// any of the collections that are used in the join. If there no queries against
		// joined collections the find method can use a code path optimised for this.
		// Queries against joined collections requires the joined collections to be filtered
		// first and then joined so requires a little more work.
		for (index = 0; index < joinCollectionReferences.length; index++) {
			// Check if the query references any collection data that the join will create
			queryPath = this._queryReferencesCollection(query, joinCollectionReferences[index], '');

			if (queryPath) {
				analysis.joinQueries[joinCollections[index]] = queryPath;
				analysis.queriesJoin = true;
			}
		}

		analysis.joinsOn = joinCollections;
		analysis.queriesOn = analysis.queriesOn.concat(joinCollections);
	}

	return analysis;
};

/**
 * Checks if the passed query references this collection.
 * @param query
 * @param collection
 * @param path
 * @returns {*}
 * @private
 */
Collection.prototype._queryReferencesCollection = function (query, collection, path) {
	var i;

	for (i in query) {
		if (query.hasOwnProperty(i)) {
			// Check if this key is a reference match
			if (i === collection) {
				if (path) { path += '.'; }
				return path + i;
			} else {
				if (typeof(query[i]) === 'object') {
					// Recurse
					if (path) { path += '.'; }
					path += i;
					return this._queryReferencesCollection(query[i], collection, path);
				}
			}
		}
	}

	return false;
};

/**
 * Internal method that checks a document against a test object.
 * @param {*} source The source object or value to test against.
 * @param {*} test The test object or value to test with.
 * @param {String=} opToApply The special operation to apply to the test such
 * as 'and' or an 'or' operator.
 * @returns {Boolean} True if the test was positive, false on negative.
 * @private
 */
Collection.prototype._match = function (source, test, opToApply) {
	var operation,
		applyOp,
		recurseVal,
		tmpIndex,
		sourceType = typeof source,
		testType = typeof test,
		matchedAll = true,
		i;

	// Check if the comparison data are both strings or numbers
	if ((sourceType === 'string' || sourceType === 'number') && (testType === 'string' || testType === 'number')) {
		// The source and test data are flat types that do not require recursive searches,
		// so just compare them and return the result
		if (source !== test) {
			matchedAll = false;
		}
	} else {
		for (i in test) {
			if (test.hasOwnProperty(i)) {
				// Reset operation flag
				operation = false;

				// Check if the property starts with a dollar (function)
				if (i.substr(0, 1) === '$') {
					// Check for commands
					switch (i) {
						case '$gt':
							// Greater than
							if (source > test[i]) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								matchedAll = false;
							}
							operation = true;
							break;

						case '$gte':
							// Greater than or equal
							if (source >= test[i]) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								matchedAll = false;
							}
							operation = true;
							break;

						case '$lt':
							// Less than
							if (source < test[i]) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								matchedAll = false;
							}
							operation = true;
							break;

						case '$lte':
							// Less than or equal
							if (source <= test[i]) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								matchedAll = false;
							}
							operation = true;
							break;

						case '$exists':
							// Property exists
							if ((source === undefined) !== test[i]) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								matchedAll = false;
							}
							operation = true;
							break;

						case '$or':
							// Match true on ANY check to pass
							operation = true;

							for (var orIndex = 0; orIndex < test[i].length; orIndex++) {
								if (this._match(source, test[i][orIndex], 'and')) {
									return true;
								} else {
									matchedAll = false;
								}
							}
							break;

						case '$and':
							// Match true on ALL checks to pass
							operation = true;

							for (var andIndex = 0; andIndex < test[i].length; andIndex++) {
								if (!this._match(source, test[i][andIndex], 'and')) {
									return false;
								}
							}
							break;

						case '$in':
							// In

							// Check that the in test is an array
							if (test[i] instanceof Array) {
								var inArr = test[i],
									inArrCount = inArr.length,
									inArrIndex,
									isIn = false;

								for (inArrIndex = 0; inArrIndex < inArrCount; inArrIndex++) {
									if (inArr[inArrIndex] === source) {
										isIn = true;
										break;
									}
								}

								if (isIn) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							} else {
								throw('Cannot use a $nin operator on a non-array key: ' + i);
							}

							operation = true;
							break;

						case '$nin':
							// Not in

							// Check that the not-in test is an array
							if (test[i] instanceof Array) {
								var notInArr = test[i],
									notInArrCount = notInArr.length,
									notInArrIndex,
									notIn = true;

								for (notInArrIndex = 0; notInArrIndex < notInArrCount; notInArrIndex++) {
									if (notInArr[notInArrIndex] === source) {
										notIn = false;
										break;
									}
								}

								if (notIn) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							} else {
								throw('Cannot use a $nin operator on a non-array key: ' + i);
							}

							operation = true;
							break;

						case '$ne':
							// Not equals
							if (source != test[i]) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								matchedAll = false;
							}
							operation = true;
							break;
					}
				}

				// Check for regex
				if (!operation && test[i] instanceof RegExp) {
					operation = true;

					if (typeof(source) === 'object' && source[i] !== undefined && test[i].test(source[i])) {
						if (opToApply === 'or') {
							return true;
						}
					} else {
						matchedAll = false;
					}
				}

				if (!operation) {
					// Check if our query is an object
					if (typeof(test[i]) === 'object') {
						// Because test[i] is an object, source must also be an object

						// Check if our source data we are checking the test query against
						// is an object or an array
						if (source[i] !== undefined) {
							if (source[i] instanceof Array && !(test[i] instanceof Array)) {
								// The source data is an array, so check each item until a
								// match is found
								recurseVal = false;
								for (tmpIndex = 0; tmpIndex < source[i].length; tmpIndex++) {
									recurseVal = this._match(source[i][tmpIndex], test[i], applyOp);

									if (recurseVal) {
										// One of the array items matched the query so we can
										// include this item in the results, so break now
										break;
									}
								}

								if (recurseVal) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							} else if (!(source[i] instanceof Array) && test[i] instanceof Array) {
								// The test key data is an array and the source key data is not so check
								// each item in the test key data to see if the source item matches one
								// of them. This is effectively an $in search.
								recurseVal = false;

								for (tmpIndex = 0; tmpIndex < test[i].length; tmpIndex++) {
									recurseVal = this._match(source[i], test[i][tmpIndex], applyOp);

									if (recurseVal) {
										// One of the array items matched the query so we can
										// include this item in the results, so break now
										break;
									}
								}

								if (recurseVal) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							} else if (typeof(source) === 'object') {
								// Recurse down the object tree
								recurseVal = this._match(source[i], test[i], applyOp);

								if (recurseVal) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							} else {
								recurseVal = this._match(undefined, test[i], applyOp);

								if (recurseVal) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							}
						} else {
							// First check if the test match is an $exists
							if (test[i] && test[i]['$exists'] !== undefined) {
								// Push the item through another match recurse
								recurseVal = this._match(undefined, test[i], applyOp);

								if (recurseVal) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							} else {
								matchedAll = false;
							}
						}
					} else {
						// Check if the prop matches our test value
						if (source && source[i] === test[i]) {
							if (opToApply === 'or') {
								return true;
							}
						} else if (source && source[i] && source[i] instanceof Array && test[i] && typeof(test[i]) !== "object") {
							// We are looking for a value inside an array

							// The source data is an array, so check each item until a
							// match is found
							recurseVal = false;
							for (tmpIndex = 0; tmpIndex < source[i].length; tmpIndex++) {
								recurseVal = this._match(source[i][tmpIndex], test[i], applyOp);

								if (recurseVal) {
									// One of the array items matched the query so we can
									// include this item in the results, so break now
									break;
								}
							}

							if (recurseVal) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								matchedAll = false;
							}
						} else {
							matchedAll = false;
						}
					}
				}

				if (opToApply === 'and' && !matchedAll) {
					return false;
				}
			}
		}
	}

	return matchedAll;
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
 * Creates a link to the DOM between the collection data and the elements
 * in the passed output selector. When new elements are needed or changes
 * occur the passed templateSelector is used to get the template that is
 * output to the DOM.
 * @param outputTargetSelector
 * @param templateSelector
 */
Collection.prototype.link = function (outputTargetSelector, templateSelector) {
	// Check for existing data binding
	this._links = this._links || {};

	if (!this._links[templateSelector]) {
		if ($(outputTargetSelector).length) {
			// Ensure the template is in memory and if not, try to get it
			if (!$.templates[templateSelector]) {
				// Grab the template
				var template = $(templateSelector);
				if (template.length) {
					$.views.templates(templateSelector, $(template[0]).html());
				} else {
					throw('Unable to bind collection to target because template does not exist: ' + templateSelector);
				}
			}

			// Create the data binding
			$.templates[templateSelector].link(outputTargetSelector, this._data);

			// Add link to flags
			this._links[templateSelector] = outputTargetSelector;

			// Set the linked flag
			this._linked++;

			if (this.debug()) {
				console.log('ForerunnerDB.Collection: Added binding collection "' + this.name() + '" to output target: ' + outputTargetSelector);
			}

			return this;
		} else {
			throw('Cannot bind view data to output target selector "' + outputTargetSelector + '" because it does not exist in the DOM!');
		}
	}

	throw('Cannot create a duplicate link to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
};

/**
 * Removes a link to the DOM between the collection data and the elements
 * in the passed output selector that was created using the link() method.
 * @param outputTargetSelector
 * @param templateSelector
 */
Collection.prototype.unlink = function (outputTargetSelector, templateSelector) {
	// Check for binding
	this._links = this._links || {};

	if (this._links[templateSelector]) {
		// Remove the data binding
		$.templates[templateSelector].unlink(outputTargetSelector);

		// Remove link from flags
		delete this._links[templateSelector];

		// Set the linked flag
		this._linked--;

		if (this.debug()) {
			console.log('ForerunnerDB.Collection: Removed binding collection "' + this.name() + '" to output target: ' + outputTargetSelector);
		}

		return this;
	}

	console.log('Cannot remove link, one does not exist to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
};

/**
 * Finds sub-documents from the collection's documents.
 * @param match
 * @param path
 * @param subDocQuery
 * @param subDocOptions
 * @returns {*}
 */
Collection.prototype.findSub = function (match, path, subDocQuery, subDocOptions) {
	var pathHandler = new Path(path),
		docArr = this.find(match),
		docCount = docArr.length,
		docIndex,
		subDocArr,
		subDocCollection = this._db.collection('__FDB_temp_' + this.objectId()),
		subDocResults,
		resultObj = {
			parents: docCount,
			subDocTotal: 0,
			subDocs: [],
			pathFound: false,
			err: ''
		};

	for (docIndex = 0; docIndex < docCount; docIndex++) {
		subDocArr = pathHandler.value(docArr[docIndex])[0];
		if (subDocArr) {
			subDocCollection.setData(subDocArr);
			subDocResults = subDocCollection.find(subDocQuery, subDocOptions);
			if (subDocOptions.returnFirst && subDocResults.length) {
				return subDocResults[0];
			}

			resultObj.subDocs.push(subDocResults);
			resultObj.subDocTotal += subDocResults.length;
			resultObj.pathFound = true;
		}
	}

	// Drop the sub-document collection
	subDocCollection.drop();

	// Check if the call should not return stats, if so return only subDocs array
	if (subDocOptions.noStats) {
		return resultObj.subDocs;
	}

	if (!resultObj.pathFound) {
		resultObj.err = 'No objects found in the parent documents with a matching path of: ' + path;
	}

	return resultObj;
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
	this._indexByName = this._indexByName || {};
	this._indexById = this._indexById || {};

	var index = new Index(keys, options, this),
		time = {
			start: new Date().getTime()
		};

	// Check the index does not already exist
	if (this._indexByName[index.name()]) {
		// Index already exists
		return {
			err: 'Index with that name already exists'
		};
	}

	if (this._indexById[index.id()]) {
		// Index already exists
		return {
			err: 'Index with those keys already exists'
		};
	}

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
 * Generates a new 16-character hexadecimal unique ID or
 * generates a new 16-character hexadecimal ID based on
 * the passed string. Will always generate the same ID
 * for the same string.
 * @param {String=} str A string to generate the ID from.
 * @return {String}
 */
Collection.prototype.objectId = function (str) {
	var id;

	if (!str) {
		Shared.idCounter++;

		id = (Shared.idCounter + (
			Math.random() * Math.pow(10, 17) +
				Math.random() * Math.pow(10, 17) +
				Math.random() * Math.pow(10, 17) +
				Math.random() * Math.pow(10, 17)
			)
			).toString(16);
	} else {
		var val = 0,
			count = str.length,
			i;

		for (i = 0; i < count; i++) {
			val += str.charCodeAt(i) * Math.pow(10, 17);
		}

		id = val.toString(16);
	}

	return id;
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

	var pm = this.primaryKey(),
		arr,
		arrIndex,
		arrItem,
		arrCount;

	// Check if the primary key index of each collection can be utilised
	if (pm === collection.primaryKey()) {
		// Use the collection primary key index to do the diff (super-fast)
		arr = collection._data;
		arrCount = arr.length;

		// Loop the collection's data array and check for matching items
		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			arrItem = arr[arrIndex];

			// Check for a matching item in this collection
			if (this._primaryIndex.get(arrItem[pm])) {
				// Matching item exists, check if the data is the same
				if (this._primaryCrc.get(arrItem[pm]) === collection._primaryCrc.get(arrItem[pm])) {
					// Matching objects, no update required
				} else {
					// The documents exist in both collections but data differs, update required
					diff.update.push(arrItem);
				}
			} else {
				// The document is missing from this collection, insert requried
				diff.insert.push(arrItem);
			}
		}

		// Now loop this collection's data and check for matching items
		arr = this._data;
		arrCount = arr.length;

		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			arrItem = arr[arrIndex];
			if (!collection._primaryIndex.get(arrItem[pm])) {
				// The document does not exist in the other collection, remove required
				diff.remove.push(arrItem);
			}
		}
	} else {
		// The primary keys of each collection are different so the primary
		// key index cannot be used for diffing, do an old-fashioned diff

	}

	return diff;
};

/**
 * Get a collection by name. If the collection does not already exist
 * then one is created for that name automatically.
 * @param {String} collectionName The name of the collection.
 * @param {String=} primaryKey Optional primary key to specify the primary key field on the collection
 * objects. Defaults to "_id".
 * @returns {Collection}
 */
Core.prototype.collection = function (collectionName, primaryKey) {
	if (collectionName) {
		if (!this._collection[collectionName]) {
			if (this.debug()) {
				console.log('Creating collection ' + collectionName);
			}
		}

		this._collection[collectionName] = this._collection[collectionName] || new Collection(collectionName).db(this);

		if (primaryKey !== undefined) {
			this._collection[collectionName].primaryKey(primaryKey);
		}

		return this._collection[collectionName];
	} else {
		throw('Cannot get collection with undefined name!');
	}
};

/**
 * Determine if a collection with the passed name already exists.
 * @param {String} viewName The name of the collection to check for.
 * @returns {boolean}
 */
Core.prototype.collectionExists = function (viewName) {
	return Boolean(this._collection[viewName]);
};

/**
 * Returns an array of collections the DB currently has.
 * @returns {Array} An array of objects containing details of each collection
 * the database is currently managing.
 */
Core.prototype.collections = function () {
	var arr = [],
		i;

	for (i in this._collection) {
		if (this._collection.hasOwnProperty(i)) {
			arr.push({
				name: i,
				count: this._collection[i].count()
			});
		}
	}

	return arr;
};

module.exports = Collection;