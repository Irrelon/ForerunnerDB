!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.ForerunnerDB=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Core = require('../lib/Core'),
	CollectionGroup = require('../lib/CollectionGroup'),
	View = require('../lib/View'),
	Highcharts = require('../lib/Highcharts'),
	Persist = require('../lib/Persist'),
	jsviews = require('../lib/vendor/jsviews');

module.exports = Core;
window['ForerunnerDB'] = Core;
},{"../lib/CollectionGroup":3,"../lib/Core":4,"../lib/Highcharts":6,"../lib/Persist":13,"../lib/View":15,"../lib/vendor/jsviews":16}],2:[function(require,module,exports){
var Shared,
	Core,
	Overload,
	Metrics,
	KeyValueStore,
	Path,
	Index,
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

Shared.addModule('Collection', Collection);
Shared.inherit(Collection.prototype, Shared.chainSystem);

Overload = require('./Overload');
Metrics = require('./Metrics');
KeyValueStore = require('./KeyValueStore');
Path = require('./Path');
Index = require('./Index');
Crc = require('./Crc');
Core = Shared.modules.Core;

Collection.prototype.debug = new Overload([
	function () {
		return this._debug.all;
	},

	function (val) {
		if (val !== undefined) {
			if (typeof val === 'boolean') {
				this._debug.all = val;
				this.chainSend('debug', this._debug);
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
				this.chainSend('debug', this._debug);
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

		options = options || {};
		options.$decouple = options.$decouple !== undefined ? options.$decouple : true;

		if (options.$decouple) {
			data = this.decouple(data);
		}

		if (!(data instanceof Array)) {
			data = [data];
		}

		op.time('transformIn');
		data = this.transformIn(data);
		op.time('transformIn');

		var oldData = this._data;

		if (this._linked) {
			// The collection is data-bound so do a .remove() instead of just clearing the data
			this.remove();
		} else {
			// Overwrite the data
			this._data = [];
		}

		if (data.length) {
			if (this._linked) {
				this.insert(data);
			} else {
				this._data = this._data.concat(data);
			}
		}

		// Update the primary key index
		op.time('Rebuild Primary Key Index');
		this._rebuildPrimaryKeyIndex(options);
		op.time('Rebuild Primary Key Index');

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
				update: update
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
Collection.prototype._updateObject = function (doc, update, query, options, path, opType) {
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
					case '$index':
						// Ignore $index operators
						break;

					default:
						operation = true;
						recurseUpdated = this._updateObject(doc, update[i], query, options, path, i);
						if (recurseUpdated) {
							updated = true;
						}
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
						if (this._match(doc[i][tmpIndex], pathInstance.value(query)[0])) {
							tmpArray.push(tmpIndex);
						}
					}

					// Loop the items that matched and update them
					for (tmpIndex = 0; tmpIndex < tmpArray.length; tmpIndex++) {
						recurseUpdated = this._updateObject(doc[i][tmpArray[tmpIndex]], update[i + '.$'], query, options, path + '.' + i, opType);
						if (recurseUpdated) {
							updated = true;
						}
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
									recurseUpdated = this._updateObject(doc[i][tmpIndex], update[i], query, options, path + '.' + i, opType);

									if (recurseUpdated) {
										updated = true;
									}
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
							recurseUpdated = this._updateObject(doc[i], update[i], query, options, path + '.' + i, opType);

							if (recurseUpdated) {
								updated = true;
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
							this._updateIncrement(doc, i, update[i]);
							updated = true;
							break;

						case '$push':
							// Check if the target key is undefined and if so, create an array
							if (doc[i] === undefined) {
								// Initialise a new array
								doc[i] = [];
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
								throw("Cannot push to a key that is not an array! (" + i + ")");
							}
							break;

						case '$pull':
							if (doc[i] instanceof Array) {
								tmpArray = [];

								// Loop the array and find matches to our search
								for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
									if (this._match(doc[i][tmpIndex], update[i])) {
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
									throw("Cannot pullAll without being given an array of values to pull! (" + i + ")");
								}
							}
							break;

						case '$addToSet':
							// Check if the target key is undefined and if so, create an array
							if (doc[i] === undefined) {
								// Initialise a new array
								doc[i] = [];
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
								if (optionObj && optionObj.key) {
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
								throw("Cannot addToSet on a key that is not an array! (" + k + ")!");
							}
							break;

						case '$splicePush':
							// Check if the target key is undefined and if so, create an array
							if (doc[i] === undefined) {
								// Initialise a new array
								doc[i] = [];
							}

							// Check that the target key is an array
							if (doc[i] instanceof Array) {
								var tempIndex = update.$index;

								if (tempIndex !== undefined) {
									delete update.$index;
									this._updateSplicePush(doc[i], tempIndex, update[i]);
									updated = true;
								} else {
									throw("Cannot splicePush without a $index integer value!");
								}
							} else {
								throw("Cannot splicePush with a key that is not an array! (" + i + ")");
							}
							break;

						case '$move':
							if (doc[i] instanceof Array) {
								// Loop the array and find matches to our search
								for (tmpIndex = 0; tmpIndex < doc[i].length; tmpIndex++) {
									if (this._match(doc[i][tmpIndex], update[i])) {
										var moveToIndex = update[i].$index;

										if (moveToIndex !== undefined) {
											this._updateSpliceMove(doc[i], tmpIndex, moveToIndex);
											updated = true;
										} else {
											throw("Cannot move without a $index integer value!");
										}
										break;
									}
								}
							} else {
								throw("Cannot move on a key that is not an array! (" + i + ")");
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
								throw("Cannot pop from a key that is not an array! (" + i + ")");
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
	if (this._linked) {
		jQuery.observable(doc).setProperty(prop, val);

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
 * Increments a value for a property on a document by the passed number.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to increment by.
 * @private
 */
Collection.prototype._updateIncrement = function (doc, prop, val) {
	if (this._linked) {
		jQuery.observable(doc).setProperty(prop, doc[prop] + val);
	} else {
		doc[prop] += val;
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
		jQuery.observable(arr).move(indexFrom, indexTo);

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
			jQuery.observable(arr).insert(index, doc);
		} else {
			arr.splice(index, 0, doc);
		}
	} else {
		if (this._linked) {
			jQuery.observable(arr).insert(doc);
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
		jQuery.observable(arr).insert(doc);
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
		jQuery.observable(arr).remove(index);
	} else {
		arr.splice(index, 1);
	}
};

/**
 * Multiplies a value for a property on a document by the passed number.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to multiply by.
 * @private
 */
Collection.prototype._updateMultiply = function (doc, prop, val) {
	if (this._linked) {
		jQuery.observable(doc).setProperty(prop, doc[prop] * val);
	} else {
		doc[prop] *= val;
	}
};

/**
 * Renames a property on a document to the passed property.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to rename.
 * @param {Number} val The new property name.
 * @private
 */
Collection.prototype._updateRename = function (doc, prop, val) {
	var existingVal = doc[prop];
	if (this._linked) {
		jQuery.observable(doc).setProperty(val, existingVal);
		jQuery.observable(doc).removeProperty(prop);
	} else {
		doc[val] = existingVal;
		delete doc[prop];
	}
};

/**
 * Deletes a property on a document.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to delete.
 * @private
 */
Collection.prototype._updateUnset = function (doc, prop) {
	if (this._linked) {
		jQuery.observable(doc).removeProperty(prop);
	} else {
		delete doc[prop];
	}
};

/**
 * Deletes a property on a document.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to delete.
 * @return {Boolean}
 * @private
 */
Collection.prototype._updatePop = function (doc, val) {
	var index,
		updated = false;

	if (doc.length > 0) {
		if (this._linked) {
			if (val === 1) {
				index = doc.length - 1;
			} else if (val === -1) {
				index = 0;
			}

			if (index > -1) {
				jQuery.observable(arr).remove(index);
				updated = true;
			}
		} else {
			if (val === 1) {
				doc.pop();
				updated = true;
			} else if (val === -1) {
				doc.shift();
				updated = true;
			}
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
		returnArr;

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
			// Remove the data from the collection
			for (var i = 0; i < dataSet.length; i++) {
				dataItem = dataSet[i];

				// Remove the item from the collection's indexes
				this._removeIndex(dataItem);

				// Remove data from internal stores
				index = this._data.indexOf(dataItem);

				if (this._linked) {
					jQuery.observable(this._data).remove(index);
				} else {
					this._data.splice(index, 1);
				}
			}

			//op.time('Resolve chains');
			this.chainSend('remove', {
				query: query
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
		var indexViolation;

		this._ensurePrimaryKey(doc);

		// Check indexes are not going to be broken by the document
		indexViolation = this.insertIndexViolation(doc);

		if (!indexViolation) {
			// Add the item to the collection's indexes
			this._insertIndex(doc);

			// Insert the document
			if (this._linked) {
				jQuery.observable(this._data).insert(index, doc);
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

	options.$decouple = options.$decouple !== undefined ? options.$decouple : true;

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
		if (analysis.indexMatch.length && (!options || (options && !options.$skipIndex))) {
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
	if (window.jQuery) {
		// Make sure we have a data-binding store object to use
		this._links = this._links || {};

		var templateId,
			templateHtml;

		if (templateSelector && typeof templateSelector === 'object') {
			// Our second argument is an object, let's inspect
			if (templateSelector.template && typeof templateSelector.template === 'string') {
				// The template has been given to us as a string
				templateId = this.objectId(templateSelector.template);
				templateHtml = templateSelector.template;
			}
		} else {
			templateId = templateSelector;
		}

		if (!this._links[templateId]) {
			if (jQuery(outputTargetSelector).length) {
				// Ensure the template is in memory and if not, try to get it
				if (!jQuery.templates[templateId]) {
					if (!templateHtml) {
						// Grab the template
						var template = jQuery(templateSelector);
						if (template.length) {
							templateHtml = jQuery(template[0]).html();
						} else {
							throw('Unable to bind collection to target because template does not exist: ' + templateSelector);
						}
					}

					jQuery.views.templates(templateId, templateHtml);
				}

				// Create the data binding
				jQuery.templates[templateId].link(outputTargetSelector, this._data);

				// Add link to flags
				this._links[templateId] = outputTargetSelector;

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

		throw('Cannot create a duplicate link to the target: ' + outputTargetSelector + ' with the template: ' + templateId);
	} else {
		throw('Cannot data-bind without jQuery, please add jQuery to your page!');
	}
};

/**
 * Removes a link to the DOM between the collection data and the elements
 * in the passed output selector that was created using the link() method.
 * @param outputTargetSelector
 * @param templateSelector
 */
Collection.prototype.unlink = function (outputTargetSelector, templateSelector) {
	if (window.jQuery) {
		// Check for binding
		this._links = this._links || {};

		var templateId;

		if (templateSelector && typeof templateSelector === 'object') {
			// Our second argument is an object, let's inspect
			if (templateSelector.template && typeof templateSelector.template === 'string') {
				// The template has been given to us as a string
				templateId = this.objectId(templateSelector.template);
			}
		} else {
			templateId = templateSelector;
		}

		if (this._links[templateId]) {
			// Remove the data binding
			jQuery.templates[templateId].unlink(outputTargetSelector);

			// Remove link from flags
			delete this._links[templateId];

			// Set the linked flag
			this._linked--;

			if (this.debug()) {
				console.log('ForerunnerDB.Collection: Removed binding collection "' + this.name() + '" to output target: ' + outputTargetSelector);
			}

			return this;
		}

		console.log('Cannot remove link, one does not exist to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
	} else {
		throw('Cannot data-bind without jQuery, please add jQuery to your page!');
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
	var id,
		pow = Math.pow(10, 17);

	if (!str) {
		Shared.idCounter++;

		id = (Shared.idCounter + (
			Math.random() * pow +
				Math.random() * pow +
				Math.random() * pow +
				Math.random() * pow
			)
			).toString(16);
	} else {
		var val = 0,
			count = str.length,
			i;

		for (i = 0; i < count; i++) {
			val += str.charCodeAt(i) * pow;
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
},{"./Crc":5,"./Index":7,"./KeyValueStore":8,"./Metrics":9,"./Overload":11,"./Path":12,"./Shared":14}],3:[function(require,module,exports){
// Import external names locally
var Shared,
	Core,
	CoreInit,
	Collection,
	Overload;

Shared = require('./Shared');

var CollectionGroup = function () {
	this.init.apply(this, arguments);
};

CollectionGroup.prototype.init = function (name) {
	var self = this;

	this._name = name;
	this._data = new Collection('__FDB__cg_data_' + this._name);
	this._collections = [];
	this._views = [];
};

Shared.addModule('CollectionGroup', CollectionGroup);
Shared.inherit(CollectionGroup.prototype, Shared.chainSystem);

Collection = require('./Collection');
Overload = require('./Overload');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

CollectionGroup.prototype.on = function () {
	this._data.on.apply(this._data, arguments);
};

CollectionGroup.prototype.off = function () {
	this._data.off.apply(this._data, arguments);
};

CollectionGroup.prototype.emit = function () {
	this._data.emit.apply(this._data, arguments);
};

/**
 * Gets / sets the primary key for this collection group.
 * @param {String=} keyName The name of the primary key.
 * @returns {*}
 */
CollectionGroup.prototype.primaryKey = function (keyName) {
	if (keyName !== undefined) {
		this._primaryKey = keyName;
		return this;
	}

	return this._primaryKey;
};

/**
 * Gets / sets the db instance the collection group belongs to.
 * @param {DB} db The db instance.
 * @returns {*}
 */
CollectionGroup.prototype.db = function (db) {
	if (db !== undefined) {
		this._db = db;
		return this;
	}

	return this._db;
};

CollectionGroup.prototype.addCollection = function (collection) {
	if (collection) {
		if (this._collections.indexOf(collection) === -1) {
			var self = this;

			// Check for compatible primary keys
			if (this._collections.length) {
				if (this._primaryKey !== collection.primaryKey()) {
					throw("All collections in a collection group must have the same primary key!");
				}
			} else {
				// Set the primary key to the first collection added
				this.primaryKey(collection.primaryKey());
			}

			// Add the collection
			this._collections.push(collection);
			collection._groups.push(this);
			collection.chain(this);

			// Add collection's data
			this._data.insert(collection.find());
		}
	}

	return this;
};

CollectionGroup.prototype.removeCollection = function (collection) {
	if (collection) {
		var collectionIndex = this._collections.indexOf(collection),
			groupIndex;

		if (collectionIndex !== -1) {
			collection.unChain(this);
			this._collections.splice(collectionIndex, 1);

			groupIndex = collection._groups.indexOf(this);

			if (groupIndex !== -1) {
				collection._groups.splice(groupIndex, 1);
			}
		}

		if (this._collections.length === 0) {
			// Wipe the primary key
			delete this._primaryKey;
		}
	}

	return this;
};

CollectionGroup.prototype._chainHandler = function (sender, type, data, options) {
	switch (type) {
		case 'setData':
			// Decouple the data to ensure we are working with our own copy
			data = this._data.decouple(data);

			// Remove old data
			this._data.remove(options.oldData);

			// Add new data
			this._data.insert(data);
			break;

		case 'insert':
			// Decouple the data to ensure we are working with our own copy
			data = this._data.decouple(data);

			// Add new data
			this._data.insert(data);
			break;

		case 'update':
			// Update data
			this._data.update(data.query, data.update, options);
			break;

		case 'remove':
			this._data.remove(data.query, options);
			break;
	}
};

CollectionGroup.prototype.insert = function () {
	this._collectionsRun('insert', arguments);
};

CollectionGroup.prototype.update = function () {
	this._collectionsRun('update', arguments);
};

CollectionGroup.prototype.updateById = function () {
	this._collectionsRun('updateById', arguments);
};

CollectionGroup.prototype.remove = function () {
	this._collectionsRun('remove', arguments);
};

CollectionGroup.prototype._collectionsRun = function (type, args) {
	for (var i = 0; i < this._collections.length; i++) {
		this._collections[i][type].apply(this._collections[i], args);
	}
};

CollectionGroup.prototype.find = function (query, options) {
	return this._data.find(query, options);
};

/**
 * Helper method that removes a document that matches the given id.
 * @param {String} id The id of the document to remove.
 */
CollectionGroup.prototype.removeById = function (id) {
	// Loop the collections in this group and apply the remove
	for (var i = 0; i < this._collections.length; i++) {
		this._collections[i].removeById(id);
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
CollectionGroup.prototype.subset = function (query, options) {
	var result = this.find(query, options);

	return new Collection()
		._subsetOf(this)
		.primaryKey(this._primaryKey)
		.setData(result);
};

/**
 * Drops a collection group from the database.
 * @returns {boolean} True on success, false on failure.
 */
CollectionGroup.prototype.drop = function () {
	var i,
		collArr = [].concat(this._collections),
		viewArr = [].concat(this._views);

	if (this._debug) {
		console.log('Dropping collection group ' + this._name);
	}

	for (i = 0; i < collArr.length; i++) {
		this.removeCollection(collArr[i]);
	}

	for (i = 0; i < viewArr.length; i++) {
		this._removeView(viewArr[i]);
	}

	this.emit('drop');

	return true;
};

// Extend DB to include collection groups
Core.prototype.init = function () {
	this._collectionGroup = {};
	CoreInit.apply(this, arguments);
};

Core.prototype.collectionGroup = function (collectionGroupName) {
	if (collectionGroupName) {
		this._collectionGroup[collectionGroupName] = this._collectionGroup[collectionGroupName] || new CollectionGroup(collectionGroupName).db(this);
		return this._collectionGroup[collectionGroupName];
	} else {
		// Return an object of collection data
		return this._collectionGroup;
	}
};

module.exports = CollectionGroup;
},{"./Collection":2,"./Overload":11,"./Shared":14}],4:[function(require,module,exports){
/*
 The MIT License (MIT)

 Copyright (c) 2014 Irrelon Software Limited
 http://www.irrelon.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice, url and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.

 Source: https://github.com/coolbloke1324/ForerunnerDB
 */
var Shared,
	Overload,
	Collection,
	Metrics,
	Crc;

Shared = require('./Shared.js');

/**
 * The main ForerunnerDB core object.
 * @constructor
 */
var Core = function () {
	this.init.apply(this, arguments);
};

Core.prototype.init = function () {
	this._collection = {};
	this._debug = {};
};

Shared.addModule('Core', Core);
Shared.inherit(Core.prototype, Shared.chainSystem);

Overload = require('./Overload.js');
Collection = require('./Collection.js');
Metrics = require('./Metrics.js');
Crc = require('./Crc.js');

Core.prototype._isServer = false;

Core.prototype.isClient = function () {
	return !this._isServer;
};

Core.prototype.isServer = function () {
	return this._isServer;
};

/**
 * Returns a checksum of a string.
 * @param {String} string The string to checksum.
 * @return {String} The checksum generated.
 */
Core.prototype.crc = Crc;

/**
 * Checks if the database is running on a client (browser) or
 * a server (node.js).
 * @returns {Boolean} Returns true if running on a browser.
 */
Core.prototype.isClient = function () {
	return !this._isServer;
};

/**
 * Checks if the database is running on a client (browser) or
 * a server (node.js).
 * @returns {Boolean} Returns true if running on a server.
 */
Core.prototype.isServer = function () {
	return this._isServer;
};

/**
 * Returns a non-referenced version of the passed object / array.
 * @param {Object} data The object or array to return as a non-referenced version.
 * @returns {*}
 */
Core.prototype.decouple = function (data) {
	return JSON.parse(JSON.stringify(data));
};

/**
 * Gets / sets the debug flag for the database.
 * @param {Boolean} val If true, debug messages will be output to the console.
 * @returns {*}
 */
Core.prototype.debug = new Overload([
	function () {
		return this._debug.all;
	},

	function (val) {
		if (val !== undefined) {
			if (typeof val === 'boolean') {
				this._debug.all = val;
				return this;
			}
		}

		return this._debug.all;
	},

	function (type, val) {
		if (type !== undefined) {
			if (val !== undefined) {
				this._debug[type] = val;
				return this;
			}

			return this._debug[type];
		}

		return this._debug.all;
	}
]);

/**
 * Converts a normal javascript array of objects into a DB collection.
 * @param {Array} arr An array of objects.
 * @returns {Collection} A new collection instance with the data set to the
 * array passed.
 */
Core.prototype.arrayToCollection = function (arr) {
	return new Collection().setData(arr);
};

/**
 * Registers an event listener against an event name.
 * @param {String} event The name of the event to listen for.
 * @param {Function} listener The listener method to call when
 * the event is fired.
 * @returns {init}
 */
Core.prototype.on = function(event, listener) {
	this._listeners = this._listeners || {};
	this._listeners[event] = this._listeners[event] || [];
	this._listeners[event].push(listener);

	return this;
};

/**
 * De-registers an event listener from an event name.
 * @param {String} event The name of the event to stop listening for.
 * @param {Function} listener The listener method passed to on() when
 * registering the event listener.
 * @returns {*}
 */
Core.prototype.off = function(event, listener) {
	if (event in this._listeners) {
		var arr = this._listeners[event],
			index = arr.indexOf(listener);

		if (index > -1) {
			arr.splice(index, 1);
		}
	}

	return this;
};

/**
 * Emits an event by name with the given data.
 * @param {String} event The name of the event to emit.
 * @param {*=} data The data to emit with the event.
 * @returns {*}
 */
Core.prototype.emit = function(event, data) {
	this._listeners = this._listeners || {};

	if (event in this._listeners) {
		var arr = this._listeners[event],
			arrCount = arr.length,
			arrIndex;

		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			arr[arrIndex].apply(this, Array.prototype.slice.call(arguments, 1));
		}
	}

	return this;
};

/**
 * Generates a new 16-character hexadecimal unique ID or
 * generates a new 16-character hexadecimal ID based on
 * the passed string. Will always generate the same ID
 * for the same string.
 * @param {String=} str A string to generate the ID from.
 * @return {String}
 */
Core.prototype.objectId = function (str) {
	var id,
		val,
		count,
		pow = Math.pow(10, 17),
		i;

	if (!str) {
		Shared.idCounter++;

		id = (Shared.idCounter + (
			Math.random() * pow +
				Math.random() * pow +
				Math.random() * pow +
				Math.random() * pow
			)
		).toString(16);
	} else {
		val = 0;
		count = str.length;

		for (i = 0; i < count; i++) {
			val += str.charCodeAt(i) * pow;
		}

		id = val.toString(16);
	}

	return id;
};

/**
 * Find all documents across all collections in the database that match the passed
 * string or search object.
 * @param search String or search object.
 * @returns {Array}
 */
Core.prototype.peek = function (search) {
	var i,
		coll,
		arr = [],
		typeOfSearch = typeof search;

	// Loop collections
	for (i in this._collection) {
		if (this._collection.hasOwnProperty(i)) {
			coll = this._collection[i];

			if (typeOfSearch === 'string') {
				arr = arr.concat(coll.peek(search));
			} else {
				arr = arr.concat(coll.find(search));
			}
		}
	}

	return arr;
};

/**
 * Find all documents across all collections in the database that match the passed
 * string or search object and return them in an object where each key is the name
 * of the collection that the document was matched in.
 * @param search String or search object.
 * @returns {Array}
 */
Core.prototype.peekCat = function (search) {
	var i,
		coll,
		cat = {},
		arr,
		typeOfSearch = typeof search;

	// Loop collections
	for (i in this._collection) {
		if (this._collection.hasOwnProperty(i)) {
			coll = this._collection[i];

			if (typeOfSearch === 'string') {
				arr = coll.peek(search);

				if (arr && arr.length) {
					cat[coll.name()] = arr;
				}
			} else {
				arr = coll.find(search);

				if (arr && arr.length) {
					cat[coll.name()] = arr;
				}
			}
		}
	}

	return cat;
};

module.exports = Core;
},{"./Collection.js":2,"./Crc.js":5,"./Metrics.js":9,"./Overload.js":11,"./Shared.js":14}],5:[function(require,module,exports){
var crcTable = (function () {
	var crcTable = [],
		c, n, k;

	for (n = 0; n < 256; n++) {
		c = n;

		for (k = 0; k < 8; k++) {
			c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
		}

		crcTable[n] = c;
	}

	return crcTable;
}());

module.exports = function(str) {
	var crc = 0 ^ (-1),
		i;

	for (i = 0; i < str.length; i++) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
	}

	return (crc ^ (-1)) >>> 0;
};
},{}],6:[function(require,module,exports){
// Import external names locally
var Shared,
	Collection,
	CollectionInit;

Shared = require('./Shared');

/**
 * The constructor.
 *
 * @constructor
 */
var Highchart = function (collection, options) {
	this.init.apply(this, arguments);
};

Highchart.prototype.init = function (collection, options) {
	this._options = options;
	this._selector = $(this._options.selector);
	this._listeners = {};
	this._collection = collection;

	// Setup the chart
	this._options.series = [];

	// Set the data for the chart
	var data,
		seriesObj,
		chartData,
		i;

	switch (this._options.type) {
		case 'pie':
			// Create chart from data
			this._selector.highcharts(this._options.chartOptions);
			this._chart = this._selector.highcharts();

			// Generate graph data from collection data
			data = this._collection.find();

			seriesObj = {
				allowPointSelect: true,
				cursor: 'pointer',
				dataLabels: {
					enabled: true,
					format: '<b>{point.name}</b>: {y} ({point.percentage:.0f}%)',
					style: {
						color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
					}
				}
			};

			chartData = this.pieDataFromCollectionData(data, this._options.keyField, this._options.valField);

			$.extend(seriesObj, this._options.seriesOptions);

			$.extend(seriesObj, {
				type: 'pie',
				name: this._options.seriesName,
				data: chartData
			});

			this._chart.addSeries(seriesObj);
			break;

		case 'line':
			// Generate graph data from collection data
			/*seriesObj = {
				allowPointSelect: true,
				cursor: 'pointer'
			};*/

			chartData = this.lineDataFromCollectionData(
				this._options.seriesField,
				this._options.keyField,
				this._options.valField,
				this._options.orderBy
			);

			this._options.chartOptions.xAxis = chartData.xAxis;
			this._options.chartOptions.series = chartData.series;

			this._selector.highcharts(this._options.chartOptions);
			this._chart = this._selector.highcharts();
			break;
	}

	// Hook the collection events to auto-update the chart
	this._hookEvents();
};

Collection = Shared.modules.Collection;
CollectionInit = Collection.prototype.init;

/**
 * Generate pie-chart series data from the given collection data array.
 * @param data
 * @param keyField
 * @param valField
 * @returns {Array}
 */
Highchart.prototype.pieDataFromCollectionData = function (data, keyField, valField) {
	var graphData = [],
		i;

	for (i = 0; i < data.length; i++) {
		graphData.push([data[i][keyField], data[i][valField]]);
	}

	return graphData;
};

/**
 * Generate line-chart series data from the given collection data array.
 * @param seriesField
 * @param keyField
 * @param valField
 * @param orderBy
 */
Highchart.prototype.lineDataFromCollectionData = function (seriesField, keyField, valField, orderBy) {
	var data = this._collection.distinct(seriesField),
		seriesData = [],
		xAxis = {
			categories: []
		},
		seriesName,
		query,
		dataSearch,
		seriesValues,
		i, k;

	// What we WANT to output:
	/*series: [{
		name: 'Responses',
		data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]
	}]*/

	// Loop keys
	for (i = 0; i < data.length; i++) {
		seriesName = data[i];
		query = {};
		query[seriesField] = seriesName;

		seriesValues = [];
		dataSearch = this._collection.find(query, {
			orderBy: orderBy
		});

		// Loop the keySearch data and grab the value for each item
		for (k = 0; k < dataSearch.length; k++) {
			xAxis.categories.push(dataSearch[k][keyField]);
			seriesValues.push(dataSearch[k][valField]);
		}

		seriesData.push({
			name: seriesName,
			data: seriesValues
		});
	}

	return {
		xAxis: xAxis,
		series: seriesData
	};
};

Highchart.prototype._hookEvents = function () {
	var self = this;

	self._collection.on('change', self._changeListener);

	// If the collection is dropped, clean up after ourselves
	self._collection.on('drop', self._dropListener);
};

Highchart.prototype._changeListener = function () {
	var self = this;

	// Update the series data on the chart
	if(typeof self._collection !== 'undefined' && self._chart) {
		var data = self._collection.find();

		switch (self._options.type) {
			case 'pie':
				self._chart.series[0].setData(
					self.pieDataFromCollectionData(
						data,
						self._options.keyField,
						self._options.valField
					)
				);
				break;

			case 'line':
				var lineSeriesData = self.lineDataFromCollectionData(
					self._options.seriesField,
					self._options.keyField,
					self._options.valField,
					self._options.orderBy
				);

				self._chart.xAxis[0].setCategories(
					lineSeriesData.xAxis.categories
				);

				for (var i = 0; i < lineSeriesData.series.length; i++) {
					self._chart.series[i].setData(
						lineSeriesData.series[i].data
					);
				}
				break;
		}
	}
};

Highchart.prototype._dropListener = function () {
	var self = this;

	self._collection.off('change', self._changeListener);
	self._collection.off('drop', self._dropListener);
};

Highchart.prototype.drop = function () {
	this._chart.destroy();

	this._collection.off('change', this._changeListener);
	this._collection.off('drop', this._dropListener);

	delete this._collection._highcharts[this._options.selector];
	delete this._chart;
	delete this._options;
	delete this._collection;

	return this;
};

// Extend collection with view init
Collection.prototype.init = function () {
	this._highcharts = {};
	CollectionInit.apply(this, arguments);
};

Collection.prototype.chart = function (options) {
	if (!this._highcharts[options.selector]) {
		// Store new chart in charts array
		this._highcharts[options.selector] = new Highchart(this, options);
	}

	return this._highcharts[options.selector];
};

Collection.prototype.dropChart = function (selector) {
	if (this._highcharts[selector]) {
		this._highcharts[selector].drop();
	}
};

module.exports = Highchart;
},{"./Shared":14}],7:[function(require,module,exports){
var Shared = require('./Shared'),
	Path = require('./Path');

/**
 * The index class used to instantiate indexes that the database can
 * use to speed up queries on collections and views.
 * @constructor
 */
var Index = function () {
	this.init.apply(this, arguments);
};

Index.prototype.init = function (keys, options, collection) {
	this._crossRef = {};
	this._size = 0;
	this._id = this._itemKeyHash(keys, keys);

	this.data({});
	this.unique(options && options.unique ? options.unique : false);

	if (keys !== undefined) {
		this.keys(keys);
	}

	if (collection !== undefined) {
		this.collection(collection);
	}

	this.name(options && options.name ? options.name : this._id);
};

Shared.addModule('Index', Index);
Shared.inherit(Index.prototype, Shared.chainSystem);

Index.prototype.id = function () {
	return this._id;
};

Index.prototype.state = function () {
	return this._state;
};

Index.prototype.size = function () {
	return this._size;
};

Index.prototype.data = function (val) {
	if (val !== undefined) {
		this._data = val;
		return this;
	}

	return this._data;
};

Index.prototype.name = function (val) {
	if (val !== undefined) {
		this._name = val;
		return this;
	}

	return this._name;
};

Index.prototype.collection = function (val) {
	if (val !== undefined) {
		this._collection = val;
		return this;
	}

	return this._collection;
};

Index.prototype.keys = function (val) {
	if (val !== undefined) {
		this._keys = val;

		// Count the keys
		this._keyCount = (new Path()).parse(this._keys).length;
		return this;
	}

	return this._keys;
};

Index.prototype.type = function (val) {
	if (val !== undefined) {
		this._type = val;
		return this;
	}

	return this._type;
};

Index.prototype.unique = function (val) {
	if (val !== undefined) {
		this._unique = val;
		return this;
	}

	return this._unique;
};

Index.prototype.rebuild = function () {
	// Do we have a collection?
	if (this._collection) {
		// Get sorted data
		var collection = this._collection.subset({}, {
				$decouple: false,
				$orderBy: this._keys
			}),
			collectionData = collection.find(),
			dataIndex,
			dataCount = collectionData.length;

		// Clear the index data for the index
		this._data = {};

		if (this._unique) {
			this._uniqueLookup = {};
		}

		// Loop the collection data
		for (dataIndex = 0; dataIndex < dataCount; dataIndex++) {
			this.insert(collectionData[dataIndex]);
		}
	}

	this._state = {
		name: this._name,
		keys: this._keys,
		indexSize: this._size,
		built: new Date(),
		updated: new Date(),
		ok: true
	};
};

Index.prototype.insert = function (dataItem, options) {
	var uniqueFlag = this._unique,
		uniqueHash,
		itemHashArr,
		hashIndex;

	if (uniqueFlag) {
		uniqueHash = this._itemHash(dataItem, this._keys);
		this._uniqueLookup[uniqueHash] = dataItem;
	}

	// Generate item hash
	itemHashArr = this._itemHashArr(dataItem, this._keys);

	// Get the path search results and store them
	for (hashIndex = 0; hashIndex < itemHashArr.length; hashIndex++) {
		this.pushToPathValue(itemHashArr[hashIndex], dataItem);
	}
};

Index.prototype.remove = function (dataItem, options) {
	var uniqueFlag = this._unique,
		uniqueHash,
		itemHashArr,
		hashIndex;

	if (uniqueFlag) {
		uniqueHash = this._itemHash(dataItem, this._keys);
		delete this._uniqueLookup[uniqueHash];
	}

	// Generate item hash
	itemHashArr = this._itemHashArr(dataItem, this._keys);

	// Get the path search results and store them
	for (hashIndex = 0; hashIndex < itemHashArr.length; hashIndex++) {
		this.pullFromPathValue(itemHashArr[hashIndex], dataItem);
	}
};

Index.prototype.violation = function (dataItem) {
	// Generate item hash
	var uniqueHash = this._itemHash(dataItem, this._keys);

	// Check if the item breaks the unique constraint
	return Boolean(this._uniqueLookup[uniqueHash]);
};

Index.prototype.hashViolation = function (uniqueHash) {
	// Check if the item breaks the unique constraint
	return Boolean(this._uniqueLookup[uniqueHash]);
};

Index.prototype.pushToPathValue = function (hash, obj) {
	var pathValArr = this._data[hash] = this._data[hash] || [];

	// Make sure we have not already indexed this object at this path/value
	if (pathValArr.indexOf(obj) === -1) {
		// Index the object
		pathValArr.push(obj);

		// Record the reference to this object in our index size
		this._size++;

		// Cross-reference this association for later lookup
		this.pushToCrossRef(obj, pathValArr);
	}
};

Index.prototype.pullFromPathValue = function (hash, obj) {
	var pathValArr = this._data[hash],
		indexOfObject;

	// Make sure we have already indexed this object at this path/value
	indexOfObject = pathValArr.indexOf(obj);

	if (indexOfObject > -1) {
		// Un-index the object
		pathValArr.splice(indexOfObject, 1);

		// Record the reference to this object in our index size
		this._size--;

		// Remove object cross-reference
		this.pullFromCrossRef(obj, pathValArr);
	}

	// Check if we should remove the path value array
	if (!pathValArr.length) {
		// Remove the array
		delete this._data[hash];
	}
};

Index.prototype.pull = function (obj) {
	// Get all places the object has been used and remove them
	var id = obj[this._collection.primaryKey()],
		crossRefArr = this._crossRef[id],
		arrIndex,
		arrCount = crossRefArr.length,
		arrItem;

	for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
		arrItem = crossRefArr[arrIndex];

		// Remove item from this index lookup array
		this._pullFromArray(arrItem, obj);
	}

	// Record the reference to this object in our index size
	this._size--;

	// Now remove the cross-reference entry for this object
	delete this._crossRef[id];
};

Index.prototype._pullFromArray = function (arr, obj) {
	var arrCount = arr.length;

	while (arrCount--) {
		if (arr[arrCount] === obj) {
			arr.splice(arrCount, 1);
		}
	}
};

Index.prototype.pushToCrossRef = function (obj, pathValArr) {
	var id = obj[this._collection.primaryKey()],
		crObj;

	this._crossRef[id] = this._crossRef[id] || [];

	// Check if the cross-reference to the pathVal array already exists
	crObj = this._crossRef[id];

	if (crObj.indexOf(pathValArr) === -1) {
		// Add the cross-reference
		crObj.push(pathValArr);
	}
};

Index.prototype.pullFromCrossRef = function (obj, pathValArr) {
	var id = obj[this._collection.primaryKey()],
		crObj;

	delete this._crossRef[id];
};

Index.prototype.lookup = function (query) {
	return this._data[this._itemHash(query, this._keys)] || [];
};

Index.prototype.match = function (query, options) {
	// Check if the passed query has data in the keys our index
	// operates on and if so, is the query sort matching our order
	var pathSolver = new Path();
	return pathSolver.countObjectPaths(this._keys, query);
};

Index.prototype._itemHash = function (item, keys) {
	var path = new Path(),
		pathData,
		hash = '',
		k;

	pathData = path.parse(keys);

	for (k = 0; k < pathData.length; k++) {
		if (hash) { hash += '_'; }
		hash += path.value(item, pathData[k].path).join(':');
	}

	return hash;
};

Index.prototype._itemKeyHash = function (item, keys) {
	var path = new Path(),
		pathData,
		hash = '',
		k;

	pathData = path.parse(keys);

	for (k = 0; k < pathData.length; k++) {
		if (hash) { hash += '_'; }
		hash += path.keyValue(item, pathData[k].path);
	}

	return hash;
};

Index.prototype._itemHashArr = function (item, keys) {
	var path = new Path(),
		pathData,
		hash = '',
		hashArr = [],
		valArr,
		i, k, j;

	pathData = path.parse(keys);

	for (k = 0; k < pathData.length; k++) {
		valArr = path.value(item, pathData[k].path);

		for (i = 0; i < valArr.length; i++) {
			if (k === 0) {
				// Setup the initial hash array
				hashArr.push(valArr[i]);
			} else {
				// Loop the hash array and concat the value to it
				for (j = 0; j < hashArr.length; j++) {
					hashArr[j] = hashArr[j] + '_' + valArr[i];
				}
			}
		}
	}

	return hashArr;
};

module.exports = Index;
},{"./Path":12,"./Shared":14}],8:[function(require,module,exports){
var Shared = require('./Shared');

/**
 * The key value store class used when storing basic in-memory KV data,
 * and can be queried for quick retrieval. Mostly used for collection
 * primary key indexes and lookups.
 * @param {String=} name Optional KV store name.
 * @constructor
 */
var KeyValueStore = function (name) {
	this.init.apply(this, arguments);
};

KeyValueStore.prototype.init = function (name) {
	this._name = name;
	this._data = {};
	this._primaryKey = '_id';
};

Shared.addModule('KeyValueStore', KeyValueStore);
Shared.inherit(KeyValueStore.prototype, Shared.chainSystem);

/**
 * Get / set the name of the key/value store.
 * @param {String} val The name to set.
 * @returns {*}
 */
KeyValueStore.prototype.name = function (val) {
	if (val !== undefined) {
		this._name = val;
		return this;
	}

	return this._name;
};

/**
 * Get / set the primary key.
 * @param {String} key The key to set.
 * @returns {*}
 */
KeyValueStore.prototype.primaryKey = function (key) {
	if (key !== undefined) {
		this._primaryKey = key;
		return this;
	}

	return this._primaryKey;
};

/**
 * Removes all data from the store.
 * @returns {*}
 */
KeyValueStore.prototype.truncate = function () {
	this._data = {};
	return this;
};

/**
 * Sets data against a key in the store.
 * @param {String} key The key to set data for.
 * @param {*} value The value to assign to the key.
 * @returns {*}
 */
KeyValueStore.prototype.set = function (key, value) {
	this._data[key] = value ? value : true;
	return this;
};

/**
 * Gets data stored for the passed key.
 * @param {String} key The key to get data for.
 * @returns {*}
 */
KeyValueStore.prototype.get = function (key) {
	return this._data[key];
};

/**
 * Get / set the primary key.
 * @param {*} obj A lookup query, can be a string key, an array of string keys,
 * an object with further query clauses or a regular expression that should be
 * run against all keys.
 * @returns {*}
 */
KeyValueStore.prototype.lookup = function (obj) {
	var pKeyVal = obj[this._primaryKey],
		arrIndex,
		arrCount,
		lookupItem,
		result;

	if (pKeyVal instanceof Array) {
		// An array of primary keys, find all matches
		arrCount = pKeyVal.length;
		result = [];

		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			lookupItem = this._data[pKeyVal[arrIndex]];

			if (lookupItem) {
				result.push(lookupItem);
			}
		}

		return result;
	} else if (pKeyVal instanceof RegExp) {
		// Create new data
		result = [];

		for (arrIndex in this._data) {
			if (this._data.hasOwnProperty(arrIndex)) {
				if (pKeyVal.test(arrIndex)) {
					result.push(this._data[arrIndex]);
				}
			}
		}

		return result;
	} else if (typeof pKeyVal === 'object') {
		// The primary key clause is an object, now we have to do some
		// more extensive searching
		if (pKeyVal.$ne) {
			// Create new data
			result = [];

			for (arrIndex in this._data) {
				if (this._data.hasOwnProperty(arrIndex)) {
					if (arrIndex !== pKeyVal.$ne) {
						result.push(this._data[arrIndex]);
					}
				}
			}

			return result;
		}

		if (pKeyVal.$in && (pKeyVal.$in instanceof Array)) {
			// Create new data
			result = [];

			for (arrIndex in this._data) {
				if (this._data.hasOwnProperty(arrIndex)) {
					if (pKeyVal.$in.indexOf(arrIndex) > -1) {
						result.push(this._data[arrIndex]);
					}
				}
			}

			return result;
		}

		if (pKeyVal.$nin && (pKeyVal.$nin instanceof Array)) {
			// Create new data
			result = [];

			for (arrIndex in this._data) {
				if (this._data.hasOwnProperty(arrIndex)) {
					if (pKeyVal.$nin.indexOf(arrIndex) === -1) {
						result.push(this._data[arrIndex]);
					}
				}
			}

			return result;
		}

		if (pKeyVal.$or && (pKeyVal.$or instanceof Array)) {
			// Create new data
			result = [];

			for (arrIndex = 0; arrIndex < pKeyVal.$or.length; arrIndex++) {
				result = result.concat(this.lookup(pKeyVal.$or[arrIndex]));
			}

			return result;
		}
	} else {
		// Key is a basic lookup from string
		lookupItem = this._data[pKeyVal];

		if (lookupItem !== undefined) {
			return [lookupItem];
		} else {
			return [];
		}
	}
};

/**
 * Removes data for the given key from the store.
 * @param {String} key The key to un-set.
 * @returns {*}
 */
KeyValueStore.prototype.unSet = function (key) {
	delete this._data[key];
	return this;
};

/**
 * Sets data for the give key in the store only where the given key
 * does not already have a value in the store.
 * @param {String} key The key to set data for.
 * @param {*} value The value to assign to the key.
 * @returns {Boolean} True if data was set or false if data already
 * exists for the key.
 */
KeyValueStore.prototype.uniqueSet = function (key, value) {
	if (this._data[key] === undefined) {
		this._data[key] = value;
		return true;
	}

	return false;
};

module.exports = KeyValueStore;
},{"./Shared":14}],9:[function(require,module,exports){
var Shared = require('./Shared'),
	Operation = require('./Operation');

/**
 * The metrics class used to store details about operations.
 * @constructor
 */
var Metrics = function () {
	this.init.apply(this, arguments);
};

Metrics.prototype.init = function () {
	this._data = [];
};

Shared.addModule('Metrics', Metrics);
Shared.inherit(Metrics.prototype, Shared.chainSystem);

/**
 * Creates an operation within the metrics instance and if metrics
 * are currently enabled (by calling the start() method) the operation
 * is also stored in the metrics log.
 * @param {String} name The name of the operation.
 * @returns {Operation}
 */
Metrics.prototype.create = function (name) {
	var op = new Operation(name);

	if (this._enabled) {
		this._data.push(op);
	}

	return op;
};

/**
 * Starts logging operations.
 * @returns {Metrics}
 */
Metrics.prototype.start = function () {
	this._enabled = true;
	return this;
};

/**
 * Stops logging operations.
 * @returns {Metrics}
 */
Metrics.prototype.stop = function () {
	this._enabled = false;
	return this;
};

/**
 * Clears all logged operations.
 * @returns {Metrics}
 */
Metrics.prototype.clear = function () {
	this._data = [];
	return this;
};

/**
 * Returns an array of all logged operations.
 * @returns {Array}
 */
Metrics.prototype.list = function () {
	return this._data;
};

module.exports = Metrics;
},{"./Operation":10,"./Shared":14}],10:[function(require,module,exports){
var Shared = require('./Shared'),
	Path = require('./Path');

/**
 * The operation class, used to store details about an operation being
 * performed by the database.
 * @param {String} name The name of the operation.
 * @constructor
 */
var Operation = function (name) {
	this.pathSolver = new Path();
	this.counter = 0;
	this.init.apply(this, arguments);
};

Operation.prototype.init = function (name) {
	this._data = {
		operation: name, // The name of the operation executed such as "find", "update" etc
		index: {
			potential: [], // Indexes that could have potentially been used
			used: false // The index that was picked to use
		},
		steps: [], // The steps taken to generate the query results,
		time: {
			startMs: 0,
			stopMs: 0,
			totalMs: 0,
			process: {}
		},
		flag: {}, // An object with flags that denote certain execution paths
		log: [] // Any extra data that might be useful such as warnings or helpful hints
	};
};

Shared.addModule('Operation', Operation);
Shared.inherit(Operation.prototype, Shared.chainSystem);

/**
 * Starts the operation timer.
 */
Operation.prototype.start = function () {
	this._data.time.startMs = new Date().getTime();
};

/**
 * Adds an item to the operation log.
 * @param {String} event The item to log.
 * @returns {*}
 */
Operation.prototype.log = function (event) {
	if (event) {
		var lastLogTime = this._log.length > 0 ? this._data.log[this._data.log.length - 1].time : 0,
			logObj = {
				event: event,
				time: new Date().getTime(),
				delta: 0
			};

		this._data.log.push(logObj);

		if (lastLogTime) {
			logObj.delta = logObj.time - lastLogTime;
		}

		return this;
	}

	return this._data.log;
};

/**
 * Called when starting and ending a timed operation, used to time
 * internal calls within an operation's execution.
 * @param {String} section An operation name.
 * @returns {*}
 */
Operation.prototype.time = function (section) {
	if (section !== undefined) {
		var process = this._data.time.process,
			processObj = process[section] = process[section] || {};

		if (!processObj.startMs) {
			// Timer started
			processObj.startMs = new Date().getTime();
			processObj.stepObj = {
				name: section
			};

			this._data.steps.push(processObj.stepObj);
		} else {
			processObj.stopMs = new Date().getTime();
			processObj.totalMs = processObj.stopMs - processObj.startMs;
			processObj.stepObj.totalMs = processObj.totalMs;
			delete processObj.stepObj;
		}

		return this;
	}

	return this._data.time;
};

/**
 * Used to set key/value flags during operation execution.
 * @param {String} key
 * @param {String} val
 * @returns {*}
 */
Operation.prototype.flag = function (key, val) {
	if (key !== undefined && val !== undefined) {
		this._data.flag[key] = val;
	} else if (key !== undefined) {
		return this._data.flag[key];
	} else {
		return this._data.flag;
	}
};

Operation.prototype.data = function (path, val, noTime) {
	if (val !== undefined) {
		// Assign value to object path
		this.pathSolver.set(this._data, path, val);

		return this;
	}

	return this.pathSolver.get(this._data, path);
};

Operation.prototype.pushData = function (path, val, noTime) {
	// Assign value to object path
	this.pathSolver.push(this._data, path, val);
};

/**
 * Stops the operation timer.
 */
Operation.prototype.stop = function () {
	this._data.time.stopMs = new Date().getTime();
	this._data.time.totalMs = this._data.time.stopMs - this._data.time.startMs;
};

module.exports = Operation;
},{"./Path":12,"./Shared":14}],11:[function(require,module,exports){
var Shared = require('./Shared');

/**
 * Allows a method to be overloaded.
 * @param arr
 * @returns {Function}
 * @constructor
 */
var Overload = function (arr) {
	if (arr) {
		var arrIndex,
			arrCount = arr.length;

		return function () {
			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				if (arr[arrIndex].length === arguments.length) {
					return arr[arrIndex].apply(this, arguments);
				}
			}

			return null;
		};
	}

	return function () {};
};

Shared.addModule('Overload', Overload);

module.exports = Overload;
},{"./Shared":14}],12:[function(require,module,exports){
var Shared = require('./Shared');

/**
 * Path object used to resolve object paths and retrieve data from
 * objects by using paths.
 * @param {String=} path The path to assign.
 * @constructor
 */
var Path = function (path) {
	this.init.apply(this, arguments);
};

Path.prototype.init = function (path) {
	if (path) {
		this.path(path);
	}
};

Shared.addModule('Path', Path);
Shared.inherit(Path.prototype, Shared.chainSystem);

/**
 * Gets / sets the given path for the Path instance.
 * @param {String=} path The path to assign.
 */
Path.prototype.path = function (path) {
	if (path !== undefined) {
		this._path = this.clean(path);
		this._pathParts = this._path.split('.');
		return this;
	}

	return this._path;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Boolean} True if the object paths exist.
 */
Path.prototype.hasObjectPaths = function (testKeys, testObj) {
	var result = true,
		i;

	for (i in testKeys) {
		if (testKeys.hasOwnProperty(i)) {
			if (testObj[i] === undefined) {
				return false;
			}

			if (typeof testKeys[i] === 'object') {
				// Recurse object
				result = this.hasObjectPaths(testKeys[i], testObj[i]);

				// Should we exit early?
				if (!result) {
					return false;
				}
			}
		}
	}

	return result;
};

/**
 * Counts the total number of key endpoints in the passed object.
 * @param {Object} testObj The object to count key endpoints for.
 * @returns {Number} The number of endpoints.
 */
Path.prototype.countKeys = function (testObj) {
	var totalKeys = 0,
		i;

	for (i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if (testObj[i] !== undefined) {
				if (typeof testObj[i] !== 'object') {
					totalKeys++;
				} else {
					totalKeys += this.countKeys(testObj[i]);
				}
			}
		}
	}

	return totalKeys;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths and if so returns the number matched.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Object} Stats on the matched keys
 */
Path.prototype.countObjectPaths = function (testKeys, testObj) {
	var matchData,
		matchedKeys = {},
		matchedKeyCount = 0,
		totalKeyCount = 0,
		i;

	for (i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if (typeof testObj[i] === 'object') {
				// The test / query object key is an object, recurse
				matchData = this.countObjectPaths(testKeys[i], testObj[i]);

				matchedKeys[i] = matchData.matchedKeys;
				totalKeyCount += matchData.totalKeyCount;
				matchedKeyCount += matchData.matchedKeyCount;
			} else {
				// The test / query object has a property that is not an object so add it as a key
				totalKeyCount++;

				// Check if the test keys also have this key and it is also not an object
				if (testKeys && testKeys[i] && typeof testKeys[i] !== 'object') {
					matchedKeys[i] = true;
					matchedKeyCount++;
				} else {
					matchedKeys[i] = false;
				}
			}
		}
	}

	return {
		matchedKeys: matchedKeys,
		matchedKeyCount: matchedKeyCount,
		totalKeyCount: totalKeyCount
	};
};

/**
 * Takes a non-recursive object and converts the object hierarchy into
 * a path string.
 * @param {Object} obj The object to parse.
 * @param {Boolean=} withValue If true will include a 'value' key in the returned
 * object that represents the value the object path points to.
 * @returns {Object}
 */
Path.prototype.parse = function (obj, withValue) {
	var paths = [],
		path = '',
		resultData,
		i, k;

	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			// Set the path to the key
			path = i;

			if (typeof(obj[i]) === 'object') {
				if (withValue) {
					resultData = this.parse(obj[i], withValue);

					for (k = 0; k < resultData.length; k++) {
						paths.push({
							path: path + '.' + resultData[k].path,
							value: resultData[k].value
						});
					}
				} else {
					resultData = this.parse(obj[i]);

					for (k = 0; k < resultData.length; k++) {
						paths.push({
							path: path + '.' + resultData[k].path
						});
					}
				}
			} else {
				if (withValue) {
					paths.push({
						path: path,
						value: obj[i]
					});
				} else {
					paths.push({
						path: path
					});
				}
			}
		}
	}

	return paths;
};

/**
 * Takes a non-recursive object and converts the object hierarchy into
 * an array of path strings that allow you to target all possible paths
 * in an object.
 *
 * @returns {Array}
 */
Path.prototype.parseArr = function (obj, options) {
	options = options || {};
	return this._parseArr(obj, '', [], options);
};

Path.prototype._parseArr = function (obj, path, paths, options) {
	var i,
		newPath = '';

	path = path || '';
	paths = paths || [];

	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			if (!options.ignore || (options.ignore && !options.ignore.test(i))) {
				if (path) {
					newPath = path + '.' + i;
				} else {
					newPath = i;
				}

				if (typeof(obj[i]) === 'object') {
					this._parseArr(obj[i], newPath, paths, options);
				} else {
					paths.push(newPath);
				}
			}
		}
	}

	return paths;
};

/**
 * Gets the value(s) that the object contains for the currently assigned path string.
 * @param {Object} obj The object to evaluate the path against.
 * @param {String=} path A path to use instead of the existing one passed in path().
 * @returns {Array} An array of values for the given path.
 */
Path.prototype.value = function (obj, path) {
	if (obj !== undefined && typeof obj === 'object') {
		var pathParts,
			arr,
			arrCount,
			objPart,
			objPartParent,
			valuesArr = [],
			i, k;

		if (path !== undefined) {
			path = this.clean(path);
			pathParts = path.split('.');
		}

		arr = pathParts || this._pathParts;
		arrCount = arr.length;
		objPart = obj;

		for (i = 0; i < arrCount; i++) {
			objPart = objPart[arr[i]];

			if (objPartParent instanceof Array) {
				// Search inside the array for the next key
				for (k = 0; k < objPartParent.length; k++) {
					valuesArr = valuesArr.concat(this.value(objPartParent, k + '.' + arr[i]));
				}

				return valuesArr;
			} else {
				if (!objPart || typeof(objPart) !== 'object') {
					break;
				}
			}

			objPartParent = objPart;
		}

		return [objPart];
	} else {
		return [];
	}
};

/**
 * Sets a value on an object for the specified path.
 * @param {Object} obj The object to update.
 * @param {String} path The path to update.
 * @param {*} val The value to set the object path to.
 * @returns {*}
 */
Path.prototype.set = function (obj, path, val) {
	if (obj !== undefined && path !== undefined) {
		var pathParts,
			part;

		path = this.clean(path);
		pathParts = path.split('.');

		part = pathParts.shift();

		if (pathParts.length) {
			// Generate the path part in the object if it does not already exist
			obj[part] = obj[part] || {};

			// Recurse
			this.set(obj[part], pathParts.join('.'), val);
		} else {
			// Set the value
			obj[part] = val;
		}
	}

	return obj;
};

Path.prototype.get = function (obj, path) {
	return this.value(obj, path)[0];
};

/**
 * Push a value to an array on an object for the specified path.
 * @param {Object} obj The object to update.
 * @param {String} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @returns {*}
 */
Path.prototype.push = function (obj, path, val) {
	if (obj !== undefined && path !== undefined) {
		var pathParts,
			part;

		path = this.clean(path);
		pathParts = path.split('.');

		part = pathParts.shift();

		if (pathParts.length) {
			// Generate the path part in the object if it does not already exist
			obj[part] = obj[part] || {};

			// Recurse
			this.set(obj[part], pathParts.join('.'), val);
		} else {
			// Set the value
			obj[part] = obj[part] || [];

			if (obj[part] instanceof Array) {
				obj[part].push(val);
			} else {
				throw('Cannot push to a path whose endpoint is not an array!');
			}
		}
	}

	return obj;
};

/**
 * Gets the value(s) that the object contains for the currently assigned path string
 * with their associated keys.
 * @param {Object} obj The object to evaluate the path against.
 * @param {String=} path A path to use instead of the existing one passed in path().
 * @returns {Array} An array of values for the given path with the associated key.
 */
Path.prototype.keyValue = function (obj, path) {
	var pathParts,
		arr,
		arrCount,
		objPart,
		objPartParent,
		objPartHash,
		i;

	if (path !== undefined) {
		path = this.clean(path);
		pathParts = path.split('.');
	}

	arr = pathParts || this._pathParts;
	arrCount = arr.length;
	objPart = obj;

	for (i = 0; i < arrCount; i++) {
		objPart = objPart[arr[i]];

		if (!objPart || typeof(objPart) !== 'object') {
			objPartHash = arr[i] + ':' + objPart;
			break;
		}

		objPartParent = objPart;
	}

	return objPartHash;
};

/**
 * Removes leading period (.) from string and returns it.
 * @param {String} str The string to clean.
 * @returns {*}
 */
Path.prototype.clean = function (str) {
	if (str.substr(0, 1) === '.') {
		str = str.substr(1, str.length -1);
	}

	return str;
};

module.exports = Path;
},{"./Shared":14}],13:[function(require,module,exports){
// Import external names locally
var Shared = require('./Shared'),
	Core,
	Collection,
	CollectionDrop,
	CollectionGroup,
	CollectionInit,
	CoreInit,
	Overload,
	Persist;

Persist = function () {
	this.init.apply(this, arguments);
};

Persist.prototype.init = function (db) {
	// Check environment
	if (db.isClient()) {
		if (Storage !== undefined) {
			this.mode('localStorage');
		}
	}
};

Shared.addModule('Persist', Persist);
Shared.inherit(Persist.prototype, Shared.chainSystem);

Core = Shared.modules.Core;
Collection = require('./Collection');
CollectionDrop = Collection.prototype.drop;
CollectionGroup = require('./CollectionGroup');
CollectionInit = Collection.prototype.init;
Overload = require('./Overload');
CoreInit = Core.prototype.init;

Persist.prototype.mode = function (type) {
	if (type !== undefined) {
		this._mode = type;
		return this;
	}

	return this._mode;
};

Persist.prototype.save = function (key, data, callback) {
	var val;

	switch (this.mode()) {
		case 'localStorage':
			if (typeof data === 'object') {
				val = 'json::fdb::' + JSON.stringify(data);
			} else {
				val = 'raw::fdb::' + data;
			}

			try {
				localStorage.setItem(key, val);
			} catch (e) {
				if (callback) { callback(e); }
			}

			if (callback) { callback(false); }
			break;
	}

	if (callback) { callback('No data handler.'); }
};

Persist.prototype.load = function (key, callback) {
	var val,
		parts,
		data;

	switch (this.mode()) {
		case 'localStorage':
			try {
				val = localStorage.getItem(key);
			} catch (e) {
				callback(e, null);
			}

			if (val) {
				parts = val.split('::fdb::');

				switch (parts[0]) {
					case 'json':
						data = JSON.parse(parts[1]);
						break;

					case 'raw':
						data = parts[1];
						break;
				}

				if (callback) { callback(false, data); }
			}
			break;
	}

	if (callback) { callback('No data handler or unrecognised data type.'); }
};

Persist.prototype.drop = function (key, callback) {
	switch (this.mode()) {
		case 'localStorage':
			try {
				localStorage.removeItem(key);
			} catch (e) {
				if (callback) { callback(e); }
			}

			if (callback) { callback(false); }
			break;
	}

	if (callback) { callback('No data handler or unrecognised data type.'); }
};

// Extend the Collection prototype with persist methods
Collection.prototype.drop = function (removePersistent) {
	// Remove persistent storage
	if (removePersistent) {
		if (this._name) {
			if (this._db) {
				// Save the collection data
				this._db.persist.drop(this._name);
			} else {
				if (callback) { callback('Cannot drop a collection\'s persistent storage when the collection is not attached to a database!'); }
				return 'Cannot drop a collection\'s persistent storage when the collection is not attached to a database!';
			}
		} else {
			if (callback) { callback('Cannot drop a collection\'s persistent storage when no name assigned to collection!'); }
			return 'Cannot drop a collection\'s persistent storage when no name assigned to collection!';
		}
	}

	// Call the original method
	CollectionDrop.apply(this);
};

Collection.prototype.save = function (callback) {
	if (this._name) {
		if (this._db) {
			// Save the collection data
			this._db.persist.save(this._name, this._data);
		} else {
			if (callback) { callback('Cannot save a collection that is not attached to a database!'); }
			return 'Cannot save a collection that is not attached to a database!';
		}
	} else {
		if (callback) { callback('Cannot save a collection with no assigned name!'); }
		return 'Cannot save a collection with no assigned name!';
	}
};

Collection.prototype.load = function (callback) {
	var self = this;

	if (this._name) {
		if (this._db) {
			// Load the collection data
			this._db.persist.load(this._name, function (err, data) {
				if (!err) {
					if (data) {
						self.setData(data);
					}
					if (callback) { callback(false); }
				} else {
					if (callback) { callback(err); }
					return err;
				}
			});
		} else {
			if (callback) { callback('Cannot load a collection that is not attached to a database!'); }
			return 'Cannot load a collection that is not attached to a database!';
		}
	} else {
		if (callback) { callback('Cannot load a collection with no assigned name!'); }
		return 'Cannot load a collection with no assigned name!';
	}
};

// Override the DB init to instantiate the plugin
Core.prototype.init = function () {
	this.persist = new Persist(this);
	CoreInit.apply(this, arguments);
};

module.exports = Persist;
},{"./Collection":2,"./CollectionGroup":3,"./Overload":11,"./Shared":14}],14:[function(require,module,exports){
var Shared = {
	idCounter: 0,
	modules: {},

	addModule: function (name, module) {
		this.modules[name] = module;
	},

	inherit: function (obj, system) {
		for (var i in system) {
			if (system.hasOwnProperty(i)) {
				obj[i] = system[i];
			}
		}
	},

	// Inheritable systems
	chainSystem: {
		chain: function (obj) {
			this._chain = this._chain || [];
			var index = this._chain.indexOf(obj);

			if (index === -1) {
				this._chain.push(obj);
			}
		},
		unChain: function (obj) {
			if (this._chain) {
				var index = this._chain.indexOf(obj);

				if (index > -1) {
					this._chain.splice(index, 1);
				}
			}
		},
		chainSend: function (type, data, options) {
			if (this._chain) {
				var arr = this._chain,
					count = arr.length,
					index;

				for (index = 0; index < count; index++) {
					arr[index].chainReceive(this, type, data, options);
				}
			}
		},
		chainReceive: function (sender, type, data, options) {
			// Fire our internal handler
			if (!this._chainHandler || (this._chainHandler && !this._chainHandler(sender, type, data, options))) {
				// Propagate the message down the chain
				this.chainSend(type, data, options);
			}
		}
	}
};

module.exports = Shared;
},{}],15:[function(require,module,exports){
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

View.prototype.insert = function () {
	this._collectionsRun('insert', arguments);
};

View.prototype.update = function () {
	this._collectionsRun('update', arguments);
};

View.prototype.updateById = function () {
	this._collectionsRun('updateById', arguments);
};

View.prototype.remove = function () {
	this._collectionsRun('remove', arguments);
};

View.prototype._collectionsRun = function (type, args) {
	for (var i = 0; i < this._collections.length; i++) {
		this._collections[i][type].apply(this._collections[i], args);
	}
};

/**
 * Queries the view data. See Collection.find() for more information.
 * @returns {*}
 */
View.prototype.find = function (query, options) {
	return this.publicData().find(query, options);
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
		collection.chain(this);

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
		collection.unChain(this);
		this._privateData.remove(collection.find(this._querySettings.query, this._querySettings.options));
	}

	return this;
};

View.prototype._chainHandler = function (sender, type, data, options) {
	var index,
		tempData,
		dataIsArray,
		updates,
		primaryKey,
		tQuery,
		item,
		currentIndex,
		i;

	switch (type) {
		case 'setData':
			if (this.debug()) {
				console.log('ForerunnerDB.View: Setting data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
			}

			// Decouple the data to ensure we are working with our own copy
			data = this._privateData.decouple(data);

			// Modify transform data
			this._transformSetData(data);

			this._privateData.setData(data);
			break;

		case 'insert':
			if (this.debug()) {
				console.log('ForerunnerDB.View: Inserting some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
			}

			// Decouple the data to ensure we are working with our own copy
			data = this._privateData.decouple(data);

			// Check if our view has an orderBy clause
			if (this._querySettings.options && this._querySettings.options.$orderBy) {
				// Create a temp data array from existing view data
				tempData = [].concat(this._privateData._data);
				dataIsArray = data instanceof Array;

				// Add our new data
				if (dataIsArray) {
					tempData = tempData.concat(data);
				} else {
					tempData.push(data);
				}

				// Run the new array through the sorting system
				tempData = this._privateData.sort(this._querySettings.options.$orderBy, tempData);

				// Now we have sorted data, determine how to insert it in the correct locations
				// in our existing data array for this view
				if (dataIsArray) {
					// We have an array of documents, order them by their index location
					data.sort(function (a, b) {
						return tempData.indexOf(a) - tempData.indexOf(b);
					});

					// loop and add each one to the correct place
					for (i = 0; i < data.length; i++) {
						index = tempData.indexOf(data[i]);

						// Modify transform data
						this._transformInsert(data, index);
						this._privateData._insertHandle(data, index);
					}
				} else {
					index = tempData.indexOf(data);

					// Modify transform data
					this._transformInsert(data, index);
					this._privateData._insertHandle(data, index);
				}
			} else {
				// Set the insert index to the passed index, or if none, the end of the view data array
				index = options && options.index ? options.index : this._privateData._data.length;

				// Modify transform data
				this._transformInsert(data, index);
				this._privateData._insertHandle(data, index);
			}
			break;

		case 'update':
			if (this.debug()) {
				console.log('ForerunnerDB.View: Updating some data on view "' + this.name() + '" in underlying (internal) view collection "' + this._privateData.name() + '"');
			}

			updates = this._privateData.update(data.query, data.update, data.options);

			if (this._querySettings.options && this._querySettings.options.$orderBy) {
				// Create a temp data array from existing view data
				tempData = [].concat(this._privateData._data);

				// Run the new array through the sorting system
				tempData = this._privateData.sort(this._querySettings.options.$orderBy, tempData);

				// Now we have sorted data, determine where to move the updated documents
				// Order updates by their index location
				updates.sort(function (a, b) {
					return tempData.indexOf(a) - tempData.indexOf(b);
				});

				// Loop and add each one to the correct place
				for (i = 0; i < updates.length; i++) {
					currentIndex = this._privateData._data.indexOf(updates[i]);
					index = tempData.indexOf(updates[i]);

					// Modify transform data
					this._privateData._updateSpliceMove(this._privateData._data, currentIndex, index);
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
			this._transformRemove(data.query, options);

			this._privateData.remove(data.query, options);
			break;
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
	if (this._collections && this._collections.length) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('ForerunnerDB.View: Dropping view ' + this._name);
		}

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
},{"./Collection":2,"./CollectionGroup":3,"./Overload":11,"./Shared":14}],16:[function(require,module,exports){
/*! jsviews.js v1.0.0-alpha single-file version:
includes JsRender, JsObservable and JsViews  http://github.com/BorisMoore/jsrender and http://jsviews.com/jsviews
informal pre V1.0 commit counter: 56 (Beta Candidate) */

/* JsRender:
 *    See http://github.com/BorisMoore/jsrender and http://jsviews.com/jsrender
 * Copyright 2014, Boris Moore
 * Released under the MIT License.
 */

var init = (function () {
	(function(global, jQuery, undefined) {
		// global is the this object, which is window when running in the usual browser environment.
		"use strict";

		if (jQuery && jQuery.render || global.jsviews) { return; } // JsRender is already loaded

		//========================== Top-level vars ==========================

		var versionNumber = "v1.0.0-beta",

			$, jsvStoreName, rTag, rTmplString, indexStr, // nodeJsModule,

	//TODO	tmplFnsCache = {},
			delimOpenChar0 = "{", delimOpenChar1 = "{", delimCloseChar0 = "}", delimCloseChar1 = "}", linkChar = "^",

			rPath = /^(!*?)(?:null|true|false|\d[\d.]*|([\w$]+|\.|~([\w$]+)|#(view|([\w$]+))?)([\w$.^]*?)(?:[.[^]([\w$]+)\]?)?)$/g,
			//                                     none   object     helper    view  viewProperty pathTokens      leafToken

			rParams = /(\()(?=\s*\()|(?:([([])\s*)?(?:(\^?)(!*?[#~]?[\w$.^]+)?\s*((\+\+|--)|\+|-|&&|\|\||===|!==|==|!=|<=|>=|[<>%*:?\/]|(=))\s*|(!*?[#~]?[\w$.^]+)([([])?)|(,\s*)|(\(?)\\?(?:(')|("))|(?:\s*(([)\]])(?=\s*\.|\s*\^|\s*$)|[)\]])([([]?))|(\s+)/g,
			//          lftPrn0        lftPrn        bound            path    operator err                                                eq             path2       prn    comma   lftPrn2   apos quot      rtPrn rtPrnDot                        prn2  space
			// (left paren? followed by (path? followed by operator) or (path followed by left paren?)) or comma or apos or quot or right paren or space

			rNewLine = /[ \t]*(\r\n|\n|\r)/g,
			rUnescapeQuotes = /\\(['"])/g,
			rEscapeQuotes = /['"\\]/g, // Escape quotes and \ character
			rBuildHash = /(?:\x08|^)(onerror:)?(?:(~?)(([\w$]+):)?([^\x08]+))\x08(,)?([^\x08]+)/gi,
			rTestElseIf = /^if\s/,
			rFirstElem = /<(\w+)[>\s]/,
			rAttrEncode = /[\x00`><"'&]/g, // Includes > encoding since rConvertMarkers in JsViews does not skip > characters in attribute strings
			rIsHtml = /[\x00`><\"'&]/,
			rHasHandlers = /^on[A-Z]|^convert(Back)?$/,
			rHtmlEncode = rAttrEncode,
			autoTmplName = 0,
			viewId = 0,
			charEntities = {
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				"\x00": "&#0;",
				"'": "&#39;",
				'"': "&#34;",
				"`": "&#96;"
			},
			htmlStr = "html",
			tmplAttr = "data-jsv-tmpl",
			$render = {},
			jsvStores = {
				template: {
					compile: compileTmpl
				},
				tag: {
					compile: compileTag
				},
				helper: {},
				converter: {}
			},

			// jsviews object ($.views if jQuery is loaded)
			$views = {
				jsviews: versionNumber,
				settings: function(settings) {
					$extend($viewsSettings, settings);
					dbgMode($viewsSettings._dbgMode);
					if ($viewsSettings.jsv) {
						$viewsSettings.jsv();
					}
				},
				sub: {
					// subscription, e.g. JsViews integration
					View: View,
					Err: JsViewsError,
					tmplFn: tmplFn,
					cvt: convertArgs,
					parse: parseParams,
					extend: $extend,
					syntaxErr: syntaxError,
					onStore: {},
					_lnk: retVal
				},
	//			map: $views.dataMap || dataMap, // If jsObservable loaded first, use that definition of dataMap
				map: dataMap, // If jsObservable loaded first, use that definition of dataMap
				_cnvt: convertVal,
				_tag: renderTag,
				_err: error
			};

		function retVal(val) {
			return val;
		}

		function dbgBreak(val) {
			debugger;
			return val;
		}

		function dbgMode(debugMode) {
			$viewsSettings._dbgMode = debugMode;
			indexStr = debugMode ? "Unavailable (nested view): use #getIndex()" : ""; // If in debug mode set #index to a warning when in nested contexts
			$tags("dbg", $helpers.dbg = $converters.dbg = debugMode ? dbgBreak : retVal); // If in debug mode, register {{dbg/}}, {{dbg:...}} and ~dbg() to insert break points for debugging.
		}

		function JsViewsError(message) {
			// Error exception type for JsViews/JsRender
			// Override of $.views.sub.Error is possible
			this.name = ($.link ? "JsViews" : "JsRender") + " Error";
			this.message = message || this.name;
		}

		function $extend(target, source) {
			var name;
			for (name in source) {
				target[name] = source[name];
			}
			return target;
		}

		function $isFunction(ob) {
			return typeof ob === "function";
		}

		(JsViewsError.prototype = new Error()).constructor = JsViewsError;

		//========================== Top-level functions ==========================

		//===================
		// jsviews.delimiters
		//===================
		function $viewsDelimiters(openChars, closeChars, link) {
			// Set the tag opening and closing delimiters and 'link' character. Default is "{{", "}}" and "^"
			// openChars, closeChars: opening and closing strings, each with two characters

			if (!$sub.rTag || openChars) {
				delimOpenChar0 = openChars ? openChars.charAt(0) : delimOpenChar0; // Escape the characters - since they could be regex special characters
				delimOpenChar1 = openChars ? openChars.charAt(1) : delimOpenChar1;
				delimCloseChar0 = closeChars ? closeChars.charAt(0) : delimCloseChar0;
				delimCloseChar1 = closeChars ? closeChars.charAt(1) : delimCloseChar1;
				linkChar = link || linkChar;
				openChars = "\\" + delimOpenChar0 + "(\\" + linkChar + ")?\\" + delimOpenChar1;  // Default is "{^{"
				closeChars = "\\" + delimCloseChar0 + "\\" + delimCloseChar1;                   // Default is "}}"
				// Build regex with new delimiters
				//          tag    (followed by / space or })   or cvtr+colon or html or code
				rTag = "(?:(?:(\\w+(?=[\\/\\s\\" + delimCloseChar0 + "]))|(?:(\\w+)?(:)|(>)|!--((?:[^-]|-(?!-))*)--|(\\*)))"
					+ "\\s*((?:[^\\" + delimCloseChar0 + "]|\\" + delimCloseChar0 + "(?!\\" + delimCloseChar1 + "))*?)";

				// make rTag available to JsViews (or other components) for parsing binding expressions
				$sub.rTag = rTag + ")";

				rTag = new RegExp(openChars + rTag + "(\\/)?|(?:\\/(\\w+)))" + closeChars, "g");

				// Default:    bind           tag       converter colon html     comment            code      params            slash   closeBlock
				//           /{(\^)?{(?:(?:(\w+(?=[\/\s}]))|(?:(\w+)?(:)|(>)|!--((?:[^-]|-(?!-))*)--|(\*)))\s*((?:[^}]|}(?!}))*?)(\/)?|(?:\/(\w+)))}}/g

				rTmplString = new RegExp("<.*>|([^\\\\]|^)[{}]|" + openChars + ".*" + closeChars);
				// rTmplString looks for html tags or { or } char not preceded by \\, or JsRender tags {{xxx}}. Each of these strings are considered
				// NOT to be jQuery selectors
			}
			return [delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1, linkChar];
		}

		//=========
		// View.get
		//=========

		function getView(inner, type) { //view.get(inner, type)
			if (!type) {
				// view.get(type)
				type = inner;
				inner = undefined;
			}

			var views, i, l, found,
				view = this,
				root = !type || type === "root";
				// If type is undefined, returns root view (view under top view).

			if (inner) {
				// Go through views - this one, and all nested ones, depth-first - and return first one with given type.
				found = view.type === type ? view : undefined;
				if (!found) {
					views = view.views;
					if (view._.useKey) {
						for (i in views) {
							if (found = views[i].get(inner, type)) {
								break;
							}
						}
					} else {
						for (i = 0, l = views.length; !found && i < l; i++) {
							found = views[i].get(inner, type);
						}
					}
				}
			} else if (root) {
				// Find root view. (view whose parent is top view)
				while (view.parent.parent) {
					found = view = view.parent;
				}
			} else {
				while (view && !found) {
					// Go through views - this one, and all parent ones - and return first one with given type.
					found = view.type === type ? view : undefined;
					view = view.parent;
				}
			}
			return found;
		}

		function getNestedIndex() {
			var view = this.get("item");
			return view ? view.index : undefined;
		}

		getNestedIndex.depends = function() {
			return [this.get("item"), "index"];
		};

		function getIndex() {
			return this.index;
		}

		getIndex.depends = function() {
			return ["index"];
		};

		//==========
		// View.hlp
		//==========

		function getHelper(helper) {
			// Helper method called as view.hlp(key) from compiled template, for helper functions or template parameters ~foo
			var wrapped,
				view = this,
				ctx = view.linkCtx,
				res = (view.ctx || {})[helper];

			if (res === undefined && ctx && ctx.ctx) {
				res = ctx.ctx[helper];
			}
			if (res === undefined) {
				res = $helpers[helper];
			}

			if (res) {
				if ($isFunction(res) && !res._wrp) {
					wrapped = function() {
						// If it is of type function, and not already wrapped, we will wrap it, so if called with no this pointer it will be called with the
						// view as 'this' context. If the helper ~foo() was in a data-link expression, the view will have a 'temporary' linkCtx property too.
						// Note that helper functions on deeper paths will have specific this pointers, from the preceding path.
						// For example, ~util.foo() will have the ~util object as 'this' pointer
						return res.apply((!this || this === global) ? view : this, arguments);
					};
					wrapped._wrp = 1;
					$extend(wrapped, res); // Attach same expandos (if any) to the wrapped function
				}
			}
			return wrapped || res;
		}

		//==============
		// jsviews._cnvt
		//==============

		function convertVal(converter, view, tagCtx) {
			// self is template object or linkCtx object
			var tag, value, prop,
				boundTagCtx = +tagCtx === tagCtx && tagCtx, // if tagCtx is an integer, then it is the key for the boundTagCtx (compiled function to return the tagCtx)
				linkCtx = view.linkCtx; // For data-link="{cvt:...}"...

			if (boundTagCtx) {
				// This is a bound tag: {^{xx:yyy}}. Call compiled function which returns the tagCtxs for current data
				tagCtx = (boundTagCtx = view.tmpl.bnds[boundTagCtx-1])(view.data, view, $views);
			}

			value = tagCtx.args[0];
			if (converter || boundTagCtx) {
				tag = linkCtx && linkCtx.tag;
				if (!tag) {
					tag = {
						_: {
							inline: !linkCtx,
							bnd: boundTagCtx
						},
						tagName: ":",
						cvt: converter,
						flow: true,
						tagCtx: tagCtx,
						_is: "tag"
					};
					if (linkCtx) {
						linkCtx.tag = tag;
						tag.linkCtx = linkCtx;
						tagCtx.ctx = extendCtx(tagCtx.ctx, linkCtx.view.ctx);
					}
					$sub._lnk(tag);
				}
				for (prop in tagCtx.props) {
					if (rHasHandlers.test(prop)) {
						tag[prop] = tagCtx.props[prop]; // Copy over the onFoo props from tagCtx.props to tag (overrides values in tagDef).
						// Note: unsupported scenario: if handlers are dynamically added ^onFoo=expression this will work, but dynamically removing will not work.
					}
				}

				tagCtx.view = view;

				tag.ctx = tagCtx.ctx || {};
				delete tagCtx.ctx;
				// Provide this tag on view, for addBindingMarkers on bound tags to add the tag to view._.bnds, associated with the tag id,
				view._.tag = tag;

				value = convertArgs(tag, tag.convert || converter !== "true" && converter)[0]; // If there is a convertBack but no convert, converter will be "true"

				// Call onRender (used by JsViews if present, to add binding annotations around rendered content)
				value = boundTagCtx && view._.onRender
					? view._.onRender(value, view, boundTagCtx)
					: value;
				view._.tag = undefined;
			}
			return value != undefined ? value : "";
		}

		function convertArgs(tag, converter) {
			var tagCtx = tag.tagCtx,
				view = tagCtx.view,
				args = tagCtx.args;

			converter = converter && ("" + converter === converter
				? (view.getRsc("converters", converter) || error("Unknown converter: '"+ converter + "'"))
				: converter);

			args = !args.length && !tagCtx.index // On the opening tag with no args, bind the the current data context
				? [view.data]
				: converter
					? args.slice() // If there is a converter, use a copy of the tagCtx.args array for rendering, and replace the args[0] in
					// the copied array with the converted value. But we do not modify the value of tag.tagCtx.args[0] (the original args array)
					: args; // If no converter, render with the original tagCtx.args

			if (converter) {
				if (converter.depends) {
					tag.depends = $sub.getDeps(tag.depends, tag, converter.depends, converter);
				}
				args[0] = converter.apply(tag, args);
			}
			return args;
		}

		//=============
		// jsviews._tag
		//=============

		function getResource(resourceType, itemName) {
			var res, store,
				view = this;
			while ((res === undefined) && view) {
				store = view.tmpl[resourceType];
				res = store && store[itemName];
				view = view.parent;
			}
			return res || $views[resourceType][itemName];
		}

		function renderTag(tagName, parentView, tmpl, tagCtxs, isUpdate) {
			// Called from within compiled template function, to render a template tag
			// Returns the rendered tag

			var render, tag, tags, attr, parentTag, i, l, itemRet, tagCtx, tagCtxCtx, content, boundTagFn, tagDef,
				callInit, mapDef, thisMap, args, prop, props, initialTmpl,
				ret = "",
				boundTagKey = +tagCtxs === tagCtxs && tagCtxs, // if tagCtxs is an integer, then it is the boundTagKey
				linkCtx = parentView.linkCtx || 0,
				ctx = parentView.ctx,
				parentTmpl = tmpl || parentView.tmpl;

			if (tagName._is === "tag") {
				tag = tagName;
				tagName = tag.tagName;
				tagCtxs = tag.tagCtxs;
			}
			tag = tag || linkCtx.tag;

			// Provide tagCtx, linkCtx and ctx access from tag
			if (boundTagKey) {
				// if tagCtxs is an integer, we are data binding
				// Call compiled function which returns the tagCtxs for current data
				tagCtxs = (boundTagFn = parentTmpl.bnds[boundTagKey-1])(parentView.data, parentView, $views);
			}

			l = tagCtxs.length;
			for (i = 0; i < l; i++) {
				if (!i && (!tmpl || !tag)) {
					tagDef = parentView.getRsc("tags", tagName) || error("Unknown tag: {{"+ tagName + "}}");
				}
				tagCtx = tagCtxs[i];
				if (!linkCtx.tag) {
					// We are initializing tag, so for block tags, tagCtx.tmpl is an integer > 0
					content = tagCtx.tmpl;
					content = tagCtx.content = content && parentTmpl.tmpls[content - 1];

					$extend(tagCtx, {
						tmpl: (tag ? tag : tagDef).template || content, // Set the tmpl property to the content of the block tag
						render: renderContent,
						// Possible future feature:
						//var updatedValueOfArg0 = this.tagCtx.get(0);
						//var test3 = this.tagCtx.get(0);
						//var updatedValueOfPropFoo = this.tagCtx.get("foo");
						//var updatedValueOfCtxPropFoo = this.tagCtx.get("~foo");
						//_fns: {},
						//get: function(key) {
						//	return (this._fns[key] = this._fns[key] || new Function("data,view,j,u",
						//		"return " + $.views.sub.parse(this.params[+key === key ? "args" : (key.charAt(0) === "~" ? (key = key.slice(1), "ctx") : "props")][key]) + ";")
						//	)(this.view.data, this.view, $views);
						//},
						index: i,
						view: parentView,
						ctx: extendCtx(tagCtx.ctx, ctx) // Extend parentView.ctx
					}); // Extend parentView.ctx
				}
				if (tmpl = tagCtx.props.tmpl) {
					// If the tmpl property is overridden, set the value (when initializing, or, in case of binding: ^tmpl=..., when updating)
					tmpl = "" + tmpl === tmpl // if a string
						? parentView.getRsc("templates", tmpl) || $templates(tmpl)
						: tmpl;

					tagCtx.tmpl = tmpl;
				}

				if (!tag) {
					// This will only be hit for initial tagCtx (not for {{else}}) - if the tag instance does not exist yet
					// Instantiate tag if it does not yet exist
					if (tagDef._ctr) {
						// If the tag has not already been instantiated, we will create a new instance.
						// ~tag will access the tag, even within the rendering of the template content of this tag.
						// From child/descendant tags, can access using ~tag.parent, or ~parentTags.tagName
						tag = new tagDef._ctr();
						callInit = !!tag.init;

						// Set attr on linkCtx to ensure outputting to the correct target attribute.
						tag.attr = tag.attr || tagDef.attr || undefined;
						// Setting either linkCtx.attr or this.attr in the init() allows per-instance choice of target attrib.
					} else {
						// This is a simple tag declared as a function, or with init set to false. We won't instantiate a specific tag constructor - just a standard instance object.
						$sub._lnk(tag = {
							// tag instance object if no init constructor
							render: tagDef.render
						});
					}
					tag._ = {
						inline: !linkCtx
					};
					if (linkCtx) {
						// Set attr on linkCtx to ensure outputting to the correct target attribute.
						linkCtx.attr = tag.attr = linkCtx.attr || tag.attr;
						linkCtx.tag = tag;
						tag.linkCtx = linkCtx;
					}
					if (tag._.bnd = boundTagFn || linkCtx.fn) {
						// Bound if {^{tag...}} or data-link="{tag...}"
						tag._.arrVws = {};
					} else if (tag.dataBoundOnly) {
						error("{^{" + tagName + "}} tag must be data-bound");
					}
					tag.tagName = tagName;
					tag.parent = parentTag = ctx && ctx.tag;
					tag._is = "tag";
					tag._def = tagDef;
					tag.tagCtxs = tagCtxs;

					//TODO better perf for childTags() - keep child tag.tags array, (and remove child, when disposed)
					// tag.tags = [];
					// Provide this tag on view, for addBindingMarkers on bound tags to add the tag to view._.bnds, associated with the tag id,
				}
				if (!i) {
					for (prop in props = tagCtx.props) {
						if (rHasHandlers.test(prop)) {
							tag[prop] = props[prop]; // Copy over the onFoo or convert or convertBack props from tagCtx.props to tag (overrides values in tagDef).
						}
					}
				}
				tagCtx.tag = tag;
				if (tag.dataMap && tag.tagCtxs) {
					tagCtx.map = tag.tagCtxs[i].map; // Copy over the compiled map instance from the previous tagCtxs to the refreshed ones
				}
				if (!tag.flow) {
					tagCtxCtx = tagCtx.ctx = tagCtx.ctx || {};

					// tags hash: tag.ctx.tags, merged with parentView.ctx.tags,
					tags = tag.parents = tagCtxCtx.parentTags = ctx && extendCtx(tagCtxCtx.parentTags, ctx.parentTags) || {};
					if (parentTag) {
						tags[parentTag.tagName] = parentTag;
						//TODO better perf for childTags: parentTag.tags.push(tag);
					}
					tagCtxCtx.tag = tag;
				}
			}
			parentView._.tag = tag;
			tag.rendering = {}; // Provide object for state during render calls to tag and elses. (Used by {{if}} and {{for}}...)
			for (i = 0; i < l; i++) {
				tagCtx = tag.tagCtx = tag.tagCtxs[i];
				props = tagCtx.props;
				args = convertArgs(tag, tag.convert);

				if (mapDef = props.dataMap || tag.dataMap) {
					if (args.length || props.dataMap) {
						thisMap = tagCtx.map;
						if (!thisMap || thisMap.src !== args[0] || isUpdate) {
							if (thisMap && thisMap.src) {
								thisMap.unmap(); // only called if observable map - not when only used in JsRender, e.g. by {{props}}
							}
							thisMap = tagCtx.map = mapDef.map(args[0], props);
						}
						args = [thisMap.tgt];
					}
				}
				tag.ctx = tagCtx.ctx;

				if (!i && callInit) {
					initialTmpl = tag.template;
					tag.init(tagCtx, linkCtx, tag.ctx);
					callInit = undefined;
					if (tag.template !== initialTmpl) {
						tag._.tmpl = tag.template; // This will override the tag.template and also tagCtx.props.tmpl for all tagCtxs
					}
				}

				itemRet = undefined;
				render = tag.render;
				if (render = tag.render) {
					itemRet = render.apply(tag, args);
				}
				args = args.length ? args : [parentView]; // no arguments - get data context from view.
				itemRet = itemRet !== undefined
					? itemRet // Return result of render function unless it is undefined, in which case return rendered template
					: tagCtx.render(args[0], true) || (isUpdate ? undefined : "");
					// No return value from render, and no template/content tagCtx.render(...), so return undefined
				ret = ret ? ret + (itemRet || "") : itemRet; // If no rendered content, this will be undefined
			}

			delete tag.rendering;

			tag.tagCtx = tag.tagCtxs[0];
			tag.ctx= tag.tagCtx.ctx;

			if (tag._.inline && (attr = tag.attr) && attr !== htmlStr) {
				// inline tag with attr set to "text" will insert HTML-encoded content - as if it was element-based innerText
				ret = attr === "text"
					? $converters.html(ret)
					: "";
			}
			return boundTagKey && parentView._.onRender
				// Call onRender (used by JsViews if present, to add binding annotations around rendered content)
				? parentView._.onRender(ret, parentView, boundTagKey)
				: ret;
		}

		//=================
		// View constructor
		//=================

		function View(context, type, parentView, data, template, key, contentTmpl, onRender) {
			// Constructor for view object in view hierarchy. (Augmented by JsViews if JsViews is loaded)
			var views, parentView_, tag,
				self = this,
				isArray = type === "array",
				self_ = {
					key: 0,
					useKey: isArray ? 0 : 1,
					id: "" + viewId++,
					onRender: onRender,
					bnds: {}
				};

			self.data = data;
			self.tmpl = template,
			self.content = contentTmpl;
			self.views = isArray ? [] : {};
			self.parent = parentView;
			self.type = type;
			// If the data is an array, this is an 'array view' with a views array for each child 'item view'
			// If the data is not an array, this is an 'item view' with a views 'hash' object for any child nested views
			// ._.useKey is non zero if is not an 'array view' (owning a data array). Use this as next key for adding to child views hash
			self._ = self_;
			self.linked = !!onRender;
			if (parentView) {
				views = parentView.views;
				parentView_ = parentView._;
				if (parentView_.useKey) {
					// Parent is an 'item view'. Add this view to its views object
					// self._key = is the key in the parent view hash
					views[self_.key = "_" + parentView_.useKey++] = self;
					self.index = indexStr;
					self.getIndex = getNestedIndex;
					tag = parentView_.tag;
					self_.bnd = isArray && (!tag || !!tag._.bnd && tag); // For array views that are data bound for collection change events, set the
					// view._.bnd property to true for top-level link() or data-link="{for}", or to the tag instance for a data-bound tag, e.g. {^{for ...}}
				} else {
					// Parent is an 'array view'. Add this view to its views array
					views.splice(
						// self._.key = self.index - the index in the parent view array
						self_.key = self.index = key,
					0, self);
				}
				// If no context was passed in, use parent context
				// If context was passed in, it should have been merged already with parent context
				self.ctx = context || parentView.ctx;
			} else {
				self.ctx = context;
			}
		}

		View.prototype = {
			get: getView,
			getIndex: getIndex,
			getRsc: getResource,
			hlp: getHelper,
			_is: "view"
		};

		//=============
		// Registration
		//=============

		function compileChildResources(parentTmpl) {
			var storeName, resources, resourceName, resource, settings, compile, onStore;
			for (storeName in jsvStores) {
				settings = jsvStores[storeName];
				if ((compile = settings.compile) && (resources = parentTmpl[storeName + "s"])) {
					for (resourceName in resources) {
						// compile child resource declarations (templates, tags, tags["for"] or helpers)
						resource = resources[resourceName] = compile(resourceName, resources[resourceName], parentTmpl);
						if (resource && (onStore = $sub.onStore[storeName])) {
							// e.g. JsViews integration
							onStore(resourceName, resource, compile);
						}
					}
				}
			}
		}

		function compileTag(name, tagDef, parentTmpl) {
			var init, tmpl;
			if ($isFunction(tagDef)) {
				// Simple tag declared as function. No presenter instantation.
				tagDef = {
					depends: tagDef.depends,
					render: tagDef
				};
			} else {
				if (tagDef.baseTag) {
					tagDef.flow = !!tagDef.flow; // default to false even if baseTag has flow=true
					tagDef = $extend($extend({}, tagDef.baseTag), tagDef);
				}
				// Tag declared as object, used as the prototype for tag instantiation (control/presenter)
				if ((tmpl = tagDef.template) !== undefined) {
					tagDef.template = "" + tmpl === tmpl ? ($templates[tmpl] || $templates(tmpl)) : tmpl;
				}
				if (tagDef.init !== false) {
					// Set int: false on tagDef if you want to provide just a render method, or render and template, but no constuctor or prototype.
					// so equivalent to setting tag to render function, except you can also provide a template.
					init = tagDef._ctr = function() {};
					(init.prototype = tagDef).constructor = init;
				}
			}
			if (parentTmpl) {
				tagDef._parentTmpl = parentTmpl;
			}
			return tagDef;
		}

		function compileTmpl(name, tmpl, parentTmpl, options) {
			// tmpl is either a template object, a selector for a template script block, the name of a compiled template, or a template object

			//==== nested functions ====
			function tmplOrMarkupFromStr(value) {
				// If value is of type string - treat as selector, or name of compiled template
				// Return the template object, if already compiled, or the markup string

				if (("" + value === value) || value.nodeType > 0) {
					try {
						elem = value.nodeType > 0
						? value
						: !rTmplString.test(value)
						// If value is a string and does not contain HTML or tag content, then test as selector
							&& jQuery && jQuery(global.document).find(value)[0]; // TODO address case where DOM is not available
						// If selector is valid and returns at least one element, get first element
						// If invalid, jQuery will throw. We will stay with the original string.
					} catch (e) {}

					if (elem) {
						// Generally this is a script element.
						// However we allow it to be any element, so you can for example take the content of a div,
						// use it as a template, and replace it by the same content rendered against data.
						// e.g. for linking the content of a div to a container, and using the initial content as template:
						// $.link("#content", model, {tmpl: "#content"});

						value = $templates[name = name || elem.getAttribute(tmplAttr)];
						if (!value) {
							// Not already compiled and cached, so compile and cache the name
							// Create a name for compiled template if none provided
							name = name || "_" + autoTmplName++;
							elem.setAttribute(tmplAttr, name);
							// Use tmpl as options
							value = $templates[name] = compileTmpl(name, elem.innerHTML, parentTmpl, options);
						}
						elem = undefined;
					}
					return value;
				}
				// If value is not a string, return undefined
			}

			var tmplOrMarkup, elem;

			//==== Compile the template ====
			tmpl = tmpl || "";
			tmplOrMarkup = tmplOrMarkupFromStr(tmpl);

			// If options, then this was already compiled from a (script) element template declaration.
			// If not, then if tmpl is a template object, use it for options
			options = options || (tmpl.markup ? tmpl : {});
			options.tmplName = name;
			if (parentTmpl) {
				options._parentTmpl = parentTmpl;
			}
			// If tmpl is not a markup string or a selector string, then it must be a template object
			// In that case, get it from the markup property of the object
			if (!tmplOrMarkup && tmpl.markup && (tmplOrMarkup = tmplOrMarkupFromStr(tmpl.markup))) {
				if (tmplOrMarkup.fn && (tmplOrMarkup.debug !== tmpl.debug || tmplOrMarkup.allowCode !== tmpl.allowCode)) {
					// if the string references a compiled template object, but the debug or allowCode props are different, need to recompile
					tmplOrMarkup = tmplOrMarkup.markup;
				}
			}
			if (tmplOrMarkup !== undefined) {
				if (name && !parentTmpl) {
					$render[name] = function() {
						return tmpl.render.apply(tmpl, arguments);
					};
				}
				if (tmplOrMarkup.fn || tmpl.fn) {
					// tmpl is already compiled, so use it, or if different name is provided, clone it
					if (tmplOrMarkup.fn) {
						if (name && name !== tmplOrMarkup.tmplName) {
							tmpl = extendCtx(options, tmplOrMarkup);
						} else {
							tmpl = tmplOrMarkup;
						}
					}
				} else {
					// tmplOrMarkup is a markup string, not a compiled template
					// Create template object
					tmpl = TmplObject(tmplOrMarkup, options);
					// Compile to AST and then to compiled function
					tmplFn(tmplOrMarkup.replace(rEscapeQuotes, "\\$&"), tmpl);
				}
				compileChildResources(options);
				return tmpl;
			}
		}

		function dataMap(mapDef) {
			function newMap(source, options) {
				this.tgt = mapDef.getTgt(source, options);
			}

			if ($isFunction(mapDef)) {
				// Simple map declared as function
				mapDef = {
					getTgt: mapDef
				};
			}

			if (mapDef.baseMap) {
				mapDef = $extend($extend({}, mapDef.baseMap), mapDef);
			}

			mapDef.map = function(source, options) {
				return new newMap(source, options);
			};
			return mapDef;
		}

		//==== /end of function compile ====

		function TmplObject(markup, options) {
			// Template object constructor
			var htmlTag,
				wrapMap = $viewsSettings.wrapMap || {},
				tmpl = $extend(
					{
						markup: markup,
						tmpls: [],
						links: {}, // Compiled functions for link expressions
						tags: {}, // Compiled functions for bound tag expressions
						bnds: [],
						_is: "template",
						render: fastRender
					},
					options
				);

			if (!options.htmlTag) {
				// Set tmpl.tag to the top-level HTML tag used in the template, if any...
				htmlTag = rFirstElem.exec(markup);
				tmpl.htmlTag = htmlTag ? htmlTag[1].toLowerCase() : "";
			}
			htmlTag = wrapMap[tmpl.htmlTag];
			if (htmlTag && htmlTag !== wrapMap.div) {
				// When using JsViews, we trim templates which are inserted into HTML contexts where text nodes are not rendered (i.e. not 'Phrasing Content').
				// Currently not trimmed for <li> tag. (Not worth adding perf cost)
				tmpl.markup = $.trim(tmpl.markup);
			}

			return tmpl;
		}

		function registerStore(storeName, storeSettings) {

			function theStore(name, item, parentTmpl) {
				// The store is also the function used to add items to the store. e.g. $.templates, or $.views.tags

				// For store of name 'thing', Call as:
				//    $.views.things(items[, parentTmpl]),
				// or $.views.things(name, item[, parentTmpl])

				var onStore, compile, itemName, thisStore;

				if (name && typeof name === "object" && !name.nodeType && !name.markup && !name.getTgt) {
					// Call to $.views.things(items[, parentTmpl]),

					// Adding items to the store
					// If name is a hash, then item is parentTmpl. Iterate over hash and call store for key.
					for (itemName in name) {
						theStore(itemName, name[itemName], item);
					}
					return $views;
				}
				// Adding a single unnamed item to the store
				if (item === undefined) {
					item = name;
					name = undefined;
				}
				if (name && "" + name !== name) { // name must be a string
					parentTmpl = item;
					item = name;
					name = undefined;
				}
				thisStore = parentTmpl ? parentTmpl[storeNames] = parentTmpl[storeNames] || {} : theStore;
				compile = storeSettings.compile;
				if (item === null) {
					// If item is null, delete this entry
					name && delete thisStore[name];
				} else {
					item = compile ? (item = compile(name, item, parentTmpl)) : item;
					name && (thisStore[name] = item);
				}
				if (compile && item) {
					item._is = storeName; // Only do this for compiled objects (tags, templates...)
				}
				if (item && (onStore = $sub.onStore[storeName])) {
					// e.g. JsViews integration
					onStore(name, item, compile);
				}
				return item;
			}

			var storeNames = storeName + "s";

			$views[storeNames] = theStore;
			jsvStores[storeName] = storeSettings;
		}

		//==============
		// renderContent
		//==============

		function $fastRender(data, context) {
			var tmplElem = this.jquery && (this[0] || error('Unknown template: "' + this.selector + '"')),
				tmpl = tmplElem.getAttribute(tmplAttr);

			return fastRender.call(tmpl ? $templates[tmpl] : $templates(tmplElem), data, context);
		}

		function tryFn(tmpl, data, view) {
			if ($viewsSettings._dbgMode) {
				try {
					return tmpl.fn(data, view, $views);
				}
				catch (e) {
					return error(e, view);
				}
			}
			return tmpl.fn(data, view, $views);
		}

		function fastRender(data, context, noIteration, parentView, key, onRender) {
			var self = this;
			if (!parentView && self.fn._nvw && !$.isArray(data)) {
				return tryFn(self, data, {tmpl: self});
			}
			return renderContent.call(self, data, context, noIteration, parentView, key, onRender);
		}

		function renderContent(data, context, noIteration, parentView, key, onRender) {
			// Render template against data as a tree of subviews (nested rendered template instances), or as a string (top-level template).
			// If the data is the parent view, treat as noIteration, re-render with the same data context.
			var i, l, dataItem, newView, childView, itemResult, swapContent, tagCtx, contentTmpl, tag_, outerOnRender, tmplName, tmpl, noViews,
				self = this,
				result = "";

			if (!!context === context) {
				noIteration = context; // passing boolean as second param - noIteration
				context = undefined;
			}

			if (key === true) {
				swapContent = true;
				key = 0;
			}

			if (self.tag) {
				// This is a call from renderTag or tagCtx.render(...)
				tagCtx = self;
				self = self.tag;
				tag_ = self._;
				tmplName = self.tagName;
				tmpl = tag_.tmpl || tagCtx.tmpl;
				noViews = self.attr && self.attr !== htmlStr,
				context = extendCtx(context, self.ctx);
				contentTmpl = tagCtx.content; // The wrapped content - to be added to views, below
				if (tagCtx.props.link === false) {
					// link=false setting on block tag
					// We will override inherited value of link by the explicit setting link=false taken from props
					// The child views of an unlinked view are also unlinked. So setting child back to true will not have any effect.
					context = context || {};
					context.link = false;
				}
				parentView = parentView || tagCtx.view;
				data = arguments.length ? data : parentView;
			} else {
				tmpl = self;
			}

			if (tmpl) {
				if (!parentView && data && data._is === "view") {
					parentView = data; // When passing in a view to render or link (and not passing in a parent view) use the passed in view as parentView
				}
				if (parentView) {
					contentTmpl = contentTmpl || parentView.content; // The wrapped content - to be added as #content property on views, below
					onRender = onRender || parentView._.onRender;
					if (data === parentView) {
						// Inherit the data from the parent view.
						// This may be the contents of an {{if}} block
						data = parentView.data;
					}
					context = extendCtx(context, parentView.ctx);
				}
				if (!parentView || parentView.data === undefined) {
					(context = context || {}).root = data; // Provide ~root as shortcut to top-level data.
				}

				// Set additional context on views created here, (as modified context inherited from the parent, and to be inherited by child views)
				// Note: If no jQuery, $extend does not support chained copies - so limit extend() to two parameters

				if (!tmpl.fn) {
					tmpl = $templates[tmpl] || $templates(tmpl);
				}

				if (tmpl) {
					onRender = (context && context.link) !== false && !noViews && onRender;
					// If link===false, do not call onRender, so no data-linking marker nodes
					outerOnRender = onRender;
					if (onRender === true) {
						// Used by view.refresh(). Don't create a new wrapper view.
						outerOnRender = undefined;
						onRender = parentView._.onRender;
					}
					context = tmpl.helpers
						? extendCtx(tmpl.helpers, context)
						: context;
					if ($.isArray(data) && !noIteration) {
						// Create a view for the array, whose child views correspond to each data item. (Note: if key and parentView are passed in
						// along with parent view, treat as insert -e.g. from view.addViews - so parentView is already the view item for array)
						newView = swapContent
							? parentView :
							(key !== undefined && parentView) || new View(context, "array", parentView, data, tmpl, key, contentTmpl, onRender);
						for (i = 0, l = data.length; i < l; i++) {
							// Create a view for each data item.
							dataItem = data[i];
							childView = new View(context, "item", newView, dataItem, tmpl, (key || 0) + i, contentTmpl, onRender);
							itemResult = tryFn(tmpl, dataItem, childView);
							result += newView._.onRender ? newView._.onRender(itemResult, childView) : itemResult;
						}
					} else {
						// Create a view for singleton data object. The type of the view will be the tag name, e.g. "if" or "myTag" except for
						// "item", "array" and "data" views. A "data" view is from programmatic render(object) against a 'singleton'.
						if (parentView || !tmpl.fn._nvw) {
							newView = swapContent ? parentView : new View(context, tmplName || "data", parentView, data, tmpl, key, contentTmpl, onRender);
							if (tag_ && !self.flow) {
								newView.tag = self;
							}
						}
						result += tryFn(tmpl, data, newView);
					}
					return outerOnRender ? outerOnRender(result, newView) : result;
				}
			}
			return "";
		}

		//===========================
		// Build and compile template
		//===========================

		// Generate a reusable function that will serve to render a template against data
		// (Compile AST then build template function)

		function error(e, view, fallback) {
			var message = $viewsSettings.onError(e, view, fallback);
			if ("" + e === e) { // if e is a string, not an Exception, then throw new Exception
				throw new $sub.Err(message);
			}
			return !view.linkCtx && view.linked ? $converters.html(message) : message;
		}

		function syntaxError(message) {
			error("Syntax error\n" + message);
		}

		function tmplFn(markup, tmpl, isLinkExpr, convertBack) {
			// Compile markup to AST (abtract syntax tree) then build the template function code from the AST nodes
			// Used for compiling templates, and also by JsViews to build functions for data link expressions

			//==== nested functions ====
			function pushprecedingContent(shift) {
				shift -= loc;
				if (shift) {
					content.push(markup.substr(loc, shift).replace(rNewLine, "\\n"));
				}
			}

			function blockTagCheck(tagName) {
				tagName && syntaxError('Unmatched or missing tag: "{{/' + tagName + '}}" in template:\n' + markup);
			}

			function parseTag(all, bind, tagName, converter, colon, html, comment, codeTag, params, slash, closeBlock, index) {

				//    bind         tag        converter colon html     comment            code      params            slash   closeBlock
				// /{(\^)?{(?:(?:(\w+(?=[\/\s}]))|(?:(\w+)?(:)|(>)|!--((?:[^-]|-(?!-))*)--|(\*)))\s*((?:[^}]|}(?!}))*?)(\/)?|(?:\/(\w+)))}}/g
				// Build abstract syntax tree (AST): [tagName, converter, params, content, hash, bindings, contentMarkup]
				if (html) {
					colon = ":";
					converter = htmlStr;
				}
				slash = slash || isLinkExpr;
				var pathBindings = (bind || isLinkExpr) && [],
					props = "",
					args = "",
					ctxProps = "",
					paramsArgs = "",
					paramsProps = "",
					paramsCtxProps = "",
					onError = "",
					useTrigger = "",
					// Block tag if not self-closing and not {{:}} or {{>}} (special case) and not a data-link expression
					block = !slash && !colon && !comment;

				//==== nested helper function ====
				tagName = tagName || (params = params || "#data", colon); // {{:}} is equivalent to {{:#data}}
				pushprecedingContent(index);
				loc = index + all.length; // location marker - parsed up to here
				if (codeTag) {
					if (allowCode) {
						content.push(["*", "\n" + params.replace(rUnescapeQuotes, "$1") + "\n"]);
					}
				} else if (tagName) {
					if (tagName === "else") {
						if (rTestElseIf.test(params)) {
							syntaxError('for "{{else if expr}}" use "{{else expr}}"');
						}
						pathBindings = current[7];
						current[8] = markup.substring(current[8], index); // contentMarkup for block tag
						current = stack.pop();
						content = current[2];
						block = true;
					}
					if (params) {
						// remove newlines from the params string, to avoid compiled code errors for unterminated strings
						parseParams(params.replace(rNewLine, " "), pathBindings, tmpl)
							.replace(rBuildHash, function(all, onerror, isCtx, key, keyToken, keyValue, arg, param) {
								if (arg) {
									args += keyValue + ",";
									paramsArgs += "'" + param + "',";
								} else if (isCtx) {
									ctxProps += key + keyValue + ",";
									paramsCtxProps += key + "'" + param + "',";
								} else if (onerror) {
									onError += keyValue;
								} else {
									if (keyToken === "trigger") {
										useTrigger += keyValue;
									}
									props += key + keyValue + ",";
									paramsProps += key + "'" + param + "',";
									hasHandlers = hasHandlers || rHasHandlers.test(keyToken);
								}
								return "";
							}).slice(0, -1);
					}

					newNode = [
							tagName,
							converter || !!convertBack || hasHandlers || "",
							block && [],
							parsedParam(paramsArgs, paramsProps, paramsCtxProps),
							parsedParam(args, props, ctxProps),
							onError,
							useTrigger,
							pathBindings || 0
						];
					content.push(newNode);
					if (block) {
						stack.push(current);
						current = newNode;
						current[8] = loc; // Store current location of open tag, to be able to add contentMarkup when we reach closing tag
					}
				} else if (closeBlock) {
					blockTagCheck(closeBlock !== current[0] && current[0] !== "else" && closeBlock);
					current[8] = markup.substring(current[8], index); // contentMarkup for block tag
					current = stack.pop();
				}
				blockTagCheck(!current && closeBlock);
				content = current[2];
			}
			//==== /end of nested functions ====

			var result, newNode, hasHandlers,
				allowCode = tmpl && tmpl.allowCode,
				astTop = [],
				loc = 0,
				stack = [],
				content = astTop,
				current = [,,astTop];

	//TODO	result = tmplFnsCache[markup]; // Only cache if template is not named and markup length < ...,
	//and there are no bindings or subtemplates?? Consider standard optimization for data-link="a.b.c"
	//		if (result) {
	//			tmpl.fn = result;
	//		} else {

	//		result = markup;
			if (isLinkExpr) {
				markup = delimOpenChar0 + markup + delimCloseChar1;
			}

			blockTagCheck(stack[0] && stack[0][2].pop()[0]);
			// Build the AST (abstract syntax tree) under astTop
			markup.replace(rTag, parseTag);

			pushprecedingContent(markup.length);

			if (loc = astTop[astTop.length - 1]) {
				blockTagCheck("" + loc !== loc && (+loc[8] === loc[8]) && loc[0]);
			}
	//			result = tmplFnsCache[markup] = buildCode(astTop, tmpl);
	//		}

			if (isLinkExpr) {
				result = buildCode(astTop, markup, isLinkExpr);
				result.paths = astTop[0][7]; // With data-link expressions, pathBindings array is astTop[0][7]
			} else {
				result = buildCode(astTop, tmpl);
			}
			if (result._nvw) {
				result._nvw = !/[~#]/.test(markup);
			}
			return result;
		}

		function parsedParam(args, props, ctx) {
			 return [args.slice(0, -1), props.slice(0, -1), ctx.slice(0, -1)];
		}

		function paramStructure(parts, type) {
			return '\n\t' + (type ? type + ':{' : '') + 'args:[' + parts[0] + ']' + (parts[1] || !type ? ',\n\tprops:{' + parts[1] + '}' : "") + (parts[2] ? ',\n\tctx:{' + parts[2] + '}' : "");
		}

		function parseParams(params, bindings, tmpl) {

			function parseTokens(all, lftPrn0, lftPrn, bound, path, operator, err, eq, path2, prn, comma, lftPrn2, apos, quot, rtPrn, rtPrnDot, prn2, space, index, full) {
				//rParams = /(\()(?=\s*\()|(?:([([])\s*)?(?:(\^?)(!*?[#~]?[\w$.^]+)?\s*((\+\+|--)|\+|-|&&|\|\||===|!==|==|!=|<=|>=|[<>%*:?\/]|(=))\s*|(!*?[#~]?[\w$.^]+)([([])?)|(,\s*)|(\(?)\\?(?:(')|("))|(?:\s*(([)\]])(?=\s*\.|\s*\^)|[)\]])([([]?))|(\s+)/g,
				//          lftPrn0        lftPrn        bound            path    operator err                                                eq             path2       prn    comma   lftPrn2   apos quot      rtPrn rtPrnDot                    prn2   space
				// (left paren? followed by (path? followed by operator) or (path followed by paren?)) or comma or apos or quot or right paren or space
				operator = operator || "";
				lftPrn = lftPrn || lftPrn0 || lftPrn2;
				path = path || path2;
				prn = prn || prn2 || "";

				var expr, isFn, exprFn;

				function parsePath(allPath, not, object, helper, view, viewProperty, pathTokens, leafToken) {
					// rPath = /^(?:null|true|false|\d[\d.]*|(!*?)([\w$]+|\.|~([\w$]+)|#(view|([\w$]+))?)([\w$.^]*?)(?:[.[^]([\w$]+)\]?)?)$/g,
					//                                        none   object     helper    view  viewProperty pathTokens      leafToken
					if (object) {
						if (bindings) {
							if (named === "linkTo") {
								bindto = bindings._jsvto = bindings._jsvto || [];
								bindto.push(path);
							}
							if (!named || boundName) {
								bindings.push(path.slice(not.length)); // Add path binding for paths on props and args,
							}
						}
						if (object !== ".") {
							var ret = (helper
									? 'view.hlp("' + helper + '")'
									: view
										? "view"
										: "data")
								+ (leafToken
									? (viewProperty
										? "." + viewProperty
										: helper
											? ""
											: (view ? "" : "." + object)
										) + (pathTokens || "")
									: (leafToken = helper ? "" : view ? viewProperty || "" : object, ""));

							ret = ret + (leafToken ? "." + leafToken : "");

							return not + (ret.slice(0, 9) === "view.data"
								? ret.slice(5) // convert #view.data... to data...
								: ret);
						}
					}
					return allPath;
				}

				if (err && !aposed && !quoted) {
					syntaxError(params);
				} else {
					if (bindings && rtPrnDot && !aposed && !quoted) {
						// This is a binding to a path in which an object is returned by a helper/data function/expression, e.g. foo()^x.y or (a?b:c)^x.y
						// We create a compiled function to get the object instance (which will be called when the dependent data of the subexpression changes, to return the new object, and trigger re-binding of the subsequent path)
						if (!named || boundName || bindto) {
							expr = pathStart[parenDepth];
							if (full.length - 1 > index - expr) { // We need to compile a subexpression
								expr = full.slice(expr, index + 1);
								rtPrnDot = delimOpenChar1 + ":" + expr + delimCloseChar0; // The parameter or function subexpression
								exprFn = tmplLinks[rtPrnDot];
								if (!exprFn) {
									tmplLinks[rtPrnDot] = 1; // Flag that this exprFn (for rtPrnDot) is being compiled
									tmplLinks[rtPrnDot] = exprFn = tmplFn(rtPrnDot, tmpl || bindings, true); // Compile the expression (or use cached copy already in tmpl.links)
									exprFn.paths.push({_jsvOb: exprFn}); //list.push({_jsvOb: rtPrnDot});
								}
								if (exprFn !== 1) { // If not reentrant call during compilation
									(bindto || bindings).push({_jsvOb: exprFn}); // Insert special object for in path bindings, to be used for binding the compiled sub expression ()
								}
							}
						}
					}
					return (aposed
						// within single-quoted string
						? (aposed = !apos, (aposed ? all : '"'))
						: quoted
						// within double-quoted string
							? (quoted = !quot, (quoted ? all : '"'))
							:
						(
							(lftPrn
									? (parenDepth++, pathStart[parenDepth] = index++, lftPrn)
									: "")
							+ (space
								? (parenDepth
									? ""
									: (paramIndex = full.slice(paramIndex, index), named
										? (named = boundName = bindto = false, "\b")
										: "\b,") + paramIndex + (paramIndex = index + all.length, "\b")
								)
								: eq
						// named param
						// Insert backspace \b (\x08) as separator for named params, used subsequently by rBuildHash
									? (parenDepth && syntaxError(params), named = path, boundName = bound, paramIndex = index + all.length, /*pushBindings(),*/ path + ':')
									: path
						// path
										? (path.split("^").join(".").replace(rPath, parsePath)
											+ (prn
												? (fnCall[++parenDepth] = true, path.charAt(0) !== "." && (pathStart[parenDepth] = index), isFn ? "" : prn)
												: operator)
										)
										: operator
											? operator
											: rtPrn
						// function
												? ((fnCall[parenDepth--] = false, rtPrn)
													+ (prn
														? (fnCall[++parenDepth] = true, prn)
														: "")
												)
												: comma
													? (fnCall[parenDepth] || syntaxError(params), ",") // We don't allow top-level literal arrays or objects
													: lftPrn0
														? ""
														: (aposed = apos, quoted = quot, '"')
						))
					);
				}
			}
			var named, bindto, boundName,
				quoted, // boolean for string content in double quotes
				aposed, // or in single quotes
				paramIndex = 0, // list,
				tmplLinks = tmpl ? tmpl.links : bindings && (bindings.links = bindings.links || {}),
				fnCall = {},
				pathStart = {0:-1},
				parenDepth = 0;

			//pushBindings();
			return (params + (tmpl ? " " : ""))
				.replace(/\)\^/g, ").") // Treat "...foo()^bar..." as equivalent to "...foo().bar..."
									//since preceding computed observables in the path will always be updated if their dependencies change
				.replace(rParams, parseTokens);
		}

		function buildCode(ast, tmpl, isLinkExpr) {
			// Build the template function code from the AST nodes, and set as property on the passed-in template object
			// Used for compiling templates, and also by JsViews to build functions for data link expressions
			var i, node, tagName, converter, tagCtx, hasTag, hasEncoder, getsVal, hasCnvt, needView, useCnvt, tmplBindings, pathBindings, params,
				nestedTmpls, tmplName, nestedTmpl, tagAndElses, content, markup, nextIsElse, oldCode, isElse, isGetVal, tagCtxFn, onError, tagStart, trigger,
				tmplBindingKey = 0,
				code = "",
				tmplOptions = {},
				l = ast.length;

			if ("" + tmpl === tmpl) {
				tmplName = isLinkExpr ? 'data-link="' + tmpl.replace(rNewLine, " ").slice(1, -1) + '"' : tmpl;
				tmpl = 0;
			} else {
				tmplName = tmpl.tmplName || "unnamed";
				if (tmpl.allowCode) {
					tmplOptions.allowCode = true;
				}
				if (tmpl.debug) {
					tmplOptions.debug = true;
				}
				tmplBindings = tmpl.bnds;
				nestedTmpls = tmpl.tmpls;
			}
			for (i = 0; i < l; i++) {
				// AST nodes: [tagName, converter, content, params, code, onError, pathBindings, contentMarkup, link]
				node = ast[i];

				// Add newline for each callout to t() c() etc. and each markup string
				if ("" + node === node) {
					// a markup string to be inserted
					code += '\n+"' + node + '"';
				} else {
					// a compiled tag expression to be inserted
					tagName = node[0];
					if (tagName === "*") {
						// Code tag: {{* }}
						code += ";\n" + node[1] + "\nret=ret";
					} else {
						converter = node[1];
						content = node[2];
						tagCtx = paramStructure(node[3], 'params') + '},' + paramStructure(params = node[4]);
						onError = node[5];
						trigger = node[6];
						markup = node[8];
						if (!(isElse = tagName === "else")) {
							tmplBindingKey = 0;
							if (tmplBindings && (pathBindings = node[7])) { // Array of paths, or false if not data-bound
								tmplBindingKey = tmplBindings.push(pathBindings);
							}
						}
						if (isGetVal = tagName === ":") {
							if (converter) {
								tagName = converter === htmlStr ? ">" : converter + tagName;
							}
						} else {
							if (content) {
								// Create template object for nested template
								nestedTmpl = TmplObject(markup, tmplOptions);
								nestedTmpl.tmplName = tmplName + "/" + tagName;
								// Compile to AST and then to compiled function
								buildCode(content, nestedTmpl);
								nestedTmpls.push(nestedTmpl);
							}

							if (!isElse) {
								// This is not an else tag.
								tagAndElses = tagName;
								// Switch to a new code string for this bound tag (and its elses, if it has any) - for returning the tagCtxs array
								oldCode = code;
								code = "";
							}
							nextIsElse = ast[i + 1];
							nextIsElse = nextIsElse && nextIsElse[0] === "else";
						}
						tagStart = (onError ? ";\ntry{\nret+=" : "\n+");

						if (isGetVal && (pathBindings || trigger || converter && converter !== htmlStr)) {
							// For convertVal we need a compiled function to return the new tagCtx(s)
							tagCtxFn = "return {" + tagCtx + "};";
							if (onError) {
								tagCtxFn = "try {\n" + tagCtxFn + '\n}catch(e){return {error: j._err(e,view,' + onError + ')}}\n';
							}
							tagCtxFn = new Function("data,view,j,u", " // " + tmplName + " " + tmplBindingKey + " " + tagName
												+ "\n" + tagCtxFn);

							tagCtxFn.paths = pathBindings;
							tagCtxFn._tag = tagName;
							if (isLinkExpr) {
								return tagCtxFn;
							}
							useCnvt = 1;
						}
						code += (isGetVal
							? (isLinkExpr ? (onError ? "\ntry{\n" : "") + "return " : tagStart) + (useCnvt // Call _cnvt if there is a converter: {{cnvt: ... }} or {^{cnvt: ... }}
								? (useCnvt = 0, needView = hasCnvt = true, 'c("' + converter + '",view,' + (pathBindings
									? ((tmplBindings[tmplBindingKey - 1] = tagCtxFn), tmplBindingKey) // Store the compiled tagCtxFn in tmpl.bnds, and pass the key to convertVal()
									: "{" + tagCtx + "}") + ")")
								: tagName === ">"
									? (hasEncoder = true, "h(" + params[0] + ')')
									: (getsVal = true, "((v=" + params[0] + ')!=null?v:"")') // Strict equality just for data-link="title{:expr}" so expr=null will remove title attribute
							)
							: (needView = hasTag = true, "\n{view:view,tmpl:" // Add this tagCtx to the compiled code for the tagCtxs to be passed to renderTag()
								+ (content ? nestedTmpls.length : "0") + "," // For block tags, pass in the key (nestedTmpls.length) to the nested content template
								+ tagCtx + "},"));

						if (tagAndElses && !nextIsElse) {
							code = "[" + code.slice(0, -1) + "]"; // This is a data-link expression or the last {{else}} of an inline bound tag. We complete the code for returning the tagCtxs array
							if (isLinkExpr || pathBindings) {
								// This is a bound tag (data-link expression or inline bound tag {^{tag ...}}) so we store a compiled tagCtxs function in tmp.bnds
								code = new Function("data,view,j,u", " // " + tmplName + " " + tmplBindingKey + " " + tagAndElses + "\nreturn " + code + ";");
								if (pathBindings) {
									(tmplBindings[tmplBindingKey - 1] = code).paths = pathBindings;
								}
								code._tag = tagName;
								if (isLinkExpr) {
									return code; // For a data-link expression we return the compiled tagCtxs function
								}
							}

							// This is the last {{else}} for an inline tag.
							// For a bound tag, pass the tagCtxs fn lookup key to renderTag.
							// For an unbound tag, include the code directly for evaluating tagCtxs array
							code = oldCode + tagStart + 't("' + tagAndElses + '",view,this,' + (tmplBindingKey || code) + ")";
							pathBindings = 0;
							tagAndElses = 0;
						}
						if (onError) {
							needView = true;
							code += ';\n}catch(e){ret' + (isLinkExpr ? "urn " : "+=") + 'j._err(e,view,' + onError + ');}\n' + (isLinkExpr ? "" : 'ret=ret');
						}
					}
				}
			}
			// Include only the var references that are needed in the code
			code = "// " + tmplName

				+ "\nj=j||" + (jQuery ? "jQuery." : "jsviews.") + "views;var v"
				+ (hasTag ? ",t=j._tag" : "")                // has tag
				+ (hasCnvt ? ",c=j._cnvt" : "")              // converter
				+ (hasEncoder ? ",h=j.converters.html":"") // html converter
				+ (isLinkExpr ? ";\n" : ',ret=""\n')
				+ (tmplOptions.debug ? "debugger;" : "")
				+ code
				+ (isLinkExpr ? "\n" : ";\nreturn ret;");
			try {
				code = new Function("data,view,j,u", code);
			} catch (e) {
				syntaxError("Compiled template code:\n\n" + code + '\n: "' + e.message + '"');
			}
			if (tmpl) {
				tmpl.fn = code;
			}
			if (!needView) {
				code._nvw = true;
			}
			return code;
		}

		//==========
		// Utilities
		//==========

		// Merge objects, in particular contexts which inherit from parent contexts
		function extendCtx(context, parentContext) {
			// Return copy of parentContext, unless context is defined and is different, in which case return a new merged context
			// If neither context nor parentContext are defined, return undefined
			return context && context !== parentContext
				? (parentContext
					? $extend($extend({}, parentContext), context)
					: context)
				: parentContext && $extend({}, parentContext);
		}

		// Get character entity for HTML and Attribute encoding
		function getCharEntity(ch) {
			return charEntities[ch] || (charEntities[ch] = "&#" + ch.charCodeAt(0) + ";");
		}

		//========================== Initialize ==========================

		for (jsvStoreName in jsvStores) {
			registerStore(jsvStoreName, jsvStores[jsvStoreName]);
		}

		var $templates = $views.templates,
			$converters = $views.converters,
			$helpers = $views.helpers,
			$tags = $views.tags,
			$sub = $views.sub,
			$viewsSettings = $views.settings;

		if (jQuery) {
			////////////////////////////////////////////////////////////////////////////////////////////////
			// jQuery is loaded, so make $ the jQuery object
			$ = jQuery;
			$.fn.render = $fastRender;
			if ($.observable) {
				$extend($sub, $.views.sub); // jquery.observable.js was loaded before jsrender.js
				$views.map = $.views.map;
			}
		} else {
			////////////////////////////////////////////////////////////////////////////////////////////////
			// jQuery is not loaded.

			$ = global.jsviews = {};

			$.isArray = Array && Array.isArray || function(obj) {
				return Object.prototype.toString.call(obj) === "[object Array]";
			};

		//	//========================== Future Node.js support ==========================
		//	if ((nodeJsModule = global.module) && nodeJsModule.exports) {
		//		nodeJsModule.exports = $;
		//	}
		}

		$.render = $render;
		$.views = $views;
		$.templates = $templates = $views.templates;

		$viewsSettings({
			debugMode: dbgMode,
			delimiters: $viewsDelimiters,
			onError: function(e, view, fallback) {
				// Can override using $.views.settings({onError: function(...) {...}});
				if (view) {
					// For render errors, e is an exception thrown in compiled template, and view is the current view. For other errors, e is an error string.
					e = fallback === undefined
						? "{Error: " + e + "}"
						: $isFunction(fallback)
							? fallback(e, view) : fallback;
				}
				return e == undefined ? "" : e;
			},
			_dbgMode: true
		});

		//========================== Register tags ==========================

		$tags({
			"else": function() {}, // Does nothing but ensures {{else}} tags are recognized as valid
			"if": {
				render: function(val) {
					// This function is called once for {{if}} and once for each {{else}}.
					// We will use the tag.rendering object for carrying rendering state across the calls.
					// If not done (a previous block has not been rendered), look at expression for this block and render the block if expression is truthy
					// Otherwise return ""
					var self = this,
						ret = (self.rendering.done || !val && (arguments.length || !self.tagCtx.index))
							? ""
							: (self.rendering.done = true, self.selected = self.tagCtx.index,
								// Test is satisfied, so render content on current context. We call tagCtx.render() rather than return undefined
								// (which would also render the tmpl/content on the current context but would iterate if it is an array)
								self.tagCtx.render(self.tagCtx.view, true)); // no arg, so renders against parentView.data
					return ret;
				},
				onUpdate: function(ev, eventArgs, tagCtxs) {
					var tci, prevArg, different;
					for (tci = 0; (prevArg = this.tagCtxs[tci]) && prevArg.args.length; tci++) {
						prevArg = prevArg.args[0];
						different = !prevArg !== !tagCtxs[tci].args[0];
						if ((!this.convert && !!prevArg) || different) {
							return different;
							// If there is no converter, and newArg and prevArg are both truthy, return false to cancel update. (Even if values on later elses are different, we still don't want to update, since rendered output would be unchanged)
							// If newArg and prevArg are different, return true, to update
							// If newArg and prevArg are both falsey, move to the next {{else ...}}
						}
					}
					// Boolean value of all args are unchanged (falsey), so return false to cancel update
					return false;
				},
				flow: true
			},
			"for": {
				render: function(val) {
					// This function is called once for {{for}} and once for each {{else}}.
					// We will use the tag.rendering object for carrying rendering state across the calls.
					var finalElse,
						self = this,
						tagCtx = self.tagCtx,
						result = "",
						done = 0;

					if (!self.rendering.done) {
						if (finalElse = !arguments.length) {
							val = tagCtx.view.data; // For the final else, defaults to current data without iteration.
						}
						if (val !== undefined) {
							result += tagCtx.render(val, finalElse); // Iterates except on final else, if data is an array. (Use {{include}} to compose templates without array iteration)
							done += $.isArray(val) ? val.length : 1;
						}
						if (self.rendering.done = done) {
							self.selected = tagCtx.index;
						}
						// If nothing was rendered we will look at the next {{else}}. Otherwise, we are done.
					}
					return result;
				},
				flow: true
			},
			include: {
				flow: true
			},
			"*": {
				// {{* code... }} - Ignored if template.allowCode is false. Otherwise include code in compiled template
				render: retVal,
				flow: true
			}
		});

		function getTargetProps(source) {
			// this pointer is theMap - which has tagCtx.props too
			// arguments: tagCtx.args.
			var key, prop,
				props = [];

			if (typeof source === "object") {
				for (key in source) {
					prop = source[key];
					if (!prop || !prop.toJSON || prop.toJSON()) {
						if (!$isFunction(prop)) {
							props.push({ key: key, prop: prop });
						}
					}
				}
			}
			return props;
		}

		$tags("props", {
			baseTag: $tags["for"],
			dataMap: dataMap(getTargetProps)
		});

		//========================== Register converters ==========================

		function htmlEncode(text) {
			// HTML encode: Replace < > & ' and " by corresponding entities.
			return text != null ? rIsHtml.test(text) && ("" + text).replace(rHtmlEncode, getCharEntity) || text : "";
		}

		$converters({
			html: htmlEncode,
			attr: htmlEncode, // Includes > encoding since rConvertMarkers in JsViews does not skip > characters in attribute strings
			url: function(text) {
				// URL encoding helper.
				return text != undefined ? encodeURI("" + text) : text === null ? text : ""; // null returns null, e.g. to remove attribute. undefined returns ""
			}
		});

		//========================== Define default delimiters ==========================
		$viewsDelimiters();

	})(this, this.jQuery);

	/* JsObservable:
	 *    See http://github.com/borismoore/jsobservable and http://jsviews.com/jsobservable
	 * Copyright 2014, Boris Moore
	 * Released under the MIT License.
	 */

	(function(global, $, undefined) {
		// global is the this object, which is window when running in the usual browser environment.
		// $ is the global var jQuery or jsviews
		"use strict";

		if (!$) {
			throw "jsViews/jsObservable require jQuery";
		}
		if ($.observable) { return; } // JsObservable is already loaded

		//========================== Top-level vars ==========================

		var versionNumber = "v1.0.0-alpha",
			$views = $.views =
				$.views // jsrender was loaded before jquery.observable
				|| { // jsrender not loaded so set up $.views and $.views.sub here, and merge back in jsrender if loaded afterwards
					jsviews: versionNumber,
					sub: {}
				},
			$sub = $views.sub,
			$eventSpecial = $.event.special,
			splice = [].splice,
			$isArray = $.isArray,
			$expando = $.expando,
			OBJECT = "object",
			PARSEINT = parseInt,
			rNotWhite = /\S+/g,
			propertyChangeStr = $sub.propChng = $sub.propChng || "propertyChange",// These two settings can be overridden on settings after loading
			arrayChangeStr = $sub.arrChng = $sub.arrChng || "arrayChange",        // jsRender, and prior to loading jquery.observable.js and/or JsViews
			cbBindingsStore = $sub._cbBnds = $sub._cbBnds || {},
			observeStr = propertyChangeStr + ".observe",
			$isFunction = $.isFunction,
			observeObjKey = 1,
			observeCbKey = 1,
			$hasData = $.hasData,
			remove = {}; // flag for removeProperty

		//========================== Top-level functions ==========================

		$sub.getDeps = function() {
			var args = arguments;
			return function() {
				var arg, dep,
					deps = [],
					l=args.length;
				while (l--) {
					arg = args[l--],
					dep = args[l];
					if (dep) {
						deps = deps.concat($isFunction(dep) ? dep(arg, arg) : dep);
					}
				}
				return deps;
			};
		};

		function $observable(data) {
			return $isArray(data)
				? new ArrayObservable(data)
				: new ObjectObservable(data);
		}

		function ObjectObservable(data) {
			this._data = data;
			return this;
		}

		function ArrayObservable(data) {
			this._data = data;
			return this;
		}

		function wrapArray(data) {
			return $isArray(data)
				? [data]
				: data;
		}

		function resolvePathObjects(paths, root) {
			paths = $isArray(paths) ? paths : [paths];

			var i, path,
				object = root,
				nextObj = object,
				l = paths.length,
				out = [];

			for (i = 0; i < l; i++) {
				path = paths[i];
				if ($isFunction(path)) {
					out = out.concat(resolvePathObjects(path.call(root, root), root));
					continue;
				} else if ("" + path !== path) {
					root = nextObj = path;
					if (nextObj !== object) {
						out.push(object = nextObj);
					}
					continue;
				}
				if (nextObj !== object) {
					out.push(object = nextObj);
				}
				out.push(path);
			}
			return out;
		}

		function removeCbBindings(cbBindings, cbBindingsId) {
			// If the cbBindings collection is empty we will remove it from the cbBindingsStore
			var cb, found;

			for (cb in cbBindings) {
				found = true;
				break;
			}
			if (!found) {
				delete cbBindingsStore[cbBindingsId];
			}
		}

		function onObservableChange(ev, eventArgs) {
			if (!(ev.data && ev.data.off)) {
				// Skip if !!ev.data.off: - a handler that has already been removed (maybe was on handler collection at call time - then removed by another handler)
				var allPath, filter, parentObs,
					oldValue = eventArgs.oldValue,
					value = eventArgs.value,
					ctx = ev.data,
					observeAll = ctx.observeAll,
					allowArray = !ctx.cb.noArray,
					paths = ctx.paths;

				if (ev.type === arrayChangeStr) {
					(ctx.cb.array || ctx.cb).call(ctx, ev, eventArgs); // If there is an arrayHandler expando on the regular handler, use it, otherwise use the regular handler for arrayChange events also - for example: $.observe(array, handler)
					// or observeAll() with an array in the graph. Note that on data-link bindings we ensure always to have an array handler - $.noop if none is specified e.g. on the data-linked tag.
				} else if (ctx.prop === eventArgs.path || ctx.prop === "*") {
					oldValue = typeof oldValue === OBJECT && (paths[0] || allowArray && $isArray(oldValue)) && oldValue; // Note: && (paths[0] || $isArray(value)) is for perf optimization
					value = typeof (value = eventArgs.value) === OBJECT && (paths[0] || allowArray && $isArray(value)) && value;
					if (observeAll) {
						allPath = observeAll._path + "." + eventArgs.path;
						filter = observeAll.filter;
						parentObs = [observeAll.parents().slice()];
						if (oldValue) {
							observe_apply(allowArray, observeAll.ns, [oldValue], paths, ctx.cb, true, filter, parentObs, allPath); // unobserve
						}
						if (value) {
							observe_apply(allowArray, observeAll.ns, [value], paths, ctx.cb, undefined, filter, parentObs, allPath);
						}
					} else {
						if (oldValue) { // oldValue is an object, so unobserve
							observe_apply(allowArray, [oldValue], paths, ctx.cb, true); // unobserve
						}
						if (value) { // value is an object, so observe
							observe_apply(allowArray, [value], paths, ctx.cb);
						}
					}
					ctx.cb(ev, eventArgs);
				}
			}
		}

		function $observe() {
			// $.observe([namespace, ]root, [1 or more objects, path or path Array params...], callback[, contextCallback][, unobserveOrOrigRoot])
			function observeOnOff(namespace, pathStr, isArrayBinding, off) {
				var j, evData,
					obIdExpando = $hasData(object),
					boundObOrArr = wrapArray(object);

				namespace = initialNs ? namespace + "." + initialNs : namespace;

				if (unobserve || off) {
					if (obIdExpando) {
						$(boundObOrArr).off(namespace, onObservableChange);
					}
				} else {
					if (events = obIdExpando && $._data(object)) {
						events = events && events.events;
						events = events && events[isArrayBinding ? arrayChangeStr : propertyChangeStr];
						el = events && events.length;

						while (el--) {
							if ((data = events[el].data) && data.cb._cId === callback._cId && data.ns === initialNs) {
								if (isArrayBinding) {
									// Duplicate exists, so skip. (This can happen e.g. with {^{for people ~foo=people}})
									return;
								} else if (pathStr === "*" && data.prop !== pathStr || data.prop === prop) {
									$(object).off(namespace, onObservableChange);
								}
							}
						}
					}
					evData = isArrayBinding ? {}
						: {
							fullPath: path,
							paths: pathStr ? [pathStr] : [],
							prop: prop
						};
					evData.ns = initialNs;
					evData.cb = callback;

					if (allPath) {
						evData.observeAll = {
							_path: allPath,
							path: function() { // Step through path and parentObs parent chain, replacing '[]' by '[n]' based on current index of objects in parent arrays.
								j = parentObs.length;
								return allPath.replace(/[[.]/g, function(all) {
									j--;
									return all === "["
										? "[" + $.inArray(parentObs[j - 1], parentObs[j])
										: ".";
								});
							},
							parents: function() {
								return parentObs; // The chain of parents between the modified object and the root object used in the observeAll() call
							},
							filter: filter,
							ns: initialNs
						};
					}
					$(boundObOrArr).on(namespace, null, evData, onObservableChange);
					if (cbBindings) {
						// Add object to cbBindings, and add the counter to the jQuery data on the object
						cbBindings[$.data(object, "obId") || $.data(object, "obId", observeObjKey++)] = object;
					}
				}
			}

			function onUpdatedExpression(exprOb, paths) {
				// Use the contextCb callback to execute the compiled exprOb template in the context of the view/data etc. to get the returned value, typically an object or array.
				// If it is an array, register array binding
				exprOb._ob = contextCb(exprOb, origRoot);
				var origRt = origRoot;
				return function(ev, eventArgs) {
					var obj = exprOb._ob,
						len = paths.length;
					if (typeof obj === OBJECT) {
						bindArray(obj, true);
						if (len || allowArray && $isArray(obj)) {
							observe_apply(allowArray, [obj], paths, callback, contextCb, true); // unobserve
						}
					}
					obj = exprOb._ob = contextCb(exprOb, origRt);
					// Put the updated object instance onto the exprOb in the paths array, so subsequent string paths are relative to this object
					if (typeof obj === OBJECT) {
						bindArray(obj);
						if (len || allowArray && $isArray(obj)) {
							observe_apply(allowArray, [obj], paths, callback, contextCb, [origRt]);
						}
					}
					callback(ev, eventArgs);
				};
			}

			function bindArray(arr, unbind, isArray, relPath) {
				if (allowArray) {
					// This is a call to observe that does not come from observeAndBind (tag binding), so we allow arrayChange binding
					var prevObj = object,
						prevAllPath = allPath;

					object = arr;
					if (relPath) {
						object = arr[relPath];
						allPath += "." + relPath;
						if (filter) {
							object = $observable._fltr(relPath, arr, allPath, filter);
						}
					}
					if (object && (isArray || $isArray(object))) {
						observeOnOff(arrayChangeStr + ".observe" + (callback ? ".obs" + (cbId = callback._cId = callback._cId || observeCbKey++) : ""), undefined, true, unbind);
					}
					object = prevObj;
					allPath = prevAllPath;
				}
			}

			var i, p, skip, parts, prop, path, dep, unobserve, callback, cbId, el, data, events, contextCb, items, cbBindings, depth, innerCb, parentObs,
				allPath, filter, initialNs, initNsArr, initNsArrLen,
				allowArray = this != false, // If this === false, this is a call from observeAndBind - doing binding of datalink expressions. We don't bind
				// arrayChange events in this scenario. Instead, {^{for}} and similar do specific arrayChange binding to the tagCtx.args[0] value, in onAfterLink.
				// Note deliberately using this != false, rather than this !== false because of IE<10 bug- see https://github.com/BorisMoore/jsviews/issues/237
				topLevel = 1,
				ns = observeStr,
				paths = Array.apply(0, arguments),
				lastArg = paths.pop(),
				origRoot = paths.shift(),
				root = origRoot,
				object = root,
				l = paths.length;

			if (origRoot + "" === origRoot && allowArray) {
				initialNs = origRoot; // The first arg is a namespace, since it is  a string, and this call is not from observeAndBind
				origRoot = object = root = paths.shift();
				l--;
			}

			if ($isFunction(lastArg)) {
				callback = lastArg;
			} else {
				if (lastArg + "" === lastArg) { // If last arg is a string then this observe call is part of an observeAll call,
					allPath = lastArg;          // and the last three args are the parentObs array, the filter, and the allPath string.
					parentObs = paths.pop();
					filter = paths.pop();
					lastArg = paths.pop();
					l = l - 3;
				}
				if (lastArg === true) {
					unobserve = lastArg;
				} else if (lastArg) {
					origRoot = lastArg;
					topLevel = 0;
				}
				lastArg = paths[l-1];
				if (l && lastArg === undefined || $isFunction(lastArg)) {
					callback = paths.pop(); // If preceding is callback this will be contextCb param - which may be undefined
					l--;
				}
			}
			if (l && $isFunction(paths[l-1])) {
				contextCb = callback;
				callback = paths.pop();
				l--;
			}
			// Use a unique namespace (e.g. obs7) associated with each observe() callback to allow unobserve to remove handlers
			ns += unobserve
				? (callback ? ".obs" + callback._cId: "")
				: ".obs" + (cbId = callback._cId = callback._cId || observeCbKey++);

			if (!unobserve) {
				cbBindings = cbBindingsStore[cbId] = cbBindingsStore[cbId] || {};
			}

			initNsArr = initialNs && initialNs.match(rNotWhite) || [""];
			initNsArrLen = initNsArr.length;

			while (initNsArrLen--) {
				initialNs = initNsArr[initNsArrLen];

				if ($isArray(root)) {
					bindArray(root, unobserve, true);
				} else {
					// remove onObservableChange handlers that wrap that callback
					if (unobserve && l === 0 && root) {
						observeOnOff(ns, "");
					}
				}
				depth = 0;
				for (i = 0; i < l; i++) {
					path = paths[i];
					if (path === "") {
						continue;
					}
					object = root;
					if ("" + path === path) {
						parts = path.split("^");
						if (parts[1]) {
							// We bind the leaf, plus additional nodes based on depth.
							// "a.b.c^d.e" is depth 2, so listens to changes of e, plus changes of d and of c
							depth = parts[0].split(".").length;
							path = parts.join(".");
							depth = path.split(".").length - depth;
							// if more than one ^ in the path, the first one determines depth
						}
						if (contextCb && (items = contextCb(path, root))) {
							// If contextCb returns an array of objects and paths, we will insert them
							// into the sequence, replacing the current item (path)
							l += items.length - 1;
							splice.apply(paths, [i--, 1].concat(items));
							continue;
						}
						parts = path.split(".");
					} else {
						if (topLevel && !$isFunction(path)) {
							if (path._jsvOb) {
								// Currently this will only occur if !unobserve
								// This is a compiled function for binding to an object returned by a helper/data function.
								innerCb = onUpdatedExpression(path, paths.slice(i+1));
								innerCb.noArray = !allowArray;
								innerCb._cId = callback._cId; // Set the same cbBindingsStore key as for callback, so when callback is disposed, disposal of innerCb happens too.
								observe_apply(allowArray, [origRoot], paths.slice(0, i), innerCb, contextCb);
								innerCb = undefined;
								path = path._ob;
							}
							object = path; // For top-level calls, objects in the paths array become the origRoot for subsequent paths.
						}
						root = path;
						parts = [root];
					}
					while (object && (prop = parts.shift()) !== undefined) {
						if (typeof object === OBJECT) {
							if ("" + prop === prop) {
								if (prop === "") {
									continue;
								}
								if ((parts.length < depth + 1) && !object.nodeType) {
									// Add observer for each token in path starting at depth, and on to the leaf
									if (!unobserve && (events = $hasData(object) && $._data(object))) {
										events = events.events;
										events = events && events[propertyChangeStr];
										el = events && events.length;
										skip = 0;
										while (el--) { // Skip duplicates
											data = events[el].data;
											if (data && data.cb === callback && data.ns === initialNs) {
												if (data.prop === prop || data.prop === "*") {
													if (p = parts.join(".")) {
														data.paths.push(p); // We will skip this binding, but if it is not a leaf binding,
														// need to keep bindings for rest of path, ready for if the object gets swapped.
													}
													skip++;
												}
											}
										}
										if (skip) {
											// Duplicate binding(s) found, so move on
											object = object[prop];
											continue;
										}
									}
									if (prop === "*") {
										if (!unobserve && events && events.length) {
											// Remove existing bindings, since they will be duplicates with "*"
											observeOnOff(ns, "", false, true);
										}
										if ($isFunction(object)) {
											if (dep = object.depends) {
												observe_apply(allowArray, [dep], callback, unobserve || origRoot);
											}
										} else {
											observeOnOff(ns, ""); // observe the object for any property change
										}
										for (p in object) {
											// observing "*" listens to any prop change, and also to arraychange on props of type array
											bindArray(object, unobserve, undefined, p);
										}
										break;
									} else if (prop) {
										observeOnOff(ns + "." + prop, parts.join("."));
									}
								}
								if (allPath) {
									allPath += "." + prop;
								}
								prop = object[prop];
							}
							if ($isFunction(prop)) {
								if (dep = prop.depends) {
									// This is a computed observable. We will observe any declared dependencies
									observe_apply(allowArray, [object], resolvePathObjects(dep, object), callback, contextCb, unobserve || [origRoot]);
								}
								break;
							}
							object = prop;
						}
					}
					bindArray(object, unobserve);
				}
			}
			if (cbId) {
				removeCbBindings(cbBindings, cbId);
			}

			// Return the cbBindings to the top-level caller, along with the cbId
			return { cbId: cbId, bnd: cbBindings };
		}

		function $unobserve() {
			[].push.call(arguments, true); // Add true as additional final argument
			return $observe.apply(this, arguments);
		}

		function observe_apply() {
			// $.observe(), but allowing you to include arrays within the arguments - which you want flattened.
			var args = [].concat.apply([], arguments); // Flatten the arguments
			return $observe.apply(args.shift(), args);
		}

		//========================== Initialize ==========================

		function $observeAll(namespace, cb, filter, unobserve) {
			if (namespace + "" !== namespace) {
				filter = cb;
				cb = namespace;
				namespace = "";
			}
			observeAll(namespace, this._data, cb, filter, [], "root", unobserve);
		}

		function $unobserveAll(namespace, cb, filter) {
			$observeAll.call(this, namespace, cb, filter, true);
		}

		function observeAll(namespace, object, cb, filter, parentObs, allPath, unobserve) {
			function observeArray(arr, unobs) {
				l = arr.length;
				newAllPath = allPath + "[]";
				while (l--) {
					if (newObject = $observable._fltr(l, arr, newAllPath, filter)) {
						observeAll(namespace, newObject, cb, filter || "", parentObs.slice(), newAllPath, unobs); // If nested array, need to observe the array too - so set filter to ""
					}
				}
			}

			function wrappedCb(ev, eventArgs) {
				// This object is changing.
				allPath = ev.data.observeAll._path;
				var oldParentObs = parentObs;
				if (parentObs[0]!==ev.target) {
					parentObs = parentObs.slice();
					parentObs.unshift(ev.target);
				}
				switch (eventArgs.change) { // observeAll/unobserveAll on added or removed objects
					case "insert":
						observeArray(eventArgs.items);
						break;
					case "remove":
						observeArray(eventArgs.items, true); // unobserveAll on removed items
						break;
					case "refresh":
						observeArray(eventArgs.oldItems, true); // unobserveAll on old items
						observeArray(ev.target); // observeAll on new items
						break;
					case "set":
						newAllPath = allPath + "." + eventArgs.path;
						observeAll(namespace, eventArgs.oldValue, cb, 0, parentObs.slice(), newAllPath, true); // unobserveAll on previous value object
						observeAll(namespace, eventArgs.value, cb, 0, parentObs.slice(), newAllPath); // observeAll on new value object
				}
				cb.apply(this, arguments); // Observe this object (invoke the callback)
				parentObs = oldParentObs;
			}

			var l, isObject, newAllPath, newObject;

			if (typeof object === OBJECT) {
				isObject = $isArray(object) ? "" : "*";
				parentObs.unshift(object);
				if (cb) {
					// Observe this object or array - and also listen for changes to object graph, to add or remove observers from the modified object graph
					if (isObject || filter !== 0) {
						// If an object, observe the object. If an array, only add arrayChange binding if (filter !== 0) - which
						// is the case for top-level calls or for nested array (array item of an array - e.g. member of 2-dimensional array).
						// (But not for array properties lower in the tree, since they get arrayChange binding added during regular $.observe(array ...) binding.
						wrappedCb._cId = cb._cId = cb._cId || observeCbKey++; // Identify wrapped callback with unwrapped callback, so unobserveAll will
																			  // remove previous observeAll wrapped callback, if inner callback was the same;
						$observe(namespace, object, isObject, wrappedCb, unobserve, filter, parentObs.slice(), allPath);
					}
				} else {
					// No callback. Just unobserve if unobserve === true.
					$observe(namespace, object, isObject, undefined, unobserve, filter, parentObs.slice(), allPath);
				}

				if (isObject) {
					// Continue stepping through object graph, observing object and arrays
					// To override filtering, pass in filter function, or replace $.observable._fltr
					for (l in object) {
						if (l.charAt(0) !== "_" && l !== $expando) { // Filter props with keys that start with _ or jquery, and also apply the custom filter function if any.
							newAllPath = allPath + "." + l;
							if (newObject = $observable._fltr(l, object, newAllPath, filter)) {
								observeAll(namespace, newObject, cb, filter || 0, parentObs.slice(), newAllPath, unobserve);
							}
						}
					}
				} else { // Array
					observeArray(object, unobserve);
				}
			}
		}

		$.observable = $observable;
		$observable._fltr = function(key, object, allPath, filter) {
			var prop = (filter && $isFunction(filter)
					? filter(key, object, allPath)
					: object[key] // TODO Consider supporting filter being a string or strings to do RegEx filtering based on key and/or allPath
				);
			if (prop) {
				prop = $isFunction(prop)
					? prop.set && prop.call(object) // It is a getter/setter
					: prop;
			}
			return typeof prop === OBJECT && prop;
		};

		$observable.Object = ObjectObservable;
		$observable.Array = ArrayObservable;
		$.observe = $observable.observe = $observe;
		$.unobserve = $observable.unobserve = $unobserve;
		$observable._apply = observe_apply;

		ObjectObservable.prototype = {
			_data: null,

			observeAll: $observeAll,
			unobserveAll: $unobserveAll,

			data: function() {
				return this._data;
			},

			setProperty: function(path, value, nonStrict) {
				var key, pair, parts,
					self = this,
					object = self._data;

				path = path || "";
				if (object) {
					if ($isArray(path)) {
						// This is the array format generated by serializeArray. However, this has the problem that it coerces types to string,
						// and does not provide simple support of convertTo and convertFrom functions.
						key = path.length;
						while (key--) {
							pair = path[key];
							self.setProperty(pair.name, pair.value, nonStrict === undefined || nonStrict); //If nonStrict not specified, default to true;
						}
					} else if ("" + path !== path) {
						// Object representation where property name is path and property value is value.
						for (key in path) {
							self.setProperty(key, path[key], value);
						}
					} else if (path !== $expando) {
						// Simple single property case.
						parts = path.split(".");
						while (object && parts.length > 1) {
							object = object[parts.shift()];
						}
						object && self._setProperty(object, parts[0], value, nonStrict);
					}
				}
				return self;
			},

			removeProperty: function(path) {
				this.setProperty(path, remove);
				return this;
			},

			_setProperty: function(leaf, path, value, nonStrict) {
				var setter, getter, removeProp,
					property = path ? leaf[path] : leaf;

				if ($isFunction(property)) {
					if (property.set) {
						// Case of property setter/getter - with convention that property is getter and property.set is setter
						getter = property;
						setter = property.set === true ? property : property.set;
						property = property.call(leaf); // get - only treated as getter if also a setter. Otherwise it is simply a property of type function. See unit tests 'Can observe properties of type function'.
					}
				}

				if (property !== value || nonStrict && property != value) { // Optional non-strict equality, since serializeArray, and form-based editors can map numbers to strings, etc.
					// Date objects don't support != comparison. Treat as special case.
					if (!(property instanceof Date) || property > value || property < value) {
						if (setter) {
							setter.call(leaf, value);	//set
							value = getter.call(leaf);	//get updated value
						} else if (removeProp = value === remove) {
							delete leaf[path];
							value = undefined;
						} else if (path) {
							leaf[path] = value;
						}
						this._trigger(leaf, {change: "set", path: path, value: value, oldValue: property, remove: removeProp});
					}
				}
			},

			_trigger: function(target, eventArgs) {
				$(target).triggerHandler(propertyChangeStr, eventArgs);
			}
		};

		ArrayObservable.prototype = {
			_data: null,

			observeAll: $observeAll,
			unobserveAll: $unobserveAll,

			data: function() {
				return this._data;
			},

			insert: function(index, data) {
				var _data = this._data;
				if (arguments.length === 1) {
					data = index;
					index = _data.length;
				}
				index = PARSEINT(index);
				if (index > -1 && index <= _data.length) {
					data = $isArray(data) ? data : [data];
					// data can be a single item (including a null/undefined value) or an array of items.
					// Note the provided items are inserted without being cloned, as direct references to the provided objects

					if (data.length) {
						this._insert(index, data);
					}
				}
				return this;
			},

			_insert: function(index, data) {
				var _data = this._data,
					oldLength = _data.length;
				splice.apply(_data, [index, 0].concat(data));
				this._trigger({change: "insert", index: index, items: data}, oldLength);
			},

			remove: function(index, numToRemove) {
				var items,
					_data = this._data;

				if (index === undefined) {
					index = _data.length - 1;
				}

				index = PARSEINT(index);
				numToRemove = numToRemove ? PARSEINT(numToRemove) : numToRemove === 0 ? 0 : 1; // if null or undefined: remove 1
				if (numToRemove > -1 && index > -1) {
					items = _data.slice(index, index + numToRemove);
					numToRemove = items.length;
					if (numToRemove) {
						this._remove(index, numToRemove, items);
					}
				}
				return this;
			},

			_remove: function(index, numToRemove, items) {
				var _data = this._data,
					oldLength = _data.length;

				_data.splice(index, numToRemove);
				this._trigger({change: "remove", index: index, items: items}, oldLength);
			},

			move: function(oldIndex, newIndex, numToMove) {
				numToMove = numToMove ? PARSEINT(numToMove) : numToMove === 0 ? 0 : 1; // if null or undefined: move 1
				oldIndex = PARSEINT(oldIndex);
				newIndex = PARSEINT(newIndex);

				if (numToMove > 0 && oldIndex > -1 && newIndex > -1 && oldIndex !== newIndex) {
					var items = this._data.slice(oldIndex, oldIndex + numToMove);
					numToMove = items.length;
					if (numToMove) {
						this._move(oldIndex, newIndex, numToMove, items);
					}
				}
				return this;
			},

			_move: function(oldIndex, newIndex, numToMove, items) {
				var _data = this._data,
					oldLength = _data.length;
				_data.splice(oldIndex, numToMove);
				_data.splice.apply(_data, [newIndex, 0].concat(items));
				this._trigger({change: "move", oldIndex: oldIndex, index: newIndex, items: items}, oldLength);
			},

			refresh: function(newItems) {
				var oldItems = this._data.slice();
				this._refresh(oldItems, newItems);
				return this;
			},

			_refresh: function(oldItems, newItems) {
				var _data = this._data,
					oldLength = _data.length;

				splice.apply(_data, [0, _data.length].concat(newItems));
				this._trigger({change: "refresh", oldItems: oldItems}, oldLength);
			},

			_trigger: function(eventArgs, oldLength) {
				var _data = this._data,
					length = _data.length,
					$data = $([_data]);

				$data.triggerHandler(arrayChangeStr, eventArgs);
				if (length !== oldLength) {
					$data.triggerHandler(propertyChangeStr, {change: "set", path: "length", value: length, oldValue: oldLength});
				}
			}
		};

		$eventSpecial[propertyChangeStr] = $eventSpecial[arrayChangeStr] = {
			// Register a jQuery special 'remove' event, to access the data associated with handlers being removed by jQuery.off().
			// We get data.cb._cId from the event handleObj and get the corresponding cbBindings hash from the cbBindingsStore,
			// then remove this object from that bindings hash - if the object does not have any other handlers associated with the same callback.
			remove: function (handleObj) {
				var cbBindings, found, events, l, data,
					evData = handleObj.data;
				if ((evData) && (evData.off = 1, evData = evData.cb)) { //Set off=1 as marker for disposed event
					// Get the cb._cId from handleObj.data.cb._cId
					if (cbBindings = cbBindingsStore[evData._cId]) {
						// There were bindings for this callback. If this was the last one, we'll remove it.
						events = $._data(this).events[handleObj.type];
						l = events.length;
						while (l-- && !found) {
							found = (data = events[l].data) && data.cb === evData; // Found another one with same callback
						}
						if (!found) {
							// This was the last handler for this callback and object, so remove the binding entry
							delete cbBindings[$.data(this, "obId")];
							removeCbBindings(cbBindings, evData._cId);
						}
					}
				}
			}
		};

		function shallowFilter(key, object, allPath) {
			return (allPath.indexOf(".") < 0) && (allPath.indexOf("[") < 0) && object[key];
		}

		$views.map = function(mapDef) {
			function newMap(source, options, target) {
				var changing,
					map = this;
				if (this.src) {
					this.unmap(); // We are re-mapping a new source
				}
				if (typeof source === "object") {
					map.src = source;
					map.tgt = target || map.tgt || [];
					map.options = options || map.options;
					map.update();

					mapDef.obsSrc && $observable(map.src).observeAll(map.obs = function(ev, eventArgs) {
						if (!changing) {
							changing = 1;
							mapDef.obsSrc(map, ev, eventArgs);
							changing = 0;
						}
					}, map.srcFlt);
					mapDef.obsTgt && $observable(map.tgt).observeAll(map.obt = function(ev, eventArgs) {
						if (!changing) {
							changing = 1;
							mapDef.obsTgt(map, ev, eventArgs);
							changing = 0;
						}
					}, map.tgtFlt);
				}
			}

			(newMap.prototype = {
				srcFlt: mapDef.srcFlt || shallowFilter, // default to shallowFilter
				tgtFlt: mapDef.tgtFlt || shallowFilter,
				update: function(options) {
					var map = this;
					$.observable(map.tgt).refresh(mapDef.getTgt(map.src, map.options = options || map.options));
				},
				unmap: function() {
					var map = this;
					if (map.src) {
						map.obs && $.observable(map.src).unobserveAll(map.obs, map.srcFlt);
						map.obt && $.observable(map.tgt).unobserveAll(map.obt, map.tgtFlt);
						map.src = undefined;
					}
				},
				map: newMap,
				_def: mapDef
			}).constructor = newMap;

			if ($isFunction(mapDef)) {
				// Simple map declared as function
				mapDef = {
					getTgt: mapDef
				};
			}

			if (mapDef.baseMap) {
				mapDef = $.extend({}, mapDef.baseMap, mapDef);
			}

			mapDef.map = function(source, options, target) {
				return new newMap(source, options, target);
			};
			return mapDef;
		};

	})(this, this.jQuery);

	/* JsViews:
	 * Interactive data-driven views using templates and data-linking.
	 *    See http://github.com/BorisMoore/jsviews and http://jsviews.com/jsviews
	 * Copyright 2014, Boris Moore
	 * Released under the MIT License.
	 */

	(function(global, $, undefined) {
		// global is the this object, which is window when running in the usual browser environment.
		// $ is the global var jQuery
		"use strict";

		//========================== Top-level vars ==========================

		var versionNumber = "v1.0.0-alpha",
			requiresStr = "JsViews requires ",
			activeBody, $view, rTag, delimOpenChar0, delimOpenChar1, delimCloseChar0, delimCloseChar1, linkChar, noDomLevel0, error,
			$viewsLinkAttr, linkMethods, linkViewsSel, wrapMap, topView, viewStore,

			document = global.document,
			$views = $.views,
			$sub = $views.sub,
			$viewsSettings = $views.settings,
			$extend = $sub.extend,
			$isFunction = $.isFunction,
			$converters = $views.converters,
			$tags = $views.tags,
			$observable = $.observable,
			$observe = $observable.observe,
			jsvAttrStr = "data-jsv",

			// These two settings can be overridden on settings after loading jsRender, and prior to loading jquery.observable.js and/or JsViews
			propertyChangeStr = $sub.propChng = $sub.propChng || "propertyChange",
			arrayChangeStr = $sub.arrChng = $sub.arrChng || "arrayChange",

			elementChangeStr = "change.jsv",
			onBeforeChangeStr = "onBeforeChange",
			onAfterChangeStr = "onAfterChange",
			onAfterCreateStr = "onAfterCreate",
			CHECKED = "checked",
			CHECKBOX = "checkbox",
			RADIO = "radio",
			NONE = "none",
			sTRUE = "true",
			closeScript = '"></script>',
			openScript = '<script type="jsv',
			bindElsSel = "script,[" + jsvAttrStr + "]",
			htmlStr = "html",
			fnSetters = {
				value: "val",
				input: "val",
				html: htmlStr,
				text: "text"
			},
			valueBinding = { from: "value", to: "value"},
			isCleanCall = 0,
			oldCleanData = $.cleanData,
			oldJsvDelimiters = $viewsSettings.delimiters,
			syntaxError = $sub.syntaxErr,
			rFirstElem = /<(?!script)(\w+)(?:[^>]*(on\w+)\s*=)?[^>]*>/,
			rEscapeQuotes = /['"\\]/g, // Escape quotes and \ character
			safeFragment = document.createDocumentFragment(),
			qsa = document.querySelector,

			// elContent maps tagNames which have only element content, so may not support script nodes.
			elContent = {ol: 1, ul: 1, table: 1, tbody: 1, thead: 1, tfoot: 1, tr: 1, colgroup: 1, dl: 1, select: 1, optgroup: 1, svg: 1, svg_ns: 1},
			badParent = {tr: "table"},
			// wrapMap provide appropriate wrappers for inserting innerHTML, used in insertBefore
			// We have to close these tags to support XHTML (#13200)
			// TODO investigate whether more recent jQuery implementation using wrapMap in domManip/$().html() etc. is better optimized now...
			voidElems = {br: 1, img: 1, input: 1, hr: 1, area: 1, base: 1, col: 1, link: 1, meta: 1,
				command: 1, embed: 1, keygen: 1, param: 1, source: 1, track: 1, wbr: 1},
			displayStyles = {},
			bindingStore = {},
			bindingKey = 1,
			rViewPath = /^#(view\.?)?/,
			rConvertMarkers = /(^|(\/>)|<\/(\w+)>|)(\s*)([#\/]\d+[_^])`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|<\/(\w+)>(\s*)|(\/>)\s*|(>))/g,
			rOpenViewMarkers = /(#)()(\d+)(_)/g,
			rOpenMarkers = /(#)()(\d+)([_^])/g,
			rViewMarkers = /(?:(#)|(\/))(\d+)(_)/g,
			rOpenTagMarkers = /(#)()(\d+)(\^)/g,
			rMarkerTokens = /(?:(#)|(\/))(\d+)([_^])([-+@\d]+)?/g,
			getComputedStyle = global.getComputedStyle;

		if (!$) {
			// jQuery is not loaded.
			throw requiresStr + "jQuery"; // We require jQuery
		}

		if (!$.views) {
			// JsRender is not loaded.
			throw requiresStr + "JsRender"; // JsRender must be loaded before JsViews
		}

		if (!$.observable) {
			// JsRender is not loaded.
			throw requiresStr + "jquery.observable"; // jquery.observable.js must be loaded before JsViews
		}

		if ($.link) { return; } // JsViews is already loaded

		//========================== Top-level functions ==========================

		//===============
		// Event handlers
		//===============

		function elemChangeHandler(ev, params, sourceValue) {
			var setter, cancel, fromAttr, linkCtx, cvtBack, cnvtName, target, $source, view, binding, oldLinkCtx, onBeforeChange, onAfterChange, tag, to, eventArgs,
				source = ev.target,
				bindings = source._jsvBnd,
				splitBindings = /&(\d+)\+?/g;

			// _jsvBnd is a string with the syntax: "&bindingId1&bindingId2"
			if (bindings) {
				while (binding = splitBindings.exec(bindings)) {
					if (binding = bindingStore[binding[1]]) {
						if (to = binding.to) {
							// The binding has a 'to' field, which is of the form [[targetObject, toPath], cvtBack]
							linkCtx = binding.linkCtx;
							view = linkCtx.view;
							tag = linkCtx.tag;
							$source = $(source);
							onBeforeChange = view.hlp(onBeforeChangeStr); // TODO Can we optimize this and other instances of same?
							onAfterChange = view.hlp(onAfterChangeStr); // TODO Can we optimize this and other instances of same
							fromAttr = defaultAttr(source);
							setter = fnSetters[fromAttr];
							if (sourceValue === undefined) {
								sourceValue = $isFunction(fromAttr)
									? fromAttr(source)
									: setter
										? $source[setter]()
										: $source.attr(fromAttr);
							}
							cnvtName = to[1];
							to = to[0]; // [object, path]
							if (cnvtName) {
								if ($isFunction(cnvtName)) {
									cvtBack = cnvtName;
								} else {
									cvtBack = view.getRsc("converters", cnvtName);
								}
							}
							if (cvtBack) {
								sourceValue = cvtBack.call(tag, sourceValue);
							}

							// Set linkCtx on view, dynamically, just during this handler call
							oldLinkCtx = view.linkCtx;
							view.linkCtx = linkCtx;
							eventArgs = {
								change: "change",
								oldValue: linkCtx._val,
								value: sourceValue
							};
							if ((!onBeforeChange || !(cancel = onBeforeChange.call(linkCtx, ev, eventArgs) === false)) &&
									(!tag || !tag.onBeforeChange || !(cancel = tag.onBeforeChange(ev, eventArgs) === false)) &&
									sourceValue !== undefined) {
								target = to[0]; // [object, path]
								if (sourceValue !== undefined && target) {
									target = target._jsvOb ? target._ob : target;
									if (tag) {
										tag._.chging = true; // marker to prevent tag change event triggering its own refresh
									}
									$observable(target).setProperty(to[2] || to[1], sourceValue);
									if (onAfterChange) {
										onAfterChange.call(linkCtx, ev, eventArgs);
									}
									if (tag) {
										if (tag.onAfterChange) {
											tag.onAfterChange(ev, eventArgs);
										}
										delete tag._.chging; // clear the marker
									}
									linkCtx._val = sourceValue;
								}
							}
							view.linkCtx = oldLinkCtx;
						}
					}
				}
			}
		}

		function propertyChangeHandler(ev, eventArgs, linkFn) {
			var attr, sourceValue, tag, noUpdate,
				linkCtx = this,
				source = linkCtx.data,
				target = linkCtx.elem,
				cvt = linkCtx.convert,
				parentElem = target.parentNode,
				view = linkCtx.view,
				oldLinkCtx = view.linkCtx,
				onEvent = view.hlp(onBeforeChangeStr);

			// Set linkCtx on view, dynamically, just during this handler call
			view.linkCtx = linkCtx;

			if (parentElem && (!onEvent || !(eventArgs && onEvent.call(linkCtx, ev, eventArgs) === false))
					// If data changed, the ev.data is set to be the path. Use that to filter the handler action...
					&& !(eventArgs && ev.data.prop !== "*" && ev.data.prop !== eventArgs.path)) {

				if (eventArgs) {
					linkCtx.eventArgs = eventArgs;
				}
				if (eventArgs || linkCtx._initVal) {
					delete linkCtx._initVal;
					sourceValue = linkFn.call(view.tmpl, source, view, $views);
					// Compiled link expression for linkTag: return value for data-link="{:xxx}" with no cvt or cvtBk, otherwise tagCtx or tagCtxs

					attr = getTargetVal(sourceValue, linkCtx, tag = linkCtx.tag,
							linkCtx.attr || defaultAttr(target, true, cvt !== undefined)
						);
					if (sourceValue && sourceValue.error !== undefined) {
						// tagCtxs for tag with onError=... and error was thrown. We will update with the fallback value from onError
						sourceValue = sourceValue.error;
					} else if (tag) {
						// Existing tag instance
						sourceValue = sourceValue[0] ? sourceValue : [sourceValue];
						noUpdate = eventArgs && tag.onUpdate && tag.onUpdate(ev, eventArgs, sourceValue) === false;

						mergeCtxs(tag, sourceValue);

						if (noUpdate || attr === NONE) {
							// onUpdate returned false, or attr === "none", or this is an update coming from the tag's own change event
							// - so don't refresh the tag: we just use the new tagCtxs merged from the sourceValue,
							// (which may optionally have been modifed in onUpdate()...) and then bind, and we are done
							if (attr === htmlStr) {
								tag.onBeforeLink && tag.onBeforeLink();
							}
							callAfterLink(tag, tag.tagCtx);
							observeAndBind(linkCtx, source, target);
							view.linkCtx = oldLinkCtx;
							return;
						}
						if (tag._.chging) {
							return;
						}

						sourceValue = tag.tagName === ":" // Call convertVal if it is a {{cvt:...}} - otherwise call renderTag
							? $views._cnvt(tag.cvt, view, sourceValue[0])
							: $views._tag(tag, view, view.tmpl, sourceValue, true);
					} else if (linkFn._tag) {
						// For {{: ...}} without a convert or convertBack, we already have the sourceValue, and we are done
						// For {{: ...}} with either cvt or cvtBack we call convertVal to get the sourceValue and instantiate the tag
						// If cvt is undefined then this is a tag, and we call renderTag to get the rendered content and instantiate the tag
						cvt = cvt === "" ? sTRUE : cvt; // If there is a cvtBack but no cvt, set cvt to "true"
						sourceValue = cvt // Call convertVal if it is a {{cvt:...}} - otherwise call renderTag
							? $views._cnvt(cvt, view, sourceValue) // convertVal
							: $views._tag(linkFn._tag, view, view.tmpl, sourceValue, true); // renderTag

						tag = linkCtx.tag; // In both convertVal and renderTag we have instantiated a tag
						attr = linkCtx.attr || attr; // linkCtx.attr may have been set to tag.attr during tag instantiation in renderTag
					}

					if (updateContent(sourceValue, linkCtx, attr, tag)
							&& eventArgs
							&& (onEvent = view.hlp(onAfterChangeStr))) {
						onEvent.call(linkCtx, ev, eventArgs);
					}

					if (tag) {
						callAfterLink(tag, tag.tagCtx);
					}
				}

				observeAndBind(linkCtx, source, target);

				// Remove dynamically added linkCtx from view
				view.linkCtx = oldLinkCtx;
			}
		}

		function getTargetVal(sourceValue, linkCtx, tag, attr) {
			var currentValue, setter, css, $target,
				target = tag && tag.parentElem || linkCtx.elem;

			if (sourceValue !== undefined) {
				$target = $(target);
				attr = tag && tag.attr || attr;
				if ($isFunction(sourceValue)) {
					error(linkCtx.expr + ": missing parens");
				}

				if (attr === "visible") {
					attr = "css-display";
				}
				if (css = /^css-/.test(attr) && attr.slice(4)) {
					currentValue = $.style(target, css);
					if (+sourceValue === sourceValue) {
						// Optimization for perf on integer values - e.g. css-width{:width+'px'}
						currentValue = parseInt(currentValue);
					}
				} else if (attr !== "link") { // attr === "link" is for tag controls which do data binding but have no rendered output or target
					if (attr === "value") {
						if (target.type === CHECKBOX) {
							currentValue = $target.prop(attr = CHECKED);
						}
					} else if (attr === RADIO) {
						if (target.value === ("" + sourceValue)) {
							currentValue = $target.prop(CHECKED);
						} else {
							return attr;
						}
					}

					if (currentValue === undefined) {
						setter = fnSetters[attr];
						currentValue = setter ? $target[setter]() : $target.attr(attr);
					}
				}
				linkCtx._val = currentValue;
			}
			return attr;
		}

		function updateContent(sourceValue, linkCtx, attr, tag) {
			// When called for a tag, either in tag.refresh() or propertyChangeHandler(), returns a promise (and supports async)
			// When called (in propertyChangeHandler) for target HTML returns true
			// When called (in propertyChangeHandler) for other targets returns boolean for "changed"
			var setter, prevNode, nextNode, promise, nodesToRemove, useProp, tokens, id, openIndex, closeIndex, testElem, nodeName, cStyle,
				renders = sourceValue !== undefined,
				source = linkCtx.data,
				target = tag && tag.parentElem || linkCtx.elem,
				$target = $(target),
				view = linkCtx.view,
				targetVal = linkCtx._val,
				oldCtx = view.ctx,
				oldLinkCtx = view.linkCtx,
				// If not a tag and not targeting HTML, we can use the ._val obtained from getTargetVal()
				// and only update when the new value (sourceValue) has changed from the previous one
				change = tag || attr === htmlStr;
			if (tag) {
				// Initialize the tag with element references
				tag.parentElem = tag.parentElem || (linkCtx.expr || tag._elCnt) ? target : target.parentNode;
				prevNode = tag._prv;
				nextNode = tag._nxt;
			}
			if (!renders) {
				if (attr === htmlStr && tag && tag.onBeforeLink) {
					tag.onBeforeLink();
				}
				return;
			}

			if (/^css-/.test(attr)) {
				if (linkCtx.attr === "visible") {
					// Get the current display style
					cStyle = (target.currentStyle || getComputedStyle.call(global, target, "")).display;

					if (sourceValue) {
						// We are showing the element.
						// Get the cached 'visible' display value from the -jsvd expando
						sourceValue = target._jsvd
							// Or, if not yet cached, get the current display value
							|| cStyle;
						if (sourceValue === NONE && !(sourceValue = displayStyles[nodeName = target.nodeName])) {
							// Currently display value is 'none', and the 'visible' style has not been cached.
							// We create an element to find the correct 'visible' display style for this nodeName
							testElem = document.createElement(nodeName);
							document.body.appendChild(testElem);

							// Get the default style for this HTML tag to use as 'visible' style
							sourceValue
								// and cache it as a hash against nodeName
								= displayStyles[nodeName]
								= (testElem.currentStyle || getComputedStyle.call(global, testElem, "")).display;
							document.body.removeChild(testElem);
						}
					} else {
						// We are hiding the element.
						// Cache the current display value as 'visible' style, on _jsvd expando, for when we show the element again
						target._jsvd = cStyle;
						sourceValue = NONE; // Hide the element
					}
				}
				if (change = change || targetVal !== sourceValue) {
					$.style(target, attr.slice(4), sourceValue);
				}
			} else if (attr !== "link") { // attr === "link" is for tag controls which do data binding but have no rendered output or target
				if (attr === CHECKED) {
					useProp = 1;
					sourceValue = sourceValue && sourceValue !== "false";
						// The string value "false" can occur with data-link="checked{attr:expr}" - as a result of attr, and hence using convertVal()
						// We will set the "checked" property
						// We will compare this with the current value
				} else if (attr === RADIO) {
					// This is a special binding attribute for radio buttons, which corresponds to the default 'to' binding.
					// This allows binding both to value (for each input) and to the default checked radio button (for each input in named group,
					// e.g. binding to parent data).
					// Place value binding first: <input type="radio" data-link="value{:name} {:#get('data').data.currency:} " .../>
					// or (allowing any order for the binding expressions):
					// <input type="radio" value="{{:name}}" data-link="{:#get('data').data.currency:} value^{:name}" .../>

					if (target.value === ("" + sourceValue)) {
						// If the data value corresponds to the value attribute of this radio button input, set the checked property to true
						sourceValue = true;
						useProp = 1;
						attr = CHECKED;
					} else {
						// Otherwise, go straight to observeAndBind, without updating.
						// (The browser will remove the 'checked' attribute, when another radio button in the group is checked).
						observeAndBind(linkCtx, source, target);
						return;
					}
				} else if (attr === "selected" || attr === "disabled" || attr === "multiple" || attr === "readonly") {
					sourceValue = (sourceValue && sourceValue !== "false") ? attr : null;
					// Use attr, not prop, so when the options (for example) are changed dynamically, but include the previously selected value,
					// they will still be selected after the change
				}

				if (setter = fnSetters[attr]) {
					if (attr === htmlStr) {
						// Set linkCtx and ctx on view, dynamically, just during this handler call
						view.linkCtx = linkCtx;
						view.ctx = linkCtx.ctx;
						if (tag && tag._.inline) {
							nodesToRemove = tag.nodes(true);
							if (tag._elCnt) {
								if (prevNode && prevNode !== nextNode) {
									// This prevNode will be removed from the DOM, so transfer the view tokens on prevNode to nextNode of this 'viewToRefresh'
									transferViewTokens(prevNode, nextNode, target, tag._tgId, "^", true);
								} else if (tokens = target._dfr) { // This occurs when there is no nextNode, and so the target._dfr may include tokens referencing
									// view and tag bindings contained within the open an close tokens of the updated tag control. They need to be processed (disposed)
									id = tag._tgId + "^";
									openIndex = tokens.indexOf("#" + id) + 1;
									closeIndex = tokens.indexOf("/" + id);

									if (openIndex && closeIndex > 0) {
										openIndex += id.length;
										if (closeIndex > openIndex) {
											target._dfr = tokens.slice(0, openIndex) + tokens.slice(closeIndex);
											disposeTokens(tokens.slice(openIndex, closeIndex));
										}
									}
								}
								prevNode = prevNode
									? prevNode.previousSibling
									: nextNode
										? nextNode.previousSibling
										: target.lastChild;
							}
							// Remove HTML nodes
							$(nodesToRemove).remove(); // Note if !tag._elCnt removing the nodesToRemove will process and dispose view and tag bindings contained within the updated tag control

							if (tag && tag.onBeforeLink) {
								tag.onBeforeLink();
							}
							// Insert and link new content
							promise = view.link(view.data, target, prevNode, nextNode, sourceValue, tag && {tag: tag._tgId, lazyLink: tag.tagCtx.props.lazyLink});
						} else {
							// data-linked value targeting innerHTML: data-link="html{:expr}"
							if (renders) {
								$target.empty();
							}
							if (tag && tag.onBeforeLink) {
								tag.onBeforeLink();
							}
							if (renders) {
								promise = view.link(source, target, prevNode, nextNode, sourceValue, tag && {tag: tag._tgId});
							}
						}
						// Remove dynamically added linkCtx and ctx from view
						view.linkCtx = oldLinkCtx;
						view.ctx = oldCtx;
					} else if (change = change || targetVal !== sourceValue) {
						if (attr === "text" && target.children && !target.children[0]) {
							// This code is faster then $target.text()
							if (target.textContent !== undefined) {
								target.textContent = sourceValue;
							} else {
								target.innerText = sourceValue === null ? "" : sourceValue;
							}
						} else {
							$target[setter](sourceValue);
						}
	// Removing this for now, to avoid side-effects when you programmatically set the value, and want the focus to stay on the text box
	//							if (target.nodeName.toLowerCase() === "input") {
	//								$target.blur(); // Issue with IE. This ensures HTML rendering is updated.
	//							}
								// Data link the new contents of the target node
					}
				} else if (change = change || targetVal !== sourceValue) {
					// Setting an attribute to undefined should remove the attribute
					$target[useProp ? "prop" : "attr"](attr, sourceValue === undefined && !useProp ? null : sourceValue);
				}
				linkCtx._val = sourceValue;
			}
			return promise || change;
		}

		function arrayChangeHandler(ev, eventArgs) {
			var self = this,
				onBeforeChange = self.hlp(onBeforeChangeStr),
				onAfterChange = self.hlp(onAfterChangeStr);

			if (!onBeforeChange || onBeforeChange.call(this, ev, eventArgs) !== false) {
				if (eventArgs) {
					// This is an observable action (not a trigger/handler call from pushValues, or similar, for which eventArgs will be null)
					var action = eventArgs.change,
						index = eventArgs.index,
						items = eventArgs.items;

					switch (action) {
						case "insert":
							self.addViews(index, items);
							break;
						case "remove":
							self.removeViews(index, items.length);
							break;
						case "move":
							self.refresh(); // Could optimize this
							break;
						case "refresh":
							self.refresh();
							break;
							// Othercases: (e.g.undefined, for setProperty on observable object) etc. do nothing
					}
				}
				if (onAfterChange) {
					onAfterChange.call(this, ev, eventArgs);
				}
			}
		}

		//=============================
		// Utilities for event handlers
		//=============================

		function setArrayChangeLink(view) {
			// Add/remove arrayChange handler on view
			var handler, arrayBinding,
				data = view.data, // undefined if view is being removed
				bound = view._.bnd; // true for top-level link() or data-link="{for}", or the for tag instance for {^{for}} (or for any custom tag that has an onArrayChange handler)

			if (!view._.useKey && bound) {
				// This is an array view. (view._.useKey not defined => data is array), and is data-bound to collection change events

				if (arrayBinding = view._.bndArr) {
					// First remove the current handler if there is one
					$([arrayBinding[1]]).off(arrayChangeStr, arrayBinding[0]);
					view._.bndArr = undefined;
				}
				if (bound !== !!bound && bound._.inline) {
					// bound is not a boolean, so it is the data-linked tag that 'owns' this array binding - e.g. {^{for...}}
					if (data) {
						bound._.arrVws[view._.id] = view;
					} else {
						delete bound._.arrVws[view._.id]; // if view.data is undefined, view is being removed
					}
				} else if (data) {
					// If this view is not being removed, but the data array has been replaced, then bind to the new data array
					handler = function(ev) {
						if (!(ev.data && ev.data.off)) {
							// Skip if !!ev.data.off: - a handler that has already been removed (maybe was on handler collection at call time - then removed by another handler)
							// If view.data is undefined, do nothing. (Corresponds to case where there is another handler on the same data whose
							// effect was to remove this view, and which happened to precede this event in the trigger sequence. So although this
							// event has been removed now, it is still called since already on the trigger sequence)
							arrayChangeHandler.apply(view, arguments);
						}
					};
					$([data]).on(arrayChangeStr, handler);
					view._.bndArr = [handler, data];
				}
			}
		}

		function defaultAttr(elem, to, linkGetVal) {
			// to: true - default attribute for setting data value on HTML element; false: default attribute for getting value from HTML element
			// Merge in the default attribute bindings for this target element
			var nodeName = elem.nodeName.toLowerCase(),
				attr =
					$viewsSettings.merge[nodeName] // get attr settings for input textarea select or optgroup
					|| elem.contentEditable === sTRUE && {to: htmlStr, from: htmlStr}; // Or if contentEditable set to "true" set attr to "html"
			return attr
				? (to
					? ((nodeName === "input" && elem.type === RADIO) // For radio buttons, bind from value, but bind to 'radio' - special value.
						? RADIO
						: attr.to)
					: attr.from)
				: to
					? linkGetVal ? "text" : htmlStr // Default innerText for data-link="a.b.c" or data-link="{:a.b.c}" (with or without converters)- otherwise innerHTML
					: ""; // Default is not to bind from
		}

		//==============================
		// Rendering and DOM insertion
		//==============================

		function renderAndLink(view, index, tmpl, views, data, context, refresh) {
			var html, linkToNode, prevView, nodesToRemove, bindId,
				parentNode = view.parentElem,
				prevNode = view._prv,
				nextNode = view._nxt,
				elCnt = view._elCnt;

			if (prevNode && prevNode.parentNode !== parentNode) {
				error("Missing parentNode");
				// Abandon, since node has already been removed, or wrapper element has been inserted between prevNode and parentNode
			}

			if (refresh) {
				nodesToRemove = view.nodes();
				if (elCnt && prevNode && prevNode !== nextNode) {
					// This prevNode will be removed from the DOM, so transfer the view tokens on prevNode to nextNode of this 'viewToRefresh'
					transferViewTokens(prevNode, nextNode, parentNode, view._.id, "_", true);
				}
				// Remove child views
				view.removeViews(undefined, undefined, true);
				linkToNode = nextNode;

				if (elCnt) {
					prevNode = prevNode
						? prevNode.previousSibling
						: nextNode
							? nextNode.previousSibling
							: parentNode.lastChild;
				}

				// Remove HTML nodes
				$(nodesToRemove).remove();

				for (bindId in view._.bnds) {
					// The view bindings may have already been removed above in: $(nodesToRemove).remove();
					// If not, remove them here:
					removeViewBinding(bindId);
				}
			} else {
				// addViews. Only called if view is of type "array"
				if (index) {
					// index is a number, so indexed view in view array
					prevView = views[index - 1];
					if (!prevView) {
						return false; // If subview for provided index does not exist, do nothing
					}
					prevNode = prevView._nxt;
				}
				if (elCnt) {
					linkToNode = prevNode;
					prevNode = linkToNode
						? linkToNode.previousSibling         // There is a linkToNode, so insert after previousSibling, or at the beginning
						: parentNode.lastChild;              // If no prevView and no prevNode, index is 0 and there are the container is empty,
						// so prevNode = linkToNode = null. But if prevNode._nxt is null then we set prevNode to parentNode.lastChild
						// (which must be before the prevView) so we insert after that node - and only link the inserted nodes
				} else {
					linkToNode = prevNode.nextSibling;
				}
			}
			html = tmpl.render(data, context, view._.useKey && refresh, view, refresh || index, true);
			// Pass in view._.useKey as test for noIteration (which corresponds to when self._.useKey > 0 and self.data is an array)

			// Link the new HTML nodes to the data
			view.link(data, parentNode, prevNode, linkToNode, html, prevView);
	//}, 0);
		}

		//=====================
		// addBindingMarkers
		//=====================

		function addBindingMarkers(value, view, tmplBindingKey) {
			// Insert binding markers into the rendered template output, which will get converted to appropriate
			// data-jsv attributes (element-only content) or script marker nodes (phrasing or flow content), in convertMarkers,
			// within view.link, prior to inserting into the DOM. Linking will then bind based on these markers in the DOM.
			// Added view markers: #m_...VIEW.../m_
			// Added tag markers: #m^...TAG..../m^
			var id, tag, end;
			if (tmplBindingKey) {
				// This is a binding marker for a data-linked tag {^{...}}
				end = "^`";
				tag = view._.tag // This is {^{>...}} or {^{tag ...}} or {{cvt:...} - so tag was defined in convertVal or renderTag
					|| {         // This is {^{:...}} so tag is not yet defined
						_: {
							inline: true,
							bnd: tmplBindingKey
						},
						tagCtx: {
							view:view
						},
						flow: true
					};
				id = tag._tgId;
				if (!id) {
					bindingStore[id = bindingKey++] = tag; // Store the tag temporarily, ready for databinding.
					// During linking, in addDataBinding, the tag will be attached to the linkCtx,
					// and then in observeAndBind, bindingStore[bindId] will be replaced by binding info.
					tag._tgId = "" + id;
				}
			} else {
				// This is a binding marker for a view
				// Add the view to the store of current linked views
				end = "_`";
				viewStore[id = view._.id] = view;
			}
			// Example: "#23^TheValue/23^"
			return "#" + id + end
				+ (value != undefined ? value : "") // For {^{:name}} this gives the equivalent semantics to compiled
													 // (v=data.name)!=u?v:""; used in {{:name}} or data-link="name"
				+ "/" + id + end;
		}

		//==============================
		// Data-linking and data binding
		//==============================

		//---------------
		// observeAndBind
		//---------------

		function observeAndBind(linkCtx, source, target) { //TODO? linkFnArgs) {;
			var binding, l, linkedElem,
				tag = linkCtx.tag,
				cvtBk = linkCtx.convertBack,
				depends = [],
				bindId = linkCtx._bndId || "" + bindingKey++,
				handler = linkCtx._hdlr;

			delete linkCtx._bndId;

			if (tag) {
				// Use the 'depends' paths set on linkCtx.tag - which may have been set on declaration
				// or in events: init, render, onBeforeLink, onAfterLink etc.
				depends = tag.depends || depends;
				depends = $isFunction(depends) ? tag.depends(tag) : depends;
				linkedElem = tag.linkedElem;
			}
			if (!linkCtx._depends || ("" + linkCtx._depends !== "" + depends)) {
				// Only bind the first time, or if the new depends (toString) has changed from when last bound
				if (linkCtx._depends) {
					// Unobserve previous binding
					$observable._apply(false, [source], linkCtx._depends, handler, true);
				}
				binding = $observable._apply(false, [source], linkCtx.fn.paths, depends, handler, linkCtx._ctxCb);
				// The binding returned by $observe has a bnd array with the source objects of the individual bindings.

				binding.elem = target; // The target of all the individual bindings
				binding.linkCtx = linkCtx;
				binding._tgId = bindId;
				// Add to the _jsvBnd on the target the view id and binding id - for unbinding when the target element is removed
				target._jsvBnd = target._jsvBnd || "";
				target._jsvBnd += "&" + bindId;
				linkCtx._depends = depends;
				// Store the binding key on the view, for disposal when the view is removed
				linkCtx.view._.bnds[bindId] = bindId;
				// Store the binding.
				bindingStore[bindId] = binding; // Note: If this corresponds to a data-linked tag, we are replacing the
				// temporarily stored tag by the stored binding. The tag will now be at binding.linkCtx.tag

				if (linkedElem) {
					binding.to = [[], cvtBk];
				}
				if (linkedElem || cvtBk !== undefined) {
					bindTo(binding, tag && tag.convertBack || cvtBk);
				}
				if (tag) {
					if (tag.onAfterBind) {
						tag.onAfterBind(binding);
					}
					if (!tag.flow && !tag._.inline) {
						target.setAttribute(jsvAttrStr, (target.getAttribute(jsvAttrStr)||"") + "#" + bindId + "^/" + bindId + "^");
						tag._tgId = "" + bindId;
					}
				}
			}
			if (linkedElem && linkedElem[0]) {
				if (tag._.radio) {
					linkedElem = linkedElem.children("input[type=radio]");
				}

				l = linkedElem.length;
				while (l--) {
					linkedElem[l]._jsvBnd = linkedElem[l]._jsvBnd || (target._jsvBnd + "+");
					// Add a "+" for cloned binding - so removing elems with cloned bindings will not remove the 'parent' binding from the bindingStore.
					linkedElem[l]._jsvLnkdEl = tag;
				}
			}
		}

		//-------
		// $.link
		//-------

		function tmplLink(to, from, context, noIteration, parentView, prevNode, nextNode) {
			return $link(this, to, from, context, noIteration, parentView, prevNode, nextNode);
		}

		function $link(tmplOrLinkTag, to, from, context, noIteration, parentView, prevNode, nextNode) {
			// Consider supporting this: $.link(true, data) - (top-level activation) target defaults to body.
			// But with templates, defaulting to body makes less sense, so not support for now...
				//if (to + "" !== to) {
				// nextNode = prevNode;
				// prevNode = parentView;
				// parentView = context;
				// context = from;
				// from = to;
				// to = "body";
				//}

			if (tmplOrLinkTag && to) {
				to = to.jquery ? to : $(to); // to is a jquery object or an element or selector

				if (!activeBody) {
					activeBody = document.body;
					$(activeBody)
						.on(elementChangeStr, elemChangeHandler)
						.on('blur', '[contenteditable]', elemChangeHandler);
				}

				var i, k, html, vwInfos, view, placeholderParent, targetEl, oldCtx,
					onRender = addBindingMarkers,
					replaceMode = context && context.target === "replace",
					l = to.length;

				while (l--) {
					targetEl = to[l];

					if ("" + tmplOrLinkTag === tmplOrLinkTag) {
						// tmplOrLinkTag is a string: treat as data-link expression.

						view = $view(targetEl);
						oldCtx = view.ctx;
						view.ctx = context;
						addDataBinding(tmplOrLinkTag, targetEl, view, from);
						view.ctx = oldCtx;
					} else {
						parentView = parentView || $view(targetEl);

						if (tmplOrLinkTag.markup !== undefined) {
							// This is a call to template.link()
							if (parentView.link === false) {
								context = context || {};
								context.link = onRender = false; // If link=false, don't allow nested context to switch on linking
							}
							// Set link=false, explicitly, to disable linking within a template nested within a linked template
							if (replaceMode) {
								placeholderParent = targetEl.parentNode;
							}

							html = tmplOrLinkTag.render(from, context, noIteration, parentView, undefined, onRender);
							// TODO Consider finding a way to bind data (link) within template without html being different for each view, the HTML can
							// be evaluated once outside the while (l--), and pushed into a document fragment, then cloned and inserted at each target.

							if (placeholderParent) {
								// This is target="replace" mode
								prevNode = targetEl.previousSibling;
								nextNode = targetEl.nextSibling;
								$.cleanData([targetEl], true);
								placeholderParent.removeChild(targetEl);

								targetEl = placeholderParent;
							} else {
								prevNode = nextNode = undefined; // When linking from a template, prevNode and nextNode parameters are ignored
								$(targetEl).empty();
							}
						} else if (tmplOrLinkTag !== true) {
							break;
						}

	// TODO Consider deferred linking API feature on per-template basis - {@{ instead of {^{ which allows the user to see the rendered content
	// before that content is linked, with better perceived perf. Have view.link return a deferred, and pass that to onAfterLink...
	// or something along those lines.
	// setTimeout(function() {

						if (targetEl._dfr && !nextNode) {
							// We are inserting new content and the target element has some deferred binding annotations,and there is no nextNode.
							// Those views may be stale views (that will be recreated in this new linking action) so we will first remove them
							// (if not already removed).
							vwInfos = viewInfos(targetEl._dfr, 1, rOpenViewMarkers);

							for (i = 0, k = vwInfos.length; i < k; i++) {
								view = vwInfos[i];
								if ((view = viewStore[view.id]) && view.data !== undefined) {
									// If this is the _prv (prevNode) for a view, remove the view
									// - unless view.data is undefined, in which case it is already being removed
									view.parent.removeViews(view._.key, undefined, true);
								}
							}
							targetEl._dfr = "";
						}

						// Link the content of the element, since this is a call to template.link(), or to $(el).link(true, ...),
						parentView.link(from, targetEl, prevNode, nextNode, html, undefined, context);
	//}, 0);
					}
				}
			}
			return to; // Allow chaining, to attach event handlers, etc.
		}

		//----------
		// view.link
		//----------

		function viewLink(outerData, parentNode, prevNode, nextNode, html, refresh, context, validateOnly) {
			// Optionally insert HTML into DOM using documentFragments (and wrapping HTML appropriately).
			// Data-link existing contents of parentNode, or the inserted HTML, if provided

			// Depending on the content model for the HTML elements, the standard data-linking markers inserted in the HTML by addBindingMarkers during
			// template rendering will be converted either to script marker nodes or, for element-only content sections, by data-jsv element annotations.

			// Data-linking will then add _prv and _nxt to views, where:
			//     _prv: References the previous node (script element of type "jsv123"), or (for elCnt=true), the first element node in the view
			//     _nxt: References the last node (script element of type "jsv/123"), or (for elCnt=true), the next element node after the view.

			//==== nested functions ====
			function convertMarkers(all, preceding, selfClose, closeTag, spaceBefore, id, spaceAfter, tag1, tag2, closeTag2, spaceAfterClose, selfClose2, endOpenTag) {
				// rConvertMarkers = /(^|(\/>)|<\/(\w+)>|)(\s*)([#\/]\d+[_^])`(\s*)(<\w+(?=[\s\/>]))?|\s*(?:(<\w+(?=[\s\/>]))|<\/(\w+)>(\s*)|(\/>)\s*|(>))/g,
				//                 prec, slfCl, clsTag,  spBefore, id,	     spAfter,tag1,                   tag2,               clTag2,sac  slfCl2, endOpenTag
				// Convert the markers that were included by addBindingMarkers in template output, to appropriate DOM annotations:
				// data-jsv attributes (for element-only content) or script marker nodes (within phrasing or flow content).

	// TODO consider detecting 'quoted' contexts (attribute strings) so that attribute encoding does not need to encode >
	// Currently rAttrEncode = /[><"'&]/g includes '>' encoding in order to avoid erroneous parsing of <span title="&lt;a/>"><span title="&lt;a/>">
				var errorMsg,
					endOfElCnt = "";
				if (endOpenTag) {
					inTag = 0;
					return all;
				}
				tag = tag1 || tag2 || "";
				closeTag = closeTag || closeTag2;
				selfClose = selfClose || selfClose2;
				if (isVoid && !selfClose && (closeTag || tag || id)) {
					isVoid = undefined;
					parentTag = tagStack.shift(); // preceding tag was a void element, with no closing slash, such as <br>.
				}
				closeTag = closeTag || selfClose;
				if (closeTag) {
					inTag = 0,
					isVoid = undefined;
					// TODO: smart insertion of <tbody> - to be completed for robust insertion of deferred bindings etc.
					//if (closeTag === "table" && parentTag === "tbody") {
					//	preceding = "</tbody>" + preceding;
					//	parentTag = "table";
					//	tagStack.shift();
					//}
					if (validate) {
						if (selfClose || selfClose2) {
							if (!voidElems[parentTag] && !/;svg;|;math;/.test(";" + tagStack.join(";")+ ";")) {
								// Only self-closing elements must be legitimate void elements, such as <br/>, per HTML schema,
								// or under svg or math foreign namespace elements.
								errorMsg = "'<" + parentTag + ".../";
							}
						} else if (voidElems[closeTag]) {
							errorMsg = "'</" + closeTag; // closing tag such as </input>
						} else if (!tagStack.length || closeTag !== parentTag) {
							errorMsg = "Mismatch: '</" + closeTag;
						}
						if (errorMsg) {
							syntaxError(errorMsg + ">' in:\n" + html);
						}
					}
					prevElCnt = elCnt;
					parentTag = tagStack.shift();
					elCnt = elContent[parentTag];
					closeTag2 = closeTag2 ? ("</" + closeTag2 + ">") : "";
					if (prevElCnt) {
						// If there are ids (markers since the last tag), move them to the defer string
						defer += ids;
						ids = "";
						if (!elCnt) {
							endOfElCnt = closeTag2 + openScript + "@" + defer + closeScript + (spaceAfterClose || "");
							defer = deferStack.shift();
						} else {
							defer += "-"; // Will be used for stepping back through deferred tokens
						}
					}
				}
				if (elCnt) {
					// elContent maps tagNames which have only element content, so may not support script nodes.
					// We are in element-only content, can remove white space, and use data-jsv attributes on elements as markers
					// Example: <tr data-jsv="/2_#6_"> - close marker for view 2 and open marker for view 6

					if (id) {
						// append marker for this id, to ids string
						ids += id;
					} else {
						preceding = (closeTag2 || selfClose2 || "");
					}
					if (tag) {
						// TODO: smart insertion of <tbody> - to be completed for robust insertion of deferred bindings etc.
						//if (tag === "<tr" && parentTag === "table") {
						//	tagStack.unshift(parentTag);
						//	parentTag = "tbody";
						//	preceding += "<" + parentTag + ">";
						//	if (defer) {
						//		defer += "+"; // Will be used for stepping back through deferred tokens
						//	}
						//	// TODO: move this to design-time validation check
						//	//	error('"' + parentTag + '" has incorrect parent tag');
						//}
						preceding += tag;
						if (ids) {
							preceding += ' ' + jsvAttrStr + '="' + ids + '"';
							ids = "";
						}
					}
				} else {
					// We are in phrasing or flow content, so use script marker nodes
					// Example: <script type="jsv3/"></script> - data-linked tag, close marker
					// TODO add validation to track whether we are in attribute context (not yet hit preceding ending with a >) or element content of current 'parentTag'
					// and according disallow inserting script markers in attribute context. Similar for elCnt too, so no "<table {{if ...}}...{{/if}}... >" or "<table {{if ...}}...> ...{{/if}}..."
					preceding = id
						? (preceding + endOfElCnt + spaceBefore + openScript + id + closeScript + spaceAfter + tag)
						: endOfElCnt || all;
				}

				if (inTag && id) {
					// JsViews data-linking tags are not allowed within element markup. See https://github.com/BorisMoore/jsviews/issues/213
					syntaxError(' No {^{ tags within elem markup (' + inTag + ' ). Use data-link="..."');
				}
				if (tag) {
					inTag = tag;
					// If there are ids (markers since the last tag), move them to the defer string
					tagStack.unshift(parentTag);
					parentTag = tag.slice(1);
					if (tagStack[0] && tagStack[0] === badParent[parentTag]) {
						// Missing <tbody>
						// TODO: replace this by smart insertion of <tbody> tags
						error('Parent of <tr> must be <tbody>');
					}
					isVoid = voidElems[parentTag];
					if ((elCnt = elContent[parentTag]) && !prevElCnt) {
						deferStack.unshift(defer);
						defer = "";
					}
					prevElCnt = elCnt;
	//TODO Consider providing validation which throws if you place <span> as child of <tr>, etc. - since if not caught,
	//this can cause errors subsequently which are difficult to debug.
	//				if (elContent[tagStack[0]]>2 && !elCnt) {
	//					error(parentTag + " in " + tagStack[0]);
	//				}
					if (defer && elCnt) {
						defer += "+"; // Will be used for stepping back through deferred tokens
					}
				}
				return preceding;
			}

			function processViewInfos(vwInfos, targetParent) {
				// If targetParent, we are processing viewInfos (which may include navigation through '+-' paths) and hooking up to the right parentElem etc.
				// (and elem may also be defined - the next node)
				// If no targetParent, then we are processing viewInfos on newly inserted content
				var deferPath, deferChar, bindChar, parentElem, id, onAftCr, deep,
					addedBindEls = [];

				// In elCnt context (element-only content model), prevNode is the first node after the open, nextNode is the first node after the close.
				// If both are null/undefined, then open and close are at end of parent content, so the view is empty, and its placeholder is the
				// 'lastChild' of the parentNode. If there is a prevNode, then it is either the first node in the view, or the view is empty and
				// its placeholder is the 'previousSibling' of the prevNode, which is also the nextNode.
				if (vwInfos) {
					if (vwInfos._tkns.charAt(0) === "@") {
						// We are processing newly inserted content. This is a special script element that was created in convertMarkers() to process deferred bindings,
						// and inserted following the target parent element - because no element tags (outside elCnt) were encountered to carry those binding tokens.
						// We will step back from the preceding sibling of this element, looking at targetParent elements until we find the one that the current binding
						// token belongs to. Set elem to null (the special script element), and remove it from the DOM.
						targetParent = elem.previousSibling;
						elem.parentNode.removeChild(elem);
						elem = undefined;
					}
					len = vwInfos.length;
					while (len--) {
						vwInfo = vwInfos[len];
						//if (prevIds.indexOf(vwInfo.token) < 0) { // This token is a newly created view or tag binding
							bindChar = vwInfo.ch;
							if (deferPath = vwInfo.path) {
								// We have a 'deferred path'
								j = deferPath.length - 1;
								while (deferChar = deferPath.charAt(j--)) {
									// Use the "+" and"-" characters to navigate the path back to the original parent node where the deferred bindings ocurred
									if (deferChar === "+") {
										if (deferPath.charAt(j) === "-") {
											j--;
											targetParent = targetParent.previousSibling;
										} else {
											targetParent = targetParent.parentNode;
										}
									} else {
										targetParent = targetParent.lastChild;
									}
									// Note: Can use previousSibling and lastChild, not previousElementSibling and lastElementChild,
									// since we have removed white space within elCnt. Hence support IE < 9
								}
							}
							if (bindChar === "^") {
								if (tag = bindingStore[id = vwInfo.id]) {
									// The binding may have been deleted, for example in a different handler to an array collectionChange event
									// This is a tag binding
									deep = targetParent && (!elem || elem.parentNode !== targetParent); // We are stepping back looking for the right targetParent,
									// or we are linking existing content and this element is in elCnt, not an immediate child of the targetParent.
									if (!elem || deep) {
										tag.parentElem = targetParent;
									}
									if (vwInfo.elCnt && deep) {
										// With element only content, if there is no following element, or if the binding is deeper than the following element
										// then we need to set the open or close token as a deferred binding annotation on the parent
										targetParent._dfr = (vwInfo.open ? "#" : "/") + id + bindChar + (targetParent._dfr || "");
									}
									// This is an open or close marker for a data-linked tag {^{...}}. Add it to bindEls.
									addedBindEls.push([deep ? null : elem, vwInfo]);
								}
							} else if (view = viewStore[id = vwInfo.id]) {
								// The view may have been deleted, for example in a different handler to an array collectionChange event
								if (!view.parentElem) {
									// If view is not already extended for JsViews, extend and initialize the view object created in JsRender, as a JsViews view
									view.parentElem = targetParent || elem && elem.parentNode || parentNode;
									view._.onRender = addBindingMarkers;
									view._.onArrayChange = arrayChangeHandler;
									setArrayChangeLink(view);
								}
								parentElem = view.parentElem;
								if (vwInfo.open) {
									// This is an 'open view' node (preceding script marker node,
									// or if elCnt, the first element in the view, with a data-jsv annotation) for binding
									view._elCnt = vwInfo.elCnt;
									if (targetParent) {
										targetParent._dfr = "#" + id + bindChar + (targetParent._dfr || "");
									} else {
										// No targetParent, so there is a ._nxt elem (and this is processing tokens on the elem)
										if (!view._prv) {
											parentElem._dfr = removeSubStr(parentElem._dfr, "#" + id + bindChar);
										}
										view._prv = elem;
									}
								} else {
									// This is a 'close view' marker node for binding
									if (targetParent && (!elem || elem.parentNode !== targetParent)) {
										// There is no ._nxt so add token to _dfr. It is deferred.
										targetParent._dfr = "/" + id + bindChar + (targetParent._dfr || "");
										view._nxt = undefined;
									} else if (elem) {
										// This view did not have a ._nxt, but has one now, so token may be in _dfr, and must be removed. (No longer deferred)
										if (!view._nxt) {
											parentElem._dfr = removeSubStr(parentElem._dfr, "/" + id + bindChar);
										}
										view._nxt = elem;
									}
									linkCtx = view.linkCtx;
									if (onAftCr = view.ctx && view.ctx.onAfterCreate || onAfterCreate) {
										onAftCr.call(linkCtx, view);
									}
								}
							//}
						}
					}
					len = addedBindEls.length;
					while (len--) {
						// These were added in reverse order to addedBindEls. We push them in BindEls in the correct order.
						bindEls.push(addedBindEls[len]);
					}
				}
				return !vwInfos || vwInfos.elCnt;
			}

			function getViewInfos(vwInfos) {
				// Used by view.childTags() and tag.childTags()
				// Similar to processViewInfos in how it steps through bindings to find tags. Only finds data-linked tags.
				var level, parentTag;

				if (vwInfos) {
					len = vwInfos.length;
					for (j = 0; j < len; j++) {
						vwInfo = vwInfos[j];
						if (get.id) {
							get.id = get.id !== vwInfo.id && get.id;
						} else {
							// This is an open marker for a data-linked tag {^{...}}, within the content of the tag whose id is get.id. Add it to bindEls.
							parentTag = tag = bindingStore[vwInfo.id].linkCtx.tag;
							if (!tag.flow) {
								if (!deep) {
									level = 1;
									while (parentTag = parentTag.parent) {
										level++;
									}
									tagDepth = tagDepth || level; // The level of the first tag encountered.
								}
								if ((deep || level === tagDepth) && (!tagName || tag.tagName === tagName)) {
									// Filter on top-level or tagName as appropriate
									tags.push(tag);
								}
							}
						}
					}
				}
			}

			function dataLink() {
				//================ Data-link and fixup of data-jsv annotations ================
				elems = qsa ? parentNode.querySelectorAll(linkViewsSel) : $(linkViewsSel, parentNode).get();
				l = elems.length;

				// The prevNode will be in the returned query, since we called markPrevOrNextNode() on it.
				// But it may have contained nodes that satisfy the selector also.
				if (prevNode && prevNode.innerHTML) {
					// Find the last contained node of prevNode, to use as the prevNode - so we only link subsequent elems in the query
					prevNodes = qsa ? prevNode.querySelectorAll(linkViewsSel) : $(linkViewsSel, prevNode).get();
					prevNode = prevNodes.length ? prevNodes[prevNodes.length - 1] : prevNode;
				}

				tagDepth = 0;
				for (i = 0; i < l; i++) {
					elem = elems[i];
					if (prevNode && !found) {
						// If prevNode is set, not false, skip linking. If this element is the prevNode, set to false so subsequent elements will link.
						found = (elem === prevNode);
					} else if (nextNode && elem === nextNode) {
						// If nextNode is set then break when we get to nextNode
						break;
					} else if (elem.parentNode
						// elem has not been removed from DOM
							&& processInfos(viewInfos(elem, undefined, tags && rOpenTagMarkers))
							// If a link() call, processViewInfos() adds bindings to bindEls, and returns true for non-script nodes, for adding data-link bindings
							// If a childTags() call, getViewInfos returns array of tag bindings.
								&& !get && elem.getAttribute($viewsLinkAttr)) {
									bindEls.push([elem]); // A data-linked element so add to bindEls too
								}
				}
				if (self === topView && html === undefined && parentNode.getAttribute($viewsLinkAttr)) {
					bindEls.push([parentNode]); // Support data-linking top-level element directly (not within a data-linked container)
				}

				// Remove temporary marker script nodes they were added by markPrevOrNextNode
				unmarkPrevOrNextNode(prevNode, elCnt);
				unmarkPrevOrNextNode(nextNode, elCnt);

				if (get) {
					lazyLink && lazyLink.resolve();
					return;
				}

				if (elCnt && defer + ids) {
					// There are some views with elCnt, for which the open or close did not precede any HTML tag - so they have not been processed yet
					elem = nextNode;
					if (defer) {
						if (nextNode) {
							processViewInfos(viewInfos(defer + "+", 1), nextNode);
						} else {
							processViewInfos(viewInfos(defer, 1), parentNode);
						}
					}
					processViewInfos(viewInfos(ids, 1), parentNode);
					// If there were any tokens on nextNode which have now been associated with inserted HTML tags, remove them from nextNode
					if (nextNode) {
						tokens = nextNode.getAttribute(jsvAttrStr);
						if (l = tokens.indexOf(prevIds) + 1) {
							tokens = tokens.slice(l + prevIds.length - 1);
						}
						nextNode.setAttribute(jsvAttrStr, ids + tokens);
					}
				}

				//================ Bind the data-linked elements and tags ================
				l = bindEls.length;
				for (i = 0; i < l; i++) {
					elem = bindEls[i];
					linkInfo = elem[1];
					elem = elem[0];
					if (linkInfo) {
						if (tag = bindingStore[linkInfo.id]) {
							if (linkCtx = tag.linkCtx) {
								// The tag may have been stored temporarily on the bindingStore - or may have already been replaced by the actual binding
								tag = linkCtx.tag;
								tag.linkCtx = linkCtx;
							}
							if (linkInfo.open) {
								// This is an 'open linked tag' binding annotation for a data-linked tag {^{...}}
								if (elem) {
									tag.parentElem = elem.parentNode;
									tag._prv = elem;
								}
								tag._elCnt = linkInfo.elCnt;
								if (tag && (!tag.onBeforeLink || tag.onBeforeLink() !== false) && !tag._.bound) {
									// By default we data-link depth-last ("on the way in"), which is better for perf. But if a tag needs nested tags to be linked (refreshed)
									// first, before linking its content, then make onBeforeLink() return false. In that case we data-link depth-first ("on the way out"), so nested tags will have already refreshed.
									tag._.bound = true;
									view = tag.tagCtx.view;
									addDataBinding(undefined, tag._prv, view, outerData, linkInfo.id);
								}

								tag._.linking = true;
							} else {
								tag._nxt = elem;
								if (tag._.linking) {
									// This is a 'close linked tag' binding annotation
									// Add data binding
									tagCtx = tag.tagCtx;
									view = tagCtx.view;
									delete tag._.linking;
									if (!tag._.bound) {
										tag._.bound = true;
										addDataBinding(undefined, tag._prv, view, outerData, linkInfo.id);
									}
									callAfterLink(tag, tagCtx);
								}
							}
						}
					} else {
						view = $view(elem);
						// Add data binding for a data-linked element (with data-link attribute)
						addDataBinding(elem.getAttribute($viewsLinkAttr), elem, view, outerData, undefined, context);
					}
				}
				lazyLink && lazyLink.resolve();
			}
			//==== /end of nested functions ====

			var inTag, linkCtx, tag, i, l, j, len, elems, elem, view, vwInfo, linkInfo, prevNodes, token, prevView, nextView, node, tags, deep, tagName, tagCtx, validate,
				tagDepth, get, depth, fragment, copiedNode, firstTag, parentTag, isVoid, wrapper, div, tokens, elCnt, prevElCnt, htmlTag, ids, prevIds, found, lazyLink,
				self = this,
				thisId = self._.id + "_",
				defer = "",
				// The marker ids for which no tag was encountered (empty views or final closing markers) which we carry over to container tag
				bindEls = [],
				tagStack = [],
				deferStack = [],
				onAfterCreate = self.hlp(onAfterCreateStr),
				processInfos = processViewInfos;

			if (refresh) {
				lazyLink = refresh.lazyLink && $.Deferred();
				if (refresh.tmpl) {
					// refresh is the prevView, passed in from addViews()
					prevView = "/" + refresh._.id + "_";
				} else {
					get = refresh.get;
					if (refresh.tag) {
						thisId = refresh.tag + "^";
						refresh = true;
					}
				}
				refresh = refresh === true;
			}

			if (get) {
				processInfos = getViewInfos;
				tags = get.tags;
				deep = get.deep;
				tagName = get.name;
			}

			parentNode = parentNode
				? ("" + parentNode === parentNode
					? $(parentNode)[0]  // It is a string, so treat as selector
					: parentNode.jquery
						? parentNode[0] // A jQuery object - take first element.
						: parentNode)
				: (self.parentElem      // view.link()
					|| document.body);  // link(null, data) to link the whole document

			validate = !$viewsSettings.noValidate && parentNode.contentEditable !== sTRUE;
			parentTag = parentNode.tagName.toLowerCase();
			elCnt = !!elContent[parentTag];

			prevNode = prevNode && markPrevOrNextNode(prevNode, elCnt);
			nextNode = nextNode && markPrevOrNextNode(nextNode, elCnt) || null;

			if (html != undefined) {
				//================ Insert html into DOM using documentFragments (and wrapping HTML appropriately). ================
				// Also convert markers to DOM annotations, based on content model.
				// Corresponds to nextNode ? $(nextNode).before(html) : $(parentNode).html(html);
				// but allows insertion to wrap correctly even with inserted script nodes. jQuery version will fail e.g. under tbody or select.
				// This version should also be slightly faster
				div = document.createElement("div");
				wrapper = div;
				prevIds = ids = "";
				htmlTag = parentNode.namespaceURI === "http://www.w3.org/2000/svg" ? "svg_ns" : (firstTag = rFirstElem.exec(html)) && firstTag[1] || "";
				if (noDomLevel0 && firstTag && firstTag[2]) {
					error("Unsupported: " + firstTag[2]); // For security reasons, don't allow insertion of elements with onFoo attributes.
				}
				if (elCnt) {
					// Now look for following view, and find its tokens, or if not found, get the parentNode._dfr tokens
					node = nextNode;
					while (node && !(nextView = viewInfos(node))) {
						node = node.nextSibling;
					}
					if (tokens = nextView ? nextView._tkns : parentNode._dfr) {
						token = prevView || "";
						if (refresh || !prevView) {
							token += "#" + thisId;
						}
						j = tokens.indexOf(token);
						if (j + 1) {
							j += token.length;
							// Transfer the initial tokens to inserted nodes, by setting them as the ids variable, picked up in convertMarkers
							prevIds = ids = tokens.slice(0, j);
							tokens = tokens.slice(j);
							if (nextView) {
								node.setAttribute(jsvAttrStr, tokens);
							} else {
								parentNode._dfr = tokens;
							}
						}
					}
				}

				//================ Convert the markers to DOM annotations, based on content model. ================
	//			oldElCnt = elCnt;
				isVoid = undefined;
				html = ("" + html).replace(rConvertMarkers, convertMarkers);
	//			if (!!oldElCnt !== !!elCnt) {
	//				error("Parse: " + html); // Parse error. Content not well-formed?
	//			}
				if (validate && tagStack.length) {
					syntaxError("Mismatched '<" + parentTag + "...>' in:\n" + html); // Unmatched tag
				}
				if (validateOnly) {
					return;
				}
				// Append wrapper element to doc fragment
				safeFragment.appendChild(div);

				// Go to html and back, then peel off extra wrappers
				// Corresponds to jQuery $(nextNode).before(html) or $(parentNode).html(html);
				// but supports svg elements, and other features missing from jQuery version (and this version should also be slightly faster)
				htmlTag = wrapMap[htmlTag] || wrapMap.div;
				depth = htmlTag[0];
				wrapper.innerHTML = htmlTag[1] + html + htmlTag[2];
				while (depth--) {
					wrapper = wrapper.lastChild;
				}
				safeFragment.removeChild(div);
				fragment = document.createDocumentFragment();
				while (copiedNode = wrapper.firstChild) {
					fragment.appendChild(copiedNode);
				}
				// Insert into the DOM
				parentNode.insertBefore(fragment, nextNode);
			}

			if (lazyLink) {
				setTimeout(dataLink, 0);
			} else {
				dataLink();
			}

			return lazyLink && lazyLink.promise();
		}

		function addDataBinding(linkMarkup, node, currentView, data, boundTagId, context) {
			// Add data binding for data-linked elements or {^{...}} data-linked tags
			var tmpl, tokens, attr, convertBack, params, trimLen, tagExpr, linkFn, linkCtx, tag, rTagIndex;

			data = currentView.data === undefined ? data || {} : currentView.data;
			if (boundTagId) {
				// {^{...}} data-linked tag. So only one linkTag in linkMarkup
				tag = bindingStore[boundTagId];
				tag = tag.linkCtx ? tag.linkCtx.tag : tag;

				linkCtx = tag.linkCtx || {
					data: data,             // source
					elem: tag._elCnt ? tag.parentElem : node,             // target
					view: currentView,
					ctx: currentView.ctx,
					attr: htmlStr, // Script marker nodes are associated with {^{ and always target HTML.
					fn: tag._.bnd,
					tag: tag,
					// Pass the boundTagId in the linkCtx, so that it can be picked up in observeAndBind
					_bndId: boundTagId
				};
				bindDataLinkTarget(linkCtx, linkCtx.fn);
			} else if (linkMarkup && node) {
				// Compiled linkFn expressions could be stored in the tmpl.links array of the template
				// TODO - consider also caching globally so that if {{:foo}} or data-link="foo" occurs in different places,
				// the compiled template for this is cached and only compiled once...
				//links = currentView.links || currentView.tmpl.links;

				tmpl = currentView.tmpl;

	//			if (!(linkTags = links[linkMarkup])) {
				// This is the first time this view template has been linked, so we compile the data-link expressions, and store them on the template.

					linkMarkup = normalizeLinkTag(linkMarkup, defaultAttr(node));
					rTag.lastIndex = 0;
					while (tokens = rTag.exec(linkMarkup)) { // TODO require } to be followed by whitespace or $, and remove the \}(!\}) option.
						// Iterate over the data-link expressions, for different target attrs,
						// (only one if there is a boundTagId - the case of data-linked tag {^{...}})
						// e.g. <input data-link="{:firstName:} title{>~description(firstName, lastName)}"
						// tokens: [all, attr, bindOnly, tagExpr, tagName, converter, colon, html, comment, code, params]
						rTagIndex = rTag.lastIndex;
						attr = boundTagId ? htmlStr : tokens[1]; // Script marker nodes are associated with {^{ and always target HTML.
						tagExpr = tokens[3];
						params = tokens[10];
						convertBack = undefined;

						linkCtx = {
							data: data, // source
							elem: node, // target
							view: currentView,
							ctx: context || currentView.ctx,
							attr: attr,
							_initVal: !tokens[2]
						};

						if (tokens[6]) {
							// TODO include this in the original rTag regex
							// Only for {:} link"

							if (!attr && (convertBack = /:([\w$]*)$/.exec(params))) {
								// two-way binding
								convertBack = convertBack[1];
								if (convertBack !== undefined) {
									// There is a convertBack function
									trimLen = - convertBack.length -1;
									tagExpr = tagExpr.slice(0, trimLen - 1) + delimCloseChar0; // Remove the convertBack string from expression.
								}
							}
							if (convertBack === null) {
								convertBack = undefined;
							}
							linkCtx.convert = tokens[5] || "";
						}
						// Compile the linkFn expression which evaluates and binds a data-link expression
						// TODO - optimize for the case of simple data path with no conversion, helpers, etc.:
						//     i.e. data-link="a.b.c". Avoid creating new instances of Function every time. Can use a default function for all of these...

						linkCtx.expr = attr + tagExpr;
						linkFn = tmpl.links[tagExpr];
						if (!linkFn) {
							tmpl.links[tagExpr] = linkFn = $sub.tmplFn(tagExpr, tmpl, true, convertBack);
						}
						linkCtx.fn = linkFn;
						if (!attr && convertBack !== undefined) {
							// Default target, so allow 2 way binding
							linkCtx.convertBack = convertBack;
						}
						bindDataLinkTarget(linkCtx, linkFn);
						// We store rTagIndex in local scope, since this addDataBinding method can sometimes be called recursively,
						// and each is using the same rTag instance.
						rTag.lastIndex = rTagIndex;
					}
		//		}
			}
		}

		function bindDataLinkTarget(linkCtx, linkFn) {
			// Add data link bindings for a link expression in data-link attribute markup
			function handler(ev, eventArgs) {
				propertyChangeHandler.call(linkCtx, ev, eventArgs, linkFn);
				// If the link expression uses a custom tag, the propertyChangeHandler call will call renderTag, which will set tagCtx on linkCtx
			}
			handler.noArray = true;
			linkCtx._ctxCb = getContextCb(linkCtx.view); // _ctxCb is for filtering/appending to dependency paths: function(path, object) { return [(object|path)*]}
			linkCtx._hdlr = handler;
			handler(true);
		}

		//=====================
		// Data-linking helpers
		//=====================

		function removeSubStr(str, substr) {
			var k;
			return str
				? (k = str.indexOf(substr),
					(k + 1
						? str.slice(0, k) + str.slice(k + substr.length)
						: str))
				: "";
		}

		function markerNodeInfo(node) {
			return node &&
				("" + node === node
					? node
					: node.tagName === "SCRIPT"
						? node.type.slice(3)
						: node.nodeType === 1 && node.getAttribute(jsvAttrStr) || "");
		}

		function viewInfos(node, isVal, rBinding) {
			// Test whether node is a script marker node, and if so, return metadata
			function getInfos(all, open, close, id, ch, elPath) {
				infos.push({
					elCnt: elCnt,
					id: id,
					ch: ch,
					open: open,
					close: close,
					path: elPath,
					token: all
				});
			}
			var elCnt, tokens,
				infos = [];
			if (tokens = isVal ? node : markerNodeInfo(node)) {
				infos.elCnt = !node.type;
				elCnt = tokens.charAt(0) === "@" || !node.type;
				infos._tkns = tokens;
				// rMarkerTokens = /(?:(#)|(\/))(\d+)([_^])([-+@\d]+)?/g;
				tokens.replace(rBinding || rMarkerTokens, getInfos);
				return infos;
			}
		}

		function unmarkPrevOrNextNode(node, elCnt) {
			if (node) {
				if (node.type === "jsv") {
					node.parentNode.removeChild(node);
				} else if (elCnt && node.getAttribute($viewsLinkAttr) === "") {
					node.removeAttribute($viewsLinkAttr);
				}
			}
		}

		function markPrevOrNextNode(node, elCnt) {
			var marker = node;
			while (elCnt && marker && marker.nodeType !== 1) {
				marker = marker.previousSibling;
			}
			if (marker) {
				if (marker.nodeType !== 1) {
					// For text nodes, we will add a script node before
					marker = document.createElement("SCRIPT");
					marker.type = "jsv";
					node.parentNode.insertBefore(marker, node);
				} else if (!markerNodeInfo(marker) && !marker.getAttribute($viewsLinkAttr)) {
					// For element nodes, we will add a data-link attribute (unless there is already one)
					// so that this node gets included in the node linking process.
					marker.setAttribute($viewsLinkAttr, "");
				}
			}
			return marker;
		}

		function normalizeLinkTag(linkMarkup, twoway) {
			linkMarkup = $.trim(linkMarkup).replace(rEscapeQuotes, "\\$&");
			return linkMarkup.slice(-1) !== delimCloseChar0
			// If simplified syntax is used: data-link="expression", convert to data-link="{:expression}",
			// or for inputs, data-link="{:expression:}" for (default) two-way binding
				? linkMarkup = delimOpenChar1 + ":" + linkMarkup + (twoway ? ":" : "") + delimCloseChar0
				: linkMarkup;
		}

		//===========================
		// Methods for views and tags
		//===========================

		linkMethods = {
			contents: function(deep, select) {
				// For a view or a tag, return jQuery object with the content nodes,
				if (deep !== !!deep) {
						// deep not boolean, so this is getContents(selector)
						select = deep;
						deep = undefined;
					}
				var filtered,
					nodes = $(this.nodes());
				if (nodes[0]) {
					filtered = select ? nodes.filter(select) : nodes;
					nodes = deep && select ? filtered.add(nodes.find(select)) : filtered;
				}
				return nodes;
			},

			nodes: function(withMarkers, prevNode, nextNode) {
				// For a view or a tag, return top-level nodes
				// Do not return any script marker nodes, unless withMarkers is true
				// Optionally limit range, by passing in prevNode or nextNode parameters

				var node,
					self = this,
					elCnt = self._elCnt,
					prevIsFirstNode = !prevNode && elCnt,
					nodes = [];

				prevNode = prevNode || self._prv;
				nextNode = nextNode || self._nxt;

				node = prevIsFirstNode
					? (prevNode === self._nxt
						? self.parentElem.lastSibling
						: prevNode)
					: (self._.inline === false
						? prevNode || self.linkCtx.elem.firstChild
						: prevNode && prevNode.nextSibling);

				while (node && (!nextNode || node !== nextNode)) {
					if (withMarkers || elCnt || node.tagName !== "SCRIPT") {
						// All the top-level nodes in the view
						// (except script marker nodes, unless withMarkers = true)
						// (Note: If a script marker node, viewInfo.elCnt undefined)
						nodes.push(node);
					}
					node = node.nextSibling;
				}
				return nodes;
			},

			childTags: function(deep, tagName) {
				// For a view or a tag, return child tags - at any depth, or as immediate children only.
				if (deep !== !!deep) {
					// deep not boolean, so this is childTags(tagName) - which looks for top-level tags of given tagName
					tagName = deep;
					deep = undefined;
				}

				var self = this,
					view = self.link ? self : self.tagCtx.view, // this may be a view or a tag. If a tag, get the view from tag.view.tagCtx
					prevNode = self._prv,
					elCnt = self._elCnt,
					tags = [];

				if (prevNode) {
					view.link(
						undefined,
						self.parentElem,
						elCnt ? prevNode.previousSibling : prevNode,
						self._nxt,
						undefined,
						{get:{tags:tags, deep: deep, name: tagName, id: elCnt && self._tgId}}
					);
				}
				return tags;
			},

			refresh: function(sourceValue) {
				var promise, attr,
					tag = this,
					linkCtx = tag.linkCtx,
					view = tag.tagCtx.view;

				if (tag.disposed) { error("Removed tag"); }
				if (sourceValue === undefined) {
					sourceValue = $views._tag(tag, view, view.tmpl, mergeCtxs(tag), true); // Get rendered HTML for tag, based on refreshed tagCtxs
				}
				if (sourceValue + "" === sourceValue) {
					// If no rendered content, sourceValue will not be a string (can be 0 or undefined)
					attr = tag._.inline ? htmlStr : (linkCtx.attr || defaultAttr(tag.parentElem, true));
					promise = updateContent(sourceValue, linkCtx, attr, tag);
				}

				callAfterLink(tag, tag.tagCtx);
				return promise || tag;
			},

			update: function(value) {
				var linkedElem = this.linkedElem;
				if (linkedElem) {
					elemChangeHandler({
						target: linkedElem[0]
					}, undefined, value);
				}
			}
		};

		function callAfterLink(tag, tagCtx) {
			var $linkedElem, linkedElem, radioButtons, val, bindings, i, l, linkedTag, oldTrig, newTrig,
				view = tagCtx.view,
				linkCtx = tag.linkCtx = tag.linkCtx || {
					tag: tag,
					data: view.data,
					view: view,
					ctx: view.ctx
				};

			if (tag.onAfterLink) {
				tag.onAfterLink(tagCtx, linkCtx);
			}
			$linkedElem = tag.targetTag ? tag.targetTag.linkedElem : tag.linkedElem;
			if (linkedElem = $linkedElem && $linkedElem[0]) {
				if (radioButtons = tag._.radio) {
					$linkedElem = $linkedElem.children("input[type=radio]");
				}
				if (radioButtons || !tag._.chging) {
					val = $sub.cvt(tag, tag.convert)[0];

					if (radioButtons || linkedElem !== linkCtx.elem) {
						l = $linkedElem.length;
						while (l--) {
							linkedElem = $linkedElem[l];
							linkedTag = linkedElem._jsvLnkdEl;
							if (tag._.inline && (!linkedTag || linkedTag !== tag && linkedTag.targetTag !== tag)) {
								linkedElem._jsvLnkdEl = tag;
								// For data-linked tags, identify the linkedElem with the tag, for "to" binding
								// (For data-linked elements, if not yet bound, we identify later when the linkCtx.elem is bound)
								bindings = linkCtx.elem ? linkCtx.elem._jsvBnd : tag._prv._jsvBnd;
								linkedElem._jsvBnd = bindings + "+";
								// Add a "+" for cloned binding - so removing elems with cloned bindings will not remove the 'parent' binding from the bindingStore.

								bindings = bindings.slice(1).split("&");
								i = bindings.length;
								while (i--) {
									bindTo(bindingStore[bindings[i]], tag.convertBack);
								}
							}
							if (radioButtons) {
								// For radio button, set to if val === value. For others set val() to val, below
								linkedElem[CHECKED] = val === linkedElem.value;
							}
						}
						linkCtx._val = val;
					}
					if (val !== undefined) {
						if (!radioButtons && linkedElem.value !== undefined) {
							if (linkedElem.type === CHECKBOX) {
								linkedElem[CHECKED] = val && val !== "false";
							} else {
								$linkedElem.val(val);
							}
						} else if (linkedElem.contentEditable === sTRUE) {
							linkedElem.innerHTML = val;
						}
					}
				}
			}
			if (linkedElem = linkedElem || tag.tagName === ":" && linkCtx.elem) {
				oldTrig = linkedElem._jsvTr;
				newTrig = tagCtx.props.trigger;
				if (oldTrig !== newTrig) {
					linkedElem._jsvTr = newTrig;
					$linkedElem = $linkedElem || $(linkedElem);
					bindElChange($linkedElem, oldTrig, "off");
					bindElChange($linkedElem, newTrig, "on");
				}
			}
		}

		function asyncElemChangeHandler(ev) {
			setTimeout(function() {
				elemChangeHandler(ev);
			}, 0);
		}

		function bindElChange($elem, trig, onoff) {
			trig && $elem[onoff](trig === true? "keydown" : trig, trig === true ? asyncElemChangeHandler : elemChangeHandler);
		}

		function bindTo(binding, cvtBk) {
			// Two-way binding.
			// We set the binding.to[1] to be the cvtBack, and binding.to[0] to be either the path to the target, or [object, path] where the target is the path on the provided object.
			// So for a path with an object call: a.b.getObject().d.e, then we set to[0] to be [returnedObject, "d.e"], and we bind to the path on the returned object as target
			// Otherwise our target is the first path, paths[0], which we will convert with contextCb() for paths like ~a.b.c or #x.y.z
	//TODO add support for two-way binding with bound named props and no bindto expression. <input data-link="{:a ^foo=b:}"
	//- currently will not bind to the correct target - but bindto does gives workaround
			var bindto, pathIndex, firstPath, lastPath, bindtoOb,
				lct = binding.linkCtx,
				source = lct.data,
				paths = lct.fn.paths;
			if (binding) {
				if (bindto = paths._jsvto) {
					paths = bindto;
				}
				pathIndex = paths.length;
				while (pathIndex && "" + (lastPath = paths[--pathIndex]) !== lastPath) {} // If the lastPath is an object (e.g. with _jsvOb property), take preceding one
				if (lastPath && (!lct.tag || lct.tag.tagCtx.args.length)) {
					lastPath = lastPath.split("^").join("."); // We don't need the "^" since binding has happened. For to binding, require just "."s
					binding.to = lastPath.charAt(0) === "."
						? [[bindtoOb = paths[pathIndex-1], lastPath.slice(1)], cvtBk] // someexpr().lastpath - so need to get the bindtoOb object returned from the expression
						: [lct._ctxCb(firstPath = pathIndex ? paths[0].split("^").join(".") : lastPath) || [source, firstPath], cvtBk];

					if (bindto && bindtoOb) {
						// This is a bindto binding {:expr bindto=someob().some.path:}
						// If it returned an object, we need to call the callback to get the object instance, so we bind to the final path (.some.path) starting from that object
						// TODO add unit tests for this scenario
						binding.to[0][0] = lct._ctxCb(bindtoOb, source);
					}
				} else {
					binding.to = [[], cvtBk];
				}
			}
		}

		function mergeCtxs(tag, newCtxs) { // Merge updated tagCtxs into tag.tagCtxs
			var tagCtx, newTagCtx,
				view = tag.tagCtx.view,
				tagCtxs = tag.tagCtxs || [tag.tagCtx],
				l = tagCtxs.length,
				refresh = !newCtxs;

			newCtxs = newCtxs || tag._.bnd.call(view.tmpl, (tag.linkCtx || view).data, view, $views);

			while (l--) {
				tagCtx = tagCtxs[l];
				newTagCtx = newCtxs[l];
				$.observable(tagCtx.props).setProperty(newTagCtx.props);
				$extend(tagCtx.ctx, newTagCtx.ctx); // We don't support propagating ctx variables, ~foo, observably, to nested views. So extend, not setProperty...
				tagCtx.args = newTagCtx.args;
				if (refresh) {
					tagCtx.tmpl = newTagCtx.tmpl;
				}
			}
			return tagCtxs;
		}

		//=========
		// Disposal
		//=========

		function clean(elems) {
			// Remove data-link bindings, or contained views
			var l, elem, bindings,
				elemArray = [],
				len = elems.length,
				i = len;
			while (i--) {
				// Copy into an array, so that deletion of nodes from DOM will not cause our 'i' counter to get shifted
				// (Note: This seems as fast or faster than elemArray = [].slice.call(elems); ...)
				elemArray.push(elems[i]);
			}
			i = len;
			while (i--) {
				elem = elemArray[i];
				if (elem.parentNode) {
					// Has not already been removed from the DOM
					if (bindings = elem._jsvBnd) {
						// Get propertyChange bindings for this element
						// This may be an element with data-link, or the opening script marker node for a data-linked tag {^{...}}
						// bindings is a string with the syntax: "(&bindingId)*"
						bindings = bindings.slice(1).split("&");
						elem._jsvBnd = "";
						l = bindings.length;
						while (l--) {
							// Remove associated bindings
							removeViewBinding(bindings[l], elem._jsvLnkdEl, elem); // unbind bindings with this bindingId on this view
						}
					}
					disposeTokens(markerNodeInfo(elem) + (elem._dfr || ""));
				}
			}
		}

		function removeViewBinding(bindId, linkedElemTag, elem) {
			// Unbind
			var objId, linkCtx, tag, object, obsId, tagCtxs, l, map, $linkedElem, linkedElem, trigger,
				binding = bindingStore[bindId];

			if (linkedElemTag) {
				if (elem === linkedElemTag.linkedElem[0]) {
					delete elem._jsvLnkdEl;
					delete linkedElemTag.linkedElem;
				}
			} else if (binding) {
				delete bindingStore[bindId]; // Delete already, so call to onDispose handler below cannot trigger recursive deletion (through recursive call to jQuery cleanData)
				for (objId in binding.bnd) {
					object = binding.bnd[objId];
					obsId = ".obs" + binding.cbId;
					if ($.isArray(object)) {
						$([object]).off(arrayChangeStr + obsId).off(propertyChangeStr + obsId); // There may be either or both of arrayChange and propertyChange
					} else {
						$(object).off(propertyChangeStr + obsId);
					}
					delete binding.bnd[objId];
				}

				if (linkCtx = binding.linkCtx) {
					if (tag = linkCtx.tag) {
						if (tagCtxs = tag.tagCtxs) {
							l = tagCtxs.length;
							while (l--) {
								if (map = tagCtxs[l].map) {
									map.unmap(); //unobserve
								}
							}
						}
						$linkedElem = tag.linkedElem;
						linkedElem = $linkedElem && $linkedElem[0] || linkCtx.elem;

						if (trigger = linkedElem && linkedElem._jsvTr) {
							bindElChange($linkedElem || $(linkedElem), trigger, "off");
							linkedElem._jsvTr = undefined;
						}

						if (tag.onDispose) {
							tag.onDispose();
						}

						if (!tag._elCnt) {
							tag._prv && tag._prv.parentNode.removeChild(tag._prv);
							tag._nxt && tag._nxt.parentNode.removeChild(tag._nxt);
						}
					}
					delete linkCtx.view._.bnds[bindId];
				}
				delete $sub._cbBnds[binding.cbId];
			}
		}

		function $unlink(tmplOrLinkTag, to) {
			if (tmplOrLinkTag === undefined) {
				// Call to $.unlink() is equivalent to $.unlink(true, "body")
				if (activeBody) {
					$(activeBody)
						.off(elementChangeStr, elemChangeHandler)
						.off('blur', '[contenteditable]', elemChangeHandler);
					activeBody = undefined;
				}
				tmplOrLinkTag = true;
				topView.removeViews();
				clean(document.body.getElementsByTagName("*"));
			} else if (to && tmplOrLinkTag === true) {
				to = to.jquery ? to : $(to); // to is a jquery object or an element or selector
				to.each(function() {
					var innerView;
					while ((innerView = $view(this, true)) && innerView.parent) {
						innerView.parent.removeViews(innerView._.key, undefined, true);
					}
					clean(this.getElementsByTagName("*"));
					clean([this]);
				});
			}
			return to; // Allow chaining, to attach event handlers, etc.

	//} else if (to) {
	//	to = to.jquery ? to : $(to); // to is a jquery object or an element or selector
	//	if (tmplOrLinkTag === true) {
	//		// Call to $(el).unlink(true) - unlink content of element, but don't remove bindings on element itself
	//		to.each(function() {
	//			var innerView;
	////TODO fix this for better perf. Rather that calling inner view multiple times which does querySelectorAll each time, consider a single querySelectorAll
	//// or simply call view.removeViews() on the top-level views under the target 'to' node, then clean(...)
	//			while ((innerView = $view(this, true)) && innerView.parent) {
	//				innerView.parent.removeViews(innerView._.key, undefined, true);
	//			}
	//			clean(this.getElementsByTagName("*"));
	//			clean([this]);
	//		});
	//	} else if (tmplOrLinkTag === undefined) {
	//		// Call to $(el).unlink() // Not currently supported
	//		clean(to);
	////TODO provide this unlink API
	//	} else if ("" + tmplOrLinkTag === tmplOrLinkTag) {
	//		// Call to $(el).unlink(tmplOrLinkTag ...)
	//		$.each(to, function() {
	//			//...
	//		});
	//	}
	//TODO - unlink the content and the arrayChange, but not any other bindings on the element (if container rather than "replace")
		}

		function tmplUnlink(to, from) {
			return $unlink(this, to, from);
		}

		//========
		// Helpers
		//========

		function getContextCb(view) {
			// TODO Consider exposing or allowing override, as public API
			view = view || $.view();
			return function(path, object) {
				// TODO consider only calling the contextCb on the initial token in path '~a.b.c' and not calling again on
				// the individual tokens, 'a', 'b', 'c'... Currently it is called multiple times
				var tokens, tag,
					items = [object];
				if (view && path) {
					if (path._jsvOb) {
						return path._jsvOb.call(view.tmpl, object, view, $views);
					}
					if (path.charAt(0) === "~") {
						// We return new items to insert into the sequence, replacing the "~a.b.c" string:
						// [helperObject 'a', "a.b.c" currentDataItem] so currentDataItem becomes the object for subsequent paths.
						if (path.slice(0, 4) === "~tag") {
							tag = view.ctx;
							if (path.charAt(4) === ".") {
								// "~tag.xxx"
								tokens = path.slice(5).split(".");
								tag = tag.tag;
							}
							if (tokens) {
								return tag ? [tag, tokens.join("."), object] : [];
							}
						}
						path = path.slice(1).split(".");
						if (object = view.hlp(path.shift())) {
							if (path.length) {
								items.unshift(path.join("."));
							}
							items.unshift(object);
						}
						return object ? items : [];
					}
					if (path.charAt(0) === "#") {
						// We return new items to insert into the sequence, replacing the "#a.b.c" string: [view, "a.b.c" currentDataItem]
						// so currentDataItem becomes the object for subsequent paths. The 'true' flag makes the paths bind only to leaf changes.
						return path === "#data" ? [] : [view, path.replace(rViewPath, ""), object];
					}
				}
			};
		}

		function inputAttrib(elem) {
			return elem.type === CHECKBOX ? elem[CHECKED] : elem.value;
		}

		//========================== Initialize ==========================

		//=====================
		// JsRender integration
		//=====================

		$sub.onStore.template = function(name, item) {
			item.link = tmplLink;
			item.unlink = tmplUnlink;
			if (name) {
				$.link[name] = function() {
					return tmplLink.apply(item, arguments);
				};
				$.unlink[name] = function() {
					return tmplUnlink.apply(item, arguments);
				};
			}
		};

		$sub.onStore.tag = function(name, item) {
			$sub._lnk(item);
		};

		$sub._lnk = function(item) {
			return $extend(item, linkMethods);
		};

		$sub.viewInfos = viewInfos; // Expose viewInfos() as public helper method

		// Initialize default delimiters
		($viewsSettings.delimiters = function() {
			var delimChars = oldJsvDelimiters.apply($views, arguments);
			delimOpenChar0 = delimChars[0];
			delimOpenChar1 = delimChars[1];
			delimCloseChar0 = delimChars[2];
			delimCloseChar1 = delimChars[3];
			linkChar = delimChars[4];
			rTag = new RegExp("(?:^|\\s*)([\\w-]*)(\\" + linkChar + ")?(\\" + delimOpenChar1 + $sub.rTag + "\\" + delimCloseChar0 + ")", "g");

			// Default rTag:      attr  bind tagExpr   tag         converter colon html     comment            code      params
			//          (?:^|\s*)([\w-]*)(\^)?({(?:(?:(\w+(?=[\/\s}]))|(?:(\w+)?(:)|(>)|!--((?:[^-]|-(?!-))*)--|(\*)))\s*((?:[^}]|}(?!}))*?))})
			return this;
		})();

		//====================================
		// Additional members for linked views
		//====================================

		function transferViewTokens(prevNode, nextNode, parentElem, id, viewOrTagChar, refresh) {
			// Transfer tokens on prevNode of viewToRemove/viewToRefresh to nextNode or parentElem._dfr
			var i, l, vwInfos, vwInfo, viewOrTag, viewId, tokens,
				precedingLength = 0,
				emptyView = prevNode === nextNode;

			if (prevNode) {
				// prevNode is either the first node in the viewOrTag, or has been replaced by the vwInfos tokens string
				vwInfos = viewInfos(prevNode) || [];
				for (i = 0, l = vwInfos.length; i < l; i++) {
					// Step through views or tags on the prevNode
					vwInfo = vwInfos[i];
					viewId = vwInfo.id;
					if (viewId === id && vwInfo.ch === viewOrTagChar) {
						if (refresh) {
							// This is viewOrTagToRefresh, this is the last viewOrTag to process...
							l = 0;
						} else {
							// This is viewOrTagToRemove, so we are done...
							break;
						}
					}
					if (!emptyView) {
						viewOrTag = vwInfo.ch === "_"
							? viewStore[viewId]
							: bindingStore[viewId].linkCtx.tag;
						if (vwInfo.open) {
							// A "#m" token
							viewOrTag._prv = nextNode;
						} else if (vwInfo.close) {
							// A "/m" token
							viewOrTag._nxt = nextNode;
						}
					}
					precedingLength += viewId.length + 2;
				}

				if (precedingLength) {
					prevNode.setAttribute(jsvAttrStr, prevNode.getAttribute(jsvAttrStr).slice(precedingLength));
				}
				tokens = nextNode ? nextNode.getAttribute(jsvAttrStr) : parentElem._dfr;
				if (l = tokens.indexOf("/" + id + viewOrTagChar) + 1) {
					tokens = vwInfos._tkns.slice(0, precedingLength) + tokens.slice(l + (refresh ? -1 : id.length + 1));
				}
				if (tokens) {
					if (nextNode) {
						// If viewOrTagToRemove was an empty viewOrTag, we will remove both #n and /n
						// (and any intervening tokens) from the nextNode (=== prevNode)
						// If viewOrTagToRemove was not empty, we will take tokens preceding #n from prevNode,
						// and concatenate with tokens following /n on nextNode
						nextNode.setAttribute(jsvAttrStr, tokens);
					} else {
						parentElem._dfr = tokens;
					}
				}
			} else {
				// !prevNode, so there may be a deferred nodes token on the parentElem. Remove it.
				parentElem._dfr = removeSubStr(parentElem._dfr, "#" + id + viewOrTagChar);
				if (!refresh && !nextNode) {
					// If this viewOrTag is being removed, and there was no .nxt, remove closing token from deferred tokens
					parentElem._dfr = removeSubStr(parentElem._dfr, "/" + id + viewOrTagChar);
				}
			}
		}

		function disposeTokens(tokens) {
			var i, l, vwItem, vwInfos;
			if (vwInfos = viewInfos(tokens, 1, rOpenMarkers)) {
				for (i = 0, l = vwInfos.length; i < l; i++) {
					vwItem = vwInfos[i];
					if (vwItem.ch === "_") {
						if ((vwItem = viewStore[vwItem.id]) && vwItem.data !== undefined) {
							// If this is the _prv (prevNode) for a view, remove the view
							// - unless view.data is undefined, in which case it is already being removed
							vwItem.parent.removeViews(vwItem._.key, undefined, true);
						}
					} else {
						removeViewBinding(vwItem.id); // unbind bindings with this bindingId on this view
					}
				}
			}
		}

		//====================================
		// Add linked view methods to view prototype
		//====================================

		$extend(
			$sub._lnk($sub.View.prototype),
			{
				// Note: a linked view will also, after linking have nodes[], _prv (prevNode), _nxt (nextNode) ...
				addViews: function(index, dataItems, tmpl) {
					// if view is not an array view, do nothing
					var i, viewsCount,
						self = this,
						itemsCount = dataItems.length,
						views = self.views;

					if (!self._.useKey && itemsCount && (tmpl = self.tmpl)) {
						// view is of type "array"
						// Use passed-in template if provided, since self added view may use a different template than the original one used to render the array.
						viewsCount = views.length + itemsCount;

						if (renderAndLink(self, index, tmpl, views, dataItems, self.ctx) !== false) {
							for (i = index + itemsCount; i < viewsCount; i++) {
								$observable(views[i]).setProperty("index", i);
								// This is fixing up index, but not key, and not index on child views. From child views, use view.getIndex()
							}
						}
					}
					return self;
				},

				removeViews: function(index, itemsCount, keepNodes) {
					// view.removeViews() removes all the child views
					// view.removeViews(index) removes the child view with specified index or key
					// view.removeViews(index, count) removes the specified nummber of child views, starting with the specified index
					function removeView(index) {
						var id, bindId, parentElem, prevNode, nextNode, nodesToRemove,
							viewToRemove = views[index];

						if (viewToRemove && viewToRemove.link) {
							id = viewToRemove._.id;
							if (!keepNodes) {
								// Remove the HTML nodes from the DOM, unless they have already been removed, including nodes of child views
								nodesToRemove = viewToRemove.nodes();
							}

							// Remove child views, without removing nodes
							viewToRemove.removeViews(undefined, undefined, true);

							viewToRemove.data = undefined; // Set data to undefined: used as a flag that this view is being removed
							prevNode = viewToRemove._prv;
							nextNode = viewToRemove._nxt;
							parentElem = viewToRemove.parentElem;
							// If prevNode and nextNode are the same, the view is empty
							if (!keepNodes) {
								// Remove the HTML nodes from the DOM, unless they have already been removed, including nodes of child views
								if (viewToRemove._elCnt) {
									// if keepNodes is false (and transferring of tokens has not already been done at a higher level)
									// then transfer tokens from prevNode which is being removed, to nextNode.
									transferViewTokens(prevNode, nextNode, parentElem, id, "_");
								}
								$(nodesToRemove).remove();
							}
							if (!viewToRemove._elCnt) {
								try {
									prevNode.parentNode.removeChild(prevNode); // (prevNode.parentNode is parentElem, except if jQuery Mobile or similar has inserted an intermediate wrapper
									nextNode.parentNode.removeChild(nextNode);
								} catch (e) {}
							}
							setArrayChangeLink(viewToRemove);
							for (bindId in viewToRemove._.bnds) {
								removeViewBinding(bindId);
							}
							delete viewStore[id];
						}
					}

					var current, view, viewsCount,
						self = this,
						isArray = !self._.useKey,
						views = self.views;

					if (isArray) {
						viewsCount = views.length;
					}
					if (index === undefined) {
						// Remove all child views
						if (isArray) {
							// views and data are arrays
							current = viewsCount;
							while (current--) {
								removeView(current);
							}
							self.views = [];
						} else {
							// views and data are objects
							for (view in views) {
								// Remove by key
								removeView(view);
							}
							self.views = {};
						}
					} else {
						if (itemsCount === undefined) {
							if (isArray) {
								// The parentView is data array view.
								// Set itemsCount to 1, to remove this item
								itemsCount = 1;
							} else {
								// Remove child view with key 'index'
								removeView(index);
								delete views[index];
							}
						}
						if (isArray && itemsCount) {
							current = index + itemsCount;
							// Remove indexed items (parentView is data array view);
							while (current-- > index) {
								removeView(current);
							}
							views.splice(index, itemsCount);
							if (viewsCount = views.length) {
								// Fixup index on following view items...
								while (index < viewsCount) {
									$observable(views[index]).setProperty("index", index++);
								}
							}
						}
					}
					return this;
				},

				refresh: function(context) {
					var self = this,
						parent = self.parent;

					if (parent) {
						renderAndLink(self, self.index, self.tmpl, parent.views, self.data, context, true);
						setArrayChangeLink(self);
					}
					return self;
				},

				link: viewLink
			}
		);

		viewStore = { 0: topView = new $sub.View(undefined, "top") }; // Top-level view

		//========================
		// JsViews-specific converters
		//========================

		$converters.merge = function(val) {
			// Special converter used in data-linking to space-separated lists, such as className:
			// Currently only supports toggle semantics - and has no effect if toggle string is not specified
			// data-link="class{merge:boolExpr toggle=className}"
			var regularExpression,
				currentValue = this.linkCtx._val || "",
				toggle = this.tagCtx.props.toggle;

			if (toggle) {
				// We are toggling the class specified by the toggle property,
				// and the boolean val binding is driving the insert/remove toggle

				regularExpression = toggle.replace(/[\\^$.|?*+()[{]/g, "\\$&");
				// Escape any regular expression special characters (metacharacters) within the toggle string
				regularExpression = "(\\s(?=" + regularExpression + "$)|(\\s)|^)(" + regularExpression + "(\\s|$))";
				// Example: /(\s(?=myclass$)|(\s)|^)?(myclass(\s|$))/ - so matches (" myclass" or " " or ^ ) followed by ("myclass " or "myclass$") where ^/$ are beginning/end of string
				currentValue = currentValue.replace(new RegExp(regularExpression), "$2");
				val = currentValue + (val ? (currentValue && " ") + toggle : "");
			}
			return val;
		};

		//========================
		// JsViews-specific tags
		//========================

		$tags("on", {
			attr: NONE,
			onAfterLink: function(tagCtx, linkCtx) {
				var handler, params,
					self = this,
					i = 0,
					args = tagCtx.args, // [events,] [selector,] handler
					data = tagCtx.props.data,
					view = tagCtx.view,
					contextOb = tagCtx.props.context; // Context ('this' pointer) for attached handler

				while (!$isFunction(handler = args[i++])) {} // Handler is first arg of type function

				params = args.slice(i); // Subsequent args are params
				args = args.slice(0, i-1); // Preceding args (if any) are events and selector

				if (!contextOb) {
					// Get the path for the preceding object (context object) of handler (which is the last arg), compile function
					// to return that context object, and run compiled function against data
					contextOb = /^(.*)[\.^][\w$]+$/.exec(tagCtx.params.args.slice(-params.length -1)[0]);
					contextOb = contextOb && $sub.tmplFn("{:" + contextOb[1] + "}", view.tmpl, true)(linkCtx.data, view);
				}
				if (handler) {
					if (self._evs) {
						self.onDispose();
					}
					$(linkCtx.elem).on(
						self._evs = args[0] || "click", // events defaults to "click"
						self._sel = args[1],
						data == undefined ? null : data,
						self._hlr = function(ev) {
							return handler.apply(contextOb || linkCtx.data, [].concat(params, ev, {change: ev.type, view: view, linkCtx: linkCtx}));
						}
					);
				}
			},
			onDispose: function() {
				$(this.parentElem).off(this._evs, this._sel, this._hlr);
			},
			flow: true
		});

		$extend($tags["for"], {
			//onUpdate: function(ev, eventArgs, tagCtxs) {
				//Consider adding filtering for perf optimization. However the below prevents update on some scenarios which _should_ update - namely when there is another array on which for also depends.
				//var i, l, tci, prevArg;
				//for (tci = 0; (prevArg = this.tagCtxs[tci]) && prevArg.args.length; tci++) {
				//	if (prevArg.args[0] !== tagCtxs[tci].args[0]) {
				//		return true;
				//	}
				//}
				//return false;
			//},
			onArrayChange: function(ev, eventArgs) {
				var arrayView,
					self = this,
					change = eventArgs.change;
				if (self.tagCtxs[1] && ( // There is an {{else}}
						change === "insert" && ev.target.length === eventArgs.items.length // inserting, and new length is same as inserted length, so going from 0 to n
						|| change === "remove" && !ev.target.length // removing , and new length 0, so going from n to 0
						|| change === "refresh" && !eventArgs.oldItems.length !== !ev.target.length // refreshing, and length is going from 0 to n or from n to 0
					)) {
					self.refresh();
				} else {
					for (arrayView in self._.arrVws) {
						arrayView = self._.arrVws[arrayView];
						if (arrayView.data === ev.target) {
							arrayView._.onArrayChange.apply(arrayView, arguments);
						}
					}
				}
				ev.done = true;
			},
			onAfterLink: function() {
				var i, tagCtx, arrHandler, arrBinding, data,
					self = this,
					arrayBindings = self._ars || {},
					tagCtxs = self.tagCtxs,
					l = tagCtxs.length,
					selected = self.selected || 0;

				for (i = 0; i <= selected; i++) {
					tagCtx = tagCtxs[i];        // loop through tagCtxs up to selected
					data = tagCtx.map
						? tagCtx.map.tgt        // 'data' is mapped data
						: tagCtx.args.length
							? tagCtx.args[0]    // or args[0]
							: tagCtx.view.data; // or defaults to current data.

					if ((arrBinding = arrayBindings[i]) && data !== arrBinding[0]) { // Is there previous array data on this tagCtx, different from new data
						$observe(arrBinding[0], arrBinding[1], true); //unobserve previous array
						delete arrayBindings[i];
					}
					if (!arrayBindings[i] && $.isArray(data)) {
						$observe(data, arrHandler = function(ev, eventArgs) { // Store array data as self._ar, and arrayChangeHandler as self._arCh
							self.onArrayChange(ev, eventArgs);
						});
						arrayBindings[i] = [data, arrHandler];
					}
				}
				for (i = selected + 1; i < l; i++) { // If there were previous bindings on later tagCtxs, remove them
					if (arrBinding = arrayBindings[i]) {
						$observe(arrBinding[0], arrBinding[1], true); //unobserve previous binding
						delete arrayBindings[i];
					}
				}
				self._ars = arrayBindings;
			},
			onDispose: function() {
				var l, self = this;
				for (l in self._ars) {
					$observe(self._ars[l][0], self._ars[l][1], true); //unobserve
				}
			}
		});

		$extend($tags["for"], linkMethods);
		$extend($tags["if"], linkMethods);
		$extend($tags.include, linkMethods);

		function observeProps(map, ev, eventArgs) {
			switch (eventArgs.change) {
				case "set":
					var target = map.tgt,
						l = target.length;
					while (l--) {
						if (target[l].key === eventArgs.path) {
							break;
						}
					}
					if (l === -1) {
						if (eventArgs.path) {
							$.observable(target).insert({ key: eventArgs.path, prop: eventArgs.value });
						}
					} else if (eventArgs.remove) {
						$.observable(target).remove(l);
					} else {
						$.observable(target[l]).setProperty("prop", eventArgs.value);
					}
			}
		}

		function observeMappedProps(map, ev, eventArgs) {
			var item,
				source= map.src;

			switch (eventArgs.change) {
				case "set":
					if (eventArgs.path === "prop") {
						$.observable(source).setProperty(ev.target.key, eventArgs.value);
					} else { // path === "key"
						$.observable(source).setProperty(eventArgs.oldValue, null);
						delete source[eventArgs.oldValue];
						$.observable(source).setProperty(eventArgs.value, ev.target.prop);
					}
					break;
				case "remove":
					item = eventArgs.items[0];
					$.observable(source).removeProperty(item.key);
					delete source[item.key];
					break;
				case "insert":
					item = eventArgs.items[0];
					if (item.key) {
						$.observable(source).setProperty(item.key, item.prop);
					}
					break;
			}
		}

		function shallowArrayFilter(key, object, allPath) { // Filter used by {{props}} for the mappedProps target array
			return (allPath.indexOf(".") < 0) && object[key];
		}

		$tags("props", {
			baseTag: $tags["for"],
			dataMap: $views.map({
				getTgt: $tags.props.dataMap.getTgt,
				obsSrc: observeProps,
				obsTgt: observeMappedProps,
				tgtFlt: shallowArrayFilter
			})
		});

		//========================
		// Extend jQuery namespace
		//========================

		$extend($, {

			//=======================
			// jQuery $.view() plugin
			//=======================

			view: $views.view = $view = function(node, inner, type) {
				// $.view() returns top view
				// $.view(node) returns view that contains node
				// $.view(selector) returns view that contains first selected element
				// $.view(nodeOrSelector, type) returns nearest containing view of given type
				// $.view(nodeOrSelector, "root") returns root containing view (child of top view)
				// $.view(nodeOrSelector, true, type) returns nearest inner (contained) view of given type

				if (inner !== !!inner) {
					// inner not boolean, so this is view(nodeOrSelector, type)
					type = inner;
					inner = undefined;
				}
				var view, vwInfos, i, j, k, l, elem, elems,
					level = 0,
					body = document.body;

				if (node && node !== body && topView._.useKey > 1) {
					// Perf optimization for common cases

					node = "" + node === node
						? $(node)[0]
						: node.jquery
							? node[0]
							: node;

					if (node) {
						if (inner) {
							// Treat supplied node as a container element and return the first view encountered.
							elems = qsa ? node.querySelectorAll(bindElsSel) : $(bindElsSel, node).get();
							l = elems.length;
							for (i = 0; i < l; i++) {
								elem = elems[i];
								vwInfos = viewInfos(elem, undefined, rOpenViewMarkers);

								for (j = 0, k = vwInfos.length; j < k; j++) {
									view = vwInfos[j];
									if (view = viewStore[view.id]) {
										view = view && type ? view.get(true, type) : view;
										if (view) {
											return view;
										}
									}
								}
							}
						} else {
							while (node) {
								// Move back through siblings and up through parents to find preceding node which is a _prv (prevNode)
								// script marker node for a non-element-content view, or a _prv (first node) for an elCnt view
								if (vwInfos = viewInfos(node, undefined, rViewMarkers)) {
									l = vwInfos.length;
									while (l--) {
										view = vwInfos[l];
										if (view.open) {
											if (level < 1) {
												view = viewStore[view.id];
												return view && type ? view.get(type) : view || topView;
											}
											level--;
										} else {
											// level starts at zero. If we hit a view.close, then we move level to 1, and we don't return a view until
											// we are back at level zero (or a parent view with level < 0)
											level++;
										}
									}
								}
								node = node.previousSibling || node.parentNode;
							}
						}
					}
				}
				return inner ? undefined : topView;
			},

			link: $views.link = $link,
			unlink: $views.unlink = $unlink,

			//=====================
			// override $.cleanData
			//=====================
			cleanData: function(elems) {
				if (elems.length && isCleanCall) {
					// Remove JsViews bindings. Also, remove from the DOM any corresponding script marker nodes
					clean(elems);
				}
				oldCleanData.apply($, arguments);
			}
		});

		$views.utility = {
			validate: function(html) {
				try {
					topView.link(undefined, document.createElement("div"), undefined, undefined, html, undefined, undefined, 1);
				}
				catch (e) {
					return e.message;
				}
			}
		};

		//===============================
		// Extend jQuery instance plugins
		//===============================

		$extend($.fn, {
			link: function(expr, from, context, noIteration, parentView, prevNode, nextNode) {
				return $link(expr, this, from, context, noIteration, parentView, prevNode, nextNode);
			},
			unlink: function(expr) {
				return $unlink(expr, this);
			},
			view: function(type) {
				return $view(this[0], type);
			}
		});

		//==============================================================================
		// Override jQuery methods that call our overridden cleanData, for disposal etc.
		//==============================================================================

		$.each([htmlStr, "replaceWith", "empty", "remove"], function(i, name) {
			var oldFn = $.fn[name];
			$.fn[name] = function() {
				var result;
				isCleanCall = 1; // Make sure cleanData does disposal only when coming from these calls.
				try {
					result = oldFn.apply(this, arguments);
				}
				finally {
					isCleanCall = 0;
				}
				return result;
			};
		});

		//===============
		// Extend topView
		//===============

		$extend(topView, {tmpl: {links: {}, tags: {}}});
		topView._.onRender = addBindingMarkers;
		//=========================
		// Extend $.views.settings
		//=========================

		$viewsSettings({
			wrapMap: wrapMap = {
				option: [1, "<select multiple='multiple'>", "</select>"],
				legend: [1, "<fieldset>", "</fieldset>"],
				area: [1, "<map>", "</map>"],
				param: [1, "<object>", "</object>"],
				thead: [1, "<table>", "</table>"],
				tr: [2, "<table><tbody>", "</tbody></table>"],
				td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
				col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
				svg_ns: [1, "<svg>", "</svg>"],

				// IE6-8 can't serialize link, script, style, or any html5 (NoScope) tags,
				// unless wrapped in a div with non-breaking characters in front of it.
				div: jQuery.support.htmlSerialize ? [0, "", ""] : [1, "X<div>", "</div>"]
			},
			linkAttr: $viewsLinkAttr = "data-link",
			merge: {
				input: {
					from: inputAttrib, to: "value"
				},
				textarea: valueBinding,
				select: valueBinding,
				optgroup: {
					to: "label"
				}
			},
			jsrDbgMode: $viewsSettings.debugMode, // debugMode for JsRender
			debugMode: function(debugMode) { // debugMode for JsViews
				$viewsSettings.jsrDbgMode(debugMode);
				if (debugMode) {
					global._jsv = { // In debug mode create global _jsv, for accessing views, etc
						views: viewStore,
						bindings: bindingStore
					};
				} else {
					delete global._jsv;
				}
			},
			jsv: function() {
				$viewsSettings.debugMode($viewsSettings._dbgMode);
				$viewsLinkAttr = $viewsSettings.linkAttr;
				error = $views._err;
				linkViewsSel = bindElsSel + ",[" + $viewsLinkAttr + "]";
				noDomLevel0 = $viewsSettings.noDomLevel0;
				wrapMap.optgroup = wrapMap.option;
				wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
				wrapMap.th = wrapMap.td;
			}
		});

	//TODO
	// Tests for different attr settings on tags
		// tests of onAfterBind extensibility
		// tests for maps...
		// tests for programmatic map scenarios
		// tests for sorted table, using map=sort or {{sort}} with props for setting sort parameters
		// tests for setting()
		// tests for settings.debugMode()
		// tests for {on data=...}
		// tests for {on } binding when doing top-level data-linking
	// tests for debug mode, noDomLevel0, noValidate
	// linkTo docs and tests.
	// Additional tests and examples for structured params - tagCtx.params
	// Using jsobservable without jsviews - settings??
	// Examples for:
		// overriding error messages
		// Binding to tag properties and contextual properties
		// Fallback strings or onError handlers for any tag instance
		// $.observable(object).removeProperty(path)
		// data-link="{on ... myHandler}" (See unit tests. Examples to follow)
	})(this, this.jQuery);
});

if (window.jQuery) {
	this.jQuery = window.jQuery;
	init();
}
},{}]},{},[1])(1)
});