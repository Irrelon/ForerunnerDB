!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.ForerunnerDB=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Core = require('../lib/Core'),
	CollectionGroup = require('../lib/CollectionGroup'),
	View = require('../lib/View'),
	OldView = require('../lib/OldView'),
	OldViewBind = require('../lib/OldView.Bind'),
	Highcharts = require('../lib/Highcharts'),
	Persist = require('../lib/Persist');

module.exports = Core;
window['ForerunnerDB'] = Core;
},{"../lib/CollectionGroup":3,"../lib/Core":4,"../lib/Highcharts":6,"../lib/OldView":11,"../lib/OldView.Bind":10,"../lib/Persist":15,"../lib/View":17}],2:[function(require,module,exports){
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

Shared.modules.Collection = Collection;

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
								this._updatePush(doc[i], update[i]);
								updated = true;
							} else {
								throw("Cannot push to a key that is not an array! (" + i + ")!");
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
							} else {
								throw("Cannot pull from a key that is not an array! (" + i + ")!");
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
								throw("Cannot push to a key that is not an array! (" + k + ")!");
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
								throw("Cannot splicePush with a key that is not an array! (" + i + ")!");
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
								throw("Cannot pull from a key that is not an array! (" + i + ")!");
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
 * Multiplies a value for a property on a document by the passed number.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to multiply by.
 * @private
 */
Collection.prototype._updateMultiply = function (doc, prop, val) {
	if (this._linked) {
		$.observable(doc).setProperty(prop, doc[prop] * val);
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
		$.observable(doc).setProperty(val, existingVal);
		$.observable(doc).removeProperty(prop);
	} else {
		doc[val] = existingVal;
		delete doc[prop];
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
			if (options.sort) {
				op.time('sort');
				resultArr = this.sort(options.sort, resultArr);
				op.time('sort');
			}
			op.time('tableScan: ' + scanLength);
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
},{"./Crc":5,"./Index":7,"./KeyValueStore":8,"./Metrics":9,"./Overload":13,"./Path":14,"./Shared":16}],3:[function(require,module,exports){
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
	this._collectionArr = [];
	this._views = [];

	// Register listeners for the CRUD events
	this._onCollectionInsert = function () {
		self._onInsert.apply(self, arguments);
	};

	this._onCollectionUpdate = function () {
		self._onUpdate.apply(self, arguments);
	};

	this._onCollectionRemove = function () {
		self._onRemove.apply(self, arguments);
	};

	this._onCollectionChange = function () {
		self._onChange.apply(self, arguments);
	};
};

Shared.modules.CollectionGroup = CollectionGroup;

Collection = require('./Collection');
Overload = require('./Overload');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

/*CollectionGroup.prototype.on = function(event, listener) {
 this._listeners = this._listeners || {};
 this._listeners[event] = this._listeners[event] || [];
 this._listeners[event].push(listener);

 return this;
 };

 CollectionGroup.prototype.off = function(event, listener) {
 if (event in this._listeners) {
 var arr = this._listeners[event],
 index = arr.indexOf(listener);

 if (index > -1) {
 arr.splice(index, 1);
 }
 }

 return this;
 };

 CollectionGroup.prototype.emit = function(event, data) {
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
 };*/

CollectionGroup.prototype.on = new Overload([
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

CollectionGroup.prototype.off = new Overload([
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

CollectionGroup.prototype.emit = function(event, data) {
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
					listenerIdIndex,
					arrCount = data.length,
					arrIndex;

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
		if (this._collectionArr.indexOf(collection) === -1) {
			var self = this;

			// Check for compatible primary keys
			if (this._collectionArr.length) {
				if (this._primaryKey !== collection.primaryKey()) {
					throw("All collections in a collection group must have the same primary key!");
				}
			} else {
				// Set the primary key to the first collection added
				this._primaryKey = collection.primaryKey();
			}

			// Add the collection
			this._collectionArr.push(collection);
			collection._groups.push(this);

			// Listen to events from the collection
			collection.on('insert', this._onCollectionInsert);
			collection.on('update', this._onCollectionUpdate);
			collection.on('remove', this._onCollectionRemove);
			collection.on('change', this._onCollectionChange);
		}
	}

	return this;
};

CollectionGroup.prototype.removeCollection = function (collection) {
	if (collection) {
		var collectionIndex = this._collectionArr.indexOf(collection),
			groupIndex;

		if (collectionIndex !== -1) {
			// Remove event listeners from this collection
			collection.off('insert', this._onCollectionInsert);
			collection.off('update', this._onCollectionUpdate);
			collection.off('remove', this._onCollectionRemove);
			collection.off('change', this._onCollectionChange);

			this._collectionArr.splice(collectionIndex, 1);

			groupIndex = collection._groups.indexOf(this);

			if (groupIndex !== -1) {
				collection._groups.splice(groupIndex, 1);
			}
		}

		if (this._collectionArr.length === 0) {
			// Wipe the primary key
			delete this._primaryKey;
		}
	}

	return this;
};

CollectionGroup.prototype.find = function (query, options) {
	// Loop the collections in this group and find first matching item response
	var data = new Collection().primaryKey(this._collectionArr[0].primaryKey()),
		i;

	for (i = 0; i < this._collectionArr.length; i++) {
		data.insert(this._collectionArr[i].find(query));
	}

	return data.find(query, options);
};

CollectionGroup.prototype.insert = function (query, options) {
	// Loop the collections in this group and apply the insert
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].insert(query, options);
	}
};

CollectionGroup.prototype.update = function (query, update) {
	// Loop the collections in this group and apply the update
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].update(query, update);
	}
};

CollectionGroup.prototype.updateById = function (id, update) {
	// Loop the collections in this group and apply the update
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].updateById(id, update);
	}
};

CollectionGroup.prototype.remove = function (query) {
	// Loop the collections in this group and apply the remove
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].remove(query);
	}
};

/**
 * Helper method that removes a document that matches the given id.
 * @param {String} id The id of the document to remove.
 */
CollectionGroup.prototype.removeById = function (id) {
	// Loop the collections in this group and apply the remove
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].removeById(id);
	}
};

CollectionGroup.prototype._onInsert = function (successArr, failArr) {
	this.emit('insert', successArr, failArr);
};

CollectionGroup.prototype._onUpdate = function (successArr, failArr) {
	this.emit('update', successArr, failArr);
};

CollectionGroup.prototype._onRemove = function (successArr, failArr) {
	this.emit('remove', successArr, failArr);
};

CollectionGroup.prototype._onChange = function () {
	this.emit('change');
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
		collArr = [].concat(this._collectionArr),
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
},{"./Collection":2,"./Overload":13,"./Shared":16}],4:[function(require,module,exports){
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

Shared.modules.Core = Core;

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
},{"./Collection.js":2,"./Crc.js":5,"./Metrics.js":9,"./Overload.js":13,"./Shared.js":16}],5:[function(require,module,exports){
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
},{"./Shared":16}],7:[function(require,module,exports){
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

Shared.modules.Index = Index;

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
				decouple: false,
				sort: this._keys
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
},{"./Path":14,"./Shared":16}],8:[function(require,module,exports){
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

Shared.modules.KeyValueStore = KeyValueStore;

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
},{"./Shared":16}],9:[function(require,module,exports){
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

Shared.modules.Metrics = Metrics;

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
},{"./Operation":12,"./Shared":16}],10:[function(require,module,exports){
// Grab the view class
var Shared,
	Core,
	OldView,
	OldViewInit;

Shared = require('./Shared');
Core = Shared.modules.Core;
OldView = Shared.modules.OldView;
OldViewInit = OldView.prototype.init;

OldView.prototype.init = function () {
	var self = this;

	this._binds = [];
	this._renderStart = 0;
	this._renderEnd = 0;

	this._deferQueue = {
		insert: [],
		update: [],
		remove: [],
		upsert: [],
		_bindInsert: [],
		_bindUpdate: [],
		_bindRemove: [],
		_bindUpsert: []
	};

	this._deferThreshold = {
		insert: 100,
		update: 100,
		remove: 100,
		upsert: 100,
		_bindInsert: 100,
		_bindUpdate: 100,
		_bindRemove: 100,
		_bindUpsert: 100
	};

	this._deferTime = {
		insert: 100,
		update: 1,
		remove: 1,
		upsert: 1,
		_bindInsert: 100,
		_bindUpdate: 1,
		_bindRemove: 1,
		_bindUpsert: 1
	};

	OldViewInit.apply(this, arguments);

	// Hook view events to update binds
	this.on('insert', function (successArr, failArr) {
		self._bindEvent('insert', successArr, failArr);
	});

	this.on('update', function (successArr, failArr) {
		self._bindEvent('update', successArr, failArr);
	});

	this.on('remove', function (successArr, failArr) {
		self._bindEvent('remove', successArr, failArr);
	});

	this.on('change', self._bindChange);
};

/**
 * Binds a selector to the insert, update and delete events of a particular
 * view and keeps the selector in sync so that updates are reflected on the
 * web page in real-time.
 *
 * @param {String} selector The jQuery selector string to get target elements.
 * @param {Object} options The options object.
 */
OldView.prototype.bind = function (selector, options) {
	if (options && options.template) {
		this._binds[selector] = options;
	} else {
		throw('Cannot bind data to element, missing options information!');
	}

	return this;
};

/**
 * Un-binds a selector from the view changes.
 * @param {String} selector The jQuery selector string to identify the bind to remove.
 * @returns {Collection}
 */
OldView.prototype.unBind = function (selector) {
	delete this._binds[selector];
	return this;
};

/**
 * Returns true if the selector is bound to the view.
 * @param {String} selector The jQuery selector string to identify the bind to check for.
 * @returns {boolean}
 */
OldView.prototype.isBound = function (selector) {
	return Boolean(this._binds[selector]);
};

/**
 * Sorts items in the DOM based on the bind settings and the passed item array.
 * @param {String} selector The jQuery selector of the bind container.
 * @param {Array} itemArr The array of items used to determine the order the DOM
 * elements should be in based on the order they are in, in the array.
 */
OldView.prototype.bindSortDom = function (selector, itemArr) {
	var container = $(selector),
		arrIndex,
		arrItem,
		domItem;

	if (this.debug()) {
		console.log('ForerunnerDB.OldView.Bind: Sorting data in DOM...', itemArr);
	}

	for (arrIndex = 0; arrIndex < itemArr.length; arrIndex++) {
		arrItem = itemArr[arrIndex];

		// Now we've done our inserts into the DOM, let's ensure
		// they are still ordered correctly
		domItem = container.find('#' + arrItem[this._primaryKey]);

		if (domItem.length) {
			if (arrIndex === 0) {
				if (this.debug()) {
					console.log('ForerunnerDB.OldView.Bind: Sort, moving to index 0...', domItem);
				}
				container.prepend(domItem);
			} else {
				if (this.debug()) {
					console.log('ForerunnerDB.OldView.Bind: Sort, moving to index ' + arrIndex + '...', domItem);
				}
				domItem.insertAfter(container.children(':eq(' + (arrIndex - 1) + ')'));
			}
		} else {
			if (this.debug()) {
				console.log('ForerunnerDB.OldView.Bind: Warning, element for array item not found!', arrItem);
			}
		}
	}
};

OldView.prototype.bindRefresh = function (obj) {
	var binds = this._binds,
		bindKey,
		bind;

	if (!obj) {
		// Grab current data
		obj = {
			data: this.find()
		};
	}

	for (bindKey in binds) {
		if (binds.hasOwnProperty(bindKey)) {
			bind = binds[bindKey];

			if (this.debug()) { console.log('ForerunnerDB.OldView.Bind: Sorting DOM...'); }
			this.bindSortDom(bindKey, obj.data);

			if (bind.afterOperation) {
				bind.afterOperation();
			}

			if (bind.refresh) {
				bind.refresh();
			}
		}
	}
};

/**
 * Renders a bind view data to the DOM.
 * @param {String} bindSelector The jQuery selector string to use to identify
 * the bind target. Must match the selector used when defining the original bind.
 * @param {Function=} domHandler If specified, this handler method will be called
 * with the final HTML for the view instead of the DB handling the DOM insertion.
 */
OldView.prototype.bindRender = function (bindSelector, domHandler) {
	// Check the bind exists
	var bind = this._binds[bindSelector],
		domTarget = $(bindSelector),
		allData,
		dataItem,
		itemHtml,
		finalHtml = $('<ul></ul>'),
		i;

	if (bind) {
		allData = this._data.find();

		// Loop all items and add them to the screen
		for (i = 0; i < allData.length; i++) {
			dataItem = allData[i];

			itemHtml = bind.template(dataItem, function (itemHtml) {
				finalHtml.append(itemHtml);
			});
		}

		if (!domHandler) {
			domTarget.append(finalHtml.html());
		} else {
			domHandler(bindSelector, finalHtml.html());
		}
	}
};

OldView.prototype.processQueue = function (type, callback) {
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

			this._bindEvent(type, dataArr, []);
		}

		// Queue another process
		setTimeout(function () {
			self.processQueue(type, callback);
		}, deferTime);
	} else {
		if (callback) { callback(); }
		this.emit('bindQueueComplete');
	}
};

OldView.prototype._bindEvent = function (type, successArr, failArr) {
	var queue = this._deferQueue[type],
		deferThreshold = this._deferThreshold[type],
		deferTime = this._deferTime[type];

	var binds = this._binds,
		unfilteredDataSet = this.find({}),
		filteredDataSet,
		bindKey;

	// Check if the number of inserts is greater than the defer threshold
	/*if (successArr && successArr.length > deferThreshold) {
	 // Break up upsert into blocks
	 this._deferQueue[type] = queue.concat(successArr);

	 // Fire off the insert queue handler
	 this.processQueue(type);

	 return;
	 } else {*/
	for (bindKey in binds) {
		if (binds.hasOwnProperty(bindKey)) {
			if (binds[bindKey].reduce) {
				filteredDataSet = this.find(binds[bindKey].reduce.query, binds[bindKey].reduce.options);
			} else {
				filteredDataSet = unfilteredDataSet;
			}

			switch (type) {
				case 'insert':
					this._bindInsert(bindKey, binds[bindKey], successArr, failArr, filteredDataSet);
					break;

				case 'update':
					this._bindUpdate(bindKey, binds[bindKey], successArr, failArr, filteredDataSet);
					break;

				case 'remove':
					this._bindRemove(bindKey, binds[bindKey], successArr, failArr, filteredDataSet);
					break;
			}
		}
	}
	//}
};

OldView.prototype._bindChange = function (newDataArr) {
	if (this.debug()) {
		console.log('ForerunnerDB.OldView.Bind: Bind data change, refreshing bind...', newDataArr);
	}

	this.bindRefresh(newDataArr);
};

OldView.prototype._bindInsert = function (selector, options, successArr, failArr, all) {
	var container = $(selector),
		itemElem,
		itemHtml,
		i;

	// Loop the inserted items
	for (i = 0; i < successArr.length; i++) {
		// Check for existing item in the container
		itemElem = container.find('#' + successArr[i][this._primaryKey]);

		if (!itemElem.length) {
			itemHtml = options.template(successArr[i], function (itemElem, insertedItem, failArr, all) { return function (itemHtml) {
				// Check if there is custom DOM insert method
				if (options.insert) {
					options.insert(itemHtml, insertedItem, failArr, all);
				} else {
					// Handle the insert automatically
					// Add the item to the container
					if (options.prependInsert) {
						container.prepend(itemHtml);

					} else {
						container.append(itemHtml);
					}
				}

				if (options.afterInsert) {
					options.afterInsert(itemHtml, insertedItem, failArr, all);
				}
			}}(itemElem, successArr[i], failArr, all));
		}
	}
};

OldView.prototype._bindUpdate = function (selector, options, successArr, failArr, all) {
	var container = $(selector),
		itemElem,
		i;

	// Loop the updated items
	for (i = 0; i < successArr.length; i++) {
		// Check for existing item in the container
		itemElem = container.find('#' + successArr[i][this._primaryKey]);

		options.template(successArr[i], function (itemElem, itemData) { return function (itemHtml) {
			// Check if there is custom DOM insert method
			if (options.update) {
				options.update(itemHtml, itemData, all, itemElem.length ? 'update' : 'append');
			} else {
				if (itemElem.length) {
					// An existing item is in the container, replace it with the
					// new rendered item from the updated data
					itemElem.replaceWith(itemHtml);
				} else {
					// The item element does not already exist, append it
					if (options.prependUpdate) {
						container.prepend(itemHtml);
					} else {
						container.append(itemHtml);
					}
				}
			}

			if (options.afterUpdate) {
				options.afterUpdate(itemHtml, itemData, all);
			}
		}}(itemElem, successArr[i]));
	}
};

OldView.prototype._bindRemove = function (selector, options, successArr, failArr, all) {
	var container = $(selector),
		itemElem,
		i;

	// Loop the removed items
	for (i = 0; i < successArr.length; i++) {
		// Check for existing item in the container
		itemElem = container.find('#' + successArr[i][this._primaryKey]);

		if (itemElem.length) {
			if (options.beforeRemove) {
				options.beforeRemove(itemElem, successArr[i], all, function (itemElem, data, all) { return function () {
					if (options.remove) {
						options.remove(itemElem, data, all);
					} else {
						itemElem.remove();

						if (options.afterRemove) {
							options.afterRemove(itemElem, data, all);
						}
					}
				}}(itemElem, successArr[i], all));
			} else {
				if (options.remove) {
					options.remove(itemElem, successArr[i], all);
				} else {
					itemElem.remove();

					if (options.afterRemove) {
						options.afterRemove(itemElem, successArr[i], all);
					}
				}
			}
		}
	}
};
},{"./Shared":16}],11:[function(require,module,exports){
// Import external names locally
var Shared,
	Core,
	CollectionGroup,
	Collection,
	CollectionInit,
	CollectionGroupInit,
	CoreInit,
	Overload;

Shared = require('./Shared');

/**
 * The view constructor.
 * @param viewName
 * @constructor
 */
var OldView = function () {
	this.init.apply(this, arguments);
};

OldView.prototype.init = function (viewName) {
	var self = this;

	this._name = viewName;
	this._groups = [];
	this._listeners = {};
	this._query = {
		query: {},
		options: {}
	};

	// Register listeners for the CRUD events
	this._onFromSetData = function () {
		self._onSetData.apply(self, arguments);
	};

	this._onFromInsert = function () {
		self._onInsert.apply(self, arguments);
	};

	this._onFromUpdate = function () {
		self._onUpdate.apply(self, arguments);
	};

	this._onFromRemove = function () {
		self._onRemove.apply(self, arguments);
	};

	this._onFromChange = function () {
		if (self.debug()) { console.log('ForerunnerDB.OldView: Received change'); }
		self._onChange.apply(self, arguments);
	};
};

Shared.modules.OldView = OldView;

CollectionGroup = require('./CollectionGroup');
Collection = require('./Collection');
CollectionInit = Collection.prototype.init;
CollectionGroupInit = CollectionGroup.prototype.init;
Overload = require('./Overload');
Core = Shared.modules.Core;
CoreInit = Core.prototype.init;

OldView.prototype.on = new Overload([
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

OldView.prototype.off = new Overload([
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

OldView.prototype.emit = function(event, data) {
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
					listenerIdIndex,
					arrCount = data.length,
					arrIndex;

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
 * Drops a view and all it's stored data from the database.
 * @returns {boolean} True on success, false on failure.
 */
OldView.prototype.drop = function () {
	if ((this._db || this._from) && this._name) {
		if (this.debug()) {
			console.log('ForerunnerDB.OldView: Dropping view ' + this._name);
		}

		this.emit('drop');

		if (this._db) {
			delete this._db._oldViews[this._name];
		}

		if (this._from) {
			delete this._from._oldViews[this._name];
		}

		return true;
	}

	return false;
};

OldView.prototype.debug = function () {
	// TODO: Make this function work
	return false;
};

/**
 * Gets / sets the DB the view is bound against. Automatically set
 * when the db.oldView(viewName) method is called.
 * @param db
 * @returns {*}
 */
OldView.prototype.db = function (db) {
	if (db !== undefined) {
		this._db = db;
		return this;
	}

	return this._db;
};

/**
 * Gets / sets the collection that the view derives it's data from.
 * @param {*} collection A collection instance or the name of a collection
 * to use as the data set to derive view data from.
 * @returns {*}
 */
OldView.prototype.from = function (collection) {
	if (collection !== undefined) {
		// Check if this is a collection name or a collection instance
		if (typeof(collection) === 'string') {
			if (this._db.collectionExists(collection)) {
				collection = this._db.collection(collection);
			} else {
				throw('Invalid collection in view.from() call.');
			}
		}

		// Check if the existing from matches the passed one
		if (this._from !== collection) {
			// Check if we already have a collection assigned
			if (this._from) {
				// Remove ourselves from the collection view lookup
				this.removeFrom();
			}

			this.addFrom(collection);
		}

		return this;
	}

	return this._from;
};

OldView.prototype.addFrom = function (collection) {
	var self = this;

	this._from = collection;

	if (this._from) {
		this._from.on('setData', this._onFromSetData);
		//this._from.on('insert', this._onFromInsert);
		//this._from.on('update', this._onFromUpdate);
		//this._from.on('remove', this._onFromRemove);
		this._from.on('change', this._onFromChange);

		// Add this view to the collection's view lookup
		this._from._addOldView(this);
		this._primaryKey = this._from._primaryKey;

		this.refresh();
		return this;
	} else {
		throw('Cannot determine collection type in view.from()');
	}
};

OldView.prototype.removeFrom = function () {
	// Unsubscribe from events on this "from"
	this._from.off('setData', this._onFromSetData);
	//this._from.off('insert', this._onFromInsert);
	//this._from.off('update', this._onFromUpdate);
	//this._from.off('remove', this._onFromRemove);
	this._from.off('change', this._onFromChange);

	this._from._removeOldView(this);
};

/**
 * Gets the primary key for this view from the assigned collection.
 * @returns {String}
 */
OldView.prototype.primaryKey = function () {
	if (this._from) {
		return this._from.primaryKey();
	}

	return undefined;
};

/**
 * Gets / sets the query that the view uses to build it's data set.
 * @param {Object=} query
 * @param {Boolean=} options An options object.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 */
OldView.prototype.queryData = function (query, options, refresh) {
	if (query !== undefined) {
		this._query.query = query;
	}

	if (options !== undefined) {
		this._query.options = options;
	}

	if (query !== undefined || options !== undefined) {
		if (refresh === undefined || refresh === true) {
			this.refresh();
		}

		return this;
	}

	return this._query;
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
OldView.prototype.queryAdd = function (obj, overwrite, refresh) {
	var query = this._query.query,
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
OldView.prototype.queryRemove = function (obj, refresh) {
	var query = this._query.query,
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
OldView.prototype.query = function (query, refresh) {
	if (query !== undefined) {
		this._query.query = query;

		if (refresh === undefined || refresh === true) {
			this.refresh();
		}
		return this;
	}

	return this._query.query;
};

/**
 * Gets / sets the query options used when applying sorting etc to the
 * view data set.
 * @param {Object=} options An options object.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 */
OldView.prototype.queryOptions = function (options, refresh) {
	if (options !== undefined) {
		this._query.options = options;

		if (refresh === undefined || refresh === true) {
			this.refresh();
		}
		return this;
	}

	return this._query.options;
};

/**
 * Refreshes the view data and diffs between previous and new data to
 * determine if any events need to be triggered or DOM binds updated.
 */
OldView.prototype.refresh = function (force) {
	if (this._from) {
		// Take a copy of the data before updating it, we will use this to
		// "diff" between the old and new data and handle DOM bind updates
		var oldData = this._data,
			oldDataArr,
			oldDataItem,
			newData,
			newDataArr,
			query,
			primaryKey,
			dataItem,
			inserted = [],
			updated = [],
			removed = [],
			operated = false,
			i;

		if (this.debug()) {
			console.log('ForerunnerDB.OldView: Refreshing view ' + this._name);
			console.log('ForerunnerDB.OldView: Existing data: ' + (typeof(this._data) !== "undefined"));
			if (typeof(this._data) !== "undefined") {
				console.log('ForerunnerDB.OldView: Current data rows: ' + this._data.find().length);
			}
			//console.log(OldView.prototype.refresh.caller);
		}

		// Query the collection and update the data
		if (this._query) {
			if (this.debug()) {
				console.log('ForerunnerDB.OldView: View has query and options, getting subset...');
			}
			// Run query against collection
			//console.log('refresh with query and options', this._query.options);
			this._data = this._from.subset(this._query.query, this._query.options);
			//console.log(this._data);
		} else {
			// No query, return whole collection
			if (this._query.options) {
				if (this.debug()) {
					console.log('ForerunnerDB.OldView: View has options, getting subset...');
				}
				this._data = this._from.subset({}, this._query.options);
			} else {
				if (this.debug()) {
					console.log('ForerunnerDB.OldView: View has no query or options, getting subset...');
				}
				this._data = this._from.subset({});
			}
		}

		// Check if there was old data
		if (!force && oldData) {
			if (this.debug()) {
				console.log('ForerunnerDB.OldView: Refresh not forced, old data detected...');
			}

			// Now determine the difference
			newData = this._data;

			if (oldData.subsetOf() === newData.subsetOf()) {
				if (this.debug()) {
					console.log('ForerunnerDB.OldView: Old and new data are from same collection...');
				}
				newDataArr = newData.find();
				oldDataArr = oldData.find();
				primaryKey = newData._primaryKey;

				// The old data and new data were derived from the same parent collection
				// so scan the data to determine changes
				for (i = 0; i < newDataArr.length; i++) {
					dataItem = newDataArr[i];

					query = {};
					query[primaryKey] = dataItem[primaryKey];

					// Check if this item exists in the old data
					oldDataItem = oldData.find(query)[0];

					if (!oldDataItem) {
						// New item detected
						inserted.push(dataItem);
					} else {
						// Check if an update has occurred
						if (JSON.stringify(oldDataItem) !== JSON.stringify(dataItem)) {
							// Updated / already included item detected
							updated.push(dataItem);
						}
					}
				}

				// Now loop the old data and check if any records were removed
				for (i = 0; i < oldDataArr.length; i++) {
					dataItem = oldDataArr[i];

					query = {};
					query[primaryKey] = dataItem[primaryKey];

					// Check if this item exists in the old data
					if (!newData.find(query)[0]) {
						// Removed item detected
						removed.push(dataItem);
					}
				}

				if (this.debug()) {
					console.log('ForerunnerDB.OldView: Removed ' + removed.length + ' rows');
					console.log('ForerunnerDB.OldView: Inserted ' + inserted.length + ' rows');
					console.log('ForerunnerDB.OldView: Updated ' + updated.length + ' rows');
				}

				// Now we have a diff of the two data sets, we need to get the DOM updated
				if (inserted.length) {
					this._onInsert(inserted, []);
					operated = true;
				}

				if (updated.length) {
					this._onUpdate(updated, []);
					operated = true;
				}

				if (removed.length) {
					this._onRemove(removed, []);
					operated = true;
				}
			} else {
				// The previous data and the new data are derived from different collections
				// and can therefore not be compared, all data is therefore effectively "new"
				// so first perform a remove of all existing data then do an insert on all new data
				if (this.debug()) {
					console.log('ForerunnerDB.OldView: Old and new data are from different collections...');
				}
				removed = oldData.find();

				if (removed.length) {
					this._onRemove(removed);
					operated = true;
				}

				inserted = newData.find();

				if (inserted.length) {
					this._onInsert(inserted);
					operated = true;
				}
			}
		} else {
			// Force an update as if the view never got created by padding all elements
			// to the insert
			if (this.debug()) {
				console.log('ForerunnerDB.OldView: Forcing data update', newDataArr);
			}

			this._data = this._from.subset(this._query.query, this._query.options);
			newDataArr = this._data.find();

			if (this.debug()) {
				console.log('ForerunnerDB.OldView: Emitting change event with data', newDataArr);
			}
			this._onInsert(newDataArr, []);
		}

		if (this.debug()) { console.log('ForerunnerDB.OldView: Emitting change'); }
		this.emit('change');
	}

	return this;
};

/**
 * Returns the number of documents currently in the view.
 * @returns {Number}
 */
OldView.prototype.count = function () {
	return this._data && this._data._data ? this._data._data.length : 0;
};

/**
 * Queries the view data. See Collection.find() for more information.
 * @returns {*}
 */
OldView.prototype.find = function () {
	if (this._data) {
		if (this.debug()) {
			console.log('ForerunnerDB.OldView: Finding data in view collection...', this._data);
		}

		return this._data.find.apply(this._data, arguments);
	} else {
		return [];
	}
};

/**
 * Inserts into view data via the view collection. See Collection.insert() for more information.
 * @returns {*}
 */
OldView.prototype.insert = function () {
	if (this._from) {
		// Pass the args through to the from object
		return this._from.insert.apply(this._from, arguments);
	} else {
		return [];
	}
};

/**
 * Updates into view data via the view collection. See Collection.update() for more information.
 * @returns {*}
 */
OldView.prototype.update = function () {
	if (this._from) {
		// Pass the args through to the from object
		return this._from.update.apply(this._from, arguments);
	} else {
		return [];
	}
};

/**
 * Removed from view data via the view collection. See Collection.remove() for more information.
 * @returns {*}
 */
OldView.prototype.remove = function () {
	if (this._from) {
		// Pass the args through to the from object
		return this._from.remove.apply(this._from, arguments);
	} else {
		return [];
	}
};

OldView.prototype._onSetData = function (newDataArr, oldDataArr) {
	this.emit('remove', oldDataArr, []);
	this.emit('insert', newDataArr, []);
	//this.refresh();
};

OldView.prototype._onInsert = function (successArr, failArr) {
	this.emit('insert', successArr, failArr);
	//this.refresh();
};

OldView.prototype._onUpdate = function (successArr, failArr) {
	this.emit('update', successArr, failArr);
	//this.refresh();
};

OldView.prototype._onRemove = function (successArr, failArr) {
	this.emit('remove', successArr, failArr);
	//this.refresh();
};

OldView.prototype._onChange = function () {
	if (this.debug()) { console.log('ForerunnerDB.OldView: Refreshing data'); }
	this.refresh();
};

// Extend collection with view init
Collection.prototype.init = function () {
	this._oldViews = [];
	CollectionInit.apply(this, arguments);
};

/**
 * Adds a view to the internal view lookup.
 * @param {View} view The view to add.
 * @returns {Collection}
 * @private
 */
Collection.prototype._addOldView = function (view) {
	if (view !== undefined) {
		this._oldViews[view._name] = view;
	}

	return this;
};

/**
 * Removes a view from the internal view lookup.
 * @param {View} view The view to remove.
 * @returns {Collection}
 * @private
 */
Collection.prototype._removeOldView = function (view) {
	if (view !== undefined) {
		delete this._oldViews[view._name];
	}

	return this;
};

// Extend collection with view init
CollectionGroup.prototype.init = function () {
	this._oldViews = [];
	CollectionGroupInit.apply(this, arguments);
};

/**
 * Adds a view to the internal view lookup.
 * @param {View} view The view to add.
 * @returns {Collection}
 * @private
 */
CollectionGroup.prototype._addOldView = function (view) {
	if (view !== undefined) {
		this._oldViews[view._name] = view;
	}

	return this;
};

/**
 * Removes a view from the internal view lookup.
 * @param {View} view The view to remove.
 * @returns {Collection}
 * @private
 */
CollectionGroup.prototype._removeOldView = function (view) {
	if (view !== undefined) {
		delete this._oldViews[view._name];
	}

	return this;
};

// Extend DB with views init
Core.prototype.init = function () {
	this._oldViews = {};
	CoreInit.apply(this, arguments);
};

/**
 * Gets a view by it's name.
 * @param {String} viewName The name of the view to retrieve.
 * @returns {*}
 */
Core.prototype.oldView = function (viewName) {
	if (!this._oldViews[viewName]) {
		if (this.debug()) {
			console.log('ForerunnerDB.OldView: Creating view ' + viewName);
		}
	}

	this._oldViews[viewName] = this._oldViews[viewName] || new OldView(viewName).db(this);
	return this._oldViews[viewName];
};

/**
 * Determine if a view with the passed name already exists.
 * @param {String} viewName The name of the view to check for.
 * @returns {boolean}
 */
Core.prototype.oldViewExists = function (viewName) {
	return Boolean(this._oldViews[viewName]);
};

/**
 * Returns an array of views the DB currently has.
 * @returns {Array} An array of objects containing details of each view
 * the database is currently managing.
 */
Core.prototype.oldViews = function () {
	var arr = [],
		i;

	for (i in this._oldViews) {
		if (this._oldViews.hasOwnProperty(i)) {
			arr.push({
				name: i,
				count: this._oldViews[i].count()
			});
		}
	}

	return arr;
};

module.exports = OldView;
},{"./Collection":2,"./CollectionGroup":3,"./Overload":13,"./Shared":16}],12:[function(require,module,exports){
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

Shared.modules.Operation = Operation;

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
},{"./Path":14,"./Shared":16}],13:[function(require,module,exports){
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

Shared.modules.Overload = Overload;

module.exports = Overload;
},{"./Shared":16}],14:[function(require,module,exports){
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

Shared.modules.Path = Path;

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
},{"./Shared":16}],15:[function(require,module,exports){
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

Shared.modules.Persist = Persist;

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
},{"./Collection":2,"./CollectionGroup":3,"./Overload":13,"./Shared":16}],16:[function(require,module,exports){
var Shared = {
	idCounter: 0,
	modules: {},
	prototypes: {}
};

module.exports = Shared;
},{}],17:[function(require,module,exports){
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

Shared.modules.View = View;

Collection = require('./Collection');
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
		$.observable(pubData._data).refresh(sortedData);
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
Collection.prototype._addView = function (view) {
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
Collection.prototype._removeView = function (view) {
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
},{"./Collection":2,"./Overload":13,"./Shared":16}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9idWlsZHMvYWxsLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL0NvbGxlY3Rpb24uanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvQ29sbGVjdGlvbkdyb3VwLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL0NvcmUuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvQ3JjLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL0hpZ2hjaGFydHMuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvSW5kZXguanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvS2V5VmFsdWVTdG9yZS5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9NZXRyaWNzLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL09sZFZpZXcuQmluZC5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9PbGRWaWV3LmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL09wZXJhdGlvbi5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9PdmVybG9hZC5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9QYXRoLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL1BlcnNpc3QuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvU2hhcmVkLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL1ZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyNEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25ZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3paQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENvcmUgPSByZXF1aXJlKCcuLi9saWIvQ29yZScpLFxuXHRDb2xsZWN0aW9uR3JvdXAgPSByZXF1aXJlKCcuLi9saWIvQ29sbGVjdGlvbkdyb3VwJyksXG5cdFZpZXcgPSByZXF1aXJlKCcuLi9saWIvVmlldycpLFxuXHRPbGRWaWV3ID0gcmVxdWlyZSgnLi4vbGliL09sZFZpZXcnKSxcblx0T2xkVmlld0JpbmQgPSByZXF1aXJlKCcuLi9saWIvT2xkVmlldy5CaW5kJyksXG5cdEhpZ2hjaGFydHMgPSByZXF1aXJlKCcuLi9saWIvSGlnaGNoYXJ0cycpLFxuXHRQZXJzaXN0ID0gcmVxdWlyZSgnLi4vbGliL1BlcnNpc3QnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb3JlO1xud2luZG93WydGb3JlcnVubmVyREInXSA9IENvcmU7IiwidmFyIFNoYXJlZCxcblx0Q29yZSxcblx0T3ZlcmxvYWQsXG5cdE1ldHJpY3MsXG5cdEtleVZhbHVlU3RvcmUsXG5cdFBhdGgsXG5cdEluZGV4LFxuXHRDcmM7XG5cblNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyk7XG5cbi8qKlxuICogQ29sbGVjdGlvbiBvYmplY3QgdXNlZCB0byBzdG9yZSBkYXRhLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBDb2xsZWN0aW9uID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0dGhpcy5fcHJpbWFyeUtleSA9ICdfaWQnO1xuXHR0aGlzLl9wcmltYXJ5SW5kZXggPSBuZXcgS2V5VmFsdWVTdG9yZSgncHJpbWFyeScpO1xuXHR0aGlzLl9wcmltYXJ5Q3JjID0gbmV3IEtleVZhbHVlU3RvcmUoJ3ByaW1hcnlDcmMnKTtcblx0dGhpcy5fY3JjTG9va3VwID0gbmV3IEtleVZhbHVlU3RvcmUoJ2NyY0xvb2t1cCcpO1xuXHR0aGlzLl9uYW1lID0gbmFtZTtcblx0dGhpcy5fZGF0YSA9IFtdO1xuXHR0aGlzLl9ncm91cHMgPSBbXTtcblx0dGhpcy5fbWV0cmljcyA9IG5ldyBNZXRyaWNzKCk7XG5cdHRoaXMuX2xpbmtlZCA9IDA7XG5cdHRoaXMuX2RlYnVnID0ge307XG5cblx0dGhpcy5fZGVmZXJRdWV1ZSA9IHtcblx0XHRpbnNlcnQ6IFtdLFxuXHRcdHVwZGF0ZTogW10sXG5cdFx0cmVtb3ZlOiBbXSxcblx0XHR1cHNlcnQ6IFtdXG5cdH07XG5cblx0dGhpcy5fZGVmZXJUaHJlc2hvbGQgPSB7XG5cdFx0aW5zZXJ0OiAxMDAsXG5cdFx0dXBkYXRlOiAxMDAsXG5cdFx0cmVtb3ZlOiAxMDAsXG5cdFx0dXBzZXJ0OiAxMDBcblx0fTtcblxuXHR0aGlzLl9kZWZlclRpbWUgPSB7XG5cdFx0aW5zZXJ0OiAxLFxuXHRcdHVwZGF0ZTogMSxcblx0XHRyZW1vdmU6IDEsXG5cdFx0dXBzZXJ0OiAxXG5cdH07XG5cblx0Ly8gU2V0IHRoZSBzdWJzZXQgdG8gaXRzZWxmIHNpbmNlIGl0IGlzIHRoZSByb290IGNvbGxlY3Rpb25cblx0dGhpcy5fc3Vic2V0T2YodGhpcyk7XG59O1xuXG5TaGFyZWQubW9kdWxlcy5Db2xsZWN0aW9uID0gQ29sbGVjdGlvbjtcblxuT3ZlcmxvYWQgPSByZXF1aXJlKCcuL092ZXJsb2FkJyk7XG5NZXRyaWNzID0gcmVxdWlyZSgnLi9NZXRyaWNzJyk7XG5LZXlWYWx1ZVN0b3JlID0gcmVxdWlyZSgnLi9LZXlWYWx1ZVN0b3JlJyk7XG5QYXRoID0gcmVxdWlyZSgnLi9QYXRoJyk7XG5JbmRleCA9IHJlcXVpcmUoJy4vSW5kZXgnKTtcbkNyYyA9IHJlcXVpcmUoJy4vQ3JjJyk7XG5Db3JlID0gU2hhcmVkLm1vZHVsZXMuQ29yZTtcblxuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGVidWcgPSBuZXcgT3ZlcmxvYWQoW1xuXHRmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2RlYnVnLmFsbDtcblx0fSxcblxuXHRmdW5jdGlvbiAodmFsKSB7XG5cdFx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRpZiAodHlwZW9mIHZhbCA9PT0gJ2Jvb2xlYW4nKSB7XG5cdFx0XHRcdHRoaXMuX2RlYnVnLmFsbCA9IHZhbDtcblxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHZpZXdzIHRvIHVzZSB0aGlzIGRlYnVnIHNldHRpbmdcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl92aWV3cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHRoaXMuX3ZpZXdzW2ldLmRlYnVnKHZhbCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fZGVidWdbdmFsXSB8fCAodGhpcy5fZGIgJiYgdGhpcy5fZGIuX2RlYnVnICYmIHRoaXMuX2RiLl9kZWJ1Z1t2YWxdKSB8fCB0aGlzLl9kZWJ1Zy5hbGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2RlYnVnLmFsbDtcblx0fSxcblxuXHRmdW5jdGlvbiAodHlwZSwgdmFsKSB7XG5cdFx0aWYgKHR5cGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHRoaXMuX2RlYnVnW3R5cGVdID0gdmFsO1xuXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdmlld3MgdG8gdXNlIHRoaXMgZGVidWcgc2V0dGluZ1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3ZpZXdzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0dGhpcy5fdmlld3NbaV0uZGVidWcodHlwZSwgdmFsKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuX2RlYnVnW3R5cGVdIHx8ICh0aGlzLl9kYiAmJiB0aGlzLl9kYi5fZGVidWcgJiYgdGhpcy5fZGIuX2RlYnVnW3R5cGVdKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5fZGVidWcuYWxsO1xuXHR9XG5dKTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgY2hlY2tzdW0gb2YgYSBzdHJpbmcuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gY2hlY2tzdW0uXG4gKiBAcmV0dXJuIHtTdHJpbmd9IFRoZSBjaGVja3N1bSBnZW5lcmF0ZWQuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmNyYyA9IENyYztcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWwgVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24gdG8gc2V0LlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLm5hbWUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX25hbWUgPSB2YWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fbmFtZTtcbn07XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlLm9uID0gbmV3IE92ZXJsb2FkKFtcblx0ZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cdFx0dGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSB8fCBbXTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10ucHVzaChsaXN0ZW5lcik7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmdW5jdGlvbihldmVudCwgaWQsIGxpc3RlbmVyKSB7XG5cdFx0dGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtpZF0gfHwgW107XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtpZF0ucHVzaChsaXN0ZW5lcik7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXSk7XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlLm9mZiA9IG5ldyBPdmVybG9hZChbXG5cdGZ1bmN0aW9uIChldmVudCkge1xuXHRcdGlmICh0aGlzLl9saXN0ZW5lcnMgJiYgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSAmJiBldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHRcdGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXHRcdHZhciBhcnIsXG5cdFx0XHRpbmRleDtcblxuXHRcdGlmICh0eXBlb2YobGlzdGVuZXIpID09PSAnc3RyaW5nJykge1xuXHRcdFx0aWYgKHRoaXMuX2xpc3RlbmVycyAmJiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdICYmIHRoaXMuX2xpc3RlbmVyc1tldmVudF1bbGlzdGVuZXJdKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2xpc3RlbmVyXTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdFx0XHRhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ107XG5cdFx0XHRcdGluZGV4ID0gYXJyLmluZGV4T2YobGlzdGVuZXIpO1xuXG5cdFx0XHRcdGlmIChpbmRleCA+IC0xKSB7XG5cdFx0XHRcdFx0YXJyLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmdW5jdGlvbiAoZXZlbnQsIGlkLCBsaXN0ZW5lcikge1xuXHRcdGlmICh0aGlzLl9saXN0ZW5lcnMgJiYgZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0XHR2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtpZF0sXG5cdFx0XHRcdGluZGV4ID0gYXJyLmluZGV4T2YobGlzdGVuZXIpO1xuXG5cdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRhcnIuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbl0pO1xuXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQsIGRhdGEpIHtcblx0dGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXG5cdGlmIChldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHQvLyBIYW5kbGUgZ2xvYmFsIGVtaXRcblx0XHRpZiAodGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddKSB7XG5cdFx0XHR2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddLFxuXHRcdFx0XHRhcnJDb3VudCA9IGFyci5sZW5ndGgsXG5cdFx0XHRcdGFyckluZGV4O1xuXG5cdFx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdFx0XHRhcnJbYXJySW5kZXhdLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEhhbmRsZSBpbmRpdmlkdWFsIGVtaXRcblx0XHRpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHQvLyBDaGVjayBpZiB0aGUgYXJyYXkgaXMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBpbiB0aGUgY29sbGVjdGlvblxuXHRcdFx0aWYgKGRhdGFbMF0gJiYgZGF0YVswXVt0aGlzLl9wcmltYXJ5S2V5XSkge1xuXHRcdFx0XHQvLyBMb29wIHRoZSBhcnJheSBhbmQgY2hlY2sgZm9yIGxpc3RlbmVycyBhZ2FpbnN0IHRoZSBwcmltYXJ5IGtleVxuXHRcdFx0XHR2YXIgbGlzdGVuZXJJZEFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF0sXG5cdFx0XHRcdFx0bGlzdGVuZXJJZENvdW50LFxuXHRcdFx0XHRcdGxpc3RlbmVySWRJbmRleDtcblxuXHRcdFx0XHRhcnJDb3VudCA9IGRhdGEubGVuZ3RoO1xuXG5cdFx0XHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGFyckNvdW50OyBhcnJJbmRleCsrKSB7XG5cdFx0XHRcdFx0aWYgKGxpc3RlbmVySWRBcnJbZGF0YVthcnJJbmRleF1bdGhpcy5fcHJpbWFyeUtleV1dKSB7XG5cdFx0XHRcdFx0XHQvLyBFbWl0IGZvciB0aGlzIGlkXG5cdFx0XHRcdFx0XHRsaXN0ZW5lcklkQ291bnQgPSBsaXN0ZW5lcklkQXJyW2RhdGFbYXJySW5kZXhdW3RoaXMuX3ByaW1hcnlLZXldXS5sZW5ndGg7XG5cdFx0XHRcdFx0XHRmb3IgKGxpc3RlbmVySWRJbmRleCA9IDA7IGxpc3RlbmVySWRJbmRleCA8IGxpc3RlbmVySWRDb3VudDsgbGlzdGVuZXJJZEluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0bGlzdGVuZXJJZEFycltkYXRhW2FyckluZGV4XVt0aGlzLl9wcmltYXJ5S2V5XV1bbGlzdGVuZXJJZEluZGV4XS5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRHJvcHMgYSBjb2xsZWN0aW9uIGFuZCBhbGwgaXQncyBzdG9yZWQgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIG9uIHN1Y2Nlc3MsIGZhbHNlIG9uIGZhaWx1cmUuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9kYiAmJiB0aGlzLl9uYW1lKSB7XG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0Ryb3BwaW5nIGNvbGxlY3Rpb24gJyArIHRoaXMuX25hbWUpO1xuXHRcdH1cblxuXHRcdHRoaXMuZW1pdCgnZHJvcCcpO1xuXG5cdFx0ZGVsZXRlIHRoaXMuX2RiLl9jb2xsZWN0aW9uW3RoaXMuX25hbWVdO1xuXG5cdFx0dmFyIGdyb3VwQXJyID0gW10sXG5cdFx0XHRpO1xuXG5cdFx0Ly8gQ29weSB0aGUgZ3JvdXAgYXJyYXkgYmVjYXVzZSBpZiB3ZSBjYWxsIHJlbW92ZUNvbGxlY3Rpb24gb24gYSBncm91cFxuXHRcdC8vIGl0IHdpbGwgYWx0ZXIgdGhlIGdyb3VwcyBhcnJheSBvZiB0aGlzIGNvbGxlY3Rpb24gbWlkLWxvb3AhXG5cdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuX2dyb3Vwcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0Z3JvdXBBcnIucHVzaCh0aGlzLl9ncm91cHNbaV0pO1xuXHRcdH1cblxuXHRcdC8vIExvb3AgYW55IGdyb3VwcyB3ZSBhcmUgcGFydCBvZiBhbmQgcmVtb3ZlIG91cnNlbHZlcyBmcm9tIHRoZW1cblx0XHRmb3IgKGkgPSAwOyBpIDwgZ3JvdXBBcnIubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRoaXMuX2dyb3Vwc1tpXS5yZW1vdmVDb2xsZWN0aW9uKHRoaXMpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgcHJpbWFyeSBrZXkgZm9yIHRoaXMgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nPX0ga2V5TmFtZSBUaGUgbmFtZSBvZiB0aGUgcHJpbWFyeSBrZXkuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucHJpbWFyeUtleSA9IGZ1bmN0aW9uIChrZXlOYW1lKSB7XG5cdGlmIChrZXlOYW1lICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9wcmltYXJ5S2V5ID0ga2V5TmFtZTtcblxuXHRcdC8vIFNldCB0aGUgcHJpbWFyeSBrZXkgaW5kZXggcHJpbWFyeSBrZXlcblx0XHR0aGlzLl9wcmltYXJ5SW5kZXgucHJpbWFyeUtleShrZXlOYW1lKTtcblxuXHRcdC8vIFJlYnVpbGQgdGhlIHByaW1hcnkga2V5IGluZGV4XG5cdFx0dGhpcy5fcmVidWlsZFByaW1hcnlLZXlJbmRleCgpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX3ByaW1hcnlLZXk7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgaW5zZXJ0IGV2ZW50cyBhbmQgcm91dGVzIGNoYW5nZXMgdG8gYmluZHMgYW5kIHZpZXdzIGFzIHJlcXVpcmVkLlxuICogQHBhcmFtIHtBcnJheX0gaW5zZXJ0ZWQgQW4gYXJyYXkgb2YgaW5zZXJ0ZWQgZG9jdW1lbnRzLlxuICogQHBhcmFtIHtBcnJheX0gZmFpbGVkIEFuIGFycmF5IG9mIGRvY3VtZW50cyB0aGF0IGZhaWxlZCB0byBpbnNlcnQuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fb25JbnNlcnQgPSBmdW5jdGlvbiAoaW5zZXJ0ZWQsIGZhaWxlZCkge1xuXHR0aGlzLmVtaXQoJ2luc2VydCcsIGluc2VydGVkLCBmYWlsZWQpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHVwZGF0ZSBldmVudHMgYW5kIHJvdXRlcyBjaGFuZ2VzIHRvIGJpbmRzIGFuZCB2aWV3cyBhcyByZXF1aXJlZC5cbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1zIEFuIGFycmF5IG9mIHVwZGF0ZWQgZG9jdW1lbnRzLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX29uVXBkYXRlID0gZnVuY3Rpb24gKGl0ZW1zKSB7XG5cdHRoaXMuZW1pdCgndXBkYXRlJywgaXRlbXMpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIHJlbW92ZSBldmVudHMgYW5kIHJvdXRlcyBjaGFuZ2VzIHRvIGJpbmRzIGFuZCB2aWV3cyBhcyByZXF1aXJlZC5cbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1zIEFuIGFycmF5IG9mIHJlbW92ZWQgZG9jdW1lbnRzLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX29uUmVtb3ZlID0gZnVuY3Rpb24gKGl0ZW1zKSB7XG5cdHRoaXMuZW1pdCgncmVtb3ZlJywgaXRlbXMpO1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgZGIgaW5zdGFuY2UgdGhlIGNvbGxlY3Rpb24gYmVsb25ncyB0by5cbiAqIEBwYXJhbSB7REJ9IGRiIFRoZSBkYiBpbnN0YW5jZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5kYiA9IGZ1bmN0aW9uIChkYikge1xuXHRpZiAoZGIgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2RiID0gZGI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fZGI7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGNvbGxlY3Rpb24ncyBkYXRhIHRvIHRoZSBhcnJheSBvZiBkb2N1bWVudHMgcGFzc2VkLlxuICogQHBhcmFtIGRhdGFcbiAqIEBwYXJhbSBvcHRpb25zIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIGNhbGxiYWNrIE9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zZXREYXRhID0gZnVuY3Rpb24gKGRhdGEsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG5cdGlmIChkYXRhKSB7XG5cdFx0dmFyIG9wID0gdGhpcy5fbWV0cmljcy5jcmVhdGUoJ3NldERhdGEnKTtcblx0XHRvcC5zdGFydCgpO1xuXG5cdFx0aWYgKCEoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSkge1xuXHRcdFx0ZGF0YSA9IFtkYXRhXTtcblx0XHR9XG5cblx0XHRvcC50aW1lKCd0cmFuc2Zvcm1JbicpO1xuXHRcdGRhdGEgPSB0aGlzLnRyYW5zZm9ybUluKGRhdGEpO1xuXHRcdG9wLnRpbWUoJ3RyYW5zZm9ybUluJyk7XG5cblx0XHR2YXIgb2xkRGF0YSA9IHRoaXMuX2RhdGE7XG5cblx0XHQvLyBPdmVyd3JpdGUgdGhlIGRhdGFcblx0XHR0aGlzLl9kYXRhID0gW107XG5cblx0XHRpZiAoZGF0YS5sZW5ndGgpIHtcblx0XHRcdHRoaXMuX2RhdGEgPSB0aGlzLl9kYXRhLmNvbmNhdChkYXRhKTtcblx0XHR9XG5cblx0XHQvLyBVcGRhdGUgdGhlIHByaW1hcnkga2V5IGluZGV4XG5cdFx0b3AudGltZSgnX3JlYnVpbGRQcmltYXJ5S2V5SW5kZXgnKTtcblx0XHR0aGlzLl9yZWJ1aWxkUHJpbWFyeUtleUluZGV4KG9wdGlvbnMpO1xuXHRcdG9wLnRpbWUoJ19yZWJ1aWxkUHJpbWFyeUtleUluZGV4Jyk7XG5cblx0XHRvcC5zdG9wKCk7XG5cblx0XHR0aGlzLmVtaXQoJ3NldERhdGEnLCB0aGlzLl9kYXRhLCBvbGREYXRhKTtcblx0fVxuXG5cdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjayhmYWxzZSk7IH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRHJvcHMgYW5kIHJlYnVpbGRzIHRoZSBwcmltYXJ5IGtleSBpbmRleCBmb3IgYWxsIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9ucyBBbiBvcHRpb25hbCBvcHRpb25zIG9iamVjdC5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9yZWJ1aWxkUHJpbWFyeUtleUluZGV4ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0dmFyIGVuc3VyZUtleXMgPSBvcHRpb25zICYmIG9wdGlvbnMuZW5zdXJlS2V5cyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5lbnN1cmVLZXlzIDogdHJ1ZSxcblx0XHR2aW9sYXRpb25DaGVjayA9IG9wdGlvbnMgJiYgb3B0aW9ucy52aW9sYXRpb25DaGVjayAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy52aW9sYXRpb25DaGVjayA6IHRydWUsXG5cdFx0YXJyLFxuXHRcdGFyckNvdW50LFxuXHRcdGFyckl0ZW0sXG5cdFx0cEluZGV4ID0gdGhpcy5fcHJpbWFyeUluZGV4LFxuXHRcdGNyY0luZGV4ID0gdGhpcy5fcHJpbWFyeUNyYyxcblx0XHRjcmNMb29rdXAgPSB0aGlzLl9jcmNMb29rdXAsXG5cdFx0cEtleSA9IHRoaXMuX3ByaW1hcnlLZXksXG5cdFx0alN0cmluZztcblxuXHQvLyBEcm9wIHRoZSBleGlzdGluZyBwcmltYXJ5IGluZGV4XG5cdHBJbmRleC50cnVuY2F0ZSgpO1xuXHRjcmNJbmRleC50cnVuY2F0ZSgpO1xuXHRjcmNMb29rdXAudHJ1bmNhdGUoKTtcblxuXHQvLyBMb29wIHRoZSBkYXRhIGFuZCBjaGVjayBmb3IgYSBwcmltYXJ5IGtleSBpbiBlYWNoIG9iamVjdFxuXHRhcnIgPSB0aGlzLl9kYXRhO1xuXHRhcnJDb3VudCA9IGFyci5sZW5ndGg7XG5cblx0d2hpbGUgKGFyckNvdW50LS0pIHtcblx0XHRhcnJJdGVtID0gYXJyW2FyckNvdW50XTtcblxuXHRcdGlmIChlbnN1cmVLZXlzKSB7XG5cdFx0XHQvLyBNYWtlIHN1cmUgdGhlIGl0ZW0gaGFzIGEgcHJpbWFyeSBrZXlcblx0XHRcdHRoaXMuX2Vuc3VyZVByaW1hcnlLZXkoYXJySXRlbSk7XG5cdFx0fVxuXG5cdFx0aWYgKHZpb2xhdGlvbkNoZWNrKSB7XG5cdFx0XHQvLyBDaGVjayBmb3IgcHJpbWFyeSBrZXkgdmlvbGF0aW9uXG5cdFx0XHRpZiAoIXBJbmRleC51bmlxdWVTZXQoYXJySXRlbVtwS2V5XSwgYXJySXRlbSkpIHtcblx0XHRcdFx0Ly8gUHJpbWFyeSBrZXkgdmlvbGF0aW9uXG5cdFx0XHRcdHRocm93KCdDYWxsIHRvIHNldERhdGEgZmFpbGVkIGJlY2F1c2UgeW91ciBkYXRhIHZpb2xhdGVzIHRoZSBwcmltYXJ5IGtleSB1bmlxdWUgY29uc3RyYWludC4gT25lIG9yIG1vcmUgZG9jdW1lbnRzIGFyZSB1c2luZyB0aGUgc2FtZSBwcmltYXJ5IGtleTogJyArIGFyckl0ZW1bdGhpcy5fcHJpbWFyeUtleV0pO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRqU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoYXJySXRlbSk7XG5cdFx0XHRwSW5kZXguc2V0KGFyckl0ZW1bcEtleV0sIGFyckl0ZW0pO1xuXHRcdFx0Y3JjSW5kZXguc2V0KGFyckl0ZW1bcEtleV0sIGpTdHJpbmcpO1xuXHRcdFx0Y3JjTG9va3VwLnNldChqU3RyaW5nLCBhcnJJdGVtKTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogQ2hlY2tzIGZvciBhIHByaW1hcnkga2V5IG9uIHRoZSBkb2N1bWVudCBhbmQgYXNzaWducyBvbmUgaWYgbm9uZVxuICogY3VycmVudGx5IGV4aXN0cy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBjaGVjayBhIHByaW1hcnkga2V5IGFnYWluc3QuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fZW5zdXJlUHJpbWFyeUtleSA9IGZ1bmN0aW9uIChvYmopIHtcblx0aWYgKG9ialt0aGlzLl9wcmltYXJ5S2V5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gQXNzaWduIGEgcHJpbWFyeSBrZXkgYXV0b21hdGljYWxseVxuXHRcdG9ialt0aGlzLl9wcmltYXJ5S2V5XSA9IHRoaXMub2JqZWN0SWQoKTtcblx0fVxufTtcblxuLyoqXG4gKiBDbGVhcnMgYWxsIGRhdGEgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS50cnVuY2F0ZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5lbWl0KCd0cnVuY2F0ZScsIHRoaXMuX2RhdGEpO1xuXHR0aGlzLl9kYXRhLmxlbmd0aCA9IDA7XG5cblx0dGhpcy5kZWZlckVtaXQoJ2NoYW5nZScpO1xuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTW9kaWZpZXMgYW4gZXhpc3RpbmcgZG9jdW1lbnQgb3IgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbi4gVGhpcyB3aWxsIHVwZGF0ZVxuICogYWxsIG1hdGNoZXMgZm9yICdxdWVyeScgd2l0aCB0aGUgZGF0YSBoZWxkIGluICd1cGRhdGUnLiBJdCB3aWxsIG5vdCBvdmVyd3JpdGVcbiAqIHRoZSBtYXRjaGVkIGRvY3VtZW50cyB3aXRoIHRoZSB1cGRhdGUgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgZG9jdW1lbnQgb2JqZWN0IHRvIHVwc2VydCBvciBhbiBhcnJheSBjb250YWluaW5nXG4gKiBkb2N1bWVudHMgdG8gdXBzZXJ0LlxuICpcbiAqIElmIHRoZSBkb2N1bWVudCBjb250YWlucyBhIHByaW1hcnkga2V5IGZpZWxkIChiYXNlZCBvbiB0aGUgY29sbGVjdGlvbnMncyBwcmltYXJ5XG4gKiBrZXkpIHRoZW4gdGhlIGRhdGFiYXNlIHdpbGwgc2VhcmNoIGZvciBhbiBleGlzdGluZyBkb2N1bWVudCB3aXRoIGEgbWF0Y2hpbmcgaWQuXG4gKiBJZiBhIG1hdGNoaW5nIGRvY3VtZW50IGlzIGZvdW5kLCB0aGUgZG9jdW1lbnQgd2lsbCBiZSB1cGRhdGVkLiBBbnkga2V5cyB0aGF0XG4gKiBtYXRjaCBrZXlzIG9uIHRoZSBleGlzdGluZyBkb2N1bWVudCB3aWxsIGJlIG92ZXJ3cml0dGVuIHdpdGggbmV3IGRhdGEuIEFueSBrZXlzXG4gKiB0aGF0IGRvIG5vdCBjdXJyZW50bHkgZXhpc3Qgb24gdGhlIGRvY3VtZW50IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGRvY3VtZW50LlxuICpcbiAqIElmIHRoZSBkb2N1bWVudCBkb2VzIG5vdCBjb250YWluIGFuIGlkIG9yIHRoZSBpZCBwYXNzZWQgZG9lcyBub3QgbWF0Y2ggYW4gZXhpc3RpbmdcbiAqIGRvY3VtZW50LCBhbiBpbnNlcnQgaXMgcGVyZm9ybWVkIGluc3RlYWQuIElmIG5vIGlkIGlzIHByZXNlbnQgYSBuZXcgcHJpbWFyeSBrZXlcbiAqIGlkIGlzIHByb3ZpZGVkIGZvciB0aGUgaXRlbS5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9uPX0gY2FsbGJhY2sgT3B0aW9uYWwgY2FsbGJhY2sgbWV0aG9kLlxuICogQHJldHVybnMge09iamVjdH0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdHdvIGtleXMsIFwib3BcIiBjb250YWlucyBlaXRoZXIgXCJpbnNlcnRcIiBvclxuICogXCJ1cGRhdGVcIiBkZXBlbmRpbmcgb24gdGhlIHR5cGUgb2Ygb3BlcmF0aW9uIHRoYXQgd2FzIHBlcmZvcm1lZCBhbmQgXCJyZXN1bHRcIlxuICogY29udGFpbnMgdGhlIHJldHVybiBkYXRhIGZyb20gdGhlIG9wZXJhdGlvbiB1c2VkLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS51cHNlcnQgPSBmdW5jdGlvbiAob2JqLCBjYWxsYmFjaykge1xuXHRpZiAob2JqKSB7XG5cdFx0dmFyIHF1ZXVlID0gdGhpcy5fZGVmZXJRdWV1ZS51cHNlcnQsXG5cdFx0XHRkZWZlclRocmVzaG9sZCA9IHRoaXMuX2RlZmVyVGhyZXNob2xkLnVwc2VydDtcblx0XHQvL2RlZmVyVGltZSA9IHRoaXMuX2RlZmVyVGltZS51cHNlcnQ7XG5cblx0XHR2YXIgcmV0dXJuRGF0YSA9IHt9LFxuXHRcdFx0cXVlcnksXG5cdFx0XHRpO1xuXG5cdFx0Ly8gRGV0ZXJtaW5lIGlmIHRoZSBvYmplY3QgcGFzc2VkIGlzIGFuIGFycmF5IG9yIG5vdFxuXHRcdGlmIChvYmogaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0aWYgKG9iai5sZW5ndGggPiBkZWZlclRocmVzaG9sZCkge1xuXHRcdFx0XHQvLyBCcmVhayB1cCB1cHNlcnQgaW50byBibG9ja3Ncblx0XHRcdFx0dGhpcy5fZGVmZXJRdWV1ZS51cHNlcnQgPSBxdWV1ZS5jb25jYXQob2JqKTtcblxuXHRcdFx0XHQvLyBGaXJlIG9mZiB0aGUgaW5zZXJ0IHF1ZXVlIGhhbmRsZXJcblx0XHRcdFx0dGhpcy5wcm9jZXNzUXVldWUoJ3Vwc2VydCcsIGNhbGxiYWNrKTtcblxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBMb29wIHRoZSBhcnJheSBhbmQgdXBzZXJ0IGVhY2ggaXRlbVxuXHRcdFx0XHRyZXR1cm5EYXRhID0gW107XG5cblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHJldHVybkRhdGEucHVzaCh0aGlzLnVwc2VydChvYmpbaV0pKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9XG5cblx0XHRcdFx0cmV0dXJuIHJldHVybkRhdGE7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gRGV0ZXJtaW5lIGlmIHRoZSBvcGVyYXRpb24gaXMgYW4gaW5zZXJ0IG9yIGFuIHVwZGF0ZVxuXHRcdGlmIChvYmpbdGhpcy5fcHJpbWFyeUtleV0pIHtcblx0XHRcdC8vIENoZWNrIGlmIGFuIG9iamVjdCB3aXRoIHRoaXMgcHJpbWFyeSBrZXkgYWxyZWFkeSBleGlzdHNcblx0XHRcdHF1ZXJ5ID0ge307XG5cdFx0XHRxdWVyeVt0aGlzLl9wcmltYXJ5S2V5XSA9IG9ialt0aGlzLl9wcmltYXJ5S2V5XTtcblxuXHRcdFx0Ly9UT0RPOiBDb3VsZCBiZSBvcHRpbWlzZWQgdG8gdXNlIHRoZSBwcmltYXJ5IGluZGV4IGxvb2t1cCBub3c/XG5cdFx0XHRpZiAodGhpcy5jb3VudChxdWVyeSkpIHtcblx0XHRcdFx0Ly8gVGhlIGRvY3VtZW50IGFscmVhZHkgZXhpc3RzIHdpdGggdGhpcyBpZCwgdGhpcyBvcGVyYXRpb24gaXMgYW4gdXBkYXRlXG5cdFx0XHRcdHJldHVybkRhdGEub3AgPSAndXBkYXRlJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIE5vIGRvY3VtZW50IHdpdGggdGhpcyBpZCBleGlzdHMsIHRoaXMgb3BlcmF0aW9uIGlzIGFuIGluc2VydFxuXHRcdFx0XHRyZXR1cm5EYXRhLm9wID0gJ2luc2VydCc7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFRoZSBkb2N1bWVudCBwYXNzZWQgZG9lcyBub3QgY29udGFpbiBhbiBpZCwgdGhpcyBvcGVyYXRpb24gaXMgYW4gaW5zZXJ0XG5cdFx0XHRyZXR1cm5EYXRhLm9wID0gJ2luc2VydCc7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChyZXR1cm5EYXRhLm9wKSB7XG5cdFx0XHRjYXNlICdpbnNlcnQnOlxuXHRcdFx0XHRyZXR1cm5EYXRhLnJlc3VsdCA9IHRoaXMuaW5zZXJ0KG9iaik7XG5cdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlICd1cGRhdGUnOlxuXHRcdFx0XHRyZXR1cm5EYXRhLnJlc3VsdCA9IHRoaXMudXBkYXRlKHF1ZXJ5LCBvYmopO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRyZXR1cm4gcmV0dXJuRGF0YTtcblx0fSBlbHNlIHtcblx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soKTsgfVxuXHR9XG5cblx0cmV0dXJuO1xufTtcblxuLyoqXG4gKiBNb2RpZmllcyBhbiBleGlzdGluZyBkb2N1bWVudCBvciBkb2N1bWVudHMgaW4gYSBjb2xsZWN0aW9uLiBUaGlzIHdpbGwgdXBkYXRlXG4gKiBhbGwgbWF0Y2hlcyBmb3IgJ3F1ZXJ5JyB3aXRoIHRoZSBkYXRhIGhlbGQgaW4gJ3VwZGF0ZScuIEl0IHdpbGwgbm90IG92ZXJ3cml0ZVxuICogdGhlIG1hdGNoZWQgZG9jdW1lbnRzIHdpdGggdGhlIHVwZGF0ZSBkb2N1bWVudC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgVGhlIHF1ZXJ5IHRoYXQgbXVzdCBiZSBtYXRjaGVkIGZvciBhIGRvY3VtZW50IHRvIGJlXG4gKiBvcGVyYXRlZCBvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGUgVGhlIG9iamVjdCBjb250YWluaW5nIHVwZGF0ZWQga2V5L3ZhbHVlcy4gQW55IGtleXMgdGhhdFxuICogbWF0Y2gga2V5cyBvbiB0aGUgZXhpc3RpbmcgZG9jdW1lbnQgd2lsbCBiZSBvdmVyd3JpdHRlbiB3aXRoIHRoaXMgZGF0YS4gQW55XG4gKiBrZXlzIHRoYXQgZG8gbm90IGN1cnJlbnRseSBleGlzdCBvbiB0aGUgZG9jdW1lbnQgd2lsbCBiZSBhZGRlZCB0byB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBpdGVtcyB0aGF0IHdlcmUgdXBkYXRlZC5cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKHF1ZXJ5LCB1cGRhdGUsIG9wdGlvbnMpIHtcblx0Ly8gRGVjb3VwbGUgdGhlIHVwZGF0ZSBkYXRhXG5cdHVwZGF0ZSA9IHRoaXMuZGVjb3VwbGUodXBkYXRlKTtcblxuXHQvLyBIYW5kbGUgdHJhbnNmb3JtXG5cdHVwZGF0ZSA9IHRoaXMudHJhbnNmb3JtSW4odXBkYXRlKTtcblxuXHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0Y29uc29sZS5sb2coJ1VwZGF0aW5nIHNvbWUgY29sbGVjdGlvbiBkYXRhIGZvciBjb2xsZWN0aW9uIFwiJyArIHRoaXMubmFtZSgpICsgJ1wiJyk7XG5cdH1cblxuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0b3AgPSB0aGlzLl9tZXRyaWNzLmNyZWF0ZSgndXBkYXRlJyksXG5cdFx0cEtleSA9IHRoaXMuX3ByaW1hcnlLZXksXG5cdFx0ZGF0YVNldCxcblx0XHR1cGRhdGVkLFxuXHRcdHVwZGF0ZUNhbGwgPSBmdW5jdGlvbiAoZG9jKSB7XG5cdFx0XHRpZiAodXBkYXRlICYmIHVwZGF0ZVtwS2V5XSAhPT0gdW5kZWZpbmVkICYmIHVwZGF0ZVtwS2V5XSAhPSBkb2NbcEtleV0pIHtcblx0XHRcdFx0Ly8gUmVtb3ZlIGl0ZW0gZnJvbSBwcmltYXJ5IGluZGV4XG5cdFx0XHRcdHNlbGYuX3ByaW1hcnlJbmRleC51blNldChkb2NbcEtleV0pO1xuXG5cdFx0XHRcdHZhciByZXN1bHQgPSBzZWxmLl91cGRhdGVPYmplY3QoZG9jLCB1cGRhdGUsIHF1ZXJ5LCBvcHRpb25zLCAnJyk7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBpdGVtIGluIHRoZSBwcmltYXJ5IGluZGV4XG5cdFx0XHRcdGlmIChzZWxmLl9wcmltYXJ5SW5kZXgudW5pcXVlU2V0KGRvY1twS2V5XSwgZG9jKSkge1xuXHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhyb3coJ1ByaW1hcnkga2V5IHZpb2xhdGlvbiBpbiB1cGRhdGUhIEtleSB2aW9sYXRlZDogJyArIGRvY1twS2V5XSk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBzZWxmLl91cGRhdGVPYmplY3QoZG9jLCB1cGRhdGUsIHF1ZXJ5LCBvcHRpb25zLCAnJyk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHR2aWV3cyA9IHRoaXMuX3ZpZXdzLFxuXHRcdHZpZXdJbmRleDtcblxuXHRvcC5zdGFydCgpO1xuXHRvcC50aW1lKCdSZXRyaWV2ZSBkb2N1bWVudHMgdG8gdXBkYXRlJyk7XG5cdGRhdGFTZXQgPSB0aGlzLmZpbmQocXVlcnksIHtkZWNvdXBsZTogZmFsc2V9KTtcblx0b3AudGltZSgnUmV0cmlldmUgZG9jdW1lbnRzIHRvIHVwZGF0ZScpO1xuXG5cdGlmIChkYXRhU2V0Lmxlbmd0aCkge1xuXHRcdG9wLnRpbWUoJ1VwZGF0ZSBkb2N1bWVudHMnKTtcblx0XHR1cGRhdGVkID0gZGF0YVNldC5maWx0ZXIodXBkYXRlQ2FsbCk7XG5cdFx0b3AudGltZSgnVXBkYXRlIGRvY3VtZW50cycpO1xuXG5cdFx0aWYgKHVwZGF0ZWQubGVuZ3RoKSB7XG5cdFx0XHQvLyBMb29wIHZpZXdzIGFuZCBwYXNzIHRoZW0gdGhlIHVwZGF0ZSBxdWVyeVxuXHRcdFx0aWYgKHZpZXdzICYmIHZpZXdzLmxlbmd0aCkge1xuXHRcdFx0XHRpZiAodGhpcy5kZWJ1Zygndmlld3MnKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdVcGRhdGluZyB2aWV3cyBmcm9tIGNvbGxlY3Rpb246ICcgKyB0aGlzLm5hbWUoKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0b3AudGltZSgnSW5mb3JtIHZpZXdzIG9mIHVwZGF0ZScpO1xuXHRcdFx0XHRmb3IgKHZpZXdJbmRleCA9IDA7IHZpZXdJbmRleCA8IHZpZXdzLmxlbmd0aDsgdmlld0luZGV4KyspIHtcblx0XHRcdFx0XHR2aWV3c1t2aWV3SW5kZXhdLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRvcC50aW1lKCdJbmZvcm0gdmlld3Mgb2YgdXBkYXRlJyk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX29uVXBkYXRlKHVwZGF0ZWQpO1xuXHRcdFx0dGhpcy5kZWZlckVtaXQoJ2NoYW5nZScsIHt0eXBlOiAndXBkYXRlJywgZGF0YTogdXBkYXRlZH0pO1xuXHRcdH1cblx0fVxuXG5cdG9wLnN0b3AoKTtcblxuXHRyZXR1cm4gdXBkYXRlZCB8fCBbXTtcbn07XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCB0byB1cGRhdGUgYSBkb2N1bWVudCBmcm9tIGl0J3MgaWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGUgVGhlIG9iamVjdCBjb250YWluaW5nIHRoZSBrZXkvdmFsdWVzIHRvIHVwZGF0ZSB0by5cbiAqIEByZXR1cm5zIHtBcnJheX0gVGhlIGl0ZW1zIHRoYXQgd2VyZSB1cGRhdGVkLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS51cGRhdGVCeUlkID0gZnVuY3Rpb24gKGlkLCB1cGRhdGUpIHtcblx0dmFyIHNlYXJjaE9iaiA9IHt9O1xuXHRzZWFyY2hPYmpbdGhpcy5fcHJpbWFyeUtleV0gPSBpZDtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHNlYXJjaE9iaiwgdXBkYXRlKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgbWV0aG9kIGZvciBkb2N1bWVudCB1cGRhdGluZy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGUgVGhlIG9iamVjdCB3aXRoIGtleS92YWx1ZSBwYWlycyB0byB1cGRhdGUgdGhlIGRvY3VtZW50IHdpdGguXG4gKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgVGhlIHF1ZXJ5IG9iamVjdCB0aGF0IHdlIG5lZWQgdG8gbWF0Y2ggdG8gcGVyZm9ybSBhbiB1cGRhdGUuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBBbiBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBjdXJyZW50IHJlY3Vyc2l2ZSBwYXRoLlxuICogQHBhcmFtIHtTdHJpbmd9IG9wVHlwZSBUaGUgdHlwZSBvZiB1cGRhdGUgb3BlcmF0aW9uIHRvIHBlcmZvcm0sIGlmIG5vbmUgaXMgc3BlY2lmaWVkXG4gKiBkZWZhdWx0IGlzIHRvIHNldCBuZXcgZGF0YSBhZ2FpbnN0IG1hdGNoaW5nIGZpZWxkcy5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSBkb2N1bWVudCB3YXMgdXBkYXRlZCB3aXRoIG5ldyAvIGNoYW5nZWQgZGF0YSBvclxuICogZmFsc2UgaWYgaXQgd2FzIG5vdCB1cGRhdGVkIGJlY2F1c2UgdGhlIGRhdGEgd2FzIHRoZSBzYW1lLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZU9iamVjdCA9IGZ1bmN0aW9uIChkb2MsIHVwZGF0ZSwgcXVlcnksIG9wdGlvbnMsIHBhdGgsIG9wVHlwZSkge1xuXHR1cGRhdGUgPSB0aGlzLmRlY291cGxlKHVwZGF0ZSk7XG5cblx0Ly8gQ2xlYXIgbGVhZGluZyBkb3RzIGZyb20gcGF0aFxuXHRwYXRoID0gcGF0aCB8fCAnJztcblx0aWYgKHBhdGguc3Vic3RyKDAsIDEpID09PSAnLicpIHsgcGF0aCA9IHBhdGguc3Vic3RyKDEsIHBhdGgubGVuZ3RoIC0xKTsgfVxuXG5cdHZhciB1cGRhdGVkID0gZmFsc2UsXG5cdFx0cmVjdXJzZVVwZGF0ZWQgPSBmYWxzZSxcblx0XHRvcGVyYXRpb24sXG5cdFx0dG1wQXJyYXksXG5cdFx0dG1wSW5kZXgsXG5cdFx0dG1wQ291bnQsXG5cdFx0cGF0aEluc3RhbmNlLFxuXHRcdHNvdXJjZUlzQXJyYXksXG5cdFx0dXBkYXRlSXNBcnJheSxcblx0XHRpLCBrO1xuXG5cdGZvciAoaSBpbiB1cGRhdGUpIHtcblx0XHRpZiAodXBkYXRlLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHQvLyBSZXNldCBvcGVyYXRpb24gZmxhZ1xuXHRcdFx0b3BlcmF0aW9uID0gZmFsc2U7XG5cblx0XHRcdC8vIENoZWNrIGlmIHRoZSBwcm9wZXJ0eSBzdGFydHMgd2l0aCBhIGRvbGxhciAoZnVuY3Rpb24pXG5cdFx0XHRpZiAoaS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuXHRcdFx0XHQvLyBDaGVjayBmb3IgY29tbWFuZHNcblx0XHRcdFx0c3dpdGNoIChpKSB7XG5cdFx0XHRcdFx0Y2FzZSAnJGluZGV4Jzpcblx0XHRcdFx0XHRcdC8vIElnbm9yZSAkaW5kZXggb3BlcmF0b3JzXG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRvcGVyYXRpb24gPSB0cnVlO1xuXHRcdFx0XHRcdFx0cmVjdXJzZVVwZGF0ZWQgPSB0aGlzLl91cGRhdGVPYmplY3QoZG9jLCB1cGRhdGVbaV0sIHF1ZXJ5LCBvcHRpb25zLCBwYXRoLCBpKTtcblx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVXBkYXRlZCkge1xuXHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIENoZWNrIGlmIHRoZSBrZXkgaGFzIGEgLiQgYXQgdGhlIGVuZCwgZGVub3RpbmcgYW4gYXJyYXkgbG9va3VwXG5cdFx0XHRpZiAodGhpcy5faXNQb3NpdGlvbmFsS2V5KGkpKSB7XG5cdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cblx0XHRcdFx0Ly8gTW9kaWZ5IGkgdG8gYmUgdGhlIG5hbWUgb2YgdGhlIGZpZWxkXG5cdFx0XHRcdGkgPSBpLnN1YnN0cigwLCBpLmxlbmd0aCAtIDIpO1xuXG5cdFx0XHRcdHBhdGhJbnN0YW5jZSA9IG5ldyBQYXRoKHBhdGggKyAnLicgKyBpKTtcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGUga2V5IGlzIGFuIGFycmF5IGFuZCBoYXMgaXRlbXNcblx0XHRcdFx0aWYgKGRvY1tpXSAmJiBkb2NbaV0gaW5zdGFuY2VvZiBBcnJheSAmJiBkb2NbaV0ubGVuZ3RoKSB7XG5cdFx0XHRcdFx0dG1wQXJyYXkgPSBbXTtcblxuXHRcdFx0XHRcdC8vIExvb3AgdGhlIGFycmF5IGFuZCBmaW5kIG1hdGNoZXMgdG8gb3VyIHNlYXJjaFxuXHRcdFx0XHRcdGZvciAodG1wSW5kZXggPSAwOyB0bXBJbmRleCA8IGRvY1tpXS5sZW5ndGg7IHRtcEluZGV4KyspIHtcblx0XHRcdFx0XHRcdGlmICh0aGlzLl9tYXRjaChkb2NbaV1bdG1wSW5kZXhdLCBwYXRoSW5zdGFuY2UudmFsdWUocXVlcnkpWzBdKSkge1xuXHRcdFx0XHRcdFx0XHR0bXBBcnJheS5wdXNoKHRtcEluZGV4KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBMb29wIHRoZSBpdGVtcyB0aGF0IG1hdGNoZWQgYW5kIHVwZGF0ZSB0aGVtXG5cdFx0XHRcdFx0Zm9yICh0bXBJbmRleCA9IDA7IHRtcEluZGV4IDwgdG1wQXJyYXkubGVuZ3RoOyB0bXBJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRyZWN1cnNlVXBkYXRlZCA9IHRoaXMuX3VwZGF0ZU9iamVjdChkb2NbaV1bdG1wQXJyYXlbdG1wSW5kZXhdXSwgdXBkYXRlW2kgKyAnLiQnXSwgcXVlcnksIG9wdGlvbnMsIHBhdGggKyAnLicgKyBpLCBvcFR5cGUpO1xuXHRcdFx0XHRcdFx0aWYgKHJlY3Vyc2VVcGRhdGVkKSB7XG5cdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIW9wZXJhdGlvbikge1xuXHRcdFx0XHRpZiAoIW9wVHlwZSAmJiB0eXBlb2YodXBkYXRlW2ldKSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRpZiAoZG9jW2ldICE9PSBudWxsICYmIHR5cGVvZihkb2NbaV0pID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UgYXJlIGRlYWxpbmcgd2l0aCBhcnJheXNcblx0XHRcdFx0XHRcdHNvdXJjZUlzQXJyYXkgPSBkb2NbaV0gaW5zdGFuY2VvZiBBcnJheTtcblx0XHRcdFx0XHRcdHVwZGF0ZUlzQXJyYXkgPSB1cGRhdGVbaV0gaW5zdGFuY2VvZiBBcnJheTtcblxuXHRcdFx0XHRcdFx0aWYgKHNvdXJjZUlzQXJyYXkgfHwgdXBkYXRlSXNBcnJheSkge1xuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgdXBkYXRlIGlzIGFuIG9iamVjdCBhbmQgdGhlIGRvYyBpcyBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAoIXVwZGF0ZUlzQXJyYXkgJiYgc291cmNlSXNBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIFVwZGF0ZSBpcyBhbiBvYmplY3QsIHNvdXJjZSBpcyBhbiBhcnJheSBzbyBtYXRjaCB0aGUgYXJyYXkgaXRlbXNcblx0XHRcdFx0XHRcdFx0XHQvLyB3aXRoIG91ciBxdWVyeSBvYmplY3QgdG8gZmluZCB0aGUgb25lIHRvIHVwZGF0ZSBpbnNpZGUgdGhpcyBhcnJheVxuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIGZpbmQgbWF0Y2hlcyB0byBvdXIgc2VhcmNoXG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh0bXBJbmRleCA9IDA7IHRtcEluZGV4IDwgZG9jW2ldLmxlbmd0aDsgdG1wSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVjdXJzZVVwZGF0ZWQgPSB0aGlzLl91cGRhdGVPYmplY3QoZG9jW2ldW3RtcEluZGV4XSwgdXBkYXRlW2ldLCBxdWVyeSwgb3B0aW9ucywgcGF0aCArICcuJyArIGksIG9wVHlwZSk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVXBkYXRlZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gRWl0aGVyIGJvdGggc291cmNlIGFuZCB1cGRhdGUgYXJlIGFycmF5cyBvciB0aGUgdXBkYXRlIGlzXG5cdFx0XHRcdFx0XHRcdFx0Ly8gYW4gYXJyYXkgYW5kIHRoZSBzb3VyY2UgaXMgbm90LCBzbyBzZXQgc291cmNlIHRvIHVwZGF0ZVxuXHRcdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gIT09IHVwZGF0ZVtpXSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5fdXBkYXRlUHJvcGVydHkoZG9jLCBpLCB1cGRhdGVbaV0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQvLyBUaGUgZG9jIGtleSBpcyBhbiBvYmplY3Qgc28gdHJhdmVyc2UgdGhlXG5cdFx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBmdXJ0aGVyXG5cdFx0XHRcdFx0XHRcdHJlY3Vyc2VVcGRhdGVkID0gdGhpcy5fdXBkYXRlT2JqZWN0KGRvY1tpXSwgdXBkYXRlW2ldLCBxdWVyeSwgb3B0aW9ucywgcGF0aCArICcuJyArIGksIG9wVHlwZSk7XG5cblx0XHRcdFx0XHRcdFx0aWYgKHJlY3Vyc2VVcGRhdGVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aWYgKGRvY1tpXSAhPT0gdXBkYXRlW2ldKSB7XG5cdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVByb3BlcnR5KGRvYywgaSwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHN3aXRjaCAob3BUeXBlKSB7XG5cdFx0XHRcdFx0XHRjYXNlICckaW5jJzpcblx0XHRcdFx0XHRcdFx0dGhpcy5fdXBkYXRlSW5jcmVtZW50KGRvYywgaSwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckcHVzaCc6XG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSB0YXJnZXQga2V5IGlzIHVuZGVmaW5lZCBhbmQgaWYgc28sIGNyZWF0ZSBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBJbml0aWFsaXNlIGEgbmV3IGFycmF5XG5cdFx0XHRcdFx0XHRcdFx0ZG9jW2ldID0gW107XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayB0aGF0IHRoZSB0YXJnZXQga2V5IGlzIGFuIGFycmF5XG5cdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVB1c2goZG9jW2ldLCB1cGRhdGVbaV0pO1xuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93KFwiQ2Fubm90IHB1c2ggdG8gYSBrZXkgdGhhdCBpcyBub3QgYW4gYXJyYXkhIChcIiArIGkgKyBcIikhXCIpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckcHVsbCc6XG5cdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdHRtcEFycmF5ID0gW107XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBMb29wIHRoZSBhcnJheSBhbmQgZmluZCBtYXRjaGVzIHRvIG91ciBzZWFyY2hcblx0XHRcdFx0XHRcdFx0XHRmb3IgKHRtcEluZGV4ID0gMDsgdG1wSW5kZXggPCBkb2NbaV0ubGVuZ3RoOyB0bXBJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5fbWF0Y2goZG9jW2ldW3RtcEluZGV4XSwgdXBkYXRlW2ldKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0bXBBcnJheS5wdXNoKHRtcEluZGV4KTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHR0bXBDb3VudCA9IHRtcEFycmF5Lmxlbmd0aDtcblxuXHRcdFx0XHRcdFx0XHRcdC8vIE5vdyBsb29wIHRoZSBwdWxsIGFycmF5IGFuZCByZW1vdmUgaXRlbXMgdG8gYmUgcHVsbGVkXG5cdFx0XHRcdFx0XHRcdFx0d2hpbGUgKHRtcENvdW50LS0pIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVB1bGwoZG9jW2ldLCB0bXBBcnJheVt0bXBDb3VudF0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93KFwiQ2Fubm90IHB1bGwgZnJvbSBhIGtleSB0aGF0IGlzIG5vdCBhbiBhcnJheSEgKFwiICsgaSArIFwiKSFcIik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRhZGRUb1NldCc6XG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSB0YXJnZXQga2V5IGlzIHVuZGVmaW5lZCBhbmQgaWYgc28sIGNyZWF0ZSBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBJbml0aWFsaXNlIGEgbmV3IGFycmF5XG5cdFx0XHRcdFx0XHRcdFx0ZG9jW2ldID0gW107XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayB0aGF0IHRoZSB0YXJnZXQga2V5IGlzIGFuIGFycmF5XG5cdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIExvb3AgdGhlIHRhcmdldCBhcnJheSBhbmQgY2hlY2sgZm9yIGV4aXN0ZW5jZSBvZiBpdGVtXG5cdFx0XHRcdFx0XHRcdFx0dmFyIHRhcmdldEFyciA9IGRvY1tpXSxcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldEFyckluZGV4LFxuXHRcdFx0XHRcdFx0XHRcdFx0dGFyZ2V0QXJyQ291bnQgPSB0YXJnZXRBcnIubGVuZ3RoLFxuXHRcdFx0XHRcdFx0XHRcdFx0b2JqSGFzaCxcblx0XHRcdFx0XHRcdFx0XHRcdGFkZE9iaiA9IHRydWUsXG5cdFx0XHRcdFx0XHRcdFx0XHRvcHRpb25PYmogPSAob3B0aW9ucyAmJiBvcHRpb25zLiRhZGRUb1NldCksXG5cdFx0XHRcdFx0XHRcdFx0XHRoYXNoTW9kZSxcblx0XHRcdFx0XHRcdFx0XHRcdHBhdGhTb2x2ZXI7XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB3ZSBoYXZlIGFuIG9wdGlvbnMgb2JqZWN0IGZvciBvdXIgb3BlcmF0aW9uXG5cdFx0XHRcdFx0XHRcdFx0aWYgKG9wdGlvbk9iaiAmJiBvcHRpb25PYmoua2V5KSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRoYXNoTW9kZSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdFx0cGF0aFNvbHZlciA9IG5ldyBQYXRoKG9wdGlvbk9iai5rZXkpO1xuXHRcdFx0XHRcdFx0XHRcdFx0b2JqSGFzaCA9IHBhdGhTb2x2ZXIudmFsdWUodXBkYXRlW2ldKVswXTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0b2JqSGFzaCA9IEpTT04uc3RyaW5naWZ5KHVwZGF0ZVtpXSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRoYXNoTW9kZSA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh0YXJnZXRBcnJJbmRleCA9IDA7IHRhcmdldEFyckluZGV4IDwgdGFyZ2V0QXJyQ291bnQ7IHRhcmdldEFyckluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChoYXNoTW9kZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiBvYmplY3RzIG1hdGNoIHZpYSBhIHN0cmluZyBoYXNoIChKU09OKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoSlNPTi5zdHJpbmdpZnkodGFyZ2V0QXJyW3RhcmdldEFyckluZGV4XSkgPT09IG9iakhhc2gpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBUaGUgb2JqZWN0IGFscmVhZHkgZXhpc3RzLCBkb24ndCBhZGQgaXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRhZGRPYmogPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgb2JqZWN0cyBtYXRjaCBiYXNlZCBvbiB0aGUgcGF0aFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAob2JqSGFzaCA9PT0gcGF0aFNvbHZlci52YWx1ZSh0YXJnZXRBcnJbdGFyZ2V0QXJySW5kZXhdKVswXSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFRoZSBvYmplY3QgYWxyZWFkeSBleGlzdHMsIGRvbid0IGFkZCBpdFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGFkZE9iaiA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGFkZE9iaikge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5fdXBkYXRlUHVzaChkb2NbaV0sIHVwZGF0ZVtpXSk7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhyb3coXCJDYW5ub3QgcHVzaCB0byBhIGtleSB0aGF0IGlzIG5vdCBhbiBhcnJheSEgKFwiICsgayArIFwiKSFcIik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRzcGxpY2VQdXNoJzpcblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIHRhcmdldCBrZXkgaXMgdW5kZWZpbmVkIGFuZCBpZiBzbywgY3JlYXRlIGFuIGFycmF5XG5cdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEluaXRpYWxpc2UgYSBuZXcgYXJyYXlcblx0XHRcdFx0XHRcdFx0XHRkb2NbaV0gPSBbXTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIHRoYXQgdGhlIHRhcmdldCBrZXkgaXMgYW4gYXJyYXlcblx0XHRcdFx0XHRcdFx0aWYgKGRvY1tpXSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHRlbXBJbmRleCA9IHVwZGF0ZS4kaW5kZXg7XG5cblx0XHRcdFx0XHRcdFx0XHRpZiAodGVtcEluZGV4ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSB1cGRhdGUuJGluZGV4O1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5fdXBkYXRlU3BsaWNlUHVzaChkb2NbaV0sIHRlbXBJbmRleCwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyhcIkNhbm5vdCBzcGxpY2VQdXNoIHdpdGhvdXQgYSAkaW5kZXggaW50ZWdlciB2YWx1ZSFcIik7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93KFwiQ2Fubm90IHNwbGljZVB1c2ggd2l0aCBhIGtleSB0aGF0IGlzIG5vdCBhbiBhcnJheSEgKFwiICsgaSArIFwiKSFcIik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRtb3ZlJzpcblx0XHRcdFx0XHRcdFx0aWYgKGRvY1tpXSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIGZpbmQgbWF0Y2hlcyB0byBvdXIgc2VhcmNoXG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh0bXBJbmRleCA9IDA7IHRtcEluZGV4IDwgZG9jW2ldLmxlbmd0aDsgdG1wSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX21hdGNoKGRvY1tpXVt0bXBJbmRleF0sIHVwZGF0ZVtpXSkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dmFyIG1vdmVUb0luZGV4ID0gdXBkYXRlW2ldLiRpbmRleDtcblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAobW92ZVRvSW5kZXggIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVNwbGljZU1vdmUoZG9jW2ldLCB0bXBJbmRleCwgbW92ZVRvSW5kZXgpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93KFwiQ2Fubm90IG1vdmUgd2l0aG91dCBhICRpbmRleCBpbnRlZ2VyIHZhbHVlIVwiKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhyb3coXCJDYW5ub3QgcHVsbCBmcm9tIGEga2V5IHRoYXQgaXMgbm90IGFuIGFycmF5ISAoXCIgKyBpICsgXCIpIVwiKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJG11bCc6XG5cdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZU11bHRpcGx5KGRvYywgaSwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckcmVuYW1lJzpcblx0XHRcdFx0XHRcdFx0dGhpcy5fdXBkYXRlUmVuYW1lKGRvYywgaSwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldICE9PSB1cGRhdGVbaV0pIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl91cGRhdGVQcm9wZXJ0eShkb2MsIGksIHVwZGF0ZVtpXSk7XG5cdFx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHVwZGF0ZWQ7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgaWYgdGhlIHBhc3NlZCBrZXkgaGFzIGFuIGFycmF5IHBvc2l0aW9uYWwgbWFyayAoYSBkb2xsYXIgYXQgdGhlIGVuZFxuICogb2YgaXRzIG5hbWUpLlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBUaGUga2V5IHRvIGNoZWNrLlxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgaXQgaXMgYSBwb3NpdGlvbmFsIG9yIGZhbHNlIGlmIG5vdC5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9pc1Bvc2l0aW9uYWxLZXkgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdHJldHVybiBrZXkuc3Vic3RyKGtleS5sZW5ndGggLSAyLCAyKSA9PT0gJy4kJztcbn07XG5cbi8qKlxuICogVXBkYXRlcyBhIHByb3BlcnR5IG9uIGFuIG9iamVjdCBkZXBlbmRpbmcgb24gaWYgdGhlIGNvbGxlY3Rpb24gaXNcbiAqIGN1cnJlbnRseSBydW5uaW5nIGRhdGEtYmluZGluZyBvciBub3QuXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBvYmplY3Qgd2hvc2UgcHJvcGVydHkgaXMgdG8gYmUgdXBkYXRlZC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wIFRoZSBwcm9wZXJ0eSB0byB1cGRhdGUuXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgbmV3IHZhbHVlIG9mIHRoZSBwcm9wZXJ0eS5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl91cGRhdGVQcm9wZXJ0eSA9IGZ1bmN0aW9uIChkb2MsIHByb3AsIHZhbCkge1xuXHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0JC5vYnNlcnZhYmxlKGRvYykuc2V0UHJvcGVydHkocHJvcCwgdmFsKTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuQ29sbGVjdGlvbjogU2V0dGluZyBkYXRhLWJvdW5kIGRvY3VtZW50IHByb3BlcnR5IFwiJyArIHByb3AgKyAnXCIgZm9yIGNvbGxlY3Rpb24gXCInICsgdGhpcy5uYW1lKCkgKyAnXCInKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0ZG9jW3Byb3BdID0gdmFsO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5Db2xsZWN0aW9uOiBTZXR0aW5nIG5vbi1kYXRhLWJvdW5kIGRvY3VtZW50IHByb3BlcnR5IFwiJyArIHByb3AgKyAnXCIgZm9yIGNvbGxlY3Rpb24gXCInICsgdGhpcy5uYW1lKCkgKyAnXCInKTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogSW5jcmVtZW50cyBhIHZhbHVlIGZvciBhIHByb3BlcnR5IG9uIGEgZG9jdW1lbnQgYnkgdGhlIHBhc3NlZCBudW1iZXIuXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byBtb2RpZnkuXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJvcCBUaGUgcHJvcGVydHkgdG8gbW9kaWZ5LlxuICogQHBhcmFtIHtOdW1iZXJ9IHZhbCBUaGUgYW1vdW50IHRvIGluY3JlbWVudCBieS5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl91cGRhdGVJbmNyZW1lbnQgPSBmdW5jdGlvbiAoZG9jLCBwcm9wLCB2YWwpIHtcblx0aWYgKHRoaXMuX2xpbmtlZCkge1xuXHRcdCQub2JzZXJ2YWJsZShkb2MpLnNldFByb3BlcnR5KHByb3AsIGRvY1twcm9wXSArIHZhbCk7XG5cdH0gZWxzZSB7XG5cdFx0ZG9jW3Byb3BdICs9IHZhbDtcblx0fVxufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBpbmRleCBvZiBhbiBpdGVtIGluIHRoZSBwYXNzZWQgYXJyYXkuXG4gKiBAcGFyYW0ge0FycmF5fSBhcnIgVGhlIGFycmF5IHRvIG1vZGlmeS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleEZyb20gVGhlIGluZGV4IHRvIG1vdmUgdGhlIGl0ZW0gZnJvbS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleFRvIFRoZSBpbmRleCB0byBtb3ZlIHRoZSBpdGVtIHRvLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVNwbGljZU1vdmUgPSBmdW5jdGlvbiAoYXJyLCBpbmRleEZyb20sIGluZGV4VG8pIHtcblx0aWYgKHRoaXMuX2xpbmtlZCkge1xuXHRcdCQub2JzZXJ2YWJsZShhcnIpLm1vdmUoaW5kZXhGcm9tLCBpbmRleFRvKTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuQ29sbGVjdGlvbjogTW92aW5nIGRhdGEtYm91bmQgZG9jdW1lbnQgYXJyYXkgaW5kZXggZnJvbSBcIicgKyBpbmRleEZyb20gKyAnXCIgdG8gXCInICsgaW5kZXhUbyArICdcIiBmb3IgY29sbGVjdGlvbiBcIicgKyB0aGlzLm5hbWUoKSArICdcIicpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRhcnIuc3BsaWNlKGluZGV4VG8sIDAsIGFyci5zcGxpY2UoaW5kZXhGcm9tLCAxKVswXSk7XG5cblx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLkNvbGxlY3Rpb246IE1vdmluZyBub24tZGF0YS1ib3VuZCBkb2N1bWVudCBhcnJheSBpbmRleCBmcm9tIFwiJyArIGluZGV4RnJvbSArICdcIiB0byBcIicgKyBpbmRleFRvICsgJ1wiIGZvciBjb2xsZWN0aW9uIFwiJyArIHRoaXMubmFtZSgpICsgJ1wiJyk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIEluc2VydHMgYW4gaXRlbSBpbnRvIHRoZSBwYXNzZWQgYXJyYXkgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAqIEBwYXJhbSB7QXJyYXl9IGFyciBUaGUgYXJyYXkgdG8gaW5zZXJ0IGludG8uXG4gKiBAcGFyYW0ge051bWJlcn0gaW5kZXggVGhlIGluZGV4IHRvIGluc2VydCBhdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl91cGRhdGVTcGxpY2VQdXNoID0gZnVuY3Rpb24gKGFyciwgaW5kZXgsIGRvYykge1xuXHRpZiAoYXJyLmxlbmd0aCA+IGluZGV4KSB7XG5cdFx0aWYgKHRoaXMuX2xpbmtlZCkge1xuXHRcdFx0JC5vYnNlcnZhYmxlKGFycikuaW5zZXJ0KGluZGV4LCBkb2MpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhcnIuc3BsaWNlKGluZGV4LCAwLCBkb2MpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0XHQkLm9ic2VydmFibGUoYXJyKS5pbnNlcnQoZG9jKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YXJyLnB1c2goZG9jKTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogSW5zZXJ0cyBhbiBpdGVtIGF0IHRoZSBlbmQgb2YgYW4gYXJyYXkuXG4gKiBAcGFyYW0ge0FycmF5fSBhcnIgVGhlIGFycmF5IHRvIGluc2VydCB0aGUgaXRlbSBpbnRvLlxuICogQHBhcmFtIHtPYmplY3R9IGRvYyBUaGUgZG9jdW1lbnQgdG8gaW5zZXJ0LlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVB1c2ggPSBmdW5jdGlvbiAoYXJyLCBkb2MpIHtcblx0aWYgKHRoaXMuX2xpbmtlZCkge1xuXHRcdCQub2JzZXJ2YWJsZShhcnIpLmluc2VydChkb2MpO1xuXHR9IGVsc2Uge1xuXHRcdGFyci5wdXNoKGRvYyk7XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhbiBpdGVtIGZyb20gdGhlIHBhc3NlZCBhcnJheS5cbiAqIEBwYXJhbSB7QXJyYXl9IGFyciBUaGUgYXJyYXkgdG8gbW9kaWZ5LlxuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4IFRoZSBpbmRleCBvZiB0aGUgaXRlbSBpbiB0aGUgYXJyYXkgdG8gcmVtb3ZlLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVB1bGwgPSBmdW5jdGlvbiAoYXJyLCBpbmRleCkge1xuXHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0JC5vYnNlcnZhYmxlKGFycikucmVtb3ZlKGluZGV4KTtcblx0fSBlbHNlIHtcblx0XHRhcnIuc3BsaWNlKGluZGV4LCAxKTtcblx0fVxufTtcblxuLyoqXG4gKiBNdWx0aXBsaWVzIGEgdmFsdWUgZm9yIGEgcHJvcGVydHkgb24gYSBkb2N1bWVudCBieSB0aGUgcGFzc2VkIG51bWJlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIG1vZGlmeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wIFRoZSBwcm9wZXJ0eSB0byBtb2RpZnkuXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsIFRoZSBhbW91bnQgdG8gbXVsdGlwbHkgYnkuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlTXVsdGlwbHkgPSBmdW5jdGlvbiAoZG9jLCBwcm9wLCB2YWwpIHtcblx0aWYgKHRoaXMuX2xpbmtlZCkge1xuXHRcdCQub2JzZXJ2YWJsZShkb2MpLnNldFByb3BlcnR5KHByb3AsIGRvY1twcm9wXSAqIHZhbCk7XG5cdH0gZWxzZSB7XG5cdFx0ZG9jW3Byb3BdICo9IHZhbDtcblx0fVxufTtcblxuLyoqXG4gKiBSZW5hbWVzIGEgcHJvcGVydHkgb24gYSBkb2N1bWVudCB0byB0aGUgcGFzc2VkIHByb3BlcnR5LlxuICogQHBhcmFtIHtPYmplY3R9IGRvYyBUaGUgZG9jdW1lbnQgdG8gbW9kaWZ5LlxuICogQHBhcmFtIHtTdHJpbmd9IHByb3AgVGhlIHByb3BlcnR5IHRvIHJlbmFtZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSB2YWwgVGhlIG5ldyBwcm9wZXJ0eSBuYW1lLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVJlbmFtZSA9IGZ1bmN0aW9uIChkb2MsIHByb3AsIHZhbCkge1xuXHR2YXIgZXhpc3RpbmdWYWwgPSBkb2NbcHJvcF07XG5cdGlmICh0aGlzLl9saW5rZWQpIHtcblx0XHQkLm9ic2VydmFibGUoZG9jKS5zZXRQcm9wZXJ0eSh2YWwsIGV4aXN0aW5nVmFsKTtcblx0XHQkLm9ic2VydmFibGUoZG9jKS5yZW1vdmVQcm9wZXJ0eShwcm9wKTtcblx0fSBlbHNlIHtcblx0XHRkb2NbdmFsXSA9IGV4aXN0aW5nVmFsO1xuXHRcdGRlbGV0ZSBkb2NbcHJvcF07XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhbnkgZG9jdW1lbnRzIGZyb20gdGhlIGNvbGxlY3Rpb24gdGhhdCBtYXRjaCB0aGUgc2VhcmNoIHF1ZXJ5XG4gKiBrZXkvdmFsdWVzLlxuICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IFRoZSBxdWVyeSBvYmplY3QuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFuIGFycmF5IG9mIHRoZSBkb2N1bWVudHMgdGhhdCB3ZXJlIHJlbW92ZWQuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChxdWVyeSkge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0ZGF0YVNldCxcblx0XHRpbmRleCxcblx0XHR2aWV3cyA9IHRoaXMuX3ZpZXdzLFxuXHRcdHZpZXdJbmRleCxcblx0XHRkYXRhSXRlbSxcblx0XHRhcnJJbmRleCxcblx0XHRyZXR1cm5BcnI7XG5cblx0aWYgKHF1ZXJ5IGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRyZXR1cm5BcnIgPSBbXTtcblxuXHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IHF1ZXJ5Lmxlbmd0aDsgYXJySW5kZXgrKykge1xuXHRcdFx0cmV0dXJuQXJyLnB1c2godGhpcy5yZW1vdmUocXVlcnlbYXJySW5kZXhdKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldHVybkFycjtcblx0fSBlbHNlIHtcblx0XHRkYXRhU2V0ID0gdGhpcy5maW5kKHF1ZXJ5LCB7ZGVjb3VwbGU6IGZhbHNlfSk7XG5cdFx0aWYgKGRhdGFTZXQubGVuZ3RoKSB7XG5cdFx0XHQvLyBSZW1vdmUgdGhlIGRhdGEgZnJvbSB0aGUgY29sbGVjdGlvblxuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhU2V0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGRhdGFJdGVtID0gZGF0YVNldFtpXTtcblxuXHRcdFx0XHQvLyBSZW1vdmUgdGhlIGl0ZW0gZnJvbSB0aGUgY29sbGVjdGlvbidzIGluZGV4ZXNcblx0XHRcdFx0dGhpcy5fcmVtb3ZlSW5kZXgoZGF0YUl0ZW0pO1xuXG5cdFx0XHRcdC8vIFJlbW92ZSBkYXRhIGZyb20gaW50ZXJuYWwgc3RvcmVzXG5cdFx0XHRcdGluZGV4ID0gdGhpcy5fZGF0YS5pbmRleE9mKGRhdGFJdGVtKTtcblxuXHRcdFx0XHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0XHRcdFx0JC5vYnNlcnZhYmxlKHRoaXMuX2RhdGEpLnJlbW92ZShpbmRleCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5fZGF0YS5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIExvb3Agdmlld3MgYW5kIHBhc3MgdGhlbSB0aGUgcmVtb3ZlIHF1ZXJ5XG5cdFx0XHRpZiAodmlld3MgJiYgdmlld3MubGVuZ3RoKSB7XG5cdFx0XHRcdGZvciAodmlld0luZGV4ID0gMDsgdmlld0luZGV4IDwgdmlld3MubGVuZ3RoOyB2aWV3SW5kZXgrKykge1xuXHRcdFx0XHRcdHZpZXdzW3ZpZXdJbmRleF0ucmVtb3ZlKHF1ZXJ5KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9vblJlbW92ZShkYXRhU2V0KTtcblx0XHRcdHRoaXMuZGVmZXJFbWl0KCdjaGFuZ2UnLCB7dHlwZTogJ3JlbW92ZScsIGRhdGE6IGRhdGFTZXR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZGF0YVNldDtcblx0fVxufTtcblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRoYXQgcmVtb3ZlcyBhIGRvY3VtZW50IHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gaWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBkb2N1bWVudCB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFuIGFycmF5IG9mIGRvY3VtZW50cyB0aGF0IHdlcmUgcmVtb3ZlZC5cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUucmVtb3ZlQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuXHR2YXIgc2VhcmNoT2JqID0ge307XG5cdHNlYXJjaE9ialt0aGlzLl9wcmltYXJ5S2V5XSA9IGlkO1xuXHRyZXR1cm4gdGhpcy5yZW1vdmUoc2VhcmNoT2JqKTtcbn07XG5cbi8qKlxuICogUXVldWVzIGFuIGV2ZW50IHRvIGJlIGZpcmVkLiBUaGlzIGhhcyBhdXRvbWF0aWMgZGUtYm91bmNpbmcgc28gdGhhdCBhbnlcbiAqIGV2ZW50cyBvZiB0aGUgc2FtZSB0eXBlIHRoYXQgb2NjdXIgd2l0aGluIDEwMCBtaWxsaXNlY29uZHMgb2YgYSBwcmV2aW91c1xuICogb25lIHdpbGwgYWxsIGJlIHdyYXBwZWQgaW50byBhIHNpbmdsZSBlbWl0IHJhdGhlciB0aGFuIGVtaXR0aW5nIHRvbnMgb2ZcbiAqIGV2ZW50cyBmb3IgbG90cyBvZiBjaGFpbmVkIGluc2VydHMgZXRjLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGVmZXJFbWl0ID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0YXJncztcblxuXHRpZiAoIXRoaXMuX25vRW1pdERlZmVyICYmICghdGhpcy5fZGIgfHwgKHRoaXMuX2RiICYmICF0aGlzLl9kYi5fbm9FbWl0RGVmZXIpKSkge1xuXHRcdGFyZ3MgPSBhcmd1bWVudHM7XG5cblx0XHQvLyBDaGVjayBmb3IgYW4gZXhpc3RpbmcgdGltZW91dFxuXHRcdGlmICh0aGlzLl9jaGFuZ2VUaW1lb3V0KSB7XG5cdFx0XHRjbGVhclRpbWVvdXQodGhpcy5fY2hhbmdlVGltZW91dCk7XG5cdFx0fVxuXG5cdFx0Ly8gU2V0IGEgdGltZW91dFxuXHRcdHRoaXMuX2NoYW5nZVRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmIChzZWxmLmRlYnVnKCkpIHsgY29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5Db2xsZWN0aW9uOiBFbWl0dGluZyAnICsgYXJnc1swXSk7IH1cblx0XHRcdHNlbGYuZW1pdC5hcHBseShzZWxmLCBhcmdzKTtcblx0XHR9LCAxMDApO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMuZW1pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHR9XG59O1xuXG4vKipcbiAqIFByb2Nlc3NlcyBhIGRlZmVycmVkIGFjdGlvbiBxdWV1ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBxdWV1ZSBuYW1lIHRvIHByb2Nlc3MuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBBIG1ldGhvZCB0byBjYWxsIHdoZW4gdGhlIHF1ZXVlIGhhcyBwcm9jZXNzZWQuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnByb2Nlc3NRdWV1ZSA9IGZ1bmN0aW9uICh0eXBlLCBjYWxsYmFjaykge1xuXHR2YXIgcXVldWUgPSB0aGlzLl9kZWZlclF1ZXVlW3R5cGVdLFxuXHRcdGRlZmVyVGhyZXNob2xkID0gdGhpcy5fZGVmZXJUaHJlc2hvbGRbdHlwZV0sXG5cdFx0ZGVmZXJUaW1lID0gdGhpcy5fZGVmZXJUaW1lW3R5cGVdO1xuXG5cdGlmIChxdWV1ZS5sZW5ndGgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRkYXRhQXJyO1xuXG5cdFx0Ly8gUHJvY2VzcyBpdGVtcyB1cCB0byB0aGUgdGhyZXNob2xkXG5cdFx0aWYgKHF1ZXVlLmxlbmd0aCkge1xuXHRcdFx0aWYgKHF1ZXVlLmxlbmd0aCA+IGRlZmVyVGhyZXNob2xkKSB7XG5cdFx0XHRcdC8vIEdyYWIgaXRlbXMgdXAgdG8gdGhlIHRocmVzaG9sZCB2YWx1ZVxuXHRcdFx0XHRkYXRhQXJyID0gcXVldWUuc3BsaWNlKDAsIGRlZmVyVGhyZXNob2xkKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEdyYWIgYWxsIHRoZSByZW1haW5pbmcgaXRlbXNcblx0XHRcdFx0ZGF0YUFyciA9IHF1ZXVlLnNwbGljZSgwLCBxdWV1ZS5sZW5ndGgpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzW3R5cGVdKGRhdGFBcnIpO1xuXHRcdH1cblxuXHRcdC8vIFF1ZXVlIGFub3RoZXIgcHJvY2Vzc1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi5wcm9jZXNzUXVldWUodHlwZSwgY2FsbGJhY2spO1xuXHRcdH0sIGRlZmVyVGltZSk7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCk7IH1cblx0fVxufTtcblxuLyoqXG4gKiBJbnNlcnRzIGEgZG9jdW1lbnQgb3IgYXJyYXkgb2YgZG9jdW1lbnRzIGludG8gdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdHx8QXJyYXl9IGRhdGEgRWl0aGVyIGEgZG9jdW1lbnQgb2JqZWN0IG9yIGFycmF5IG9mIGRvY3VtZW50XG4gKiBAcGFyYW0ge051bWJlcj19IGluZGV4IE9wdGlvbmFsIGluZGV4IHRvIGluc2VydCB0aGUgcmVjb3JkIGF0LlxuICogQHBhcmFtIHtGdW5jdGlvbj19IGNhbGxiYWNrIE9wdGlvbmFsIGNhbGxiYWNrIGNhbGxlZCBvbmNlIGFjdGlvbiBpcyBjb21wbGV0ZS5cbiAqIG9iamVjdHMgdG8gaW5zZXJ0IGludG8gdGhlIGNvbGxlY3Rpb24uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uIChkYXRhLCBpbmRleCwgY2FsbGJhY2spIHtcblx0aWYgKHR5cGVvZihpbmRleCkgPT09ICdmdW5jdGlvbicpIHtcblx0XHRjYWxsYmFjayA9IGluZGV4O1xuXHRcdGluZGV4ID0gdGhpcy5fZGF0YS5sZW5ndGg7XG5cdH0gZWxzZSBpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xuXHRcdGluZGV4ID0gdGhpcy5fZGF0YS5sZW5ndGg7XG5cdH1cblxuXHRkYXRhID0gdGhpcy50cmFuc2Zvcm1JbihkYXRhKTtcblx0cmV0dXJuIHRoaXMuX2luc2VydEhhbmRsZShkYXRhLCBpbmRleCwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBJbnNlcnRzIGEgZG9jdW1lbnQgb3IgYXJyYXkgb2YgZG9jdW1lbnRzIGludG8gdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdHx8QXJyYXl9IGRhdGEgRWl0aGVyIGEgZG9jdW1lbnQgb2JqZWN0IG9yIGFycmF5IG9mIGRvY3VtZW50XG4gKiBAcGFyYW0ge051bWJlcj19IGluZGV4IE9wdGlvbmFsIGluZGV4IHRvIGluc2VydCB0aGUgcmVjb3JkIGF0LlxuICogQHBhcmFtIHtGdW5jdGlvbj19IGNhbGxiYWNrIE9wdGlvbmFsIGNhbGxiYWNrIGNhbGxlZCBvbmNlIGFjdGlvbiBpcyBjb21wbGV0ZS5cbiAqIG9iamVjdHMgdG8gaW5zZXJ0IGludG8gdGhlIGNvbGxlY3Rpb24uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9pbnNlcnRIYW5kbGUgPSBmdW5jdGlvbiAoZGF0YSwgaW5kZXgsIGNhbGxiYWNrKSB7XG5cdHZhciBzZWxmID0gdGhpcyxcblx0XHRxdWV1ZSA9IHRoaXMuX2RlZmVyUXVldWUuaW5zZXJ0LFxuXHRcdGRlZmVyVGhyZXNob2xkID0gdGhpcy5fZGVmZXJUaHJlc2hvbGQuaW5zZXJ0LFxuXHRcdGRlZmVyVGltZSA9IHRoaXMuX2RlZmVyVGltZS5pbnNlcnQsXG5cdFx0aW5zZXJ0ZWQgPSBbXSxcblx0XHRmYWlsZWQgPSBbXSxcblx0XHRpbnNlcnRSZXN1bHQsXG5cdFx0dmlld3MgPSB0aGlzLl92aWV3cyxcblx0XHR2aWV3SW5kZXgsXG5cdFx0aTtcblxuXHRpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0Ly8gQ2hlY2sgaWYgdGhlcmUgYXJlIG1vcmUgaW5zZXJ0IGl0ZW1zIHRoYW4gdGhlIGluc2VydCBkZWZlclxuXHRcdC8vIHRocmVzaG9sZCwgaWYgc28sIGJyZWFrIHVwIGluc2VydHMgc28gd2UgZG9uJ3QgdGllIHVwIHRoZVxuXHRcdC8vIHVpIG9yIHRocmVhZFxuXHRcdGlmIChkYXRhLmxlbmd0aCA+IGRlZmVyVGhyZXNob2xkKSB7XG5cdFx0XHQvLyBCcmVhayB1cCBpbnNlcnQgaW50byBibG9ja3Ncblx0XHRcdHRoaXMuX2RlZmVyUXVldWUuaW5zZXJ0ID0gcXVldWUuY29uY2F0KGRhdGEpO1xuXG5cdFx0XHQvLyBGaXJlIG9mZiB0aGUgaW5zZXJ0IHF1ZXVlIGhhbmRsZXJcblx0XHRcdHRoaXMucHJvY2Vzc1F1ZXVlKCdpbnNlcnQnLCBjYWxsYmFjayk7XG5cblx0XHRcdHJldHVybjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIGFkZCBpdGVtc1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5zZXJ0UmVzdWx0ID0gdGhpcy5faW5zZXJ0KGRhdGFbaV0sIGluZGV4ICsgaSk7XG5cblx0XHRcdFx0aWYgKGluc2VydFJlc3VsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdGluc2VydGVkLnB1c2goZGF0YVtpXSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZmFpbGVkLnB1c2goe1xuXHRcdFx0XHRcdFx0ZG9jOiBkYXRhW2ldLFxuXHRcdFx0XHRcdFx0cmVhc29uOiBpbnNlcnRSZXN1bHRcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQvLyBTdG9yZSB0aGUgZGF0YSBpdGVtXG5cdFx0aW5zZXJ0UmVzdWx0ID0gdGhpcy5faW5zZXJ0KGRhdGEsIGluZGV4KTtcblxuXHRcdGlmIChpbnNlcnRSZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdGluc2VydGVkLnB1c2goZGF0YSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGZhaWxlZC5wdXNoKHtcblx0XHRcdFx0ZG9jOiBkYXRhLFxuXHRcdFx0XHRyZWFzb246IGluc2VydFJlc3VsdFxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0Ly8gTG9vcCB2aWV3cyBhbmQgcGFzcyB0aGVtIHRoZSBpbnNlcnQgcXVlcnlcblx0aWYgKHZpZXdzICYmIHZpZXdzLmxlbmd0aCkge1xuXHRcdGZvciAodmlld0luZGV4ID0gMDsgdmlld0luZGV4IDwgdmlld3MubGVuZ3RoOyB2aWV3SW5kZXgrKykge1xuXHRcdFx0dmlld3Nbdmlld0luZGV4XS5pbnNlcnQoZGF0YSwgaW5kZXgpO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuX29uSW5zZXJ0KGluc2VydGVkLCBmYWlsZWQpO1xuXHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soKTsgfVxuXHR0aGlzLmRlZmVyRW1pdCgnY2hhbmdlJywge3R5cGU6ICdpbnNlcnQnLCBkYXRhOiBpbnNlcnRlZH0pO1xuXG5cdHJldHVybiB7XG5cdFx0aW5zZXJ0ZWQ6IGluc2VydGVkLFxuXHRcdGZhaWxlZDogZmFpbGVkXG5cdH07XG59O1xuXG4vKipcbiAqIEludGVybmFsIG1ldGhvZCB0byBpbnNlcnQgYSBkb2N1bWVudCBpbnRvIHRoZSBjb2xsZWN0aW9uLiBXaWxsXG4gKiBjaGVjayBmb3IgaW5kZXggdmlvbGF0aW9ucyBiZWZvcmUgYWxsb3dpbmcgdGhlIGRvY3VtZW50IHRvIGJlIGluc2VydGVkLlxuICogQHBhcmFtIHtPYmplY3R9IGRvYyBUaGUgZG9jdW1lbnQgdG8gaW5zZXJ0IGFmdGVyIHBhc3NpbmcgaW5kZXggdmlvbGF0aW9uXG4gKiB0ZXN0cy5cbiAqIEBwYXJhbSB7TnVtYmVyPX0gaW5kZXggT3B0aW9uYWwgaW5kZXggdG8gaW5zZXJ0IHRoZSBkb2N1bWVudCBhdC5cbiAqIEByZXR1cm5zIHtCb29sZWFufE9iamVjdH0gVHJ1ZSBvbiBzdWNjZXNzLCBmYWxzZSBpZiBubyBkb2N1bWVudCBwYXNzZWQsXG4gKiBvciBhbiBvYmplY3QgY29udGFpbmluZyBkZXRhaWxzIGFib3V0IGFuIGluZGV4IHZpb2xhdGlvbiBpZiBvbmUgb2NjdXJyZWQuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0ID0gZnVuY3Rpb24gKGRvYywgaW5kZXgpIHtcblx0aWYgKGRvYykge1xuXHRcdHZhciBpbmRleFZpb2xhdGlvbjtcblxuXHRcdHRoaXMuX2Vuc3VyZVByaW1hcnlLZXkoZG9jKTtcblxuXHRcdC8vIENoZWNrIGluZGV4ZXMgYXJlIG5vdCBnb2luZyB0byBiZSBicm9rZW4gYnkgdGhlIGRvY3VtZW50XG5cdFx0aW5kZXhWaW9sYXRpb24gPSB0aGlzLmluc2VydEluZGV4VmlvbGF0aW9uKGRvYyk7XG5cblx0XHRpZiAoIWluZGV4VmlvbGF0aW9uKSB7XG5cdFx0XHQvLyBBZGQgdGhlIGl0ZW0gdG8gdGhlIGNvbGxlY3Rpb24ncyBpbmRleGVzXG5cdFx0XHR0aGlzLl9pbnNlcnRJbmRleChkb2MpO1xuXG5cdFx0XHQvLyBJbnNlcnQgdGhlIGRvY3VtZW50XG5cdFx0XHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0XHRcdCQub2JzZXJ2YWJsZSh0aGlzLl9kYXRhKS5pbnNlcnQoaW5kZXgsIGRvYyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9kYXRhLnNwbGljZShpbmRleCwgMCwgZG9jKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiAnSW5kZXggdmlvbGF0aW9uIGluIGluZGV4OiAnICsgaW5kZXhWaW9sYXRpb247XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuICdObyBkb2N1bWVudCBwYXNzZWQgdG8gaW5zZXJ0Jztcbn07XG5cbi8qKlxuICogSW5zZXJ0cyBhIGRvY3VtZW50IGludG8gdGhlIGNvbGxlY3Rpb24gaW5kZXhlcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9pbnNlcnRJbmRleCA9IGZ1bmN0aW9uIChkb2MpIHtcblx0dmFyIGFyciA9IHRoaXMuX2luZGV4QnlOYW1lLFxuXHRcdGFyckluZGV4LFxuXHRcdGpTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShkb2MpO1xuXG5cdC8vIEluc2VydCB0byBwcmltYXJ5IGtleSBpbmRleFxuXHR0aGlzLl9wcmltYXJ5SW5kZXgudW5pcXVlU2V0KGRvY1t0aGlzLl9wcmltYXJ5S2V5XSwgZG9jKTtcblx0dGhpcy5fcHJpbWFyeUNyYy51bmlxdWVTZXQoZG9jW3RoaXMuX3ByaW1hcnlLZXldLCBqU3RyaW5nKTtcblx0dGhpcy5fY3JjTG9va3VwLnVuaXF1ZVNldChqU3RyaW5nLCBkb2MpO1xuXG5cdC8vIEluc2VydCBpbnRvIG90aGVyIGluZGV4ZXNcblx0Zm9yIChhcnJJbmRleCBpbiBhcnIpIHtcblx0XHRpZiAoYXJyLmhhc093blByb3BlcnR5KGFyckluZGV4KSkge1xuXHRcdFx0YXJyW2FyckluZGV4XS5pbnNlcnQoZG9jKTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhIGRvY3VtZW50IGZyb20gdGhlIGNvbGxlY3Rpb24gaW5kZXhlcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIHJlbW92ZS5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9yZW1vdmVJbmRleCA9IGZ1bmN0aW9uIChkb2MpIHtcblx0dmFyIGFyciA9IHRoaXMuX2luZGV4QnlOYW1lLFxuXHRcdGFyckluZGV4LFxuXHRcdGpTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShkb2MpO1xuXG5cdC8vIFJlbW92ZSBmcm9tIHByaW1hcnkga2V5IGluZGV4XG5cdHRoaXMuX3ByaW1hcnlJbmRleC51blNldChkb2NbdGhpcy5fcHJpbWFyeUtleV0pO1xuXHR0aGlzLl9wcmltYXJ5Q3JjLnVuU2V0KGRvY1t0aGlzLl9wcmltYXJ5S2V5XSk7XG5cdHRoaXMuX2NyY0xvb2t1cC51blNldChqU3RyaW5nKTtcblxuXHQvLyBSZW1vdmUgZnJvbSBvdGhlciBpbmRleGVzXG5cdGZvciAoYXJySW5kZXggaW4gYXJyKSB7XG5cdFx0aWYgKGFyci5oYXNPd25Qcm9wZXJ0eShhcnJJbmRleCkpIHtcblx0XHRcdGFyclthcnJJbmRleF0ucmVtb3ZlKGRvYyk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIFVzZXMgdGhlIHBhc3NlZCBxdWVyeSB0byBnZW5lcmF0ZSBhIG5ldyBjb2xsZWN0aW9uIHdpdGggcmVzdWx0c1xuICogbWF0Y2hpbmcgdGhlIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gKlxuICogQHBhcmFtIHF1ZXJ5XG4gKiBAcGFyYW0gb3B0aW9uc1xuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnN1YnNldCA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucykge1xuXHR2YXIgcmVzdWx0ID0gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblxuXHRyZXR1cm4gbmV3IENvbGxlY3Rpb24oKVxuXHRcdC5fc3Vic2V0T2YodGhpcylcblx0XHQucHJpbWFyeUtleSh0aGlzLl9wcmltYXJ5S2V5KVxuXHRcdC5zZXREYXRhKHJlc3VsdCk7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIGNvbGxlY3Rpb24gdGhhdCB0aGlzIGNvbGxlY3Rpb24gaXMgYSBzdWJzZXQgb2YuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuc3Vic2V0T2YgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9fc3Vic2V0T2Y7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGNvbGxlY3Rpb24gdGhhdCB0aGlzIGNvbGxlY3Rpb24gaXMgYSBzdWJzZXQgb2YuXG4gKiBAcGFyYW0ge0NvbGxlY3Rpb259IGNvbGxlY3Rpb24gVGhlIGNvbGxlY3Rpb24gdG8gc2V0IGFzIHRoZSBwYXJlbnQgb2YgdGhpcyBzdWJzZXQuXG4gKiBAcmV0dXJucyB7Kn0gVGhpcyBvYmplY3QgZm9yIGNoYWluaW5nLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3N1YnNldE9mID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcblx0dGhpcy5fX3N1YnNldE9mID0gY29sbGVjdGlvbjtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEZpbmQgdGhlIGRpc3RpbmN0IHZhbHVlcyBmb3IgYSBzcGVjaWZpZWQgZmllbGQgYWNyb3NzIGEgc2luZ2xlIGNvbGxlY3Rpb24gYW5kXG4gKiByZXR1cm5zIHRoZSByZXN1bHRzIGluIGFuIGFycmF5LlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBUaGUgZmllbGQgcGF0aCB0byByZXR1cm4gZGlzdGluY3QgdmFsdWVzIGZvciBlLmcuIFwicGVyc29uLm5hbWVcIi5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcnkgVGhlIHF1ZXJ5IHRvIHVzZSB0byBmaWx0ZXIgdGhlIGRvY3VtZW50cyB1c2VkIHRvIHJldHVybiB2YWx1ZXMgZnJvbS5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9ucyBUaGUgcXVlcnkgb3B0aW9ucyB0byB1c2Ugd2hlbiBydW5uaW5nIHRoZSBxdWVyeS5cbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGlzdGluY3QgPSBmdW5jdGlvbiAoa2V5LCBxdWVyeSwgb3B0aW9ucykge1xuXHR2YXIgZGF0YSA9IHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyksXG5cdFx0cGF0aFNvbHZlciA9IG5ldyBQYXRoKGtleSksXG5cdFx0dmFsdWVVc2VkID0ge30sXG5cdFx0ZGlzdGluY3RWYWx1ZXMgPSBbXSxcblx0XHR2YWx1ZSxcblx0XHRpO1xuXG5cdC8vIExvb3AgdGhlIGRhdGEgYW5kIGJ1aWxkIGFycmF5IG9mIGRpc3RpbmN0IHZhbHVlc1xuXHRmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdHZhbHVlID0gcGF0aFNvbHZlci52YWx1ZShkYXRhW2ldKVswXTtcblxuXHRcdGlmICh2YWx1ZSAmJiAhdmFsdWVVc2VkW3ZhbHVlXSkge1xuXHRcdFx0dmFsdWVVc2VkW3ZhbHVlXSA9IHRydWU7XG5cdFx0XHRkaXN0aW5jdFZhbHVlcy5wdXNoKHZhbHVlKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZGlzdGluY3RWYWx1ZXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBub24tcmVmZXJlbmNlZCB2ZXJzaW9uIG9mIHRoZSBwYXNzZWQgb2JqZWN0IC8gYXJyYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgb2JqZWN0IG9yIGFycmF5IHRvIHJldHVybiBhcyBhIG5vbi1yZWZlcmVuY2VkIHZlcnNpb24uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGVjb3VwbGUgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSk7XG59O1xuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gZmluZCBhIGRvY3VtZW50IGJ5IGl0J3MgaWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBkb2N1bWVudC5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9ucyBUaGUgb3B0aW9ucyBvYmplY3QsIGFsbG93ZWQga2V5cyBhcmUgc29ydCBhbmQgbGltaXQuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBpdGVtcyB0aGF0IHdlcmUgdXBkYXRlZC5cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZEJ5SWQgPSBmdW5jdGlvbiAoaWQsIG9wdGlvbnMpIHtcblx0dmFyIHNlYXJjaE9iaiA9IHt9O1xuXHRzZWFyY2hPYmpbdGhpcy5fcHJpbWFyeUtleV0gPSBpZDtcblx0cmV0dXJuIHRoaXMuZmluZChzZWFyY2hPYmosIG9wdGlvbnMpWzBdO1xufTtcblxuLyoqXG4gKiBGaW5kcyBhbGwgZG9jdW1lbnRzIHRoYXQgY29udGFpbiB0aGUgcGFzc2VkIHN0cmluZyBvciBzZWFyY2ggb2JqZWN0XG4gKiByZWdhcmRsZXNzIG9mIHdoZXJlIHRoZSBzdHJpbmcgbWlnaHQgb2NjdXIgd2l0aGluIHRoZSBkb2N1bWVudC4gVGhpc1xuICogd2lsbCBtYXRjaCBzdHJpbmdzIGZyb20gdGhlIHN0YXJ0LCBtaWRkbGUgb3IgZW5kIG9mIHRoZSBkb2N1bWVudCdzXG4gKiBzdHJpbmcgKHBhcnRpYWwgbWF0Y2gpLlxuICogQHBhcmFtIHNlYXJjaCBUaGUgc3RyaW5nIHRvIHNlYXJjaCBmb3IuIENhc2Ugc2Vuc2l0aXZlLlxuICogQHBhcmFtIG9wdGlvbnMgQSBzdGFuZGFyZCBmaW5kKCkgb3B0aW9ucyBvYmplY3QuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFuIGFycmF5IG9mIGRvY3VtZW50cyB0aGF0IG1hdGNoZWQgdGhlIHNlYXJjaCBzdHJpbmcuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbiAoc2VhcmNoLCBvcHRpb25zKSB7XG5cdC8vIExvb3AgYWxsIGl0ZW1zXG5cdHZhciBhcnIgPSB0aGlzLl9kYXRhLFxuXHRcdGFyckNvdW50ID0gYXJyLmxlbmd0aCxcblx0XHRhcnJJbmRleCxcblx0XHRhcnJJdGVtLFxuXHRcdHRlbXBDb2xsID0gbmV3IENvbGxlY3Rpb24oKSxcblx0XHR0eXBlT2ZTZWFyY2ggPSB0eXBlb2Ygc2VhcmNoO1xuXG5cdGlmICh0eXBlT2ZTZWFyY2ggPT09ICdzdHJpbmcnKSB7XG5cdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdC8vIEdldCBqc29uIHJlcHJlc2VudGF0aW9uIG9mIG9iamVjdFxuXHRcdFx0YXJySXRlbSA9IEpTT04uc3RyaW5naWZ5KGFyclthcnJJbmRleF0pO1xuXG5cdFx0XHQvLyBDaGVjayBpZiBzdHJpbmcgZXhpc3RzIGluIG9iamVjdCBqc29uXG5cdFx0XHRpZiAoYXJySXRlbS5pbmRleE9mKHNlYXJjaCkgPiAtMSkge1xuXHRcdFx0XHQvLyBBZGQgdGhpcyBpdGVtIHRvIHRoZSB0ZW1wIGNvbGxlY3Rpb25cblx0XHRcdFx0dGVtcENvbGwuaW5zZXJ0KGFyclthcnJJbmRleF0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0ZW1wQ29sbC5maW5kKHt9LCBvcHRpb25zKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHNlYXJjaCwgb3B0aW9ucyk7XG5cdH1cbn07XG5cbi8qKlxuICogUHJvdmlkZXMgYSBxdWVyeSBwbGFuIC8gb3BlcmF0aW9ucyBsb2cgZm9yIGEgcXVlcnkuXG4gKiBAcGFyYW0ge09iamVjdH0gcXVlcnkgVGhlIHF1ZXJ5IHRvIGV4ZWN1dGUuXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBUaGUgcXVlcnkgcGxhbi5cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZXhwbGFpbiA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucykge1xuXHR2YXIgcmVzdWx0ID0gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblx0cmV0dXJuIHJlc3VsdC5fX2ZkYk9wLl9kYXRhO1xufTtcblxuLyoqXG4gKiBRdWVyaWVzIHRoZSBjb2xsZWN0aW9uIGJhc2VkIG9uIHRoZSBxdWVyeSBvYmplY3QgcGFzc2VkLlxuICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IFRoZSBxdWVyeSBrZXkvdmFsdWVzIHRoYXQgYSBkb2N1bWVudCBtdXN0IG1hdGNoIGluXG4gKiBvcmRlciBmb3IgaXQgdG8gYmUgcmV0dXJuZWQgaW4gdGhlIHJlc3VsdCBhcnJheS5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9ucyBBbiBvcHRpb25hbCBvcHRpb25zIG9iamVjdC5cbiAqXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSByZXN1bHRzIGFycmF5IGZyb20gdGhlIGZpbmQgb3BlcmF0aW9uLCBjb250YWluaW5nIGFsbFxuICogZG9jdW1lbnRzIHRoYXQgbWF0Y2hlZCB0aGUgcXVlcnkuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMpIHtcblx0cXVlcnkgPSBxdWVyeSB8fCB7fTtcblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0b3B0aW9ucy5kZWNvdXBsZSA9IG9wdGlvbnMuZGVjb3VwbGUgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuZGVjb3VwbGUgOiB0cnVlO1xuXG5cdHZhciBvcCA9IHRoaXMuX21ldHJpY3MuY3JlYXRlKCdmaW5kJyksXG5cdFx0c2VsZiA9IHRoaXMsXG5cdFx0YW5hbHlzaXMsXG5cdFx0ZmluYWxRdWVyeSxcblx0XHRzY2FuTGVuZ3RoLFxuXHRcdHJlcXVpcmVzVGFibGVTY2FuID0gdHJ1ZSxcblx0XHRyZXN1bHRBcnIsXG5cdFx0am9pbkNvbGxlY3Rpb25JbmRleCxcblx0XHRqb2luSW5kZXgsXG5cdFx0am9pbkNvbGxlY3Rpb24gPSB7fSxcblx0XHRqb2luUXVlcnksXG5cdFx0am9pblBhdGgsXG5cdFx0am9pbkNvbGxlY3Rpb25OYW1lLFxuXHRcdGpvaW5Db2xsZWN0aW9uSW5zdGFuY2UsXG5cdFx0am9pbk1hdGNoLFxuXHRcdGpvaW5NYXRjaEluZGV4LFxuXHRcdGpvaW5TZWFyY2gsXG5cdFx0am9pbk11bHRpLFxuXHRcdGpvaW5SZXF1aXJlLFxuXHRcdGpvaW5GaW5kUmVzdWx0cyxcblx0XHRyZXN1bHRDb2xsZWN0aW9uTmFtZSxcblx0XHRyZXN1bHRJbmRleCxcblx0XHRyZXN1bHRSZW1vdmUgPSBbXSxcblx0XHRpbmRleCxcblx0XHRpLFxuXHRcdG1hdGNoZXIgPSBmdW5jdGlvbiAoZG9jKSB7XG5cdFx0XHRyZXR1cm4gc2VsZi5fbWF0Y2goZG9jLCBxdWVyeSwgJ2FuZCcpO1xuXHRcdH07XG5cblx0b3Auc3RhcnQoKTtcblx0aWYgKHF1ZXJ5KSB7XG5cdFx0Ly8gR2V0IHF1ZXJ5IGFuYWx5c2lzIHRvIGV4ZWN1dGUgYmVzdCBvcHRpbWlzZWQgY29kZSBwYXRoXG5cdFx0b3AudGltZSgnYW5hbHlzZVF1ZXJ5Jyk7XG5cdFx0YW5hbHlzaXMgPSB0aGlzLl9hbmFseXNlUXVlcnkocXVlcnksIG9wdGlvbnMsIG9wKTtcblx0XHRvcC50aW1lKCdhbmFseXNlUXVlcnknKTtcblx0XHRvcC5kYXRhKCdhbmFseXNpcycsIGFuYWx5c2lzKTtcblxuXHRcdGlmIChhbmFseXNpcy5oYXNKb2luICYmIGFuYWx5c2lzLnF1ZXJpZXNKb2luKSB7XG5cdFx0XHQvLyBUaGUgcXVlcnkgaGFzIGEgam9pbiBhbmQgdHJpZXMgdG8gbGltaXQgYnkgaXQncyBqb2luZWQgZGF0YVxuXHRcdFx0Ly8gR2V0IGFuIGluc3RhbmNlIHJlZmVyZW5jZSB0byB0aGUgam9pbiBjb2xsZWN0aW9uc1xuXHRcdFx0b3AudGltZSgnam9pblJlZmVyZW5jZXMnKTtcblx0XHRcdGZvciAoam9pbkluZGV4ID0gMDsgam9pbkluZGV4IDwgYW5hbHlzaXMuam9pbnNPbi5sZW5ndGg7IGpvaW5JbmRleCsrKSB7XG5cdFx0XHRcdGpvaW5Db2xsZWN0aW9uTmFtZSA9IGFuYWx5c2lzLmpvaW5zT25bam9pbkluZGV4XTtcblx0XHRcdFx0am9pblBhdGggPSBuZXcgUGF0aChhbmFseXNpcy5qb2luUXVlcmllc1tqb2luQ29sbGVjdGlvbk5hbWVdKTtcblx0XHRcdFx0am9pblF1ZXJ5ID0gam9pblBhdGgudmFsdWUocXVlcnkpWzBdO1xuXHRcdFx0XHRqb2luQ29sbGVjdGlvblthbmFseXNpcy5qb2luc09uW2pvaW5JbmRleF1dID0gdGhpcy5fZGIuY29sbGVjdGlvbihhbmFseXNpcy5qb2luc09uW2pvaW5JbmRleF0pLnN1YnNldChqb2luUXVlcnkpO1xuXHRcdFx0fVxuXHRcdFx0b3AudGltZSgnam9pblJlZmVyZW5jZXMnKTtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBpZiBhbiBpbmRleCBsb29rdXAgY2FuIGJlIHVzZWQgdG8gcmV0dXJuIHRoaXMgcmVzdWx0XG5cdFx0aWYgKGFuYWx5c2lzLmluZGV4TWF0Y2gubGVuZ3RoICYmICghb3B0aW9ucyB8fCAob3B0aW9ucyAmJiAhb3B0aW9ucy5za2lwSW5kZXgpKSkge1xuXHRcdFx0b3AuZGF0YSgnaW5kZXgucG90ZW50aWFsJywgYW5hbHlzaXMuaW5kZXhNYXRjaCk7XG5cdFx0XHRvcC5kYXRhKCdpbmRleC51c2VkJywgYW5hbHlzaXMuaW5kZXhNYXRjaFswXS5pbmRleCk7XG5cblx0XHRcdC8vIEdldCB0aGUgZGF0YSBmcm9tIHRoZSBpbmRleFxuXHRcdFx0b3AudGltZSgnaW5kZXhMb29rdXAnKTtcblx0XHRcdHJlc3VsdEFyciA9IGFuYWx5c2lzLmluZGV4TWF0Y2hbMF0ubG9va3VwO1xuXHRcdFx0b3AudGltZSgnaW5kZXhMb29rdXAnKTtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGluZGV4IGNvdmVyYWdlIGlzIGFsbCBrZXlzLCBpZiBub3Qgd2Ugc3RpbGwgbmVlZCB0byB0YWJsZSBzY2FuIGl0XG5cdFx0XHRpZiAoYW5hbHlzaXMuaW5kZXhNYXRjaFswXS5rZXlEYXRhLnRvdGFsS2V5Q291bnQgPT09IGFuYWx5c2lzLmluZGV4TWF0Y2hbMF0ua2V5RGF0YS5tYXRjaGVkS2V5Q291bnQpIHtcblx0XHRcdFx0Ly8gUmVxdWlyZSBhIHRhYmxlIHNjYW4gdG8gZmluZCByZWxldmFudCBkb2N1bWVudHNcblx0XHRcdFx0cmVxdWlyZXNUYWJsZVNjYW4gPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0b3AuZmxhZygndXNlZEluZGV4JywgZmFsc2UpO1xuXHRcdH1cblxuXHRcdGlmIChyZXF1aXJlc1RhYmxlU2Nhbikge1xuXHRcdFx0aWYgKHJlc3VsdEFyciAmJiByZXN1bHRBcnIubGVuZ3RoKSB7XG5cdFx0XHRcdHNjYW5MZW5ndGggPSByZXN1bHRBcnIubGVuZ3RoO1xuXHRcdFx0XHRvcC50aW1lKCd0YWJsZVNjYW46ICcgKyBzY2FuTGVuZ3RoKTtcblx0XHRcdFx0Ly8gRmlsdGVyIHRoZSBzb3VyY2UgZGF0YSBhbmQgcmV0dXJuIHRoZSByZXN1bHRcblx0XHRcdFx0cmVzdWx0QXJyID0gcmVzdWx0QXJyLmZpbHRlcihtYXRjaGVyKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEZpbHRlciB0aGUgc291cmNlIGRhdGEgYW5kIHJldHVybiB0aGUgcmVzdWx0XG5cdFx0XHRcdHNjYW5MZW5ndGggPSB0aGlzLl9kYXRhLmxlbmd0aDtcblx0XHRcdFx0b3AudGltZSgndGFibGVTY2FuOiAnICsgc2Nhbkxlbmd0aCk7XG5cdFx0XHRcdHJlc3VsdEFyciA9IHRoaXMuX2RhdGEuZmlsdGVyKG1hdGNoZXIpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBPcmRlciB0aGUgYXJyYXkgaWYgd2Ugd2VyZSBwYXNzZWQgYSBzb3J0IGNsYXVzZVxuXHRcdFx0aWYgKG9wdGlvbnMuc29ydCkge1xuXHRcdFx0XHRvcC50aW1lKCdzb3J0Jyk7XG5cdFx0XHRcdHJlc3VsdEFyciA9IHRoaXMuc29ydChvcHRpb25zLnNvcnQsIHJlc3VsdEFycik7XG5cdFx0XHRcdG9wLnRpbWUoJ3NvcnQnKTtcblx0XHRcdH1cblx0XHRcdG9wLnRpbWUoJ3RhYmxlU2NhbjogJyArIHNjYW5MZW5ndGgpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRpb25zLmxpbWl0ICYmIHJlc3VsdEFyciAmJiByZXN1bHRBcnIubGVuZ3RoID4gb3B0aW9ucy5saW1pdCkge1xuXHRcdFx0cmVzdWx0QXJyLmxlbmd0aCA9IG9wdGlvbnMubGltaXQ7XG5cdFx0XHRvcC5kYXRhKCdsaW1pdCcsIG9wdGlvbnMubGltaXQpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRpb25zLmRlY291cGxlKSB7XG5cdFx0XHQvLyBOb3cgZGVjb3VwbGUgdGhlIGRhdGEgZnJvbSB0aGUgb3JpZ2luYWwgb2JqZWN0c1xuXHRcdFx0b3AudGltZSgnZGVjb3VwbGUnKTtcblx0XHRcdHJlc3VsdEFyciA9IHRoaXMuZGVjb3VwbGUocmVzdWx0QXJyKTtcblx0XHRcdG9wLnRpbWUoJ2RlY291cGxlJyk7XG5cdFx0XHRvcC5kYXRhKCdmbGFnLmRlY291cGxlJywgdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gTm93IHByb2Nlc3MgYW55IGpvaW5zIG9uIHRoZSBmaW5hbCBkYXRhXG5cdFx0aWYgKG9wdGlvbnMuam9pbikge1xuXHRcdFx0Zm9yIChqb2luQ29sbGVjdGlvbkluZGV4ID0gMDsgam9pbkNvbGxlY3Rpb25JbmRleCA8IG9wdGlvbnMuam9pbi5sZW5ndGg7IGpvaW5Db2xsZWN0aW9uSW5kZXgrKykge1xuXHRcdFx0XHRmb3IgKGpvaW5Db2xsZWN0aW9uTmFtZSBpbiBvcHRpb25zLmpvaW5bam9pbkNvbGxlY3Rpb25JbmRleF0pIHtcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5qb2luW2pvaW5Db2xsZWN0aW9uSW5kZXhdLmhhc093blByb3BlcnR5KGpvaW5Db2xsZWN0aW9uTmFtZSkpIHtcblx0XHRcdFx0XHRcdC8vIFNldCB0aGUga2V5IHRvIHN0b3JlIHRoZSBqb2luIHJlc3VsdCBpbiB0byB0aGUgY29sbGVjdGlvbiBuYW1lIGJ5IGRlZmF1bHRcblx0XHRcdFx0XHRcdHJlc3VsdENvbGxlY3Rpb25OYW1lID0gam9pbkNvbGxlY3Rpb25OYW1lO1xuXG5cdFx0XHRcdFx0XHQvLyBHZXQgdGhlIGpvaW4gY29sbGVjdGlvbiBpbnN0YW5jZSBmcm9tIHRoZSBEQlxuXHRcdFx0XHRcdFx0am9pbkNvbGxlY3Rpb25JbnN0YW5jZSA9IHRoaXMuX2RiLmNvbGxlY3Rpb24oam9pbkNvbGxlY3Rpb25OYW1lKTtcblxuXHRcdFx0XHRcdFx0Ly8gR2V0IHRoZSBtYXRjaCBkYXRhIGZvciB0aGUgam9pblxuXHRcdFx0XHRcdFx0am9pbk1hdGNoID0gb3B0aW9ucy5qb2luW2pvaW5Db2xsZWN0aW9uSW5kZXhdW2pvaW5Db2xsZWN0aW9uTmFtZV07XG5cblx0XHRcdFx0XHRcdC8vIExvb3Agb3VyIHJlc3VsdCBkYXRhIGFycmF5XG5cdFx0XHRcdFx0XHRmb3IgKHJlc3VsdEluZGV4ID0gMDsgcmVzdWx0SW5kZXggPCByZXN1bHRBcnIubGVuZ3RoOyByZXN1bHRJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdC8vIExvb3AgdGhlIGpvaW4gY29uZGl0aW9ucyBhbmQgYnVpbGQgYSBzZWFyY2ggb2JqZWN0IGZyb20gdGhlbVxuXHRcdFx0XHRcdFx0XHRqb2luU2VhcmNoID0ge307XG5cdFx0XHRcdFx0XHRcdGpvaW5NdWx0aSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRqb2luUmVxdWlyZSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRmb3IgKGpvaW5NYXRjaEluZGV4IGluIGpvaW5NYXRjaCkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChqb2luTWF0Y2guaGFzT3duUHJvcGVydHkoam9pbk1hdGNoSW5kZXgpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBDaGVjayB0aGUgam9pbiBjb25kaXRpb24gbmFtZSBmb3IgYSBzcGVjaWFsIGNvbW1hbmQgb3BlcmF0b3Jcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChqb2luTWF0Y2hJbmRleC5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBTcGVjaWFsIGNvbW1hbmRcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3dpdGNoIChqb2luTWF0Y2hJbmRleCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgJyRhcyc6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBSZW5hbWUgdGhlIGNvbGxlY3Rpb24gd2hlbiBzdG9yZWQgaW4gdGhlIHJlc3VsdCBkb2N1bWVudFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cmVzdWx0Q29sbGVjdGlvbk5hbWUgPSBqb2luTWF0Y2hbam9pbk1hdGNoSW5kZXhdO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlICckbXVsdGknOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gUmV0dXJuIGFuIGFycmF5IG9mIGRvY3VtZW50cyBpbnN0ZWFkIG9mIGEgc2luZ2xlIG1hdGNoaW5nIGRvY3VtZW50XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRqb2luTXVsdGkgPSBqb2luTWF0Y2hbam9pbk1hdGNoSW5kZXhdO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlICckcmVxdWlyZSc6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBSZW1vdmUgdGhlIHJlc3VsdCBpdGVtIGlmIG5vIG1hdGNoaW5nIGpvaW4gZGF0YSBpcyBmb3VuZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0am9pblJlcXVpcmUgPSBqb2luTWF0Y2hbam9pbk1hdGNoSW5kZXhdO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgZm9yIGEgZG91YmxlLWRvbGxhciB3aGljaCBpcyBhIGJhY2stcmVmZXJlbmNlIHRvIHRoZSByb290IGNvbGxlY3Rpb24gaXRlbVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGpvaW5NYXRjaEluZGV4LnN1YnN0cigwLCAzKSA9PT0gJyQkLicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQmFjayByZWZlcmVuY2Vcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gVE9ETzogU3VwcG9ydCBjb21wbGV4IGpvaW5zXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gVE9ETzogQ291bGQgb3B0aW1pc2UgdGhpcyBieSBjYWNoaW5nIHBhdGggb2JqZWN0c1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBHZXQgdGhlIGRhdGEgdG8gbWF0Y2ggYWdhaW5zdCBhbmQgc3RvcmUgaW4gdGhlIHNlYXJjaCBvYmplY3Rcblx0XHRcdFx0XHRcdFx0XHRcdFx0am9pblNlYXJjaFtqb2luTWF0Y2hJbmRleF0gPSBuZXcgUGF0aChqb2luTWF0Y2hbam9pbk1hdGNoSW5kZXhdKS52YWx1ZShyZXN1bHRBcnJbcmVzdWx0SW5kZXhdKVswXTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBEbyBhIGZpbmQgb24gdGhlIHRhcmdldCBjb2xsZWN0aW9uIGFnYWluc3QgdGhlIG1hdGNoIGRhdGFcblx0XHRcdFx0XHRcdFx0am9pbkZpbmRSZXN1bHRzID0gam9pbkNvbGxlY3Rpb25JbnN0YW5jZS5maW5kKGpvaW5TZWFyY2gpO1xuXG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHdlIHJlcXVpcmUgYSBqb2luZWQgcm93IHRvIGFsbG93IHRoZSByZXN1bHQgaXRlbVxuXHRcdFx0XHRcdFx0XHRpZiAoIWpvaW5SZXF1aXJlIHx8IChqb2luUmVxdWlyZSAmJiBqb2luRmluZFJlc3VsdHNbMF0pKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gSm9pbiBpcyBub3QgcmVxdWlyZWQgb3IgY29uZGl0aW9uIGlzIG1ldFxuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdEFycltyZXN1bHRJbmRleF1bcmVzdWx0Q29sbGVjdGlvbk5hbWVdID0gam9pbk11bHRpID09PSBmYWxzZSA/IGpvaW5GaW5kUmVzdWx0c1swXSA6IGpvaW5GaW5kUmVzdWx0cztcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBKb2luIHJlcXVpcmVkIGJ1dCBjb25kaXRpb24gbm90IG1ldCwgYWRkIGl0ZW0gdG8gcmVtb3ZhbCBxdWV1ZVxuXHRcdFx0XHRcdFx0XHRcdHJlc3VsdFJlbW92ZS5wdXNoKHJlc3VsdEFycltyZXN1bHRJbmRleF0pO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdG9wLmRhdGEoJ2ZsYWcuam9pbicsIHRydWUpO1xuXHRcdH1cblxuXHRcdC8vIFByb2Nlc3MgcmVtb3ZhbCBxdWV1ZVxuXHRcdGlmIChyZXN1bHRSZW1vdmUubGVuZ3RoKSB7XG5cdFx0XHRvcC50aW1lKCdyZW1vdmFsUXVldWUnKTtcblx0XHRcdGZvciAoaSA9IDA7IGkgPCByZXN1bHRSZW1vdmUubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aW5kZXggPSByZXN1bHRBcnIuaW5kZXhPZihyZXN1bHRSZW1vdmVbaV0pO1xuXG5cdFx0XHRcdGlmIChpbmRleCA+IC0xKSB7XG5cdFx0XHRcdFx0cmVzdWx0QXJyLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdG9wLnRpbWUoJ3JlbW92YWxRdWV1ZScpO1xuXHRcdH1cblxuXHRcdGlmIChvcHRpb25zLnRyYW5zZm9ybSkge1xuXHRcdFx0b3AudGltZSgndHJhbnNmb3JtJyk7XG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgcmVzdWx0QXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHJlc3VsdEFyci5zcGxpY2UoaSwgMSwgb3B0aW9ucy50cmFuc2Zvcm0ocmVzdWx0QXJyW2ldKSk7XG5cdFx0XHR9XG5cdFx0XHRvcC50aW1lKCd0cmFuc2Zvcm0nKTtcblx0XHRcdG9wLmRhdGEoJ2ZsYWcudHJhbnNmb3JtJywgdHJ1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gUHJvY2VzcyB0cmFuc2Zvcm1zXG5cdFx0aWYgKHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQgJiYgdGhpcy5fdHJhbnNmb3JtT3V0KSB7XG5cdFx0XHRvcC50aW1lKCd0cmFuc2Zvcm1PdXQnKTtcblx0XHRcdHJlc3VsdEFyciA9IHRoaXMudHJhbnNmb3JtT3V0KHJlc3VsdEFycik7XG5cdFx0XHRvcC50aW1lKCd0cmFuc2Zvcm1PdXQnKTtcblx0XHR9XG5cblxuXHRcdG9wLmRhdGEoJ3Jlc3VsdHMnLCByZXN1bHRBcnIubGVuZ3RoKTtcblxuXHRcdG9wLnN0b3AoKTtcblxuXHRcdHJlc3VsdEFyci5fX2ZkYk9wID0gb3A7XG5cblx0XHRyZXR1cm4gcmVzdWx0QXJyO1xuXHR9IGVsc2Uge1xuXHRcdG9wLnN0b3AoKTtcblxuXHRcdHJlc3VsdEFyciA9IFtdO1xuXHRcdHJlc3VsdEFyci5fX2ZkYk9wID0gb3A7XG5cblx0XHRyZXR1cm4gcmVzdWx0QXJyO1xuXHR9XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBjb2xsZWN0aW9uIHRyYW5zZm9ybSBvcHRpb25zLlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBBIGNvbGxlY3Rpb24gdHJhbnNmb3JtIG9wdGlvbnMgb2JqZWN0LlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnRyYW5zZm9ybSA9IGZ1bmN0aW9uIChvYmopIHtcblx0aWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0aWYgKHR5cGVvZiBvYmogPT09IFwib2JqZWN0XCIpIHtcblx0XHRcdGlmIChvYmouZW5hYmxlZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQgPSBvYmouZW5hYmxlZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG9iai5kYXRhSW4gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1JbiA9IG9iai5kYXRhSW47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChvYmouZGF0YU91dCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHRoaXMuX3RyYW5zZm9ybU91dCA9IG9iai5kYXRhT3V0O1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAob2JqID09PSBmYWxzZSkge1xuXHRcdFx0XHQvLyBUdXJuIG9mZiB0cmFuc2Zvcm1zXG5cdFx0XHRcdHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQgPSBmYWxzZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFR1cm4gb24gdHJhbnNmb3Jtc1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1FbmFibGVkID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0ZW5hYmxlZDogdGhpcy5fdHJhbnNmb3JtRW5hYmxlZCxcblx0XHRkYXRhSW46IHRoaXMuX3RyYW5zZm9ybUluLFxuXHRcdGRhdGFPdXQ6IHRoaXMuX3RyYW5zZm9ybU91dFxuXHR9XG59O1xuXG4vKipcbiAqIFRyYW5zZm9ybXMgZGF0YSB1c2luZyB0aGUgc2V0IHRyYW5zZm9ybUluIG1ldGhvZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBkYXRhIHRvIHRyYW5zZm9ybS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS50cmFuc2Zvcm1JbiA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdGlmICh0aGlzLl90cmFuc2Zvcm1FbmFibGVkICYmIHRoaXMuX3RyYW5zZm9ybUluKSB7XG5cdFx0aWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0dmFyIGZpbmFsQXJyID0gW10sIGk7XG5cblx0XHRcdGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGZpbmFsQXJyW2ldID0gdGhpcy5fdHJhbnNmb3JtSW4oZGF0YVtpXSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmaW5hbEFycjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3RyYW5zZm9ybUluKGRhdGEpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBkYXRhO1xufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm1zIGRhdGEgdXNpbmcgdGhlIHNldCB0cmFuc2Zvcm1PdXQgbWV0aG9kLlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIGRhdGEgdG8gdHJhbnNmb3JtLlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnRyYW5zZm9ybU91dCA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdGlmICh0aGlzLl90cmFuc2Zvcm1FbmFibGVkICYmIHRoaXMuX3RyYW5zZm9ybU91dCkge1xuXHRcdGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdHZhciBmaW5hbEFyciA9IFtdLCBpO1xuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRmaW5hbEFycltpXSA9IHRoaXMuX3RyYW5zZm9ybU91dChkYXRhW2ldKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZpbmFsQXJyO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdHJhbnNmb3JtT3V0KGRhdGEpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBkYXRhO1xufTtcblxuLyoqXG4gKiBTb3J0cyBhbiBhcnJheSBvZiBkb2N1bWVudHMgYnkgdGhlIGdpdmVuIHNvcnQgcGF0aC5cbiAqIEBwYXJhbSB7Kn0gc29ydE9iaiBUaGUga2V5cyBhbmQgb3JkZXJzIHRoZSBhcnJheSBvYmplY3RzIHNob3VsZCBiZSBzb3J0ZWQgYnkuXG4gKiBAcGFyYW0ge0FycmF5fSBhcnIgVGhlIGFycmF5IG9mIGRvY3VtZW50cyB0byBzb3J0LlxuICogQHJldHVybnMge0FycmF5fVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zb3J0ID0gZnVuY3Rpb24gKHNvcnRPYmosIGFycikge1xuXHQvLyBNYWtlIHN1cmUgd2UgaGF2ZSBhbiBhcnJheSBvYmplY3Rcblx0YXJyID0gYXJyIHx8IFtdO1xuXG5cdHZhclx0c29ydEFyciA9IFtdLFxuXHRcdHNvcnRLZXksXG5cdFx0c29ydFNpbmdsZU9iajtcblxuXHRmb3IgKHNvcnRLZXkgaW4gc29ydE9iaikge1xuXHRcdGlmIChzb3J0T2JqLmhhc093blByb3BlcnR5KHNvcnRLZXkpKSB7XG5cdFx0XHRzb3J0U2luZ2xlT2JqID0ge307XG5cdFx0XHRzb3J0U2luZ2xlT2JqW3NvcnRLZXldID0gc29ydE9ialtzb3J0S2V5XTtcblx0XHRcdHNvcnRTaW5nbGVPYmouX19fZmRiS2V5ID0gc29ydEtleTtcblx0XHRcdHNvcnRBcnIucHVzaChzb3J0U2luZ2xlT2JqKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoc29ydEFyci5sZW5ndGggPCAyKSB7XG5cdFx0Ly8gVGhlcmUgaXMgb25seSBvbmUgc29ydCBjcml0ZXJpYSwgZG8gYSBzaW1wbGUgc29ydCBhbmQgcmV0dXJuIGl0XG5cdFx0cmV0dXJuIHRoaXMuX3NvcnQoc29ydE9iaiwgYXJyKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gdGhpcy5fYnVja2V0U29ydChzb3J0QXJyLCBhcnIpO1xuXHR9XG59O1xuXG4vKipcbiAqIFRha2VzIGFycmF5IG9mIHNvcnQgcGF0aHMgYW5kIHNvcnRzIHRoZW0gaW50byBidWNrZXRzIGJlZm9yZSByZXR1cm5pbmcgZmluYWxcbiAqIGFycmF5IGZ1bGx5IHNvcnRlZCBieSBtdWx0aS1rZXlzLlxuICogQHBhcmFtIGtleUFyclxuICogQHBhcmFtIGFyclxuICogQHJldHVybnMgeyp9XG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fYnVja2V0U29ydCA9IGZ1bmN0aW9uIChrZXlBcnIsIGFycikge1xuXHR2YXIga2V5T2JqID0ga2V5QXJyLnNoaWZ0KCksXG5cdFx0YXJyQ29weSxcblx0XHRidWNrZXRzLFxuXHRcdGksXG5cdFx0ZmluYWxBcnIgPSBbXTtcblxuXHRpZiAoa2V5QXJyLmxlbmd0aCA+IDApIHtcblx0XHQvLyBTb3J0IGFycmF5IGJ5IGJ1Y2tldCBrZXlcblx0XHRhcnIgPSB0aGlzLl9zb3J0KGtleU9iaiwgYXJyKTtcblxuXHRcdC8vIFNwbGl0IGl0ZW1zIGludG8gYnVja2V0c1xuXHRcdGJ1Y2tldHMgPSB0aGlzLmJ1Y2tldChrZXlPYmouX19fZmRiS2V5LCBhcnIpO1xuXG5cdFx0Ly8gTG9vcCBidWNrZXRzIGFuZCBzb3J0IGNvbnRlbnRzXG5cdFx0Zm9yIChpIGluIGJ1Y2tldHMpIHtcblx0XHRcdGlmIChidWNrZXRzLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRcdGFyckNvcHkgPSBbXS5jb25jYXQoa2V5QXJyKTtcblx0XHRcdFx0ZmluYWxBcnIgPSBmaW5hbEFyci5jb25jYXQodGhpcy5fYnVja2V0U29ydChhcnJDb3B5LCBidWNrZXRzW2ldKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZpbmFsQXJyO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB0aGlzLl9zb3J0KGtleU9iaiwgYXJyKTtcblx0fVxufTtcblxuLyoqXG4gKiBTb3J0cyBhcnJheSBieSBpbmRpdmlkdWFsIHNvcnQgcGF0aC5cbiAqIEBwYXJhbSBrZXlcbiAqIEBwYXJhbSBhcnJcbiAqIEByZXR1cm5zIHtBcnJheXwqfVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3NvcnQgPSBmdW5jdGlvbiAoa2V5LCBhcnIpIHtcblx0dmFyIHNvcnRlck1ldGhvZCxcblx0XHRwYXRoU29sdmVyID0gbmV3IFBhdGgoKSxcblx0XHRkYXRhUGF0aCA9IHBhdGhTb2x2ZXIucGFyc2Uoa2V5LCB0cnVlKVswXTtcblxuXHRwYXRoU29sdmVyLnBhdGgoZGF0YVBhdGgucGF0aCk7XG5cblx0aWYgKGRhdGFQYXRoLnZhbHVlID09PSAxKSB7XG5cdFx0Ly8gU29ydCBhc2NlbmRpbmdcblx0XHRzb3J0ZXJNZXRob2QgPSBmdW5jdGlvbiAoYSwgYikge1xuXHRcdFx0dmFyIHZhbEEgPSBwYXRoU29sdmVyLnZhbHVlKGEpWzBdLFxuXHRcdFx0XHR2YWxCID0gcGF0aFNvbHZlci52YWx1ZShiKVswXTtcblxuXHRcdFx0aWYgKHR5cGVvZih2YWxBKSA9PT0gJ3N0cmluZycgJiYgdHlwZW9mKHZhbEIpID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRyZXR1cm4gdmFsQS5sb2NhbGVDb21wYXJlKHZhbEIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHZhbEEgPiB2YWxCKSB7XG5cdFx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHRcdH0gZWxzZSBpZiAodmFsQSA8IHZhbEIpIHtcblx0XHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fTtcblx0fSBlbHNlIHtcblx0XHQvLyBTb3J0IGRlc2NlbmRpbmdcblx0XHRzb3J0ZXJNZXRob2QgPSBmdW5jdGlvbiAoYSwgYikge1xuXHRcdFx0dmFyIHZhbEEgPSBwYXRoU29sdmVyLnZhbHVlKGEpWzBdLFxuXHRcdFx0XHR2YWxCID0gcGF0aFNvbHZlci52YWx1ZShiKVswXTtcblxuXHRcdFx0aWYgKHR5cGVvZih2YWxBKSA9PT0gJ3N0cmluZycgJiYgdHlwZW9mKHZhbEIpID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRyZXR1cm4gdmFsQS5sb2NhbGVDb21wYXJlKHZhbEIpID09PSAxID8gLTEgOiAxO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHZhbEEgPiB2YWxCKSB7XG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHZhbEEgPCB2YWxCKSB7XG5cdFx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDA7XG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiBhcnIuc29ydChzb3J0ZXJNZXRob2QpO1xufTtcblxuLyoqXG4gKiBUYWtlcyBhbiBhcnJheSBvZiBvYmplY3RzIGFuZCByZXR1cm5zIGEgbmV3IG9iamVjdCB3aXRoIHRoZSBhcnJheSBpdGVtc1xuICogc3BsaXQgaW50byBidWNrZXRzIGJ5IHRoZSBwYXNzZWQga2V5LlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBUaGUga2V5IHRvIHNwbGl0IHRoZSBhcnJheSBpbnRvIGJ1Y2tldHMgYnkuXG4gKiBAcGFyYW0ge0FycmF5fSBhcnIgQW4gYXJyYXkgb2Ygb2JqZWN0cy5cbiAqIEByZXR1cm5zIHtPYmplY3R9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmJ1Y2tldCA9IGZ1bmN0aW9uIChrZXksIGFycikge1xuXHR2YXIgaSxcblx0XHRidWNrZXRzID0ge307XG5cblx0Zm9yIChpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuXHRcdGJ1Y2tldHNbYXJyW2ldW2tleV1dID0gYnVja2V0c1thcnJbaV1ba2V5XV0gfHwgW107XG5cdFx0YnVja2V0c1thcnJbaV1ba2V5XV0ucHVzaChhcnJbaV0pO1xuXHR9XG5cblx0cmV0dXJuIGJ1Y2tldHM7XG59O1xuXG4vKipcbiAqIEludGVybmFsIG1ldGhvZCB0aGF0IHRha2VzIGEgc2VhcmNoIHF1ZXJ5IGFuZCBvcHRpb25zIGFuZCByZXR1cm5zIGFuIG9iamVjdFxuICogY29udGFpbmluZyBkZXRhaWxzIGFib3V0IHRoZSBxdWVyeSB3aGljaCBjYW4gYmUgdXNlZCB0byBvcHRpbWlzZSB0aGUgc2VhcmNoLlxuICpcbiAqIEBwYXJhbSBxdWVyeVxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEBwYXJhbSBvcFxuICogQHJldHVybnMge09iamVjdH1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9hbmFseXNlUXVlcnkgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMsIG9wKSB7XG5cdHZhciBhbmFseXNpcyA9IHtcblx0XHRcdHF1ZXJpZXNPbjogW3RoaXMuX25hbWVdLFxuXHRcdFx0aW5kZXhNYXRjaDogW10sXG5cdFx0XHRoYXNKb2luOiBmYWxzZSxcblx0XHRcdHF1ZXJpZXNKb2luOiBmYWxzZSxcblx0XHRcdGpvaW5RdWVyaWVzOiB7fSxcblx0XHRcdHF1ZXJ5OiBxdWVyeSxcblx0XHRcdG9wdGlvbnM6IG9wdGlvbnNcblx0XHR9LFxuXHRcdGpvaW5Db2xsZWN0aW9uSW5kZXgsXG5cdFx0am9pbkNvbGxlY3Rpb25OYW1lLFxuXHRcdGpvaW5Db2xsZWN0aW9ucyA9IFtdLFxuXHRcdGpvaW5Db2xsZWN0aW9uUmVmZXJlbmNlcyA9IFtdLFxuXHRcdHF1ZXJ5UGF0aCxcblx0XHRpbmRleCxcblx0XHRpbmRleE1hdGNoRGF0YSxcblx0XHRpbmRleFJlZixcblx0XHRpbmRleFJlZk5hbWUsXG5cdFx0aW5kZXhMb29rdXAsXG5cdFx0cGF0aFNvbHZlcixcblx0XHRpO1xuXG5cdC8vIENoZWNrIGlmIHRoZSBxdWVyeSBpcyBhIHByaW1hcnkga2V5IGxvb2t1cFxuXHRvcC50aW1lKCdjaGVja0luZGV4ZXMnKTtcblx0aWYgKHF1ZXJ5W3RoaXMuX3ByaW1hcnlLZXldICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBSZXR1cm4gaXRlbSB2aWEgcHJpbWFyeSBrZXkgcG9zc2libGVcblx0XHRvcC50aW1lKCdjaGVja0luZGV4TWF0Y2g6IFByaW1hcnkgS2V5Jyk7XG5cdFx0cGF0aFNvbHZlciA9IG5ldyBQYXRoKCk7XG5cdFx0YW5hbHlzaXMuaW5kZXhNYXRjaC5wdXNoKHtcblx0XHRcdGxvb2t1cDogdGhpcy5fcHJpbWFyeUluZGV4Lmxvb2t1cChxdWVyeSwgb3B0aW9ucyksXG5cdFx0XHRrZXlEYXRhOiB7XG5cdFx0XHRcdG1hdGNoZWRLZXlzOiBbdGhpcy5fcHJpbWFyeUtleV0sXG5cdFx0XHRcdG1hdGNoZWRLZXlDb3VudDogMSxcblx0XHRcdFx0dG90YWxLZXlDb3VudDogcGF0aFNvbHZlci5jb3VudEtleXMocXVlcnkpXG5cdFx0XHR9LFxuXHRcdFx0aW5kZXg6IHRoaXMuX3ByaW1hcnlJbmRleFxuXHRcdH0pO1xuXHRcdG9wLnRpbWUoJ2NoZWNrSW5kZXhNYXRjaDogUHJpbWFyeSBLZXknKTtcblx0fVxuXG5cdC8vIENoZWNrIGlmIGFuIGluZGV4IGNhbiBzcGVlZCB1cCB0aGUgcXVlcnlcblx0Zm9yIChpIGluIHRoaXMuX2luZGV4QnlJZCkge1xuXHRcdGlmICh0aGlzLl9pbmRleEJ5SWQuaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGluZGV4UmVmID0gdGhpcy5faW5kZXhCeUlkW2ldO1xuXHRcdFx0aW5kZXhSZWZOYW1lID0gaW5kZXhSZWYubmFtZSgpO1xuXG5cdFx0XHRvcC50aW1lKCdjaGVja0luZGV4TWF0Y2g6ICcgKyBpbmRleFJlZk5hbWUpO1xuXHRcdFx0aW5kZXhNYXRjaERhdGEgPSBpbmRleFJlZi5tYXRjaChxdWVyeSwgb3B0aW9ucyk7XG5cdFx0XHRpbmRleExvb2t1cCA9IGluZGV4UmVmLmxvb2t1cChxdWVyeSwgb3B0aW9ucyk7XG5cblx0XHRcdGlmIChpbmRleE1hdGNoRGF0YS5tYXRjaGVkS2V5Q291bnQgPiAwKSB7XG5cdFx0XHRcdC8vIFRoaXMgaW5kZXggY2FuIGJlIHVzZWQsIHN0b3JlIGl0XG5cdFx0XHRcdGFuYWx5c2lzLmluZGV4TWF0Y2gucHVzaCh7XG5cdFx0XHRcdFx0bG9va3VwOiBpbmRleExvb2t1cCxcblx0XHRcdFx0XHRrZXlEYXRhOiBpbmRleE1hdGNoRGF0YSxcblx0XHRcdFx0XHRpbmRleDogaW5kZXhSZWZcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRvcC50aW1lKCdjaGVja0luZGV4TWF0Y2g6ICcgKyBpbmRleFJlZk5hbWUpO1xuXG5cdFx0XHRpZiAoaW5kZXhNYXRjaERhdGEudG90YWxLZXlDb3VudCA9PT0gaW5kZXhNYXRjaERhdGEubWF0Y2hlZEtleUNvdW50KSB7XG5cdFx0XHRcdC8vIEZvdW5kIGFuIG9wdGltYWwgaW5kZXgsIGRvIG5vdCBjaGVjayBmb3IgYW55IG1vcmVcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdG9wLnRpbWUoJ2NoZWNrSW5kZXhlcycpO1xuXG5cdC8vIFNvcnQgYXJyYXkgZGVzY2VuZGluZyBvbiBpbmRleCBrZXkgY291bnQgKGVmZmVjdGl2ZWx5IGEgbWVhc3VyZSBvZiByZWxldmFuY2UgdG8gdGhlIHF1ZXJ5KVxuXHRpZiAoYW5hbHlzaXMuaW5kZXhNYXRjaC5sZW5ndGggPiAxKSB7XG5cdFx0b3AudGltZSgnZmluZE9wdGltYWxJbmRleCcpO1xuXHRcdGFuYWx5c2lzLmluZGV4TWF0Y2guc29ydChmdW5jdGlvbiAoYSwgYikge1xuXHRcdFx0aWYgKGEua2V5RGF0YS50b3RhbEtleUNvdW50ID09PSBhLmtleURhdGEubWF0Y2hlZEtleUNvdW50KSB7XG5cdFx0XHRcdC8vIFRoaXMgaW5kZXggbWF0Y2hlcyBhbGwgcXVlcnkga2V5cyBzbyB3aWxsIHJldHVybiB0aGUgY29ycmVjdCByZXN1bHQgaW5zdGFudGx5XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGIua2V5RGF0YS50b3RhbEtleUNvdW50ID09PSBiLmtleURhdGEubWF0Y2hlZEtleUNvdW50KSB7XG5cdFx0XHRcdC8vIFRoaXMgaW5kZXggbWF0Y2hlcyBhbGwgcXVlcnkga2V5cyBzbyB3aWxsIHJldHVybiB0aGUgY29ycmVjdCByZXN1bHQgaW5zdGFudGx5XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUaGUgaW5kZXhlcyBkb24ndCBtYXRjaCBhbGwgdGhlIHF1ZXJ5IGtleXMsIGNoZWNrIGlmIGJvdGggdGhlc2UgaW5kZXhlcyBtYXRjaFxuXHRcdFx0Ly8gdGhlIHNhbWUgbnVtYmVyIG9mIGtleXMgYW5kIGlmIHNvIHRoZXkgYXJlIHRlY2huaWNhbGx5IGVxdWFsIGZyb20gYSBrZXkgcG9pbnRcblx0XHRcdC8vIG9mIHZpZXcsIGJ1dCBjYW4gc3RpbGwgYmUgY29tcGFyZWQgYnkgdGhlIG51bWJlciBvZiByZWNvcmRzIHRoZXkgcmV0dXJuIGZyb21cblx0XHRcdC8vIHRoZSBxdWVyeS4gVGhlIGZld2VyIHJlY29yZHMgdGhleSByZXR1cm4gdGhlIGJldHRlciBzbyBvcmRlciBieSByZWNvcmQgY291bnRcblx0XHRcdGlmIChhLmtleURhdGEubWF0Y2hlZEtleUNvdW50ID09PSBiLmtleURhdGEubWF0Y2hlZEtleUNvdW50KSB7XG5cdFx0XHRcdHJldHVybiBhLmxvb2t1cC5sZW5ndGggLSBiLmxvb2t1cC5sZW5ndGg7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRoZSBpbmRleGVzIGRvbid0IG1hdGNoIGFsbCB0aGUgcXVlcnkga2V5cyBhbmQgdGhleSBkb24ndCBoYXZlIG1hdGNoaW5nIGtleVxuXHRcdFx0Ly8gY291bnRzLCBzbyBvcmRlciB0aGVtIGJ5IGtleSBjb3VudC4gVGhlIGluZGV4IHdpdGggdGhlIG1vc3QgbWF0Y2hpbmcga2V5c1xuXHRcdFx0Ly8gc2hvdWxkIHJldHVybiB0aGUgcXVlcnkgcmVzdWx0cyB0aGUgZmFzdGVzdFxuXHRcdFx0cmV0dXJuIGIua2V5RGF0YS5tYXRjaGVkS2V5Q291bnQgLSBhLmtleURhdGEubWF0Y2hlZEtleUNvdW50OyAvLyBpbmRleC5fa2V5Q291bnRcblx0XHR9KTtcblx0XHRvcC50aW1lKCdmaW5kT3B0aW1hbEluZGV4Jyk7XG5cdH1cblxuXHQvLyBDaGVjayBmb3Igam9pbiBkYXRhXG5cdGlmIChvcHRpb25zLmpvaW4pIHtcblx0XHRhbmFseXNpcy5oYXNKb2luID0gdHJ1ZTtcblxuXHRcdC8vIExvb3AgYWxsIGpvaW4gb3BlcmF0aW9uc1xuXHRcdGZvciAoam9pbkNvbGxlY3Rpb25JbmRleCA9IDA7IGpvaW5Db2xsZWN0aW9uSW5kZXggPCBvcHRpb25zLmpvaW4ubGVuZ3RoOyBqb2luQ29sbGVjdGlvbkluZGV4KyspIHtcblx0XHRcdC8vIExvb3AgdGhlIGpvaW4gY29sbGVjdGlvbnMgYW5kIGtlZXAgYSByZWZlcmVuY2UgdG8gdGhlbVxuXHRcdFx0Zm9yIChqb2luQ29sbGVjdGlvbk5hbWUgaW4gb3B0aW9ucy5qb2luW2pvaW5Db2xsZWN0aW9uSW5kZXhdKSB7XG5cdFx0XHRcdGlmIChvcHRpb25zLmpvaW5bam9pbkNvbGxlY3Rpb25JbmRleF0uaGFzT3duUHJvcGVydHkoam9pbkNvbGxlY3Rpb25OYW1lKSkge1xuXHRcdFx0XHRcdGpvaW5Db2xsZWN0aW9ucy5wdXNoKGpvaW5Db2xsZWN0aW9uTmFtZSk7XG5cblx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgam9pbiB1c2VzIGFuICRhcyBvcGVyYXRvclxuXHRcdFx0XHRcdGlmICgnJGFzJyBpbiBvcHRpb25zLmpvaW5bam9pbkNvbGxlY3Rpb25JbmRleF1bam9pbkNvbGxlY3Rpb25OYW1lXSkge1xuXHRcdFx0XHRcdFx0am9pbkNvbGxlY3Rpb25SZWZlcmVuY2VzLnB1c2gob3B0aW9ucy5qb2luW2pvaW5Db2xsZWN0aW9uSW5kZXhdW2pvaW5Db2xsZWN0aW9uTmFtZV1bJyRhcyddKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0am9pbkNvbGxlY3Rpb25SZWZlcmVuY2VzLnB1c2goam9pbkNvbGxlY3Rpb25OYW1lKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBMb29wIHRoZSBqb2luIGNvbGxlY3Rpb24gcmVmZXJlbmNlcyBhbmQgZGV0ZXJtaW5lIGlmIHRoZSBxdWVyeSByZWZlcmVuY2VzXG5cdFx0Ly8gYW55IG9mIHRoZSBjb2xsZWN0aW9ucyB0aGF0IGFyZSB1c2VkIGluIHRoZSBqb2luLiBJZiB0aGVyZSBubyBxdWVyaWVzIGFnYWluc3Rcblx0XHQvLyBqb2luZWQgY29sbGVjdGlvbnMgdGhlIGZpbmQgbWV0aG9kIGNhbiB1c2UgYSBjb2RlIHBhdGggb3B0aW1pc2VkIGZvciB0aGlzLlxuXHRcdC8vIFF1ZXJpZXMgYWdhaW5zdCBqb2luZWQgY29sbGVjdGlvbnMgcmVxdWlyZXMgdGhlIGpvaW5lZCBjb2xsZWN0aW9ucyB0byBiZSBmaWx0ZXJlZFxuXHRcdC8vIGZpcnN0IGFuZCB0aGVuIGpvaW5lZCBzbyByZXF1aXJlcyBhIGxpdHRsZSBtb3JlIHdvcmsuXG5cdFx0Zm9yIChpbmRleCA9IDA7IGluZGV4IDwgam9pbkNvbGxlY3Rpb25SZWZlcmVuY2VzLmxlbmd0aDsgaW5kZXgrKykge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIHF1ZXJ5IHJlZmVyZW5jZXMgYW55IGNvbGxlY3Rpb24gZGF0YSB0aGF0IHRoZSBqb2luIHdpbGwgY3JlYXRlXG5cdFx0XHRxdWVyeVBhdGggPSB0aGlzLl9xdWVyeVJlZmVyZW5jZXNDb2xsZWN0aW9uKHF1ZXJ5LCBqb2luQ29sbGVjdGlvblJlZmVyZW5jZXNbaW5kZXhdLCAnJyk7XG5cblx0XHRcdGlmIChxdWVyeVBhdGgpIHtcblx0XHRcdFx0YW5hbHlzaXMuam9pblF1ZXJpZXNbam9pbkNvbGxlY3Rpb25zW2luZGV4XV0gPSBxdWVyeVBhdGg7XG5cdFx0XHRcdGFuYWx5c2lzLnF1ZXJpZXNKb2luID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRhbmFseXNpcy5qb2luc09uID0gam9pbkNvbGxlY3Rpb25zO1xuXHRcdGFuYWx5c2lzLnF1ZXJpZXNPbiA9IGFuYWx5c2lzLnF1ZXJpZXNPbi5jb25jYXQoam9pbkNvbGxlY3Rpb25zKTtcblx0fVxuXG5cdHJldHVybiBhbmFseXNpcztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBwYXNzZWQgcXVlcnkgcmVmZXJlbmNlcyB0aGlzIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0gcXVlcnlcbiAqIEBwYXJhbSBjb2xsZWN0aW9uXG4gKiBAcGFyYW0gcGF0aFxuICogQHJldHVybnMgeyp9XG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fcXVlcnlSZWZlcmVuY2VzQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChxdWVyeSwgY29sbGVjdGlvbiwgcGF0aCkge1xuXHR2YXIgaTtcblxuXHRmb3IgKGkgaW4gcXVlcnkpIHtcblx0XHRpZiAocXVlcnkuaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMga2V5IGlzIGEgcmVmZXJlbmNlIG1hdGNoXG5cdFx0XHRpZiAoaSA9PT0gY29sbGVjdGlvbikge1xuXHRcdFx0XHRpZiAocGF0aCkgeyBwYXRoICs9ICcuJzsgfVxuXHRcdFx0XHRyZXR1cm4gcGF0aCArIGk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAodHlwZW9mKHF1ZXJ5W2ldKSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHQvLyBSZWN1cnNlXG5cdFx0XHRcdFx0aWYgKHBhdGgpIHsgcGF0aCArPSAnLic7IH1cblx0XHRcdFx0XHRwYXRoICs9IGk7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuX3F1ZXJ5UmVmZXJlbmNlc0NvbGxlY3Rpb24ocXVlcnlbaV0sIGNvbGxlY3Rpb24sIHBhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtZXRob2QgdGhhdCBjaGVja3MgYSBkb2N1bWVudCBhZ2FpbnN0IGEgdGVzdCBvYmplY3QuXG4gKiBAcGFyYW0geyp9IHNvdXJjZSBUaGUgc291cmNlIG9iamVjdCBvciB2YWx1ZSB0byB0ZXN0IGFnYWluc3QuXG4gKiBAcGFyYW0geyp9IHRlc3QgVGhlIHRlc3Qgb2JqZWN0IG9yIHZhbHVlIHRvIHRlc3Qgd2l0aC5cbiAqIEBwYXJhbSB7U3RyaW5nPX0gb3BUb0FwcGx5IFRoZSBzcGVjaWFsIG9wZXJhdGlvbiB0byBhcHBseSB0byB0aGUgdGVzdCBzdWNoXG4gKiBhcyAnYW5kJyBvciBhbiAnb3InIG9wZXJhdG9yLlxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIHRlc3Qgd2FzIHBvc2l0aXZlLCBmYWxzZSBvbiBuZWdhdGl2ZS5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9tYXRjaCA9IGZ1bmN0aW9uIChzb3VyY2UsIHRlc3QsIG9wVG9BcHBseSkge1xuXHR2YXIgb3BlcmF0aW9uLFxuXHRcdGFwcGx5T3AsXG5cdFx0cmVjdXJzZVZhbCxcblx0XHR0bXBJbmRleCxcblx0XHRzb3VyY2VUeXBlID0gdHlwZW9mIHNvdXJjZSxcblx0XHR0ZXN0VHlwZSA9IHR5cGVvZiB0ZXN0LFxuXHRcdG1hdGNoZWRBbGwgPSB0cnVlLFxuXHRcdGk7XG5cblx0Ly8gQ2hlY2sgaWYgdGhlIGNvbXBhcmlzb24gZGF0YSBhcmUgYm90aCBzdHJpbmdzIG9yIG51bWJlcnNcblx0aWYgKChzb3VyY2VUeXBlID09PSAnc3RyaW5nJyB8fCBzb3VyY2VUeXBlID09PSAnbnVtYmVyJykgJiYgKHRlc3RUeXBlID09PSAnc3RyaW5nJyB8fCB0ZXN0VHlwZSA9PT0gJ251bWJlcicpKSB7XG5cdFx0Ly8gVGhlIHNvdXJjZSBhbmQgdGVzdCBkYXRhIGFyZSBmbGF0IHR5cGVzIHRoYXQgZG8gbm90IHJlcXVpcmUgcmVjdXJzaXZlIHNlYXJjaGVzLFxuXHRcdC8vIHNvIGp1c3QgY29tcGFyZSB0aGVtIGFuZCByZXR1cm4gdGhlIHJlc3VsdFxuXHRcdGlmIChzb3VyY2UgIT09IHRlc3QpIHtcblx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm9yIChpIGluIHRlc3QpIHtcblx0XHRcdGlmICh0ZXN0Lmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRcdC8vIFJlc2V0IG9wZXJhdGlvbiBmbGFnXG5cdFx0XHRcdG9wZXJhdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBwcm9wZXJ0eSBzdGFydHMgd2l0aCBhIGRvbGxhciAoZnVuY3Rpb24pXG5cdFx0XHRcdGlmIChpLnN1YnN0cigwLCAxKSA9PT0gJyQnKSB7XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgZm9yIGNvbW1hbmRzXG5cdFx0XHRcdFx0c3dpdGNoIChpKSB7XG5cdFx0XHRcdFx0XHRjYXNlICckZ3QnOlxuXHRcdFx0XHRcdFx0XHQvLyBHcmVhdGVyIHRoYW5cblx0XHRcdFx0XHRcdFx0aWYgKHNvdXJjZSA+IHRlc3RbaV0pIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckZ3RlJzpcblx0XHRcdFx0XHRcdFx0Ly8gR3JlYXRlciB0aGFuIG9yIGVxdWFsXG5cdFx0XHRcdFx0XHRcdGlmIChzb3VyY2UgPj0gdGVzdFtpXSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRsdCc6XG5cdFx0XHRcdFx0XHRcdC8vIExlc3MgdGhhblxuXHRcdFx0XHRcdFx0XHRpZiAoc291cmNlIDwgdGVzdFtpXSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRsdGUnOlxuXHRcdFx0XHRcdFx0XHQvLyBMZXNzIHRoYW4gb3IgZXF1YWxcblx0XHRcdFx0XHRcdFx0aWYgKHNvdXJjZSA8PSB0ZXN0W2ldKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRvcGVyYXRpb24gPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJGV4aXN0cyc6XG5cdFx0XHRcdFx0XHRcdC8vIFByb3BlcnR5IGV4aXN0c1xuXHRcdFx0XHRcdFx0XHRpZiAoKHNvdXJjZSA9PT0gdW5kZWZpbmVkKSAhPT0gdGVzdFtpXSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRvcic6XG5cdFx0XHRcdFx0XHRcdC8vIE1hdGNoIHRydWUgb24gQU5ZIGNoZWNrIHRvIHBhc3Ncblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0XHRmb3IgKHZhciBvckluZGV4ID0gMDsgb3JJbmRleCA8IHRlc3RbaV0ubGVuZ3RoOyBvckluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAodGhpcy5fbWF0Y2goc291cmNlLCB0ZXN0W2ldW29ySW5kZXhdLCAnYW5kJykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckYW5kJzpcblx0XHRcdFx0XHRcdFx0Ly8gTWF0Y2ggdHJ1ZSBvbiBBTEwgY2hlY2tzIHRvIHBhc3Ncblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0XHRmb3IgKHZhciBhbmRJbmRleCA9IDA7IGFuZEluZGV4IDwgdGVzdFtpXS5sZW5ndGg7IGFuZEluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXRoaXMuX21hdGNoKHNvdXJjZSwgdGVzdFtpXVthbmRJbmRleF0sICdhbmQnKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJGluJzpcblx0XHRcdFx0XHRcdFx0Ly8gSW5cblxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBpbiB0ZXN0IGlzIGFuIGFycmF5XG5cdFx0XHRcdFx0XHRcdGlmICh0ZXN0W2ldIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0XHR2YXIgaW5BcnIgPSB0ZXN0W2ldLFxuXHRcdFx0XHRcdFx0XHRcdFx0aW5BcnJDb3VudCA9IGluQXJyLmxlbmd0aCxcblx0XHRcdFx0XHRcdFx0XHRcdGluQXJySW5kZXgsXG5cdFx0XHRcdFx0XHRcdFx0XHRpc0luID0gZmFsc2U7XG5cblx0XHRcdFx0XHRcdFx0XHRmb3IgKGluQXJySW5kZXggPSAwOyBpbkFyckluZGV4IDwgaW5BcnJDb3VudDsgaW5BcnJJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoaW5BcnJbaW5BcnJJbmRleF0gPT09IHNvdXJjZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRpc0luID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGlzSW4pIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0dGhyb3coJ0Nhbm5vdCB1c2UgYSAkbmluIG9wZXJhdG9yIG9uIGEgbm9uLWFycmF5IGtleTogJyArIGkpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRuaW4nOlxuXHRcdFx0XHRcdFx0XHQvLyBOb3QgaW5cblxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBub3QtaW4gdGVzdCBpcyBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAodGVzdFtpXSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIG5vdEluQXJyID0gdGVzdFtpXSxcblx0XHRcdFx0XHRcdFx0XHRcdG5vdEluQXJyQ291bnQgPSBub3RJbkFyci5sZW5ndGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRub3RJbkFyckluZGV4LFxuXHRcdFx0XHRcdFx0XHRcdFx0bm90SW4gPSB0cnVlO1xuXG5cdFx0XHRcdFx0XHRcdFx0Zm9yIChub3RJbkFyckluZGV4ID0gMDsgbm90SW5BcnJJbmRleCA8IG5vdEluQXJyQ291bnQ7IG5vdEluQXJySW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKG5vdEluQXJyW25vdEluQXJySW5kZXhdID09PSBzb3VyY2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0bm90SW4gPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKG5vdEluKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93KCdDYW5ub3QgdXNlIGEgJG5pbiBvcGVyYXRvciBvbiBhIG5vbi1hcnJheSBrZXk6ICcgKyBpKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckbmUnOlxuXHRcdFx0XHRcdFx0XHQvLyBOb3QgZXF1YWxzXG5cdFx0XHRcdFx0XHRcdGlmIChzb3VyY2UgIT0gdGVzdFtpXSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ2hlY2sgZm9yIHJlZ2V4XG5cdFx0XHRcdGlmICghb3BlcmF0aW9uICYmIHRlc3RbaV0gaW5zdGFuY2VvZiBSZWdFeHApIHtcblx0XHRcdFx0XHRvcGVyYXRpb24gPSB0cnVlO1xuXG5cdFx0XHRcdFx0aWYgKHR5cGVvZihzb3VyY2UpID09PSAnb2JqZWN0JyAmJiBzb3VyY2VbaV0gIT09IHVuZGVmaW5lZCAmJiB0ZXN0W2ldLnRlc3Qoc291cmNlW2ldKSkge1xuXHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghb3BlcmF0aW9uKSB7XG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgb3VyIHF1ZXJ5IGlzIGFuIG9iamVjdFxuXHRcdFx0XHRcdGlmICh0eXBlb2YodGVzdFtpXSkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0XHQvLyBCZWNhdXNlIHRlc3RbaV0gaXMgYW4gb2JqZWN0LCBzb3VyY2UgbXVzdCBhbHNvIGJlIGFuIG9iamVjdFxuXG5cdFx0XHRcdFx0XHQvLyBDaGVjayBpZiBvdXIgc291cmNlIGRhdGEgd2UgYXJlIGNoZWNraW5nIHRoZSB0ZXN0IHF1ZXJ5IGFnYWluc3Rcblx0XHRcdFx0XHRcdC8vIGlzIGFuIG9iamVjdCBvciBhbiBhcnJheVxuXHRcdFx0XHRcdFx0aWYgKHNvdXJjZVtpXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChzb3VyY2VbaV0gaW5zdGFuY2VvZiBBcnJheSAmJiAhKHRlc3RbaV0gaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBUaGUgc291cmNlIGRhdGEgaXMgYW4gYXJyYXksIHNvIGNoZWNrIGVhY2ggaXRlbSB1bnRpbCBhXG5cdFx0XHRcdFx0XHRcdFx0Ly8gbWF0Y2ggaXMgZm91bmRcblx0XHRcdFx0XHRcdFx0XHRyZWN1cnNlVmFsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh0bXBJbmRleCA9IDA7IHRtcEluZGV4IDwgc291cmNlW2ldLmxlbmd0aDsgdG1wSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVjdXJzZVZhbCA9IHRoaXMuX21hdGNoKHNvdXJjZVtpXVt0bXBJbmRleF0sIHRlc3RbaV0sIGFwcGx5T3ApO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAocmVjdXJzZVZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBPbmUgb2YgdGhlIGFycmF5IGl0ZW1zIG1hdGNoZWQgdGhlIHF1ZXJ5IHNvIHdlIGNhblxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBpbmNsdWRlIHRoaXMgaXRlbSBpbiB0aGUgcmVzdWx0cywgc28gYnJlYWsgbm93XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCEoc291cmNlW2ldIGluc3RhbmNlb2YgQXJyYXkpICYmIHRlc3RbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIFRoZSB0ZXN0IGtleSBkYXRhIGlzIGFuIGFycmF5IGFuZCB0aGUgc291cmNlIGtleSBkYXRhIGlzIG5vdCBzbyBjaGVja1xuXHRcdFx0XHRcdFx0XHRcdC8vIGVhY2ggaXRlbSBpbiB0aGUgdGVzdCBrZXkgZGF0YSB0byBzZWUgaWYgdGhlIHNvdXJjZSBpdGVtIG1hdGNoZXMgb25lXG5cdFx0XHRcdFx0XHRcdFx0Ly8gb2YgdGhlbS4gVGhpcyBpcyBlZmZlY3RpdmVseSBhbiAkaW4gc2VhcmNoLlxuXHRcdFx0XHRcdFx0XHRcdHJlY3Vyc2VWYWwgPSBmYWxzZTtcblxuXHRcdFx0XHRcdFx0XHRcdGZvciAodG1wSW5kZXggPSAwOyB0bXBJbmRleCA8IHRlc3RbaV0ubGVuZ3RoOyB0bXBJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZWN1cnNlVmFsID0gdGhpcy5fbWF0Y2goc291cmNlW2ldLCB0ZXN0W2ldW3RtcEluZGV4XSwgYXBwbHlPcCk7XG5cblx0XHRcdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIE9uZSBvZiB0aGUgYXJyYXkgaXRlbXMgbWF0Y2hlZCB0aGUgcXVlcnkgc28gd2UgY2FuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIGluY2x1ZGUgdGhpcyBpdGVtIGluIHRoZSByZXN1bHRzLCBzbyBicmVhayBub3dcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHJlY3Vyc2VWYWwpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodHlwZW9mKHNvdXJjZSkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gUmVjdXJzZSBkb3duIHRoZSBvYmplY3QgdHJlZVxuXHRcdFx0XHRcdFx0XHRcdHJlY3Vyc2VWYWwgPSB0aGlzLl9tYXRjaChzb3VyY2VbaV0sIHRlc3RbaV0sIGFwcGx5T3ApO1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHJlY3Vyc2VWYWwpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0cmVjdXJzZVZhbCA9IHRoaXMuX21hdGNoKHVuZGVmaW5lZCwgdGVzdFtpXSwgYXBwbHlPcCk7XG5cblx0XHRcdFx0XHRcdFx0XHRpZiAocmVjdXJzZVZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly8gRmlyc3QgY2hlY2sgaWYgdGhlIHRlc3QgbWF0Y2ggaXMgYW4gJGV4aXN0c1xuXHRcdFx0XHRcdFx0XHRpZiAodGVzdFtpXSAmJiB0ZXN0W2ldWyckZXhpc3RzJ10gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIFB1c2ggdGhlIGl0ZW0gdGhyb3VnaCBhbm90aGVyIG1hdGNoIHJlY3Vyc2Vcblx0XHRcdFx0XHRcdFx0XHRyZWN1cnNlVmFsID0gdGhpcy5fbWF0Y2godW5kZWZpbmVkLCB0ZXN0W2ldLCBhcHBseU9wKTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgcHJvcCBtYXRjaGVzIG91ciB0ZXN0IHZhbHVlXG5cdFx0XHRcdFx0XHRpZiAoc291cmNlICYmIHNvdXJjZVtpXSA9PT0gdGVzdFtpXSkge1xuXHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoc291cmNlICYmIHNvdXJjZVtpXSAmJiBzb3VyY2VbaV0gaW5zdGFuY2VvZiBBcnJheSAmJiB0ZXN0W2ldICYmIHR5cGVvZih0ZXN0W2ldKSAhPT0gXCJvYmplY3RcIikge1xuXHRcdFx0XHRcdFx0XHQvLyBXZSBhcmUgbG9va2luZyBmb3IgYSB2YWx1ZSBpbnNpZGUgYW4gYXJyYXlcblxuXHRcdFx0XHRcdFx0XHQvLyBUaGUgc291cmNlIGRhdGEgaXMgYW4gYXJyYXksIHNvIGNoZWNrIGVhY2ggaXRlbSB1bnRpbCBhXG5cdFx0XHRcdFx0XHRcdC8vIG1hdGNoIGlzIGZvdW5kXG5cdFx0XHRcdFx0XHRcdHJlY3Vyc2VWYWwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0Zm9yICh0bXBJbmRleCA9IDA7IHRtcEluZGV4IDwgc291cmNlW2ldLmxlbmd0aDsgdG1wSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdHJlY3Vyc2VWYWwgPSB0aGlzLl9tYXRjaChzb3VyY2VbaV1bdG1wSW5kZXhdLCB0ZXN0W2ldLCBhcHBseU9wKTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBPbmUgb2YgdGhlIGFycmF5IGl0ZW1zIG1hdGNoZWQgdGhlIHF1ZXJ5IHNvIHdlIGNhblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gaW5jbHVkZSB0aGlzIGl0ZW0gaW4gdGhlIHJlc3VsdHMsIHNvIGJyZWFrIG5vd1xuXHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0aWYgKHJlY3Vyc2VWYWwpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ2FuZCcgJiYgIW1hdGNoZWRBbGwpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbWF0Y2hlZEFsbDtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBjdXJyZW50bHkgaW4gdGhlIGNvbGxlY3Rpb24uXG4gKiBAcmV0dXJucyB7TnVtYmVyfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5jb3VudCA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucykge1xuXHRpZiAoIXF1ZXJ5KSB7XG5cdFx0cmV0dXJuIHRoaXMuX2RhdGEubGVuZ3RoO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFJ1biBxdWVyeSBhbmQgcmV0dXJuIGNvdW50XG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucykubGVuZ3RoO1xuXHR9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBsaW5rIHRvIHRoZSBET00gYmV0d2VlbiB0aGUgY29sbGVjdGlvbiBkYXRhIGFuZCB0aGUgZWxlbWVudHNcbiAqIGluIHRoZSBwYXNzZWQgb3V0cHV0IHNlbGVjdG9yLiBXaGVuIG5ldyBlbGVtZW50cyBhcmUgbmVlZGVkIG9yIGNoYW5nZXNcbiAqIG9jY3VyIHRoZSBwYXNzZWQgdGVtcGxhdGVTZWxlY3RvciBpcyB1c2VkIHRvIGdldCB0aGUgdGVtcGxhdGUgdGhhdCBpc1xuICogb3V0cHV0IHRvIHRoZSBET00uXG4gKiBAcGFyYW0gb3V0cHV0VGFyZ2V0U2VsZWN0b3JcbiAqIEBwYXJhbSB0ZW1wbGF0ZVNlbGVjdG9yXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAob3V0cHV0VGFyZ2V0U2VsZWN0b3IsIHRlbXBsYXRlU2VsZWN0b3IpIHtcblx0Ly8gQ2hlY2sgZm9yIGV4aXN0aW5nIGRhdGEgYmluZGluZ1xuXHR0aGlzLl9saW5rcyA9IHRoaXMuX2xpbmtzIHx8IHt9O1xuXG5cdGlmICghdGhpcy5fbGlua3NbdGVtcGxhdGVTZWxlY3Rvcl0pIHtcblx0XHRpZiAoJChvdXRwdXRUYXJnZXRTZWxlY3RvcikubGVuZ3RoKSB7XG5cdFx0XHQvLyBFbnN1cmUgdGhlIHRlbXBsYXRlIGlzIGluIG1lbW9yeSBhbmQgaWYgbm90LCB0cnkgdG8gZ2V0IGl0XG5cdFx0XHRpZiAoISQudGVtcGxhdGVzW3RlbXBsYXRlU2VsZWN0b3JdKSB7XG5cdFx0XHRcdC8vIEdyYWIgdGhlIHRlbXBsYXRlXG5cdFx0XHRcdHZhciB0ZW1wbGF0ZSA9ICQodGVtcGxhdGVTZWxlY3Rvcik7XG5cdFx0XHRcdGlmICh0ZW1wbGF0ZS5sZW5ndGgpIHtcblx0XHRcdFx0XHQkLnZpZXdzLnRlbXBsYXRlcyh0ZW1wbGF0ZVNlbGVjdG9yLCAkKHRlbXBsYXRlWzBdKS5odG1sKCkpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRocm93KCdVbmFibGUgdG8gYmluZCBjb2xsZWN0aW9uIHRvIHRhcmdldCBiZWNhdXNlIHRlbXBsYXRlIGRvZXMgbm90IGV4aXN0OiAnICsgdGVtcGxhdGVTZWxlY3Rvcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0Ly8gQ3JlYXRlIHRoZSBkYXRhIGJpbmRpbmdcblx0XHRcdCQudGVtcGxhdGVzW3RlbXBsYXRlU2VsZWN0b3JdLmxpbmsob3V0cHV0VGFyZ2V0U2VsZWN0b3IsIHRoaXMuX2RhdGEpO1xuXG5cdFx0XHQvLyBBZGQgbGluayB0byBmbGFnc1xuXHRcdFx0dGhpcy5fbGlua3NbdGVtcGxhdGVTZWxlY3Rvcl0gPSBvdXRwdXRUYXJnZXRTZWxlY3RvcjtcblxuXHRcdFx0Ly8gU2V0IHRoZSBsaW5rZWQgZmxhZ1xuXHRcdFx0dGhpcy5fbGlua2VkKys7XG5cblx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5Db2xsZWN0aW9uOiBBZGRlZCBiaW5kaW5nIGNvbGxlY3Rpb24gXCInICsgdGhpcy5uYW1lKCkgKyAnXCIgdG8gb3V0cHV0IHRhcmdldDogJyArIG91dHB1dFRhcmdldFNlbGVjdG9yKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93KCdDYW5ub3QgYmluZCB2aWV3IGRhdGEgdG8gb3V0cHV0IHRhcmdldCBzZWxlY3RvciBcIicgKyBvdXRwdXRUYXJnZXRTZWxlY3RvciArICdcIiBiZWNhdXNlIGl0IGRvZXMgbm90IGV4aXN0IGluIHRoZSBET00hJyk7XG5cdFx0fVxuXHR9XG5cblx0dGhyb3coJ0Nhbm5vdCBjcmVhdGUgYSBkdXBsaWNhdGUgbGluayB0byB0aGUgdGFyZ2V0OiAnICsgb3V0cHV0VGFyZ2V0U2VsZWN0b3IgKyAnIHdpdGggdGhlIHRlbXBsYXRlOiAnICsgdGVtcGxhdGVTZWxlY3Rvcik7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBsaW5rIHRvIHRoZSBET00gYmV0d2VlbiB0aGUgY29sbGVjdGlvbiBkYXRhIGFuZCB0aGUgZWxlbWVudHNcbiAqIGluIHRoZSBwYXNzZWQgb3V0cHV0IHNlbGVjdG9yIHRoYXQgd2FzIGNyZWF0ZWQgdXNpbmcgdGhlIGxpbmsoKSBtZXRob2QuXG4gKiBAcGFyYW0gb3V0cHV0VGFyZ2V0U2VsZWN0b3JcbiAqIEBwYXJhbSB0ZW1wbGF0ZVNlbGVjdG9yXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnVubGluayA9IGZ1bmN0aW9uIChvdXRwdXRUYXJnZXRTZWxlY3RvciwgdGVtcGxhdGVTZWxlY3Rvcikge1xuXHQvLyBDaGVjayBmb3IgYmluZGluZ1xuXHR0aGlzLl9saW5rcyA9IHRoaXMuX2xpbmtzIHx8IHt9O1xuXG5cdGlmICh0aGlzLl9saW5rc1t0ZW1wbGF0ZVNlbGVjdG9yXSkge1xuXHRcdC8vIFJlbW92ZSB0aGUgZGF0YSBiaW5kaW5nXG5cdFx0JC50ZW1wbGF0ZXNbdGVtcGxhdGVTZWxlY3Rvcl0udW5saW5rKG91dHB1dFRhcmdldFNlbGVjdG9yKTtcblxuXHRcdC8vIFJlbW92ZSBsaW5rIGZyb20gZmxhZ3Ncblx0XHRkZWxldGUgdGhpcy5fbGlua3NbdGVtcGxhdGVTZWxlY3Rvcl07XG5cblx0XHQvLyBTZXQgdGhlIGxpbmtlZCBmbGFnXG5cdFx0dGhpcy5fbGlua2VkLS07XG5cblx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLkNvbGxlY3Rpb246IFJlbW92ZWQgYmluZGluZyBjb2xsZWN0aW9uIFwiJyArIHRoaXMubmFtZSgpICsgJ1wiIHRvIG91dHB1dCB0YXJnZXQ6ICcgKyBvdXRwdXRUYXJnZXRTZWxlY3Rvcik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRjb25zb2xlLmxvZygnQ2Fubm90IHJlbW92ZSBsaW5rLCBvbmUgZG9lcyBub3QgZXhpc3QgdG8gdGhlIHRhcmdldDogJyArIG91dHB1dFRhcmdldFNlbGVjdG9yICsgJyB3aXRoIHRoZSB0ZW1wbGF0ZTogJyArIHRlbXBsYXRlU2VsZWN0b3IpO1xufTtcblxuLyoqXG4gKiBGaW5kcyBzdWItZG9jdW1lbnRzIGZyb20gdGhlIGNvbGxlY3Rpb24ncyBkb2N1bWVudHMuXG4gKiBAcGFyYW0gbWF0Y2hcbiAqIEBwYXJhbSBwYXRoXG4gKiBAcGFyYW0gc3ViRG9jUXVlcnlcbiAqIEBwYXJhbSBzdWJEb2NPcHRpb25zXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZmluZFN1YiA9IGZ1bmN0aW9uIChtYXRjaCwgcGF0aCwgc3ViRG9jUXVlcnksIHN1YkRvY09wdGlvbnMpIHtcblx0dmFyIHBhdGhIYW5kbGVyID0gbmV3IFBhdGgocGF0aCksXG5cdFx0ZG9jQXJyID0gdGhpcy5maW5kKG1hdGNoKSxcblx0XHRkb2NDb3VudCA9IGRvY0Fyci5sZW5ndGgsXG5cdFx0ZG9jSW5kZXgsXG5cdFx0c3ViRG9jQXJyLFxuXHRcdHN1YkRvY0NvbGxlY3Rpb24gPSB0aGlzLl9kYi5jb2xsZWN0aW9uKCdfX0ZEQl90ZW1wXycgKyB0aGlzLm9iamVjdElkKCkpLFxuXHRcdHN1YkRvY1Jlc3VsdHMsXG5cdFx0cmVzdWx0T2JqID0ge1xuXHRcdFx0cGFyZW50czogZG9jQ291bnQsXG5cdFx0XHRzdWJEb2NUb3RhbDogMCxcblx0XHRcdHN1YkRvY3M6IFtdLFxuXHRcdFx0cGF0aEZvdW5kOiBmYWxzZSxcblx0XHRcdGVycjogJydcblx0XHR9O1xuXG5cdGZvciAoZG9jSW5kZXggPSAwOyBkb2NJbmRleCA8IGRvY0NvdW50OyBkb2NJbmRleCsrKSB7XG5cdFx0c3ViRG9jQXJyID0gcGF0aEhhbmRsZXIudmFsdWUoZG9jQXJyW2RvY0luZGV4XSlbMF07XG5cdFx0aWYgKHN1YkRvY0Fycikge1xuXHRcdFx0c3ViRG9jQ29sbGVjdGlvbi5zZXREYXRhKHN1YkRvY0Fycik7XG5cdFx0XHRzdWJEb2NSZXN1bHRzID0gc3ViRG9jQ29sbGVjdGlvbi5maW5kKHN1YkRvY1F1ZXJ5LCBzdWJEb2NPcHRpb25zKTtcblx0XHRcdGlmIChzdWJEb2NPcHRpb25zLnJldHVybkZpcnN0ICYmIHN1YkRvY1Jlc3VsdHMubGVuZ3RoKSB7XG5cdFx0XHRcdHJldHVybiBzdWJEb2NSZXN1bHRzWzBdO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXN1bHRPYmouc3ViRG9jcy5wdXNoKHN1YkRvY1Jlc3VsdHMpO1xuXHRcdFx0cmVzdWx0T2JqLnN1YkRvY1RvdGFsICs9IHN1YkRvY1Jlc3VsdHMubGVuZ3RoO1xuXHRcdFx0cmVzdWx0T2JqLnBhdGhGb3VuZCA9IHRydWU7XG5cdFx0fVxuXHR9XG5cblx0Ly8gRHJvcCB0aGUgc3ViLWRvY3VtZW50IGNvbGxlY3Rpb25cblx0c3ViRG9jQ29sbGVjdGlvbi5kcm9wKCk7XG5cblx0Ly8gQ2hlY2sgaWYgdGhlIGNhbGwgc2hvdWxkIG5vdCByZXR1cm4gc3RhdHMsIGlmIHNvIHJldHVybiBvbmx5IHN1YkRvY3MgYXJyYXlcblx0aWYgKHN1YkRvY09wdGlvbnMubm9TdGF0cykge1xuXHRcdHJldHVybiByZXN1bHRPYmouc3ViRG9jcztcblx0fVxuXG5cdGlmICghcmVzdWx0T2JqLnBhdGhGb3VuZCkge1xuXHRcdHJlc3VsdE9iai5lcnIgPSAnTm8gb2JqZWN0cyBmb3VuZCBpbiB0aGUgcGFyZW50IGRvY3VtZW50cyB3aXRoIGEgbWF0Y2hpbmcgcGF0aCBvZjogJyArIHBhdGg7XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0T2JqO1xufTtcblxuLyoqXG4gKiBDaGVja3MgdGhhdCB0aGUgcGFzc2VkIGRvY3VtZW50IHdpbGwgbm90IHZpb2xhdGUgYW55IGluZGV4IHJ1bGVzIGlmXG4gKiBpbnNlcnRlZCBpbnRvIHRoZSBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtPYmplY3R9IGRvYyBUaGUgZG9jdW1lbnQgdG8gY2hlY2sgaW5kZXhlcyBhZ2FpbnN0LlxuICogQHJldHVybnMge0Jvb2xlYW59IEVpdGhlciBmYWxzZSAobm8gdmlvbGF0aW9uIG9jY3VycmVkKSBvciB0cnVlIGlmXG4gKiBhIHZpb2xhdGlvbiB3YXMgZGV0ZWN0ZWQuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluc2VydEluZGV4VmlvbGF0aW9uID0gZnVuY3Rpb24gKGRvYykge1xuXHR2YXIgaW5kZXhWaW9sYXRlZCxcblx0XHRhcnIgPSB0aGlzLl9pbmRleEJ5TmFtZSxcblx0XHRhcnJJbmRleCxcblx0XHRhcnJJdGVtO1xuXG5cdC8vIENoZWNrIHRoZSBpdGVtJ3MgcHJpbWFyeSBrZXkgaXMgbm90IGFscmVhZHkgaW4gdXNlXG5cdGlmICh0aGlzLl9wcmltYXJ5SW5kZXguZ2V0KGRvY1t0aGlzLl9wcmltYXJ5S2V5XSkpIHtcblx0XHRpbmRleFZpb2xhdGVkID0gdGhpcy5fcHJpbWFyeUluZGV4O1xuXHR9IGVsc2Uge1xuXHRcdC8vIENoZWNrIHZpb2xhdGlvbnMgb2Ygb3RoZXIgaW5kZXhlc1xuXHRcdGZvciAoYXJySW5kZXggaW4gYXJyKSB7XG5cdFx0XHRpZiAoYXJyLmhhc093blByb3BlcnR5KGFyckluZGV4KSkge1xuXHRcdFx0XHRhcnJJdGVtID0gYXJyW2FyckluZGV4XTtcblxuXHRcdFx0XHRpZiAoYXJySXRlbS51bmlxdWUoKSkge1xuXHRcdFx0XHRcdGlmIChhcnJJdGVtLnZpb2xhdGlvbihkb2MpKSB7XG5cdFx0XHRcdFx0XHRpbmRleFZpb2xhdGVkID0gYXJySXRlbTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBpbmRleFZpb2xhdGVkID8gaW5kZXhWaW9sYXRlZC5uYW1lKCkgOiBmYWxzZTtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBpbmRleCBvbiB0aGUgc3BlY2lmaWVkIGtleXMuXG4gKiBAcGFyYW0ge09iamVjdH0ga2V5cyBUaGUgb2JqZWN0IGNvbnRhaW5pbmcga2V5cyB0byBpbmRleC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIEFuIG9wdGlvbnMgb2JqZWN0LlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmVuc3VyZUluZGV4ID0gZnVuY3Rpb24gKGtleXMsIG9wdGlvbnMpIHtcblx0dGhpcy5faW5kZXhCeU5hbWUgPSB0aGlzLl9pbmRleEJ5TmFtZSB8fCB7fTtcblx0dGhpcy5faW5kZXhCeUlkID0gdGhpcy5faW5kZXhCeUlkIHx8IHt9O1xuXG5cdHZhciBpbmRleCA9IG5ldyBJbmRleChrZXlzLCBvcHRpb25zLCB0aGlzKSxcblx0XHR0aW1lID0ge1xuXHRcdFx0c3RhcnQ6IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG5cdFx0fTtcblxuXHQvLyBDaGVjayB0aGUgaW5kZXggZG9lcyBub3QgYWxyZWFkeSBleGlzdFxuXHRpZiAodGhpcy5faW5kZXhCeU5hbWVbaW5kZXgubmFtZSgpXSkge1xuXHRcdC8vIEluZGV4IGFscmVhZHkgZXhpc3RzXG5cdFx0cmV0dXJuIHtcblx0XHRcdGVycjogJ0luZGV4IHdpdGggdGhhdCBuYW1lIGFscmVhZHkgZXhpc3RzJ1xuXHRcdH07XG5cdH1cblxuXHRpZiAodGhpcy5faW5kZXhCeUlkW2luZGV4LmlkKCldKSB7XG5cdFx0Ly8gSW5kZXggYWxyZWFkeSBleGlzdHNcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZXJyOiAnSW5kZXggd2l0aCB0aG9zZSBrZXlzIGFscmVhZHkgZXhpc3RzJ1xuXHRcdH07XG5cdH1cblxuXHQvLyBDcmVhdGUgdGhlIGluZGV4XG5cdGluZGV4LnJlYnVpbGQoKTtcblxuXHQvLyBBZGQgdGhlIGluZGV4XG5cdHRoaXMuX2luZGV4QnlOYW1lW2luZGV4Lm5hbWUoKV0gPSBpbmRleDtcblx0dGhpcy5faW5kZXhCeUlkW2luZGV4LmlkKCldID0gaW5kZXg7XG5cblx0dGltZS5lbmQgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0dGltZS50b3RhbCA9IHRpbWUuZW5kIC0gdGltZS5zdGFydDtcblxuXHR0aGlzLl9sYXN0T3AgPSB7XG5cdFx0dHlwZTogJ2Vuc3VyZUluZGV4Jyxcblx0XHRzdGF0czoge1xuXHRcdFx0dGltZTogdGltZVxuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdGluZGV4OiBpbmRleCxcblx0XHRpZDogaW5kZXguaWQoKSxcblx0XHRuYW1lOiBpbmRleC5uYW1lKCksXG5cdFx0c3RhdGU6IGluZGV4LnN0YXRlKClcblx0fTtcbn07XG5cbi8qKlxuICogR2V0cyBhbiBpbmRleCBieSBpdCdzIG5hbWUuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgaW5kZXggdG8gcmV0cmVpdmUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbiAobmFtZSkge1xuXHRpZiAodGhpcy5faW5kZXhCeU5hbWUpIHtcblx0XHRyZXR1cm4gdGhpcy5faW5kZXhCeU5hbWVbbmFtZV07XG5cdH1cbn07XG5cbi8qKlxuICogR2V0cyB0aGUgbGFzdCByZXBvcnRpbmcgb3BlcmF0aW9uJ3MgZGV0YWlscyBzdWNoIGFzIHJ1biB0aW1lLlxuICogQHJldHVybnMge09iamVjdH1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUubGFzdE9wID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5fbWV0cmljcy5saXN0KCk7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIG5ldyAxNi1jaGFyYWN0ZXIgaGV4YWRlY2ltYWwgdW5pcXVlIElEIG9yXG4gKiBnZW5lcmF0ZXMgYSBuZXcgMTYtY2hhcmFjdGVyIGhleGFkZWNpbWFsIElEIGJhc2VkIG9uXG4gKiB0aGUgcGFzc2VkIHN0cmluZy4gV2lsbCBhbHdheXMgZ2VuZXJhdGUgdGhlIHNhbWUgSURcbiAqIGZvciB0aGUgc2FtZSBzdHJpbmcuXG4gKiBAcGFyYW0ge1N0cmluZz19IHN0ciBBIHN0cmluZyB0byBnZW5lcmF0ZSB0aGUgSUQgZnJvbS5cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUub2JqZWN0SWQgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdHZhciBpZCxcblx0XHRwb3cgPSBNYXRoLnBvdygxMCwgMTcpO1xuXG5cdGlmICghc3RyKSB7XG5cdFx0U2hhcmVkLmlkQ291bnRlcisrO1xuXG5cdFx0aWQgPSAoU2hhcmVkLmlkQ291bnRlciArIChcblx0XHRcdE1hdGgucmFuZG9tKCkgKiBwb3cgK1xuXHRcdFx0XHRNYXRoLnJhbmRvbSgpICogcG93ICtcblx0XHRcdFx0TWF0aC5yYW5kb20oKSAqIHBvdyArXG5cdFx0XHRcdE1hdGgucmFuZG9tKCkgKiBwb3dcblx0XHRcdClcblx0XHRcdCkudG9TdHJpbmcoMTYpO1xuXHR9IGVsc2Uge1xuXHRcdHZhciB2YWwgPSAwLFxuXHRcdFx0Y291bnQgPSBzdHIubGVuZ3RoLFxuXHRcdFx0aTtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG5cdFx0XHR2YWwgKz0gc3RyLmNoYXJDb2RlQXQoaSkgKiBwb3c7XG5cdFx0fVxuXG5cdFx0aWQgPSB2YWwudG9TdHJpbmcoMTYpO1xuXHR9XG5cblx0cmV0dXJuIGlkO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBkaWZmZXJlbmNlIG9iamVjdCB0aGF0IGNvbnRhaW5zIGluc2VydCwgdXBkYXRlIGFuZCByZW1vdmUgYXJyYXlzXG4gKiByZXByZXNlbnRpbmcgdGhlIG9wZXJhdGlvbnMgdG8gZXhlY3V0ZSB0byBtYWtlIHRoaXMgY29sbGVjdGlvbiBoYXZlIHRoZSBzYW1lXG4gKiBkYXRhIGFzIHRoZSBvbmUgcGFzc2VkLlxuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIGRpZmYgYWdhaW5zdC5cbiAqIEByZXR1cm5zIHt7fX1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGlmZiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XG5cdHZhciBkaWZmID0ge1xuXHRcdGluc2VydDogW10sXG5cdFx0dXBkYXRlOiBbXSxcblx0XHRyZW1vdmU6IFtdXG5cdH07XG5cblx0dmFyIHBtID0gdGhpcy5wcmltYXJ5S2V5KCksXG5cdFx0YXJyLFxuXHRcdGFyckluZGV4LFxuXHRcdGFyckl0ZW0sXG5cdFx0YXJyQ291bnQ7XG5cblx0Ly8gQ2hlY2sgaWYgdGhlIHByaW1hcnkga2V5IGluZGV4IG9mIGVhY2ggY29sbGVjdGlvbiBjYW4gYmUgdXRpbGlzZWRcblx0aWYgKHBtID09PSBjb2xsZWN0aW9uLnByaW1hcnlLZXkoKSkge1xuXHRcdC8vIFVzZSB0aGUgY29sbGVjdGlvbiBwcmltYXJ5IGtleSBpbmRleCB0byBkbyB0aGUgZGlmZiAoc3VwZXItZmFzdClcblx0XHRhcnIgPSBjb2xsZWN0aW9uLl9kYXRhO1xuXHRcdGFyckNvdW50ID0gYXJyLmxlbmd0aDtcblxuXHRcdC8vIExvb3AgdGhlIGNvbGxlY3Rpb24ncyBkYXRhIGFycmF5IGFuZCBjaGVjayBmb3IgbWF0Y2hpbmcgaXRlbXNcblx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdFx0YXJySXRlbSA9IGFyclthcnJJbmRleF07XG5cblx0XHRcdC8vIENoZWNrIGZvciBhIG1hdGNoaW5nIGl0ZW0gaW4gdGhpcyBjb2xsZWN0aW9uXG5cdFx0XHRpZiAodGhpcy5fcHJpbWFyeUluZGV4LmdldChhcnJJdGVtW3BtXSkpIHtcblx0XHRcdFx0Ly8gTWF0Y2hpbmcgaXRlbSBleGlzdHMsIGNoZWNrIGlmIHRoZSBkYXRhIGlzIHRoZSBzYW1lXG5cdFx0XHRcdGlmICh0aGlzLl9wcmltYXJ5Q3JjLmdldChhcnJJdGVtW3BtXSkgPT09IGNvbGxlY3Rpb24uX3ByaW1hcnlDcmMuZ2V0KGFyckl0ZW1bcG1dKSkge1xuXHRcdFx0XHRcdC8vIE1hdGNoaW5nIG9iamVjdHMsIG5vIHVwZGF0ZSByZXF1aXJlZFxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIFRoZSBkb2N1bWVudHMgZXhpc3QgaW4gYm90aCBjb2xsZWN0aW9ucyBidXQgZGF0YSBkaWZmZXJzLCB1cGRhdGUgcmVxdWlyZWRcblx0XHRcdFx0XHRkaWZmLnVwZGF0ZS5wdXNoKGFyckl0ZW0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBUaGUgZG9jdW1lbnQgaXMgbWlzc2luZyBmcm9tIHRoaXMgY29sbGVjdGlvbiwgaW5zZXJ0IHJlcXVyaWVkXG5cdFx0XHRcdGRpZmYuaW5zZXJ0LnB1c2goYXJySXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gTm93IGxvb3AgdGhpcyBjb2xsZWN0aW9uJ3MgZGF0YSBhbmQgY2hlY2sgZm9yIG1hdGNoaW5nIGl0ZW1zXG5cdFx0YXJyID0gdGhpcy5fZGF0YTtcblx0XHRhcnJDb3VudCA9IGFyci5sZW5ndGg7XG5cblx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdFx0YXJySXRlbSA9IGFyclthcnJJbmRleF07XG5cdFx0XHRpZiAoIWNvbGxlY3Rpb24uX3ByaW1hcnlJbmRleC5nZXQoYXJySXRlbVtwbV0pKSB7XG5cdFx0XHRcdC8vIFRoZSBkb2N1bWVudCBkb2VzIG5vdCBleGlzdCBpbiB0aGUgb3RoZXIgY29sbGVjdGlvbiwgcmVtb3ZlIHJlcXVpcmVkXG5cdFx0XHRcdGRpZmYucmVtb3ZlLnB1c2goYXJySXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdC8vIFRoZSBwcmltYXJ5IGtleXMgb2YgZWFjaCBjb2xsZWN0aW9uIGFyZSBkaWZmZXJlbnQgc28gdGhlIHByaW1hcnlcblx0XHQvLyBrZXkgaW5kZXggY2Fubm90IGJlIHVzZWQgZm9yIGRpZmZpbmcsIGRvIGFuIG9sZC1mYXNoaW9uZWQgZGlmZlxuXG5cdH1cblxuXHRyZXR1cm4gZGlmZjtcbn07XG5cbi8qKlxuICogR2V0IGEgY29sbGVjdGlvbiBieSBuYW1lLiBJZiB0aGUgY29sbGVjdGlvbiBkb2VzIG5vdCBhbHJlYWR5IGV4aXN0XG4gKiB0aGVuIG9uZSBpcyBjcmVhdGVkIGZvciB0aGF0IG5hbWUgYXV0b21hdGljYWxseS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBjb2xsZWN0aW9uTmFtZSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nPX0gcHJpbWFyeUtleSBPcHRpb25hbCBwcmltYXJ5IGtleSB0byBzcGVjaWZ5IHRoZSBwcmltYXJ5IGtleSBmaWVsZCBvbiB0aGUgY29sbGVjdGlvblxuICogb2JqZWN0cy4gRGVmYXVsdHMgdG8gXCJfaWRcIi5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICovXG5Db3JlLnByb3RvdHlwZS5jb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBwcmltYXJ5S2V5KSB7XG5cdGlmIChjb2xsZWN0aW9uTmFtZSkge1xuXHRcdGlmICghdGhpcy5fY29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0pIHtcblx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0NyZWF0aW5nIGNvbGxlY3Rpb24gJyArIGNvbGxlY3Rpb25OYW1lKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9jb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXSA9IHRoaXMuX2NvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdIHx8IG5ldyBDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKS5kYih0aGlzKTtcblxuXHRcdGlmIChwcmltYXJ5S2V5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMuX2NvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdLnByaW1hcnlLZXkocHJpbWFyeUtleSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2NvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93KCdDYW5ub3QgZ2V0IGNvbGxlY3Rpb24gd2l0aCB1bmRlZmluZWQgbmFtZSEnKTtcblx0fVxufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSBjb2xsZWN0aW9uIHdpdGggdGhlIHBhc3NlZCBuYW1lIGFscmVhZHkgZXhpc3RzLlxuICogQHBhcmFtIHtTdHJpbmd9IHZpZXdOYW1lIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHRvIGNoZWNrIGZvci5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5Db3JlLnByb3RvdHlwZS5jb2xsZWN0aW9uRXhpc3RzID0gZnVuY3Rpb24gKHZpZXdOYW1lKSB7XG5cdHJldHVybiBCb29sZWFuKHRoaXMuX2NvbGxlY3Rpb25bdmlld05hbWVdKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBjb2xsZWN0aW9ucyB0aGUgREIgY3VycmVudGx5IGhhcy5cbiAqIEByZXR1cm5zIHtBcnJheX0gQW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIGRldGFpbHMgb2YgZWFjaCBjb2xsZWN0aW9uXG4gKiB0aGUgZGF0YWJhc2UgaXMgY3VycmVudGx5IG1hbmFnaW5nLlxuICovXG5Db3JlLnByb3RvdHlwZS5jb2xsZWN0aW9ucyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGFyciA9IFtdLFxuXHRcdGk7XG5cblx0Zm9yIChpIGluIHRoaXMuX2NvbGxlY3Rpb24pIHtcblx0XHRpZiAodGhpcy5fY29sbGVjdGlvbi5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0YXJyLnB1c2goe1xuXHRcdFx0XHRuYW1lOiBpLFxuXHRcdFx0XHRjb3VudDogdGhpcy5fY29sbGVjdGlvbltpXS5jb3VudCgpXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gYXJyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uOyIsIi8vIEltcG9ydCBleHRlcm5hbCBuYW1lcyBsb2NhbGx5XG52YXIgU2hhcmVkLFxuXHRDb3JlLFxuXHRDb3JlSW5pdCxcblx0Q29sbGVjdGlvbixcblx0T3ZlcmxvYWQ7XG5cblNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyk7XG5cbnZhciBDb2xsZWN0aW9uR3JvdXAgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdHRoaXMuX25hbWUgPSBuYW1lO1xuXHR0aGlzLl9jb2xsZWN0aW9uQXJyID0gW107XG5cdHRoaXMuX3ZpZXdzID0gW107XG5cblx0Ly8gUmVnaXN0ZXIgbGlzdGVuZXJzIGZvciB0aGUgQ1JVRCBldmVudHNcblx0dGhpcy5fb25Db2xsZWN0aW9uSW5zZXJ0ID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uSW5zZXJ0LmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0dGhpcy5fb25Db2xsZWN0aW9uVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uVXBkYXRlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0dGhpcy5fb25Db2xsZWN0aW9uUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uUmVtb3ZlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0dGhpcy5fb25Db2xsZWN0aW9uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uQ2hhbmdlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG59O1xuXG5TaGFyZWQubW9kdWxlcy5Db2xsZWN0aW9uR3JvdXAgPSBDb2xsZWN0aW9uR3JvdXA7XG5cbkNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24nKTtcbk92ZXJsb2FkID0gcmVxdWlyZSgnLi9PdmVybG9hZCcpO1xuQ29yZSA9IFNoYXJlZC5tb2R1bGVzLkNvcmU7XG5Db3JlSW5pdCA9IFNoYXJlZC5tb2R1bGVzLkNvcmUucHJvdG90eXBlLmluaXQ7XG5cbi8qQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuIHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcbiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCBbXTtcbiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuXG4gcmV0dXJuIHRoaXM7XG4gfTtcblxuIENvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG4gaWYgKGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuIHZhciBhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLFxuIGluZGV4ID0gYXJyLmluZGV4T2YobGlzdGVuZXIpO1xuXG4gaWYgKGluZGV4ID4gLTEpIHtcbiBhcnIuc3BsaWNlKGluZGV4LCAxKTtcbiB9XG4gfVxuXG4gcmV0dXJuIHRoaXM7XG4gfTtcblxuIENvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50LCBkYXRhKSB7XG4gdGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXG4gaWYgKGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuIHZhciBhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLFxuIGFyckNvdW50ID0gYXJyLmxlbmd0aCxcbiBhcnJJbmRleDtcblxuIGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGFyckNvdW50OyBhcnJJbmRleCsrKSB7XG4gYXJyW2FyckluZGV4XS5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiB9XG4gfVxuXG4gcmV0dXJuIHRoaXM7XG4gfTsqL1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLm9uID0gbmV3IE92ZXJsb2FkKFtcblx0ZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cdFx0dGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSB8fCBbXTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10ucHVzaChsaXN0ZW5lcik7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmdW5jdGlvbihldmVudCwgaWQsIGxpc3RlbmVyKSB7XG5cdFx0dGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdIHx8IHt9O1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtpZF0gfHwgW107XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtpZF0ucHVzaChsaXN0ZW5lcik7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXSk7XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUub2ZmID0gbmV3IE92ZXJsb2FkKFtcblx0ZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuX2xpc3RlbmVycyAmJiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdICYmIGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdFx0ZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1tldmVudF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cdFx0dmFyIGFycixcblx0XHRcdGluZGV4O1xuXG5cdFx0aWYgKHR5cGVvZihsaXN0ZW5lcikgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRpZiAodGhpcy5fbGlzdGVuZXJzICYmIHRoaXMuX2xpc3RlbmVyc1tldmVudF0gJiYgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtsaXN0ZW5lcl0pIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1tldmVudF1bbGlzdGVuZXJdO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0XHRcdGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXTtcblx0XHRcdFx0aW5kZXggPSBhcnIuaW5kZXhPZihsaXN0ZW5lcik7XG5cblx0XHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdFx0XHRhcnIuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGZ1bmN0aW9uIChldmVudCwgaWQsIGxpc3RlbmVyKSB7XG5cdFx0aWYgKHRoaXMuX2xpc3RlbmVycyAmJiBldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHRcdHZhciBhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2lkXSxcblx0XHRcdFx0aW5kZXggPSBhcnIuaW5kZXhPZihsaXN0ZW5lcik7XG5cblx0XHRcdGlmIChpbmRleCA+IC0xKSB7XG5cdFx0XHRcdGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXSk7XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50LCBkYXRhKSB7XG5cdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblxuXHRpZiAoZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0Ly8gSGFuZGxlIGdsb2JhbCBlbWl0XG5cdFx0aWYgKHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSkge1xuXHRcdFx0dmFyIGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSxcblx0XHRcdFx0YXJyQ291bnQgPSBhcnIubGVuZ3RoLFxuXHRcdFx0XHRhcnJJbmRleDtcblxuXHRcdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdFx0YXJyW2FyckluZGV4XS5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBIYW5kbGUgaW5kaXZpZHVhbCBlbWl0XG5cdFx0aWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGFycmF5IGlzIGFuIGFycmF5IG9mIG9iamVjdHMgaW4gdGhlIGNvbGxlY3Rpb25cblx0XHRcdGlmIChkYXRhWzBdICYmIGRhdGFbMF1bdGhpcy5fcHJpbWFyeUtleV0pIHtcblx0XHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIGNoZWNrIGZvciBsaXN0ZW5lcnMgYWdhaW5zdCB0aGUgcHJpbWFyeSBrZXlcblx0XHRcdFx0dmFyIGxpc3RlbmVySWRBcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLFxuXHRcdFx0XHRcdGxpc3RlbmVySWRDb3VudCxcblx0XHRcdFx0XHRsaXN0ZW5lcklkSW5kZXgsXG5cdFx0XHRcdFx0YXJyQ291bnQgPSBkYXRhLmxlbmd0aCxcblx0XHRcdFx0XHRhcnJJbmRleDtcblxuXHRcdFx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdFx0XHRcdGlmIChsaXN0ZW5lcklkQXJyW2RhdGFbYXJySW5kZXhdW3RoaXMuX3ByaW1hcnlLZXldXSkge1xuXHRcdFx0XHRcdFx0Ly8gRW1pdCBmb3IgdGhpcyBpZFxuXHRcdFx0XHRcdFx0bGlzdGVuZXJJZENvdW50ID0gbGlzdGVuZXJJZEFycltkYXRhW2FyckluZGV4XVt0aGlzLl9wcmltYXJ5S2V5XV0ubGVuZ3RoO1xuXHRcdFx0XHRcdFx0Zm9yIChsaXN0ZW5lcklkSW5kZXggPSAwOyBsaXN0ZW5lcklkSW5kZXggPCBsaXN0ZW5lcklkQ291bnQ7IGxpc3RlbmVySWRJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdGxpc3RlbmVySWRBcnJbZGF0YVthcnJJbmRleF1bdGhpcy5fcHJpbWFyeUtleV1dW2xpc3RlbmVySWRJbmRleF0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBkYiBpbnN0YW5jZSB0aGUgY29sbGVjdGlvbiBncm91cCBiZWxvbmdzIHRvLlxuICogQHBhcmFtIHtEQn0gZGIgVGhlIGRiIGluc3RhbmNlLlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuZGIgPSBmdW5jdGlvbiAoZGIpIHtcblx0aWYgKGRiICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9kYiA9IGRiO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2RiO1xufTtcblxuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5hZGRDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcblx0aWYgKGNvbGxlY3Rpb24pIHtcblx0XHRpZiAodGhpcy5fY29sbGVjdGlvbkFyci5pbmRleE9mKGNvbGxlY3Rpb24pID09PSAtMSkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQvLyBDaGVjayBmb3IgY29tcGF0aWJsZSBwcmltYXJ5IGtleXNcblx0XHRcdGlmICh0aGlzLl9jb2xsZWN0aW9uQXJyLmxlbmd0aCkge1xuXHRcdFx0XHRpZiAodGhpcy5fcHJpbWFyeUtleSAhPT0gY29sbGVjdGlvbi5wcmltYXJ5S2V5KCkpIHtcblx0XHRcdFx0XHR0aHJvdyhcIkFsbCBjb2xsZWN0aW9ucyBpbiBhIGNvbGxlY3Rpb24gZ3JvdXAgbXVzdCBoYXZlIHRoZSBzYW1lIHByaW1hcnkga2V5IVwiKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gU2V0IHRoZSBwcmltYXJ5IGtleSB0byB0aGUgZmlyc3QgY29sbGVjdGlvbiBhZGRlZFxuXHRcdFx0XHR0aGlzLl9wcmltYXJ5S2V5ID0gY29sbGVjdGlvbi5wcmltYXJ5S2V5KCk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIEFkZCB0aGUgY29sbGVjdGlvblxuXHRcdFx0dGhpcy5fY29sbGVjdGlvbkFyci5wdXNoKGNvbGxlY3Rpb24pO1xuXHRcdFx0Y29sbGVjdGlvbi5fZ3JvdXBzLnB1c2godGhpcyk7XG5cblx0XHRcdC8vIExpc3RlbiB0byBldmVudHMgZnJvbSB0aGUgY29sbGVjdGlvblxuXHRcdFx0Y29sbGVjdGlvbi5vbignaW5zZXJ0JywgdGhpcy5fb25Db2xsZWN0aW9uSW5zZXJ0KTtcblx0XHRcdGNvbGxlY3Rpb24ub24oJ3VwZGF0ZScsIHRoaXMuX29uQ29sbGVjdGlvblVwZGF0ZSk7XG5cdFx0XHRjb2xsZWN0aW9uLm9uKCdyZW1vdmUnLCB0aGlzLl9vbkNvbGxlY3Rpb25SZW1vdmUpO1xuXHRcdFx0Y29sbGVjdGlvbi5vbignY2hhbmdlJywgdGhpcy5fb25Db2xsZWN0aW9uQ2hhbmdlKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUucmVtb3ZlQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XG5cdGlmIChjb2xsZWN0aW9uKSB7XG5cdFx0dmFyIGNvbGxlY3Rpb25JbmRleCA9IHRoaXMuX2NvbGxlY3Rpb25BcnIuaW5kZXhPZihjb2xsZWN0aW9uKSxcblx0XHRcdGdyb3VwSW5kZXg7XG5cblx0XHRpZiAoY29sbGVjdGlvbkluZGV4ICE9PSAtMSkge1xuXHRcdFx0Ly8gUmVtb3ZlIGV2ZW50IGxpc3RlbmVycyBmcm9tIHRoaXMgY29sbGVjdGlvblxuXHRcdFx0Y29sbGVjdGlvbi5vZmYoJ2luc2VydCcsIHRoaXMuX29uQ29sbGVjdGlvbkluc2VydCk7XG5cdFx0XHRjb2xsZWN0aW9uLm9mZigndXBkYXRlJywgdGhpcy5fb25Db2xsZWN0aW9uVXBkYXRlKTtcblx0XHRcdGNvbGxlY3Rpb24ub2ZmKCdyZW1vdmUnLCB0aGlzLl9vbkNvbGxlY3Rpb25SZW1vdmUpO1xuXHRcdFx0Y29sbGVjdGlvbi5vZmYoJ2NoYW5nZScsIHRoaXMuX29uQ29sbGVjdGlvbkNoYW5nZSk7XG5cblx0XHRcdHRoaXMuX2NvbGxlY3Rpb25BcnIuc3BsaWNlKGNvbGxlY3Rpb25JbmRleCwgMSk7XG5cblx0XHRcdGdyb3VwSW5kZXggPSBjb2xsZWN0aW9uLl9ncm91cHMuaW5kZXhPZih0aGlzKTtcblxuXHRcdFx0aWYgKGdyb3VwSW5kZXggIT09IC0xKSB7XG5cdFx0XHRcdGNvbGxlY3Rpb24uX2dyb3Vwcy5zcGxpY2UoZ3JvdXBJbmRleCwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2NvbGxlY3Rpb25BcnIubGVuZ3RoID09PSAwKSB7XG5cdFx0XHQvLyBXaXBlIHRoZSBwcmltYXJ5IGtleVxuXHRcdFx0ZGVsZXRlIHRoaXMuX3ByaW1hcnlLZXk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMpIHtcblx0Ly8gTG9vcCB0aGUgY29sbGVjdGlvbnMgaW4gdGhpcyBncm91cCBhbmQgZmluZCBmaXJzdCBtYXRjaGluZyBpdGVtIHJlc3BvbnNlXG5cdHZhciBkYXRhID0gbmV3IENvbGxlY3Rpb24oKS5wcmltYXJ5S2V5KHRoaXMuX2NvbGxlY3Rpb25BcnJbMF0ucHJpbWFyeUtleSgpKSxcblx0XHRpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCB0aGlzLl9jb2xsZWN0aW9uQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0ZGF0YS5pbnNlcnQodGhpcy5fY29sbGVjdGlvbkFycltpXS5maW5kKHF1ZXJ5KSk7XG5cdH1cblxuXHRyZXR1cm4gZGF0YS5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKHF1ZXJ5LCBvcHRpb25zKSB7XG5cdC8vIExvb3AgdGhlIGNvbGxlY3Rpb25zIGluIHRoaXMgZ3JvdXAgYW5kIGFwcGx5IHRoZSBpbnNlcnRcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jb2xsZWN0aW9uQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0dGhpcy5fY29sbGVjdGlvbkFycltpXS5pbnNlcnQocXVlcnksIG9wdGlvbnMpO1xuXHR9XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChxdWVyeSwgdXBkYXRlKSB7XG5cdC8vIExvb3AgdGhlIGNvbGxlY3Rpb25zIGluIHRoaXMgZ3JvdXAgYW5kIGFwcGx5IHRoZSB1cGRhdGVcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jb2xsZWN0aW9uQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0dGhpcy5fY29sbGVjdGlvbkFycltpXS51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG5cdH1cbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUudXBkYXRlQnlJZCA9IGZ1bmN0aW9uIChpZCwgdXBkYXRlKSB7XG5cdC8vIExvb3AgdGhlIGNvbGxlY3Rpb25zIGluIHRoaXMgZ3JvdXAgYW5kIGFwcGx5IHRoZSB1cGRhdGVcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9jb2xsZWN0aW9uQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0dGhpcy5fY29sbGVjdGlvbkFycltpXS51cGRhdGVCeUlkKGlkLCB1cGRhdGUpO1xuXHR9XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChxdWVyeSkge1xuXHQvLyBMb29wIHRoZSBjb2xsZWN0aW9ucyBpbiB0aGlzIGdyb3VwIGFuZCBhcHBseSB0aGUgcmVtb3ZlXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY29sbGVjdGlvbkFyci5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb25BcnJbaV0ucmVtb3ZlKHF1ZXJ5KTtcblx0fVxufTtcblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRoYXQgcmVtb3ZlcyBhIGRvY3VtZW50IHRoYXQgbWF0Y2hlcyB0aGUgZ2l2ZW4gaWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBkb2N1bWVudCB0byByZW1vdmUuXG4gKi9cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUucmVtb3ZlQnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuXHQvLyBMb29wIHRoZSBjb2xsZWN0aW9ucyBpbiB0aGlzIGdyb3VwIGFuZCBhcHBseSB0aGUgcmVtb3ZlXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY29sbGVjdGlvbkFyci5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb25BcnJbaV0ucmVtb3ZlQnlJZChpZCk7XG5cdH1cbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuX29uSW5zZXJ0ID0gZnVuY3Rpb24gKHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0dGhpcy5lbWl0KCdpbnNlcnQnLCBzdWNjZXNzQXJyLCBmYWlsQXJyKTtcbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuX29uVXBkYXRlID0gZnVuY3Rpb24gKHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0dGhpcy5lbWl0KCd1cGRhdGUnLCBzdWNjZXNzQXJyLCBmYWlsQXJyKTtcbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuX29uUmVtb3ZlID0gZnVuY3Rpb24gKHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0dGhpcy5lbWl0KCdyZW1vdmUnLCBzdWNjZXNzQXJyLCBmYWlsQXJyKTtcbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuX29uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLmVtaXQoJ2NoYW5nZScpO1xufTtcblxuLyoqXG4gKiBVc2VzIHRoZSBwYXNzZWQgcXVlcnkgdG8gZ2VuZXJhdGUgYSBuZXcgY29sbGVjdGlvbiB3aXRoIHJlc3VsdHNcbiAqIG1hdGNoaW5nIHRoZSBxdWVyeSBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwYXJhbSBxdWVyeVxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLnN1YnNldCA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucykge1xuXHR2YXIgcmVzdWx0ID0gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblxuXHRyZXR1cm4gbmV3IENvbGxlY3Rpb24oKVxuXHRcdC5fc3Vic2V0T2YodGhpcylcblx0XHQucHJpbWFyeUtleSh0aGlzLl9wcmltYXJ5S2V5KVxuXHRcdC5zZXREYXRhKHJlc3VsdCk7XG59O1xuXG4vKipcbiAqIERyb3BzIGEgY29sbGVjdGlvbiBncm91cCBmcm9tIHRoZSBkYXRhYmFzZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIG9uIHN1Y2Nlc3MsIGZhbHNlIG9uIGZhaWx1cmUuXG4gKi9cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGksXG5cdFx0Y29sbEFyciA9IFtdLmNvbmNhdCh0aGlzLl9jb2xsZWN0aW9uQXJyKSxcblx0XHR2aWV3QXJyID0gW10uY29uY2F0KHRoaXMuX3ZpZXdzKTtcblxuXHRpZiAodGhpcy5fZGVidWcpIHtcblx0XHRjb25zb2xlLmxvZygnRHJvcHBpbmcgY29sbGVjdGlvbiBncm91cCAnICsgdGhpcy5fbmFtZSk7XG5cdH1cblxuXHRmb3IgKGkgPSAwOyBpIDwgY29sbEFyci5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMucmVtb3ZlQ29sbGVjdGlvbihjb2xsQXJyW2ldKTtcblx0fVxuXG5cdGZvciAoaSA9IDA7IGkgPCB2aWV3QXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0dGhpcy5fcmVtb3ZlVmlldyh2aWV3QXJyW2ldKTtcblx0fVxuXG5cdHRoaXMuZW1pdCgnZHJvcCcpO1xuXG5cdHJldHVybiB0cnVlO1xufTtcblxuLy8gRXh0ZW5kIERCIHRvIGluY2x1ZGUgY29sbGVjdGlvbiBncm91cHNcbkNvcmUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2NvbGxlY3Rpb25Hcm91cCA9IHt9O1xuXHRDb3JlSW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuQ29yZS5wcm90b3R5cGUuY29sbGVjdGlvbkdyb3VwID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25Hcm91cE5hbWUpIHtcblx0aWYgKGNvbGxlY3Rpb25Hcm91cE5hbWUpIHtcblx0XHR0aGlzLl9jb2xsZWN0aW9uR3JvdXBbY29sbGVjdGlvbkdyb3VwTmFtZV0gPSB0aGlzLl9jb2xsZWN0aW9uR3JvdXBbY29sbGVjdGlvbkdyb3VwTmFtZV0gfHwgbmV3IENvbGxlY3Rpb25Hcm91cChjb2xsZWN0aW9uR3JvdXBOYW1lKS5kYih0aGlzKTtcblx0XHRyZXR1cm4gdGhpcy5fY29sbGVjdGlvbkdyb3VwW2NvbGxlY3Rpb25Hcm91cE5hbWVdO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFJldHVybiBhbiBvYmplY3Qgb2YgY29sbGVjdGlvbiBkYXRhXG5cdFx0cmV0dXJuIHRoaXMuX2NvbGxlY3Rpb25Hcm91cDtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb2xsZWN0aW9uR3JvdXA7IiwiLypcbiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcblxuIENvcHlyaWdodCAoYykgMjAxNCBJcnJlbG9uIFNvZnR3YXJlIExpbWl0ZWRcbiBodHRwOi8vd3d3LmlycmVsb24uY29tXG5cbiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlLCB1cmwgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gVEhFIFNPRlRXQVJFLlxuXG4gU291cmNlOiBodHRwczovL2dpdGh1Yi5jb20vY29vbGJsb2tlMTMyNC9Gb3JlcnVubmVyREJcbiAqL1xudmFyIFNoYXJlZCxcblx0T3ZlcmxvYWQsXG5cdENvbGxlY3Rpb24sXG5cdE1ldHJpY3MsXG5cdENyYztcblxuU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQuanMnKTtcblxuLyoqXG4gKiBUaGUgbWFpbiBGb3JlcnVubmVyREIgY29yZSBvYmplY3QuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIENvcmUgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuQ29yZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fY29sbGVjdGlvbiA9IHt9O1xuXHR0aGlzLl9kZWJ1ZyA9IHt9O1xufTtcblxuU2hhcmVkLm1vZHVsZXMuQ29yZSA9IENvcmU7XG5cbk92ZXJsb2FkID0gcmVxdWlyZSgnLi9PdmVybG9hZC5qcycpO1xuQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vQ29sbGVjdGlvbi5qcycpO1xuTWV0cmljcyA9IHJlcXVpcmUoJy4vTWV0cmljcy5qcycpO1xuQ3JjID0gcmVxdWlyZSgnLi9DcmMuanMnKTtcblxuQ29yZS5wcm90b3R5cGUuX2lzU2VydmVyID0gZmFsc2U7XG5cbkNvcmUucHJvdG90eXBlLmlzQ2xpZW50ID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gIXRoaXMuX2lzU2VydmVyO1xufTtcblxuQ29yZS5wcm90b3R5cGUuaXNTZXJ2ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9pc1NlcnZlcjtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIGNoZWNrc3VtIG9mIGEgc3RyaW5nLlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIGNoZWNrc3VtLlxuICogQHJldHVybiB7U3RyaW5nfSBUaGUgY2hlY2tzdW0gZ2VuZXJhdGVkLlxuICovXG5Db3JlLnByb3RvdHlwZS5jcmMgPSBDcmM7XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBkYXRhYmFzZSBpcyBydW5uaW5nIG9uIGEgY2xpZW50IChicm93c2VyKSBvclxuICogYSBzZXJ2ZXIgKG5vZGUuanMpLlxuICogQHJldHVybnMge0Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiBydW5uaW5nIG9uIGEgYnJvd3Nlci5cbiAqL1xuQ29yZS5wcm90b3R5cGUuaXNDbGllbnQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiAhdGhpcy5faXNTZXJ2ZXI7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgZGF0YWJhc2UgaXMgcnVubmluZyBvbiBhIGNsaWVudCAoYnJvd3Nlcikgb3JcbiAqIGEgc2VydmVyIChub2RlLmpzKS5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBSZXR1cm5zIHRydWUgaWYgcnVubmluZyBvbiBhIHNlcnZlci5cbiAqL1xuQ29yZS5wcm90b3R5cGUuaXNTZXJ2ZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9pc1NlcnZlcjtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIG5vbi1yZWZlcmVuY2VkIHZlcnNpb24gb2YgdGhlIHBhc3NlZCBvYmplY3QgLyBhcnJheS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBvYmplY3Qgb3IgYXJyYXkgdG8gcmV0dXJuIGFzIGEgbm9uLXJlZmVyZW5jZWQgdmVyc2lvbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db3JlLnByb3RvdHlwZS5kZWNvdXBsZSA9IGZ1bmN0aW9uIChkYXRhKSB7XG5cdHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIGRlYnVnIGZsYWcgZm9yIHRoZSBkYXRhYmFzZS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdmFsIElmIHRydWUsIGRlYnVnIG1lc3NhZ2VzIHdpbGwgYmUgb3V0cHV0IHRvIHRoZSBjb25zb2xlLlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvcmUucHJvdG90eXBlLmRlYnVnID0gbmV3IE92ZXJsb2FkKFtcblx0ZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9kZWJ1Zy5hbGw7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKHZhbCkge1xuXHRcdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aWYgKHR5cGVvZiB2YWwgPT09ICdib29sZWFuJykge1xuXHRcdFx0XHR0aGlzLl9kZWJ1Zy5hbGwgPSB2YWw7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLl9kZWJ1Zy5hbGw7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKHR5cGUsIHZhbCkge1xuXHRcdGlmICh0eXBlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl9kZWJ1Z1t0eXBlXSA9IHZhbDtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLl9kZWJ1Z1t0eXBlXTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5fZGVidWcuYWxsO1xuXHR9XG5dKTtcblxuLyoqXG4gKiBDb252ZXJ0cyBhIG5vcm1hbCBqYXZhc2NyaXB0IGFycmF5IG9mIG9iamVjdHMgaW50byBhIERCIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge0FycmF5fSBhcnIgQW4gYXJyYXkgb2Ygb2JqZWN0cy5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufSBBIG5ldyBjb2xsZWN0aW9uIGluc3RhbmNlIHdpdGggdGhlIGRhdGEgc2V0IHRvIHRoZVxuICogYXJyYXkgcGFzc2VkLlxuICovXG5Db3JlLnByb3RvdHlwZS5hcnJheVRvQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChhcnIpIHtcblx0cmV0dXJuIG5ldyBDb2xsZWN0aW9uKCkuc2V0RGF0YShhcnIpO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcnMgYW4gZXZlbnQgbGlzdGVuZXIgYWdhaW5zdCBhbiBldmVudCBuYW1lLlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBuYW1lIG9mIHRoZSBldmVudCB0byBsaXN0ZW4gZm9yLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgVGhlIGxpc3RlbmVyIG1ldGhvZCB0byBjYWxsIHdoZW5cbiAqIHRoZSBldmVudCBpcyBmaXJlZC5cbiAqIEByZXR1cm5zIHtpbml0fVxuICovXG5Db3JlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXHR0aGlzLl9saXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwge307XG5cdHRoaXMuX2xpc3RlbmVyc1tldmVudF0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdIHx8IFtdO1xuXHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLnB1c2gobGlzdGVuZXIpO1xuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZS1yZWdpc3RlcnMgYW4gZXZlbnQgbGlzdGVuZXIgZnJvbSBhbiBldmVudCBuYW1lLlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBuYW1lIG9mIHRoZSBldmVudCB0byBzdG9wIGxpc3RlbmluZyBmb3IuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBsaXN0ZW5lciBUaGUgbGlzdGVuZXIgbWV0aG9kIHBhc3NlZCB0byBvbigpIHdoZW5cbiAqIHJlZ2lzdGVyaW5nIHRoZSBldmVudCBsaXN0ZW5lci5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db3JlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblx0aWYgKGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdHZhciBhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLFxuXHRcdFx0aW5kZXggPSBhcnIuaW5kZXhPZihsaXN0ZW5lcik7XG5cblx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0YXJyLnNwbGljZShpbmRleCwgMSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXRzIGFuIGV2ZW50IGJ5IG5hbWUgd2l0aCB0aGUgZ2l2ZW4gZGF0YS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdC5cbiAqIEBwYXJhbSB7Kj19IGRhdGEgVGhlIGRhdGEgdG8gZW1pdCB3aXRoIHRoZSBldmVudC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db3JlLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQsIGRhdGEpIHtcblx0dGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXG5cdGlmIChldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHR2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSxcblx0XHRcdGFyckNvdW50ID0gYXJyLmxlbmd0aCxcblx0XHRcdGFyckluZGV4O1xuXG5cdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdGFyclthcnJJbmRleF0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdlbmVyYXRlcyBhIG5ldyAxNi1jaGFyYWN0ZXIgaGV4YWRlY2ltYWwgdW5pcXVlIElEIG9yXG4gKiBnZW5lcmF0ZXMgYSBuZXcgMTYtY2hhcmFjdGVyIGhleGFkZWNpbWFsIElEIGJhc2VkIG9uXG4gKiB0aGUgcGFzc2VkIHN0cmluZy4gV2lsbCBhbHdheXMgZ2VuZXJhdGUgdGhlIHNhbWUgSURcbiAqIGZvciB0aGUgc2FtZSBzdHJpbmcuXG4gKiBAcGFyYW0ge1N0cmluZz19IHN0ciBBIHN0cmluZyB0byBnZW5lcmF0ZSB0aGUgSUQgZnJvbS5cbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqL1xuQ29yZS5wcm90b3R5cGUub2JqZWN0SWQgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdHZhciBpZCxcblx0XHR2YWwsXG5cdFx0Y291bnQsXG5cdFx0cG93ID0gTWF0aC5wb3coMTAsIDE3KSxcblx0XHRpO1xuXG5cdGlmICghc3RyKSB7XG5cdFx0U2hhcmVkLmlkQ291bnRlcisrO1xuXG5cdFx0aWQgPSAoU2hhcmVkLmlkQ291bnRlciArIChcblx0XHRcdE1hdGgucmFuZG9tKCkgKiBwb3cgK1xuXHRcdFx0XHRNYXRoLnJhbmRvbSgpICogcG93ICtcblx0XHRcdFx0TWF0aC5yYW5kb20oKSAqIHBvdyArXG5cdFx0XHRcdE1hdGgucmFuZG9tKCkgKiBwb3dcblx0XHRcdClcblx0XHQpLnRvU3RyaW5nKDE2KTtcblx0fSBlbHNlIHtcblx0XHR2YWwgPSAwO1xuXHRcdGNvdW50ID0gc3RyLmxlbmd0aDtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG5cdFx0XHR2YWwgKz0gc3RyLmNoYXJDb2RlQXQoaSkgKiBwb3c7XG5cdFx0fVxuXG5cdFx0aWQgPSB2YWwudG9TdHJpbmcoMTYpO1xuXHR9XG5cblx0cmV0dXJuIGlkO1xufTtcblxuLyoqXG4gKiBGaW5kIGFsbCBkb2N1bWVudHMgYWNyb3NzIGFsbCBjb2xsZWN0aW9ucyBpbiB0aGUgZGF0YWJhc2UgdGhhdCBtYXRjaCB0aGUgcGFzc2VkXG4gKiBzdHJpbmcgb3Igc2VhcmNoIG9iamVjdC5cbiAqIEBwYXJhbSBzZWFyY2ggU3RyaW5nIG9yIHNlYXJjaCBvYmplY3QuXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbkNvcmUucHJvdG90eXBlLnBlZWsgPSBmdW5jdGlvbiAoc2VhcmNoKSB7XG5cdHZhciBpLFxuXHRcdGNvbGwsXG5cdFx0YXJyID0gW10sXG5cdFx0dHlwZU9mU2VhcmNoID0gdHlwZW9mIHNlYXJjaDtcblxuXHQvLyBMb29wIGNvbGxlY3Rpb25zXG5cdGZvciAoaSBpbiB0aGlzLl9jb2xsZWN0aW9uKSB7XG5cdFx0aWYgKHRoaXMuX2NvbGxlY3Rpb24uaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGNvbGwgPSB0aGlzLl9jb2xsZWN0aW9uW2ldO1xuXG5cdFx0XHRpZiAodHlwZU9mU2VhcmNoID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRhcnIgPSBhcnIuY29uY2F0KGNvbGwucGVlayhzZWFyY2gpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFyciA9IGFyci5jb25jYXQoY29sbC5maW5kKHNlYXJjaCkpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhcnI7XG59O1xuXG4vKipcbiAqIEZpbmQgYWxsIGRvY3VtZW50cyBhY3Jvc3MgYWxsIGNvbGxlY3Rpb25zIGluIHRoZSBkYXRhYmFzZSB0aGF0IG1hdGNoIHRoZSBwYXNzZWRcbiAqIHN0cmluZyBvciBzZWFyY2ggb2JqZWN0IGFuZCByZXR1cm4gdGhlbSBpbiBhbiBvYmplY3Qgd2hlcmUgZWFjaCBrZXkgaXMgdGhlIG5hbWVcbiAqIG9mIHRoZSBjb2xsZWN0aW9uIHRoYXQgdGhlIGRvY3VtZW50IHdhcyBtYXRjaGVkIGluLlxuICogQHBhcmFtIHNlYXJjaCBTdHJpbmcgb3Igc2VhcmNoIG9iamVjdC5cbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuQ29yZS5wcm90b3R5cGUucGVla0NhdCA9IGZ1bmN0aW9uIChzZWFyY2gpIHtcblx0dmFyIGksXG5cdFx0Y29sbCxcblx0XHRjYXQgPSB7fSxcblx0XHRhcnIsXG5cdFx0dHlwZU9mU2VhcmNoID0gdHlwZW9mIHNlYXJjaDtcblxuXHQvLyBMb29wIGNvbGxlY3Rpb25zXG5cdGZvciAoaSBpbiB0aGlzLl9jb2xsZWN0aW9uKSB7XG5cdFx0aWYgKHRoaXMuX2NvbGxlY3Rpb24uaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGNvbGwgPSB0aGlzLl9jb2xsZWN0aW9uW2ldO1xuXG5cdFx0XHRpZiAodHlwZU9mU2VhcmNoID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRhcnIgPSBjb2xsLnBlZWsoc2VhcmNoKTtcblxuXHRcdFx0XHRpZiAoYXJyICYmIGFyci5sZW5ndGgpIHtcblx0XHRcdFx0XHRjYXRbY29sbC5uYW1lKCldID0gYXJyO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhcnIgPSBjb2xsLmZpbmQoc2VhcmNoKTtcblxuXHRcdFx0XHRpZiAoYXJyICYmIGFyci5sZW5ndGgpIHtcblx0XHRcdFx0XHRjYXRbY29sbC5uYW1lKCldID0gYXJyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGNhdDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29yZTsiLCJ2YXIgY3JjVGFibGUgPSAoZnVuY3Rpb24gKCkge1xuXHR2YXIgY3JjVGFibGUgPSBbXSxcblx0XHRjLCBuLCBrO1xuXG5cdGZvciAobiA9IDA7IG4gPCAyNTY7IG4rKykge1xuXHRcdGMgPSBuO1xuXG5cdFx0Zm9yIChrID0gMDsgayA8IDg7IGsrKykge1xuXHRcdFx0YyA9ICgoYyAmIDEpID8gKDB4RURCODgzMjAgXiAoYyA+Pj4gMSkpIDogKGMgPj4+IDEpKTtcblx0XHR9XG5cblx0XHRjcmNUYWJsZVtuXSA9IGM7XG5cdH1cblxuXHRyZXR1cm4gY3JjVGFibGU7XG59KCkpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0cikge1xuXHR2YXIgY3JjID0gMCBeICgtMSksXG5cdFx0aTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG5cdFx0Y3JjID0gKGNyYyA+Pj4gOCkgXiBjcmNUYWJsZVsoY3JjIF4gc3RyLmNoYXJDb2RlQXQoaSkpICYgMHhGRl07XG5cdH1cblxuXHRyZXR1cm4gKGNyYyBeICgtMSkpID4+PiAwO1xufTsiLCIvLyBJbXBvcnQgZXh0ZXJuYWwgbmFtZXMgbG9jYWxseVxudmFyIFNoYXJlZCxcblx0Q29sbGVjdGlvbixcblx0Q29sbGVjdGlvbkluaXQ7XG5cblNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyk7XG5cbi8qKlxuICogVGhlIGNvbnN0cnVjdG9yLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgSGlnaGNoYXJ0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24sIG9wdGlvbnMpIHtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5IaWdoY2hhcnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoY29sbGVjdGlvbiwgb3B0aW9ucykge1xuXHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcblx0dGhpcy5fc2VsZWN0b3IgPSAkKHRoaXMuX29wdGlvbnMuc2VsZWN0b3IpO1xuXHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcblx0dGhpcy5fY29sbGVjdGlvbiA9IGNvbGxlY3Rpb247XG5cblx0Ly8gU2V0dXAgdGhlIGNoYXJ0XG5cdHRoaXMuX29wdGlvbnMuc2VyaWVzID0gW107XG5cblx0Ly8gU2V0IHRoZSBkYXRhIGZvciB0aGUgY2hhcnRcblx0dmFyIGRhdGEsXG5cdFx0c2VyaWVzT2JqLFxuXHRcdGNoYXJ0RGF0YSxcblx0XHRpO1xuXG5cdHN3aXRjaCAodGhpcy5fb3B0aW9ucy50eXBlKSB7XG5cdFx0Y2FzZSAncGllJzpcblx0XHRcdC8vIENyZWF0ZSBjaGFydCBmcm9tIGRhdGFcblx0XHRcdHRoaXMuX3NlbGVjdG9yLmhpZ2hjaGFydHModGhpcy5fb3B0aW9ucy5jaGFydE9wdGlvbnMpO1xuXHRcdFx0dGhpcy5fY2hhcnQgPSB0aGlzLl9zZWxlY3Rvci5oaWdoY2hhcnRzKCk7XG5cblx0XHRcdC8vIEdlbmVyYXRlIGdyYXBoIGRhdGEgZnJvbSBjb2xsZWN0aW9uIGRhdGFcblx0XHRcdGRhdGEgPSB0aGlzLl9jb2xsZWN0aW9uLmZpbmQoKTtcblxuXHRcdFx0c2VyaWVzT2JqID0ge1xuXHRcdFx0XHRhbGxvd1BvaW50U2VsZWN0OiB0cnVlLFxuXHRcdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdFx0ZGF0YUxhYmVsczoge1xuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXG5cdFx0XHRcdFx0Zm9ybWF0OiAnPGI+e3BvaW50Lm5hbWV9PC9iPjoge3l9ICh7cG9pbnQucGVyY2VudGFnZTouMGZ9JSknLFxuXHRcdFx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdFx0XHRjb2xvcjogKEhpZ2hjaGFydHMudGhlbWUgJiYgSGlnaGNoYXJ0cy50aGVtZS5jb250cmFzdFRleHRDb2xvcikgfHwgJ2JsYWNrJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fTtcblxuXHRcdFx0Y2hhcnREYXRhID0gdGhpcy5waWVEYXRhRnJvbUNvbGxlY3Rpb25EYXRhKGRhdGEsIHRoaXMuX29wdGlvbnMua2V5RmllbGQsIHRoaXMuX29wdGlvbnMudmFsRmllbGQpO1xuXG5cdFx0XHQkLmV4dGVuZChzZXJpZXNPYmosIHRoaXMuX29wdGlvbnMuc2VyaWVzT3B0aW9ucyk7XG5cblx0XHRcdCQuZXh0ZW5kKHNlcmllc09iaiwge1xuXHRcdFx0XHR0eXBlOiAncGllJyxcblx0XHRcdFx0bmFtZTogdGhpcy5fb3B0aW9ucy5zZXJpZXNOYW1lLFxuXHRcdFx0XHRkYXRhOiBjaGFydERhdGFcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLl9jaGFydC5hZGRTZXJpZXMoc2VyaWVzT2JqKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSAnbGluZSc6XG5cdFx0XHQvLyBHZW5lcmF0ZSBncmFwaCBkYXRhIGZyb20gY29sbGVjdGlvbiBkYXRhXG5cdFx0XHQvKnNlcmllc09iaiA9IHtcblx0XHRcdFx0YWxsb3dQb2ludFNlbGVjdDogdHJ1ZSxcblx0XHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHRcdH07Ki9cblxuXHRcdFx0Y2hhcnREYXRhID0gdGhpcy5saW5lRGF0YUZyb21Db2xsZWN0aW9uRGF0YShcblx0XHRcdFx0dGhpcy5fb3B0aW9ucy5zZXJpZXNGaWVsZCxcblx0XHRcdFx0dGhpcy5fb3B0aW9ucy5rZXlGaWVsZCxcblx0XHRcdFx0dGhpcy5fb3B0aW9ucy52YWxGaWVsZCxcblx0XHRcdFx0dGhpcy5fb3B0aW9ucy5vcmRlckJ5XG5cdFx0XHQpO1xuXG5cdFx0XHR0aGlzLl9vcHRpb25zLmNoYXJ0T3B0aW9ucy54QXhpcyA9IGNoYXJ0RGF0YS54QXhpcztcblx0XHRcdHRoaXMuX29wdGlvbnMuY2hhcnRPcHRpb25zLnNlcmllcyA9IGNoYXJ0RGF0YS5zZXJpZXM7XG5cblx0XHRcdHRoaXMuX3NlbGVjdG9yLmhpZ2hjaGFydHModGhpcy5fb3B0aW9ucy5jaGFydE9wdGlvbnMpO1xuXHRcdFx0dGhpcy5fY2hhcnQgPSB0aGlzLl9zZWxlY3Rvci5oaWdoY2hhcnRzKCk7XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdC8vIEhvb2sgdGhlIGNvbGxlY3Rpb24gZXZlbnRzIHRvIGF1dG8tdXBkYXRlIHRoZSBjaGFydFxuXHR0aGlzLl9ob29rRXZlbnRzKCk7XG59O1xuXG5Db2xsZWN0aW9uID0gU2hhcmVkLm1vZHVsZXMuQ29sbGVjdGlvbjtcbkNvbGxlY3Rpb25Jbml0ID0gQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdDtcblxuLyoqXG4gKiBHZW5lcmF0ZSBwaWUtY2hhcnQgc2VyaWVzIGRhdGEgZnJvbSB0aGUgZ2l2ZW4gY29sbGVjdGlvbiBkYXRhIGFycmF5LlxuICogQHBhcmFtIGRhdGFcbiAqIEBwYXJhbSBrZXlGaWVsZFxuICogQHBhcmFtIHZhbEZpZWxkXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbkhpZ2hjaGFydC5wcm90b3R5cGUucGllRGF0YUZyb21Db2xsZWN0aW9uRGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBrZXlGaWVsZCwgdmFsRmllbGQpIHtcblx0dmFyIGdyYXBoRGF0YSA9IFtdLFxuXHRcdGk7XG5cblx0Zm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRncmFwaERhdGEucHVzaChbZGF0YVtpXVtrZXlGaWVsZF0sIGRhdGFbaV1bdmFsRmllbGRdXSk7XG5cdH1cblxuXHRyZXR1cm4gZ3JhcGhEYXRhO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBsaW5lLWNoYXJ0IHNlcmllcyBkYXRhIGZyb20gdGhlIGdpdmVuIGNvbGxlY3Rpb24gZGF0YSBhcnJheS5cbiAqIEBwYXJhbSBzZXJpZXNGaWVsZFxuICogQHBhcmFtIGtleUZpZWxkXG4gKiBAcGFyYW0gdmFsRmllbGRcbiAqIEBwYXJhbSBvcmRlckJ5XG4gKi9cbkhpZ2hjaGFydC5wcm90b3R5cGUubGluZURhdGFGcm9tQ29sbGVjdGlvbkRhdGEgPSBmdW5jdGlvbiAoc2VyaWVzRmllbGQsIGtleUZpZWxkLCB2YWxGaWVsZCwgb3JkZXJCeSkge1xuXHR2YXIgZGF0YSA9IHRoaXMuX2NvbGxlY3Rpb24uZGlzdGluY3Qoc2VyaWVzRmllbGQpLFxuXHRcdHNlcmllc0RhdGEgPSBbXSxcblx0XHR4QXhpcyA9IHtcblx0XHRcdGNhdGVnb3JpZXM6IFtdXG5cdFx0fSxcblx0XHRzZXJpZXNOYW1lLFxuXHRcdHF1ZXJ5LFxuXHRcdGRhdGFTZWFyY2gsXG5cdFx0c2VyaWVzVmFsdWVzLFxuXHRcdGksIGs7XG5cblx0Ly8gV2hhdCB3ZSBXQU5UIHRvIG91dHB1dDpcblx0LypzZXJpZXM6IFt7XG5cdFx0bmFtZTogJ1Jlc3BvbnNlcycsXG5cdFx0ZGF0YTogWzcuMCwgNi45LCA5LjUsIDE0LjUsIDE4LjIsIDIxLjUsIDI1LjIsIDI2LjUsIDIzLjMsIDE4LjMsIDEzLjksIDkuNl1cblx0fV0qL1xuXG5cdC8vIExvb3Aga2V5c1xuXHRmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdHNlcmllc05hbWUgPSBkYXRhW2ldO1xuXHRcdHF1ZXJ5ID0ge307XG5cdFx0cXVlcnlbc2VyaWVzRmllbGRdID0gc2VyaWVzTmFtZTtcblxuXHRcdHNlcmllc1ZhbHVlcyA9IFtdO1xuXHRcdGRhdGFTZWFyY2ggPSB0aGlzLl9jb2xsZWN0aW9uLmZpbmQocXVlcnksIHtcblx0XHRcdG9yZGVyQnk6IG9yZGVyQnlcblx0XHR9KTtcblxuXHRcdC8vIExvb3AgdGhlIGtleVNlYXJjaCBkYXRhIGFuZCBncmFiIHRoZSB2YWx1ZSBmb3IgZWFjaCBpdGVtXG5cdFx0Zm9yIChrID0gMDsgayA8IGRhdGFTZWFyY2gubGVuZ3RoOyBrKyspIHtcblx0XHRcdHhBeGlzLmNhdGVnb3JpZXMucHVzaChkYXRhU2VhcmNoW2tdW2tleUZpZWxkXSk7XG5cdFx0XHRzZXJpZXNWYWx1ZXMucHVzaChkYXRhU2VhcmNoW2tdW3ZhbEZpZWxkXSk7XG5cdFx0fVxuXG5cdFx0c2VyaWVzRGF0YS5wdXNoKHtcblx0XHRcdG5hbWU6IHNlcmllc05hbWUsXG5cdFx0XHRkYXRhOiBzZXJpZXNWYWx1ZXNcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0eEF4aXM6IHhBeGlzLFxuXHRcdHNlcmllczogc2VyaWVzRGF0YVxuXHR9O1xufTtcblxuSGlnaGNoYXJ0LnByb3RvdHlwZS5faG9va0V2ZW50cyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdHNlbGYuX2NvbGxlY3Rpb24ub24oJ2NoYW5nZScsIHNlbGYuX2NoYW5nZUxpc3RlbmVyKTtcblxuXHQvLyBJZiB0aGUgY29sbGVjdGlvbiBpcyBkcm9wcGVkLCBjbGVhbiB1cCBhZnRlciBvdXJzZWx2ZXNcblx0c2VsZi5fY29sbGVjdGlvbi5vbignZHJvcCcsIHNlbGYuX2Ryb3BMaXN0ZW5lcik7XG59O1xuXG5IaWdoY2hhcnQucHJvdG90eXBlLl9jaGFuZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdC8vIFVwZGF0ZSB0aGUgc2VyaWVzIGRhdGEgb24gdGhlIGNoYXJ0XG5cdGlmKHR5cGVvZiBzZWxmLl9jb2xsZWN0aW9uICE9PSAndW5kZWZpbmVkJyAmJiBzZWxmLl9jaGFydCkge1xuXHRcdHZhciBkYXRhID0gc2VsZi5fY29sbGVjdGlvbi5maW5kKCk7XG5cblx0XHRzd2l0Y2ggKHNlbGYuX29wdGlvbnMudHlwZSkge1xuXHRcdFx0Y2FzZSAncGllJzpcblx0XHRcdFx0c2VsZi5fY2hhcnQuc2VyaWVzWzBdLnNldERhdGEoXG5cdFx0XHRcdFx0c2VsZi5waWVEYXRhRnJvbUNvbGxlY3Rpb25EYXRhKFxuXHRcdFx0XHRcdFx0ZGF0YSxcblx0XHRcdFx0XHRcdHNlbGYuX29wdGlvbnMua2V5RmllbGQsXG5cdFx0XHRcdFx0XHRzZWxmLl9vcHRpb25zLnZhbEZpZWxkXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAnbGluZSc6XG5cdFx0XHRcdHZhciBsaW5lU2VyaWVzRGF0YSA9IHNlbGYubGluZURhdGFGcm9tQ29sbGVjdGlvbkRhdGEoXG5cdFx0XHRcdFx0c2VsZi5fb3B0aW9ucy5zZXJpZXNGaWVsZCxcblx0XHRcdFx0XHRzZWxmLl9vcHRpb25zLmtleUZpZWxkLFxuXHRcdFx0XHRcdHNlbGYuX29wdGlvbnMudmFsRmllbGQsXG5cdFx0XHRcdFx0c2VsZi5fb3B0aW9ucy5vcmRlckJ5XG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0c2VsZi5fY2hhcnQueEF4aXNbMF0uc2V0Q2F0ZWdvcmllcyhcblx0XHRcdFx0XHRsaW5lU2VyaWVzRGF0YS54QXhpcy5jYXRlZ29yaWVzXG5cdFx0XHRcdCk7XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsaW5lU2VyaWVzRGF0YS5zZXJpZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRzZWxmLl9jaGFydC5zZXJpZXNbaV0uc2V0RGF0YShcblx0XHRcdFx0XHRcdGxpbmVTZXJpZXNEYXRhLnNlcmllc1tpXS5kYXRhXG5cdFx0XHRcdFx0KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cdH1cbn07XG5cbkhpZ2hjaGFydC5wcm90b3R5cGUuX2Ryb3BMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdHNlbGYuX2NvbGxlY3Rpb24ub2ZmKCdjaGFuZ2UnLCBzZWxmLl9jaGFuZ2VMaXN0ZW5lcik7XG5cdHNlbGYuX2NvbGxlY3Rpb24ub2ZmKCdkcm9wJywgc2VsZi5fZHJvcExpc3RlbmVyKTtcbn07XG5cbkhpZ2hjaGFydC5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fY2hhcnQuZGVzdHJveSgpO1xuXG5cdHRoaXMuX2NvbGxlY3Rpb24ub2ZmKCdjaGFuZ2UnLCB0aGlzLl9jaGFuZ2VMaXN0ZW5lcik7XG5cdHRoaXMuX2NvbGxlY3Rpb24ub2ZmKCdkcm9wJywgdGhpcy5fZHJvcExpc3RlbmVyKTtcblxuXHRkZWxldGUgdGhpcy5fY29sbGVjdGlvbi5faGlnaGNoYXJ0c1t0aGlzLl9vcHRpb25zLnNlbGVjdG9yXTtcblx0ZGVsZXRlIHRoaXMuX2NoYXJ0O1xuXHRkZWxldGUgdGhpcy5fb3B0aW9ucztcblx0ZGVsZXRlIHRoaXMuX2NvbGxlY3Rpb247XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vLyBFeHRlbmQgY29sbGVjdGlvbiB3aXRoIHZpZXcgaW5pdFxuQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5faGlnaGNoYXJ0cyA9IHt9O1xuXHRDb2xsZWN0aW9uSW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuQ29sbGVjdGlvbi5wcm90b3R5cGUuY2hhcnQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuXHRpZiAoIXRoaXMuX2hpZ2hjaGFydHNbb3B0aW9ucy5zZWxlY3Rvcl0pIHtcblx0XHQvLyBTdG9yZSBuZXcgY2hhcnQgaW4gY2hhcnRzIGFycmF5XG5cdFx0dGhpcy5faGlnaGNoYXJ0c1tvcHRpb25zLnNlbGVjdG9yXSA9IG5ldyBIaWdoY2hhcnQodGhpcywgb3B0aW9ucyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5faGlnaGNoYXJ0c1tvcHRpb25zLnNlbGVjdG9yXTtcbn07XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRyb3BDaGFydCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuXHRpZiAodGhpcy5faGlnaGNoYXJ0c1tzZWxlY3Rvcl0pIHtcblx0XHR0aGlzLl9oaWdoY2hhcnRzW3NlbGVjdG9yXS5kcm9wKCk7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGlnaGNoYXJ0OyIsInZhciBTaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpLFxuXHRQYXRoID0gcmVxdWlyZSgnLi9QYXRoJyk7XG5cbi8qKlxuICogVGhlIGluZGV4IGNsYXNzIHVzZWQgdG8gaW5zdGFudGlhdGUgaW5kZXhlcyB0aGF0IHRoZSBkYXRhYmFzZSBjYW5cbiAqIHVzZSB0byBzcGVlZCB1cCBxdWVyaWVzIG9uIGNvbGxlY3Rpb25zIGFuZCB2aWV3cy5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgSW5kZXggPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuSW5kZXgucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoa2V5cywgb3B0aW9ucywgY29sbGVjdGlvbikge1xuXHR0aGlzLl9jcm9zc1JlZiA9IHt9O1xuXHR0aGlzLl9zaXplID0gMDtcblx0dGhpcy5faWQgPSB0aGlzLl9pdGVtS2V5SGFzaChrZXlzLCBrZXlzKTtcblxuXHR0aGlzLmRhdGEoe30pO1xuXHR0aGlzLnVuaXF1ZShvcHRpb25zICYmIG9wdGlvbnMudW5pcXVlID8gb3B0aW9ucy51bmlxdWUgOiBmYWxzZSk7XG5cblx0aWYgKGtleXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMua2V5cyhrZXlzKTtcblx0fVxuXG5cdGlmIChjb2xsZWN0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLmNvbGxlY3Rpb24oY29sbGVjdGlvbik7XG5cdH1cblxuXHR0aGlzLm5hbWUob3B0aW9ucyAmJiBvcHRpb25zLm5hbWUgPyBvcHRpb25zLm5hbWUgOiB0aGlzLl9pZCk7XG59O1xuXG5TaGFyZWQubW9kdWxlcy5JbmRleCA9IEluZGV4O1xuXG5JbmRleC5wcm90b3R5cGUuaWQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9pZDtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5zdGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX3N0YXRlO1xufTtcblxuSW5kZXgucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9zaXplO1xufTtcblxuSW5kZXgucHJvdG90eXBlLmRhdGEgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2RhdGEgPSB2YWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fZGF0YTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5uYW1lID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9uYW1lID0gdmFsO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX25hbWU7XG59O1xuXG5JbmRleC5wcm90b3R5cGUuY29sbGVjdGlvbiA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fY29sbGVjdGlvbiA9IHZhbDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9jb2xsZWN0aW9uO1xufTtcblxuSW5kZXgucHJvdG90eXBlLmtleXMgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2tleXMgPSB2YWw7XG5cblx0XHQvLyBDb3VudCB0aGUga2V5c1xuXHRcdHRoaXMuX2tleUNvdW50ID0gKG5ldyBQYXRoKCkpLnBhcnNlKHRoaXMuX2tleXMpLmxlbmd0aDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9rZXlzO1xufTtcblxuSW5kZXgucHJvdG90eXBlLnR5cGUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3R5cGUgPSB2YWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fdHlwZTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS51bmlxdWUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3VuaXF1ZSA9IHZhbDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl91bmlxdWU7XG59O1xuXG5JbmRleC5wcm90b3R5cGUucmVidWlsZCA9IGZ1bmN0aW9uICgpIHtcblx0Ly8gRG8gd2UgaGF2ZSBhIGNvbGxlY3Rpb24/XG5cdGlmICh0aGlzLl9jb2xsZWN0aW9uKSB7XG5cdFx0Ly8gR2V0IHNvcnRlZCBkYXRhXG5cdFx0dmFyIGNvbGxlY3Rpb24gPSB0aGlzLl9jb2xsZWN0aW9uLnN1YnNldCh7fSwge1xuXHRcdFx0XHRkZWNvdXBsZTogZmFsc2UsXG5cdFx0XHRcdHNvcnQ6IHRoaXMuX2tleXNcblx0XHRcdH0pLFxuXHRcdFx0Y29sbGVjdGlvbkRhdGEgPSBjb2xsZWN0aW9uLmZpbmQoKSxcblx0XHRcdGRhdGFJbmRleCxcblx0XHRcdGRhdGFDb3VudCA9IGNvbGxlY3Rpb25EYXRhLmxlbmd0aDtcblxuXHRcdC8vIENsZWFyIHRoZSBpbmRleCBkYXRhIGZvciB0aGUgaW5kZXhcblx0XHR0aGlzLl9kYXRhID0ge307XG5cblx0XHRpZiAodGhpcy5fdW5pcXVlKSB7XG5cdFx0XHR0aGlzLl91bmlxdWVMb29rdXAgPSB7fTtcblx0XHR9XG5cblx0XHQvLyBMb29wIHRoZSBjb2xsZWN0aW9uIGRhdGFcblx0XHRmb3IgKGRhdGFJbmRleCA9IDA7IGRhdGFJbmRleCA8IGRhdGFDb3VudDsgZGF0YUluZGV4KyspIHtcblx0XHRcdHRoaXMuaW5zZXJ0KGNvbGxlY3Rpb25EYXRhW2RhdGFJbmRleF0pO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuX3N0YXRlID0ge1xuXHRcdG5hbWU6IHRoaXMuX25hbWUsXG5cdFx0a2V5czogdGhpcy5fa2V5cyxcblx0XHRpbmRleFNpemU6IHRoaXMuX3NpemUsXG5cdFx0YnVpbHQ6IG5ldyBEYXRlKCksXG5cdFx0dXBkYXRlZDogbmV3IERhdGUoKSxcblx0XHRvazogdHJ1ZVxuXHR9O1xufTtcblxuSW5kZXgucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uIChkYXRhSXRlbSwgb3B0aW9ucykge1xuXHR2YXIgdW5pcXVlRmxhZyA9IHRoaXMuX3VuaXF1ZSxcblx0XHR1bmlxdWVIYXNoLFxuXHRcdGl0ZW1IYXNoQXJyLFxuXHRcdGhhc2hJbmRleDtcblxuXHRpZiAodW5pcXVlRmxhZykge1xuXHRcdHVuaXF1ZUhhc2ggPSB0aGlzLl9pdGVtSGFzaChkYXRhSXRlbSwgdGhpcy5fa2V5cyk7XG5cdFx0dGhpcy5fdW5pcXVlTG9va3VwW3VuaXF1ZUhhc2hdID0gZGF0YUl0ZW07XG5cdH1cblxuXHQvLyBHZW5lcmF0ZSBpdGVtIGhhc2hcblx0aXRlbUhhc2hBcnIgPSB0aGlzLl9pdGVtSGFzaEFycihkYXRhSXRlbSwgdGhpcy5fa2V5cyk7XG5cblx0Ly8gR2V0IHRoZSBwYXRoIHNlYXJjaCByZXN1bHRzIGFuZCBzdG9yZSB0aGVtXG5cdGZvciAoaGFzaEluZGV4ID0gMDsgaGFzaEluZGV4IDwgaXRlbUhhc2hBcnIubGVuZ3RoOyBoYXNoSW5kZXgrKykge1xuXHRcdHRoaXMucHVzaFRvUGF0aFZhbHVlKGl0ZW1IYXNoQXJyW2hhc2hJbmRleF0sIGRhdGFJdGVtKTtcblx0fVxufTtcblxuSW5kZXgucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChkYXRhSXRlbSwgb3B0aW9ucykge1xuXHR2YXIgdW5pcXVlRmxhZyA9IHRoaXMuX3VuaXF1ZSxcblx0XHR1bmlxdWVIYXNoLFxuXHRcdGl0ZW1IYXNoQXJyLFxuXHRcdGhhc2hJbmRleDtcblxuXHRpZiAodW5pcXVlRmxhZykge1xuXHRcdHVuaXF1ZUhhc2ggPSB0aGlzLl9pdGVtSGFzaChkYXRhSXRlbSwgdGhpcy5fa2V5cyk7XG5cdFx0ZGVsZXRlIHRoaXMuX3VuaXF1ZUxvb2t1cFt1bmlxdWVIYXNoXTtcblx0fVxuXG5cdC8vIEdlbmVyYXRlIGl0ZW0gaGFzaFxuXHRpdGVtSGFzaEFyciA9IHRoaXMuX2l0ZW1IYXNoQXJyKGRhdGFJdGVtLCB0aGlzLl9rZXlzKTtcblxuXHQvLyBHZXQgdGhlIHBhdGggc2VhcmNoIHJlc3VsdHMgYW5kIHN0b3JlIHRoZW1cblx0Zm9yIChoYXNoSW5kZXggPSAwOyBoYXNoSW5kZXggPCBpdGVtSGFzaEFyci5sZW5ndGg7IGhhc2hJbmRleCsrKSB7XG5cdFx0dGhpcy5wdWxsRnJvbVBhdGhWYWx1ZShpdGVtSGFzaEFycltoYXNoSW5kZXhdLCBkYXRhSXRlbSk7XG5cdH1cbn07XG5cbkluZGV4LnByb3RvdHlwZS52aW9sYXRpb24gPSBmdW5jdGlvbiAoZGF0YUl0ZW0pIHtcblx0Ly8gR2VuZXJhdGUgaXRlbSBoYXNoXG5cdHZhciB1bmlxdWVIYXNoID0gdGhpcy5faXRlbUhhc2goZGF0YUl0ZW0sIHRoaXMuX2tleXMpO1xuXG5cdC8vIENoZWNrIGlmIHRoZSBpdGVtIGJyZWFrcyB0aGUgdW5pcXVlIGNvbnN0cmFpbnRcblx0cmV0dXJuIEJvb2xlYW4odGhpcy5fdW5pcXVlTG9va3VwW3VuaXF1ZUhhc2hdKTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5oYXNoVmlvbGF0aW9uID0gZnVuY3Rpb24gKHVuaXF1ZUhhc2gpIHtcblx0Ly8gQ2hlY2sgaWYgdGhlIGl0ZW0gYnJlYWtzIHRoZSB1bmlxdWUgY29uc3RyYWludFxuXHRyZXR1cm4gQm9vbGVhbih0aGlzLl91bmlxdWVMb29rdXBbdW5pcXVlSGFzaF0pO1xufTtcblxuSW5kZXgucHJvdG90eXBlLnB1c2hUb1BhdGhWYWx1ZSA9IGZ1bmN0aW9uIChoYXNoLCBvYmopIHtcblx0dmFyIHBhdGhWYWxBcnIgPSB0aGlzLl9kYXRhW2hhc2hdID0gdGhpcy5fZGF0YVtoYXNoXSB8fCBbXTtcblxuXHQvLyBNYWtlIHN1cmUgd2UgaGF2ZSBub3QgYWxyZWFkeSBpbmRleGVkIHRoaXMgb2JqZWN0IGF0IHRoaXMgcGF0aC92YWx1ZVxuXHRpZiAocGF0aFZhbEFyci5pbmRleE9mKG9iaikgPT09IC0xKSB7XG5cdFx0Ly8gSW5kZXggdGhlIG9iamVjdFxuXHRcdHBhdGhWYWxBcnIucHVzaChvYmopO1xuXG5cdFx0Ly8gUmVjb3JkIHRoZSByZWZlcmVuY2UgdG8gdGhpcyBvYmplY3QgaW4gb3VyIGluZGV4IHNpemVcblx0XHR0aGlzLl9zaXplKys7XG5cblx0XHQvLyBDcm9zcy1yZWZlcmVuY2UgdGhpcyBhc3NvY2lhdGlvbiBmb3IgbGF0ZXIgbG9va3VwXG5cdFx0dGhpcy5wdXNoVG9Dcm9zc1JlZihvYmosIHBhdGhWYWxBcnIpO1xuXHR9XG59O1xuXG5JbmRleC5wcm90b3R5cGUucHVsbEZyb21QYXRoVmFsdWUgPSBmdW5jdGlvbiAoaGFzaCwgb2JqKSB7XG5cdHZhciBwYXRoVmFsQXJyID0gdGhpcy5fZGF0YVtoYXNoXSxcblx0XHRpbmRleE9mT2JqZWN0O1xuXG5cdC8vIE1ha2Ugc3VyZSB3ZSBoYXZlIGFscmVhZHkgaW5kZXhlZCB0aGlzIG9iamVjdCBhdCB0aGlzIHBhdGgvdmFsdWVcblx0aW5kZXhPZk9iamVjdCA9IHBhdGhWYWxBcnIuaW5kZXhPZihvYmopO1xuXG5cdGlmIChpbmRleE9mT2JqZWN0ID4gLTEpIHtcblx0XHQvLyBVbi1pbmRleCB0aGUgb2JqZWN0XG5cdFx0cGF0aFZhbEFyci5zcGxpY2UoaW5kZXhPZk9iamVjdCwgMSk7XG5cblx0XHQvLyBSZWNvcmQgdGhlIHJlZmVyZW5jZSB0byB0aGlzIG9iamVjdCBpbiBvdXIgaW5kZXggc2l6ZVxuXHRcdHRoaXMuX3NpemUtLTtcblxuXHRcdC8vIFJlbW92ZSBvYmplY3QgY3Jvc3MtcmVmZXJlbmNlXG5cdFx0dGhpcy5wdWxsRnJvbUNyb3NzUmVmKG9iaiwgcGF0aFZhbEFycik7XG5cdH1cblxuXHQvLyBDaGVjayBpZiB3ZSBzaG91bGQgcmVtb3ZlIHRoZSBwYXRoIHZhbHVlIGFycmF5XG5cdGlmICghcGF0aFZhbEFyci5sZW5ndGgpIHtcblx0XHQvLyBSZW1vdmUgdGhlIGFycmF5XG5cdFx0ZGVsZXRlIHRoaXMuX2RhdGFbaGFzaF07XG5cdH1cbn07XG5cbkluZGV4LnByb3RvdHlwZS5wdWxsID0gZnVuY3Rpb24gKG9iaikge1xuXHQvLyBHZXQgYWxsIHBsYWNlcyB0aGUgb2JqZWN0IGhhcyBiZWVuIHVzZWQgYW5kIHJlbW92ZSB0aGVtXG5cdHZhciBpZCA9IG9ialt0aGlzLl9jb2xsZWN0aW9uLnByaW1hcnlLZXkoKV0sXG5cdFx0Y3Jvc3NSZWZBcnIgPSB0aGlzLl9jcm9zc1JlZltpZF0sXG5cdFx0YXJySW5kZXgsXG5cdFx0YXJyQ291bnQgPSBjcm9zc1JlZkFyci5sZW5ndGgsXG5cdFx0YXJySXRlbTtcblxuXHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdGFyckl0ZW0gPSBjcm9zc1JlZkFyclthcnJJbmRleF07XG5cblx0XHQvLyBSZW1vdmUgaXRlbSBmcm9tIHRoaXMgaW5kZXggbG9va3VwIGFycmF5XG5cdFx0dGhpcy5fcHVsbEZyb21BcnJheShhcnJJdGVtLCBvYmopO1xuXHR9XG5cblx0Ly8gUmVjb3JkIHRoZSByZWZlcmVuY2UgdG8gdGhpcyBvYmplY3QgaW4gb3VyIGluZGV4IHNpemVcblx0dGhpcy5fc2l6ZS0tO1xuXG5cdC8vIE5vdyByZW1vdmUgdGhlIGNyb3NzLXJlZmVyZW5jZSBlbnRyeSBmb3IgdGhpcyBvYmplY3Rcblx0ZGVsZXRlIHRoaXMuX2Nyb3NzUmVmW2lkXTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5fcHVsbEZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIsIG9iaikge1xuXHR2YXIgYXJyQ291bnQgPSBhcnIubGVuZ3RoO1xuXG5cdHdoaWxlIChhcnJDb3VudC0tKSB7XG5cdFx0aWYgKGFyclthcnJDb3VudF0gPT09IG9iaikge1xuXHRcdFx0YXJyLnNwbGljZShhcnJDb3VudCwgMSk7XG5cdFx0fVxuXHR9XG59O1xuXG5JbmRleC5wcm90b3R5cGUucHVzaFRvQ3Jvc3NSZWYgPSBmdW5jdGlvbiAob2JqLCBwYXRoVmFsQXJyKSB7XG5cdHZhciBpZCA9IG9ialt0aGlzLl9jb2xsZWN0aW9uLnByaW1hcnlLZXkoKV0sXG5cdFx0Y3JPYmo7XG5cblx0dGhpcy5fY3Jvc3NSZWZbaWRdID0gdGhpcy5fY3Jvc3NSZWZbaWRdIHx8IFtdO1xuXG5cdC8vIENoZWNrIGlmIHRoZSBjcm9zcy1yZWZlcmVuY2UgdG8gdGhlIHBhdGhWYWwgYXJyYXkgYWxyZWFkeSBleGlzdHNcblx0Y3JPYmogPSB0aGlzLl9jcm9zc1JlZltpZF07XG5cblx0aWYgKGNyT2JqLmluZGV4T2YocGF0aFZhbEFycikgPT09IC0xKSB7XG5cdFx0Ly8gQWRkIHRoZSBjcm9zcy1yZWZlcmVuY2Vcblx0XHRjck9iai5wdXNoKHBhdGhWYWxBcnIpO1xuXHR9XG59O1xuXG5JbmRleC5wcm90b3R5cGUucHVsbEZyb21Dcm9zc1JlZiA9IGZ1bmN0aW9uIChvYmosIHBhdGhWYWxBcnIpIHtcblx0dmFyIGlkID0gb2JqW3RoaXMuX2NvbGxlY3Rpb24ucHJpbWFyeUtleSgpXSxcblx0XHRjck9iajtcblxuXHRkZWxldGUgdGhpcy5fY3Jvc3NSZWZbaWRdO1xufTtcblxuSW5kZXgucHJvdG90eXBlLmxvb2t1cCA9IGZ1bmN0aW9uIChxdWVyeSkge1xuXHRyZXR1cm4gdGhpcy5fZGF0YVt0aGlzLl9pdGVtSGFzaChxdWVyeSwgdGhpcy5fa2V5cyldIHx8IFtdO1xufTtcblxuSW5kZXgucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gKHF1ZXJ5LCBvcHRpb25zKSB7XG5cdC8vIENoZWNrIGlmIHRoZSBwYXNzZWQgcXVlcnkgaGFzIGRhdGEgaW4gdGhlIGtleXMgb3VyIGluZGV4XG5cdC8vIG9wZXJhdGVzIG9uIGFuZCBpZiBzbywgaXMgdGhlIHF1ZXJ5IHNvcnQgbWF0Y2hpbmcgb3VyIG9yZGVyXG5cdHZhciBwYXRoU29sdmVyID0gbmV3IFBhdGgoKTtcblx0cmV0dXJuIHBhdGhTb2x2ZXIuY291bnRPYmplY3RQYXRocyh0aGlzLl9rZXlzLCBxdWVyeSk7XG59O1xuXG5JbmRleC5wcm90b3R5cGUuX2l0ZW1IYXNoID0gZnVuY3Rpb24gKGl0ZW0sIGtleXMpIHtcblx0dmFyIHBhdGggPSBuZXcgUGF0aCgpLFxuXHRcdHBhdGhEYXRhLFxuXHRcdGhhc2ggPSAnJyxcblx0XHRrO1xuXG5cdHBhdGhEYXRhID0gcGF0aC5wYXJzZShrZXlzKTtcblxuXHRmb3IgKGsgPSAwOyBrIDwgcGF0aERhdGEubGVuZ3RoOyBrKyspIHtcblx0XHRpZiAoaGFzaCkgeyBoYXNoICs9ICdfJzsgfVxuXHRcdGhhc2ggKz0gcGF0aC52YWx1ZShpdGVtLCBwYXRoRGF0YVtrXS5wYXRoKS5qb2luKCc6Jyk7XG5cdH1cblxuXHRyZXR1cm4gaGFzaDtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5faXRlbUtleUhhc2ggPSBmdW5jdGlvbiAoaXRlbSwga2V5cykge1xuXHR2YXIgcGF0aCA9IG5ldyBQYXRoKCksXG5cdFx0cGF0aERhdGEsXG5cdFx0aGFzaCA9ICcnLFxuXHRcdGs7XG5cblx0cGF0aERhdGEgPSBwYXRoLnBhcnNlKGtleXMpO1xuXG5cdGZvciAoayA9IDA7IGsgPCBwYXRoRGF0YS5sZW5ndGg7IGsrKykge1xuXHRcdGlmIChoYXNoKSB7IGhhc2ggKz0gJ18nOyB9XG5cdFx0aGFzaCArPSBwYXRoLmtleVZhbHVlKGl0ZW0sIHBhdGhEYXRhW2tdLnBhdGgpO1xuXHR9XG5cblx0cmV0dXJuIGhhc2g7XG59O1xuXG5JbmRleC5wcm90b3R5cGUuX2l0ZW1IYXNoQXJyID0gZnVuY3Rpb24gKGl0ZW0sIGtleXMpIHtcblx0dmFyIHBhdGggPSBuZXcgUGF0aCgpLFxuXHRcdHBhdGhEYXRhLFxuXHRcdGhhc2ggPSAnJyxcblx0XHRoYXNoQXJyID0gW10sXG5cdFx0dmFsQXJyLFxuXHRcdGksIGssIGo7XG5cblx0cGF0aERhdGEgPSBwYXRoLnBhcnNlKGtleXMpO1xuXG5cdGZvciAoayA9IDA7IGsgPCBwYXRoRGF0YS5sZW5ndGg7IGsrKykge1xuXHRcdHZhbEFyciA9IHBhdGgudmFsdWUoaXRlbSwgcGF0aERhdGFba10ucGF0aCk7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgdmFsQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHQvLyBTZXR1cCB0aGUgaW5pdGlhbCBoYXNoIGFycmF5XG5cdFx0XHRcdGhhc2hBcnIucHVzaCh2YWxBcnJbaV0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gTG9vcCB0aGUgaGFzaCBhcnJheSBhbmQgY29uY2F0IHRoZSB2YWx1ZSB0byBpdFxuXHRcdFx0XHRmb3IgKGogPSAwOyBqIDwgaGFzaEFyci5sZW5ndGg7IGorKykge1xuXHRcdFx0XHRcdGhhc2hBcnJbal0gPSBoYXNoQXJyW2pdICsgJ18nICsgdmFsQXJyW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGhhc2hBcnI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGV4OyIsInZhciBTaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpO1xuXG4vKipcbiAqIFRoZSBrZXkgdmFsdWUgc3RvcmUgY2xhc3MgdXNlZCB3aGVuIHN0b3JpbmcgYmFzaWMgaW4tbWVtb3J5IEtWIGRhdGEsXG4gKiBhbmQgY2FuIGJlIHF1ZXJpZWQgZm9yIHF1aWNrIHJldHJpZXZhbC4gTW9zdGx5IHVzZWQgZm9yIGNvbGxlY3Rpb25cbiAqIHByaW1hcnkga2V5IGluZGV4ZXMgYW5kIGxvb2t1cHMuXG4gKiBAcGFyYW0ge1N0cmluZz19IG5hbWUgT3B0aW9uYWwgS1Ygc3RvcmUgbmFtZS5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgS2V5VmFsdWVTdG9yZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHRoaXMuX25hbWUgPSBuYW1lO1xuXHR0aGlzLl9kYXRhID0ge307XG5cdHRoaXMuX3ByaW1hcnlLZXkgPSAnX2lkJztcbn07XG5cblNoYXJlZC5tb2R1bGVzLktleVZhbHVlU3RvcmUgPSBLZXlWYWx1ZVN0b3JlO1xuXG4vKipcbiAqIEdldCAvIHNldCB0aGUgbmFtZSBvZiB0aGUga2V5L3ZhbHVlIHN0b3JlLlxuICogQHBhcmFtIHtTdHJpbmd9IHZhbCBUaGUgbmFtZSB0byBzZXQuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUubmFtZSA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fbmFtZSA9IHZhbDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9uYW1lO1xufTtcblxuLyoqXG4gKiBHZXQgLyBzZXQgdGhlIHByaW1hcnkga2V5LlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBUaGUga2V5IHRvIHNldC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5LZXlWYWx1ZVN0b3JlLnByb3RvdHlwZS5wcmltYXJ5S2V5ID0gZnVuY3Rpb24gKGtleSkge1xuXHRpZiAoa2V5ICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9wcmltYXJ5S2V5ID0ga2V5O1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX3ByaW1hcnlLZXk7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYWxsIGRhdGEgZnJvbSB0aGUgc3RvcmUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUudHJ1bmNhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2RhdGEgPSB7fTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgZGF0YSBhZ2FpbnN0IGEga2V5IGluIHRoZSBzdG9yZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byBzZXQgZGF0YSBmb3IuXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBhc3NpZ24gdG8gdGhlIGtleS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5LZXlWYWx1ZVN0b3JlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuXHR0aGlzLl9kYXRhW2tleV0gPSB2YWx1ZSA/IHZhbHVlIDogdHJ1ZTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgZGF0YSBzdG9yZWQgZm9yIHRoZSBwYXNzZWQga2V5LlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBUaGUga2V5IHRvIGdldCBkYXRhIGZvci5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5LZXlWYWx1ZVN0b3JlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdHJldHVybiB0aGlzLl9kYXRhW2tleV07XG59O1xuXG4vKipcbiAqIEdldCAvIHNldCB0aGUgcHJpbWFyeSBrZXkuXG4gKiBAcGFyYW0geyp9IG9iaiBBIGxvb2t1cCBxdWVyeSwgY2FuIGJlIGEgc3RyaW5nIGtleSwgYW4gYXJyYXkgb2Ygc3RyaW5nIGtleXMsXG4gKiBhbiBvYmplY3Qgd2l0aCBmdXJ0aGVyIHF1ZXJ5IGNsYXVzZXMgb3IgYSByZWd1bGFyIGV4cHJlc3Npb24gdGhhdCBzaG91bGQgYmVcbiAqIHJ1biBhZ2FpbnN0IGFsbCBrZXlzLlxuICogQHJldHVybnMgeyp9XG4gKi9cbktleVZhbHVlU3RvcmUucHJvdG90eXBlLmxvb2t1cCA9IGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIHBLZXlWYWwgPSBvYmpbdGhpcy5fcHJpbWFyeUtleV0sXG5cdFx0YXJySW5kZXgsXG5cdFx0YXJyQ291bnQsXG5cdFx0bG9va3VwSXRlbSxcblx0XHRyZXN1bHQ7XG5cblx0aWYgKHBLZXlWYWwgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdC8vIEFuIGFycmF5IG9mIHByaW1hcnkga2V5cywgZmluZCBhbGwgbWF0Y2hlc1xuXHRcdGFyckNvdW50ID0gcEtleVZhbC5sZW5ndGg7XG5cdFx0cmVzdWx0ID0gW107XG5cblx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdFx0bG9va3VwSXRlbSA9IHRoaXMuX2RhdGFbcEtleVZhbFthcnJJbmRleF1dO1xuXG5cdFx0XHRpZiAobG9va3VwSXRlbSkge1xuXHRcdFx0XHRyZXN1bHQucHVzaChsb29rdXBJdGVtKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9IGVsc2UgaWYgKHBLZXlWYWwgaW5zdGFuY2VvZiBSZWdFeHApIHtcblx0XHQvLyBDcmVhdGUgbmV3IGRhdGFcblx0XHRyZXN1bHQgPSBbXTtcblxuXHRcdGZvciAoYXJySW5kZXggaW4gdGhpcy5fZGF0YSkge1xuXHRcdFx0aWYgKHRoaXMuX2RhdGEuaGFzT3duUHJvcGVydHkoYXJySW5kZXgpKSB7XG5cdFx0XHRcdGlmIChwS2V5VmFsLnRlc3QoYXJySW5kZXgpKSB7XG5cdFx0XHRcdFx0cmVzdWx0LnB1c2godGhpcy5fZGF0YVthcnJJbmRleF0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSBlbHNlIGlmICh0eXBlb2YgcEtleVZhbCA9PT0gJ29iamVjdCcpIHtcblx0XHQvLyBUaGUgcHJpbWFyeSBrZXkgY2xhdXNlIGlzIGFuIG9iamVjdCwgbm93IHdlIGhhdmUgdG8gZG8gc29tZVxuXHRcdC8vIG1vcmUgZXh0ZW5zaXZlIHNlYXJjaGluZ1xuXHRcdGlmIChwS2V5VmFsLiRuZSkge1xuXHRcdFx0Ly8gQ3JlYXRlIG5ldyBkYXRhXG5cdFx0XHRyZXN1bHQgPSBbXTtcblxuXHRcdFx0Zm9yIChhcnJJbmRleCBpbiB0aGlzLl9kYXRhKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9kYXRhLmhhc093blByb3BlcnR5KGFyckluZGV4KSkge1xuXHRcdFx0XHRcdGlmIChhcnJJbmRleCAhPT0gcEtleVZhbC4kbmUpIHtcblx0XHRcdFx0XHRcdHJlc3VsdC5wdXNoKHRoaXMuX2RhdGFbYXJySW5kZXhdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cblx0XHRpZiAocEtleVZhbC4kaW4gJiYgKHBLZXlWYWwuJGluIGluc3RhbmNlb2YgQXJyYXkpKSB7XG5cdFx0XHQvLyBDcmVhdGUgbmV3IGRhdGFcblx0XHRcdHJlc3VsdCA9IFtdO1xuXG5cdFx0XHRmb3IgKGFyckluZGV4IGluIHRoaXMuX2RhdGEpIHtcblx0XHRcdFx0aWYgKHRoaXMuX2RhdGEuaGFzT3duUHJvcGVydHkoYXJySW5kZXgpKSB7XG5cdFx0XHRcdFx0aWYgKHBLZXlWYWwuJGluLmluZGV4T2YoYXJySW5kZXgpID4gLTEpIHtcblx0XHRcdFx0XHRcdHJlc3VsdC5wdXNoKHRoaXMuX2RhdGFbYXJySW5kZXhdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cblx0XHRpZiAocEtleVZhbC4kbmluICYmIChwS2V5VmFsLiRuaW4gaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdC8vIENyZWF0ZSBuZXcgZGF0YVxuXHRcdFx0cmVzdWx0ID0gW107XG5cblx0XHRcdGZvciAoYXJySW5kZXggaW4gdGhpcy5fZGF0YSkge1xuXHRcdFx0XHRpZiAodGhpcy5fZGF0YS5oYXNPd25Qcm9wZXJ0eShhcnJJbmRleCkpIHtcblx0XHRcdFx0XHRpZiAocEtleVZhbC4kbmluLmluZGV4T2YoYXJySW5kZXgpID09PSAtMSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0LnB1c2godGhpcy5fZGF0YVthcnJJbmRleF0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblxuXHRcdGlmIChwS2V5VmFsLiRvciAmJiAocEtleVZhbC4kb3IgaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdC8vIENyZWF0ZSBuZXcgZGF0YVxuXHRcdFx0cmVzdWx0ID0gW107XG5cblx0XHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IHBLZXlWYWwuJG9yLmxlbmd0aDsgYXJySW5kZXgrKykge1xuXHRcdFx0XHRyZXN1bHQgPSByZXN1bHQuY29uY2F0KHRoaXMubG9va3VwKHBLZXlWYWwuJG9yW2FyckluZGV4XSkpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQvLyBLZXkgaXMgYSBiYXNpYyBsb29rdXAgZnJvbSBzdHJpbmdcblx0XHRsb29rdXBJdGVtID0gdGhpcy5fZGF0YVtwS2V5VmFsXTtcblxuXHRcdGlmIChsb29rdXBJdGVtICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiBbbG9va3VwSXRlbV07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBbXTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlcyBkYXRhIGZvciB0aGUgZ2l2ZW4ga2V5IGZyb20gdGhlIHN0b3JlLlxuICogQHBhcmFtIHtTdHJpbmd9IGtleSBUaGUga2V5IHRvIHVuLXNldC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5LZXlWYWx1ZVN0b3JlLnByb3RvdHlwZS51blNldCA9IGZ1bmN0aW9uIChrZXkpIHtcblx0ZGVsZXRlIHRoaXMuX2RhdGFba2V5XTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldHMgZGF0YSBmb3IgdGhlIGdpdmUga2V5IGluIHRoZSBzdG9yZSBvbmx5IHdoZXJlIHRoZSBnaXZlbiBrZXlcbiAqIGRvZXMgbm90IGFscmVhZHkgaGF2ZSBhIHZhbHVlIGluIHRoZSBzdG9yZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byBzZXQgZGF0YSBmb3IuXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBhc3NpZ24gdG8gdGhlIGtleS5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIGRhdGEgd2FzIHNldCBvciBmYWxzZSBpZiBkYXRhIGFscmVhZHlcbiAqIGV4aXN0cyBmb3IgdGhlIGtleS5cbiAqL1xuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUudW5pcXVlU2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0aWYgKHRoaXMuX2RhdGFba2V5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fZGF0YVtrZXldID0gdmFsdWU7XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEtleVZhbHVlU3RvcmU7IiwidmFyIFNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyksXG5cdE9wZXJhdGlvbiA9IHJlcXVpcmUoJy4vT3BlcmF0aW9uJyk7XG5cbi8qKlxuICogVGhlIG1ldHJpY3MgY2xhc3MgdXNlZCB0byBzdG9yZSBkZXRhaWxzIGFib3V0IG9wZXJhdGlvbnMuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIE1ldHJpY3MgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuTWV0cmljcy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fZGF0YSA9IFtdO1xufTtcblxuU2hhcmVkLm1vZHVsZXMuTWV0cmljcyA9IE1ldHJpY3M7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBvcGVyYXRpb24gd2l0aGluIHRoZSBtZXRyaWNzIGluc3RhbmNlIGFuZCBpZiBtZXRyaWNzXG4gKiBhcmUgY3VycmVudGx5IGVuYWJsZWQgKGJ5IGNhbGxpbmcgdGhlIHN0YXJ0KCkgbWV0aG9kKSB0aGUgb3BlcmF0aW9uXG4gKiBpcyBhbHNvIHN0b3JlZCBpbiB0aGUgbWV0cmljcyBsb2cuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgb3BlcmF0aW9uLlxuICogQHJldHVybnMge09wZXJhdGlvbn1cbiAqL1xuTWV0cmljcy5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0dmFyIG9wID0gbmV3IE9wZXJhdGlvbihuYW1lKTtcblxuXHRpZiAodGhpcy5fZW5hYmxlZCkge1xuXHRcdHRoaXMuX2RhdGEucHVzaChvcCk7XG5cdH1cblxuXHRyZXR1cm4gb3A7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyBsb2dnaW5nIG9wZXJhdGlvbnMuXG4gKiBAcmV0dXJucyB7TWV0cmljc31cbiAqL1xuTWV0cmljcy5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3RvcHMgbG9nZ2luZyBvcGVyYXRpb25zLlxuICogQHJldHVybnMge01ldHJpY3N9XG4gKi9cbk1ldHJpY3MucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENsZWFycyBhbGwgbG9nZ2VkIG9wZXJhdGlvbnMuXG4gKiBAcmV0dXJucyB7TWV0cmljc31cbiAqL1xuTWV0cmljcy5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2RhdGEgPSBbXTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgYWxsIGxvZ2dlZCBvcGVyYXRpb25zLlxuICogQHJldHVybnMge0FycmF5fVxuICovXG5NZXRyaWNzLnByb3RvdHlwZS5saXN0ID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5fZGF0YTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWV0cmljczsiLCIvLyBHcmFiIHRoZSB2aWV3IGNsYXNzXG52YXIgU2hhcmVkLFxuXHRDb3JlLFxuXHRPbGRWaWV3LFxuXHRPbGRWaWV3SW5pdDtcblxuU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKTtcbkNvcmUgPSBTaGFyZWQubW9kdWxlcy5Db3JlO1xuT2xkVmlldyA9IFNoYXJlZC5tb2R1bGVzLk9sZFZpZXc7XG5PbGRWaWV3SW5pdCA9IE9sZFZpZXcucHJvdG90eXBlLmluaXQ7XG5cbk9sZFZpZXcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHR0aGlzLl9iaW5kcyA9IFtdO1xuXHR0aGlzLl9yZW5kZXJTdGFydCA9IDA7XG5cdHRoaXMuX3JlbmRlckVuZCA9IDA7XG5cblx0dGhpcy5fZGVmZXJRdWV1ZSA9IHtcblx0XHRpbnNlcnQ6IFtdLFxuXHRcdHVwZGF0ZTogW10sXG5cdFx0cmVtb3ZlOiBbXSxcblx0XHR1cHNlcnQ6IFtdLFxuXHRcdF9iaW5kSW5zZXJ0OiBbXSxcblx0XHRfYmluZFVwZGF0ZTogW10sXG5cdFx0X2JpbmRSZW1vdmU6IFtdLFxuXHRcdF9iaW5kVXBzZXJ0OiBbXVxuXHR9O1xuXG5cdHRoaXMuX2RlZmVyVGhyZXNob2xkID0ge1xuXHRcdGluc2VydDogMTAwLFxuXHRcdHVwZGF0ZTogMTAwLFxuXHRcdHJlbW92ZTogMTAwLFxuXHRcdHVwc2VydDogMTAwLFxuXHRcdF9iaW5kSW5zZXJ0OiAxMDAsXG5cdFx0X2JpbmRVcGRhdGU6IDEwMCxcblx0XHRfYmluZFJlbW92ZTogMTAwLFxuXHRcdF9iaW5kVXBzZXJ0OiAxMDBcblx0fTtcblxuXHR0aGlzLl9kZWZlclRpbWUgPSB7XG5cdFx0aW5zZXJ0OiAxMDAsXG5cdFx0dXBkYXRlOiAxLFxuXHRcdHJlbW92ZTogMSxcblx0XHR1cHNlcnQ6IDEsXG5cdFx0X2JpbmRJbnNlcnQ6IDEwMCxcblx0XHRfYmluZFVwZGF0ZTogMSxcblx0XHRfYmluZFJlbW92ZTogMSxcblx0XHRfYmluZFVwc2VydDogMVxuXHR9O1xuXG5cdE9sZFZpZXdJbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cblx0Ly8gSG9vayB2aWV3IGV2ZW50cyB0byB1cGRhdGUgYmluZHNcblx0dGhpcy5vbignaW5zZXJ0JywgZnVuY3Rpb24gKHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0XHRzZWxmLl9iaW5kRXZlbnQoJ2luc2VydCcsIHN1Y2Nlc3NBcnIsIGZhaWxBcnIpO1xuXHR9KTtcblxuXHR0aGlzLm9uKCd1cGRhdGUnLCBmdW5jdGlvbiAoc3VjY2Vzc0FyciwgZmFpbEFycikge1xuXHRcdHNlbGYuX2JpbmRFdmVudCgndXBkYXRlJywgc3VjY2Vzc0FyciwgZmFpbEFycik7XG5cdH0pO1xuXG5cdHRoaXMub24oJ3JlbW92ZScsIGZ1bmN0aW9uIChzdWNjZXNzQXJyLCBmYWlsQXJyKSB7XG5cdFx0c2VsZi5fYmluZEV2ZW50KCdyZW1vdmUnLCBzdWNjZXNzQXJyLCBmYWlsQXJyKTtcblx0fSk7XG5cblx0dGhpcy5vbignY2hhbmdlJywgc2VsZi5fYmluZENoYW5nZSk7XG59O1xuXG4vKipcbiAqIEJpbmRzIGEgc2VsZWN0b3IgdG8gdGhlIGluc2VydCwgdXBkYXRlIGFuZCBkZWxldGUgZXZlbnRzIG9mIGEgcGFydGljdWxhclxuICogdmlldyBhbmQga2VlcHMgdGhlIHNlbGVjdG9yIGluIHN5bmMgc28gdGhhdCB1cGRhdGVzIGFyZSByZWZsZWN0ZWQgb24gdGhlXG4gKiB3ZWIgcGFnZSBpbiByZWFsLXRpbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIFRoZSBqUXVlcnkgc2VsZWN0b3Igc3RyaW5nIHRvIGdldCB0YXJnZXQgZWxlbWVudHMuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIG9wdGlvbnMpIHtcblx0aWYgKG9wdGlvbnMgJiYgb3B0aW9ucy50ZW1wbGF0ZSkge1xuXHRcdHRoaXMuX2JpbmRzW3NlbGVjdG9yXSA9IG9wdGlvbnM7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3coJ0Nhbm5vdCBiaW5kIGRhdGEgdG8gZWxlbWVudCwgbWlzc2luZyBvcHRpb25zIGluZm9ybWF0aW9uIScpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFVuLWJpbmRzIGEgc2VsZWN0b3IgZnJvbSB0aGUgdmlldyBjaGFuZ2VzLlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIFRoZSBqUXVlcnkgc2VsZWN0b3Igc3RyaW5nIHRvIGlkZW50aWZ5IHRoZSBiaW5kIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS51bkJpbmQgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0ZGVsZXRlIHRoaXMuX2JpbmRzW3NlbGVjdG9yXTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgc2VsZWN0b3IgaXMgYm91bmQgdG8gdGhlIHZpZXcuXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3IgVGhlIGpRdWVyeSBzZWxlY3RvciBzdHJpbmcgdG8gaWRlbnRpZnkgdGhlIGJpbmQgdG8gY2hlY2sgZm9yLlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLmlzQm91bmQgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0cmV0dXJuIEJvb2xlYW4odGhpcy5fYmluZHNbc2VsZWN0b3JdKTtcbn07XG5cbi8qKlxuICogU29ydHMgaXRlbXMgaW4gdGhlIERPTSBiYXNlZCBvbiB0aGUgYmluZCBzZXR0aW5ncyBhbmQgdGhlIHBhc3NlZCBpdGVtIGFycmF5LlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIFRoZSBqUXVlcnkgc2VsZWN0b3Igb2YgdGhlIGJpbmQgY29udGFpbmVyLlxuICogQHBhcmFtIHtBcnJheX0gaXRlbUFyciBUaGUgYXJyYXkgb2YgaXRlbXMgdXNlZCB0byBkZXRlcm1pbmUgdGhlIG9yZGVyIHRoZSBET01cbiAqIGVsZW1lbnRzIHNob3VsZCBiZSBpbiBiYXNlZCBvbiB0aGUgb3JkZXIgdGhleSBhcmUgaW4sIGluIHRoZSBhcnJheS5cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUuYmluZFNvcnREb20gPSBmdW5jdGlvbiAoc2VsZWN0b3IsIGl0ZW1BcnIpIHtcblx0dmFyIGNvbnRhaW5lciA9ICQoc2VsZWN0b3IpLFxuXHRcdGFyckluZGV4LFxuXHRcdGFyckl0ZW0sXG5cdFx0ZG9tSXRlbTtcblxuXHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3LkJpbmQ6IFNvcnRpbmcgZGF0YSBpbiBET00uLi4nLCBpdGVtQXJyKTtcblx0fVxuXG5cdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGl0ZW1BcnIubGVuZ3RoOyBhcnJJbmRleCsrKSB7XG5cdFx0YXJySXRlbSA9IGl0ZW1BcnJbYXJySW5kZXhdO1xuXG5cdFx0Ly8gTm93IHdlJ3ZlIGRvbmUgb3VyIGluc2VydHMgaW50byB0aGUgRE9NLCBsZXQncyBlbnN1cmVcblx0XHQvLyB0aGV5IGFyZSBzdGlsbCBvcmRlcmVkIGNvcnJlY3RseVxuXHRcdGRvbUl0ZW0gPSBjb250YWluZXIuZmluZCgnIycgKyBhcnJJdGVtW3RoaXMuX3ByaW1hcnlLZXldKTtcblxuXHRcdGlmIChkb21JdGVtLmxlbmd0aCkge1xuXHRcdFx0aWYgKGFyckluZGV4ID09PSAwKSB7XG5cdFx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXcuQmluZDogU29ydCwgbW92aW5nIHRvIGluZGV4IDAuLi4nLCBkb21JdGVtKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb250YWluZXIucHJlcGVuZChkb21JdGVtKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXcuQmluZDogU29ydCwgbW92aW5nIHRvIGluZGV4ICcgKyBhcnJJbmRleCArICcuLi4nLCBkb21JdGVtKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRkb21JdGVtLmluc2VydEFmdGVyKGNvbnRhaW5lci5jaGlsZHJlbignOmVxKCcgKyAoYXJySW5kZXggLSAxKSArICcpJykpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldy5CaW5kOiBXYXJuaW5nLCBlbGVtZW50IGZvciBhcnJheSBpdGVtIG5vdCBmb3VuZCEnLCBhcnJJdGVtKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLmJpbmRSZWZyZXNoID0gZnVuY3Rpb24gKG9iaikge1xuXHR2YXIgYmluZHMgPSB0aGlzLl9iaW5kcyxcblx0XHRiaW5kS2V5LFxuXHRcdGJpbmQ7XG5cblx0aWYgKCFvYmopIHtcblx0XHQvLyBHcmFiIGN1cnJlbnQgZGF0YVxuXHRcdG9iaiA9IHtcblx0XHRcdGRhdGE6IHRoaXMuZmluZCgpXG5cdFx0fTtcblx0fVxuXG5cdGZvciAoYmluZEtleSBpbiBiaW5kcykge1xuXHRcdGlmIChiaW5kcy5oYXNPd25Qcm9wZXJ0eShiaW5kS2V5KSkge1xuXHRcdFx0YmluZCA9IGJpbmRzW2JpbmRLZXldO1xuXG5cdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7IGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldy5CaW5kOiBTb3J0aW5nIERPTS4uLicpOyB9XG5cdFx0XHR0aGlzLmJpbmRTb3J0RG9tKGJpbmRLZXksIG9iai5kYXRhKTtcblxuXHRcdFx0aWYgKGJpbmQuYWZ0ZXJPcGVyYXRpb24pIHtcblx0XHRcdFx0YmluZC5hZnRlck9wZXJhdGlvbigpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYmluZC5yZWZyZXNoKSB7XG5cdFx0XHRcdGJpbmQucmVmcmVzaCgpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBSZW5kZXJzIGEgYmluZCB2aWV3IGRhdGEgdG8gdGhlIERPTS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBiaW5kU2VsZWN0b3IgVGhlIGpRdWVyeSBzZWxlY3RvciBzdHJpbmcgdG8gdXNlIHRvIGlkZW50aWZ5XG4gKiB0aGUgYmluZCB0YXJnZXQuIE11c3QgbWF0Y2ggdGhlIHNlbGVjdG9yIHVzZWQgd2hlbiBkZWZpbmluZyB0aGUgb3JpZ2luYWwgYmluZC5cbiAqIEBwYXJhbSB7RnVuY3Rpb249fSBkb21IYW5kbGVyIElmIHNwZWNpZmllZCwgdGhpcyBoYW5kbGVyIG1ldGhvZCB3aWxsIGJlIGNhbGxlZFxuICogd2l0aCB0aGUgZmluYWwgSFRNTCBmb3IgdGhlIHZpZXcgaW5zdGVhZCBvZiB0aGUgREIgaGFuZGxpbmcgdGhlIERPTSBpbnNlcnRpb24uXG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLmJpbmRSZW5kZXIgPSBmdW5jdGlvbiAoYmluZFNlbGVjdG9yLCBkb21IYW5kbGVyKSB7XG5cdC8vIENoZWNrIHRoZSBiaW5kIGV4aXN0c1xuXHR2YXIgYmluZCA9IHRoaXMuX2JpbmRzW2JpbmRTZWxlY3Rvcl0sXG5cdFx0ZG9tVGFyZ2V0ID0gJChiaW5kU2VsZWN0b3IpLFxuXHRcdGFsbERhdGEsXG5cdFx0ZGF0YUl0ZW0sXG5cdFx0aXRlbUh0bWwsXG5cdFx0ZmluYWxIdG1sID0gJCgnPHVsPjwvdWw+JyksXG5cdFx0aTtcblxuXHRpZiAoYmluZCkge1xuXHRcdGFsbERhdGEgPSB0aGlzLl9kYXRhLmZpbmQoKTtcblxuXHRcdC8vIExvb3AgYWxsIGl0ZW1zIGFuZCBhZGQgdGhlbSB0byB0aGUgc2NyZWVuXG5cdFx0Zm9yIChpID0gMDsgaSA8IGFsbERhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdGRhdGFJdGVtID0gYWxsRGF0YVtpXTtcblxuXHRcdFx0aXRlbUh0bWwgPSBiaW5kLnRlbXBsYXRlKGRhdGFJdGVtLCBmdW5jdGlvbiAoaXRlbUh0bWwpIHtcblx0XHRcdFx0ZmluYWxIdG1sLmFwcGVuZChpdGVtSHRtbCk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAoIWRvbUhhbmRsZXIpIHtcblx0XHRcdGRvbVRhcmdldC5hcHBlbmQoZmluYWxIdG1sLmh0bWwoKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRvbUhhbmRsZXIoYmluZFNlbGVjdG9yLCBmaW5hbEh0bWwuaHRtbCgpKTtcblx0XHR9XG5cdH1cbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLnByb2Nlc3NRdWV1ZSA9IGZ1bmN0aW9uICh0eXBlLCBjYWxsYmFjaykge1xuXHR2YXIgcXVldWUgPSB0aGlzLl9kZWZlclF1ZXVlW3R5cGVdLFxuXHRcdGRlZmVyVGhyZXNob2xkID0gdGhpcy5fZGVmZXJUaHJlc2hvbGRbdHlwZV0sXG5cdFx0ZGVmZXJUaW1lID0gdGhpcy5fZGVmZXJUaW1lW3R5cGVdO1xuXG5cdGlmIChxdWV1ZS5sZW5ndGgpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRkYXRhQXJyO1xuXG5cdFx0Ly8gUHJvY2VzcyBpdGVtcyB1cCB0byB0aGUgdGhyZXNob2xkXG5cdFx0aWYgKHF1ZXVlLmxlbmd0aCkge1xuXHRcdFx0aWYgKHF1ZXVlLmxlbmd0aCA+IGRlZmVyVGhyZXNob2xkKSB7XG5cdFx0XHRcdC8vIEdyYWIgaXRlbXMgdXAgdG8gdGhlIHRocmVzaG9sZCB2YWx1ZVxuXHRcdFx0XHRkYXRhQXJyID0gcXVldWUuc3BsaWNlKDAsIGRlZmVyVGhyZXNob2xkKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIEdyYWIgYWxsIHRoZSByZW1haW5pbmcgaXRlbXNcblx0XHRcdFx0ZGF0YUFyciA9IHF1ZXVlLnNwbGljZSgwLCBxdWV1ZS5sZW5ndGgpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9iaW5kRXZlbnQodHlwZSwgZGF0YUFyciwgW10pO1xuXHRcdH1cblxuXHRcdC8vIFF1ZXVlIGFub3RoZXIgcHJvY2Vzc1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuXHRcdFx0c2VsZi5wcm9jZXNzUXVldWUodHlwZSwgY2FsbGJhY2spO1xuXHRcdH0sIGRlZmVyVGltZSk7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCk7IH1cblx0XHR0aGlzLmVtaXQoJ2JpbmRRdWV1ZUNvbXBsZXRlJyk7XG5cdH1cbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9iaW5kRXZlbnQgPSBmdW5jdGlvbiAodHlwZSwgc3VjY2Vzc0FyciwgZmFpbEFycikge1xuXHR2YXIgcXVldWUgPSB0aGlzLl9kZWZlclF1ZXVlW3R5cGVdLFxuXHRcdGRlZmVyVGhyZXNob2xkID0gdGhpcy5fZGVmZXJUaHJlc2hvbGRbdHlwZV0sXG5cdFx0ZGVmZXJUaW1lID0gdGhpcy5fZGVmZXJUaW1lW3R5cGVdO1xuXG5cdHZhciBiaW5kcyA9IHRoaXMuX2JpbmRzLFxuXHRcdHVuZmlsdGVyZWREYXRhU2V0ID0gdGhpcy5maW5kKHt9KSxcblx0XHRmaWx0ZXJlZERhdGFTZXQsXG5cdFx0YmluZEtleTtcblxuXHQvLyBDaGVjayBpZiB0aGUgbnVtYmVyIG9mIGluc2VydHMgaXMgZ3JlYXRlciB0aGFuIHRoZSBkZWZlciB0aHJlc2hvbGRcblx0LyppZiAoc3VjY2Vzc0FyciAmJiBzdWNjZXNzQXJyLmxlbmd0aCA+IGRlZmVyVGhyZXNob2xkKSB7XG5cdCAvLyBCcmVhayB1cCB1cHNlcnQgaW50byBibG9ja3Ncblx0IHRoaXMuX2RlZmVyUXVldWVbdHlwZV0gPSBxdWV1ZS5jb25jYXQoc3VjY2Vzc0Fycik7XG5cblx0IC8vIEZpcmUgb2ZmIHRoZSBpbnNlcnQgcXVldWUgaGFuZGxlclxuXHQgdGhpcy5wcm9jZXNzUXVldWUodHlwZSk7XG5cblx0IHJldHVybjtcblx0IH0gZWxzZSB7Ki9cblx0Zm9yIChiaW5kS2V5IGluIGJpbmRzKSB7XG5cdFx0aWYgKGJpbmRzLmhhc093blByb3BlcnR5KGJpbmRLZXkpKSB7XG5cdFx0XHRpZiAoYmluZHNbYmluZEtleV0ucmVkdWNlKSB7XG5cdFx0XHRcdGZpbHRlcmVkRGF0YVNldCA9IHRoaXMuZmluZChiaW5kc1tiaW5kS2V5XS5yZWR1Y2UucXVlcnksIGJpbmRzW2JpbmRLZXldLnJlZHVjZS5vcHRpb25zKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZpbHRlcmVkRGF0YVNldCA9IHVuZmlsdGVyZWREYXRhU2V0O1xuXHRcdFx0fVxuXG5cdFx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdFx0Y2FzZSAnaW5zZXJ0Jzpcblx0XHRcdFx0XHR0aGlzLl9iaW5kSW5zZXJ0KGJpbmRLZXksIGJpbmRzW2JpbmRLZXldLCBzdWNjZXNzQXJyLCBmYWlsQXJyLCBmaWx0ZXJlZERhdGFTZXQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdGNhc2UgJ3VwZGF0ZSc6XG5cdFx0XHRcdFx0dGhpcy5fYmluZFVwZGF0ZShiaW5kS2V5LCBiaW5kc1tiaW5kS2V5XSwgc3VjY2Vzc0FyciwgZmFpbEFyciwgZmlsdGVyZWREYXRhU2V0KTtcblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlICdyZW1vdmUnOlxuXHRcdFx0XHRcdHRoaXMuX2JpbmRSZW1vdmUoYmluZEtleSwgYmluZHNbYmluZEtleV0sIHN1Y2Nlc3NBcnIsIGZhaWxBcnIsIGZpbHRlcmVkRGF0YVNldCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdC8vfVxufTtcblxuT2xkVmlldy5wcm90b3R5cGUuX2JpbmRDaGFuZ2UgPSBmdW5jdGlvbiAobmV3RGF0YUFycikge1xuXHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3LkJpbmQ6IEJpbmQgZGF0YSBjaGFuZ2UsIHJlZnJlc2hpbmcgYmluZC4uLicsIG5ld0RhdGFBcnIpO1xuXHR9XG5cblx0dGhpcy5iaW5kUmVmcmVzaChuZXdEYXRhQXJyKTtcbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9iaW5kSW5zZXJ0ID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBvcHRpb25zLCBzdWNjZXNzQXJyLCBmYWlsQXJyLCBhbGwpIHtcblx0dmFyIGNvbnRhaW5lciA9ICQoc2VsZWN0b3IpLFxuXHRcdGl0ZW1FbGVtLFxuXHRcdGl0ZW1IdG1sLFxuXHRcdGk7XG5cblx0Ly8gTG9vcCB0aGUgaW5zZXJ0ZWQgaXRlbXNcblx0Zm9yIChpID0gMDsgaSA8IHN1Y2Nlc3NBcnIubGVuZ3RoOyBpKyspIHtcblx0XHQvLyBDaGVjayBmb3IgZXhpc3RpbmcgaXRlbSBpbiB0aGUgY29udGFpbmVyXG5cdFx0aXRlbUVsZW0gPSBjb250YWluZXIuZmluZCgnIycgKyBzdWNjZXNzQXJyW2ldW3RoaXMuX3ByaW1hcnlLZXldKTtcblxuXHRcdGlmICghaXRlbUVsZW0ubGVuZ3RoKSB7XG5cdFx0XHRpdGVtSHRtbCA9IG9wdGlvbnMudGVtcGxhdGUoc3VjY2Vzc0FycltpXSwgZnVuY3Rpb24gKGl0ZW1FbGVtLCBpbnNlcnRlZEl0ZW0sIGZhaWxBcnIsIGFsbCkgeyByZXR1cm4gZnVuY3Rpb24gKGl0ZW1IdG1sKSB7XG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoZXJlIGlzIGN1c3RvbSBET00gaW5zZXJ0IG1ldGhvZFxuXHRcdFx0XHRpZiAob3B0aW9ucy5pbnNlcnQpIHtcblx0XHRcdFx0XHRvcHRpb25zLmluc2VydChpdGVtSHRtbCwgaW5zZXJ0ZWRJdGVtLCBmYWlsQXJyLCBhbGwpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIEhhbmRsZSB0aGUgaW5zZXJ0IGF1dG9tYXRpY2FsbHlcblx0XHRcdFx0XHQvLyBBZGQgdGhlIGl0ZW0gdG8gdGhlIGNvbnRhaW5lclxuXHRcdFx0XHRcdGlmIChvcHRpb25zLnByZXBlbmRJbnNlcnQpIHtcblx0XHRcdFx0XHRcdGNvbnRhaW5lci5wcmVwZW5kKGl0ZW1IdG1sKTtcblxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjb250YWluZXIuYXBwZW5kKGl0ZW1IdG1sKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAob3B0aW9ucy5hZnRlckluc2VydCkge1xuXHRcdFx0XHRcdG9wdGlvbnMuYWZ0ZXJJbnNlcnQoaXRlbUh0bWwsIGluc2VydGVkSXRlbSwgZmFpbEFyciwgYWxsKTtcblx0XHRcdFx0fVxuXHRcdFx0fX0oaXRlbUVsZW0sIHN1Y2Nlc3NBcnJbaV0sIGZhaWxBcnIsIGFsbCkpO1xuXHRcdH1cblx0fVxufTtcblxuT2xkVmlldy5wcm90b3R5cGUuX2JpbmRVcGRhdGUgPSBmdW5jdGlvbiAoc2VsZWN0b3IsIG9wdGlvbnMsIHN1Y2Nlc3NBcnIsIGZhaWxBcnIsIGFsbCkge1xuXHR2YXIgY29udGFpbmVyID0gJChzZWxlY3RvciksXG5cdFx0aXRlbUVsZW0sXG5cdFx0aTtcblxuXHQvLyBMb29wIHRoZSB1cGRhdGVkIGl0ZW1zXG5cdGZvciAoaSA9IDA7IGkgPCBzdWNjZXNzQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0Ly8gQ2hlY2sgZm9yIGV4aXN0aW5nIGl0ZW0gaW4gdGhlIGNvbnRhaW5lclxuXHRcdGl0ZW1FbGVtID0gY29udGFpbmVyLmZpbmQoJyMnICsgc3VjY2Vzc0FycltpXVt0aGlzLl9wcmltYXJ5S2V5XSk7XG5cblx0XHRvcHRpb25zLnRlbXBsYXRlKHN1Y2Nlc3NBcnJbaV0sIGZ1bmN0aW9uIChpdGVtRWxlbSwgaXRlbURhdGEpIHsgcmV0dXJuIGZ1bmN0aW9uIChpdGVtSHRtbCkge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlcmUgaXMgY3VzdG9tIERPTSBpbnNlcnQgbWV0aG9kXG5cdFx0XHRpZiAob3B0aW9ucy51cGRhdGUpIHtcblx0XHRcdFx0b3B0aW9ucy51cGRhdGUoaXRlbUh0bWwsIGl0ZW1EYXRhLCBhbGwsIGl0ZW1FbGVtLmxlbmd0aCA/ICd1cGRhdGUnIDogJ2FwcGVuZCcpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKGl0ZW1FbGVtLmxlbmd0aCkge1xuXHRcdFx0XHRcdC8vIEFuIGV4aXN0aW5nIGl0ZW0gaXMgaW4gdGhlIGNvbnRhaW5lciwgcmVwbGFjZSBpdCB3aXRoIHRoZVxuXHRcdFx0XHRcdC8vIG5ldyByZW5kZXJlZCBpdGVtIGZyb20gdGhlIHVwZGF0ZWQgZGF0YVxuXHRcdFx0XHRcdGl0ZW1FbGVtLnJlcGxhY2VXaXRoKGl0ZW1IdG1sKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBUaGUgaXRlbSBlbGVtZW50IGRvZXMgbm90IGFscmVhZHkgZXhpc3QsIGFwcGVuZCBpdFxuXHRcdFx0XHRcdGlmIChvcHRpb25zLnByZXBlbmRVcGRhdGUpIHtcblx0XHRcdFx0XHRcdGNvbnRhaW5lci5wcmVwZW5kKGl0ZW1IdG1sKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29udGFpbmVyLmFwcGVuZChpdGVtSHRtbCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChvcHRpb25zLmFmdGVyVXBkYXRlKSB7XG5cdFx0XHRcdG9wdGlvbnMuYWZ0ZXJVcGRhdGUoaXRlbUh0bWwsIGl0ZW1EYXRhLCBhbGwpO1xuXHRcdFx0fVxuXHRcdH19KGl0ZW1FbGVtLCBzdWNjZXNzQXJyW2ldKSk7XG5cdH1cbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9iaW5kUmVtb3ZlID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBvcHRpb25zLCBzdWNjZXNzQXJyLCBmYWlsQXJyLCBhbGwpIHtcblx0dmFyIGNvbnRhaW5lciA9ICQoc2VsZWN0b3IpLFxuXHRcdGl0ZW1FbGVtLFxuXHRcdGk7XG5cblx0Ly8gTG9vcCB0aGUgcmVtb3ZlZCBpdGVtc1xuXHRmb3IgKGkgPSAwOyBpIDwgc3VjY2Vzc0Fyci5sZW5ndGg7IGkrKykge1xuXHRcdC8vIENoZWNrIGZvciBleGlzdGluZyBpdGVtIGluIHRoZSBjb250YWluZXJcblx0XHRpdGVtRWxlbSA9IGNvbnRhaW5lci5maW5kKCcjJyArIHN1Y2Nlc3NBcnJbaV1bdGhpcy5fcHJpbWFyeUtleV0pO1xuXG5cdFx0aWYgKGl0ZW1FbGVtLmxlbmd0aCkge1xuXHRcdFx0aWYgKG9wdGlvbnMuYmVmb3JlUmVtb3ZlKSB7XG5cdFx0XHRcdG9wdGlvbnMuYmVmb3JlUmVtb3ZlKGl0ZW1FbGVtLCBzdWNjZXNzQXJyW2ldLCBhbGwsIGZ1bmN0aW9uIChpdGVtRWxlbSwgZGF0YSwgYWxsKSB7IHJldHVybiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0aWYgKG9wdGlvbnMucmVtb3ZlKSB7XG5cdFx0XHRcdFx0XHRvcHRpb25zLnJlbW92ZShpdGVtRWxlbSwgZGF0YSwgYWxsKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0aXRlbUVsZW0ucmVtb3ZlKCk7XG5cblx0XHRcdFx0XHRcdGlmIChvcHRpb25zLmFmdGVyUmVtb3ZlKSB7XG5cdFx0XHRcdFx0XHRcdG9wdGlvbnMuYWZ0ZXJSZW1vdmUoaXRlbUVsZW0sIGRhdGEsIGFsbCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9fShpdGVtRWxlbSwgc3VjY2Vzc0FycltpXSwgYWxsKSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAob3B0aW9ucy5yZW1vdmUpIHtcblx0XHRcdFx0XHRvcHRpb25zLnJlbW92ZShpdGVtRWxlbSwgc3VjY2Vzc0FycltpXSwgYWxsKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpdGVtRWxlbS5yZW1vdmUoKTtcblxuXHRcdFx0XHRcdGlmIChvcHRpb25zLmFmdGVyUmVtb3ZlKSB7XG5cdFx0XHRcdFx0XHRvcHRpb25zLmFmdGVyUmVtb3ZlKGl0ZW1FbGVtLCBzdWNjZXNzQXJyW2ldLCBhbGwpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTsiLCIvLyBJbXBvcnQgZXh0ZXJuYWwgbmFtZXMgbG9jYWxseVxudmFyIFNoYXJlZCxcblx0Q29yZSxcblx0Q29sbGVjdGlvbkdyb3VwLFxuXHRDb2xsZWN0aW9uLFxuXHRDb2xsZWN0aW9uSW5pdCxcblx0Q29sbGVjdGlvbkdyb3VwSW5pdCxcblx0Q29yZUluaXQsXG5cdE92ZXJsb2FkO1xuXG5TaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpO1xuXG4vKipcbiAqIFRoZSB2aWV3IGNvbnN0cnVjdG9yLlxuICogQHBhcmFtIHZpZXdOYW1lXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIE9sZFZpZXcgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuT2xkVmlldy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICh2aWV3TmFtZSkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0dGhpcy5fbmFtZSA9IHZpZXdOYW1lO1xuXHR0aGlzLl9ncm91cHMgPSBbXTtcblx0dGhpcy5fbGlzdGVuZXJzID0ge307XG5cdHRoaXMuX3F1ZXJ5ID0ge1xuXHRcdHF1ZXJ5OiB7fSxcblx0XHRvcHRpb25zOiB7fVxuXHR9O1xuXG5cdC8vIFJlZ2lzdGVyIGxpc3RlbmVycyBmb3IgdGhlIENSVUQgZXZlbnRzXG5cdHRoaXMuX29uRnJvbVNldERhdGEgPSBmdW5jdGlvbiAoKSB7XG5cdFx0c2VsZi5fb25TZXREYXRhLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0dGhpcy5fb25Gcm9tSW5zZXJ0ID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uSW5zZXJ0LmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0dGhpcy5fb25Gcm9tVXBkYXRlID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uVXBkYXRlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0dGhpcy5fb25Gcm9tUmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uUmVtb3ZlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG5cblx0dGhpcy5fb25Gcm9tQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdGlmIChzZWxmLmRlYnVnKCkpIHsgY29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBSZWNlaXZlZCBjaGFuZ2UnKTsgfVxuXHRcdHNlbGYuX29uQ2hhbmdlLmFwcGx5KHNlbGYsIGFyZ3VtZW50cyk7XG5cdH07XG59O1xuXG5TaGFyZWQubW9kdWxlcy5PbGRWaWV3ID0gT2xkVmlldztcblxuQ29sbGVjdGlvbkdyb3VwID0gcmVxdWlyZSgnLi9Db2xsZWN0aW9uR3JvdXAnKTtcbkNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24nKTtcbkNvbGxlY3Rpb25Jbml0ID0gQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdDtcbkNvbGxlY3Rpb25Hcm91cEluaXQgPSBDb2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLmluaXQ7XG5PdmVybG9hZCA9IHJlcXVpcmUoJy4vT3ZlcmxvYWQnKTtcbkNvcmUgPSBTaGFyZWQubW9kdWxlcy5Db3JlO1xuQ29yZUluaXQgPSBDb3JlLnByb3RvdHlwZS5pbml0O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5vbiA9IG5ldyBPdmVybG9hZChbXG5cdGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10gfHwgW107XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddLnB1c2gobGlzdGVuZXIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZnVuY3Rpb24oZXZlbnQsIGlkLCBsaXN0ZW5lcikge1xuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2lkXSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdIHx8IFtdO1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdLnB1c2gobGlzdGVuZXIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbl0pO1xuXG5PbGRWaWV3LnByb3RvdHlwZS5vZmYgPSBuZXcgT3ZlcmxvYWQoW1xuXHRmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5fbGlzdGVuZXJzICYmIHRoaXMuX2xpc3RlbmVyc1tldmVudF0gJiYgZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0XHRkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblx0XHR2YXIgYXJyLFxuXHRcdFx0aW5kZXg7XG5cblx0XHRpZiAodHlwZW9mKGxpc3RlbmVyKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdGlmICh0aGlzLl9saXN0ZW5lcnMgJiYgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSAmJiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2xpc3RlbmVyXSkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtsaXN0ZW5lcl07XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHRcdFx0YXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddO1xuXHRcdFx0XHRpbmRleCA9IGFyci5pbmRleE9mKGxpc3RlbmVyKTtcblxuXHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRcdGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKGV2ZW50LCBpZCwgbGlzdGVuZXIpIHtcblx0XHRpZiAodGhpcy5fbGlzdGVuZXJzICYmIGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdFx0dmFyIGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdLFxuXHRcdFx0XHRpbmRleCA9IGFyci5pbmRleE9mKGxpc3RlbmVyKTtcblxuXHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdFx0YXJyLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5dKTtcblxuT2xkVmlldy5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50LCBkYXRhKSB7XG5cdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblxuXHRpZiAoZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0Ly8gSGFuZGxlIGdsb2JhbCBlbWl0XG5cdFx0aWYgKHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSkge1xuXHRcdFx0dmFyIGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSxcblx0XHRcdFx0YXJyQ291bnQgPSBhcnIubGVuZ3RoLFxuXHRcdFx0XHRhcnJJbmRleDtcblxuXHRcdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdFx0YXJyW2FyckluZGV4XS5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBIYW5kbGUgaW5kaXZpZHVhbCBlbWl0XG5cdFx0aWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGFycmF5IGlzIGFuIGFycmF5IG9mIG9iamVjdHMgaW4gdGhlIGNvbGxlY3Rpb25cblx0XHRcdGlmIChkYXRhWzBdICYmIGRhdGFbMF1bdGhpcy5fcHJpbWFyeUtleV0pIHtcblx0XHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIGNoZWNrIGZvciBsaXN0ZW5lcnMgYWdhaW5zdCB0aGUgcHJpbWFyeSBrZXlcblx0XHRcdFx0dmFyIGxpc3RlbmVySWRBcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLFxuXHRcdFx0XHRcdGxpc3RlbmVySWRDb3VudCxcblx0XHRcdFx0XHRsaXN0ZW5lcklkSW5kZXgsXG5cdFx0XHRcdFx0YXJyQ291bnQgPSBkYXRhLmxlbmd0aCxcblx0XHRcdFx0XHRhcnJJbmRleDtcblxuXHRcdFx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdFx0XHRcdGlmIChsaXN0ZW5lcklkQXJyW2RhdGFbYXJySW5kZXhdW3RoaXMuX3ByaW1hcnlLZXldXSkge1xuXHRcdFx0XHRcdFx0Ly8gRW1pdCBmb3IgdGhpcyBpZFxuXHRcdFx0XHRcdFx0bGlzdGVuZXJJZENvdW50ID0gbGlzdGVuZXJJZEFycltkYXRhW2FyckluZGV4XVt0aGlzLl9wcmltYXJ5S2V5XV0ubGVuZ3RoO1xuXHRcdFx0XHRcdFx0Zm9yIChsaXN0ZW5lcklkSW5kZXggPSAwOyBsaXN0ZW5lcklkSW5kZXggPCBsaXN0ZW5lcklkQ291bnQ7IGxpc3RlbmVySWRJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdGxpc3RlbmVySWRBcnJbZGF0YVthcnJJbmRleF1bdGhpcy5fcHJpbWFyeUtleV1dW2xpc3RlbmVySWRJbmRleF0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERyb3BzIGEgdmlldyBhbmQgYWxsIGl0J3Mgc3RvcmVkIGRhdGEgZnJvbSB0aGUgZGF0YWJhc2UuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBvbiBzdWNjZXNzLCBmYWxzZSBvbiBmYWlsdXJlLlxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuXHRpZiAoKHRoaXMuX2RiIHx8IHRoaXMuX2Zyb20pICYmIHRoaXMuX25hbWUpIHtcblx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IERyb3BwaW5nIHZpZXcgJyArIHRoaXMuX25hbWUpO1xuXHRcdH1cblxuXHRcdHRoaXMuZW1pdCgnZHJvcCcpO1xuXG5cdFx0aWYgKHRoaXMuX2RiKSB7XG5cdFx0XHRkZWxldGUgdGhpcy5fZGIuX29sZFZpZXdzW3RoaXMuX25hbWVdO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9mcm9tKSB7XG5cdFx0XHRkZWxldGUgdGhpcy5fZnJvbS5fb2xkVmlld3NbdGhpcy5fbmFtZV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5kZWJ1ZyA9IGZ1bmN0aW9uICgpIHtcblx0Ly8gVE9ETzogTWFrZSB0aGlzIGZ1bmN0aW9uIHdvcmtcblx0cmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgREIgdGhlIHZpZXcgaXMgYm91bmQgYWdhaW5zdC4gQXV0b21hdGljYWxseSBzZXRcbiAqIHdoZW4gdGhlIGRiLm9sZFZpZXcodmlld05hbWUpIG1ldGhvZCBpcyBjYWxsZWQuXG4gKiBAcGFyYW0gZGJcbiAqIEByZXR1cm5zIHsqfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5kYiA9IGZ1bmN0aW9uIChkYikge1xuXHRpZiAoZGIgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2RiID0gZGI7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fZGI7XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBjb2xsZWN0aW9uIHRoYXQgdGhlIHZpZXcgZGVyaXZlcyBpdCdzIGRhdGEgZnJvbS5cbiAqIEBwYXJhbSB7Kn0gY29sbGVjdGlvbiBBIGNvbGxlY3Rpb24gaW5zdGFuY2Ugb3IgdGhlIG5hbWUgb2YgYSBjb2xsZWN0aW9uXG4gKiB0byB1c2UgYXMgdGhlIGRhdGEgc2V0IHRvIGRlcml2ZSB2aWV3IGRhdGEgZnJvbS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5mcm9tID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcblx0aWYgKGNvbGxlY3Rpb24gIT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBjb2xsZWN0aW9uIG5hbWUgb3IgYSBjb2xsZWN0aW9uIGluc3RhbmNlXG5cdFx0aWYgKHR5cGVvZihjb2xsZWN0aW9uKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdGlmICh0aGlzLl9kYi5jb2xsZWN0aW9uRXhpc3RzKGNvbGxlY3Rpb24pKSB7XG5cdFx0XHRcdGNvbGxlY3Rpb24gPSB0aGlzLl9kYi5jb2xsZWN0aW9uKGNvbGxlY3Rpb24pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3coJ0ludmFsaWQgY29sbGVjdGlvbiBpbiB2aWV3LmZyb20oKSBjYWxsLicpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIENoZWNrIGlmIHRoZSBleGlzdGluZyBmcm9tIG1hdGNoZXMgdGhlIHBhc3NlZCBvbmVcblx0XHRpZiAodGhpcy5fZnJvbSAhPT0gY29sbGVjdGlvbikge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgd2UgYWxyZWFkeSBoYXZlIGEgY29sbGVjdGlvbiBhc3NpZ25lZFxuXHRcdFx0aWYgKHRoaXMuX2Zyb20pIHtcblx0XHRcdFx0Ly8gUmVtb3ZlIG91cnNlbHZlcyBmcm9tIHRoZSBjb2xsZWN0aW9uIHZpZXcgbG9va3VwXG5cdFx0XHRcdHRoaXMucmVtb3ZlRnJvbSgpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmFkZEZyb20oY29sbGVjdGlvbik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fZnJvbTtcbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLmFkZEZyb20gPSBmdW5jdGlvbiAoY29sbGVjdGlvbikge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0dGhpcy5fZnJvbSA9IGNvbGxlY3Rpb247XG5cblx0aWYgKHRoaXMuX2Zyb20pIHtcblx0XHR0aGlzLl9mcm9tLm9uKCdzZXREYXRhJywgdGhpcy5fb25Gcm9tU2V0RGF0YSk7XG5cdFx0Ly90aGlzLl9mcm9tLm9uKCdpbnNlcnQnLCB0aGlzLl9vbkZyb21JbnNlcnQpO1xuXHRcdC8vdGhpcy5fZnJvbS5vbigndXBkYXRlJywgdGhpcy5fb25Gcm9tVXBkYXRlKTtcblx0XHQvL3RoaXMuX2Zyb20ub24oJ3JlbW92ZScsIHRoaXMuX29uRnJvbVJlbW92ZSk7XG5cdFx0dGhpcy5fZnJvbS5vbignY2hhbmdlJywgdGhpcy5fb25Gcm9tQ2hhbmdlKTtcblxuXHRcdC8vIEFkZCB0aGlzIHZpZXcgdG8gdGhlIGNvbGxlY3Rpb24ncyB2aWV3IGxvb2t1cFxuXHRcdHRoaXMuX2Zyb20uX2FkZE9sZFZpZXcodGhpcyk7XG5cdFx0dGhpcy5fcHJpbWFyeUtleSA9IHRoaXMuX2Zyb20uX3ByaW1hcnlLZXk7XG5cblx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSBlbHNlIHtcblx0XHR0aHJvdygnQ2Fubm90IGRldGVybWluZSBjb2xsZWN0aW9uIHR5cGUgaW4gdmlldy5mcm9tKCknKTtcblx0fVxufTtcblxuT2xkVmlldy5wcm90b3R5cGUucmVtb3ZlRnJvbSA9IGZ1bmN0aW9uICgpIHtcblx0Ly8gVW5zdWJzY3JpYmUgZnJvbSBldmVudHMgb24gdGhpcyBcImZyb21cIlxuXHR0aGlzLl9mcm9tLm9mZignc2V0RGF0YScsIHRoaXMuX29uRnJvbVNldERhdGEpO1xuXHQvL3RoaXMuX2Zyb20ub2ZmKCdpbnNlcnQnLCB0aGlzLl9vbkZyb21JbnNlcnQpO1xuXHQvL3RoaXMuX2Zyb20ub2ZmKCd1cGRhdGUnLCB0aGlzLl9vbkZyb21VcGRhdGUpO1xuXHQvL3RoaXMuX2Zyb20ub2ZmKCdyZW1vdmUnLCB0aGlzLl9vbkZyb21SZW1vdmUpO1xuXHR0aGlzLl9mcm9tLm9mZignY2hhbmdlJywgdGhpcy5fb25Gcm9tQ2hhbmdlKTtcblxuXHR0aGlzLl9mcm9tLl9yZW1vdmVPbGRWaWV3KHRoaXMpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBwcmltYXJ5IGtleSBmb3IgdGhpcyB2aWV3IGZyb20gdGhlIGFzc2lnbmVkIGNvbGxlY3Rpb24uXG4gKiBAcmV0dXJucyB7U3RyaW5nfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5wcmltYXJ5S2V5ID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5fZnJvbSkge1xuXHRcdHJldHVybiB0aGlzLl9mcm9tLnByaW1hcnlLZXkoKTtcblx0fVxuXG5cdHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBxdWVyeSB0aGF0IHRoZSB2aWV3IHVzZXMgdG8gYnVpbGQgaXQncyBkYXRhIHNldC5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbj19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW49fSByZWZyZXNoIFdoZXRoZXIgdG8gcmVmcmVzaCB0aGUgdmlldyBkYXRhIGFmdGVyXG4gKiB0aGlzIG9wZXJhdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5xdWVyeURhdGEgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMsIHJlZnJlc2gpIHtcblx0aWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9xdWVyeS5xdWVyeSA9IHF1ZXJ5O1xuXHR9XG5cblx0aWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3F1ZXJ5Lm9wdGlvbnMgPSBvcHRpb25zO1xuXHR9XG5cblx0aWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9xdWVyeTtcbn07XG5cbi8qKlxuICogQWRkIGRhdGEgdG8gdGhlIGV4aXN0aW5nIHF1ZXJ5LlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgZGF0YSB3aG9zZSBrZXlzIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGV4aXN0aW5nXG4gKiBxdWVyeSBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG92ZXJ3cml0ZSBXaGV0aGVyIG9yIG5vdCB0byBvdmVyd3JpdGUgZGF0YSB0aGF0IGFscmVhZHlcbiAqIGV4aXN0cyBpbiB0aGUgcXVlcnkgb2JqZWN0LiBEZWZhdWx0cyB0byB0cnVlLlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIG9yIG5vdCB0byByZWZyZXNoIHRoZSB2aWV3IGRhdGEgc2V0XG4gKiBvbmNlIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGUuIERlZmF1bHRzIHRvIHRydWUuXG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLnF1ZXJ5QWRkID0gZnVuY3Rpb24gKG9iaiwgb3ZlcndyaXRlLCByZWZyZXNoKSB7XG5cdHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5LnF1ZXJ5LFxuXHRcdGk7XG5cblx0aWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gTG9vcCBvYmplY3QgcHJvcGVydGllcyBhbmQgYWRkIHRvIGV4aXN0aW5nIHF1ZXJ5XG5cdFx0Zm9yIChpIGluIG9iaikge1xuXHRcdFx0aWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0XHRpZiAocXVlcnlbaV0gPT09IHVuZGVmaW5lZCB8fCAocXVlcnlbaV0gIT09IHVuZGVmaW5lZCAmJiBvdmVyd3JpdGUpKSB7XG5cdFx0XHRcdFx0cXVlcnlbaV0gPSBvYmpbaV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAocmVmcmVzaCA9PT0gdW5kZWZpbmVkIHx8IHJlZnJlc2ggPT09IHRydWUpIHtcblx0XHR0aGlzLnJlZnJlc2goKTtcblx0fVxufTtcblxuLyoqXG4gKiBSZW1vdmUgZGF0YSBmcm9tIHRoZSBleGlzdGluZyBxdWVyeS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIGRhdGEgd2hvc2Uga2V5cyB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgZXhpc3RpbmdcbiAqIHF1ZXJ5IG9iamVjdC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj19IHJlZnJlc2ggV2hldGhlciBvciBub3QgdG8gcmVmcmVzaCB0aGUgdmlldyBkYXRhIHNldFxuICogb25jZSB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlLiBEZWZhdWx0cyB0byB0cnVlLlxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5xdWVyeVJlbW92ZSA9IGZ1bmN0aW9uIChvYmosIHJlZnJlc2gpIHtcblx0dmFyIHF1ZXJ5ID0gdGhpcy5fcXVlcnkucXVlcnksXG5cdFx0aTtcblxuXHRpZiAob2JqICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBMb29wIG9iamVjdCBwcm9wZXJ0aWVzIGFuZCBhZGQgdG8gZXhpc3RpbmcgcXVlcnlcblx0XHRmb3IgKGkgaW4gb2JqKSB7XG5cdFx0XHRpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRcdGRlbGV0ZSBxdWVyeVtpXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAocmVmcmVzaCA9PT0gdW5kZWZpbmVkIHx8IHJlZnJlc2ggPT09IHRydWUpIHtcblx0XHR0aGlzLnJlZnJlc2goKTtcblx0fVxufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgcXVlcnkgYmVpbmcgdXNlZCB0byBnZW5lcmF0ZSB0aGUgdmlldyBkYXRhLlxuICogQHBhcmFtIHtPYmplY3Q9fSBxdWVyeSBUaGUgcXVlcnkgdG8gc2V0LlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBhZnRlclxuICogdGhpcyBvcGVyYXRpb24uIERlZmF1bHRzIHRvIHRydWUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAocXVlcnksIHJlZnJlc2gpIHtcblx0aWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9xdWVyeS5xdWVyeSA9IHF1ZXJ5O1xuXG5cdFx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcXVlcnkucXVlcnk7XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBxdWVyeSBvcHRpb25zIHVzZWQgd2hlbiBhcHBseWluZyBzb3J0aW5nIGV0YyB0byB0aGVcbiAqIHZpZXcgZGF0YSBzZXQuXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW49fSByZWZyZXNoIFdoZXRoZXIgdG8gcmVmcmVzaCB0aGUgdmlldyBkYXRhIGFmdGVyXG4gKiB0aGlzIG9wZXJhdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5xdWVyeU9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucywgcmVmcmVzaCkge1xuXHRpZiAob3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcXVlcnkub3B0aW9ucyA9IG9wdGlvbnM7XG5cblx0XHRpZiAocmVmcmVzaCA9PT0gdW5kZWZpbmVkIHx8IHJlZnJlc2ggPT09IHRydWUpIHtcblx0XHRcdHRoaXMucmVmcmVzaCgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9xdWVyeS5vcHRpb25zO1xufTtcblxuLyoqXG4gKiBSZWZyZXNoZXMgdGhlIHZpZXcgZGF0YSBhbmQgZGlmZnMgYmV0d2VlbiBwcmV2aW91cyBhbmQgbmV3IGRhdGEgdG9cbiAqIGRldGVybWluZSBpZiBhbnkgZXZlbnRzIG5lZWQgdG8gYmUgdHJpZ2dlcmVkIG9yIERPTSBiaW5kcyB1cGRhdGVkLlxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5yZWZyZXNoID0gZnVuY3Rpb24gKGZvcmNlKSB7XG5cdGlmICh0aGlzLl9mcm9tKSB7XG5cdFx0Ly8gVGFrZSBhIGNvcHkgb2YgdGhlIGRhdGEgYmVmb3JlIHVwZGF0aW5nIGl0LCB3ZSB3aWxsIHVzZSB0aGlzIHRvXG5cdFx0Ly8gXCJkaWZmXCIgYmV0d2VlbiB0aGUgb2xkIGFuZCBuZXcgZGF0YSBhbmQgaGFuZGxlIERPTSBiaW5kIHVwZGF0ZXNcblx0XHR2YXIgb2xkRGF0YSA9IHRoaXMuX2RhdGEsXG5cdFx0XHRvbGREYXRhQXJyLFxuXHRcdFx0b2xkRGF0YUl0ZW0sXG5cdFx0XHRuZXdEYXRhLFxuXHRcdFx0bmV3RGF0YUFycixcblx0XHRcdHF1ZXJ5LFxuXHRcdFx0cHJpbWFyeUtleSxcblx0XHRcdGRhdGFJdGVtLFxuXHRcdFx0aW5zZXJ0ZWQgPSBbXSxcblx0XHRcdHVwZGF0ZWQgPSBbXSxcblx0XHRcdHJlbW92ZWQgPSBbXSxcblx0XHRcdG9wZXJhdGVkID0gZmFsc2UsXG5cdFx0XHRpO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBSZWZyZXNoaW5nIHZpZXcgJyArIHRoaXMuX25hbWUpO1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBFeGlzdGluZyBkYXRhOiAnICsgKHR5cGVvZih0aGlzLl9kYXRhKSAhPT0gXCJ1bmRlZmluZWRcIikpO1xuXHRcdFx0aWYgKHR5cGVvZih0aGlzLl9kYXRhKSAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IEN1cnJlbnQgZGF0YSByb3dzOiAnICsgdGhpcy5fZGF0YS5maW5kKCkubGVuZ3RoKTtcblx0XHRcdH1cblx0XHRcdC8vY29uc29sZS5sb2coT2xkVmlldy5wcm90b3R5cGUucmVmcmVzaC5jYWxsZXIpO1xuXHRcdH1cblxuXHRcdC8vIFF1ZXJ5IHRoZSBjb2xsZWN0aW9uIGFuZCB1cGRhdGUgdGhlIGRhdGFcblx0XHRpZiAodGhpcy5fcXVlcnkpIHtcblx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBWaWV3IGhhcyBxdWVyeSBhbmQgb3B0aW9ucywgZ2V0dGluZyBzdWJzZXQuLi4nKTtcblx0XHRcdH1cblx0XHRcdC8vIFJ1biBxdWVyeSBhZ2FpbnN0IGNvbGxlY3Rpb25cblx0XHRcdC8vY29uc29sZS5sb2coJ3JlZnJlc2ggd2l0aCBxdWVyeSBhbmQgb3B0aW9ucycsIHRoaXMuX3F1ZXJ5Lm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5fZGF0YSA9IHRoaXMuX2Zyb20uc3Vic2V0KHRoaXMuX3F1ZXJ5LnF1ZXJ5LCB0aGlzLl9xdWVyeS5vcHRpb25zKTtcblx0XHRcdC8vY29uc29sZS5sb2codGhpcy5fZGF0YSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIE5vIHF1ZXJ5LCByZXR1cm4gd2hvbGUgY29sbGVjdGlvblxuXHRcdFx0aWYgKHRoaXMuX3F1ZXJ5Lm9wdGlvbnMpIHtcblx0XHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogVmlldyBoYXMgb3B0aW9ucywgZ2V0dGluZyBzdWJzZXQuLi4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl9kYXRhID0gdGhpcy5fZnJvbS5zdWJzZXQoe30sIHRoaXMuX3F1ZXJ5Lm9wdGlvbnMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogVmlldyBoYXMgbm8gcXVlcnkgb3Igb3B0aW9ucywgZ2V0dGluZyBzdWJzZXQuLi4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLl9kYXRhID0gdGhpcy5fZnJvbS5zdWJzZXQoe30pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIENoZWNrIGlmIHRoZXJlIHdhcyBvbGQgZGF0YVxuXHRcdGlmICghZm9yY2UgJiYgb2xkRGF0YSkge1xuXHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IFJlZnJlc2ggbm90IGZvcmNlZCwgb2xkIGRhdGEgZGV0ZWN0ZWQuLi4nKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gTm93IGRldGVybWluZSB0aGUgZGlmZmVyZW5jZVxuXHRcdFx0bmV3RGF0YSA9IHRoaXMuX2RhdGE7XG5cblx0XHRcdGlmIChvbGREYXRhLnN1YnNldE9mKCkgPT09IG5ld0RhdGEuc3Vic2V0T2YoKSkge1xuXHRcdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBPbGQgYW5kIG5ldyBkYXRhIGFyZSBmcm9tIHNhbWUgY29sbGVjdGlvbi4uLicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG5ld0RhdGFBcnIgPSBuZXdEYXRhLmZpbmQoKTtcblx0XHRcdFx0b2xkRGF0YUFyciA9IG9sZERhdGEuZmluZCgpO1xuXHRcdFx0XHRwcmltYXJ5S2V5ID0gbmV3RGF0YS5fcHJpbWFyeUtleTtcblxuXHRcdFx0XHQvLyBUaGUgb2xkIGRhdGEgYW5kIG5ldyBkYXRhIHdlcmUgZGVyaXZlZCBmcm9tIHRoZSBzYW1lIHBhcmVudCBjb2xsZWN0aW9uXG5cdFx0XHRcdC8vIHNvIHNjYW4gdGhlIGRhdGEgdG8gZGV0ZXJtaW5lIGNoYW5nZXNcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IG5ld0RhdGFBcnIubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRkYXRhSXRlbSA9IG5ld0RhdGFBcnJbaV07XG5cblx0XHRcdFx0XHRxdWVyeSA9IHt9O1xuXHRcdFx0XHRcdHF1ZXJ5W3ByaW1hcnlLZXldID0gZGF0YUl0ZW1bcHJpbWFyeUtleV07XG5cblx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGl0ZW0gZXhpc3RzIGluIHRoZSBvbGQgZGF0YVxuXHRcdFx0XHRcdG9sZERhdGFJdGVtID0gb2xkRGF0YS5maW5kKHF1ZXJ5KVswXTtcblxuXHRcdFx0XHRcdGlmICghb2xkRGF0YUl0ZW0pIHtcblx0XHRcdFx0XHRcdC8vIE5ldyBpdGVtIGRldGVjdGVkXG5cdFx0XHRcdFx0XHRpbnNlcnRlZC5wdXNoKGRhdGFJdGVtKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgYW4gdXBkYXRlIGhhcyBvY2N1cnJlZFxuXHRcdFx0XHRcdFx0aWYgKEpTT04uc3RyaW5naWZ5KG9sZERhdGFJdGVtKSAhPT0gSlNPTi5zdHJpbmdpZnkoZGF0YUl0ZW0pKSB7XG5cdFx0XHRcdFx0XHRcdC8vIFVwZGF0ZWQgLyBhbHJlYWR5IGluY2x1ZGVkIGl0ZW0gZGV0ZWN0ZWRcblx0XHRcdFx0XHRcdFx0dXBkYXRlZC5wdXNoKGRhdGFJdGVtKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBOb3cgbG9vcCB0aGUgb2xkIGRhdGEgYW5kIGNoZWNrIGlmIGFueSByZWNvcmRzIHdlcmUgcmVtb3ZlZFxuXHRcdFx0XHRmb3IgKGkgPSAwOyBpIDwgb2xkRGF0YUFyci5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGRhdGFJdGVtID0gb2xkRGF0YUFycltpXTtcblxuXHRcdFx0XHRcdHF1ZXJ5ID0ge307XG5cdFx0XHRcdFx0cXVlcnlbcHJpbWFyeUtleV0gPSBkYXRhSXRlbVtwcmltYXJ5S2V5XTtcblxuXHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXRlbSBleGlzdHMgaW4gdGhlIG9sZCBkYXRhXG5cdFx0XHRcdFx0aWYgKCFuZXdEYXRhLmZpbmQocXVlcnkpWzBdKSB7XG5cdFx0XHRcdFx0XHQvLyBSZW1vdmVkIGl0ZW0gZGV0ZWN0ZWRcblx0XHRcdFx0XHRcdHJlbW92ZWQucHVzaChkYXRhSXRlbSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogUmVtb3ZlZCAnICsgcmVtb3ZlZC5sZW5ndGggKyAnIHJvd3MnKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IEluc2VydGVkICcgKyBpbnNlcnRlZC5sZW5ndGggKyAnIHJvd3MnKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IFVwZGF0ZWQgJyArIHVwZGF0ZWQubGVuZ3RoICsgJyByb3dzJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBOb3cgd2UgaGF2ZSBhIGRpZmYgb2YgdGhlIHR3byBkYXRhIHNldHMsIHdlIG5lZWQgdG8gZ2V0IHRoZSBET00gdXBkYXRlZFxuXHRcdFx0XHRpZiAoaW5zZXJ0ZWQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0dGhpcy5fb25JbnNlcnQoaW5zZXJ0ZWQsIFtdKTtcblx0XHRcdFx0XHRvcGVyYXRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodXBkYXRlZC5sZW5ndGgpIHtcblx0XHRcdFx0XHR0aGlzLl9vblVwZGF0ZSh1cGRhdGVkLCBbXSk7XG5cdFx0XHRcdFx0b3BlcmF0ZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHJlbW92ZWQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0dGhpcy5fb25SZW1vdmUocmVtb3ZlZCwgW10pO1xuXHRcdFx0XHRcdG9wZXJhdGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gVGhlIHByZXZpb3VzIGRhdGEgYW5kIHRoZSBuZXcgZGF0YSBhcmUgZGVyaXZlZCBmcm9tIGRpZmZlcmVudCBjb2xsZWN0aW9uc1xuXHRcdFx0XHQvLyBhbmQgY2FuIHRoZXJlZm9yZSBub3QgYmUgY29tcGFyZWQsIGFsbCBkYXRhIGlzIHRoZXJlZm9yZSBlZmZlY3RpdmVseSBcIm5ld1wiXG5cdFx0XHRcdC8vIHNvIGZpcnN0IHBlcmZvcm0gYSByZW1vdmUgb2YgYWxsIGV4aXN0aW5nIGRhdGEgdGhlbiBkbyBhbiBpbnNlcnQgb24gYWxsIG5ldyBkYXRhXG5cdFx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IE9sZCBhbmQgbmV3IGRhdGEgYXJlIGZyb20gZGlmZmVyZW50IGNvbGxlY3Rpb25zLi4uJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmVtb3ZlZCA9IG9sZERhdGEuZmluZCgpO1xuXG5cdFx0XHRcdGlmIChyZW1vdmVkLmxlbmd0aCkge1xuXHRcdFx0XHRcdHRoaXMuX29uUmVtb3ZlKHJlbW92ZWQpO1xuXHRcdFx0XHRcdG9wZXJhdGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGluc2VydGVkID0gbmV3RGF0YS5maW5kKCk7XG5cblx0XHRcdFx0aWYgKGluc2VydGVkLmxlbmd0aCkge1xuXHRcdFx0XHRcdHRoaXMuX29uSW5zZXJ0KGluc2VydGVkKTtcblx0XHRcdFx0XHRvcGVyYXRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gRm9yY2UgYW4gdXBkYXRlIGFzIGlmIHRoZSB2aWV3IG5ldmVyIGdvdCBjcmVhdGVkIGJ5IHBhZGRpbmcgYWxsIGVsZW1lbnRzXG5cdFx0XHQvLyB0byB0aGUgaW5zZXJ0XG5cdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogRm9yY2luZyBkYXRhIHVwZGF0ZScsIG5ld0RhdGFBcnIpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9kYXRhID0gdGhpcy5fZnJvbS5zdWJzZXQodGhpcy5fcXVlcnkucXVlcnksIHRoaXMuX3F1ZXJ5Lm9wdGlvbnMpO1xuXHRcdFx0bmV3RGF0YUFyciA9IHRoaXMuX2RhdGEuZmluZCgpO1xuXG5cdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogRW1pdHRpbmcgY2hhbmdlIGV2ZW50IHdpdGggZGF0YScsIG5ld0RhdGFBcnIpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5fb25JbnNlcnQobmV3RGF0YUFyciwgW10pO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLmRlYnVnKCkpIHsgY29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBFbWl0dGluZyBjaGFuZ2UnKTsgfVxuXHRcdHRoaXMuZW1pdCgnY2hhbmdlJyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbnVtYmVyIG9mIGRvY3VtZW50cyBjdXJyZW50bHkgaW4gdGhlIHZpZXcuXG4gKiBAcmV0dXJucyB7TnVtYmVyfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5jb3VudCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX2RhdGEgJiYgdGhpcy5fZGF0YS5fZGF0YSA/IHRoaXMuX2RhdGEuX2RhdGEubGVuZ3RoIDogMDtcbn07XG5cbi8qKlxuICogUXVlcmllcyB0aGUgdmlldyBkYXRhLiBTZWUgQ29sbGVjdGlvbi5maW5kKCkgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuX2RhdGEpIHtcblx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IEZpbmRpbmcgZGF0YSBpbiB2aWV3IGNvbGxlY3Rpb24uLi4nLCB0aGlzLl9kYXRhKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5fZGF0YS5maW5kLmFwcGx5KHRoaXMuX2RhdGEsIGFyZ3VtZW50cyk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG59O1xuXG4vKipcbiAqIEluc2VydHMgaW50byB2aWV3IGRhdGEgdmlhIHRoZSB2aWV3IGNvbGxlY3Rpb24uIFNlZSBDb2xsZWN0aW9uLmluc2VydCgpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgeyp9XG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuX2Zyb20pIHtcblx0XHQvLyBQYXNzIHRoZSBhcmdzIHRocm91Z2ggdG8gdGhlIGZyb20gb2JqZWN0XG5cdFx0cmV0dXJuIHRoaXMuX2Zyb20uaW5zZXJ0LmFwcGx5KHRoaXMuX2Zyb20sIGFyZ3VtZW50cyk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgaW50byB2aWV3IGRhdGEgdmlhIHRoZSB2aWV3IGNvbGxlY3Rpb24uIFNlZSBDb2xsZWN0aW9uLnVwZGF0ZSgpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgeyp9XG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuX2Zyb20pIHtcblx0XHQvLyBQYXNzIHRoZSBhcmdzIHRocm91Z2ggdG8gdGhlIGZyb20gb2JqZWN0XG5cdFx0cmV0dXJuIHRoaXMuX2Zyb20udXBkYXRlLmFwcGx5KHRoaXMuX2Zyb20sIGFyZ3VtZW50cyk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZWQgZnJvbSB2aWV3IGRhdGEgdmlhIHRoZSB2aWV3IGNvbGxlY3Rpb24uIFNlZSBDb2xsZWN0aW9uLnJlbW92ZSgpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgeyp9XG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuX2Zyb20pIHtcblx0XHQvLyBQYXNzIHRoZSBhcmdzIHRocm91Z2ggdG8gdGhlIGZyb20gb2JqZWN0XG5cdFx0cmV0dXJuIHRoaXMuX2Zyb20ucmVtb3ZlLmFwcGx5KHRoaXMuX2Zyb20sIGFyZ3VtZW50cyk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIFtdO1xuXHR9XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5fb25TZXREYXRhID0gZnVuY3Rpb24gKG5ld0RhdGFBcnIsIG9sZERhdGFBcnIpIHtcblx0dGhpcy5lbWl0KCdyZW1vdmUnLCBvbGREYXRhQXJyLCBbXSk7XG5cdHRoaXMuZW1pdCgnaW5zZXJ0JywgbmV3RGF0YUFyciwgW10pO1xuXHQvL3RoaXMucmVmcmVzaCgpO1xufTtcblxuT2xkVmlldy5wcm90b3R5cGUuX29uSW5zZXJ0ID0gZnVuY3Rpb24gKHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0dGhpcy5lbWl0KCdpbnNlcnQnLCBzdWNjZXNzQXJyLCBmYWlsQXJyKTtcblx0Ly90aGlzLnJlZnJlc2goKTtcbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9vblVwZGF0ZSA9IGZ1bmN0aW9uIChzdWNjZXNzQXJyLCBmYWlsQXJyKSB7XG5cdHRoaXMuZW1pdCgndXBkYXRlJywgc3VjY2Vzc0FyciwgZmFpbEFycik7XG5cdC8vdGhpcy5yZWZyZXNoKCk7XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5fb25SZW1vdmUgPSBmdW5jdGlvbiAoc3VjY2Vzc0FyciwgZmFpbEFycikge1xuXHR0aGlzLmVtaXQoJ3JlbW92ZScsIHN1Y2Nlc3NBcnIsIGZhaWxBcnIpO1xuXHQvL3RoaXMucmVmcmVzaCgpO1xufTtcblxuT2xkVmlldy5wcm90b3R5cGUuX29uQ2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5kZWJ1ZygpKSB7IGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogUmVmcmVzaGluZyBkYXRhJyk7IH1cblx0dGhpcy5yZWZyZXNoKCk7XG59O1xuXG4vLyBFeHRlbmQgY29sbGVjdGlvbiB3aXRoIHZpZXcgaW5pdFxuQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fb2xkVmlld3MgPSBbXTtcblx0Q29sbGVjdGlvbkluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogQWRkcyBhIHZpZXcgdG8gdGhlIGludGVybmFsIHZpZXcgbG9va3VwLlxuICogQHBhcmFtIHtWaWV3fSB2aWV3IFRoZSB2aWV3IHRvIGFkZC5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX2FkZE9sZFZpZXcgPSBmdW5jdGlvbiAodmlldykge1xuXHRpZiAodmlldyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fb2xkVmlld3Nbdmlldy5fbmFtZV0gPSB2aWV3O1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSB2aWV3IGZyb20gdGhlIGludGVybmFsIHZpZXcgbG9va3VwLlxuICogQHBhcmFtIHtWaWV3fSB2aWV3IFRoZSB2aWV3IHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3JlbW92ZU9sZFZpZXcgPSBmdW5jdGlvbiAodmlldykge1xuXHRpZiAodmlldyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0ZGVsZXRlIHRoaXMuX29sZFZpZXdzW3ZpZXcuX25hbWVdO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vLyBFeHRlbmQgY29sbGVjdGlvbiB3aXRoIHZpZXcgaW5pdFxuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9vbGRWaWV3cyA9IFtdO1xuXHRDb2xsZWN0aW9uR3JvdXBJbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSB2aWV3IHRvIHRoZSBpbnRlcm5hbCB2aWV3IGxvb2t1cC5cbiAqIEBwYXJhbSB7Vmlld30gdmlldyBUaGUgdmlldyB0byBhZGQuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuX2FkZE9sZFZpZXcgPSBmdW5jdGlvbiAodmlldykge1xuXHRpZiAodmlldyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fb2xkVmlld3Nbdmlldy5fbmFtZV0gPSB2aWV3O1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSB2aWV3IGZyb20gdGhlIGludGVybmFsIHZpZXcgbG9va3VwLlxuICogQHBhcmFtIHtWaWV3fSB2aWV3IFRoZSB2aWV3IHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5fcmVtb3ZlT2xkVmlldyA9IGZ1bmN0aW9uICh2aWV3KSB7XG5cdGlmICh2aWV3ICE9PSB1bmRlZmluZWQpIHtcblx0XHRkZWxldGUgdGhpcy5fb2xkVmlld3Nbdmlldy5fbmFtZV07XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8vIEV4dGVuZCBEQiB3aXRoIHZpZXdzIGluaXRcbkNvcmUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX29sZFZpZXdzID0ge307XG5cdENvcmVJbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIEdldHMgYSB2aWV3IGJ5IGl0J3MgbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2aWV3TmFtZSBUaGUgbmFtZSBvZiB0aGUgdmlldyB0byByZXRyaWV2ZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db3JlLnByb3RvdHlwZS5vbGRWaWV3ID0gZnVuY3Rpb24gKHZpZXdOYW1lKSB7XG5cdGlmICghdGhpcy5fb2xkVmlld3Nbdmlld05hbWVdKSB7XG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBDcmVhdGluZyB2aWV3ICcgKyB2aWV3TmFtZSk7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5fb2xkVmlld3Nbdmlld05hbWVdID0gdGhpcy5fb2xkVmlld3Nbdmlld05hbWVdIHx8IG5ldyBPbGRWaWV3KHZpZXdOYW1lKS5kYih0aGlzKTtcblx0cmV0dXJuIHRoaXMuX29sZFZpZXdzW3ZpZXdOYW1lXTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmlldyB3aXRoIHRoZSBwYXNzZWQgbmFtZSBhbHJlYWR5IGV4aXN0cy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2aWV3TmFtZSBUaGUgbmFtZSBvZiB0aGUgdmlldyB0byBjaGVjayBmb3IuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuQ29yZS5wcm90b3R5cGUub2xkVmlld0V4aXN0cyA9IGZ1bmN0aW9uICh2aWV3TmFtZSkge1xuXHRyZXR1cm4gQm9vbGVhbih0aGlzLl9vbGRWaWV3c1t2aWV3TmFtZV0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIHZpZXdzIHRoZSBEQiBjdXJyZW50bHkgaGFzLlxuICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgZGV0YWlscyBvZiBlYWNoIHZpZXdcbiAqIHRoZSBkYXRhYmFzZSBpcyBjdXJyZW50bHkgbWFuYWdpbmcuXG4gKi9cbkNvcmUucHJvdG90eXBlLm9sZFZpZXdzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgYXJyID0gW10sXG5cdFx0aTtcblxuXHRmb3IgKGkgaW4gdGhpcy5fb2xkVmlld3MpIHtcblx0XHRpZiAodGhpcy5fb2xkVmlld3MuaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGFyci5wdXNoKHtcblx0XHRcdFx0bmFtZTogaSxcblx0XHRcdFx0Y291bnQ6IHRoaXMuX29sZFZpZXdzW2ldLmNvdW50KClcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhcnI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9sZFZpZXc7IiwidmFyIFNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyksXG5cdFBhdGggPSByZXF1aXJlKCcuL1BhdGgnKTtcblxuLyoqXG4gKiBUaGUgb3BlcmF0aW9uIGNsYXNzLCB1c2VkIHRvIHN0b3JlIGRldGFpbHMgYWJvdXQgYW4gb3BlcmF0aW9uIGJlaW5nXG4gKiBwZXJmb3JtZWQgYnkgdGhlIGRhdGFiYXNlLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIG9wZXJhdGlvbi5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgT3BlcmF0aW9uID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0dGhpcy5wYXRoU29sdmVyID0gbmV3IFBhdGgoKTtcblx0dGhpcy5jb3VudGVyID0gMDtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5PcGVyYXRpb24ucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAobmFtZSkge1xuXHR0aGlzLl9kYXRhID0ge1xuXHRcdG9wZXJhdGlvbjogbmFtZSwgLy8gVGhlIG5hbWUgb2YgdGhlIG9wZXJhdGlvbiBleGVjdXRlZCBzdWNoIGFzIFwiZmluZFwiLCBcInVwZGF0ZVwiIGV0Y1xuXHRcdGluZGV4OiB7XG5cdFx0XHRwb3RlbnRpYWw6IFtdLCAvLyBJbmRleGVzIHRoYXQgY291bGQgaGF2ZSBwb3RlbnRpYWxseSBiZWVuIHVzZWRcblx0XHRcdHVzZWQ6IGZhbHNlIC8vIFRoZSBpbmRleCB0aGF0IHdhcyBwaWNrZWQgdG8gdXNlXG5cdFx0fSxcblx0XHRzdGVwczogW10sIC8vIFRoZSBzdGVwcyB0YWtlbiB0byBnZW5lcmF0ZSB0aGUgcXVlcnkgcmVzdWx0cyxcblx0XHR0aW1lOiB7XG5cdFx0XHRzdGFydE1zOiAwLFxuXHRcdFx0c3RvcE1zOiAwLFxuXHRcdFx0dG90YWxNczogMCxcblx0XHRcdHByb2Nlc3M6IHt9XG5cdFx0fSxcblx0XHRmbGFnOiB7fSwgLy8gQW4gb2JqZWN0IHdpdGggZmxhZ3MgdGhhdCBkZW5vdGUgY2VydGFpbiBleGVjdXRpb24gcGF0aHNcblx0XHRsb2c6IFtdIC8vIEFueSBleHRyYSBkYXRhIHRoYXQgbWlnaHQgYmUgdXNlZnVsIHN1Y2ggYXMgd2FybmluZ3Mgb3IgaGVscGZ1bCBoaW50c1xuXHR9O1xufTtcblxuU2hhcmVkLm1vZHVsZXMuT3BlcmF0aW9uID0gT3BlcmF0aW9uO1xuXG4vKipcbiAqIFN0YXJ0cyB0aGUgb3BlcmF0aW9uIHRpbWVyLlxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9kYXRhLnRpbWUuc3RhcnRNcyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGl0ZW0gdG8gdGhlIG9wZXJhdGlvbiBsb2cuXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIGl0ZW0gdG8gbG9nLlxuICogQHJldHVybnMgeyp9XG4gKi9cbk9wZXJhdGlvbi5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cdGlmIChldmVudCkge1xuXHRcdHZhciBsYXN0TG9nVGltZSA9IHRoaXMuX2xvZy5sZW5ndGggPiAwID8gdGhpcy5fZGF0YS5sb2dbdGhpcy5fZGF0YS5sb2cubGVuZ3RoIC0gMV0udGltZSA6IDAsXG5cdFx0XHRsb2dPYmogPSB7XG5cdFx0XHRcdGV2ZW50OiBldmVudCxcblx0XHRcdFx0dGltZTogbmV3IERhdGUoKS5nZXRUaW1lKCksXG5cdFx0XHRcdGRlbHRhOiAwXG5cdFx0XHR9O1xuXG5cdFx0dGhpcy5fZGF0YS5sb2cucHVzaChsb2dPYmopO1xuXG5cdFx0aWYgKGxhc3RMb2dUaW1lKSB7XG5cdFx0XHRsb2dPYmouZGVsdGEgPSBsb2dPYmoudGltZSAtIGxhc3RMb2dUaW1lO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2RhdGEubG9nO1xufTtcblxuLyoqXG4gKiBDYWxsZWQgd2hlbiBzdGFydGluZyBhbmQgZW5kaW5nIGEgdGltZWQgb3BlcmF0aW9uLCB1c2VkIHRvIHRpbWVcbiAqIGludGVybmFsIGNhbGxzIHdpdGhpbiBhbiBvcGVyYXRpb24ncyBleGVjdXRpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VjdGlvbiBBbiBvcGVyYXRpb24gbmFtZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLnRpbWUgPSBmdW5jdGlvbiAoc2VjdGlvbikge1xuXHRpZiAoc2VjdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dmFyIHByb2Nlc3MgPSB0aGlzLl9kYXRhLnRpbWUucHJvY2Vzcyxcblx0XHRcdHByb2Nlc3NPYmogPSBwcm9jZXNzW3NlY3Rpb25dID0gcHJvY2Vzc1tzZWN0aW9uXSB8fCB7fTtcblxuXHRcdGlmICghcHJvY2Vzc09iai5zdGFydE1zKSB7XG5cdFx0XHQvLyBUaW1lciBzdGFydGVkXG5cdFx0XHRwcm9jZXNzT2JqLnN0YXJ0TXMgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHRcdHByb2Nlc3NPYmouc3RlcE9iaiA9IHtcblx0XHRcdFx0bmFtZTogc2VjdGlvblxuXHRcdFx0fTtcblxuXHRcdFx0dGhpcy5fZGF0YS5zdGVwcy5wdXNoKHByb2Nlc3NPYmouc3RlcE9iaik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHByb2Nlc3NPYmouc3RvcE1zID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRwcm9jZXNzT2JqLnRvdGFsTXMgPSBwcm9jZXNzT2JqLnN0b3BNcyAtIHByb2Nlc3NPYmouc3RhcnRNcztcblx0XHRcdHByb2Nlc3NPYmouc3RlcE9iai50b3RhbE1zID0gcHJvY2Vzc09iai50b3RhbE1zO1xuXHRcdFx0ZGVsZXRlIHByb2Nlc3NPYmouc3RlcE9iajtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9kYXRhLnRpbWU7XG59O1xuXG4vKipcbiAqIFVzZWQgdG8gc2V0IGtleS92YWx1ZSBmbGFncyBkdXJpbmcgb3BlcmF0aW9uIGV4ZWN1dGlvbi5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEByZXR1cm5zIHsqfVxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLmZsYWcgPSBmdW5jdGlvbiAoa2V5LCB2YWwpIHtcblx0aWYgKGtleSAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fZGF0YS5mbGFnW2tleV0gPSB2YWw7XG5cdH0gZWxzZSBpZiAoa2V5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gdGhpcy5fZGF0YS5mbGFnW2tleV07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHRoaXMuX2RhdGEuZmxhZztcblx0fVxufTtcblxuT3BlcmF0aW9uLnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgbm9UaW1lKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIEFzc2lnbiB2YWx1ZSB0byBvYmplY3QgcGF0aFxuXHRcdHRoaXMucGF0aFNvbHZlci5zZXQodGhpcy5fZGF0YSwgcGF0aCwgdmFsKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMucGF0aFNvbHZlci5nZXQodGhpcy5fZGF0YSwgcGF0aCk7XG59O1xuXG5PcGVyYXRpb24ucHJvdG90eXBlLnB1c2hEYXRhID0gZnVuY3Rpb24gKHBhdGgsIHZhbCwgbm9UaW1lKSB7XG5cdC8vIEFzc2lnbiB2YWx1ZSB0byBvYmplY3QgcGF0aFxuXHR0aGlzLnBhdGhTb2x2ZXIucHVzaCh0aGlzLl9kYXRhLCBwYXRoLCB2YWwpO1xufTtcblxuLyoqXG4gKiBTdG9wcyB0aGUgb3BlcmF0aW9uIHRpbWVyLlxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2RhdGEudGltZS5zdG9wTXMgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0dGhpcy5fZGF0YS50aW1lLnRvdGFsTXMgPSB0aGlzLl9kYXRhLnRpbWUuc3RvcE1zIC0gdGhpcy5fZGF0YS50aW1lLnN0YXJ0TXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9wZXJhdGlvbjsiLCJ2YXIgU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKTtcblxuLyoqXG4gKiBBbGxvd3MgYSBtZXRob2QgdG8gYmUgb3ZlcmxvYWRlZC5cbiAqIEBwYXJhbSBhcnJcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn1cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgT3ZlcmxvYWQgPSBmdW5jdGlvbiAoYXJyKSB7XG5cdGlmIChhcnIpIHtcblx0XHR2YXIgYXJySW5kZXgsXG5cdFx0XHRhcnJDb3VudCA9IGFyci5sZW5ndGg7XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdFx0aWYgKGFyclthcnJJbmRleF0ubGVuZ3RoID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGFyclthcnJJbmRleF0uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9O1xuXHR9XG5cblx0cmV0dXJuIGZ1bmN0aW9uICgpIHt9O1xufTtcblxuU2hhcmVkLm1vZHVsZXMuT3ZlcmxvYWQgPSBPdmVybG9hZDtcblxubW9kdWxlLmV4cG9ydHMgPSBPdmVybG9hZDsiLCJ2YXIgU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKTtcblxuLyoqXG4gKiBQYXRoIG9iamVjdCB1c2VkIHRvIHJlc29sdmUgb2JqZWN0IHBhdGhzIGFuZCByZXRyaWV2ZSBkYXRhIGZyb21cbiAqIG9iamVjdHMgYnkgdXNpbmcgcGF0aHMuXG4gKiBAcGFyYW0ge1N0cmluZz19IHBhdGggVGhlIHBhdGggdG8gYXNzaWduLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBQYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5QYXRoLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKHBhdGgpIHtcblx0aWYgKHBhdGgpIHtcblx0XHR0aGlzLnBhdGgocGF0aCk7XG5cdH1cbn07XG5cblNoYXJlZC5tb2R1bGVzLlBhdGggPSBQYXRoO1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBnaXZlbiBwYXRoIGZvciB0aGUgUGF0aCBpbnN0YW5jZS5cbiAqIEBwYXJhbSB7U3RyaW5nPX0gcGF0aCBUaGUgcGF0aCB0byBhc3NpZ24uXG4gKi9cblBhdGgucHJvdG90eXBlLnBhdGggPSBmdW5jdGlvbiAocGF0aCkge1xuXHRpZiAocGF0aCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcGF0aCA9IHRoaXMuY2xlYW4ocGF0aCk7XG5cdFx0dGhpcy5fcGF0aFBhcnRzID0gdGhpcy5fcGF0aC5zcGxpdCgnLicpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX3BhdGg7XG59O1xuXG4vKipcbiAqIFRlc3RzIGlmIHRoZSBwYXNzZWQgb2JqZWN0IGhhcyB0aGUgcGF0aHMgdGhhdCBhcmUgc3BlY2lmaWVkIGFuZCB0aGF0XG4gKiBhIHZhbHVlIGV4aXN0cyBpbiB0aG9zZSBwYXRocy5cbiAqIEBwYXJhbSB7T2JqZWN0fSB0ZXN0S2V5cyBUaGUgb2JqZWN0IGRlc2NyaWJpbmcgdGhlIHBhdGhzIHRvIHRlc3QgZm9yLlxuICogQHBhcmFtIHtPYmplY3R9IHRlc3RPYmogVGhlIG9iamVjdCB0byB0ZXN0IHBhdGhzIGFnYWluc3QuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgb2JqZWN0IHBhdGhzIGV4aXN0LlxuICovXG5QYXRoLnByb3RvdHlwZS5oYXNPYmplY3RQYXRocyA9IGZ1bmN0aW9uICh0ZXN0S2V5cywgdGVzdE9iaikge1xuXHR2YXIgcmVzdWx0ID0gdHJ1ZSxcblx0XHRpO1xuXG5cdGZvciAoaSBpbiB0ZXN0S2V5cykge1xuXHRcdGlmICh0ZXN0S2V5cy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0aWYgKHRlc3RPYmpbaV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0eXBlb2YgdGVzdEtleXNbaV0gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdC8vIFJlY3Vyc2Ugb2JqZWN0XG5cdFx0XHRcdHJlc3VsdCA9IHRoaXMuaGFzT2JqZWN0UGF0aHModGVzdEtleXNbaV0sIHRlc3RPYmpbaV0pO1xuXG5cdFx0XHRcdC8vIFNob3VsZCB3ZSBleGl0IGVhcmx5P1xuXHRcdFx0XHRpZiAoIXJlc3VsdCkge1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIENvdW50cyB0aGUgdG90YWwgbnVtYmVyIG9mIGtleSBlbmRwb2ludHMgaW4gdGhlIHBhc3NlZCBvYmplY3QuXG4gKiBAcGFyYW0ge09iamVjdH0gdGVzdE9iaiBUaGUgb2JqZWN0IHRvIGNvdW50IGtleSBlbmRwb2ludHMgZm9yLlxuICogQHJldHVybnMge051bWJlcn0gVGhlIG51bWJlciBvZiBlbmRwb2ludHMuXG4gKi9cblBhdGgucHJvdG90eXBlLmNvdW50S2V5cyA9IGZ1bmN0aW9uICh0ZXN0T2JqKSB7XG5cdHZhciB0b3RhbEtleXMgPSAwLFxuXHRcdGk7XG5cblx0Zm9yIChpIGluIHRlc3RPYmopIHtcblx0XHRpZiAodGVzdE9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0aWYgKHRlc3RPYmpbaV0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIHRlc3RPYmpbaV0gIT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0dG90YWxLZXlzKys7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dG90YWxLZXlzICs9IHRoaXMuY291bnRLZXlzKHRlc3RPYmpbaV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRvdGFsS2V5cztcbn07XG5cbi8qKlxuICogVGVzdHMgaWYgdGhlIHBhc3NlZCBvYmplY3QgaGFzIHRoZSBwYXRocyB0aGF0IGFyZSBzcGVjaWZpZWQgYW5kIHRoYXRcbiAqIGEgdmFsdWUgZXhpc3RzIGluIHRob3NlIHBhdGhzIGFuZCBpZiBzbyByZXR1cm5zIHRoZSBudW1iZXIgbWF0Y2hlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSB0ZXN0S2V5cyBUaGUgb2JqZWN0IGRlc2NyaWJpbmcgdGhlIHBhdGhzIHRvIHRlc3QgZm9yLlxuICogQHBhcmFtIHtPYmplY3R9IHRlc3RPYmogVGhlIG9iamVjdCB0byB0ZXN0IHBhdGhzIGFnYWluc3QuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBTdGF0cyBvbiB0aGUgbWF0Y2hlZCBrZXlzXG4gKi9cblBhdGgucHJvdG90eXBlLmNvdW50T2JqZWN0UGF0aHMgPSBmdW5jdGlvbiAodGVzdEtleXMsIHRlc3RPYmopIHtcblx0dmFyIG1hdGNoRGF0YSxcblx0XHRtYXRjaGVkS2V5cyA9IHt9LFxuXHRcdG1hdGNoZWRLZXlDb3VudCA9IDAsXG5cdFx0dG90YWxLZXlDb3VudCA9IDAsXG5cdFx0aTtcblxuXHRmb3IgKGkgaW4gdGVzdE9iaikge1xuXHRcdGlmICh0ZXN0T2JqLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRpZiAodHlwZW9mIHRlc3RPYmpbaV0gPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdC8vIFRoZSB0ZXN0IC8gcXVlcnkgb2JqZWN0IGtleSBpcyBhbiBvYmplY3QsIHJlY3Vyc2Vcblx0XHRcdFx0bWF0Y2hEYXRhID0gdGhpcy5jb3VudE9iamVjdFBhdGhzKHRlc3RLZXlzW2ldLCB0ZXN0T2JqW2ldKTtcblxuXHRcdFx0XHRtYXRjaGVkS2V5c1tpXSA9IG1hdGNoRGF0YS5tYXRjaGVkS2V5cztcblx0XHRcdFx0dG90YWxLZXlDb3VudCArPSBtYXRjaERhdGEudG90YWxLZXlDb3VudDtcblx0XHRcdFx0bWF0Y2hlZEtleUNvdW50ICs9IG1hdGNoRGF0YS5tYXRjaGVkS2V5Q291bnQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBUaGUgdGVzdCAvIHF1ZXJ5IG9iamVjdCBoYXMgYSBwcm9wZXJ0eSB0aGF0IGlzIG5vdCBhbiBvYmplY3Qgc28gYWRkIGl0IGFzIGEga2V5XG5cdFx0XHRcdHRvdGFsS2V5Q291bnQrKztcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgdGVzdCBrZXlzIGFsc28gaGF2ZSB0aGlzIGtleSBhbmQgaXQgaXMgYWxzbyBub3QgYW4gb2JqZWN0XG5cdFx0XHRcdGlmICh0ZXN0S2V5cyAmJiB0ZXN0S2V5c1tpXSAmJiB0eXBlb2YgdGVzdEtleXNbaV0gIT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0bWF0Y2hlZEtleXNbaV0gPSB0cnVlO1xuXHRcdFx0XHRcdG1hdGNoZWRLZXlDb3VudCsrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG1hdGNoZWRLZXlzW2ldID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdG1hdGNoZWRLZXlzOiBtYXRjaGVkS2V5cyxcblx0XHRtYXRjaGVkS2V5Q291bnQ6IG1hdGNoZWRLZXlDb3VudCxcblx0XHR0b3RhbEtleUNvdW50OiB0b3RhbEtleUNvdW50XG5cdH07XG59O1xuXG4vKipcbiAqIFRha2VzIGEgbm9uLXJlY3Vyc2l2ZSBvYmplY3QgYW5kIGNvbnZlcnRzIHRoZSBvYmplY3QgaGllcmFyY2h5IGludG9cbiAqIGEgcGF0aCBzdHJpbmcuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcGFyc2UuXG4gKiBAcGFyYW0ge0Jvb2xlYW49fSB3aXRoVmFsdWUgSWYgdHJ1ZSB3aWxsIGluY2x1ZGUgYSAndmFsdWUnIGtleSBpbiB0aGUgcmV0dXJuZWRcbiAqIG9iamVjdCB0aGF0IHJlcHJlc2VudHMgdGhlIHZhbHVlIHRoZSBvYmplY3QgcGF0aCBwb2ludHMgdG8uXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5QYXRoLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uIChvYmosIHdpdGhWYWx1ZSkge1xuXHR2YXIgcGF0aHMgPSBbXSxcblx0XHRwYXRoID0gJycsXG5cdFx0cmVzdWx0RGF0YSxcblx0XHRpLCBrO1xuXG5cdGZvciAoaSBpbiBvYmopIHtcblx0XHRpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHQvLyBTZXQgdGhlIHBhdGggdG8gdGhlIGtleVxuXHRcdFx0cGF0aCA9IGk7XG5cblx0XHRcdGlmICh0eXBlb2Yob2JqW2ldKSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0aWYgKHdpdGhWYWx1ZSkge1xuXHRcdFx0XHRcdHJlc3VsdERhdGEgPSB0aGlzLnBhcnNlKG9ialtpXSwgd2l0aFZhbHVlKTtcblxuXHRcdFx0XHRcdGZvciAoayA9IDA7IGsgPCByZXN1bHREYXRhLmxlbmd0aDsgaysrKSB7XG5cdFx0XHRcdFx0XHRwYXRocy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0cGF0aDogcGF0aCArICcuJyArIHJlc3VsdERhdGFba10ucGF0aCxcblx0XHRcdFx0XHRcdFx0dmFsdWU6IHJlc3VsdERhdGFba10udmFsdWVcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHREYXRhID0gdGhpcy5wYXJzZShvYmpbaV0pO1xuXG5cdFx0XHRcdFx0Zm9yIChrID0gMDsgayA8IHJlc3VsdERhdGEubGVuZ3RoOyBrKyspIHtcblx0XHRcdFx0XHRcdHBhdGhzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRwYXRoOiBwYXRoICsgJy4nICsgcmVzdWx0RGF0YVtrXS5wYXRoXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh3aXRoVmFsdWUpIHtcblx0XHRcdFx0XHRwYXRocy5wdXNoKHtcblx0XHRcdFx0XHRcdHBhdGg6IHBhdGgsXG5cdFx0XHRcdFx0XHR2YWx1ZTogb2JqW2ldXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGF0aHMucHVzaCh7XG5cdFx0XHRcdFx0XHRwYXRoOiBwYXRoXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcGF0aHM7XG59O1xuXG4vKipcbiAqIFRha2VzIGEgbm9uLXJlY3Vyc2l2ZSBvYmplY3QgYW5kIGNvbnZlcnRzIHRoZSBvYmplY3QgaGllcmFyY2h5IGludG9cbiAqIGFuIGFycmF5IG9mIHBhdGggc3RyaW5ncyB0aGF0IGFsbG93IHlvdSB0byB0YXJnZXQgYWxsIHBvc3NpYmxlIHBhdGhzXG4gKiBpbiBhbiBvYmplY3QuXG4gKlxuICogQHJldHVybnMge0FycmF5fVxuICovXG5QYXRoLnByb3RvdHlwZS5wYXJzZUFyciA9IGZ1bmN0aW9uIChvYmosIG9wdGlvbnMpIHtcblx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cdHJldHVybiB0aGlzLl9wYXJzZUFycihvYmosICcnLCBbXSwgb3B0aW9ucyk7XG59O1xuXG5QYXRoLnByb3RvdHlwZS5fcGFyc2VBcnIgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBwYXRocywgb3B0aW9ucykge1xuXHR2YXIgaSxcblx0XHRuZXdQYXRoID0gJyc7XG5cblx0cGF0aCA9IHBhdGggfHwgJyc7XG5cdHBhdGhzID0gcGF0aHMgfHwgW107XG5cblx0Zm9yIChpIGluIG9iaikge1xuXHRcdGlmIChvYmouaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGlmICghb3B0aW9ucy5pZ25vcmUgfHwgKG9wdGlvbnMuaWdub3JlICYmICFvcHRpb25zLmlnbm9yZS50ZXN0KGkpKSkge1xuXHRcdFx0XHRpZiAocGF0aCkge1xuXHRcdFx0XHRcdG5ld1BhdGggPSBwYXRoICsgJy4nICsgaTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRuZXdQYXRoID0gaTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0eXBlb2Yob2JqW2ldKSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHR0aGlzLl9wYXJzZUFycihvYmpbaV0sIG5ld1BhdGgsIHBhdGhzLCBvcHRpb25zKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwYXRocy5wdXNoKG5ld1BhdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHBhdGhzO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2YWx1ZShzKSB0aGF0IHRoZSBvYmplY3QgY29udGFpbnMgZm9yIHRoZSBjdXJyZW50bHkgYXNzaWduZWQgcGF0aCBzdHJpbmcuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gZXZhbHVhdGUgdGhlIHBhdGggYWdhaW5zdC5cbiAqIEBwYXJhbSB7U3RyaW5nPX0gcGF0aCBBIHBhdGggdG8gdXNlIGluc3RlYWQgb2YgdGhlIGV4aXN0aW5nIG9uZSBwYXNzZWQgaW4gcGF0aCgpLlxuICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiB2YWx1ZXMgZm9yIHRoZSBnaXZlbiBwYXRoLlxuICovXG5QYXRoLnByb3RvdHlwZS52YWx1ZSA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcblx0aWYgKG9iaiAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG5cdFx0dmFyIHBhdGhQYXJ0cyxcblx0XHRcdGFycixcblx0XHRcdGFyckNvdW50LFxuXHRcdFx0b2JqUGFydCxcblx0XHRcdG9ialBhcnRQYXJlbnQsXG5cdFx0XHR2YWx1ZXNBcnIgPSBbXSxcblx0XHRcdGksIGs7XG5cblx0XHRpZiAocGF0aCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRwYXRoID0gdGhpcy5jbGVhbihwYXRoKTtcblx0XHRcdHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcblx0XHR9XG5cblx0XHRhcnIgPSBwYXRoUGFydHMgfHwgdGhpcy5fcGF0aFBhcnRzO1xuXHRcdGFyckNvdW50ID0gYXJyLmxlbmd0aDtcblx0XHRvYmpQYXJ0ID0gb2JqO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IGFyckNvdW50OyBpKyspIHtcblx0XHRcdG9ialBhcnQgPSBvYmpQYXJ0W2FycltpXV07XG5cblx0XHRcdGlmIChvYmpQYXJ0UGFyZW50IGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0Ly8gU2VhcmNoIGluc2lkZSB0aGUgYXJyYXkgZm9yIHRoZSBuZXh0IGtleVxuXHRcdFx0XHRmb3IgKGsgPSAwOyBrIDwgb2JqUGFydFBhcmVudC5sZW5ndGg7IGsrKykge1xuXHRcdFx0XHRcdHZhbHVlc0FyciA9IHZhbHVlc0Fyci5jb25jYXQodGhpcy52YWx1ZShvYmpQYXJ0UGFyZW50LCBrICsgJy4nICsgYXJyW2ldKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gdmFsdWVzQXJyO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKCFvYmpQYXJ0IHx8IHR5cGVvZihvYmpQYXJ0KSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRvYmpQYXJ0UGFyZW50ID0gb2JqUGFydDtcblx0XHR9XG5cblx0XHRyZXR1cm4gW29ialBhcnRdO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBbXTtcblx0fVxufTtcblxuLyoqXG4gKiBTZXRzIGEgdmFsdWUgb24gYW4gb2JqZWN0IGZvciB0aGUgc3BlY2lmaWVkIHBhdGguXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggdG8gdXBkYXRlLlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHNldCB0aGUgb2JqZWN0IHBhdGggdG8uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuUGF0aC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsKSB7XG5cdGlmIChvYmogIT09IHVuZGVmaW5lZCAmJiBwYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHR2YXIgcGF0aFBhcnRzLFxuXHRcdFx0cGFydDtcblxuXHRcdHBhdGggPSB0aGlzLmNsZWFuKHBhdGgpO1xuXHRcdHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcblxuXHRcdHBhcnQgPSBwYXRoUGFydHMuc2hpZnQoKTtcblxuXHRcdGlmIChwYXRoUGFydHMubGVuZ3RoKSB7XG5cdFx0XHQvLyBHZW5lcmF0ZSB0aGUgcGF0aCBwYXJ0IGluIHRoZSBvYmplY3QgaWYgaXQgZG9lcyBub3QgYWxyZWFkeSBleGlzdFxuXHRcdFx0b2JqW3BhcnRdID0gb2JqW3BhcnRdIHx8IHt9O1xuXG5cdFx0XHQvLyBSZWN1cnNlXG5cdFx0XHR0aGlzLnNldChvYmpbcGFydF0sIHBhdGhQYXJ0cy5qb2luKCcuJyksIHZhbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFNldCB0aGUgdmFsdWVcblx0XHRcdG9ialtwYXJ0XSA9IHZhbDtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gb2JqO1xufTtcblxuUGF0aC5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCkge1xuXHRyZXR1cm4gdGhpcy52YWx1ZShvYmosIHBhdGgpWzBdO1xufTtcblxuLyoqXG4gKiBQdXNoIGEgdmFsdWUgdG8gYW4gYXJyYXkgb24gYW4gb2JqZWN0IGZvciB0aGUgc3BlY2lmaWVkIHBhdGguXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggdG8gdGhlIGFycmF5IHRvIHB1c2ggdG8uXG4gKiBAcGFyYW0geyp9IHZhbCBUaGUgdmFsdWUgdG8gcHVzaCB0byB0aGUgYXJyYXkgYXQgdGhlIG9iamVjdCBwYXRoLlxuICogQHJldHVybnMgeyp9XG4gKi9cblBhdGgucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWwpIHtcblx0aWYgKG9iaiAhPT0gdW5kZWZpbmVkICYmIHBhdGggIT09IHVuZGVmaW5lZCkge1xuXHRcdHZhciBwYXRoUGFydHMsXG5cdFx0XHRwYXJ0O1xuXG5cdFx0cGF0aCA9IHRoaXMuY2xlYW4ocGF0aCk7XG5cdFx0cGF0aFBhcnRzID0gcGF0aC5zcGxpdCgnLicpO1xuXG5cdFx0cGFydCA9IHBhdGhQYXJ0cy5zaGlmdCgpO1xuXG5cdFx0aWYgKHBhdGhQYXJ0cy5sZW5ndGgpIHtcblx0XHRcdC8vIEdlbmVyYXRlIHRoZSBwYXRoIHBhcnQgaW4gdGhlIG9iamVjdCBpZiBpdCBkb2VzIG5vdCBhbHJlYWR5IGV4aXN0XG5cdFx0XHRvYmpbcGFydF0gPSBvYmpbcGFydF0gfHwge307XG5cblx0XHRcdC8vIFJlY3Vyc2Vcblx0XHRcdHRoaXMuc2V0KG9ialtwYXJ0XSwgcGF0aFBhcnRzLmpvaW4oJy4nKSwgdmFsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gU2V0IHRoZSB2YWx1ZVxuXHRcdFx0b2JqW3BhcnRdID0gb2JqW3BhcnRdIHx8IFtdO1xuXG5cdFx0XHRpZiAob2JqW3BhcnRdIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0b2JqW3BhcnRdLnB1c2godmFsKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93KCdDYW5ub3QgcHVzaCB0byBhIHBhdGggd2hvc2UgZW5kcG9pbnQgaXMgbm90IGFuIGFycmF5IScpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBvYmo7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHZhbHVlKHMpIHRoYXQgdGhlIG9iamVjdCBjb250YWlucyBmb3IgdGhlIGN1cnJlbnRseSBhc3NpZ25lZCBwYXRoIHN0cmluZ1xuICogd2l0aCB0aGVpciBhc3NvY2lhdGVkIGtleXMuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gZXZhbHVhdGUgdGhlIHBhdGggYWdhaW5zdC5cbiAqIEBwYXJhbSB7U3RyaW5nPX0gcGF0aCBBIHBhdGggdG8gdXNlIGluc3RlYWQgb2YgdGhlIGV4aXN0aW5nIG9uZSBwYXNzZWQgaW4gcGF0aCgpLlxuICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiB2YWx1ZXMgZm9yIHRoZSBnaXZlbiBwYXRoIHdpdGggdGhlIGFzc29jaWF0ZWQga2V5LlxuICovXG5QYXRoLnByb3RvdHlwZS5rZXlWYWx1ZSA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcblx0dmFyIHBhdGhQYXJ0cyxcblx0XHRhcnIsXG5cdFx0YXJyQ291bnQsXG5cdFx0b2JqUGFydCxcblx0XHRvYmpQYXJ0UGFyZW50LFxuXHRcdG9ialBhcnRIYXNoLFxuXHRcdGk7XG5cblx0aWYgKHBhdGggIT09IHVuZGVmaW5lZCkge1xuXHRcdHBhdGggPSB0aGlzLmNsZWFuKHBhdGgpO1xuXHRcdHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcblx0fVxuXG5cdGFyciA9IHBhdGhQYXJ0cyB8fCB0aGlzLl9wYXRoUGFydHM7XG5cdGFyckNvdW50ID0gYXJyLmxlbmd0aDtcblx0b2JqUGFydCA9IG9iajtcblxuXHRmb3IgKGkgPSAwOyBpIDwgYXJyQ291bnQ7IGkrKykge1xuXHRcdG9ialBhcnQgPSBvYmpQYXJ0W2FycltpXV07XG5cblx0XHRpZiAoIW9ialBhcnQgfHwgdHlwZW9mKG9ialBhcnQpICE9PSAnb2JqZWN0Jykge1xuXHRcdFx0b2JqUGFydEhhc2ggPSBhcnJbaV0gKyAnOicgKyBvYmpQYXJ0O1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0b2JqUGFydFBhcmVudCA9IG9ialBhcnQ7XG5cdH1cblxuXHRyZXR1cm4gb2JqUGFydEhhc2g7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgbGVhZGluZyBwZXJpb2QgKC4pIGZyb20gc3RyaW5nIGFuZCByZXR1cm5zIGl0LlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBUaGUgc3RyaW5nIHRvIGNsZWFuLlxuICogQHJldHVybnMgeyp9XG4gKi9cblBhdGgucHJvdG90eXBlLmNsZWFuID0gZnVuY3Rpb24gKHN0cikge1xuXHRpZiAoc3RyLnN1YnN0cigwLCAxKSA9PT0gJy4nKSB7XG5cdFx0c3RyID0gc3RyLnN1YnN0cigxLCBzdHIubGVuZ3RoIC0xKTtcblx0fVxuXG5cdHJldHVybiBzdHI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFBhdGg7IiwiLy8gSW1wb3J0IGV4dGVybmFsIG5hbWVzIGxvY2FsbHlcbnZhciBTaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpLFxuXHRDb3JlLFxuXHRDb2xsZWN0aW9uLFxuXHRDb2xsZWN0aW9uRHJvcCxcblx0Q29sbGVjdGlvbkdyb3VwLFxuXHRDb2xsZWN0aW9uSW5pdCxcblx0Q29yZUluaXQsXG5cdE92ZXJsb2FkLFxuXHRQZXJzaXN0O1xuXG5QZXJzaXN0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblBlcnNpc3QucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoZGIpIHtcblx0Ly8gQ2hlY2sgZW52aXJvbm1lbnRcblx0aWYgKGRiLmlzQ2xpZW50KCkpIHtcblx0XHRpZiAoU3RvcmFnZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLm1vZGUoJ2xvY2FsU3RvcmFnZScpO1xuXHRcdH1cblx0fVxufTtcblxuU2hhcmVkLm1vZHVsZXMuUGVyc2lzdCA9IFBlcnNpc3Q7XG5cbkNvcmUgPSBTaGFyZWQubW9kdWxlcy5Db3JlO1xuQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vQ29sbGVjdGlvbicpO1xuQ29sbGVjdGlvbkRyb3AgPSBDb2xsZWN0aW9uLnByb3RvdHlwZS5kcm9wO1xuQ29sbGVjdGlvbkdyb3VwID0gcmVxdWlyZSgnLi9Db2xsZWN0aW9uR3JvdXAnKTtcbkNvbGxlY3Rpb25Jbml0ID0gQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdDtcbk92ZXJsb2FkID0gcmVxdWlyZSgnLi9PdmVybG9hZCcpO1xuQ29yZUluaXQgPSBDb3JlLnByb3RvdHlwZS5pbml0O1xuXG5QZXJzaXN0LnByb3RvdHlwZS5tb2RlID0gZnVuY3Rpb24gKHR5cGUpIHtcblx0aWYgKHR5cGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX21vZGUgPSB0eXBlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX21vZGU7XG59O1xuXG5QZXJzaXN0LnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKGtleSwgZGF0YSwgY2FsbGJhY2spIHtcblx0dmFyIHZhbDtcblxuXHRzd2l0Y2ggKHRoaXMubW9kZSgpKSB7XG5cdFx0Y2FzZSAnbG9jYWxTdG9yYWdlJzpcblx0XHRcdGlmICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0dmFsID0gJ2pzb246OmZkYjo6JyArIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFsID0gJ3Jhdzo6ZmRiOjonICsgZGF0YTtcblx0XHRcdH1cblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWwpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soZSk7IH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKGZhbHNlKTsgfVxuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soJ05vIGRhdGEgaGFuZGxlci4nKTsgfVxufTtcblxuUGVyc2lzdC5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uIChrZXksIGNhbGxiYWNrKSB7XG5cdHZhciB2YWwsXG5cdFx0cGFydHMsXG5cdFx0ZGF0YTtcblxuXHRzd2l0Y2ggKHRoaXMubW9kZSgpKSB7XG5cdFx0Y2FzZSAnbG9jYWxTdG9yYWdlJzpcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhbCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdGNhbGxiYWNrKGUsIG51bGwpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodmFsKSB7XG5cdFx0XHRcdHBhcnRzID0gdmFsLnNwbGl0KCc6OmZkYjo6Jyk7XG5cblx0XHRcdFx0c3dpdGNoIChwYXJ0c1swXSkge1xuXHRcdFx0XHRcdGNhc2UgJ2pzb24nOlxuXHRcdFx0XHRcdFx0ZGF0YSA9IEpTT04ucGFyc2UocGFydHNbMV0pO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRjYXNlICdyYXcnOlxuXHRcdFx0XHRcdFx0ZGF0YSA9IHBhcnRzWzFdO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soZmFsc2UsIGRhdGEpOyB9XG5cdFx0XHR9XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygnTm8gZGF0YSBoYW5kbGVyIG9yIHVucmVjb2duaXNlZCBkYXRhIHR5cGUuJyk7IH1cbn07XG5cblBlcnNpc3QucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoa2V5LCBjYWxsYmFjaykge1xuXHRzd2l0Y2ggKHRoaXMubW9kZSgpKSB7XG5cdFx0Y2FzZSAnbG9jYWxTdG9yYWdlJzpcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjayhlKTsgfVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soZmFsc2UpOyB9XG5cdFx0XHRicmVhaztcblx0fVxuXG5cdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygnTm8gZGF0YSBoYW5kbGVyIG9yIHVucmVjb2duaXNlZCBkYXRhIHR5cGUuJyk7IH1cbn07XG5cbi8vIEV4dGVuZCB0aGUgQ29sbGVjdGlvbiBwcm90b3R5cGUgd2l0aCBwZXJzaXN0IG1ldGhvZHNcbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAocmVtb3ZlUGVyc2lzdGVudCkge1xuXHQvLyBSZW1vdmUgcGVyc2lzdGVudCBzdG9yYWdlXG5cdGlmIChyZW1vdmVQZXJzaXN0ZW50KSB7XG5cdFx0aWYgKHRoaXMuX25hbWUpIHtcblx0XHRcdGlmICh0aGlzLl9kYikge1xuXHRcdFx0XHQvLyBTYXZlIHRoZSBjb2xsZWN0aW9uIGRhdGFcblx0XHRcdFx0dGhpcy5fZGIucGVyc2lzdC5kcm9wKHRoaXMuX25hbWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCdDYW5ub3QgZHJvcCBhIGNvbGxlY3Rpb25cXCdzIHBlcnNpc3RlbnQgc3RvcmFnZSB3aGVuIHRoZSBjb2xsZWN0aW9uIGlzIG5vdCBhdHRhY2hlZCB0byBhIGRhdGFiYXNlIScpOyB9XG5cdFx0XHRcdHJldHVybiAnQ2Fubm90IGRyb3AgYSBjb2xsZWN0aW9uXFwncyBwZXJzaXN0ZW50IHN0b3JhZ2Ugd2hlbiB0aGUgY29sbGVjdGlvbiBpcyBub3QgYXR0YWNoZWQgdG8gYSBkYXRhYmFzZSEnO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soJ0Nhbm5vdCBkcm9wIGEgY29sbGVjdGlvblxcJ3MgcGVyc2lzdGVudCBzdG9yYWdlIHdoZW4gbm8gbmFtZSBhc3NpZ25lZCB0byBjb2xsZWN0aW9uIScpOyB9XG5cdFx0XHRyZXR1cm4gJ0Nhbm5vdCBkcm9wIGEgY29sbGVjdGlvblxcJ3MgcGVyc2lzdGVudCBzdG9yYWdlIHdoZW4gbm8gbmFtZSBhc3NpZ25lZCB0byBjb2xsZWN0aW9uISc7XG5cdFx0fVxuXHR9XG5cblx0Ly8gQ2FsbCB0aGUgb3JpZ2luYWwgbWV0aG9kXG5cdENvbGxlY3Rpb25Ecm9wLmFwcGx5KHRoaXMpO1xufTtcblxuQ29sbGVjdGlvbi5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXHRpZiAodGhpcy5fbmFtZSkge1xuXHRcdGlmICh0aGlzLl9kYikge1xuXHRcdFx0Ly8gU2F2ZSB0aGUgY29sbGVjdGlvbiBkYXRhXG5cdFx0XHR0aGlzLl9kYi5wZXJzaXN0LnNhdmUodGhpcy5fbmFtZSwgdGhpcy5fZGF0YSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygnQ2Fubm90IHNhdmUgYSBjb2xsZWN0aW9uIHRoYXQgaXMgbm90IGF0dGFjaGVkIHRvIGEgZGF0YWJhc2UhJyk7IH1cblx0XHRcdHJldHVybiAnQ2Fubm90IHNhdmUgYSBjb2xsZWN0aW9uIHRoYXQgaXMgbm90IGF0dGFjaGVkIHRvIGEgZGF0YWJhc2UhJztcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCdDYW5ub3Qgc2F2ZSBhIGNvbGxlY3Rpb24gd2l0aCBubyBhc3NpZ25lZCBuYW1lIScpOyB9XG5cdFx0cmV0dXJuICdDYW5ub3Qgc2F2ZSBhIGNvbGxlY3Rpb24gd2l0aCBubyBhc3NpZ25lZCBuYW1lISc7XG5cdH1cbn07XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdGlmICh0aGlzLl9uYW1lKSB7XG5cdFx0aWYgKHRoaXMuX2RiKSB7XG5cdFx0XHQvLyBMb2FkIHRoZSBjb2xsZWN0aW9uIGRhdGFcblx0XHRcdHRoaXMuX2RiLnBlcnNpc3QubG9hZCh0aGlzLl9uYW1lLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG5cdFx0XHRcdGlmICghZXJyKSB7XG5cdFx0XHRcdFx0aWYgKGRhdGEpIHtcblx0XHRcdFx0XHRcdHNlbGYuc2V0RGF0YShkYXRhKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKGZhbHNlKTsgfVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjayhlcnIpOyB9XG5cdFx0XHRcdFx0cmV0dXJuIGVycjtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygnQ2Fubm90IGxvYWQgYSBjb2xsZWN0aW9uIHRoYXQgaXMgbm90IGF0dGFjaGVkIHRvIGEgZGF0YWJhc2UhJyk7IH1cblx0XHRcdHJldHVybiAnQ2Fubm90IGxvYWQgYSBjb2xsZWN0aW9uIHRoYXQgaXMgbm90IGF0dGFjaGVkIHRvIGEgZGF0YWJhc2UhJztcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCdDYW5ub3QgbG9hZCBhIGNvbGxlY3Rpb24gd2l0aCBubyBhc3NpZ25lZCBuYW1lIScpOyB9XG5cdFx0cmV0dXJuICdDYW5ub3QgbG9hZCBhIGNvbGxlY3Rpb24gd2l0aCBubyBhc3NpZ25lZCBuYW1lISc7XG5cdH1cbn07XG5cbi8vIE92ZXJyaWRlIHRoZSBEQiBpbml0IHRvIGluc3RhbnRpYXRlIHRoZSBwbHVnaW5cbkNvcmUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMucGVyc2lzdCA9IG5ldyBQZXJzaXN0KHRoaXMpO1xuXHRDb3JlSW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQZXJzaXN0OyIsInZhciBTaGFyZWQgPSB7XG5cdGlkQ291bnRlcjogMCxcblx0bW9kdWxlczoge30sXG5cdHByb3RvdHlwZXM6IHt9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNoYXJlZDsiLCIvLyBJbXBvcnQgZXh0ZXJuYWwgbmFtZXMgbG9jYWxseVxudmFyIFNoYXJlZCxcblx0Q29yZSxcblx0Q29sbGVjdGlvbixcblx0Q29sbGVjdGlvbkluaXQsXG5cdENvcmVJbml0LFxuXHRPdmVybG9hZDtcblxuU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKTtcblxuLyoqXG4gKiBUaGUgdmlldyBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB2aWV3TmFtZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBWaWV3ID0gZnVuY3Rpb24gKG5hbWUsIHF1ZXJ5LCBvcHRpb25zKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuVmlldy5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChuYW1lLCBxdWVyeSwgb3B0aW9ucykge1xuXHR0aGlzLl9uYW1lID0gbmFtZTtcblx0dGhpcy5fY29sbGVjdGlvbnMgPSBbXTtcblx0dGhpcy5fZ3JvdXBzID0gW107XG5cdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xuXHR0aGlzLl9xdWVyeVNldHRpbmdzID0ge1xuXHRcdHF1ZXJ5OiBxdWVyeSxcblx0XHRvcHRpb25zOiBvcHRpb25zXG5cdH07XG5cdHRoaXMuX2RlYnVnID0ge307XG5cblx0dGhpcy5fcHJpdmF0ZURhdGEgPSBuZXcgQ29sbGVjdGlvbignX19GREJfX3ZpZXdfcHJpdmF0ZURhdGFfJyArIHRoaXMuX25hbWUpO1xufTtcblxuU2hhcmVkLm1vZHVsZXMuVmlldyA9IFZpZXc7XG5cbkNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24nKTtcbk92ZXJsb2FkID0gcmVxdWlyZSgnLi9PdmVybG9hZCcpO1xuQ29sbGVjdGlvbkluaXQgPSBDb2xsZWN0aW9uLnByb3RvdHlwZS5pbml0O1xuQ29yZSA9IFNoYXJlZC5tb2R1bGVzLkNvcmU7XG5Db3JlSW5pdCA9IENvcmUucHJvdG90eXBlLmluaXQ7XG5cblZpZXcucHJvdG90eXBlLmRlYnVnID0gbmV3IE92ZXJsb2FkKFtcblx0ZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9kZWJ1Zy5hbGw7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKHZhbCkge1xuXHRcdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aWYgKHR5cGVvZiB2YWwgPT09ICdib29sZWFuJykge1xuXHRcdFx0XHR0aGlzLl9kZWJ1Zy5hbGwgPSB2YWw7XG5cdFx0XHRcdHRoaXMucHJpdmF0ZURhdGEoKS5kZWJ1Zyh2YWwpO1xuXHRcdFx0XHR0aGlzLnB1YmxpY0RhdGEoKS5kZWJ1Zyh2YWwpO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9kZWJ1Zy5hbGw7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2RlYnVnLmFsbDtcblx0fSxcblxuXHRmdW5jdGlvbiAodHlwZSwgdmFsKSB7XG5cdFx0aWYgKHR5cGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHRoaXMuX2RlYnVnW3R5cGVdID0gdmFsO1xuXHRcdFx0XHR0aGlzLnByaXZhdGVEYXRhKCkuZGVidWcodHlwZSwgdmFsKTtcblx0XHRcdFx0dGhpcy5wdWJsaWNEYXRhKCkuZGVidWcodHlwZSwgdmFsKTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLl9kZWJ1Z1t0eXBlXTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5fZGVidWcuYWxsO1xuXHR9XG5dKTtcblxuVmlldy5wcm90b3R5cGUubmFtZSA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fbmFtZSA9IHZhbDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9uYW1lO1xufTtcblxuLyoqXG4gKiBRdWVyaWVzIHRoZSB2aWV3IGRhdGEuIFNlZSBDb2xsZWN0aW9uLmZpbmQoKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5WaWV3LnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHF1ZXJ5LCBvcHRpb25zKSB7XG5cdHJldHVybiB0aGlzLnB1YmxpY0RhdGEoKS5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcbn07XG5cbi8qKlxuICogSW5zZXJ0cyBpbnRvIHZpZXcgZGF0YSB2aWEgdGhlIHZpZXcgY29sbGVjdGlvbi4gU2VlIENvbGxlY3Rpb24uaW5zZXJ0KCkgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuVmlldy5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGRhdGEsIGluZGV4LCBjYWxsYmFjaykge1xuXHQvLyBEZWNvdXBsZSB0aGUgZGF0YSB0byBlbnN1cmUgd2UgYXJlIHdvcmtpbmcgd2l0aCBvdXIgb3duIGNvcHlcblx0ZGF0YSA9IHRoaXMuX3ByaXZhdGVEYXRhLmRlY291cGxlKGRhdGEpO1xuXG5cdGlmICh0eXBlb2YoaW5kZXgpID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Y2FsbGJhY2sgPSBpbmRleDtcblx0XHRpbmRleCA9IHRoaXMuX3ByaXZhdGVEYXRhLmxlbmd0aDtcblx0fSBlbHNlIGlmIChpbmRleCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0aW5kZXggPSB0aGlzLl9wcml2YXRlRGF0YS5sZW5ndGg7XG5cdH1cblxuXHQvLyBNb2RpZnkgdHJhbnNmb3JtIGRhdGFcblx0dGhpcy5fdHJhbnNmb3JtSW5zZXJ0KGRhdGEsIGluZGV4KTtcblxuXHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5WaWV3OiBJbnNlcnRpbmcgc29tZSBkYXRhIG9uIHZpZXcgXCInICsgdGhpcy5uYW1lKCkgKyAnXCIgaW4gdW5kZXJseWluZyAoaW50ZXJuYWwpIHZpZXcgY29sbGVjdGlvbiBcIicgKyB0aGlzLl9wcml2YXRlRGF0YS5uYW1lKCkgKyAnXCInKTtcblx0fVxuXG5cdHJldHVybiB0aGlzLl9wcml2YXRlRGF0YS5faW5zZXJ0SGFuZGxlKGRhdGEsIGluZGV4LCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgaW50byB2aWV3IGRhdGEgdmlhIHRoZSB2aWV3IGNvbGxlY3Rpb24uIFNlZSBDb2xsZWN0aW9uLnVwZGF0ZSgpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgeyp9XG4gKi9cblZpZXcucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChxdWVyeSwgdXBkYXRlKSB7XG5cdC8vIE1vZGlmeSB0cmFuc2Zvcm0gZGF0YVxuXHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5WaWV3OiBVcGRhdGluZyBzb21lIGRhdGEgb24gdmlldyBcIicgKyB0aGlzLm5hbWUoKSArICdcIiBpbiB1bmRlcmx5aW5nIChpbnRlcm5hbCkgdmlldyBjb2xsZWN0aW9uIFwiJyArIHRoaXMuX3ByaXZhdGVEYXRhLm5hbWUoKSArICdcIicpO1xuXHR9XG5cblx0dmFyIHVwZGF0ZXMgPSB0aGlzLl9wcml2YXRlRGF0YS51cGRhdGUocXVlcnksIHVwZGF0ZSksXG5cdFx0cHJpbWFyeUtleSxcblx0XHR0UXVlcnksXG5cdFx0aXRlbTtcblxuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCAmJiB0aGlzLl90cmFuc2Zvcm1Jbikge1xuXHRcdHByaW1hcnlLZXkgPSB0aGlzLl9wdWJsaWNEYXRhLnByaW1hcnlLZXkoKTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdXBkYXRlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dFF1ZXJ5ID0ge307XG5cdFx0XHRpdGVtID0gdXBkYXRlc1tpXTtcblx0XHRcdHRRdWVyeVtwcmltYXJ5S2V5XSA9IGl0ZW1bcHJpbWFyeUtleV07XG5cblx0XHRcdHRoaXMuX3RyYW5zZm9ybVVwZGF0ZSh0UXVlcnksIGl0ZW0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB1cGRhdGVzO1xufTtcblxuLyoqXG4gKiBSZW1vdmVkIGZyb20gdmlldyBkYXRhIHZpYSB0aGUgdmlldyBjb2xsZWN0aW9uLiBTZWUgQ29sbGVjdGlvbi5yZW1vdmUoKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5WaWV3LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAocXVlcnkpIHtcblx0Ly8gTW9kaWZ5IHRyYW5zZm9ybSBkYXRhXG5cdHRoaXMuX3RyYW5zZm9ybVJlbW92ZShxdWVyeSk7XG5cblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuVmlldzogUmVtb3Zpbmcgc29tZSBkYXRhIG9uIHZpZXcgXCInICsgdGhpcy5uYW1lKCkgKyAnXCIgaW4gdW5kZXJseWluZyAoaW50ZXJuYWwpIHZpZXcgY29sbGVjdGlvbiBcIicgKyB0aGlzLl9wcml2YXRlRGF0YS5uYW1lKCkgKyAnXCInKTtcblx0fVxuXG5cdHJldHVybiB0aGlzLl9wcml2YXRlRGF0YS5yZW1vdmUocXVlcnkpO1xufTtcblxuVmlldy5wcm90b3R5cGUubGluayA9IGZ1bmN0aW9uIChvdXRwdXRUYXJnZXRTZWxlY3RvciwgdGVtcGxhdGVTZWxlY3Rvcikge1xuXHR2YXIgcHVibGljRGF0YSA9IHRoaXMucHVibGljRGF0YSgpO1xuXHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5WaWV3OiBTZXR0aW5nIHVwIGRhdGEgYmluZGluZyBvbiB2aWV3IFwiJyArIHRoaXMubmFtZSgpICsgJ1wiIGluIHVuZGVybHlpbmcgKGludGVybmFsKSB2aWV3IGNvbGxlY3Rpb24gXCInICsgcHVibGljRGF0YS5uYW1lKCkgKyAnXCIgZm9yIG91dHB1dCB0YXJnZXQ6ICcgKyBvdXRwdXRUYXJnZXRTZWxlY3Rvcik7XG5cdH1cblx0cmV0dXJuIHB1YmxpY0RhdGEubGluayhvdXRwdXRUYXJnZXRTZWxlY3RvciwgdGVtcGxhdGVTZWxlY3Rvcik7XG59O1xuXG5WaWV3LnByb3RvdHlwZS51bmxpbmsgPSBmdW5jdGlvbiAob3V0cHV0VGFyZ2V0U2VsZWN0b3IsIHRlbXBsYXRlU2VsZWN0b3IpIHtcblx0dmFyIHB1YmxpY0RhdGEgPSB0aGlzLnB1YmxpY0RhdGEoKTtcblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuVmlldzogUmVtb3ZpbmcgZGF0YSBiaW5kaW5nIG9uIHZpZXcgXCInICsgdGhpcy5uYW1lKCkgKyAnXCIgaW4gdW5kZXJseWluZyAoaW50ZXJuYWwpIHZpZXcgY29sbGVjdGlvbiBcIicgKyBwdWJsaWNEYXRhLm5hbWUoKSArICdcIiBmb3Igb3V0cHV0IHRhcmdldDogJyArIG91dHB1dFRhcmdldFNlbGVjdG9yKTtcblx0fVxuXHRyZXR1cm4gcHVibGljRGF0YS51bmxpbmsob3V0cHV0VGFyZ2V0U2VsZWN0b3IsIHRlbXBsYXRlU2VsZWN0b3IpO1xufTtcblxuVmlldy5wcm90b3R5cGUuZnJvbSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XG5cdGlmIChjb2xsZWN0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHRpZiAodHlwZW9mKGNvbGxlY3Rpb24pID09PSAnc3RyaW5nJykge1xuXHRcdFx0Y29sbGVjdGlvbiA9IHRoaXMuX2RiLmNvbGxlY3Rpb24oY29sbGVjdGlvbik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fYWRkQ29sbGVjdGlvbihjb2xsZWN0aW9uKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuVmlldy5wcm90b3R5cGUuX2FkZENvbGxlY3Rpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbikge1xuXHRpZiAodGhpcy5fY29sbGVjdGlvbnMuaW5kZXhPZihjb2xsZWN0aW9uKSA9PT0gLTEpIHtcblx0XHR0aGlzLl9jb2xsZWN0aW9ucy5wdXNoKGNvbGxlY3Rpb24pO1xuXHRcdGNvbGxlY3Rpb24uX2FkZFZpZXcodGhpcyk7XG5cblx0XHR2YXIgY29sbERhdGEgPSBjb2xsZWN0aW9uLmZpbmQodGhpcy5fcXVlcnlTZXR0aW5ncy5xdWVyeSwgdGhpcy5fcXVlcnlTZXR0aW5ncy5vcHRpb25zKTtcblxuXHRcdHRoaXMuX3RyYW5zZm9ybVByaW1hcnlLZXkoY29sbGVjdGlvbi5wcmltYXJ5S2V5KCkpO1xuXHRcdHRoaXMuX3RyYW5zZm9ybUluc2VydChjb2xsRGF0YSk7XG5cblx0XHR0aGlzLl9wcml2YXRlRGF0YS5wcmltYXJ5S2V5KGNvbGxlY3Rpb24ucHJpbWFyeUtleSgpKTtcblx0XHR0aGlzLl9wcml2YXRlRGF0YS5pbnNlcnQoY29sbERhdGEpO1xuXHR9XG5cdHJldHVybiB0aGlzO1xufTtcblxuVmlldy5wcm90b3R5cGUuX3JlbW92ZUNvbGxlY3Rpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbikge1xuXHR2YXIgY29sbGVjdGlvbkluZGV4ID0gdGhpcy5fY29sbGVjdGlvbnMuaW5kZXhPZihjb2xsZWN0aW9uKTtcblx0aWYgKGNvbGxlY3Rpb25JbmRleCA+IC0xKSB7XG5cdFx0dGhpcy5fY29sbGVjdGlvbnMuc3BsaWNlKGNvbGxlY3Rpb24sIDEpO1xuXHRcdGNvbGxlY3Rpb24uX3JlbW92ZVZpZXcodGhpcyk7XG5cdFx0dGhpcy5fcHJpdmF0ZURhdGEucmVtb3ZlKGNvbGxlY3Rpb24uZmluZCh0aGlzLl9xdWVyeVNldHRpbmdzLnF1ZXJ5LCB0aGlzLl9xdWVyeVNldHRpbmdzLm9wdGlvbnMpKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuVmlldy5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX3ByaXZhdGVEYXRhLm9uLmFwcGx5KHRoaXMuX3ByaXZhdGVEYXRhLCBhcmd1bWVudHMpO1xufTtcblxuVmlldy5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9wcml2YXRlRGF0YS5vZmYuYXBwbHkodGhpcy5fcHJpdmF0ZURhdGEsIGFyZ3VtZW50cyk7XG59O1xuXG5WaWV3LnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9wcml2YXRlRGF0YS5lbWl0LmFwcGx5KHRoaXMuX3ByaXZhdGVEYXRhLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBEcm9wcyBhIHZpZXcgYW5kIGFsbCBpdCdzIHN0b3JlZCBkYXRhIGZyb20gdGhlIGRhdGFiYXNlLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgb24gc3VjY2VzcywgZmFsc2Ugb24gZmFpbHVyZS5cbiAqL1xuVmlldy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuX2NvbGxlY3Rpb25zICYmIHRoaXMuX2NvbGxlY3Rpb25zLmxlbmd0aCkge1xuXHRcdGlmICh0aGlzLmRlYnVnKCkgfHwgKHRoaXMuX2RiICYmIHRoaXMuX2RiLmRlYnVnKCkpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLlZpZXc6IERyb3BwaW5nIHZpZXcgJyArIHRoaXMuX25hbWUpO1xuXHRcdH1cblxuXHRcdHRoaXMuZW1pdCgnZHJvcCcpO1xuXG5cdFx0Ly8gTG9vcCBjb2xsZWN0aW9ucyBhbmQgcmVtb3ZlIHVzIGZyb20gdGhlbVxuXHRcdHZhciBhcnJDb3VudCA9IHRoaXMuX2NvbGxlY3Rpb25zLmxlbmd0aDtcblx0XHR3aGlsZSAoYXJyQ291bnQtLSkge1xuXHRcdFx0dGhpcy5fcmVtb3ZlQ29sbGVjdGlvbih0aGlzLl9jb2xsZWN0aW9uc1thcnJDb3VudF0pO1xuXHRcdH1cblxuXHRcdC8vIERyb3AgdGhlIHZpZXcncyBpbnRlcm5hbCBjb2xsZWN0aW9uXG5cdFx0dGhpcy5fcHJpdmF0ZURhdGEuZHJvcCgpO1xuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBEQiB0aGUgdmlldyBpcyBib3VuZCBhZ2FpbnN0LiBBdXRvbWF0aWNhbGx5IHNldFxuICogd2hlbiB0aGUgZGIub2xkVmlldyh2aWV3TmFtZSkgbWV0aG9kIGlzIGNhbGxlZC5cbiAqIEBwYXJhbSBkYlxuICogQHJldHVybnMgeyp9XG4gKi9cblZpZXcucHJvdG90eXBlLmRiID0gZnVuY3Rpb24gKGRiKSB7XG5cdGlmIChkYiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fZGIgPSBkYjtcblx0XHR0aGlzLnByaXZhdGVEYXRhKCkuZGIoZGIpO1xuXHRcdHRoaXMucHVibGljRGF0YSgpLmRiKGRiKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9kYjtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgcHJpbWFyeSBrZXkgZm9yIHRoaXMgdmlldyBmcm9tIHRoZSBhc3NpZ25lZCBjb2xsZWN0aW9uLlxuICogQHJldHVybnMge1N0cmluZ31cbiAqL1xuVmlldy5wcm90b3R5cGUucHJpbWFyeUtleSA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX3ByaXZhdGVEYXRhLnByaW1hcnlLZXkoKTtcbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIHF1ZXJ5IHRoYXQgdGhlIHZpZXcgdXNlcyB0byBidWlsZCBpdCdzIGRhdGEgc2V0LlxuICogQHBhcmFtIHtPYmplY3Q9fSBxdWVyeVxuICogQHBhcmFtIHtCb29sZWFuPX0gb3B0aW9ucyBBbiBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj19IHJlZnJlc2ggV2hldGhlciB0byByZWZyZXNoIHRoZSB2aWV3IGRhdGEgYWZ0ZXJcbiAqIHRoaXMgb3BlcmF0aW9uLiBEZWZhdWx0cyB0byB0cnVlLlxuICogQHJldHVybnMgeyp9XG4gKi9cblZpZXcucHJvdG90eXBlLnF1ZXJ5RGF0YSA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucywgcmVmcmVzaCkge1xuXHRpZiAocXVlcnkgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3F1ZXJ5U2V0dGluZ3MucXVlcnkgPSBxdWVyeTtcblx0fVxuXG5cdGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9xdWVyeVNldHRpbmdzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHR9XG5cblx0aWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQgfHwgb3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9xdWVyeVNldHRpbmdzO1xufTtcblxuLyoqXG4gKiBBZGQgZGF0YSB0byB0aGUgZXhpc3RpbmcgcXVlcnkuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBkYXRhIHdob3NlIGtleXMgd2lsbCBiZSBhZGRlZCB0byB0aGUgZXhpc3RpbmdcbiAqIHF1ZXJ5IG9iamVjdC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3ZlcndyaXRlIFdoZXRoZXIgb3Igbm90IHRvIG92ZXJ3cml0ZSBkYXRhIHRoYXQgYWxyZWFkeVxuICogZXhpc3RzIGluIHRoZSBxdWVyeSBvYmplY3QuIERlZmF1bHRzIHRvIHRydWUuXG4gKiBAcGFyYW0ge0Jvb2xlYW49fSByZWZyZXNoIFdoZXRoZXIgb3Igbm90IHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBzZXRcbiAqIG9uY2UgdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAqL1xuVmlldy5wcm90b3R5cGUucXVlcnlBZGQgPSBmdW5jdGlvbiAob2JqLCBvdmVyd3JpdGUsIHJlZnJlc2gpIHtcblx0dmFyIHF1ZXJ5ID0gdGhpcy5fcXVlcnlTZXR0aW5ncy5xdWVyeSxcblx0XHRpO1xuXG5cdGlmIChvYmogIT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIExvb3Agb2JqZWN0IHByb3BlcnRpZXMgYW5kIGFkZCB0byBleGlzdGluZyBxdWVyeVxuXHRcdGZvciAoaSBpbiBvYmopIHtcblx0XHRcdGlmIChvYmouaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdFx0aWYgKHF1ZXJ5W2ldID09PSB1bmRlZmluZWQgfHwgKHF1ZXJ5W2ldICE9PSB1bmRlZmluZWQgJiYgb3ZlcndyaXRlKSkge1xuXHRcdFx0XHRcdHF1ZXJ5W2ldID0gb2JqW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0dGhpcy5yZWZyZXNoKCk7XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGRhdGEgZnJvbSB0aGUgZXhpc3RpbmcgcXVlcnkuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBkYXRhIHdob3NlIGtleXMgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIGV4aXN0aW5nXG4gKiBxdWVyeSBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW49fSByZWZyZXNoIFdoZXRoZXIgb3Igbm90IHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBzZXRcbiAqIG9uY2UgdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAqL1xuVmlldy5wcm90b3R5cGUucXVlcnlSZW1vdmUgPSBmdW5jdGlvbiAob2JqLCByZWZyZXNoKSB7XG5cdHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5U2V0dGluZ3MucXVlcnksXG5cdFx0aTtcblxuXHRpZiAob2JqICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBMb29wIG9iamVjdCBwcm9wZXJ0aWVzIGFuZCBhZGQgdG8gZXhpc3RpbmcgcXVlcnlcblx0XHRmb3IgKGkgaW4gb2JqKSB7XG5cdFx0XHRpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRcdGRlbGV0ZSBxdWVyeVtpXTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAocmVmcmVzaCA9PT0gdW5kZWZpbmVkIHx8IHJlZnJlc2ggPT09IHRydWUpIHtcblx0XHR0aGlzLnJlZnJlc2goKTtcblx0fVxufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgcXVlcnkgYmVpbmcgdXNlZCB0byBnZW5lcmF0ZSB0aGUgdmlldyBkYXRhLlxuICogQHBhcmFtIHtPYmplY3Q9fSBxdWVyeSBUaGUgcXVlcnkgdG8gc2V0LlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBhZnRlclxuICogdGhpcyBvcGVyYXRpb24uIERlZmF1bHRzIHRvIHRydWUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuVmlldy5wcm90b3R5cGUucXVlcnkgPSBmdW5jdGlvbiAocXVlcnksIHJlZnJlc2gpIHtcblx0aWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9xdWVyeVNldHRpbmdzLnF1ZXJ5ID0gcXVlcnk7XG5cblx0XHRpZiAocmVmcmVzaCA9PT0gdW5kZWZpbmVkIHx8IHJlZnJlc2ggPT09IHRydWUpIHtcblx0XHRcdHRoaXMucmVmcmVzaCgpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9xdWVyeVNldHRpbmdzLnF1ZXJ5O1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgcXVlcnkgb3B0aW9ucyB1c2VkIHdoZW4gYXBwbHlpbmcgc29ydGluZyBldGMgdG8gdGhlXG4gKiB2aWV3IGRhdGEgc2V0LlxuICogQHBhcmFtIHtPYmplY3Q9fSBvcHRpb25zIEFuIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBhZnRlclxuICogdGhpcyBvcGVyYXRpb24uIERlZmF1bHRzIHRvIHRydWUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuVmlldy5wcm90b3R5cGUucXVlcnlPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMsIHJlZnJlc2gpIHtcblx0aWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3F1ZXJ5U2V0dGluZ3Mub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0aWYgKG9wdGlvbnMuZGVjb3VwbGUgPT09IHVuZGVmaW5lZCkgeyBvcHRpb25zLmRlY291cGxlID0gdHJ1ZTsgfVxuXG5cdFx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcXVlcnlTZXR0aW5ncy5vcHRpb25zO1xufTtcblxuLyoqXG4gKiBSZWZyZXNoZXMgdGhlIHZpZXcgZGF0YSBzdWNoIGFzIG9yZGVyaW5nIGV0Yy5cbiAqL1xuVmlldy5wcm90b3R5cGUucmVmcmVzaCA9IGZ1bmN0aW9uIChmb3JjZSkge1xuXHR2YXIgc29ydGVkRGF0YSxcblx0XHRjb2xsZWN0aW9uLFxuXHRcdHB1YkRhdGEgPSB0aGlzLnB1YmxpY0RhdGEoKSxcblx0XHRpO1xuXG5cdC8vIFJlLWdyYWIgYWxsIHRoZSBkYXRhIGZvciB0aGUgdmlldyBmcm9tIHRoZSBjb2xsZWN0aW9uc1xuXHR0aGlzLl9wcml2YXRlRGF0YS5yZW1vdmUoKTtcblx0cHViRGF0YS5yZW1vdmUoKTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5fY29sbGVjdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRjb2xsZWN0aW9uID0gdGhpcy5fY29sbGVjdGlvbnNbaV07XG5cdFx0dGhpcy5fcHJpdmF0ZURhdGEuaW5zZXJ0KGNvbGxlY3Rpb24uZmluZCh0aGlzLl9xdWVyeVNldHRpbmdzLnF1ZXJ5LCB0aGlzLl9xdWVyeVNldHRpbmdzLm9wdGlvbnMpKTtcblx0fVxuXG5cdHNvcnRlZERhdGEgPSB0aGlzLl9wcml2YXRlRGF0YS5maW5kKHt9LCB0aGlzLl9xdWVyeVNldHRpbmdzLm9wdGlvbnMpO1xuXG5cdGlmIChwdWJEYXRhLl9saW5rZWQpIHtcblx0XHQvLyBVcGRhdGUgZGF0YSBhbmQgb2JzZXJ2ZXJzXG5cdFx0Ly8gVE9ETzogU2hvdWxkbid0IHRoaXMgZGF0YSBnZXQgcGFzc2VkIGludG8gYSB0cmFuc2Zvcm1JbiBmaXJzdD9cblx0XHQkLm9ic2VydmFibGUocHViRGF0YS5fZGF0YSkucmVmcmVzaChzb3J0ZWREYXRhKTtcblx0fSBlbHNlIHtcblx0XHQvLyBVcGRhdGUgdGhlIHVuZGVybHlpbmcgZGF0YSB3aXRoIHRoZSBuZXcgc29ydGVkIGRhdGFcblx0XHR0aGlzLl9wcml2YXRlRGF0YS5fZGF0YS5sZW5ndGggPSAwO1xuXHRcdHRoaXMuX3ByaXZhdGVEYXRhLl9kYXRhID0gdGhpcy5fcHJpdmF0ZURhdGEuX2RhdGEuY29uY2F0KHNvcnRlZERhdGEpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgY3VycmVudGx5IGluIHRoZSB2aWV3LlxuICogQHJldHVybnMge051bWJlcn1cbiAqL1xuVmlldy5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9wcml2YXRlRGF0YSAmJiB0aGlzLl9wcml2YXRlRGF0YS5fZGF0YSA/IHRoaXMuX3ByaXZhdGVEYXRhLl9kYXRhLmxlbmd0aCA6IDA7XG59O1xuXG4vKipcbiAqIFRha2VzIGFuIG9iamVjdCB3aXRoIHRoZSBrZXlzIFwiZW5hYmxlZFwiLCBcImRhdGFJblwiIGFuZCBcImRhdGFPdXRcIjpcbiAqIHtcbiAqIFx0XCJlbmFibGVkXCI6IHRydWUsXG4gKiBcdFwiZGF0YUluXCI6IGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhOyB9LFxuICogXHRcImRhdGFPdXRcIjogZnVuY3Rpb24gKGRhdGEpIHsgcmV0dXJuIGRhdGE7IH1cbiAqIH1cbiAqIEBwYXJhbSBvYmpcbiAqIEByZXR1cm5zIHsqfVxuICovXG5WaWV3LnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAob2JqKSB7XG5cdGlmIChvYmogIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRpZiAob2JqLmVuYWJsZWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1FbmFibGVkID0gb2JqLmVuYWJsZWQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChvYmouZGF0YUluICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5fdHJhbnNmb3JtSW4gPSBvYmouZGF0YUluO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAob2JqLmRhdGFPdXQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1PdXQgPSBvYmouZGF0YU91dDtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKG9iaiA9PT0gZmFsc2UpIHtcblx0XHRcdFx0Ly8gVHVybiBvZmYgdHJhbnNmb3Jtc1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1FbmFibGVkID0gZmFsc2U7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBUdXJuIG9uIHRyYW5zZm9ybXNcblx0XHRcdFx0dGhpcy5fdHJhbnNmb3JtRW5hYmxlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlIHRoZSB0cmFuc2Zvcm1lZCBkYXRhIG9iamVjdFxuXHRcdHRoaXMuX3RyYW5zZm9ybVByaW1hcnlLZXkodGhpcy5wcml2YXRlRGF0YSgpLnByaW1hcnlLZXkoKSk7XG5cdFx0dGhpcy5fdHJhbnNmb3JtU2V0RGF0YSh0aGlzLnByaXZhdGVEYXRhKCkuZmluZCgpKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB7XG5cdFx0ZW5hYmxlZDogdGhpcy5fdHJhbnNmb3JtRW5hYmxlZCxcblx0XHRkYXRhSW46IHRoaXMuX3RyYW5zZm9ybUluLFxuXHRcdGRhdGFPdXQ6IHRoaXMuX3RyYW5zZm9ybU91dFxuXHR9O1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBub24tdHJhbnNmb3JtZWQgZGF0YSB0aGUgdmlldyBob2xkcy5cbiAqL1xuVmlldy5wcm90b3R5cGUucHJpdmF0ZURhdGEgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9wcml2YXRlRGF0YTtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhIGRhdGEgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcHVibGljIGRhdGEgdGhpcyB2aWV3XG4gKiBjb250YWlucy4gVGhpcyBjYW4gY2hhbmdlIGRlcGVuZGluZyBvbiBpZiB0cmFuc2Zvcm1zIGFyZSBiZWluZ1xuICogYXBwbGllZCB0byB0aGUgdmlldyBvciBub3QuXG4gKlxuICogSWYgbm8gdHJhbnNmb3JtcyBhcmUgYXBwbGllZCB0aGVuIHRoZSBwdWJsaWMgZGF0YSB3aWxsIGJlIHRoZVxuICogc2FtZSBhcyB0aGUgcHJpdmF0ZSBkYXRhIHRoZSB2aWV3IGhvbGRzLiBJZiB0cmFuc2Zvcm1zIGFyZVxuICogYXBwbGllZCB0aGVuIHRoZSBwdWJsaWMgZGF0YSB3aWxsIGNvbnRhaW4gdGhlIHRyYW5zZm9ybWVkIHZlcnNpb25cbiAqIG9mIHRoZSBwcml2YXRlIGRhdGEuXG4gKi9cblZpZXcucHJvdG90eXBlLnB1YmxpY0RhdGEgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl90cmFuc2Zvcm1FbmFibGVkKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3B1YmxpY0RhdGE7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHRoaXMuX3ByaXZhdGVEYXRhO1xuXHR9XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHB1YmxpYyBkYXRhIG9iamVjdCB0byBtYXRjaCBkYXRhIGZyb20gdGhlIHByaXZhdGUgZGF0YSBvYmplY3RcbiAqIGJ5IHJ1bm5pbmcgcHJpdmF0ZSBkYXRhIHRocm91Z2ggdGhlIGRhdGFJbiBtZXRob2QgcHJvdmlkZWQgaW5cbiAqIHRoZSB0cmFuc2Zvcm0oKSBjYWxsLlxuICogQHByaXZhdGVcbiAqL1xuVmlldy5wcm90b3R5cGUuX3RyYW5zZm9ybVNldERhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCkge1xuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGRhdGFcblx0XHR0aGlzLl9wdWJsaWNEYXRhID0gbmV3IENvbGxlY3Rpb24oJ19fRkRCX192aWV3X3B1YmxpY0RhdGFfJyArIHRoaXMuX25hbWUpO1xuXHRcdHRoaXMuX3B1YmxpY0RhdGEuZGIodGhpcy5fcHJpdmF0ZURhdGEuX2RiKTtcblx0XHR0aGlzLl9wdWJsaWNEYXRhLnRyYW5zZm9ybSh7XG5cdFx0XHRlbmFibGVkOiB0cnVlLFxuXHRcdFx0ZGF0YUluOiB0aGlzLl90cmFuc2Zvcm1Jbixcblx0XHRcdGRhdGFPdXQ6IHRoaXMuX3RyYW5zZm9ybU91dFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5fcHVibGljRGF0YS5zZXREYXRhKGRhdGEpO1xuXHR9XG59O1xuXG5WaWV3LnByb3RvdHlwZS5fdHJhbnNmb3JtSW5zZXJ0ID0gZnVuY3Rpb24gKGRhdGEsIGluZGV4KSB7XG5cdGlmICh0aGlzLl90cmFuc2Zvcm1FbmFibGVkICYmIHRoaXMuX3B1YmxpY0RhdGEpIHtcblx0XHR0aGlzLl9wdWJsaWNEYXRhLmluc2VydChkYXRhLCBpbmRleCk7XG5cdH1cbn07XG5cblZpZXcucHJvdG90eXBlLl90cmFuc2Zvcm1VcGRhdGUgPSBmdW5jdGlvbiAocXVlcnksIHVwZGF0ZSkge1xuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCAmJiB0aGlzLl9wdWJsaWNEYXRhKSB7XG5cdFx0dGhpcy5fcHVibGljRGF0YS51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG5cdH1cbn07XG5cblZpZXcucHJvdG90eXBlLl90cmFuc2Zvcm1SZW1vdmUgPSBmdW5jdGlvbiAocXVlcnkpIHtcblx0aWYgKHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQgJiYgdGhpcy5fcHVibGljRGF0YSkge1xuXHRcdHRoaXMuX3B1YmxpY0RhdGEucmVtb3ZlKHF1ZXJ5KTtcblx0fVxufTtcblxuVmlldy5wcm90b3R5cGUuX3RyYW5zZm9ybVByaW1hcnlLZXkgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdGlmICh0aGlzLl90cmFuc2Zvcm1FbmFibGVkICYmIHRoaXMuX3B1YmxpY0RhdGEpIHtcblx0XHR0aGlzLl9wdWJsaWNEYXRhLnByaW1hcnlLZXkoa2V5KTtcblx0fVxufTtcblxuLy8gRXh0ZW5kIGNvbGxlY3Rpb24gd2l0aCB2aWV3IGluaXRcbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX3ZpZXdzID0gW107XG5cdENvbGxlY3Rpb25Jbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5Db2xsZWN0aW9uLnByb3RvdHlwZS52aWV3ID0gZnVuY3Rpb24gKG5hbWUsIHF1ZXJ5LCBvcHRpb25zKSB7XG5cdHZhciB2aWV3ID0gbmV3IFZpZXcobmFtZSwgcXVlcnksIG9wdGlvbnMpXG5cdFx0LmRiKHRoaXMuX2RiKVxuXHRcdC5fYWRkQ29sbGVjdGlvbih0aGlzKTtcblxuXHR0aGlzLl92aWV3cyA9IHRoaXMuX3ZpZXdzIHx8IFtdO1xuXHR0aGlzLl92aWV3cy5wdXNoKHZpZXcpO1xuXG5cdHJldHVybiB2aWV3O1xufTtcblxuLyoqXG4gKiBBZGRzIGEgdmlldyB0byB0aGUgaW50ZXJuYWwgdmlldyBsb29rdXAuXG4gKiBAcGFyYW0ge1ZpZXd9IHZpZXcgVGhlIHZpZXcgdG8gYWRkLlxuICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fYWRkVmlldyA9IGZ1bmN0aW9uICh2aWV3KSB7XG5cdGlmICh2aWV3ICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl92aWV3cy5wdXNoKHZpZXcpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSB2aWV3IGZyb20gdGhlIGludGVybmFsIHZpZXcgbG9va3VwLlxuICogQHBhcmFtIHtWaWV3fSB2aWV3IFRoZSB2aWV3IHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3JlbW92ZVZpZXcgPSBmdW5jdGlvbiAodmlldykge1xuXHRpZiAodmlldyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dmFyIGluZGV4ID0gdGhpcy5fdmlld3MuaW5kZXhPZih2aWV3KTtcblx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0dGhpcy5fdmlld3Muc3BsaWNlKGluZGV4LCAxKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8vIEV4dGVuZCBEQiB3aXRoIHZpZXdzIGluaXRcbkNvcmUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX3ZpZXdzID0ge307XG5cdENvcmVJbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIEdldHMgYSB2aWV3IGJ5IGl0J3MgbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2aWV3TmFtZSBUaGUgbmFtZSBvZiB0aGUgdmlldyB0byByZXRyaWV2ZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db3JlLnByb3RvdHlwZS52aWV3ID0gZnVuY3Rpb24gKHZpZXdOYW1lKSB7XG5cdGlmICghdGhpcy5fdmlld3Nbdmlld05hbWVdKSB7XG5cdFx0aWYgKHRoaXMuZGVidWcoKSB8fCAodGhpcy5fZGIgJiYgdGhpcy5fZGIuZGVidWcoKSkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdDb3JlLlZpZXc6IENyZWF0aW5nIHZpZXcgJyArIHZpZXdOYW1lKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLl92aWV3c1t2aWV3TmFtZV0gPSB0aGlzLl92aWV3c1t2aWV3TmFtZV0gfHwgbmV3IFZpZXcodmlld05hbWUpLmRiKHRoaXMpO1xuXHRyZXR1cm4gdGhpcy5fdmlld3Nbdmlld05hbWVdO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2aWV3IHdpdGggdGhlIHBhc3NlZCBuYW1lIGFscmVhZHkgZXhpc3RzLlxuICogQHBhcmFtIHtTdHJpbmd9IHZpZXdOYW1lIFRoZSBuYW1lIG9mIHRoZSB2aWV3IHRvIGNoZWNrIGZvci5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5Db3JlLnByb3RvdHlwZS52aWV3RXhpc3RzID0gZnVuY3Rpb24gKHZpZXdOYW1lKSB7XG5cdHJldHVybiBCb29sZWFuKHRoaXMuX3ZpZXdzW3ZpZXdOYW1lXSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gYXJyYXkgb2Ygdmlld3MgdGhlIERCIGN1cnJlbnRseSBoYXMuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyBkZXRhaWxzIG9mIGVhY2ggdmlld1xuICogdGhlIGRhdGFiYXNlIGlzIGN1cnJlbnRseSBtYW5hZ2luZy5cbiAqL1xuQ29yZS5wcm90b3R5cGUudmlld3MgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBhcnIgPSBbXSxcblx0XHRpO1xuXG5cdGZvciAoaSBpbiB0aGlzLl92aWV3cykge1xuXHRcdGlmICh0aGlzLl92aWV3cy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0YXJyLnB1c2goe1xuXHRcdFx0XHRuYW1lOiBpLFxuXHRcdFx0XHRjb3VudDogdGhpcy5fdmlld3NbaV0uY291bnQoKVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGFycjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmlldzsiXX0=
