"use strict";

/**
 * The main collection class. Collections store multiple documents and
 * can operate on them using the query language to insert, read, update
 * and delete.
 */
var Shared,
	Core,
	Metrics,
	KeyValueStore,
	Path,
	IndexHashMap,
	IndexBinaryTree,
	Crc;

Shared = require('./Shared');

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

Shared.addModule('Collection', Collection);
Shared.mixin(Collection.prototype, 'Mixin.Common');
Shared.mixin(Collection.prototype, 'Mixin.Events');
Shared.mixin(Collection.prototype, 'Mixin.ChainReactor');
Shared.mixin(Collection.prototype, 'Mixin.CRUD');
Shared.mixin(Collection.prototype, 'Mixin.Constants');
Shared.mixin(Collection.prototype, 'Mixin.Triggers');
Shared.mixin(Collection.prototype, 'Mixin.Sorting');
Shared.mixin(Collection.prototype, 'Mixin.Matching');

Metrics = require('./Metrics');
KeyValueStore = require('./KeyValueStore');
Path = require('./Path');
IndexHashMap = require('./IndexHashMap');
IndexBinaryTree = require('./IndexBinaryTree');
Crc = require('./Crc');
Core = Shared.modules.Core;

/**
 * Returns a checksum of a string.
 * @param {String} string The string to checksum.
 * @return {String} The checksum generated.
 */
Collection.prototype.crc = Crc;

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
 * Get the internal data
 * @returns {Array}
 */
Collection.prototype.data = function () {
	return this._data;
};

/**
 * Drops a collection and all it's stored data from the database.
 * @returns {boolean} True on success, false on failure.
 */
Collection.prototype.drop = function () {
	if (this._state !== 'dropped') {
		if (this._db && this._db._collection && this._name) {
			if (this.debug()) {
				console.log('Dropping collection ' + this._name);
			}

			this._state = 'dropped';

			this.emit('drop', this);

			delete this._db._collection[this._name];

			if (this._groups && this._groups.length) {
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
			}

			delete this._primaryKey;
			delete this._primaryIndex;
			delete this._primaryCrc;
			delete this._crcLookup;
			delete this._name;
			delete this._data;
			delete this._groups;
			delete this._metrics;

			return true;
		}
	} else {
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
		if (this._primaryKey !== keyName) {
			this._primaryKey = keyName;

			// Set the primary key index primary key
			this._primaryIndex.primaryKey(keyName);

			// Rebuild the primary key index
			this.rebuildPrimaryKeyIndex();
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
 * Gets / sets the db instance this class instance belongs to.
 * @param {Core=} db The db instance.
 * @returns {*}
 */
Shared.synthesize(Collection.prototype, 'db', function (db) {
	if (db) {
		if (this.primaryKey() === '_id') {
			// Set primary key to the db's key by default
			this.primaryKey(db.primaryKey());
		}
	}

	return this.$super.apply(this, arguments);
});

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
		
		options = this.options(options);
		this.preSetData(data, options, callback);

		if (options.$decouple) {
			data = this.decouple(data);
		}

		if (!(data instanceof Array)) {
			data = [data];
		}

		op.time('transformIn');
		data = this.transformIn(data);
		op.time('transformIn');

		var oldData = [].concat(this._data);

		this._dataReplace(data);

		// Update the primary key index
		op.time('Rebuild Primary Key Index');
		this.rebuildPrimaryKeyIndex(options);
		op.time('Rebuild Primary Key Index');

		// Rebuild all other indexes
		op.time('Rebuild All Other Indexes');
		this._rebuildIndexes();
		op.time('Rebuild All Other Indexes');

		op.time('Resolve chains');
		this.chainSend('setData', data, {oldData: oldData});
		op.time('Resolve chains');

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
				throw('ForerunnerDB.Collection "' + this.name() + '": Call to setData on collection failed because your data violates the primary key unique constraint. One or more documents are using the same primary key: ' + arrItem[this._primaryKey]);
			}
		} else {
			pIndex.set(arrItem[pKey], arrItem);
		}

		// Generate a CRC string
		jString = JSON.stringify(arrItem);

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
	this.emit('truncate', this._data);

	// Clear all the data from the collection
	this._data.length = 0;

	// Re-create the primary index data
	this._primaryIndex = new KeyValueStore('primary');
	this._primaryCrc = new KeyValueStore('primaryCrc');
	this._crcLookup = new KeyValueStore('crcLookup');

	this.deferEmit('change', {type: 'truncate'});
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

				return {};
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
				returnData.result = this.insert(obj);
				break;

			case 'update':
				returnData.result = this.update(query, obj);
				break;

			default:
				break;
		}

		return returnData;
	} else {
		if (callback) { callback(); }
	}

	return {};
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
		dataSet,
		updated,
		updateCall = function (originalDoc) {
			var newDoc = self.decouple(originalDoc),
				triggerOperation,
				result;

			if (self.willTrigger(self.TYPE_UPDATE, self.PHASE_BEFORE) || self.willTrigger(self.TYPE_UPDATE, self.PHASE_AFTER)) {
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

				if (self.processTrigger(triggerOperation, self.TYPE_UPDATE, self.PHASE_BEFORE, originalDoc, newDoc) !== false) {
					// No triggers complained so let's execute the replacement of the existing
					// object with the new one
					result = self.updateObject(originalDoc, newDoc, triggerOperation.query, triggerOperation.options, '');

					// NOTE: If for some reason we would only like to fire this event if changes are actually going
					// to occur on the object from the proposed update then we can add "result &&" to the if
					self.processTrigger(triggerOperation, self.TYPE_UPDATE, self.PHASE_AFTER, originalDoc, newDoc);
				} else {
					// Trigger cancelled operation so tell result that it was not updated
					result = false;
				}
			} else {
				// No triggers complained so let's execute the replacement of the existing
				// object with the new one
				result = self.updateObject(originalDoc, update, query, options, '');
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
			op.time('Resolve chains');
			this.chainSend('update', {
				query: query,
				update: update,
				dataSet: dataSet
			}, options);
			op.time('Resolve chains');

			this._onUpdate(updated);
			this.deferEmit('change', {type: 'update', data: updated});
		}
	}

	op.stop();

	// TODO: Should we decouple the updated array before return by default?
	return updated || [];
};

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
		throw('ForerunnerDB.Collection "' + this.name() + '": Primary key violation in update! Key violated: ' + currentObj[this._primaryKey]);
	}

	// Update the object in the collection data
	//this._data.splice(this._data.indexOf(currentObj), 1, newObj);

	return true;
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
 * @param {Object} query The query object that we need to match to perform an update.
 * @param {Object} options An options object.
 * @param {String} path The current recursive path.
 * @param {String} opType The type of update operation to perform, if none is specified
 * default is to set new data against matching fields.
 * @returns {Boolean} True if the document was updated with new / changed data or
 * false if it was not updated because the data was the same.
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
		pathInstance,
		sourceIsArray,
		updateIsArray,
		i, k;

	// Loop each key in the update object
	for (i in update) {
		if (update.hasOwnProperty(i)) {
			// Reset operation flag
			operation = false;

			// Check if the property starts with a dollar (function)
			if (i.substr(0, 1) === '$') {
				// Check for commands
				switch (i) {
					case '$key':
					case '$index':
						// Ignore some operators
						operation = true;
						break;

					default:
						operation = true;

						// Now run the operation
						recurseUpdated = this.updateObject(doc, update[i], query, options, path, i);
						updated = updated || recurseUpdated;
						break;
				}
			}

			// Check if the key has a .$ at the end, denoting an array lookup
			if (this._isPositionalKey(i)) {
				operation = true;

				// Modify i to be the name of the field
				i = i.substr(0, i.length - 2);

				pathInstance = new Path(path + '.' + i);

				// Check if the key is an array and has items
				if (doc[i] && doc[i] instanceof Array && doc[i].length) {
					tmpArray = [];

					// Loop the array and find matches to our search
					for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
						if (this._match(doc[i][tmpIndex], pathInstance.value(query)[0], '', {})) {
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
							// The doc key is an object so traverse the
							// update further
							recurseUpdated = this.updateObject(doc[i], update[i], query, options, path + '.' + i, opType);
							updated = updated || recurseUpdated;
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
							this._updateIncrement(doc, i, update[i]);
							updated = true;
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
								throw('ForerunnerDB.Collection "' + this.name() + '": Cannot push to a key that is not an array! (' + i + ')');
							}
							break;

						case '$pull':
							if (doc[i] instanceof Array) {
								tmpArray = [];

								// Loop the array and find matches to our search
								for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
									if (this._match(doc[i][tmpIndex], update[i], '', {})) {
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
									throw('ForerunnerDB.Collection "' + this.name() + '": Cannot pullAll without being given an array of values to pull! (' + i + ')');
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
									objHash = JSON.stringify(update[i]);
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
									this._updatePush(doc[i], update[i]);
									updated = true;
								}
							} else {
								throw('ForerunnerDB.Collection "' + this.name() + '": Cannot addToSet on a key that is not an array! (' + k + ')');
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
								var tempIndex = update.$index;

								if (tempIndex !== undefined) {
									delete update.$index;

									// Check for out of bounds index
									if (tempIndex > doc[i].length) {
										tempIndex = doc[i].length;
									}

									this._updateSplicePush(doc[i], tempIndex, update[i]);
									updated = true;
								} else {
									throw('ForerunnerDB.Collection "' + this.name() + '": Cannot splicePush without a $index integer value!');
								}
							} else {
								throw('ForerunnerDB.Collection "' + this.name() + '": Cannot splicePush with a key that is not an array! (' + i + ')');
							}
							break;

						case '$move':
							if (doc[i] instanceof Array) {
								// Loop the array and find matches to our search
								for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
									if (this._match(doc[i][tmpIndex], update[i], '', {})) {
										var moveToIndex = update.$index;

										if (moveToIndex !== undefined) {
											delete update.$index;

											this._updateSpliceMove(doc[i], tmpIndex, moveToIndex);
											updated = true;
										} else {
											throw('ForerunnerDB.Collection "' + this.name() + '": Cannot move without a $index integer value!');
										}
										break;
									}
								}
							} else {
								throw('ForerunnerDB.Collection "' + this.name() + '": Cannot move on a key that is not an array! (' + i + ')');
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

						case '$unset':
							this._updateUnset(doc, i);
							updated = true;
							break;

						case '$pop':
							if (doc[i] instanceof Array) {
								if (this._updatePop(doc[i], update[i])) {
									updated = true;
								}
							} else {
								throw('ForerunnerDB.Collection "' + this.name() + '": Cannot pop from a key that is not an array! (' + i + ')');
							}
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
 * Determines if the passed key has an array positional mark (a dollar at the end
 * of its name).
 * @param {String} key The key to check.
 * @returns {Boolean} True if it is a positional or false if not.
 * @private
 */
Collection.prototype._isPositionalKey = function (key) {
	return key.substr(key.length - 2, 2) === '.$';
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
	doc[prop] = val;

	if (this.debug()) {
		console.log('ForerunnerDB.Collection: Setting non-data-bound document property "' + prop + '" for collection "' + this.name() + '"');
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
	doc[prop] += val;
};

/**
 * Changes the index of an item in the passed array.
 * @param {Array} arr The array to modify.
 * @param {Number} indexFrom The index to move the item from.
 * @param {Number} indexTo The index to move the item to.
 * @private
 */
Collection.prototype._updateSpliceMove = function (arr, indexFrom, indexTo) {
	arr.splice(indexTo, 0, arr.splice(indexFrom, 1)[0]);

	if (this.debug()) {
		console.log('ForerunnerDB.Collection: Moving non-data-bound document array index from "' + indexFrom + '" to "' + indexTo + '" for collection "' + this.name() + '"');
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
		arr.splice(index, 0, doc);
	} else {
		arr.push(doc);
	}
};

/**
 * Inserts an item at the end of an array.
 * @param {Array} arr The array to insert the item into.
 * @param {Object} doc The document to insert.
 * @private
 */
Collection.prototype._updatePush = function (arr, doc) {
	arr.push(doc);
};

/**
 * Removes an item from the passed array.
 * @param {Array} arr The array to modify.
 * @param {Number} index The index of the item in the array to remove.
 * @private
 */
Collection.prototype._updatePull = function (arr, index) {
	arr.splice(index, 1);
};

/**
 * Multiplies a value for a property on a document by the passed number.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to multiply by.
 * @private
 */
Collection.prototype._updateMultiply = function (doc, prop, val) {
	doc[prop] *= val;
};

/**
 * Renames a property on a document to the passed property.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to rename.
 * @param {Number} val The new property name.
 * @private
 */
Collection.prototype._updateRename = function (doc, prop, val) {
	doc[val] = doc[prop];
	delete doc[prop];
};

/**
 * Deletes a property on a document.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to delete.
 * @private
 */
Collection.prototype._updateUnset = function (doc, prop) {
	delete doc[prop];
};

/**
 * Pops an item from the array stack.
 * @param {Object} doc The document to modify.
 * @param {Number=} val Optional, if set to 1 will pop, if set to -1 will shift.
 * @return {Boolean}
 * @private
 */
Collection.prototype._updatePop = function (doc, val) {
	var updated = false;

	if (doc.length > 0) {
		if (val === 1) {
			doc.pop();
			updated = true;
		} else if (val === -1) {
			doc.shift();
			updated = true;
		}
	}

	return updated;
};

/**
 * Removes any documents from the collection that match the search query
 * key/values.
 * @param {Object} query The query object.
 * @param {Object=} options An options object.
 * @param {Function=} callback A callback method.
 * @returns {Array} An array of the documents that were removed.
 */
Collection.prototype.remove = function (query, options, callback) {
	var self = this,
		dataSet,
		index,
		dataItem,
		arrIndex,
		returnArr,
		removeMethod,
		triggerOperation,
		doc,
		newDoc;

	if (query instanceof Array) {
		returnArr = [];

		for (arrIndex = 0; arrIndex < query.length; arrIndex++) {
			returnArr.push(this.remove(query[arrIndex], {noEmit: true}));
		}

		if (!options || (options && !options.noEmit)) {
			this._onRemove(returnArr);
		}

		return returnArr;
	} else {
		dataSet = this.find(query, {$decouple: false});

		if (dataSet.length) {
			removeMethod = function (dataItem) {
				// Remove the item from the collection's indexes
				self._removeFromIndexes(dataItem);

				// Remove data from internal stores
				index = self._data.indexOf(dataItem);
				self._dataRemoveAtIndex(index);
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

			//op.time('Resolve chains');
			this.chainSend('remove', {
				query: query,
				dataSet: dataSet
			}, options);
			//op.time('Resolve chains');

			if (!options || (options && !options.noEmit)) {
				this._onRemove(dataSet);
			}

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

	//op.time('Resolve chains');
	this.chainSend('insert', data, {index: index});
	//op.time('Resolve chains');

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
		var self = this,
			indexViolation,
			triggerOperation,
			insertMethod,
			newDoc;

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
					return false;
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
 * @param {number} index The index to insert at.
 * @param {object} doc The document to insert.
 * @private
 */
Collection.prototype._dataInsertAtIndex = function (index, doc) {
	this._data.splice(index, 0, doc);
};

/**
 * Removes a document from the internal collection data array at
 * the specified index.
 * @param {number} index The index to remove from.
 * @private
 */
Collection.prototype._dataRemoveAtIndex = function (index) {
	this._data.splice(index, 1);
};

/**
 * Replaces all data in the collection's internal data array with
 * the passed array of data.
 * @param {array} data The array of data to replace existing data with.
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
		jString = JSON.stringify(doc);

	// Insert to primary key index
	violated = this._primaryIndex.uniqueSet(doc[this._primaryKey], doc);
	this._primaryCrc.uniqueSet(doc[this._primaryKey], jString);
	this._crcLookup.uniqueSet(jString, doc);

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
 * Returns the index of the document identified by the passed item's primary key.
 * @param {Object} item The item whose primary key should be used to lookup.
 * @returns {Number} The index the item with the matching primary key is occupying.
 */
Collection.prototype.indexOfDocById = function (item) {
	return this._data.indexOf(
		this._primaryIndex.get(
			item[this._primaryKey]
		)
	);
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
 * Generates an options object with default values or adds default
 * values to a passed object if those values are not currently set
 * to anything.
 * @param {object=} obj Optional options object to modify.
 * @returns {object} The options object.
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
 *
 * @returns {Array} The results array from the find operation, containing all
 * documents that matched the query.
 */
Collection.prototype.find = function (query, options) {
	// TODO: This method is quite long, break into smaller pieces
	query = query || {};
	
	options = this.options(options);

	var op = this._metrics.create('find'),
		self = this,
		analysis,
		finalQuery,
		scanLength,
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
		matcherTmpOptions = {},
		matcher = function (doc) {
			return self._match(doc, query, 'and', matcherTmpOptions);
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
		if (analysis.indexMatch.length && (!options || (options && !options.$skipIndex))) {
			op.data('index.potential', analysis.indexMatch);
			op.data('index.used', analysis.indexMatch[0].index);

			// Get the data from the index
			op.time('indexLookup');
			resultArr = analysis.indexMatch[0].lookup;
			op.time('indexLookup');

			// Check if the index coverage is all keys, if not we still need to table scan it
			if (analysis.indexMatch[0].keyData.totalKeyCount === analysis.indexMatch[0].keyData.score) {
				// Require a table scan to find relevant documents
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

			// Order the array if we were passed a sort clause
			if (options.$orderBy) {
				op.time('sort');
				resultArr = this.sort(options.$orderBy, resultArr);
				op.time('sort');
			}
			op.time('tableScan: ' + scanLength);
		}

		if (options.limit && resultArr && resultArr.length > options.limit) {
			resultArr.length = options.limit;
			op.data('limit', options.limit);
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
			for (joinCollectionIndex = 0; joinCollectionIndex < options.$join.length; joinCollectionIndex++) {
				for (joinCollectionName in options.$join[joinCollectionIndex]) {
					if (options.$join[joinCollectionIndex].hasOwnProperty(joinCollectionName)) {
						// Set the key to store the join result in to the collection name by default
						resultCollectionName = joinCollectionName;

						// Get the join collection instance from the DB
						joinCollectionInstance = this._db.collection(joinCollectionName);

						// Get the match data for the join
						joinMatch = options.$join[joinCollectionIndex][joinCollectionName];

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

											/*default:
												// Check for a double-dollar which is a back-reference to the root collection item
												if (joinMatchIndex.substr(0, 3) === '$$.') {
													// Back reference
													// TODO: Support complex joins
												}
												break;*/
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
		if (resultRemove.length) {
			op.time('removalQueue');
			for (i = 0; i < resultRemove.length; i++) {
				index = resultArr.indexOf(resultRemove[i]);

				if (index > -1) {
					resultArr.splice(index, 1);
				}
			}
			op.time('removalQueue');
		}

		if (options.transform) {
			op.time('transform');
			for (i = 0; i < resultArr.length; i++) {
				resultArr.splice(i, 1, options.transform(resultArr[i]));
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
 * Gets the index in the collection data array of the first item matched by
 * the passed query object.
 * @param {Object} query The query to run to find the item to return the index of.
 * @returns {Number}
 */
Collection.prototype.indexOf = function (query) {
	var item = this.find(query, {$decouple: false})[0];

	if (item) {
		return this._data.indexOf(item);
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
		throw('ForerunnerDB.Collection "' + this.name() + '": $orderBy clause has invalid direction: ' + dataPath.value + ', accepted values are 1 or -1 for ascending or descending!');
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
		queryKeyCount,
		i;

	// Check if the query is a primary key lookup
	op.time('checkIndexes');
	pathSolver = new Path();
	queryKeyCount = pathSolver.countKeys(query);

	if (queryKeyCount) {
		if (query[this._primaryKey] !== undefined) {
			// Return item via primary key possible
			op.time('checkIndexMatch: Primary Key');
			analysis.indexMatch.push({
				lookup: this._primaryIndex.lookup(query, options),
				keyData: {
					matchedKeys: [this._primaryKey],
					totalKeyCount: queryKeyCount,
					score: 1
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

				if (indexMatchData.score > 0) {
					// This index can be used, store it
					indexLookup = indexRef.lookup(query, options);

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
		for (joinCollectionIndex = 0; joinCollectionIndex < options.$join.length; joinCollectionIndex++) {
			// Loop the join collections and keep a reference to them
			for (joinCollectionName in options.$join[joinCollectionIndex]) {
				if (options.$join[joinCollectionIndex].hasOwnProperty(joinCollectionName)) {
					joinCollections.push(joinCollectionName);

					// Check if the join uses an $as operator
					if ('$as' in options.$join[joinCollectionIndex][joinCollectionName]) {
						joinCollectionReferences.push(options.$join[joinCollectionIndex][joinCollectionName].$as);
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

	var index,
		time = {
			start: new Date().getTime()
		};

	if (options) {
		switch (options.type) {
			case 'hashed':
				index = new IndexHashMap(keys, options, this);
				break;

			case 'btree':
				index = new IndexBinaryTree(keys, options, this);
				break;

			default:
				// Default
				index = new IndexHashMap(keys, options, this);
				break;
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
	if (pm !== collection.primaryKey()) {
		throw('ForerunnerDB.Collection "' + this.name() + '": Collection diffing requires that both collections have the same primary key!');
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
		if (this._primaryIndex.get(arrItem[pm])) {
			// Matching item exists, check if the data is the same
			if (this._primaryCrc.get(arrItem[pm]) !== collection._primaryCrc.get(arrItem[pm])) {
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

		if (!collection._primaryIndex.get(arrItem[pm])) {
			// The document does not exist in the other collection, remove required
			diff.remove.push(arrItem);
		}
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
		throw('ForerunnerDB.Core "' + this.name() + '": Cannot get collection with undefined name!');
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
 * @param {String|RegExp=} search The optional search string or regular expression to use
 * to match collection names against.
 * @returns {Array} An array of objects containing details of each collection
 * the database is currently managing.
 */
Core.prototype.collections = function (search) {
	var arr = [],
		i;

	if (search) {
		if (!(search instanceof RegExp)) {
			// Turn the search into a regular expression
			search = new RegExp(search);
		}
	}

	for (i in this._collection) {
		if (this._collection.hasOwnProperty(i)) {
			if (search) {
				if (search.exec(i)) {
					arr.push({
						name: i,
						count: this._collection[i].count()
					});
				}
			} else {
				arr.push({
					name: i,
					count: this._collection[i].count()
				});
			}
		}
	}

	return arr;
};

Shared.finishModule('Collection');
module.exports = Collection;