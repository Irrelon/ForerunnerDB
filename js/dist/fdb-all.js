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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9idWlsZHMvYWxsLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL0NvbGxlY3Rpb24uanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvQ29sbGVjdGlvbkdyb3VwLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL0NvcmUuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvQ3JjLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL0hpZ2hjaGFydHMuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvSW5kZXguanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvS2V5VmFsdWVTdG9yZS5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9NZXRyaWNzLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL09sZFZpZXcuQmluZC5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9PbGRWaWV3LmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL09wZXJhdGlvbi5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9PdmVybG9hZC5qcyIsIi9Vc2Vycy9yb2JldmFucy9Eb2N1bWVudHMvRGV2ZWxvcG1lbnQvRm9yZXJ1bm5lckRCL2pzL2xpYi9QYXRoLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL1BlcnNpc3QuanMiLCIvVXNlcnMvcm9iZXZhbnMvRG9jdW1lbnRzL0RldmVsb3BtZW50L0ZvcmVydW5uZXJEQi9qcy9saWIvU2hhcmVkLmpzIiwiL1VzZXJzL3JvYmV2YW5zL0RvY3VtZW50cy9EZXZlbG9wbWVudC9Gb3JlcnVubmVyREIvanMvbGliL1ZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMTFGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcldBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNseUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDb3JlID0gcmVxdWlyZSgnLi4vbGliL0NvcmUnKSxcblx0Q29sbGVjdGlvbkdyb3VwID0gcmVxdWlyZSgnLi4vbGliL0NvbGxlY3Rpb25Hcm91cCcpLFxuXHRWaWV3ID0gcmVxdWlyZSgnLi4vbGliL1ZpZXcnKSxcblx0T2xkVmlldyA9IHJlcXVpcmUoJy4uL2xpYi9PbGRWaWV3JyksXG5cdE9sZFZpZXdCaW5kID0gcmVxdWlyZSgnLi4vbGliL09sZFZpZXcuQmluZCcpLFxuXHRIaWdoY2hhcnRzID0gcmVxdWlyZSgnLi4vbGliL0hpZ2hjaGFydHMnKSxcblx0UGVyc2lzdCA9IHJlcXVpcmUoJy4uL2xpYi9QZXJzaXN0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29yZTtcbndpbmRvd1snRm9yZXJ1bm5lckRCJ10gPSBDb3JlOyIsInZhciBTaGFyZWQsXG5cdENvcmUsXG5cdE92ZXJsb2FkLFxuXHRNZXRyaWNzLFxuXHRLZXlWYWx1ZVN0b3JlLFxuXHRQYXRoLFxuXHRJbmRleCxcblx0Q3JjO1xuXG5TaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpO1xuXG4vKipcbiAqIENvbGxlY3Rpb24gb2JqZWN0IHVzZWQgdG8gc3RvcmUgZGF0YS5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHRoaXMuX3ByaW1hcnlLZXkgPSAnX2lkJztcblx0dGhpcy5fcHJpbWFyeUluZGV4ID0gbmV3IEtleVZhbHVlU3RvcmUoJ3ByaW1hcnknKTtcblx0dGhpcy5fcHJpbWFyeUNyYyA9IG5ldyBLZXlWYWx1ZVN0b3JlKCdwcmltYXJ5Q3JjJyk7XG5cdHRoaXMuX2NyY0xvb2t1cCA9IG5ldyBLZXlWYWx1ZVN0b3JlKCdjcmNMb29rdXAnKTtcblx0dGhpcy5fbmFtZSA9IG5hbWU7XG5cdHRoaXMuX2RhdGEgPSBbXTtcblx0dGhpcy5fZ3JvdXBzID0gW107XG5cdHRoaXMuX21ldHJpY3MgPSBuZXcgTWV0cmljcygpO1xuXHR0aGlzLl9saW5rZWQgPSAwO1xuXHR0aGlzLl9kZWJ1ZyA9IHt9O1xuXG5cdHRoaXMuX2RlZmVyUXVldWUgPSB7XG5cdFx0aW5zZXJ0OiBbXSxcblx0XHR1cGRhdGU6IFtdLFxuXHRcdHJlbW92ZTogW10sXG5cdFx0dXBzZXJ0OiBbXVxuXHR9O1xuXG5cdHRoaXMuX2RlZmVyVGhyZXNob2xkID0ge1xuXHRcdGluc2VydDogMTAwLFxuXHRcdHVwZGF0ZTogMTAwLFxuXHRcdHJlbW92ZTogMTAwLFxuXHRcdHVwc2VydDogMTAwXG5cdH07XG5cblx0dGhpcy5fZGVmZXJUaW1lID0ge1xuXHRcdGluc2VydDogMSxcblx0XHR1cGRhdGU6IDEsXG5cdFx0cmVtb3ZlOiAxLFxuXHRcdHVwc2VydDogMVxuXHR9O1xuXG5cdC8vIFNldCB0aGUgc3Vic2V0IHRvIGl0c2VsZiBzaW5jZSBpdCBpcyB0aGUgcm9vdCBjb2xsZWN0aW9uXG5cdHRoaXMuX3N1YnNldE9mKHRoaXMpO1xufTtcblxuU2hhcmVkLm1vZHVsZXMuQ29sbGVjdGlvbiA9IENvbGxlY3Rpb247XG5cbk92ZXJsb2FkID0gcmVxdWlyZSgnLi9PdmVybG9hZCcpO1xuTWV0cmljcyA9IHJlcXVpcmUoJy4vTWV0cmljcycpO1xuS2V5VmFsdWVTdG9yZSA9IHJlcXVpcmUoJy4vS2V5VmFsdWVTdG9yZScpO1xuUGF0aCA9IHJlcXVpcmUoJy4vUGF0aCcpO1xuSW5kZXggPSByZXF1aXJlKCcuL0luZGV4Jyk7XG5DcmMgPSByZXF1aXJlKCcuL0NyYycpO1xuQ29yZSA9IFNoYXJlZC5tb2R1bGVzLkNvcmU7XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRlYnVnID0gbmV3IE92ZXJsb2FkKFtcblx0ZnVuY3Rpb24gKCkge1xuXHRcdHJldHVybiB0aGlzLl9kZWJ1Zy5hbGw7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKHZhbCkge1xuXHRcdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0aWYgKHR5cGVvZiB2YWwgPT09ICdib29sZWFuJykge1xuXHRcdFx0XHR0aGlzLl9kZWJ1Zy5hbGwgPSB2YWw7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSB2aWV3cyB0byB1c2UgdGhpcyBkZWJ1ZyBzZXR0aW5nXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fdmlld3MubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHR0aGlzLl92aWV3c1tpXS5kZWJ1Zyh2YWwpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuX2RlYnVnW3ZhbF0gfHwgKHRoaXMuX2RiICYmIHRoaXMuX2RiLl9kZWJ1ZyAmJiB0aGlzLl9kYi5fZGVidWdbdmFsXSkgfHwgdGhpcy5fZGVidWcuYWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLl9kZWJ1Zy5hbGw7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKHR5cGUsIHZhbCkge1xuXHRcdGlmICh0eXBlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl9kZWJ1Z1t0eXBlXSA9IHZhbDtcblxuXHRcdFx0XHQvLyBVcGRhdGUgdGhlIHZpZXdzIHRvIHVzZSB0aGlzIGRlYnVnIHNldHRpbmdcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl92aWV3cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdHRoaXMuX3ZpZXdzW2ldLmRlYnVnKHR5cGUsIHZhbCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLl9kZWJ1Z1t0eXBlXSB8fCAodGhpcy5fZGIgJiYgdGhpcy5fZGIuX2RlYnVnICYmIHRoaXMuX2RiLl9kZWJ1Z1t0eXBlXSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2RlYnVnLmFsbDtcblx0fVxuXSk7XG5cbi8qKlxuICogUmV0dXJucyBhIGNoZWNrc3VtIG9mIGEgc3RyaW5nLlxuICogQHBhcmFtIHtTdHJpbmd9IHN0cmluZyBUaGUgc3RyaW5nIHRvIGNoZWNrc3VtLlxuICogQHJldHVybiB7U3RyaW5nfSBUaGUgY2hlY2tzdW0gZ2VuZXJhdGVkLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5jcmMgPSBDcmM7XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsIFRoZSBuYW1lIG9mIHRoZSBjb2xsZWN0aW9uIHRvIHNldC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5uYW1lID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9uYW1lID0gdmFsO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX25hbWU7XG59O1xuXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5vbiA9IG5ldyBPdmVybG9hZChbXG5cdGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10gfHwgW107XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddLnB1c2gobGlzdGVuZXIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZnVuY3Rpb24oZXZlbnQsIGlkLCBsaXN0ZW5lcikge1xuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2lkXSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdIHx8IFtdO1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdLnB1c2gobGlzdGVuZXIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbl0pO1xuXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5vZmYgPSBuZXcgT3ZlcmxvYWQoW1xuXHRmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5fbGlzdGVuZXJzICYmIHRoaXMuX2xpc3RlbmVyc1tldmVudF0gJiYgZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0XHRkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblx0XHR2YXIgYXJyLFxuXHRcdFx0aW5kZXg7XG5cblx0XHRpZiAodHlwZW9mKGxpc3RlbmVyKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdGlmICh0aGlzLl9saXN0ZW5lcnMgJiYgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSAmJiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2xpc3RlbmVyXSkge1xuXHRcdFx0XHRkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtsaXN0ZW5lcl07XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHRcdFx0YXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddO1xuXHRcdFx0XHRpbmRleCA9IGFyci5pbmRleE9mKGxpc3RlbmVyKTtcblxuXHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRcdGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKGV2ZW50LCBpZCwgbGlzdGVuZXIpIHtcblx0XHRpZiAodGhpcy5fbGlzdGVuZXJzICYmIGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdFx0dmFyIGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdLFxuXHRcdFx0XHRpbmRleCA9IGFyci5pbmRleE9mKGxpc3RlbmVyKTtcblxuXHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdFx0YXJyLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5dKTtcblxuQ29sbGVjdGlvbi5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50LCBkYXRhKSB7XG5cdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblxuXHRpZiAoZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0Ly8gSGFuZGxlIGdsb2JhbCBlbWl0XG5cdFx0aWYgKHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSkge1xuXHRcdFx0dmFyIGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXSxcblx0XHRcdFx0YXJyQ291bnQgPSBhcnIubGVuZ3RoLFxuXHRcdFx0XHRhcnJJbmRleDtcblxuXHRcdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdFx0YXJyW2FyckluZGV4XS5hcHBseSh0aGlzLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBIYW5kbGUgaW5kaXZpZHVhbCBlbWl0XG5cdFx0aWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGFycmF5IGlzIGFuIGFycmF5IG9mIG9iamVjdHMgaW4gdGhlIGNvbGxlY3Rpb25cblx0XHRcdGlmIChkYXRhWzBdICYmIGRhdGFbMF1bdGhpcy5fcHJpbWFyeUtleV0pIHtcblx0XHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIGNoZWNrIGZvciBsaXN0ZW5lcnMgYWdhaW5zdCB0aGUgcHJpbWFyeSBrZXlcblx0XHRcdFx0dmFyIGxpc3RlbmVySWRBcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdLFxuXHRcdFx0XHRcdGxpc3RlbmVySWRDb3VudCxcblx0XHRcdFx0XHRsaXN0ZW5lcklkSW5kZXg7XG5cblx0XHRcdFx0YXJyQ291bnQgPSBkYXRhLmxlbmd0aDtcblxuXHRcdFx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuXHRcdFx0XHRcdGlmIChsaXN0ZW5lcklkQXJyW2RhdGFbYXJySW5kZXhdW3RoaXMuX3ByaW1hcnlLZXldXSkge1xuXHRcdFx0XHRcdFx0Ly8gRW1pdCBmb3IgdGhpcyBpZFxuXHRcdFx0XHRcdFx0bGlzdGVuZXJJZENvdW50ID0gbGlzdGVuZXJJZEFycltkYXRhW2FyckluZGV4XVt0aGlzLl9wcmltYXJ5S2V5XV0ubGVuZ3RoO1xuXHRcdFx0XHRcdFx0Zm9yIChsaXN0ZW5lcklkSW5kZXggPSAwOyBsaXN0ZW5lcklkSW5kZXggPCBsaXN0ZW5lcklkQ291bnQ7IGxpc3RlbmVySWRJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdGxpc3RlbmVySWRBcnJbZGF0YVthcnJJbmRleF1bdGhpcy5fcHJpbWFyeUtleV1dW2xpc3RlbmVySWRJbmRleF0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERyb3BzIGEgY29sbGVjdGlvbiBhbmQgYWxsIGl0J3Mgc3RvcmVkIGRhdGEgZnJvbSB0aGUgZGF0YWJhc2UuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBvbiBzdWNjZXNzLCBmYWxzZSBvbiBmYWlsdXJlLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5fZGIgJiYgdGhpcy5fbmFtZSkge1xuXHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdEcm9wcGluZyBjb2xsZWN0aW9uICcgKyB0aGlzLl9uYW1lKTtcblx0XHR9XG5cblx0XHR0aGlzLmVtaXQoJ2Ryb3AnKTtcblxuXHRcdGRlbGV0ZSB0aGlzLl9kYi5fY29sbGVjdGlvblt0aGlzLl9uYW1lXTtcblxuXHRcdHZhciBncm91cEFyciA9IFtdLFxuXHRcdFx0aTtcblxuXHRcdC8vIENvcHkgdGhlIGdyb3VwIGFycmF5IGJlY2F1c2UgaWYgd2UgY2FsbCByZW1vdmVDb2xsZWN0aW9uIG9uIGEgZ3JvdXBcblx0XHQvLyBpdCB3aWxsIGFsdGVyIHRoZSBncm91cHMgYXJyYXkgb2YgdGhpcyBjb2xsZWN0aW9uIG1pZC1sb29wIVxuXHRcdGZvciAoaSA9IDA7IGkgPCB0aGlzLl9ncm91cHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGdyb3VwQXJyLnB1c2godGhpcy5fZ3JvdXBzW2ldKTtcblx0XHR9XG5cblx0XHQvLyBMb29wIGFueSBncm91cHMgd2UgYXJlIHBhcnQgb2YgYW5kIHJlbW92ZSBvdXJzZWx2ZXMgZnJvbSB0aGVtXG5cdFx0Zm9yIChpID0gMDsgaSA8IGdyb3VwQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLl9ncm91cHNbaV0ucmVtb3ZlQ29sbGVjdGlvbih0aGlzKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIHByaW1hcnkga2V5IGZvciB0aGlzIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZz19IGtleU5hbWUgVGhlIG5hbWUgb2YgdGhlIHByaW1hcnkga2V5LlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnByaW1hcnlLZXkgPSBmdW5jdGlvbiAoa2V5TmFtZSkge1xuXHRpZiAoa2V5TmFtZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcHJpbWFyeUtleSA9IGtleU5hbWU7XG5cblx0XHQvLyBTZXQgdGhlIHByaW1hcnkga2V5IGluZGV4IHByaW1hcnkga2V5XG5cdFx0dGhpcy5fcHJpbWFyeUluZGV4LnByaW1hcnlLZXkoa2V5TmFtZSk7XG5cblx0XHQvLyBSZWJ1aWxkIHRoZSBwcmltYXJ5IGtleSBpbmRleFxuXHRcdHRoaXMuX3JlYnVpbGRQcmltYXJ5S2V5SW5kZXgoKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9wcmltYXJ5S2V5O1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGluc2VydCBldmVudHMgYW5kIHJvdXRlcyBjaGFuZ2VzIHRvIGJpbmRzIGFuZCB2aWV3cyBhcyByZXF1aXJlZC5cbiAqIEBwYXJhbSB7QXJyYXl9IGluc2VydGVkIEFuIGFycmF5IG9mIGluc2VydGVkIGRvY3VtZW50cy5cbiAqIEBwYXJhbSB7QXJyYXl9IGZhaWxlZCBBbiBhcnJheSBvZiBkb2N1bWVudHMgdGhhdCBmYWlsZWQgdG8gaW5zZXJ0LlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX29uSW5zZXJ0ID0gZnVuY3Rpb24gKGluc2VydGVkLCBmYWlsZWQpIHtcblx0dGhpcy5lbWl0KCdpbnNlcnQnLCBpbnNlcnRlZCwgZmFpbGVkKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyB1cGRhdGUgZXZlbnRzIGFuZCByb3V0ZXMgY2hhbmdlcyB0byBiaW5kcyBhbmQgdmlld3MgYXMgcmVxdWlyZWQuXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtcyBBbiBhcnJheSBvZiB1cGRhdGVkIGRvY3VtZW50cy5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9vblVwZGF0ZSA9IGZ1bmN0aW9uIChpdGVtcykge1xuXHR0aGlzLmVtaXQoJ3VwZGF0ZScsIGl0ZW1zKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyByZW1vdmUgZXZlbnRzIGFuZCByb3V0ZXMgY2hhbmdlcyB0byBiaW5kcyBhbmQgdmlld3MgYXMgcmVxdWlyZWQuXG4gKiBAcGFyYW0ge0FycmF5fSBpdGVtcyBBbiBhcnJheSBvZiByZW1vdmVkIGRvY3VtZW50cy5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9vblJlbW92ZSA9IGZ1bmN0aW9uIChpdGVtcykge1xuXHR0aGlzLmVtaXQoJ3JlbW92ZScsIGl0ZW1zKTtcbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIGRiIGluc3RhbmNlIHRoZSBjb2xsZWN0aW9uIGJlbG9uZ3MgdG8uXG4gKiBAcGFyYW0ge0RCfSBkYiBUaGUgZGIgaW5zdGFuY2UuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuZGIgPSBmdW5jdGlvbiAoZGIpIHtcblx0aWYgKGRiICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9kYiA9IGRiO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2RiO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjb2xsZWN0aW9uJ3MgZGF0YSB0byB0aGUgYXJyYXkgb2YgZG9jdW1lbnRzIHBhc3NlZC5cbiAqIEBwYXJhbSBkYXRhXG4gKiBAcGFyYW0gb3B0aW9ucyBPcHRpb25hbCBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSBjYWxsYmFjayBPcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvbi5cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuc2V0RGF0YSA9IGZ1bmN0aW9uIChkYXRhLCBvcHRpb25zLCBjYWxsYmFjaykge1xuXHRpZiAoZGF0YSkge1xuXHRcdHZhciBvcCA9IHRoaXMuX21ldHJpY3MuY3JlYXRlKCdzZXREYXRhJyk7XG5cdFx0b3Auc3RhcnQoKTtcblxuXHRcdGlmICghKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkpIHtcblx0XHRcdGRhdGEgPSBbZGF0YV07XG5cdFx0fVxuXG5cdFx0b3AudGltZSgndHJhbnNmb3JtSW4nKTtcblx0XHRkYXRhID0gdGhpcy50cmFuc2Zvcm1JbihkYXRhKTtcblx0XHRvcC50aW1lKCd0cmFuc2Zvcm1JbicpO1xuXG5cdFx0dmFyIG9sZERhdGEgPSB0aGlzLl9kYXRhO1xuXG5cdFx0Ly8gT3ZlcndyaXRlIHRoZSBkYXRhXG5cdFx0dGhpcy5fZGF0YSA9IFtdO1xuXG5cdFx0aWYgKGRhdGEubGVuZ3RoKSB7XG5cdFx0XHR0aGlzLl9kYXRhID0gdGhpcy5fZGF0YS5jb25jYXQoZGF0YSk7XG5cdFx0fVxuXG5cdFx0Ly8gVXBkYXRlIHRoZSBwcmltYXJ5IGtleSBpbmRleFxuXHRcdG9wLnRpbWUoJ19yZWJ1aWxkUHJpbWFyeUtleUluZGV4Jyk7XG5cdFx0dGhpcy5fcmVidWlsZFByaW1hcnlLZXlJbmRleChvcHRpb25zKTtcblx0XHRvcC50aW1lKCdfcmVidWlsZFByaW1hcnlLZXlJbmRleCcpO1xuXG5cdFx0b3Auc3RvcCgpO1xuXG5cdFx0dGhpcy5lbWl0KCdzZXREYXRhJywgdGhpcy5fZGF0YSwgb2xkRGF0YSk7XG5cdH1cblxuXHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soZmFsc2UpOyB9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERyb3BzIGFuZCByZWJ1aWxkcyB0aGUgcHJpbWFyeSBrZXkgaW5kZXggZm9yIGFsbCBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9uYWwgb3B0aW9ucyBvYmplY3QuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fcmVidWlsZFByaW1hcnlLZXlJbmRleCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG5cdHZhciBlbnN1cmVLZXlzID0gb3B0aW9ucyAmJiBvcHRpb25zLmVuc3VyZUtleXMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuZW5zdXJlS2V5cyA6IHRydWUsXG5cdFx0dmlvbGF0aW9uQ2hlY2sgPSBvcHRpb25zICYmIG9wdGlvbnMudmlvbGF0aW9uQ2hlY2sgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMudmlvbGF0aW9uQ2hlY2sgOiB0cnVlLFxuXHRcdGFycixcblx0XHRhcnJDb3VudCxcblx0XHRhcnJJdGVtLFxuXHRcdHBJbmRleCA9IHRoaXMuX3ByaW1hcnlJbmRleCxcblx0XHRjcmNJbmRleCA9IHRoaXMuX3ByaW1hcnlDcmMsXG5cdFx0Y3JjTG9va3VwID0gdGhpcy5fY3JjTG9va3VwLFxuXHRcdHBLZXkgPSB0aGlzLl9wcmltYXJ5S2V5LFxuXHRcdGpTdHJpbmc7XG5cblx0Ly8gRHJvcCB0aGUgZXhpc3RpbmcgcHJpbWFyeSBpbmRleFxuXHRwSW5kZXgudHJ1bmNhdGUoKTtcblx0Y3JjSW5kZXgudHJ1bmNhdGUoKTtcblx0Y3JjTG9va3VwLnRydW5jYXRlKCk7XG5cblx0Ly8gTG9vcCB0aGUgZGF0YSBhbmQgY2hlY2sgZm9yIGEgcHJpbWFyeSBrZXkgaW4gZWFjaCBvYmplY3Rcblx0YXJyID0gdGhpcy5fZGF0YTtcblx0YXJyQ291bnQgPSBhcnIubGVuZ3RoO1xuXG5cdHdoaWxlIChhcnJDb3VudC0tKSB7XG5cdFx0YXJySXRlbSA9IGFyclthcnJDb3VudF07XG5cblx0XHRpZiAoZW5zdXJlS2V5cykge1xuXHRcdFx0Ly8gTWFrZSBzdXJlIHRoZSBpdGVtIGhhcyBhIHByaW1hcnkga2V5XG5cdFx0XHR0aGlzLl9lbnN1cmVQcmltYXJ5S2V5KGFyckl0ZW0pO1xuXHRcdH1cblxuXHRcdGlmICh2aW9sYXRpb25DaGVjaykge1xuXHRcdFx0Ly8gQ2hlY2sgZm9yIHByaW1hcnkga2V5IHZpb2xhdGlvblxuXHRcdFx0aWYgKCFwSW5kZXgudW5pcXVlU2V0KGFyckl0ZW1bcEtleV0sIGFyckl0ZW0pKSB7XG5cdFx0XHRcdC8vIFByaW1hcnkga2V5IHZpb2xhdGlvblxuXHRcdFx0XHR0aHJvdygnQ2FsbCB0byBzZXREYXRhIGZhaWxlZCBiZWNhdXNlIHlvdXIgZGF0YSB2aW9sYXRlcyB0aGUgcHJpbWFyeSBrZXkgdW5pcXVlIGNvbnN0cmFpbnQuIE9uZSBvciBtb3JlIGRvY3VtZW50cyBhcmUgdXNpbmcgdGhlIHNhbWUgcHJpbWFyeSBrZXk6ICcgKyBhcnJJdGVtW3RoaXMuX3ByaW1hcnlLZXldKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0alN0cmluZyA9IEpTT04uc3RyaW5naWZ5KGFyckl0ZW0pO1xuXHRcdFx0cEluZGV4LnNldChhcnJJdGVtW3BLZXldLCBhcnJJdGVtKTtcblx0XHRcdGNyY0luZGV4LnNldChhcnJJdGVtW3BLZXldLCBqU3RyaW5nKTtcblx0XHRcdGNyY0xvb2t1cC5zZXQoalN0cmluZywgYXJySXRlbSk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIENoZWNrcyBmb3IgYSBwcmltYXJ5IGtleSBvbiB0aGUgZG9jdW1lbnQgYW5kIGFzc2lnbnMgb25lIGlmIG5vbmVcbiAqIGN1cnJlbnRseSBleGlzdHMuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gY2hlY2sgYSBwcmltYXJ5IGtleSBhZ2FpbnN0LlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX2Vuc3VyZVByaW1hcnlLZXkgPSBmdW5jdGlvbiAob2JqKSB7XG5cdGlmIChvYmpbdGhpcy5fcHJpbWFyeUtleV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIEFzc2lnbiBhIHByaW1hcnkga2V5IGF1dG9tYXRpY2FsbHlcblx0XHRvYmpbdGhpcy5fcHJpbWFyeUtleV0gPSB0aGlzLm9iamVjdElkKCk7XG5cdH1cbn07XG5cbi8qKlxuICogQ2xlYXJzIGFsbCBkYXRhIGZyb20gdGhlIGNvbGxlY3Rpb24uXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUudHJ1bmNhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuZW1pdCgndHJ1bmNhdGUnLCB0aGlzLl9kYXRhKTtcblx0dGhpcy5fZGF0YS5sZW5ndGggPSAwO1xuXG5cdHRoaXMuZGVmZXJFbWl0KCdjaGFuZ2UnKTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE1vZGlmaWVzIGFuIGV4aXN0aW5nIGRvY3VtZW50IG9yIGRvY3VtZW50cyBpbiBhIGNvbGxlY3Rpb24uIFRoaXMgd2lsbCB1cGRhdGVcbiAqIGFsbCBtYXRjaGVzIGZvciAncXVlcnknIHdpdGggdGhlIGRhdGEgaGVsZCBpbiAndXBkYXRlJy4gSXQgd2lsbCBub3Qgb3ZlcndyaXRlXG4gKiB0aGUgbWF0Y2hlZCBkb2N1bWVudHMgd2l0aCB0aGUgdXBkYXRlIGRvY3VtZW50LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIGRvY3VtZW50IG9iamVjdCB0byB1cHNlcnQgb3IgYW4gYXJyYXkgY29udGFpbmluZ1xuICogZG9jdW1lbnRzIHRvIHVwc2VydC5cbiAqXG4gKiBJZiB0aGUgZG9jdW1lbnQgY29udGFpbnMgYSBwcmltYXJ5IGtleSBmaWVsZCAoYmFzZWQgb24gdGhlIGNvbGxlY3Rpb25zJ3MgcHJpbWFyeVxuICoga2V5KSB0aGVuIHRoZSBkYXRhYmFzZSB3aWxsIHNlYXJjaCBmb3IgYW4gZXhpc3RpbmcgZG9jdW1lbnQgd2l0aCBhIG1hdGNoaW5nIGlkLlxuICogSWYgYSBtYXRjaGluZyBkb2N1bWVudCBpcyBmb3VuZCwgdGhlIGRvY3VtZW50IHdpbGwgYmUgdXBkYXRlZC4gQW55IGtleXMgdGhhdFxuICogbWF0Y2gga2V5cyBvbiB0aGUgZXhpc3RpbmcgZG9jdW1lbnQgd2lsbCBiZSBvdmVyd3JpdHRlbiB3aXRoIG5ldyBkYXRhLiBBbnkga2V5c1xuICogdGhhdCBkbyBub3QgY3VycmVudGx5IGV4aXN0IG9uIHRoZSBkb2N1bWVudCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBkb2N1bWVudC5cbiAqXG4gKiBJZiB0aGUgZG9jdW1lbnQgZG9lcyBub3QgY29udGFpbiBhbiBpZCBvciB0aGUgaWQgcGFzc2VkIGRvZXMgbm90IG1hdGNoIGFuIGV4aXN0aW5nXG4gKiBkb2N1bWVudCwgYW4gaW5zZXJ0IGlzIHBlcmZvcm1lZCBpbnN0ZWFkLiBJZiBubyBpZCBpcyBwcmVzZW50IGEgbmV3IHByaW1hcnkga2V5XG4gKiBpZCBpcyBwcm92aWRlZCBmb3IgdGhlIGl0ZW0uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbj19IGNhbGxiYWNrIE9wdGlvbmFsIGNhbGxiYWNrIG1ldGhvZC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IEFuIG9iamVjdCBjb250YWluaW5nIHR3byBrZXlzLCBcIm9wXCIgY29udGFpbnMgZWl0aGVyIFwiaW5zZXJ0XCIgb3JcbiAqIFwidXBkYXRlXCIgZGVwZW5kaW5nIG9uIHRoZSB0eXBlIG9mIG9wZXJhdGlvbiB0aGF0IHdhcyBwZXJmb3JtZWQgYW5kIFwicmVzdWx0XCJcbiAqIGNvbnRhaW5zIHRoZSByZXR1cm4gZGF0YSBmcm9tIHRoZSBvcGVyYXRpb24gdXNlZC5cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUudXBzZXJ0ID0gZnVuY3Rpb24gKG9iaiwgY2FsbGJhY2spIHtcblx0aWYgKG9iaikge1xuXHRcdHZhciBxdWV1ZSA9IHRoaXMuX2RlZmVyUXVldWUudXBzZXJ0LFxuXHRcdFx0ZGVmZXJUaHJlc2hvbGQgPSB0aGlzLl9kZWZlclRocmVzaG9sZC51cHNlcnQ7XG5cdFx0Ly9kZWZlclRpbWUgPSB0aGlzLl9kZWZlclRpbWUudXBzZXJ0O1xuXG5cdFx0dmFyIHJldHVybkRhdGEgPSB7fSxcblx0XHRcdHF1ZXJ5LFxuXHRcdFx0aTtcblxuXHRcdC8vIERldGVybWluZSBpZiB0aGUgb2JqZWN0IHBhc3NlZCBpcyBhbiBhcnJheSBvciBub3Rcblx0XHRpZiAob2JqIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdGlmIChvYmoubGVuZ3RoID4gZGVmZXJUaHJlc2hvbGQpIHtcblx0XHRcdFx0Ly8gQnJlYWsgdXAgdXBzZXJ0IGludG8gYmxvY2tzXG5cdFx0XHRcdHRoaXMuX2RlZmVyUXVldWUudXBzZXJ0ID0gcXVldWUuY29uY2F0KG9iaik7XG5cblx0XHRcdFx0Ly8gRmlyZSBvZmYgdGhlIGluc2VydCBxdWV1ZSBoYW5kbGVyXG5cdFx0XHRcdHRoaXMucHJvY2Vzc1F1ZXVlKCd1cHNlcnQnLCBjYWxsYmFjayk7XG5cblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIHVwc2VydCBlYWNoIGl0ZW1cblx0XHRcdFx0cmV0dXJuRGF0YSA9IFtdO1xuXG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBvYmoubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRyZXR1cm5EYXRhLnB1c2godGhpcy51cHNlcnQob2JqW2ldKSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soKTsgfVxuXG5cdFx0XHRcdHJldHVybiByZXR1cm5EYXRhO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIERldGVybWluZSBpZiB0aGUgb3BlcmF0aW9uIGlzIGFuIGluc2VydCBvciBhbiB1cGRhdGVcblx0XHRpZiAob2JqW3RoaXMuX3ByaW1hcnlLZXldKSB7XG5cdFx0XHQvLyBDaGVjayBpZiBhbiBvYmplY3Qgd2l0aCB0aGlzIHByaW1hcnkga2V5IGFscmVhZHkgZXhpc3RzXG5cdFx0XHRxdWVyeSA9IHt9O1xuXHRcdFx0cXVlcnlbdGhpcy5fcHJpbWFyeUtleV0gPSBvYmpbdGhpcy5fcHJpbWFyeUtleV07XG5cblx0XHRcdC8vVE9ETzogQ291bGQgYmUgb3B0aW1pc2VkIHRvIHVzZSB0aGUgcHJpbWFyeSBpbmRleCBsb29rdXAgbm93P1xuXHRcdFx0aWYgKHRoaXMuY291bnQocXVlcnkpKSB7XG5cdFx0XHRcdC8vIFRoZSBkb2N1bWVudCBhbHJlYWR5IGV4aXN0cyB3aXRoIHRoaXMgaWQsIHRoaXMgb3BlcmF0aW9uIGlzIGFuIHVwZGF0ZVxuXHRcdFx0XHRyZXR1cm5EYXRhLm9wID0gJ3VwZGF0ZSc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBObyBkb2N1bWVudCB3aXRoIHRoaXMgaWQgZXhpc3RzLCB0aGlzIG9wZXJhdGlvbiBpcyBhbiBpbnNlcnRcblx0XHRcdFx0cmV0dXJuRGF0YS5vcCA9ICdpbnNlcnQnO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBUaGUgZG9jdW1lbnQgcGFzc2VkIGRvZXMgbm90IGNvbnRhaW4gYW4gaWQsIHRoaXMgb3BlcmF0aW9uIGlzIGFuIGluc2VydFxuXHRcdFx0cmV0dXJuRGF0YS5vcCA9ICdpbnNlcnQnO1xuXHRcdH1cblxuXHRcdHN3aXRjaCAocmV0dXJuRGF0YS5vcCkge1xuXHRcdFx0Y2FzZSAnaW5zZXJ0Jzpcblx0XHRcdFx0cmV0dXJuRGF0YS5yZXN1bHQgPSB0aGlzLmluc2VydChvYmopO1xuXHRcdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAndXBkYXRlJzpcblx0XHRcdFx0cmV0dXJuRGF0YS5yZXN1bHQgPSB0aGlzLnVwZGF0ZShxdWVyeSwgb2JqKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldHVybkRhdGE7XG5cdH0gZWxzZSB7XG5cdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCk7IH1cblx0fVxuXG5cdHJldHVybjtcbn07XG5cbi8qKlxuICogTW9kaWZpZXMgYW4gZXhpc3RpbmcgZG9jdW1lbnQgb3IgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbi4gVGhpcyB3aWxsIHVwZGF0ZVxuICogYWxsIG1hdGNoZXMgZm9yICdxdWVyeScgd2l0aCB0aGUgZGF0YSBoZWxkIGluICd1cGRhdGUnLiBJdCB3aWxsIG5vdCBvdmVyd3JpdGVcbiAqIHRoZSBtYXRjaGVkIGRvY3VtZW50cyB3aXRoIHRoZSB1cGRhdGUgZG9jdW1lbnQuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IFRoZSBxdWVyeSB0aGF0IG11c3QgYmUgbWF0Y2hlZCBmb3IgYSBkb2N1bWVudCB0byBiZVxuICogb3BlcmF0ZWQgb24uXG4gKiBAcGFyYW0ge09iamVjdH0gdXBkYXRlIFRoZSBvYmplY3QgY29udGFpbmluZyB1cGRhdGVkIGtleS92YWx1ZXMuIEFueSBrZXlzIHRoYXRcbiAqIG1hdGNoIGtleXMgb24gdGhlIGV4aXN0aW5nIGRvY3VtZW50IHdpbGwgYmUgb3ZlcndyaXR0ZW4gd2l0aCB0aGlzIGRhdGEuIEFueVxuICoga2V5cyB0aGF0IGRvIG5vdCBjdXJyZW50bHkgZXhpc3Qgb24gdGhlIGRvY3VtZW50IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGRvY3VtZW50LlxuICogQHBhcmFtIHtPYmplY3Q9fSBvcHRpb25zIEFuIG9wdGlvbnMgb2JqZWN0LlxuICogQHJldHVybnMge0FycmF5fSBUaGUgaXRlbXMgdGhhdCB3ZXJlIHVwZGF0ZWQuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIChxdWVyeSwgdXBkYXRlLCBvcHRpb25zKSB7XG5cdC8vIERlY291cGxlIHRoZSB1cGRhdGUgZGF0YVxuXHR1cGRhdGUgPSB0aGlzLmRlY291cGxlKHVwZGF0ZSk7XG5cblx0Ly8gSGFuZGxlIHRyYW5zZm9ybVxuXHR1cGRhdGUgPSB0aGlzLnRyYW5zZm9ybUluKHVwZGF0ZSk7XG5cblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdVcGRhdGluZyBzb21lIGNvbGxlY3Rpb24gZGF0YSBmb3IgY29sbGVjdGlvbiBcIicgKyB0aGlzLm5hbWUoKSArICdcIicpO1xuXHR9XG5cblx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdG9wID0gdGhpcy5fbWV0cmljcy5jcmVhdGUoJ3VwZGF0ZScpLFxuXHRcdHBLZXkgPSB0aGlzLl9wcmltYXJ5S2V5LFxuXHRcdGRhdGFTZXQsXG5cdFx0dXBkYXRlZCxcblx0XHR1cGRhdGVDYWxsID0gZnVuY3Rpb24gKGRvYykge1xuXHRcdFx0aWYgKHVwZGF0ZSAmJiB1cGRhdGVbcEtleV0gIT09IHVuZGVmaW5lZCAmJiB1cGRhdGVbcEtleV0gIT0gZG9jW3BLZXldKSB7XG5cdFx0XHRcdC8vIFJlbW92ZSBpdGVtIGZyb20gcHJpbWFyeSBpbmRleFxuXHRcdFx0XHRzZWxmLl9wcmltYXJ5SW5kZXgudW5TZXQoZG9jW3BLZXldKTtcblxuXHRcdFx0XHR2YXIgcmVzdWx0ID0gc2VsZi5fdXBkYXRlT2JqZWN0KGRvYywgdXBkYXRlLCBxdWVyeSwgb3B0aW9ucywgJycpO1xuXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgaXRlbSBpbiB0aGUgcHJpbWFyeSBpbmRleFxuXHRcdFx0XHRpZiAoc2VsZi5fcHJpbWFyeUluZGV4LnVuaXF1ZVNldChkb2NbcEtleV0sIGRvYykpIHtcblx0XHRcdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRocm93KCdQcmltYXJ5IGtleSB2aW9sYXRpb24gaW4gdXBkYXRlISBLZXkgdmlvbGF0ZWQ6ICcgKyBkb2NbcEtleV0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gc2VsZi5fdXBkYXRlT2JqZWN0KGRvYywgdXBkYXRlLCBxdWVyeSwgb3B0aW9ucywgJycpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0dmlld3MgPSB0aGlzLl92aWV3cyxcblx0XHR2aWV3SW5kZXg7XG5cblx0b3Auc3RhcnQoKTtcblx0b3AudGltZSgnUmV0cmlldmUgZG9jdW1lbnRzIHRvIHVwZGF0ZScpO1xuXHRkYXRhU2V0ID0gdGhpcy5maW5kKHF1ZXJ5LCB7ZGVjb3VwbGU6IGZhbHNlfSk7XG5cdG9wLnRpbWUoJ1JldHJpZXZlIGRvY3VtZW50cyB0byB1cGRhdGUnKTtcblxuXHRpZiAoZGF0YVNldC5sZW5ndGgpIHtcblx0XHRvcC50aW1lKCdVcGRhdGUgZG9jdW1lbnRzJyk7XG5cdFx0dXBkYXRlZCA9IGRhdGFTZXQuZmlsdGVyKHVwZGF0ZUNhbGwpO1xuXHRcdG9wLnRpbWUoJ1VwZGF0ZSBkb2N1bWVudHMnKTtcblxuXHRcdGlmICh1cGRhdGVkLmxlbmd0aCkge1xuXHRcdFx0Ly8gTG9vcCB2aWV3cyBhbmQgcGFzcyB0aGVtIHRoZSB1cGRhdGUgcXVlcnlcblx0XHRcdGlmICh2aWV3cyAmJiB2aWV3cy5sZW5ndGgpIHtcblx0XHRcdFx0aWYgKHRoaXMuZGVidWcoJ3ZpZXdzJykpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnVXBkYXRpbmcgdmlld3MgZnJvbSBjb2xsZWN0aW9uOiAnICsgdGhpcy5uYW1lKCkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG9wLnRpbWUoJ0luZm9ybSB2aWV3cyBvZiB1cGRhdGUnKTtcblx0XHRcdFx0Zm9yICh2aWV3SW5kZXggPSAwOyB2aWV3SW5kZXggPCB2aWV3cy5sZW5ndGg7IHZpZXdJbmRleCsrKSB7XG5cdFx0XHRcdFx0dmlld3Nbdmlld0luZGV4XS51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0b3AudGltZSgnSW5mb3JtIHZpZXdzIG9mIHVwZGF0ZScpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9vblVwZGF0ZSh1cGRhdGVkKTtcblx0XHRcdHRoaXMuZGVmZXJFbWl0KCdjaGFuZ2UnLCB7dHlwZTogJ3VwZGF0ZScsIGRhdGE6IHVwZGF0ZWR9KTtcblx0XHR9XG5cdH1cblxuXHRvcC5zdG9wKCk7XG5cblx0cmV0dXJuIHVwZGF0ZWQgfHwgW107XG59O1xuXG4vKipcbiAqIEhlbHBlciBtZXRob2QgdG8gdXBkYXRlIGEgZG9jdW1lbnQgZnJvbSBpdCdzIGlkLlxuICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBpZCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge09iamVjdH0gdXBkYXRlIFRoZSBvYmplY3QgY29udGFpbmluZyB0aGUga2V5L3ZhbHVlcyB0byB1cGRhdGUgdG8uXG4gKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBpdGVtcyB0aGF0IHdlcmUgdXBkYXRlZC5cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUudXBkYXRlQnlJZCA9IGZ1bmN0aW9uIChpZCwgdXBkYXRlKSB7XG5cdHZhciBzZWFyY2hPYmogPSB7fTtcblx0c2VhcmNoT2JqW3RoaXMuX3ByaW1hcnlLZXldID0gaWQ7XG5cdHJldHVybiB0aGlzLnVwZGF0ZShzZWFyY2hPYmosIHVwZGF0ZSk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIG1ldGhvZCBmb3IgZG9jdW1lbnQgdXBkYXRpbmcuXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge09iamVjdH0gdXBkYXRlIFRoZSBvYmplY3Qgd2l0aCBrZXkvdmFsdWUgcGFpcnMgdG8gdXBkYXRlIHRoZSBkb2N1bWVudCB3aXRoLlxuICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IFRoZSBxdWVyeSBvYmplY3QgdGhhdCB3ZSBuZWVkIHRvIG1hdGNoIHRvIHBlcmZvcm0gYW4gdXBkYXRlLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgY3VycmVudCByZWN1cnNpdmUgcGF0aC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBvcFR5cGUgVGhlIHR5cGUgb2YgdXBkYXRlIG9wZXJhdGlvbiB0byBwZXJmb3JtLCBpZiBub25lIGlzIHNwZWNpZmllZFxuICogZGVmYXVsdCBpcyB0byBzZXQgbmV3IGRhdGEgYWdhaW5zdCBtYXRjaGluZyBmaWVsZHMuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiB0aGUgZG9jdW1lbnQgd2FzIHVwZGF0ZWQgd2l0aCBuZXcgLyBjaGFuZ2VkIGRhdGEgb3JcbiAqIGZhbHNlIGlmIGl0IHdhcyBub3QgdXBkYXRlZCBiZWNhdXNlIHRoZSBkYXRhIHdhcyB0aGUgc2FtZS5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl91cGRhdGVPYmplY3QgPSBmdW5jdGlvbiAoZG9jLCB1cGRhdGUsIHF1ZXJ5LCBvcHRpb25zLCBwYXRoLCBvcFR5cGUpIHtcblx0dXBkYXRlID0gdGhpcy5kZWNvdXBsZSh1cGRhdGUpO1xuXG5cdC8vIENsZWFyIGxlYWRpbmcgZG90cyBmcm9tIHBhdGhcblx0cGF0aCA9IHBhdGggfHwgJyc7XG5cdGlmIChwYXRoLnN1YnN0cigwLCAxKSA9PT0gJy4nKSB7IHBhdGggPSBwYXRoLnN1YnN0cigxLCBwYXRoLmxlbmd0aCAtMSk7IH1cblxuXHR2YXIgdXBkYXRlZCA9IGZhbHNlLFxuXHRcdHJlY3Vyc2VVcGRhdGVkID0gZmFsc2UsXG5cdFx0b3BlcmF0aW9uLFxuXHRcdHRtcEFycmF5LFxuXHRcdHRtcEluZGV4LFxuXHRcdHRtcENvdW50LFxuXHRcdHBhdGhJbnN0YW5jZSxcblx0XHRzb3VyY2VJc0FycmF5LFxuXHRcdHVwZGF0ZUlzQXJyYXksXG5cdFx0aSwgaztcblxuXHRmb3IgKGkgaW4gdXBkYXRlKSB7XG5cdFx0aWYgKHVwZGF0ZS5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0Ly8gUmVzZXQgb3BlcmF0aW9uIGZsYWdcblx0XHRcdG9wZXJhdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHQvLyBDaGVjayBpZiB0aGUgcHJvcGVydHkgc3RhcnRzIHdpdGggYSBkb2xsYXIgKGZ1bmN0aW9uKVxuXHRcdFx0aWYgKGkuc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcblx0XHRcdFx0Ly8gQ2hlY2sgZm9yIGNvbW1hbmRzXG5cdFx0XHRcdHN3aXRjaCAoaSkge1xuXHRcdFx0XHRcdGNhc2UgJyRpbmRleCc6XG5cdFx0XHRcdFx0XHQvLyBJZ25vcmUgJGluZGV4IG9wZXJhdG9yc1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHJlY3Vyc2VVcGRhdGVkID0gdGhpcy5fdXBkYXRlT2JqZWN0KGRvYywgdXBkYXRlW2ldLCBxdWVyeSwgb3B0aW9ucywgcGF0aCwgaSk7XG5cdFx0XHRcdFx0XHRpZiAocmVjdXJzZVVwZGF0ZWQpIHtcblx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBDaGVjayBpZiB0aGUga2V5IGhhcyBhIC4kIGF0IHRoZSBlbmQsIGRlbm90aW5nIGFuIGFycmF5IGxvb2t1cFxuXHRcdFx0aWYgKHRoaXMuX2lzUG9zaXRpb25hbEtleShpKSkge1xuXHRcdFx0XHRvcGVyYXRpb24gPSB0cnVlO1xuXG5cdFx0XHRcdC8vIE1vZGlmeSBpIHRvIGJlIHRoZSBuYW1lIG9mIHRoZSBmaWVsZFxuXHRcdFx0XHRpID0gaS5zdWJzdHIoMCwgaS5sZW5ndGggLSAyKTtcblxuXHRcdFx0XHRwYXRoSW5zdGFuY2UgPSBuZXcgUGF0aChwYXRoICsgJy4nICsgaSk7XG5cblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGtleSBpcyBhbiBhcnJheSBhbmQgaGFzIGl0ZW1zXG5cdFx0XHRcdGlmIChkb2NbaV0gJiYgZG9jW2ldIGluc3RhbmNlb2YgQXJyYXkgJiYgZG9jW2ldLmxlbmd0aCkge1xuXHRcdFx0XHRcdHRtcEFycmF5ID0gW107XG5cblx0XHRcdFx0XHQvLyBMb29wIHRoZSBhcnJheSBhbmQgZmluZCBtYXRjaGVzIHRvIG91ciBzZWFyY2hcblx0XHRcdFx0XHRmb3IgKHRtcEluZGV4ID0gMDsgdG1wSW5kZXggPCBkb2NbaV0ubGVuZ3RoOyB0bXBJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRpZiAodGhpcy5fbWF0Y2goZG9jW2ldW3RtcEluZGV4XSwgcGF0aEluc3RhbmNlLnZhbHVlKHF1ZXJ5KVswXSkpIHtcblx0XHRcdFx0XHRcdFx0dG1wQXJyYXkucHVzaCh0bXBJbmRleCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gTG9vcCB0aGUgaXRlbXMgdGhhdCBtYXRjaGVkIGFuZCB1cGRhdGUgdGhlbVxuXHRcdFx0XHRcdGZvciAodG1wSW5kZXggPSAwOyB0bXBJbmRleCA8IHRtcEFycmF5Lmxlbmd0aDsgdG1wSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0cmVjdXJzZVVwZGF0ZWQgPSB0aGlzLl91cGRhdGVPYmplY3QoZG9jW2ldW3RtcEFycmF5W3RtcEluZGV4XV0sIHVwZGF0ZVtpICsgJy4kJ10sIHF1ZXJ5LCBvcHRpb25zLCBwYXRoICsgJy4nICsgaSwgb3BUeXBlKTtcblx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVXBkYXRlZCkge1xuXHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCFvcGVyYXRpb24pIHtcblx0XHRcdFx0aWYgKCFvcFR5cGUgJiYgdHlwZW9mKHVwZGF0ZVtpXSkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0aWYgKGRvY1tpXSAhPT0gbnVsbCAmJiB0eXBlb2YoZG9jW2ldKSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHdlIGFyZSBkZWFsaW5nIHdpdGggYXJyYXlzXG5cdFx0XHRcdFx0XHRzb3VyY2VJc0FycmF5ID0gZG9jW2ldIGluc3RhbmNlb2YgQXJyYXk7XG5cdFx0XHRcdFx0XHR1cGRhdGVJc0FycmF5ID0gdXBkYXRlW2ldIGluc3RhbmNlb2YgQXJyYXk7XG5cblx0XHRcdFx0XHRcdGlmIChzb3VyY2VJc0FycmF5IHx8IHVwZGF0ZUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIHVwZGF0ZSBpcyBhbiBvYmplY3QgYW5kIHRoZSBkb2MgaXMgYW4gYXJyYXlcblx0XHRcdFx0XHRcdFx0aWYgKCF1cGRhdGVJc0FycmF5ICYmIHNvdXJjZUlzQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBVcGRhdGUgaXMgYW4gb2JqZWN0LCBzb3VyY2UgaXMgYW4gYXJyYXkgc28gbWF0Y2ggdGhlIGFycmF5IGl0ZW1zXG5cdFx0XHRcdFx0XHRcdFx0Ly8gd2l0aCBvdXIgcXVlcnkgb2JqZWN0IHRvIGZpbmQgdGhlIG9uZSB0byB1cGRhdGUgaW5zaWRlIHRoaXMgYXJyYXlcblxuXHRcdFx0XHRcdFx0XHRcdC8vIExvb3AgdGhlIGFycmF5IGFuZCBmaW5kIG1hdGNoZXMgdG8gb3VyIHNlYXJjaFxuXHRcdFx0XHRcdFx0XHRcdGZvciAodG1wSW5kZXggPSAwOyB0bXBJbmRleCA8IGRvY1tpXS5sZW5ndGg7IHRtcEluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJlY3Vyc2VVcGRhdGVkID0gdGhpcy5fdXBkYXRlT2JqZWN0KGRvY1tpXVt0bXBJbmRleF0sIHVwZGF0ZVtpXSwgcXVlcnksIG9wdGlvbnMsIHBhdGggKyAnLicgKyBpLCBvcFR5cGUpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAocmVjdXJzZVVwZGF0ZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEVpdGhlciBib3RoIHNvdXJjZSBhbmQgdXBkYXRlIGFyZSBhcnJheXMgb3IgdGhlIHVwZGF0ZSBpc1xuXHRcdFx0XHRcdFx0XHRcdC8vIGFuIGFycmF5IGFuZCB0aGUgc291cmNlIGlzIG5vdCwgc28gc2V0IHNvdXJjZSB0byB1cGRhdGVcblx0XHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldICE9PSB1cGRhdGVbaV0pIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVByb3BlcnR5KGRvYywgaSwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Ly8gVGhlIGRvYyBrZXkgaXMgYW4gb2JqZWN0IHNvIHRyYXZlcnNlIHRoZVxuXHRcdFx0XHRcdFx0XHQvLyB1cGRhdGUgZnVydGhlclxuXHRcdFx0XHRcdFx0XHRyZWN1cnNlVXBkYXRlZCA9IHRoaXMuX3VwZGF0ZU9iamVjdChkb2NbaV0sIHVwZGF0ZVtpXSwgcXVlcnksIG9wdGlvbnMsIHBhdGggKyAnLicgKyBpLCBvcFR5cGUpO1xuXG5cdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVXBkYXRlZCkge1xuXHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmIChkb2NbaV0gIT09IHVwZGF0ZVtpXSkge1xuXHRcdFx0XHRcdFx0XHR0aGlzLl91cGRhdGVQcm9wZXJ0eShkb2MsIGksIHVwZGF0ZVtpXSk7XG5cdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzd2l0Y2ggKG9wVHlwZSkge1xuXHRcdFx0XHRcdFx0Y2FzZSAnJGluYyc6XG5cdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZUluY3JlbWVudChkb2MsIGksIHVwZGF0ZVtpXSk7XG5cdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJHB1c2gnOlxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgdGFyZ2V0IGtleSBpcyB1bmRlZmluZWQgYW5kIGlmIHNvLCBjcmVhdGUgYW4gYXJyYXlcblx0XHRcdFx0XHRcdFx0aWYgKGRvY1tpXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gSW5pdGlhbGlzZSBhIG5ldyBhcnJheVxuXHRcdFx0XHRcdFx0XHRcdGRvY1tpXSA9IFtdO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgdGhhdCB0aGUgdGFyZ2V0IGtleSBpcyBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLl91cGRhdGVQdXNoKGRvY1tpXSwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR0aHJvdyhcIkNhbm5vdCBwdXNoIHRvIGEga2V5IHRoYXQgaXMgbm90IGFuIGFycmF5ISAoXCIgKyBpICsgXCIpIVwiKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJHB1bGwnOlxuXHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0XHR0bXBBcnJheSA9IFtdO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gTG9vcCB0aGUgYXJyYXkgYW5kIGZpbmQgbWF0Y2hlcyB0byBvdXIgc2VhcmNoXG5cdFx0XHRcdFx0XHRcdFx0Zm9yICh0bXBJbmRleCA9IDA7IHRtcEluZGV4IDwgZG9jW2ldLmxlbmd0aDsgdG1wSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX21hdGNoKGRvY1tpXVt0bXBJbmRleF0sIHVwZGF0ZVtpXSkpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dG1wQXJyYXkucHVzaCh0bXBJbmRleCk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0dG1wQ291bnQgPSB0bXBBcnJheS5sZW5ndGg7XG5cblx0XHRcdFx0XHRcdFx0XHQvLyBOb3cgbG9vcCB0aGUgcHVsbCBhcnJheSBhbmQgcmVtb3ZlIGl0ZW1zIHRvIGJlIHB1bGxlZFxuXHRcdFx0XHRcdFx0XHRcdHdoaWxlICh0bXBDb3VudC0tKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLl91cGRhdGVQdWxsKGRvY1tpXSwgdG1wQXJyYXlbdG1wQ291bnRdKTtcblx0XHRcdFx0XHRcdFx0XHRcdHVwZGF0ZWQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR0aHJvdyhcIkNhbm5vdCBwdWxsIGZyb20gYSBrZXkgdGhhdCBpcyBub3QgYW4gYXJyYXkhIChcIiArIGkgKyBcIikhXCIpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckYWRkVG9TZXQnOlxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgdGFyZ2V0IGtleSBpcyB1bmRlZmluZWQgYW5kIGlmIHNvLCBjcmVhdGUgYW4gYXJyYXlcblx0XHRcdFx0XHRcdFx0aWYgKGRvY1tpXSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gSW5pdGlhbGlzZSBhIG5ldyBhcnJheVxuXHRcdFx0XHRcdFx0XHRcdGRvY1tpXSA9IFtdO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgdGhhdCB0aGUgdGFyZ2V0IGtleSBpcyBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBMb29wIHRoZSB0YXJnZXQgYXJyYXkgYW5kIGNoZWNrIGZvciBleGlzdGVuY2Ugb2YgaXRlbVxuXHRcdFx0XHRcdFx0XHRcdHZhciB0YXJnZXRBcnIgPSBkb2NbaV0sXG5cdFx0XHRcdFx0XHRcdFx0XHR0YXJnZXRBcnJJbmRleCxcblx0XHRcdFx0XHRcdFx0XHRcdHRhcmdldEFyckNvdW50ID0gdGFyZ2V0QXJyLmxlbmd0aCxcblx0XHRcdFx0XHRcdFx0XHRcdG9iakhhc2gsXG5cdFx0XHRcdFx0XHRcdFx0XHRhZGRPYmogPSB0cnVlLFxuXHRcdFx0XHRcdFx0XHRcdFx0b3B0aW9uT2JqID0gKG9wdGlvbnMgJiYgb3B0aW9ucy4kYWRkVG9TZXQpLFxuXHRcdFx0XHRcdFx0XHRcdFx0aGFzaE1vZGUsXG5cdFx0XHRcdFx0XHRcdFx0XHRwYXRoU29sdmVyO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgd2UgaGF2ZSBhbiBvcHRpb25zIG9iamVjdCBmb3Igb3VyIG9wZXJhdGlvblxuXHRcdFx0XHRcdFx0XHRcdGlmIChvcHRpb25PYmogJiYgb3B0aW9uT2JqLmtleSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aGFzaE1vZGUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHRcdHBhdGhTb2x2ZXIgPSBuZXcgUGF0aChvcHRpb25PYmoua2V5KTtcblx0XHRcdFx0XHRcdFx0XHRcdG9iakhhc2ggPSBwYXRoU29sdmVyLnZhbHVlKHVwZGF0ZVtpXSlbMF07XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdG9iakhhc2ggPSBKU09OLnN0cmluZ2lmeSh1cGRhdGVbaV0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0aGFzaE1vZGUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGZvciAodGFyZ2V0QXJySW5kZXggPSAwOyB0YXJnZXRBcnJJbmRleCA8IHRhcmdldEFyckNvdW50OyB0YXJnZXRBcnJJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoaGFzaE1vZGUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgb2JqZWN0cyBtYXRjaCB2aWEgYSBzdHJpbmcgaGFzaCAoSlNPTilcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKEpTT04uc3RyaW5naWZ5KHRhcmdldEFyclt0YXJnZXRBcnJJbmRleF0pID09PSBvYmpIYXNoKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gVGhlIG9iamVjdCBhbHJlYWR5IGV4aXN0cywgZG9uJ3QgYWRkIGl0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YWRkT2JqID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIG9iamVjdHMgbWF0Y2ggYmFzZWQgb24gdGhlIHBhdGhcblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKG9iakhhc2ggPT09IHBhdGhTb2x2ZXIudmFsdWUodGFyZ2V0QXJyW3RhcmdldEFyckluZGV4XSlbMF0pIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBUaGUgb2JqZWN0IGFscmVhZHkgZXhpc3RzLCBkb24ndCBhZGQgaXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRhZGRPYmogPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmIChhZGRPYmopIHtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVB1c2goZG9jW2ldLCB1cGRhdGVbaV0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlZCA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93KFwiQ2Fubm90IHB1c2ggdG8gYSBrZXkgdGhhdCBpcyBub3QgYW4gYXJyYXkhIChcIiArIGsgKyBcIikhXCIpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckc3BsaWNlUHVzaCc6XG5cdFx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIHRoZSB0YXJnZXQga2V5IGlzIHVuZGVmaW5lZCBhbmQgaWYgc28sIGNyZWF0ZSBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAoZG9jW2ldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBJbml0aWFsaXNlIGEgbmV3IGFycmF5XG5cdFx0XHRcdFx0XHRcdFx0ZG9jW2ldID0gW107XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayB0aGF0IHRoZSB0YXJnZXQga2V5IGlzIGFuIGFycmF5XG5cdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciB0ZW1wSW5kZXggPSB1cGRhdGUuJGluZGV4O1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRlbXBJbmRleCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRkZWxldGUgdXBkYXRlLiRpbmRleDtcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVNwbGljZVB1c2goZG9jW2ldLCB0ZW1wSW5kZXgsIHVwZGF0ZVtpXSk7XG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0dGhyb3coXCJDYW5ub3Qgc3BsaWNlUHVzaCB3aXRob3V0IGEgJGluZGV4IGludGVnZXIgdmFsdWUhXCIpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR0aHJvdyhcIkNhbm5vdCBzcGxpY2VQdXNoIHdpdGggYSBrZXkgdGhhdCBpcyBub3QgYW4gYXJyYXkhIChcIiArIGkgKyBcIikhXCIpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckbW92ZSc6XG5cdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIExvb3AgdGhlIGFycmF5IGFuZCBmaW5kIG1hdGNoZXMgdG8gb3VyIHNlYXJjaFxuXHRcdFx0XHRcdFx0XHRcdGZvciAodG1wSW5kZXggPSAwOyB0bXBJbmRleCA8IGRvY1tpXS5sZW5ndGg7IHRtcEluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmICh0aGlzLl9tYXRjaChkb2NbaV1bdG1wSW5kZXhdLCB1cGRhdGVbaV0pKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHZhciBtb3ZlVG9JbmRleCA9IHVwZGF0ZVtpXS4kaW5kZXg7XG5cblx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKG1vdmVUb0luZGV4ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aGlzLl91cGRhdGVTcGxpY2VNb3ZlKGRvY1tpXSwgdG1wSW5kZXgsIG1vdmVUb0luZGV4KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0aHJvdyhcIkNhbm5vdCBtb3ZlIHdpdGhvdXQgYSAkaW5kZXggaW50ZWdlciB2YWx1ZSFcIik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93KFwiQ2Fubm90IHB1bGwgZnJvbSBhIGtleSB0aGF0IGlzIG5vdCBhbiBhcnJheSEgKFwiICsgaSArIFwiKSFcIik7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdGlmIChkb2NbaV0gIT09IHVwZGF0ZVtpXSkge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuX3VwZGF0ZVByb3BlcnR5KGRvYywgaSwgdXBkYXRlW2ldKTtcblx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdXBkYXRlZDtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyBpZiB0aGUgcGFzc2VkIGtleSBoYXMgYW4gYXJyYXkgcG9zaXRpb25hbCBtYXJrIChhIGRvbGxhciBhdCB0aGUgZW5kXG4gKiBvZiBpdHMgbmFtZSkuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFRoZSBrZXkgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBpdCBpcyBhIHBvc2l0aW9uYWwgb3IgZmFsc2UgaWYgbm90LlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX2lzUG9zaXRpb25hbEtleSA9IGZ1bmN0aW9uIChrZXkpIHtcblx0cmV0dXJuIGtleS5zdWJzdHIoa2V5Lmxlbmd0aCAtIDIsIDIpID09PSAnLiQnO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIGEgcHJvcGVydHkgb24gYW4gb2JqZWN0IGRlcGVuZGluZyBvbiBpZiB0aGUgY29sbGVjdGlvbiBpc1xuICogY3VycmVudGx5IHJ1bm5pbmcgZGF0YS1iaW5kaW5nIG9yIG5vdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIG9iamVjdCB3aG9zZSBwcm9wZXJ0eSBpcyB0byBiZSB1cGRhdGVkLlxuICogQHBhcmFtIHtTdHJpbmd9IHByb3AgVGhlIHByb3BlcnR5IHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7Kn0gdmFsIFRoZSBuZXcgdmFsdWUgb2YgdGhlIHByb3BlcnR5LlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVByb3BlcnR5ID0gZnVuY3Rpb24gKGRvYywgcHJvcCwgdmFsKSB7XG5cdGlmICh0aGlzLl9saW5rZWQpIHtcblx0XHQkLm9ic2VydmFibGUoZG9jKS5zZXRQcm9wZXJ0eShwcm9wLCB2YWwpO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5Db2xsZWN0aW9uOiBTZXR0aW5nIGRhdGEtYm91bmQgZG9jdW1lbnQgcHJvcGVydHkgXCInICsgcHJvcCArICdcIiBmb3IgY29sbGVjdGlvbiBcIicgKyB0aGlzLm5hbWUoKSArICdcIicpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRkb2NbcHJvcF0gPSB2YWw7XG5cblx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLkNvbGxlY3Rpb246IFNldHRpbmcgbm9uLWRhdGEtYm91bmQgZG9jdW1lbnQgcHJvcGVydHkgXCInICsgcHJvcCArICdcIiBmb3IgY29sbGVjdGlvbiBcIicgKyB0aGlzLm5hbWUoKSArICdcIicpO1xuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBJbmNyZW1lbnRzIGEgdmFsdWUgZm9yIGEgcHJvcGVydHkgb24gYSBkb2N1bWVudCBieSB0aGUgcGFzc2VkIG51bWJlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIG1vZGlmeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wIFRoZSBwcm9wZXJ0eSB0byBtb2RpZnkuXG4gKiBAcGFyYW0ge051bWJlcn0gdmFsIFRoZSBhbW91bnQgdG8gaW5jcmVtZW50IGJ5LlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZUluY3JlbWVudCA9IGZ1bmN0aW9uIChkb2MsIHByb3AsIHZhbCkge1xuXHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0JC5vYnNlcnZhYmxlKGRvYykuc2V0UHJvcGVydHkocHJvcCwgZG9jW3Byb3BdICsgdmFsKTtcblx0fSBlbHNlIHtcblx0XHRkb2NbcHJvcF0gKz0gdmFsO1xuXHR9XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIGluZGV4IG9mIGFuIGl0ZW0gaW4gdGhlIHBhc3NlZCBhcnJheS5cbiAqIEBwYXJhbSB7QXJyYXl9IGFyciBUaGUgYXJyYXkgdG8gbW9kaWZ5LlxuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4RnJvbSBUaGUgaW5kZXggdG8gbW92ZSB0aGUgaXRlbSBmcm9tLlxuICogQHBhcmFtIHtOdW1iZXJ9IGluZGV4VG8gVGhlIGluZGV4IHRvIG1vdmUgdGhlIGl0ZW0gdG8uXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlU3BsaWNlTW92ZSA9IGZ1bmN0aW9uIChhcnIsIGluZGV4RnJvbSwgaW5kZXhUbykge1xuXHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0JC5vYnNlcnZhYmxlKGFycikubW92ZShpbmRleEZyb20sIGluZGV4VG8pO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5Db2xsZWN0aW9uOiBNb3ZpbmcgZGF0YS1ib3VuZCBkb2N1bWVudCBhcnJheSBpbmRleCBmcm9tIFwiJyArIGluZGV4RnJvbSArICdcIiB0byBcIicgKyBpbmRleFRvICsgJ1wiIGZvciBjb2xsZWN0aW9uIFwiJyArIHRoaXMubmFtZSgpICsgJ1wiJyk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGFyci5zcGxpY2UoaW5kZXhUbywgMCwgYXJyLnNwbGljZShpbmRleEZyb20sIDEpWzBdKTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuQ29sbGVjdGlvbjogTW92aW5nIG5vbi1kYXRhLWJvdW5kIGRvY3VtZW50IGFycmF5IGluZGV4IGZyb20gXCInICsgaW5kZXhGcm9tICsgJ1wiIHRvIFwiJyArIGluZGV4VG8gKyAnXCIgZm9yIGNvbGxlY3Rpb24gXCInICsgdGhpcy5uYW1lKCkgKyAnXCInKTtcblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogSW5zZXJ0cyBhbiBpdGVtIGludG8gdGhlIHBhc3NlZCBhcnJheSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICogQHBhcmFtIHtBcnJheX0gYXJyIFRoZSBhcnJheSB0byBpbnNlcnQgaW50by5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpbmRleCBUaGUgaW5kZXggdG8gaW5zZXJ0IGF0LlxuICogQHBhcmFtIHtPYmplY3R9IGRvYyBUaGUgZG9jdW1lbnQgdG8gaW5zZXJ0LlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3VwZGF0ZVNwbGljZVB1c2ggPSBmdW5jdGlvbiAoYXJyLCBpbmRleCwgZG9jKSB7XG5cdGlmIChhcnIubGVuZ3RoID4gaW5kZXgpIHtcblx0XHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0XHQkLm9ic2VydmFibGUoYXJyKS5pbnNlcnQoaW5kZXgsIGRvYyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFyci5zcGxpY2UoaW5kZXgsIDAsIGRvYyk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGlmICh0aGlzLl9saW5rZWQpIHtcblx0XHRcdCQub2JzZXJ2YWJsZShhcnIpLmluc2VydChkb2MpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhcnIucHVzaChkb2MpO1xuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBJbnNlcnRzIGFuIGl0ZW0gYXQgdGhlIGVuZCBvZiBhbiBhcnJheS5cbiAqIEBwYXJhbSB7QXJyYXl9IGFyciBUaGUgYXJyYXkgdG8gaW5zZXJ0IHRoZSBpdGVtIGludG8uXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byBpbnNlcnQuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlUHVzaCA9IGZ1bmN0aW9uIChhcnIsIGRvYykge1xuXHRpZiAodGhpcy5fbGlua2VkKSB7XG5cdFx0JC5vYnNlcnZhYmxlKGFycikuaW5zZXJ0KGRvYyk7XG5cdH0gZWxzZSB7XG5cdFx0YXJyLnB1c2goZG9jKTtcblx0fVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFuIGl0ZW0gZnJvbSB0aGUgcGFzc2VkIGFycmF5LlxuICogQHBhcmFtIHtBcnJheX0gYXJyIFRoZSBhcnJheSB0byBtb2RpZnkuXG4gKiBAcGFyYW0ge051bWJlcn0gaW5kZXggVGhlIGluZGV4IG9mIHRoZSBpdGVtIGluIHRoZSBhcnJheSB0byByZW1vdmUuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fdXBkYXRlUHVsbCA9IGZ1bmN0aW9uIChhcnIsIGluZGV4KSB7XG5cdGlmICh0aGlzLl9saW5rZWQpIHtcblx0XHQkLm9ic2VydmFibGUoYXJyKS5yZW1vdmUoaW5kZXgpO1xuXHR9IGVsc2Uge1xuXHRcdGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYW55IGRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uIHRoYXQgbWF0Y2ggdGhlIHNlYXJjaCBxdWVyeVxuICoga2V5L3ZhbHVlcy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBxdWVyeSBUaGUgcXVlcnkgb2JqZWN0LlxuICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiB0aGUgZG9jdW1lbnRzIHRoYXQgd2VyZSByZW1vdmVkLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAocXVlcnkpIHtcblx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdGRhdGFTZXQsXG5cdFx0aW5kZXgsXG5cdFx0dmlld3MgPSB0aGlzLl92aWV3cyxcblx0XHR2aWV3SW5kZXgsXG5cdFx0ZGF0YUl0ZW0sXG5cdFx0YXJySW5kZXgsXG5cdFx0cmV0dXJuQXJyO1xuXG5cdGlmIChxdWVyeSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0cmV0dXJuQXJyID0gW107XG5cblx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBxdWVyeS5sZW5ndGg7IGFyckluZGV4KyspIHtcblx0XHRcdHJldHVybkFyci5wdXNoKHRoaXMucmVtb3ZlKHF1ZXJ5W2FyckluZGV4XSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXR1cm5BcnI7XG5cdH0gZWxzZSB7XG5cdFx0ZGF0YVNldCA9IHRoaXMuZmluZChxdWVyeSwge2RlY291cGxlOiBmYWxzZX0pO1xuXHRcdGlmIChkYXRhU2V0Lmxlbmd0aCkge1xuXHRcdFx0Ly8gUmVtb3ZlIHRoZSBkYXRhIGZyb20gdGhlIGNvbGxlY3Rpb25cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZGF0YVNldC5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRkYXRhSXRlbSA9IGRhdGFTZXRbaV07XG5cblx0XHRcdFx0Ly8gUmVtb3ZlIHRoZSBpdGVtIGZyb20gdGhlIGNvbGxlY3Rpb24ncyBpbmRleGVzXG5cdFx0XHRcdHRoaXMuX3JlbW92ZUluZGV4KGRhdGFJdGVtKTtcblxuXHRcdFx0XHQvLyBSZW1vdmUgZGF0YSBmcm9tIGludGVybmFsIHN0b3Jlc1xuXHRcdFx0XHRpbmRleCA9IHRoaXMuX2RhdGEuaW5kZXhPZihkYXRhSXRlbSk7XG5cblx0XHRcdFx0aWYgKHRoaXMuX2xpbmtlZCkge1xuXHRcdFx0XHRcdCQub2JzZXJ2YWJsZSh0aGlzLl9kYXRhKS5yZW1vdmUoaW5kZXgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuX2RhdGEuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBMb29wIHZpZXdzIGFuZCBwYXNzIHRoZW0gdGhlIHJlbW92ZSBxdWVyeVxuXHRcdFx0aWYgKHZpZXdzICYmIHZpZXdzLmxlbmd0aCkge1xuXHRcdFx0XHRmb3IgKHZpZXdJbmRleCA9IDA7IHZpZXdJbmRleCA8IHZpZXdzLmxlbmd0aDsgdmlld0luZGV4KyspIHtcblx0XHRcdFx0XHR2aWV3c1t2aWV3SW5kZXhdLnJlbW92ZShxdWVyeSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fb25SZW1vdmUoZGF0YVNldCk7XG5cdFx0XHR0aGlzLmRlZmVyRW1pdCgnY2hhbmdlJywge3R5cGU6ICdyZW1vdmUnLCBkYXRhOiBkYXRhU2V0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGRhdGFTZXQ7XG5cdH1cbn07XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCB0aGF0IHJlbW92ZXMgYSBkb2N1bWVudCB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIGlkLlxuICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBpZCBvZiB0aGUgZG9jdW1lbnQgdG8gcmVtb3ZlLlxuICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiBkb2N1bWVudHMgdGhhdCB3ZXJlIHJlbW92ZWQuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnJlbW92ZUJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcblx0dmFyIHNlYXJjaE9iaiA9IHt9O1xuXHRzZWFyY2hPYmpbdGhpcy5fcHJpbWFyeUtleV0gPSBpZDtcblx0cmV0dXJuIHRoaXMucmVtb3ZlKHNlYXJjaE9iaik7XG59O1xuXG4vKipcbiAqIFF1ZXVlcyBhbiBldmVudCB0byBiZSBmaXJlZC4gVGhpcyBoYXMgYXV0b21hdGljIGRlLWJvdW5jaW5nIHNvIHRoYXQgYW55XG4gKiBldmVudHMgb2YgdGhlIHNhbWUgdHlwZSB0aGF0IG9jY3VyIHdpdGhpbiAxMDAgbWlsbGlzZWNvbmRzIG9mIGEgcHJldmlvdXNcbiAqIG9uZSB3aWxsIGFsbCBiZSB3cmFwcGVkIGludG8gYSBzaW5nbGUgZW1pdCByYXRoZXIgdGhhbiBlbWl0dGluZyB0b25zIG9mXG4gKiBldmVudHMgZm9yIGxvdHMgb2YgY2hhaW5lZCBpbnNlcnRzIGV0Yy5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRlZmVyRW1pdCA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdGFyZ3M7XG5cblx0aWYgKCF0aGlzLl9ub0VtaXREZWZlciAmJiAoIXRoaXMuX2RiIHx8ICh0aGlzLl9kYiAmJiAhdGhpcy5fZGIuX25vRW1pdERlZmVyKSkpIHtcblx0XHRhcmdzID0gYXJndW1lbnRzO1xuXG5cdFx0Ly8gQ2hlY2sgZm9yIGFuIGV4aXN0aW5nIHRpbWVvdXRcblx0XHRpZiAodGhpcy5fY2hhbmdlVGltZW91dCkge1xuXHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMuX2NoYW5nZVRpbWVvdXQpO1xuXHRcdH1cblxuXHRcdC8vIFNldCBhIHRpbWVvdXRcblx0XHR0aGlzLl9jaGFuZ2VUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoc2VsZi5kZWJ1ZygpKSB7IGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuQ29sbGVjdGlvbjogRW1pdHRpbmcgJyArIGFyZ3NbMF0pOyB9XG5cdFx0XHRzZWxmLmVtaXQuYXBwbHkoc2VsZiwgYXJncyk7XG5cdFx0fSwgMTAwKTtcblx0fSBlbHNlIHtcblx0XHR0aGlzLmVtaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0fVxufTtcblxuLyoqXG4gKiBQcm9jZXNzZXMgYSBkZWZlcnJlZCBhY3Rpb24gcXVldWUuXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgcXVldWUgbmFtZSB0byBwcm9jZXNzLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQSBtZXRob2QgdG8gY2FsbCB3aGVuIHRoZSBxdWV1ZSBoYXMgcHJvY2Vzc2VkLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5wcm9jZXNzUXVldWUgPSBmdW5jdGlvbiAodHlwZSwgY2FsbGJhY2spIHtcblx0dmFyIHF1ZXVlID0gdGhpcy5fZGVmZXJRdWV1ZVt0eXBlXSxcblx0XHRkZWZlclRocmVzaG9sZCA9IHRoaXMuX2RlZmVyVGhyZXNob2xkW3R5cGVdLFxuXHRcdGRlZmVyVGltZSA9IHRoaXMuX2RlZmVyVGltZVt0eXBlXTtcblxuXHRpZiAocXVldWUubGVuZ3RoKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0ZGF0YUFycjtcblxuXHRcdC8vIFByb2Nlc3MgaXRlbXMgdXAgdG8gdGhlIHRocmVzaG9sZFxuXHRcdGlmIChxdWV1ZS5sZW5ndGgpIHtcblx0XHRcdGlmIChxdWV1ZS5sZW5ndGggPiBkZWZlclRocmVzaG9sZCkge1xuXHRcdFx0XHQvLyBHcmFiIGl0ZW1zIHVwIHRvIHRoZSB0aHJlc2hvbGQgdmFsdWVcblx0XHRcdFx0ZGF0YUFyciA9IHF1ZXVlLnNwbGljZSgwLCBkZWZlclRocmVzaG9sZCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBHcmFiIGFsbCB0aGUgcmVtYWluaW5nIGl0ZW1zXG5cdFx0XHRcdGRhdGFBcnIgPSBxdWV1ZS5zcGxpY2UoMCwgcXVldWUubGVuZ3RoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpc1t0eXBlXShkYXRhQXJyKTtcblx0XHR9XG5cblx0XHQvLyBRdWV1ZSBhbm90aGVyIHByb2Nlc3Ncblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYucHJvY2Vzc1F1ZXVlKHR5cGUsIGNhbGxiYWNrKTtcblx0XHR9LCBkZWZlclRpbWUpO1xuXHR9IGVsc2Uge1xuXHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9XG5cdH1cbn07XG5cbi8qKlxuICogSW5zZXJ0cyBhIGRvY3VtZW50IG9yIGFycmF5IG9mIGRvY3VtZW50cyBpbnRvIHRoZSBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtPYmplY3R8fEFycmF5fSBkYXRhIEVpdGhlciBhIGRvY3VtZW50IG9iamVjdCBvciBhcnJheSBvZiBkb2N1bWVudFxuICogQHBhcmFtIHtOdW1iZXI9fSBpbmRleCBPcHRpb25hbCBpbmRleCB0byBpbnNlcnQgdGhlIHJlY29yZCBhdC5cbiAqIEBwYXJhbSB7RnVuY3Rpb249fSBjYWxsYmFjayBPcHRpb25hbCBjYWxsYmFjayBjYWxsZWQgb25jZSBhY3Rpb24gaXMgY29tcGxldGUuXG4gKiBvYmplY3RzIHRvIGluc2VydCBpbnRvIHRoZSBjb2xsZWN0aW9uLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZGF0YSwgaW5kZXgsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2YoaW5kZXgpID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0Y2FsbGJhY2sgPSBpbmRleDtcblx0XHRpbmRleCA9IHRoaXMuX2RhdGEubGVuZ3RoO1xuXHR9IGVsc2UgaWYgKGluZGV4ID09PSB1bmRlZmluZWQpIHtcblx0XHRpbmRleCA9IHRoaXMuX2RhdGEubGVuZ3RoO1xuXHR9XG5cblx0ZGF0YSA9IHRoaXMudHJhbnNmb3JtSW4oZGF0YSk7XG5cdHJldHVybiB0aGlzLl9pbnNlcnRIYW5kbGUoZGF0YSwgaW5kZXgsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogSW5zZXJ0cyBhIGRvY3VtZW50IG9yIGFycmF5IG9mIGRvY3VtZW50cyBpbnRvIHRoZSBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtPYmplY3R8fEFycmF5fSBkYXRhIEVpdGhlciBhIGRvY3VtZW50IG9iamVjdCBvciBhcnJheSBvZiBkb2N1bWVudFxuICogQHBhcmFtIHtOdW1iZXI9fSBpbmRleCBPcHRpb25hbCBpbmRleCB0byBpbnNlcnQgdGhlIHJlY29yZCBhdC5cbiAqIEBwYXJhbSB7RnVuY3Rpb249fSBjYWxsYmFjayBPcHRpb25hbCBjYWxsYmFjayBjYWxsZWQgb25jZSBhY3Rpb24gaXMgY29tcGxldGUuXG4gKiBvYmplY3RzIHRvIGluc2VydCBpbnRvIHRoZSBjb2xsZWN0aW9uLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0SGFuZGxlID0gZnVuY3Rpb24gKGRhdGEsIGluZGV4LCBjYWxsYmFjaykge1xuXHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0cXVldWUgPSB0aGlzLl9kZWZlclF1ZXVlLmluc2VydCxcblx0XHRkZWZlclRocmVzaG9sZCA9IHRoaXMuX2RlZmVyVGhyZXNob2xkLmluc2VydCxcblx0XHRkZWZlclRpbWUgPSB0aGlzLl9kZWZlclRpbWUuaW5zZXJ0LFxuXHRcdGluc2VydGVkID0gW10sXG5cdFx0ZmFpbGVkID0gW10sXG5cdFx0aW5zZXJ0UmVzdWx0LFxuXHRcdHZpZXdzID0gdGhpcy5fdmlld3MsXG5cdFx0dmlld0luZGV4LFxuXHRcdGk7XG5cblx0aWYgKGRhdGEgaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdC8vIENoZWNrIGlmIHRoZXJlIGFyZSBtb3JlIGluc2VydCBpdGVtcyB0aGFuIHRoZSBpbnNlcnQgZGVmZXJcblx0XHQvLyB0aHJlc2hvbGQsIGlmIHNvLCBicmVhayB1cCBpbnNlcnRzIHNvIHdlIGRvbid0IHRpZSB1cCB0aGVcblx0XHQvLyB1aSBvciB0aHJlYWRcblx0XHRpZiAoZGF0YS5sZW5ndGggPiBkZWZlclRocmVzaG9sZCkge1xuXHRcdFx0Ly8gQnJlYWsgdXAgaW5zZXJ0IGludG8gYmxvY2tzXG5cdFx0XHR0aGlzLl9kZWZlclF1ZXVlLmluc2VydCA9IHF1ZXVlLmNvbmNhdChkYXRhKTtcblxuXHRcdFx0Ly8gRmlyZSBvZmYgdGhlIGluc2VydCBxdWV1ZSBoYW5kbGVyXG5cdFx0XHR0aGlzLnByb2Nlc3NRdWV1ZSgnaW5zZXJ0JywgY2FsbGJhY2spO1xuXG5cdFx0XHRyZXR1cm47XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIExvb3AgdGhlIGFycmF5IGFuZCBhZGQgaXRlbXNcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluc2VydFJlc3VsdCA9IHRoaXMuX2luc2VydChkYXRhW2ldLCBpbmRleCArIGkpO1xuXG5cdFx0XHRcdGlmIChpbnNlcnRSZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdFx0XHRpbnNlcnRlZC5wdXNoKGRhdGFbaV0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZhaWxlZC5wdXNoKHtcblx0XHRcdFx0XHRcdGRvYzogZGF0YVtpXSxcblx0XHRcdFx0XHRcdHJlYXNvbjogaW5zZXJ0UmVzdWx0XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Ly8gU3RvcmUgdGhlIGRhdGEgaXRlbVxuXHRcdGluc2VydFJlc3VsdCA9IHRoaXMuX2luc2VydChkYXRhLCBpbmRleCk7XG5cblx0XHRpZiAoaW5zZXJ0UmVzdWx0ID09PSB0cnVlKSB7XG5cdFx0XHRpbnNlcnRlZC5wdXNoKGRhdGEpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmYWlsZWQucHVzaCh7XG5cdFx0XHRcdGRvYzogZGF0YSxcblx0XHRcdFx0cmVhc29uOiBpbnNlcnRSZXN1bHRcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdC8vIExvb3Agdmlld3MgYW5kIHBhc3MgdGhlbSB0aGUgaW5zZXJ0IHF1ZXJ5XG5cdGlmICh2aWV3cyAmJiB2aWV3cy5sZW5ndGgpIHtcblx0XHRmb3IgKHZpZXdJbmRleCA9IDA7IHZpZXdJbmRleCA8IHZpZXdzLmxlbmd0aDsgdmlld0luZGV4KyspIHtcblx0XHRcdHZpZXdzW3ZpZXdJbmRleF0uaW5zZXJ0KGRhdGEsIGluZGV4KTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLl9vbkluc2VydChpbnNlcnRlZCwgZmFpbGVkKTtcblx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCk7IH1cblx0dGhpcy5kZWZlckVtaXQoJ2NoYW5nZScsIHt0eXBlOiAnaW5zZXJ0JywgZGF0YTogaW5zZXJ0ZWR9KTtcblxuXHRyZXR1cm4ge1xuXHRcdGluc2VydGVkOiBpbnNlcnRlZCxcblx0XHRmYWlsZWQ6IGZhaWxlZFxuXHR9O1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtZXRob2QgdG8gaW5zZXJ0IGEgZG9jdW1lbnQgaW50byB0aGUgY29sbGVjdGlvbi4gV2lsbFxuICogY2hlY2sgZm9yIGluZGV4IHZpb2xhdGlvbnMgYmVmb3JlIGFsbG93aW5nIHRoZSBkb2N1bWVudCB0byBiZSBpbnNlcnRlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydCBhZnRlciBwYXNzaW5nIGluZGV4IHZpb2xhdGlvblxuICogdGVzdHMuXG4gKiBAcGFyYW0ge051bWJlcj19IGluZGV4IE9wdGlvbmFsIGluZGV4IHRvIGluc2VydCB0aGUgZG9jdW1lbnQgYXQuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbnxPYmplY3R9IFRydWUgb24gc3VjY2VzcywgZmFsc2UgaWYgbm8gZG9jdW1lbnQgcGFzc2VkLFxuICogb3IgYW4gb2JqZWN0IGNvbnRhaW5pbmcgZGV0YWlscyBhYm91dCBhbiBpbmRleCB2aW9sYXRpb24gaWYgb25lIG9jY3VycmVkLlxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX2luc2VydCA9IGZ1bmN0aW9uIChkb2MsIGluZGV4KSB7XG5cdGlmIChkb2MpIHtcblx0XHR2YXIgaW5kZXhWaW9sYXRpb247XG5cblx0XHR0aGlzLl9lbnN1cmVQcmltYXJ5S2V5KGRvYyk7XG5cblx0XHQvLyBDaGVjayBpbmRleGVzIGFyZSBub3QgZ29pbmcgdG8gYmUgYnJva2VuIGJ5IHRoZSBkb2N1bWVudFxuXHRcdGluZGV4VmlvbGF0aW9uID0gdGhpcy5pbnNlcnRJbmRleFZpb2xhdGlvbihkb2MpO1xuXG5cdFx0aWYgKCFpbmRleFZpb2xhdGlvbikge1xuXHRcdFx0Ly8gQWRkIHRoZSBpdGVtIHRvIHRoZSBjb2xsZWN0aW9uJ3MgaW5kZXhlc1xuXHRcdFx0dGhpcy5faW5zZXJ0SW5kZXgoZG9jKTtcblxuXHRcdFx0Ly8gSW5zZXJ0IHRoZSBkb2N1bWVudFxuXHRcdFx0aWYgKHRoaXMuX2xpbmtlZCkge1xuXHRcdFx0XHQkLm9ic2VydmFibGUodGhpcy5fZGF0YSkuaW5zZXJ0KGluZGV4LCBkb2MpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fZGF0YS5zcGxpY2UoaW5kZXgsIDAsIGRvYyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gJ0luZGV4IHZpb2xhdGlvbiBpbiBpbmRleDogJyArIGluZGV4VmlvbGF0aW9uO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiAnTm8gZG9jdW1lbnQgcGFzc2VkIHRvIGluc2VydCc7XG59O1xuXG4vKipcbiAqIEluc2VydHMgYSBkb2N1bWVudCBpbnRvIHRoZSBjb2xsZWN0aW9uIGluZGV4ZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byBpbnNlcnQuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0SW5kZXggPSBmdW5jdGlvbiAoZG9jKSB7XG5cdHZhciBhcnIgPSB0aGlzLl9pbmRleEJ5TmFtZSxcblx0XHRhcnJJbmRleCxcblx0XHRqU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoZG9jKTtcblxuXHQvLyBJbnNlcnQgdG8gcHJpbWFyeSBrZXkgaW5kZXhcblx0dGhpcy5fcHJpbWFyeUluZGV4LnVuaXF1ZVNldChkb2NbdGhpcy5fcHJpbWFyeUtleV0sIGRvYyk7XG5cdHRoaXMuX3ByaW1hcnlDcmMudW5pcXVlU2V0KGRvY1t0aGlzLl9wcmltYXJ5S2V5XSwgalN0cmluZyk7XG5cdHRoaXMuX2NyY0xvb2t1cC51bmlxdWVTZXQoalN0cmluZywgZG9jKTtcblxuXHQvLyBJbnNlcnQgaW50byBvdGhlciBpbmRleGVzXG5cdGZvciAoYXJySW5kZXggaW4gYXJyKSB7XG5cdFx0aWYgKGFyci5oYXNPd25Qcm9wZXJ0eShhcnJJbmRleCkpIHtcblx0XHRcdGFyclthcnJJbmRleF0uaW5zZXJ0KGRvYyk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYSBkb2N1bWVudCBmcm9tIHRoZSBjb2xsZWN0aW9uIGluZGV4ZXMuXG4gKiBAcGFyYW0ge09iamVjdH0gZG9jIFRoZSBkb2N1bWVudCB0byByZW1vdmUuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fcmVtb3ZlSW5kZXggPSBmdW5jdGlvbiAoZG9jKSB7XG5cdHZhciBhcnIgPSB0aGlzLl9pbmRleEJ5TmFtZSxcblx0XHRhcnJJbmRleCxcblx0XHRqU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkoZG9jKTtcblxuXHQvLyBSZW1vdmUgZnJvbSBwcmltYXJ5IGtleSBpbmRleFxuXHR0aGlzLl9wcmltYXJ5SW5kZXgudW5TZXQoZG9jW3RoaXMuX3ByaW1hcnlLZXldKTtcblx0dGhpcy5fcHJpbWFyeUNyYy51blNldChkb2NbdGhpcy5fcHJpbWFyeUtleV0pO1xuXHR0aGlzLl9jcmNMb29rdXAudW5TZXQoalN0cmluZyk7XG5cblx0Ly8gUmVtb3ZlIGZyb20gb3RoZXIgaW5kZXhlc1xuXHRmb3IgKGFyckluZGV4IGluIGFycikge1xuXHRcdGlmIChhcnIuaGFzT3duUHJvcGVydHkoYXJySW5kZXgpKSB7XG5cdFx0XHRhcnJbYXJySW5kZXhdLnJlbW92ZShkb2MpO1xuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBVc2VzIHRoZSBwYXNzZWQgcXVlcnkgdG8gZ2VuZXJhdGUgYSBuZXcgY29sbGVjdGlvbiB3aXRoIHJlc3VsdHNcbiAqIG1hdGNoaW5nIHRoZSBxdWVyeSBwYXJhbWV0ZXJzLlxuICpcbiAqIEBwYXJhbSBxdWVyeVxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5zdWJzZXQgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMpIHtcblx0dmFyIHJlc3VsdCA9IHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cblx0cmV0dXJuIG5ldyBDb2xsZWN0aW9uKClcblx0XHQuX3N1YnNldE9mKHRoaXMpXG5cdFx0LnByaW1hcnlLZXkodGhpcy5fcHJpbWFyeUtleSlcblx0XHQuc2V0RGF0YShyZXN1bHQpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBjb2xsZWN0aW9uIHRoYXQgdGhpcyBjb2xsZWN0aW9uIGlzIGEgc3Vic2V0IG9mLlxuICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnN1YnNldE9mID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5fX3N1YnNldE9mO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBjb2xsZWN0aW9uIHRoYXQgdGhpcyBjb2xsZWN0aW9uIGlzIGEgc3Vic2V0IG9mLlxuICogQHBhcmFtIHtDb2xsZWN0aW9ufSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIHNldCBhcyB0aGUgcGFyZW50IG9mIHRoaXMgc3Vic2V0LlxuICogQHJldHVybnMgeyp9IFRoaXMgb2JqZWN0IGZvciBjaGFpbmluZy5cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9zdWJzZXRPZiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XG5cdHRoaXMuX19zdWJzZXRPZiA9IGNvbGxlY3Rpb247XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBGaW5kIHRoZSBkaXN0aW5jdCB2YWx1ZXMgZm9yIGEgc3BlY2lmaWVkIGZpZWxkIGFjcm9zcyBhIHNpbmdsZSBjb2xsZWN0aW9uIGFuZFxuICogcmV0dXJucyB0aGUgcmVzdWx0cyBpbiBhbiBhcnJheS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGZpZWxkIHBhdGggdG8gcmV0dXJuIGRpc3RpbmN0IHZhbHVlcyBmb3IgZS5nLiBcInBlcnNvbi5uYW1lXCIuXG4gKiBAcGFyYW0ge09iamVjdD19IHF1ZXJ5IFRoZSBxdWVyeSB0byB1c2UgdG8gZmlsdGVyIHRoZSBkb2N1bWVudHMgdXNlZCB0byByZXR1cm4gdmFsdWVzIGZyb20uXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgVGhlIHF1ZXJ5IG9wdGlvbnMgdG8gdXNlIHdoZW4gcnVubmluZyB0aGUgcXVlcnkuXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRpc3RpbmN0ID0gZnVuY3Rpb24gKGtleSwgcXVlcnksIG9wdGlvbnMpIHtcblx0dmFyIGRhdGEgPSB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpLFxuXHRcdHBhdGhTb2x2ZXIgPSBuZXcgUGF0aChrZXkpLFxuXHRcdHZhbHVlVXNlZCA9IHt9LFxuXHRcdGRpc3RpbmN0VmFsdWVzID0gW10sXG5cdFx0dmFsdWUsXG5cdFx0aTtcblxuXHQvLyBMb29wIHRoZSBkYXRhIGFuZCBidWlsZCBhcnJheSBvZiBkaXN0aW5jdCB2YWx1ZXNcblx0Zm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHR2YWx1ZSA9IHBhdGhTb2x2ZXIudmFsdWUoZGF0YVtpXSlbMF07XG5cblx0XHRpZiAodmFsdWUgJiYgIXZhbHVlVXNlZFt2YWx1ZV0pIHtcblx0XHRcdHZhbHVlVXNlZFt2YWx1ZV0gPSB0cnVlO1xuXHRcdFx0ZGlzdGluY3RWYWx1ZXMucHVzaCh2YWx1ZSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGRpc3RpbmN0VmFsdWVzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGEgbm9uLXJlZmVyZW5jZWQgdmVyc2lvbiBvZiB0aGUgcGFzc2VkIG9iamVjdCAvIGFycmF5LlxuICogQHBhcmFtIHtPYmplY3R9IGRhdGEgVGhlIG9iamVjdCBvciBhcnJheSB0byByZXR1cm4gYXMgYSBub24tcmVmZXJlbmNlZCB2ZXJzaW9uLlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRlY291cGxlID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0cmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xufTtcblxuLyoqXG4gKiBIZWxwZXIgbWV0aG9kIHRvIGZpbmQgYSBkb2N1bWVudCBieSBpdCdzIGlkLlxuICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBpZCBvZiB0aGUgZG9jdW1lbnQuXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgVGhlIG9wdGlvbnMgb2JqZWN0LCBhbGxvd2VkIGtleXMgYXJlIHNvcnQgYW5kIGxpbWl0LlxuICogQHJldHVybnMge0FycmF5fSBUaGUgaXRlbXMgdGhhdCB3ZXJlIHVwZGF0ZWQuXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmRCeUlkID0gZnVuY3Rpb24gKGlkLCBvcHRpb25zKSB7XG5cdHZhciBzZWFyY2hPYmogPSB7fTtcblx0c2VhcmNoT2JqW3RoaXMuX3ByaW1hcnlLZXldID0gaWQ7XG5cdHJldHVybiB0aGlzLmZpbmQoc2VhcmNoT2JqLCBvcHRpb25zKVswXTtcbn07XG5cbi8qKlxuICogRmluZHMgYWxsIGRvY3VtZW50cyB0aGF0IGNvbnRhaW4gdGhlIHBhc3NlZCBzdHJpbmcgb3Igc2VhcmNoIG9iamVjdFxuICogcmVnYXJkbGVzcyBvZiB3aGVyZSB0aGUgc3RyaW5nIG1pZ2h0IG9jY3VyIHdpdGhpbiB0aGUgZG9jdW1lbnQuIFRoaXNcbiAqIHdpbGwgbWF0Y2ggc3RyaW5ncyBmcm9tIHRoZSBzdGFydCwgbWlkZGxlIG9yIGVuZCBvZiB0aGUgZG9jdW1lbnQnc1xuICogc3RyaW5nIChwYXJ0aWFsIG1hdGNoKS5cbiAqIEBwYXJhbSBzZWFyY2ggVGhlIHN0cmluZyB0byBzZWFyY2ggZm9yLiBDYXNlIHNlbnNpdGl2ZS5cbiAqIEBwYXJhbSBvcHRpb25zIEEgc3RhbmRhcmQgZmluZCgpIG9wdGlvbnMgb2JqZWN0LlxuICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiBkb2N1bWVudHMgdGhhdCBtYXRjaGVkIHRoZSBzZWFyY2ggc3RyaW5nLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5wZWVrID0gZnVuY3Rpb24gKHNlYXJjaCwgb3B0aW9ucykge1xuXHQvLyBMb29wIGFsbCBpdGVtc1xuXHR2YXIgYXJyID0gdGhpcy5fZGF0YSxcblx0XHRhcnJDb3VudCA9IGFyci5sZW5ndGgsXG5cdFx0YXJySW5kZXgsXG5cdFx0YXJySXRlbSxcblx0XHR0ZW1wQ29sbCA9IG5ldyBDb2xsZWN0aW9uKCksXG5cdFx0dHlwZU9mU2VhcmNoID0gdHlwZW9mIHNlYXJjaDtcblxuXHRpZiAodHlwZU9mU2VhcmNoID09PSAnc3RyaW5nJykge1xuXHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGFyckNvdW50OyBhcnJJbmRleCsrKSB7XG5cdFx0XHQvLyBHZXQganNvbiByZXByZXNlbnRhdGlvbiBvZiBvYmplY3Rcblx0XHRcdGFyckl0ZW0gPSBKU09OLnN0cmluZ2lmeShhcnJbYXJySW5kZXhdKTtcblxuXHRcdFx0Ly8gQ2hlY2sgaWYgc3RyaW5nIGV4aXN0cyBpbiBvYmplY3QganNvblxuXHRcdFx0aWYgKGFyckl0ZW0uaW5kZXhPZihzZWFyY2gpID4gLTEpIHtcblx0XHRcdFx0Ly8gQWRkIHRoaXMgaXRlbSB0byB0aGUgdGVtcCBjb2xsZWN0aW9uXG5cdFx0XHRcdHRlbXBDb2xsLmluc2VydChhcnJbYXJySW5kZXhdKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGVtcENvbGwuZmluZCh7fSwgb3B0aW9ucyk7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZChzZWFyY2gsIG9wdGlvbnMpO1xuXHR9XG59O1xuXG4vKipcbiAqIFByb3ZpZGVzIGEgcXVlcnkgcGxhbiAvIG9wZXJhdGlvbnMgbG9nIGZvciBhIHF1ZXJ5LlxuICogQHBhcmFtIHtPYmplY3R9IHF1ZXJ5IFRoZSBxdWVyeSB0byBleGVjdXRlLlxuICogQHBhcmFtIHtPYmplY3Q9fSBvcHRpb25zIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0LlxuICogQHJldHVybnMge09iamVjdH0gVGhlIHF1ZXJ5IHBsYW4uXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmV4cGxhaW4gPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMpIHtcblx0dmFyIHJlc3VsdCA9IHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdHJldHVybiByZXN1bHQuX19mZGJPcC5fZGF0YTtcbn07XG5cbi8qKlxuICogUXVlcmllcyB0aGUgY29sbGVjdGlvbiBiYXNlZCBvbiB0aGUgcXVlcnkgb2JqZWN0IHBhc3NlZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBxdWVyeSBUaGUgcXVlcnkga2V5L3ZhbHVlcyB0aGF0IGEgZG9jdW1lbnQgbXVzdCBtYXRjaCBpblxuICogb3JkZXIgZm9yIGl0IHRvIGJlIHJldHVybmVkIGluIHRoZSByZXN1bHQgYXJyYXkuXG4gKiBAcGFyYW0ge09iamVjdD19IG9wdGlvbnMgQW4gb3B0aW9uYWwgb3B0aW9ucyBvYmplY3QuXG4gKlxuICogQHJldHVybnMge0FycmF5fSBUaGUgcmVzdWx0cyBhcnJheSBmcm9tIHRoZSBmaW5kIG9wZXJhdGlvbiwgY29udGFpbmluZyBhbGxcbiAqIGRvY3VtZW50cyB0aGF0IG1hdGNoZWQgdGhlIHF1ZXJ5LlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHF1ZXJ5LCBvcHRpb25zKSB7XG5cdHF1ZXJ5ID0gcXVlcnkgfHwge307XG5cdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdG9wdGlvbnMuZGVjb3VwbGUgPSBvcHRpb25zLmRlY291cGxlICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmRlY291cGxlIDogdHJ1ZTtcblxuXHR2YXIgb3AgPSB0aGlzLl9tZXRyaWNzLmNyZWF0ZSgnZmluZCcpLFxuXHRcdHNlbGYgPSB0aGlzLFxuXHRcdGFuYWx5c2lzLFxuXHRcdGZpbmFsUXVlcnksXG5cdFx0c2Nhbkxlbmd0aCxcblx0XHRyZXF1aXJlc1RhYmxlU2NhbiA9IHRydWUsXG5cdFx0cmVzdWx0QXJyLFxuXHRcdGpvaW5Db2xsZWN0aW9uSW5kZXgsXG5cdFx0am9pbkluZGV4LFxuXHRcdGpvaW5Db2xsZWN0aW9uID0ge30sXG5cdFx0am9pblF1ZXJ5LFxuXHRcdGpvaW5QYXRoLFxuXHRcdGpvaW5Db2xsZWN0aW9uTmFtZSxcblx0XHRqb2luQ29sbGVjdGlvbkluc3RhbmNlLFxuXHRcdGpvaW5NYXRjaCxcblx0XHRqb2luTWF0Y2hJbmRleCxcblx0XHRqb2luU2VhcmNoLFxuXHRcdGpvaW5NdWx0aSxcblx0XHRqb2luUmVxdWlyZSxcblx0XHRqb2luRmluZFJlc3VsdHMsXG5cdFx0cmVzdWx0Q29sbGVjdGlvbk5hbWUsXG5cdFx0cmVzdWx0SW5kZXgsXG5cdFx0cmVzdWx0UmVtb3ZlID0gW10sXG5cdFx0aW5kZXgsXG5cdFx0aSxcblx0XHRtYXRjaGVyID0gZnVuY3Rpb24gKGRvYykge1xuXHRcdFx0cmV0dXJuIHNlbGYuX21hdGNoKGRvYywgcXVlcnksICdhbmQnKTtcblx0XHR9O1xuXG5cdG9wLnN0YXJ0KCk7XG5cdGlmIChxdWVyeSkge1xuXHRcdC8vIEdldCBxdWVyeSBhbmFseXNpcyB0byBleGVjdXRlIGJlc3Qgb3B0aW1pc2VkIGNvZGUgcGF0aFxuXHRcdG9wLnRpbWUoJ2FuYWx5c2VRdWVyeScpO1xuXHRcdGFuYWx5c2lzID0gdGhpcy5fYW5hbHlzZVF1ZXJ5KHF1ZXJ5LCBvcHRpb25zLCBvcCk7XG5cdFx0b3AudGltZSgnYW5hbHlzZVF1ZXJ5Jyk7XG5cdFx0b3AuZGF0YSgnYW5hbHlzaXMnLCBhbmFseXNpcyk7XG5cblx0XHRpZiAoYW5hbHlzaXMuaGFzSm9pbiAmJiBhbmFseXNpcy5xdWVyaWVzSm9pbikge1xuXHRcdFx0Ly8gVGhlIHF1ZXJ5IGhhcyBhIGpvaW4gYW5kIHRyaWVzIHRvIGxpbWl0IGJ5IGl0J3Mgam9pbmVkIGRhdGFcblx0XHRcdC8vIEdldCBhbiBpbnN0YW5jZSByZWZlcmVuY2UgdG8gdGhlIGpvaW4gY29sbGVjdGlvbnNcblx0XHRcdG9wLnRpbWUoJ2pvaW5SZWZlcmVuY2VzJyk7XG5cdFx0XHRmb3IgKGpvaW5JbmRleCA9IDA7IGpvaW5JbmRleCA8IGFuYWx5c2lzLmpvaW5zT24ubGVuZ3RoOyBqb2luSW5kZXgrKykge1xuXHRcdFx0XHRqb2luQ29sbGVjdGlvbk5hbWUgPSBhbmFseXNpcy5qb2luc09uW2pvaW5JbmRleF07XG5cdFx0XHRcdGpvaW5QYXRoID0gbmV3IFBhdGgoYW5hbHlzaXMuam9pblF1ZXJpZXNbam9pbkNvbGxlY3Rpb25OYW1lXSk7XG5cdFx0XHRcdGpvaW5RdWVyeSA9IGpvaW5QYXRoLnZhbHVlKHF1ZXJ5KVswXTtcblx0XHRcdFx0am9pbkNvbGxlY3Rpb25bYW5hbHlzaXMuam9pbnNPbltqb2luSW5kZXhdXSA9IHRoaXMuX2RiLmNvbGxlY3Rpb24oYW5hbHlzaXMuam9pbnNPbltqb2luSW5kZXhdKS5zdWJzZXQoam9pblF1ZXJ5KTtcblx0XHRcdH1cblx0XHRcdG9wLnRpbWUoJ2pvaW5SZWZlcmVuY2VzJyk7XG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgaWYgYW4gaW5kZXggbG9va3VwIGNhbiBiZSB1c2VkIHRvIHJldHVybiB0aGlzIHJlc3VsdFxuXHRcdGlmIChhbmFseXNpcy5pbmRleE1hdGNoLmxlbmd0aCAmJiAoIW9wdGlvbnMgfHwgKG9wdGlvbnMgJiYgIW9wdGlvbnMuc2tpcEluZGV4KSkpIHtcblx0XHRcdG9wLmRhdGEoJ2luZGV4LnBvdGVudGlhbCcsIGFuYWx5c2lzLmluZGV4TWF0Y2gpO1xuXHRcdFx0b3AuZGF0YSgnaW5kZXgudXNlZCcsIGFuYWx5c2lzLmluZGV4TWF0Y2hbMF0uaW5kZXgpO1xuXG5cdFx0XHQvLyBHZXQgdGhlIGRhdGEgZnJvbSB0aGUgaW5kZXhcblx0XHRcdG9wLnRpbWUoJ2luZGV4TG9va3VwJyk7XG5cdFx0XHRyZXN1bHRBcnIgPSBhbmFseXNpcy5pbmRleE1hdGNoWzBdLmxvb2t1cDtcblx0XHRcdG9wLnRpbWUoJ2luZGV4TG9va3VwJyk7XG5cblx0XHRcdC8vIENoZWNrIGlmIHRoZSBpbmRleCBjb3ZlcmFnZSBpcyBhbGwga2V5cywgaWYgbm90IHdlIHN0aWxsIG5lZWQgdG8gdGFibGUgc2NhbiBpdFxuXHRcdFx0aWYgKGFuYWx5c2lzLmluZGV4TWF0Y2hbMF0ua2V5RGF0YS50b3RhbEtleUNvdW50ID09PSBhbmFseXNpcy5pbmRleE1hdGNoWzBdLmtleURhdGEubWF0Y2hlZEtleUNvdW50KSB7XG5cdFx0XHRcdC8vIFJlcXVpcmUgYSB0YWJsZSBzY2FuIHRvIGZpbmQgcmVsZXZhbnQgZG9jdW1lbnRzXG5cdFx0XHRcdHJlcXVpcmVzVGFibGVTY2FuID0gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdG9wLmZsYWcoJ3VzZWRJbmRleCcsIGZhbHNlKTtcblx0XHR9XG5cblx0XHRpZiAocmVxdWlyZXNUYWJsZVNjYW4pIHtcblx0XHRcdGlmIChyZXN1bHRBcnIgJiYgcmVzdWx0QXJyLmxlbmd0aCkge1xuXHRcdFx0XHRzY2FuTGVuZ3RoID0gcmVzdWx0QXJyLmxlbmd0aDtcblx0XHRcdFx0b3AudGltZSgndGFibGVTY2FuOiAnICsgc2Nhbkxlbmd0aCk7XG5cdFx0XHRcdC8vIEZpbHRlciB0aGUgc291cmNlIGRhdGEgYW5kIHJldHVybiB0aGUgcmVzdWx0XG5cdFx0XHRcdHJlc3VsdEFyciA9IHJlc3VsdEFyci5maWx0ZXIobWF0Y2hlcik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBGaWx0ZXIgdGhlIHNvdXJjZSBkYXRhIGFuZCByZXR1cm4gdGhlIHJlc3VsdFxuXHRcdFx0XHRzY2FuTGVuZ3RoID0gdGhpcy5fZGF0YS5sZW5ndGg7XG5cdFx0XHRcdG9wLnRpbWUoJ3RhYmxlU2NhbjogJyArIHNjYW5MZW5ndGgpO1xuXHRcdFx0XHRyZXN1bHRBcnIgPSB0aGlzLl9kYXRhLmZpbHRlcihtYXRjaGVyKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gT3JkZXIgdGhlIGFycmF5IGlmIHdlIHdlcmUgcGFzc2VkIGEgc29ydCBjbGF1c2Vcblx0XHRcdGlmIChvcHRpb25zLnNvcnQpIHtcblx0XHRcdFx0b3AudGltZSgnc29ydCcpO1xuXHRcdFx0XHRyZXN1bHRBcnIgPSB0aGlzLnNvcnQob3B0aW9ucy5zb3J0LCByZXN1bHRBcnIpO1xuXHRcdFx0XHRvcC50aW1lKCdzb3J0Jyk7XG5cdFx0XHR9XG5cdFx0XHRvcC50aW1lKCd0YWJsZVNjYW46ICcgKyBzY2FuTGVuZ3RoKTtcblx0XHR9XG5cblx0XHRpZiAob3B0aW9ucy5saW1pdCAmJiByZXN1bHRBcnIgJiYgcmVzdWx0QXJyLmxlbmd0aCA+IG9wdGlvbnMubGltaXQpIHtcblx0XHRcdHJlc3VsdEFyci5sZW5ndGggPSBvcHRpb25zLmxpbWl0O1xuXHRcdFx0b3AuZGF0YSgnbGltaXQnLCBvcHRpb25zLmxpbWl0KTtcblx0XHR9XG5cblx0XHRpZiAob3B0aW9ucy5kZWNvdXBsZSkge1xuXHRcdFx0Ly8gTm93IGRlY291cGxlIHRoZSBkYXRhIGZyb20gdGhlIG9yaWdpbmFsIG9iamVjdHNcblx0XHRcdG9wLnRpbWUoJ2RlY291cGxlJyk7XG5cdFx0XHRyZXN1bHRBcnIgPSB0aGlzLmRlY291cGxlKHJlc3VsdEFycik7XG5cdFx0XHRvcC50aW1lKCdkZWNvdXBsZScpO1xuXHRcdFx0b3AuZGF0YSgnZmxhZy5kZWNvdXBsZScsIHRydWUpO1xuXHRcdH1cblxuXHRcdC8vIE5vdyBwcm9jZXNzIGFueSBqb2lucyBvbiB0aGUgZmluYWwgZGF0YVxuXHRcdGlmIChvcHRpb25zLmpvaW4pIHtcblx0XHRcdGZvciAoam9pbkNvbGxlY3Rpb25JbmRleCA9IDA7IGpvaW5Db2xsZWN0aW9uSW5kZXggPCBvcHRpb25zLmpvaW4ubGVuZ3RoOyBqb2luQ29sbGVjdGlvbkluZGV4KyspIHtcblx0XHRcdFx0Zm9yIChqb2luQ29sbGVjdGlvbk5hbWUgaW4gb3B0aW9ucy5qb2luW2pvaW5Db2xsZWN0aW9uSW5kZXhdKSB7XG5cdFx0XHRcdFx0aWYgKG9wdGlvbnMuam9pbltqb2luQ29sbGVjdGlvbkluZGV4XS5oYXNPd25Qcm9wZXJ0eShqb2luQ29sbGVjdGlvbk5hbWUpKSB7XG5cdFx0XHRcdFx0XHQvLyBTZXQgdGhlIGtleSB0byBzdG9yZSB0aGUgam9pbiByZXN1bHQgaW4gdG8gdGhlIGNvbGxlY3Rpb24gbmFtZSBieSBkZWZhdWx0XG5cdFx0XHRcdFx0XHRyZXN1bHRDb2xsZWN0aW9uTmFtZSA9IGpvaW5Db2xsZWN0aW9uTmFtZTtcblxuXHRcdFx0XHRcdFx0Ly8gR2V0IHRoZSBqb2luIGNvbGxlY3Rpb24gaW5zdGFuY2UgZnJvbSB0aGUgREJcblx0XHRcdFx0XHRcdGpvaW5Db2xsZWN0aW9uSW5zdGFuY2UgPSB0aGlzLl9kYi5jb2xsZWN0aW9uKGpvaW5Db2xsZWN0aW9uTmFtZSk7XG5cblx0XHRcdFx0XHRcdC8vIEdldCB0aGUgbWF0Y2ggZGF0YSBmb3IgdGhlIGpvaW5cblx0XHRcdFx0XHRcdGpvaW5NYXRjaCA9IG9wdGlvbnMuam9pbltqb2luQ29sbGVjdGlvbkluZGV4XVtqb2luQ29sbGVjdGlvbk5hbWVdO1xuXG5cdFx0XHRcdFx0XHQvLyBMb29wIG91ciByZXN1bHQgZGF0YSBhcnJheVxuXHRcdFx0XHRcdFx0Zm9yIChyZXN1bHRJbmRleCA9IDA7IHJlc3VsdEluZGV4IDwgcmVzdWx0QXJyLmxlbmd0aDsgcmVzdWx0SW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHQvLyBMb29wIHRoZSBqb2luIGNvbmRpdGlvbnMgYW5kIGJ1aWxkIGEgc2VhcmNoIG9iamVjdCBmcm9tIHRoZW1cblx0XHRcdFx0XHRcdFx0am9pblNlYXJjaCA9IHt9O1xuXHRcdFx0XHRcdFx0XHRqb2luTXVsdGkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0am9pblJlcXVpcmUgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0Zm9yIChqb2luTWF0Y2hJbmRleCBpbiBqb2luTWF0Y2gpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoam9pbk1hdGNoLmhhc093blByb3BlcnR5KGpvaW5NYXRjaEluZGV4KSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgdGhlIGpvaW4gY29uZGl0aW9uIG5hbWUgZm9yIGEgc3BlY2lhbCBjb21tYW5kIG9wZXJhdG9yXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoam9pbk1hdGNoSW5kZXguc3Vic3RyKDAsIDEpID09PSAnJCcpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gU3BlY2lhbCBjb21tYW5kXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN3aXRjaCAoam9pbk1hdGNoSW5kZXgpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlICckYXMnOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gUmVuYW1lIHRoZSBjb2xsZWN0aW9uIHdoZW4gc3RvcmVkIGluIHRoZSByZXN1bHQgZG9jdW1lbnRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHJlc3VsdENvbGxlY3Rpb25OYW1lID0gam9pbk1hdGNoW2pvaW5NYXRjaEluZGV4XTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSAnJG11bHRpJzpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFJldHVybiBhbiBhcnJheSBvZiBkb2N1bWVudHMgaW5zdGVhZCBvZiBhIHNpbmdsZSBtYXRjaGluZyBkb2N1bWVudFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0am9pbk11bHRpID0gam9pbk1hdGNoW2pvaW5NYXRjaEluZGV4XTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSAnJHJlcXVpcmUnOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIHRoZSByZXN1bHQgaXRlbSBpZiBubyBtYXRjaGluZyBqb2luIGRhdGEgaXMgZm91bmRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGpvaW5SZXF1aXJlID0gam9pbk1hdGNoW2pvaW5NYXRjaEluZGV4XTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIENoZWNrIGZvciBhIGRvdWJsZS1kb2xsYXIgd2hpY2ggaXMgYSBiYWNrLXJlZmVyZW5jZSB0byB0aGUgcm9vdCBjb2xsZWN0aW9uIGl0ZW1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChqb2luTWF0Y2hJbmRleC5zdWJzdHIoMCwgMykgPT09ICckJC4nKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIEJhY2sgcmVmZXJlbmNlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFRPRE86IFN1cHBvcnQgY29tcGxleCBqb2luc1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIFRPRE86IENvdWxkIG9wdGltaXNlIHRoaXMgYnkgY2FjaGluZyBwYXRoIG9iamVjdHNcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gR2V0IHRoZSBkYXRhIHRvIG1hdGNoIGFnYWluc3QgYW5kIHN0b3JlIGluIHRoZSBzZWFyY2ggb2JqZWN0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGpvaW5TZWFyY2hbam9pbk1hdGNoSW5kZXhdID0gbmV3IFBhdGgoam9pbk1hdGNoW2pvaW5NYXRjaEluZGV4XSkudmFsdWUocmVzdWx0QXJyW3Jlc3VsdEluZGV4XSlbMF07XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0Ly8gRG8gYSBmaW5kIG9uIHRoZSB0YXJnZXQgY29sbGVjdGlvbiBhZ2FpbnN0IHRoZSBtYXRjaCBkYXRhXG5cdFx0XHRcdFx0XHRcdGpvaW5GaW5kUmVzdWx0cyA9IGpvaW5Db2xsZWN0aW9uSW5zdGFuY2UuZmluZChqb2luU2VhcmNoKTtcblxuXHRcdFx0XHRcdFx0XHQvLyBDaGVjayBpZiB3ZSByZXF1aXJlIGEgam9pbmVkIHJvdyB0byBhbGxvdyB0aGUgcmVzdWx0IGl0ZW1cblx0XHRcdFx0XHRcdFx0aWYgKCFqb2luUmVxdWlyZSB8fCAoam9pblJlcXVpcmUgJiYgam9pbkZpbmRSZXN1bHRzWzBdKSkge1xuXHRcdFx0XHRcdFx0XHRcdC8vIEpvaW4gaXMgbm90IHJlcXVpcmVkIG9yIGNvbmRpdGlvbiBpcyBtZXRcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHRBcnJbcmVzdWx0SW5kZXhdW3Jlc3VsdENvbGxlY3Rpb25OYW1lXSA9IGpvaW5NdWx0aSA9PT0gZmFsc2UgPyBqb2luRmluZFJlc3VsdHNbMF0gOiBqb2luRmluZFJlc3VsdHM7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gSm9pbiByZXF1aXJlZCBidXQgY29uZGl0aW9uIG5vdCBtZXQsIGFkZCBpdGVtIHRvIHJlbW92YWwgcXVldWVcblx0XHRcdFx0XHRcdFx0XHRyZXN1bHRSZW1vdmUucHVzaChyZXN1bHRBcnJbcmVzdWx0SW5kZXhdKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRvcC5kYXRhKCdmbGFnLmpvaW4nLCB0cnVlKTtcblx0XHR9XG5cblx0XHQvLyBQcm9jZXNzIHJlbW92YWwgcXVldWVcblx0XHRpZiAocmVzdWx0UmVtb3ZlLmxlbmd0aCkge1xuXHRcdFx0b3AudGltZSgncmVtb3ZhbFF1ZXVlJyk7XG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgcmVzdWx0UmVtb3ZlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGluZGV4ID0gcmVzdWx0QXJyLmluZGV4T2YocmVzdWx0UmVtb3ZlW2ldKTtcblxuXHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRcdHJlc3VsdEFyci5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRvcC50aW1lKCdyZW1vdmFsUXVldWUnKTtcblx0XHR9XG5cblx0XHRpZiAob3B0aW9ucy50cmFuc2Zvcm0pIHtcblx0XHRcdG9wLnRpbWUoJ3RyYW5zZm9ybScpO1xuXHRcdFx0Zm9yIChpID0gMDsgaSA8IHJlc3VsdEFyci5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRyZXN1bHRBcnIuc3BsaWNlKGksIDEsIG9wdGlvbnMudHJhbnNmb3JtKHJlc3VsdEFycltpXSkpO1xuXHRcdFx0fVxuXHRcdFx0b3AudGltZSgndHJhbnNmb3JtJyk7XG5cdFx0XHRvcC5kYXRhKCdmbGFnLnRyYW5zZm9ybScsIHRydWUpO1xuXHRcdH1cblxuXHRcdC8vIFByb2Nlc3MgdHJhbnNmb3Jtc1xuXHRcdGlmICh0aGlzLl90cmFuc2Zvcm1FbmFibGVkICYmIHRoaXMuX3RyYW5zZm9ybU91dCkge1xuXHRcdFx0b3AudGltZSgndHJhbnNmb3JtT3V0Jyk7XG5cdFx0XHRyZXN1bHRBcnIgPSB0aGlzLnRyYW5zZm9ybU91dChyZXN1bHRBcnIpO1xuXHRcdFx0b3AudGltZSgndHJhbnNmb3JtT3V0Jyk7XG5cdFx0fVxuXG5cblx0XHRvcC5kYXRhKCdyZXN1bHRzJywgcmVzdWx0QXJyLmxlbmd0aCk7XG5cblx0XHRvcC5zdG9wKCk7XG5cblx0XHRyZXN1bHRBcnIuX19mZGJPcCA9IG9wO1xuXG5cdFx0cmV0dXJuIHJlc3VsdEFycjtcblx0fSBlbHNlIHtcblx0XHRvcC5zdG9wKCk7XG5cblx0XHRyZXN1bHRBcnIgPSBbXTtcblx0XHRyZXN1bHRBcnIuX19mZGJPcCA9IG9wO1xuXG5cdFx0cmV0dXJuIHJlc3VsdEFycjtcblx0fVxufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgY29sbGVjdGlvbiB0cmFuc2Zvcm0gb3B0aW9ucy5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogQSBjb2xsZWN0aW9uIHRyYW5zZm9ybSBvcHRpb25zIG9iamVjdC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAob2JqKSB7XG5cdGlmIChvYmogIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiKSB7XG5cdFx0XHRpZiAob2JqLmVuYWJsZWQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1FbmFibGVkID0gb2JqLmVuYWJsZWQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChvYmouZGF0YUluICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5fdHJhbnNmb3JtSW4gPSBvYmouZGF0YUluO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAob2JqLmRhdGFPdXQgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1PdXQgPSBvYmouZGF0YU91dDtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKG9iaiA9PT0gZmFsc2UpIHtcblx0XHRcdFx0Ly8gVHVybiBvZmYgdHJhbnNmb3Jtc1xuXHRcdFx0XHR0aGlzLl90cmFuc2Zvcm1FbmFibGVkID0gZmFsc2U7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBUdXJuIG9uIHRyYW5zZm9ybXNcblx0XHRcdFx0dGhpcy5fdHJhbnNmb3JtRW5hYmxlZCA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGVuYWJsZWQ6IHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQsXG5cdFx0ZGF0YUluOiB0aGlzLl90cmFuc2Zvcm1Jbixcblx0XHRkYXRhT3V0OiB0aGlzLl90cmFuc2Zvcm1PdXRcblx0fVxufTtcblxuLyoqXG4gKiBUcmFuc2Zvcm1zIGRhdGEgdXNpbmcgdGhlIHNldCB0cmFuc2Zvcm1JbiBtZXRob2QuXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgZGF0YSB0byB0cmFuc2Zvcm0uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUudHJhbnNmb3JtSW4gPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCAmJiB0aGlzLl90cmFuc2Zvcm1Jbikge1xuXHRcdGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdHZhciBmaW5hbEFyciA9IFtdLCBpO1xuXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgZGF0YS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRmaW5hbEFycltpXSA9IHRoaXMuX3RyYW5zZm9ybUluKGRhdGFbaV0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZmluYWxBcnI7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLl90cmFuc2Zvcm1JbihkYXRhKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZGF0YTtcbn07XG5cbi8qKlxuICogVHJhbnNmb3JtcyBkYXRhIHVzaW5nIHRoZSBzZXQgdHJhbnNmb3JtT3V0IG1ldGhvZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIFRoZSBkYXRhIHRvIHRyYW5zZm9ybS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS50cmFuc2Zvcm1PdXQgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCAmJiB0aGlzLl90cmFuc2Zvcm1PdXQpIHtcblx0XHRpZiAoZGF0YSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHR2YXIgZmluYWxBcnIgPSBbXSwgaTtcblxuXHRcdFx0Zm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0ZmluYWxBcnJbaV0gPSB0aGlzLl90cmFuc2Zvcm1PdXQoZGF0YVtpXSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBmaW5hbEFycjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIHRoaXMuX3RyYW5zZm9ybU91dChkYXRhKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZGF0YTtcbn07XG5cbi8qKlxuICogU29ydHMgYW4gYXJyYXkgb2YgZG9jdW1lbnRzIGJ5IHRoZSBnaXZlbiBzb3J0IHBhdGguXG4gKiBAcGFyYW0geyp9IHNvcnRPYmogVGhlIGtleXMgYW5kIG9yZGVycyB0aGUgYXJyYXkgb2JqZWN0cyBzaG91bGQgYmUgc29ydGVkIGJ5LlxuICogQHBhcmFtIHtBcnJheX0gYXJyIFRoZSBhcnJheSBvZiBkb2N1bWVudHMgdG8gc29ydC5cbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuc29ydCA9IGZ1bmN0aW9uIChzb3J0T2JqLCBhcnIpIHtcblx0Ly8gTWFrZSBzdXJlIHdlIGhhdmUgYW4gYXJyYXkgb2JqZWN0XG5cdGFyciA9IGFyciB8fCBbXTtcblxuXHR2YXJcdHNvcnRBcnIgPSBbXSxcblx0XHRzb3J0S2V5LFxuXHRcdHNvcnRTaW5nbGVPYmo7XG5cblx0Zm9yIChzb3J0S2V5IGluIHNvcnRPYmopIHtcblx0XHRpZiAoc29ydE9iai5oYXNPd25Qcm9wZXJ0eShzb3J0S2V5KSkge1xuXHRcdFx0c29ydFNpbmdsZU9iaiA9IHt9O1xuXHRcdFx0c29ydFNpbmdsZU9ialtzb3J0S2V5XSA9IHNvcnRPYmpbc29ydEtleV07XG5cdFx0XHRzb3J0U2luZ2xlT2JqLl9fX2ZkYktleSA9IHNvcnRLZXk7XG5cdFx0XHRzb3J0QXJyLnB1c2goc29ydFNpbmdsZU9iaik7XG5cdFx0fVxuXHR9XG5cblx0aWYgKHNvcnRBcnIubGVuZ3RoIDwgMikge1xuXHRcdC8vIFRoZXJlIGlzIG9ubHkgb25lIHNvcnQgY3JpdGVyaWEsIGRvIGEgc2ltcGxlIHNvcnQgYW5kIHJldHVybiBpdFxuXHRcdHJldHVybiB0aGlzLl9zb3J0KHNvcnRPYmosIGFycik7XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIHRoaXMuX2J1Y2tldFNvcnQoc29ydEFyciwgYXJyKTtcblx0fVxufTtcblxuLyoqXG4gKiBUYWtlcyBhcnJheSBvZiBzb3J0IHBhdGhzIGFuZCBzb3J0cyB0aGVtIGludG8gYnVja2V0cyBiZWZvcmUgcmV0dXJuaW5nIGZpbmFsXG4gKiBhcnJheSBmdWxseSBzb3J0ZWQgYnkgbXVsdGkta2V5cy5cbiAqIEBwYXJhbSBrZXlBcnJcbiAqIEBwYXJhbSBhcnJcbiAqIEByZXR1cm5zIHsqfVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX2J1Y2tldFNvcnQgPSBmdW5jdGlvbiAoa2V5QXJyLCBhcnIpIHtcblx0dmFyIGtleU9iaiA9IGtleUFyci5zaGlmdCgpLFxuXHRcdGFyckNvcHksXG5cdFx0YnVja2V0cyxcblx0XHRpLFxuXHRcdGZpbmFsQXJyID0gW107XG5cblx0aWYgKGtleUFyci5sZW5ndGggPiAwKSB7XG5cdFx0Ly8gU29ydCBhcnJheSBieSBidWNrZXQga2V5XG5cdFx0YXJyID0gdGhpcy5fc29ydChrZXlPYmosIGFycik7XG5cblx0XHQvLyBTcGxpdCBpdGVtcyBpbnRvIGJ1Y2tldHNcblx0XHRidWNrZXRzID0gdGhpcy5idWNrZXQoa2V5T2JqLl9fX2ZkYktleSwgYXJyKTtcblxuXHRcdC8vIExvb3AgYnVja2V0cyBhbmQgc29ydCBjb250ZW50c1xuXHRcdGZvciAoaSBpbiBidWNrZXRzKSB7XG5cdFx0XHRpZiAoYnVja2V0cy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0XHRhcnJDb3B5ID0gW10uY29uY2F0KGtleUFycik7XG5cdFx0XHRcdGZpbmFsQXJyID0gZmluYWxBcnIuY29uY2F0KHRoaXMuX2J1Y2tldFNvcnQoYXJyQ29weSwgYnVja2V0c1tpXSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiBmaW5hbEFycjtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gdGhpcy5fc29ydChrZXlPYmosIGFycik7XG5cdH1cbn07XG5cbi8qKlxuICogU29ydHMgYXJyYXkgYnkgaW5kaXZpZHVhbCBzb3J0IHBhdGguXG4gKiBAcGFyYW0ga2V5XG4gKiBAcGFyYW0gYXJyXG4gKiBAcmV0dXJucyB7QXJyYXl8Kn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9zb3J0ID0gZnVuY3Rpb24gKGtleSwgYXJyKSB7XG5cdHZhciBzb3J0ZXJNZXRob2QsXG5cdFx0cGF0aFNvbHZlciA9IG5ldyBQYXRoKCksXG5cdFx0ZGF0YVBhdGggPSBwYXRoU29sdmVyLnBhcnNlKGtleSwgdHJ1ZSlbMF07XG5cblx0cGF0aFNvbHZlci5wYXRoKGRhdGFQYXRoLnBhdGgpO1xuXG5cdGlmIChkYXRhUGF0aC52YWx1ZSA9PT0gMSkge1xuXHRcdC8vIFNvcnQgYXNjZW5kaW5nXG5cdFx0c29ydGVyTWV0aG9kID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0XHRcdHZhciB2YWxBID0gcGF0aFNvbHZlci52YWx1ZShhKVswXSxcblx0XHRcdFx0dmFsQiA9IHBhdGhTb2x2ZXIudmFsdWUoYilbMF07XG5cblx0XHRcdGlmICh0eXBlb2YodmFsQSkgPT09ICdzdHJpbmcnICYmIHR5cGVvZih2YWxCKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0cmV0dXJuIHZhbEEubG9jYWxlQ29tcGFyZSh2YWxCKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh2YWxBID4gdmFsQikge1xuXHRcdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0XHR9IGVsc2UgaWYgKHZhbEEgPCB2YWxCKSB7XG5cdFx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwO1xuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0Ly8gU29ydCBkZXNjZW5kaW5nXG5cdFx0c29ydGVyTWV0aG9kID0gZnVuY3Rpb24gKGEsIGIpIHtcblx0XHRcdHZhciB2YWxBID0gcGF0aFNvbHZlci52YWx1ZShhKVswXSxcblx0XHRcdFx0dmFsQiA9IHBhdGhTb2x2ZXIudmFsdWUoYilbMF07XG5cblx0XHRcdGlmICh0eXBlb2YodmFsQSkgPT09ICdzdHJpbmcnICYmIHR5cGVvZih2YWxCKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0cmV0dXJuIHZhbEEubG9jYWxlQ29tcGFyZSh2YWxCKSA9PT0gMSA/IC0xIDogMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh2YWxBID4gdmFsQikge1xuXHRcdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdFx0fSBlbHNlIGlmICh2YWxBIDwgdmFsQikge1xuXHRcdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwO1xuXHRcdH07XG5cdH1cblxuXHRyZXR1cm4gYXJyLnNvcnQoc29ydGVyTWV0aG9kKTtcbn07XG5cbi8qKlxuICogVGFrZXMgYW4gYXJyYXkgb2Ygb2JqZWN0cyBhbmQgcmV0dXJucyBhIG5ldyBvYmplY3Qgd2l0aCB0aGUgYXJyYXkgaXRlbXNcbiAqIHNwbGl0IGludG8gYnVja2V0cyBieSB0aGUgcGFzc2VkIGtleS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byBzcGxpdCB0aGUgYXJyYXkgaW50byBidWNrZXRzIGJ5LlxuICogQHBhcmFtIHtBcnJheX0gYXJyIEFuIGFycmF5IG9mIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7T2JqZWN0fVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5idWNrZXQgPSBmdW5jdGlvbiAoa2V5LCBhcnIpIHtcblx0dmFyIGksXG5cdFx0YnVja2V0cyA9IHt9O1xuXG5cdGZvciAoaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcblx0XHRidWNrZXRzW2FycltpXVtrZXldXSA9IGJ1Y2tldHNbYXJyW2ldW2tleV1dIHx8IFtdO1xuXHRcdGJ1Y2tldHNbYXJyW2ldW2tleV1dLnB1c2goYXJyW2ldKTtcblx0fVxuXG5cdHJldHVybiBidWNrZXRzO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBtZXRob2QgdGhhdCB0YWtlcyBhIHNlYXJjaCBxdWVyeSBhbmQgb3B0aW9ucyBhbmQgcmV0dXJucyBhbiBvYmplY3RcbiAqIGNvbnRhaW5pbmcgZGV0YWlscyBhYm91dCB0aGUgcXVlcnkgd2hpY2ggY2FuIGJlIHVzZWQgdG8gb3B0aW1pc2UgdGhlIHNlYXJjaC5cbiAqXG4gKiBAcGFyYW0gcXVlcnlcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAcGFyYW0gb3BcbiAqIEByZXR1cm5zIHtPYmplY3R9XG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fYW5hbHlzZVF1ZXJ5ID0gZnVuY3Rpb24gKHF1ZXJ5LCBvcHRpb25zLCBvcCkge1xuXHR2YXIgYW5hbHlzaXMgPSB7XG5cdFx0XHRxdWVyaWVzT246IFt0aGlzLl9uYW1lXSxcblx0XHRcdGluZGV4TWF0Y2g6IFtdLFxuXHRcdFx0aGFzSm9pbjogZmFsc2UsXG5cdFx0XHRxdWVyaWVzSm9pbjogZmFsc2UsXG5cdFx0XHRqb2luUXVlcmllczoge30sXG5cdFx0XHRxdWVyeTogcXVlcnksXG5cdFx0XHRvcHRpb25zOiBvcHRpb25zXG5cdFx0fSxcblx0XHRqb2luQ29sbGVjdGlvbkluZGV4LFxuXHRcdGpvaW5Db2xsZWN0aW9uTmFtZSxcblx0XHRqb2luQ29sbGVjdGlvbnMgPSBbXSxcblx0XHRqb2luQ29sbGVjdGlvblJlZmVyZW5jZXMgPSBbXSxcblx0XHRxdWVyeVBhdGgsXG5cdFx0aW5kZXgsXG5cdFx0aW5kZXhNYXRjaERhdGEsXG5cdFx0aW5kZXhSZWYsXG5cdFx0aW5kZXhSZWZOYW1lLFxuXHRcdGluZGV4TG9va3VwLFxuXHRcdHBhdGhTb2x2ZXIsXG5cdFx0aTtcblxuXHQvLyBDaGVjayBpZiB0aGUgcXVlcnkgaXMgYSBwcmltYXJ5IGtleSBsb29rdXBcblx0b3AudGltZSgnY2hlY2tJbmRleGVzJyk7XG5cdGlmIChxdWVyeVt0aGlzLl9wcmltYXJ5S2V5XSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gUmV0dXJuIGl0ZW0gdmlhIHByaW1hcnkga2V5IHBvc3NpYmxlXG5cdFx0b3AudGltZSgnY2hlY2tJbmRleE1hdGNoOiBQcmltYXJ5IEtleScpO1xuXHRcdHBhdGhTb2x2ZXIgPSBuZXcgUGF0aCgpO1xuXHRcdGFuYWx5c2lzLmluZGV4TWF0Y2gucHVzaCh7XG5cdFx0XHRsb29rdXA6IHRoaXMuX3ByaW1hcnlJbmRleC5sb29rdXAocXVlcnksIG9wdGlvbnMpLFxuXHRcdFx0a2V5RGF0YToge1xuXHRcdFx0XHRtYXRjaGVkS2V5czogW3RoaXMuX3ByaW1hcnlLZXldLFxuXHRcdFx0XHRtYXRjaGVkS2V5Q291bnQ6IDEsXG5cdFx0XHRcdHRvdGFsS2V5Q291bnQ6IHBhdGhTb2x2ZXIuY291bnRLZXlzKHF1ZXJ5KVxuXHRcdFx0fSxcblx0XHRcdGluZGV4OiB0aGlzLl9wcmltYXJ5SW5kZXhcblx0XHR9KTtcblx0XHRvcC50aW1lKCdjaGVja0luZGV4TWF0Y2g6IFByaW1hcnkgS2V5Jyk7XG5cdH1cblxuXHQvLyBDaGVjayBpZiBhbiBpbmRleCBjYW4gc3BlZWQgdXAgdGhlIHF1ZXJ5XG5cdGZvciAoaSBpbiB0aGlzLl9pbmRleEJ5SWQpIHtcblx0XHRpZiAodGhpcy5faW5kZXhCeUlkLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRpbmRleFJlZiA9IHRoaXMuX2luZGV4QnlJZFtpXTtcblx0XHRcdGluZGV4UmVmTmFtZSA9IGluZGV4UmVmLm5hbWUoKTtcblxuXHRcdFx0b3AudGltZSgnY2hlY2tJbmRleE1hdGNoOiAnICsgaW5kZXhSZWZOYW1lKTtcblx0XHRcdGluZGV4TWF0Y2hEYXRhID0gaW5kZXhSZWYubWF0Y2gocXVlcnksIG9wdGlvbnMpO1xuXHRcdFx0aW5kZXhMb29rdXAgPSBpbmRleFJlZi5sb29rdXAocXVlcnksIG9wdGlvbnMpO1xuXG5cdFx0XHRpZiAoaW5kZXhNYXRjaERhdGEubWF0Y2hlZEtleUNvdW50ID4gMCkge1xuXHRcdFx0XHQvLyBUaGlzIGluZGV4IGNhbiBiZSB1c2VkLCBzdG9yZSBpdFxuXHRcdFx0XHRhbmFseXNpcy5pbmRleE1hdGNoLnB1c2goe1xuXHRcdFx0XHRcdGxvb2t1cDogaW5kZXhMb29rdXAsXG5cdFx0XHRcdFx0a2V5RGF0YTogaW5kZXhNYXRjaERhdGEsXG5cdFx0XHRcdFx0aW5kZXg6IGluZGV4UmVmXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0b3AudGltZSgnY2hlY2tJbmRleE1hdGNoOiAnICsgaW5kZXhSZWZOYW1lKTtcblxuXHRcdFx0aWYgKGluZGV4TWF0Y2hEYXRhLnRvdGFsS2V5Q291bnQgPT09IGluZGV4TWF0Y2hEYXRhLm1hdGNoZWRLZXlDb3VudCkge1xuXHRcdFx0XHQvLyBGb3VuZCBhbiBvcHRpbWFsIGluZGV4LCBkbyBub3QgY2hlY2sgZm9yIGFueSBtb3JlXG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRvcC50aW1lKCdjaGVja0luZGV4ZXMnKTtcblxuXHQvLyBTb3J0IGFycmF5IGRlc2NlbmRpbmcgb24gaW5kZXgga2V5IGNvdW50IChlZmZlY3RpdmVseSBhIG1lYXN1cmUgb2YgcmVsZXZhbmNlIHRvIHRoZSBxdWVyeSlcblx0aWYgKGFuYWx5c2lzLmluZGV4TWF0Y2gubGVuZ3RoID4gMSkge1xuXHRcdG9wLnRpbWUoJ2ZpbmRPcHRpbWFsSW5kZXgnKTtcblx0XHRhbmFseXNpcy5pbmRleE1hdGNoLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcblx0XHRcdGlmIChhLmtleURhdGEudG90YWxLZXlDb3VudCA9PT0gYS5rZXlEYXRhLm1hdGNoZWRLZXlDb3VudCkge1xuXHRcdFx0XHQvLyBUaGlzIGluZGV4IG1hdGNoZXMgYWxsIHF1ZXJ5IGtleXMgc28gd2lsbCByZXR1cm4gdGhlIGNvcnJlY3QgcmVzdWx0IGluc3RhbnRseVxuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChiLmtleURhdGEudG90YWxLZXlDb3VudCA9PT0gYi5rZXlEYXRhLm1hdGNoZWRLZXlDb3VudCkge1xuXHRcdFx0XHQvLyBUaGlzIGluZGV4IG1hdGNoZXMgYWxsIHF1ZXJ5IGtleXMgc28gd2lsbCByZXR1cm4gdGhlIGNvcnJlY3QgcmVzdWx0IGluc3RhbnRseVxuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVGhlIGluZGV4ZXMgZG9uJ3QgbWF0Y2ggYWxsIHRoZSBxdWVyeSBrZXlzLCBjaGVjayBpZiBib3RoIHRoZXNlIGluZGV4ZXMgbWF0Y2hcblx0XHRcdC8vIHRoZSBzYW1lIG51bWJlciBvZiBrZXlzIGFuZCBpZiBzbyB0aGV5IGFyZSB0ZWNobmljYWxseSBlcXVhbCBmcm9tIGEga2V5IHBvaW50XG5cdFx0XHQvLyBvZiB2aWV3LCBidXQgY2FuIHN0aWxsIGJlIGNvbXBhcmVkIGJ5IHRoZSBudW1iZXIgb2YgcmVjb3JkcyB0aGV5IHJldHVybiBmcm9tXG5cdFx0XHQvLyB0aGUgcXVlcnkuIFRoZSBmZXdlciByZWNvcmRzIHRoZXkgcmV0dXJuIHRoZSBiZXR0ZXIgc28gb3JkZXIgYnkgcmVjb3JkIGNvdW50XG5cdFx0XHRpZiAoYS5rZXlEYXRhLm1hdGNoZWRLZXlDb3VudCA9PT0gYi5rZXlEYXRhLm1hdGNoZWRLZXlDb3VudCkge1xuXHRcdFx0XHRyZXR1cm4gYS5sb29rdXAubGVuZ3RoIC0gYi5sb29rdXAubGVuZ3RoO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUaGUgaW5kZXhlcyBkb24ndCBtYXRjaCBhbGwgdGhlIHF1ZXJ5IGtleXMgYW5kIHRoZXkgZG9uJ3QgaGF2ZSBtYXRjaGluZyBrZXlcblx0XHRcdC8vIGNvdW50cywgc28gb3JkZXIgdGhlbSBieSBrZXkgY291bnQuIFRoZSBpbmRleCB3aXRoIHRoZSBtb3N0IG1hdGNoaW5nIGtleXNcblx0XHRcdC8vIHNob3VsZCByZXR1cm4gdGhlIHF1ZXJ5IHJlc3VsdHMgdGhlIGZhc3Rlc3Rcblx0XHRcdHJldHVybiBiLmtleURhdGEubWF0Y2hlZEtleUNvdW50IC0gYS5rZXlEYXRhLm1hdGNoZWRLZXlDb3VudDsgLy8gaW5kZXguX2tleUNvdW50XG5cdFx0fSk7XG5cdFx0b3AudGltZSgnZmluZE9wdGltYWxJbmRleCcpO1xuXHR9XG5cblx0Ly8gQ2hlY2sgZm9yIGpvaW4gZGF0YVxuXHRpZiAob3B0aW9ucy5qb2luKSB7XG5cdFx0YW5hbHlzaXMuaGFzSm9pbiA9IHRydWU7XG5cblx0XHQvLyBMb29wIGFsbCBqb2luIG9wZXJhdGlvbnNcblx0XHRmb3IgKGpvaW5Db2xsZWN0aW9uSW5kZXggPSAwOyBqb2luQ29sbGVjdGlvbkluZGV4IDwgb3B0aW9ucy5qb2luLmxlbmd0aDsgam9pbkNvbGxlY3Rpb25JbmRleCsrKSB7XG5cdFx0XHQvLyBMb29wIHRoZSBqb2luIGNvbGxlY3Rpb25zIGFuZCBrZWVwIGEgcmVmZXJlbmNlIHRvIHRoZW1cblx0XHRcdGZvciAoam9pbkNvbGxlY3Rpb25OYW1lIGluIG9wdGlvbnMuam9pbltqb2luQ29sbGVjdGlvbkluZGV4XSkge1xuXHRcdFx0XHRpZiAob3B0aW9ucy5qb2luW2pvaW5Db2xsZWN0aW9uSW5kZXhdLmhhc093blByb3BlcnR5KGpvaW5Db2xsZWN0aW9uTmFtZSkpIHtcblx0XHRcdFx0XHRqb2luQ29sbGVjdGlvbnMucHVzaChqb2luQ29sbGVjdGlvbk5hbWUpO1xuXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIGpvaW4gdXNlcyBhbiAkYXMgb3BlcmF0b3Jcblx0XHRcdFx0XHRpZiAoJyRhcycgaW4gb3B0aW9ucy5qb2luW2pvaW5Db2xsZWN0aW9uSW5kZXhdW2pvaW5Db2xsZWN0aW9uTmFtZV0pIHtcblx0XHRcdFx0XHRcdGpvaW5Db2xsZWN0aW9uUmVmZXJlbmNlcy5wdXNoKG9wdGlvbnMuam9pbltqb2luQ29sbGVjdGlvbkluZGV4XVtqb2luQ29sbGVjdGlvbk5hbWVdWyckYXMnXSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGpvaW5Db2xsZWN0aW9uUmVmZXJlbmNlcy5wdXNoKGpvaW5Db2xsZWN0aW9uTmFtZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gTG9vcCB0aGUgam9pbiBjb2xsZWN0aW9uIHJlZmVyZW5jZXMgYW5kIGRldGVybWluZSBpZiB0aGUgcXVlcnkgcmVmZXJlbmNlc1xuXHRcdC8vIGFueSBvZiB0aGUgY29sbGVjdGlvbnMgdGhhdCBhcmUgdXNlZCBpbiB0aGUgam9pbi4gSWYgdGhlcmUgbm8gcXVlcmllcyBhZ2FpbnN0XG5cdFx0Ly8gam9pbmVkIGNvbGxlY3Rpb25zIHRoZSBmaW5kIG1ldGhvZCBjYW4gdXNlIGEgY29kZSBwYXRoIG9wdGltaXNlZCBmb3IgdGhpcy5cblx0XHQvLyBRdWVyaWVzIGFnYWluc3Qgam9pbmVkIGNvbGxlY3Rpb25zIHJlcXVpcmVzIHRoZSBqb2luZWQgY29sbGVjdGlvbnMgdG8gYmUgZmlsdGVyZWRcblx0XHQvLyBmaXJzdCBhbmQgdGhlbiBqb2luZWQgc28gcmVxdWlyZXMgYSBsaXR0bGUgbW9yZSB3b3JrLlxuXHRcdGZvciAoaW5kZXggPSAwOyBpbmRleCA8IGpvaW5Db2xsZWN0aW9uUmVmZXJlbmNlcy5sZW5ndGg7IGluZGV4KyspIHtcblx0XHRcdC8vIENoZWNrIGlmIHRoZSBxdWVyeSByZWZlcmVuY2VzIGFueSBjb2xsZWN0aW9uIGRhdGEgdGhhdCB0aGUgam9pbiB3aWxsIGNyZWF0ZVxuXHRcdFx0cXVlcnlQYXRoID0gdGhpcy5fcXVlcnlSZWZlcmVuY2VzQ29sbGVjdGlvbihxdWVyeSwgam9pbkNvbGxlY3Rpb25SZWZlcmVuY2VzW2luZGV4XSwgJycpO1xuXG5cdFx0XHRpZiAocXVlcnlQYXRoKSB7XG5cdFx0XHRcdGFuYWx5c2lzLmpvaW5RdWVyaWVzW2pvaW5Db2xsZWN0aW9uc1tpbmRleF1dID0gcXVlcnlQYXRoO1xuXHRcdFx0XHRhbmFseXNpcy5xdWVyaWVzSm9pbiA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0YW5hbHlzaXMuam9pbnNPbiA9IGpvaW5Db2xsZWN0aW9ucztcblx0XHRhbmFseXNpcy5xdWVyaWVzT24gPSBhbmFseXNpcy5xdWVyaWVzT24uY29uY2F0KGpvaW5Db2xsZWN0aW9ucyk7XG5cdH1cblxuXHRyZXR1cm4gYW5hbHlzaXM7XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgcGFzc2VkIHF1ZXJ5IHJlZmVyZW5jZXMgdGhpcyBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHF1ZXJ5XG4gKiBAcGFyYW0gY29sbGVjdGlvblxuICogQHBhcmFtIHBhdGhcbiAqIEByZXR1cm5zIHsqfVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX3F1ZXJ5UmVmZXJlbmNlc0NvbGxlY3Rpb24gPSBmdW5jdGlvbiAocXVlcnksIGNvbGxlY3Rpb24sIHBhdGgpIHtcblx0dmFyIGk7XG5cblx0Zm9yIChpIGluIHF1ZXJ5KSB7XG5cdFx0aWYgKHF1ZXJ5Lmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHQvLyBDaGVjayBpZiB0aGlzIGtleSBpcyBhIHJlZmVyZW5jZSBtYXRjaFxuXHRcdFx0aWYgKGkgPT09IGNvbGxlY3Rpb24pIHtcblx0XHRcdFx0aWYgKHBhdGgpIHsgcGF0aCArPSAnLic7IH1cblx0XHRcdFx0cmV0dXJuIHBhdGggKyBpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHR5cGVvZihxdWVyeVtpXSkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0Ly8gUmVjdXJzZVxuXHRcdFx0XHRcdGlmIChwYXRoKSB7IHBhdGggKz0gJy4nOyB9XG5cdFx0XHRcdFx0cGF0aCArPSBpO1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLl9xdWVyeVJlZmVyZW5jZXNDb2xsZWN0aW9uKHF1ZXJ5W2ldLCBjb2xsZWN0aW9uLCBwYXRoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgbWV0aG9kIHRoYXQgY2hlY2tzIGEgZG9jdW1lbnQgYWdhaW5zdCBhIHRlc3Qgb2JqZWN0LlxuICogQHBhcmFtIHsqfSBzb3VyY2UgVGhlIHNvdXJjZSBvYmplY3Qgb3IgdmFsdWUgdG8gdGVzdCBhZ2FpbnN0LlxuICogQHBhcmFtIHsqfSB0ZXN0IFRoZSB0ZXN0IG9iamVjdCBvciB2YWx1ZSB0byB0ZXN0IHdpdGguXG4gKiBAcGFyYW0ge1N0cmluZz19IG9wVG9BcHBseSBUaGUgc3BlY2lhbCBvcGVyYXRpb24gdG8gYXBwbHkgdG8gdGhlIHRlc3Qgc3VjaFxuICogYXMgJ2FuZCcgb3IgYW4gJ29yJyBvcGVyYXRvci5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBUcnVlIGlmIHRoZSB0ZXN0IHdhcyBwb3NpdGl2ZSwgZmFsc2Ugb24gbmVnYXRpdmUuXG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5fbWF0Y2ggPSBmdW5jdGlvbiAoc291cmNlLCB0ZXN0LCBvcFRvQXBwbHkpIHtcblx0dmFyIG9wZXJhdGlvbixcblx0XHRhcHBseU9wLFxuXHRcdHJlY3Vyc2VWYWwsXG5cdFx0dG1wSW5kZXgsXG5cdFx0c291cmNlVHlwZSA9IHR5cGVvZiBzb3VyY2UsXG5cdFx0dGVzdFR5cGUgPSB0eXBlb2YgdGVzdCxcblx0XHRtYXRjaGVkQWxsID0gdHJ1ZSxcblx0XHRpO1xuXG5cdC8vIENoZWNrIGlmIHRoZSBjb21wYXJpc29uIGRhdGEgYXJlIGJvdGggc3RyaW5ncyBvciBudW1iZXJzXG5cdGlmICgoc291cmNlVHlwZSA9PT0gJ3N0cmluZycgfHwgc291cmNlVHlwZSA9PT0gJ251bWJlcicpICYmICh0ZXN0VHlwZSA9PT0gJ3N0cmluZycgfHwgdGVzdFR5cGUgPT09ICdudW1iZXInKSkge1xuXHRcdC8vIFRoZSBzb3VyY2UgYW5kIHRlc3QgZGF0YSBhcmUgZmxhdCB0eXBlcyB0aGF0IGRvIG5vdCByZXF1aXJlIHJlY3Vyc2l2ZSBzZWFyY2hlcyxcblx0XHQvLyBzbyBqdXN0IGNvbXBhcmUgdGhlbSBhbmQgcmV0dXJuIHRoZSByZXN1bHRcblx0XHRpZiAoc291cmNlICE9PSB0ZXN0KSB7XG5cdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGZvciAoaSBpbiB0ZXN0KSB7XG5cdFx0XHRpZiAodGVzdC5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0XHQvLyBSZXNldCBvcGVyYXRpb24gZmxhZ1xuXHRcdFx0XHRvcGVyYXRpb24gPSBmYWxzZTtcblxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgcHJvcGVydHkgc3RhcnRzIHdpdGggYSBkb2xsYXIgKGZ1bmN0aW9uKVxuXHRcdFx0XHRpZiAoaS5zdWJzdHIoMCwgMSkgPT09ICckJykge1xuXHRcdFx0XHRcdC8vIENoZWNrIGZvciBjb21tYW5kc1xuXHRcdFx0XHRcdHN3aXRjaCAoaSkge1xuXHRcdFx0XHRcdFx0Y2FzZSAnJGd0Jzpcblx0XHRcdFx0XHRcdFx0Ly8gR3JlYXRlciB0aGFuXG5cdFx0XHRcdFx0XHRcdGlmIChzb3VyY2UgPiB0ZXN0W2ldKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRvcGVyYXRpb24gPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJGd0ZSc6XG5cdFx0XHRcdFx0XHRcdC8vIEdyZWF0ZXIgdGhhbiBvciBlcXVhbFxuXHRcdFx0XHRcdFx0XHRpZiAoc291cmNlID49IHRlc3RbaV0pIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckbHQnOlxuXHRcdFx0XHRcdFx0XHQvLyBMZXNzIHRoYW5cblx0XHRcdFx0XHRcdFx0aWYgKHNvdXJjZSA8IHRlc3RbaV0pIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckbHRlJzpcblx0XHRcdFx0XHRcdFx0Ly8gTGVzcyB0aGFuIG9yIGVxdWFsXG5cdFx0XHRcdFx0XHRcdGlmIChzb3VyY2UgPD0gdGVzdFtpXSkge1xuXHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRleGlzdHMnOlxuXHRcdFx0XHRcdFx0XHQvLyBQcm9wZXJ0eSBleGlzdHNcblx0XHRcdFx0XHRcdFx0aWYgKChzb3VyY2UgPT09IHVuZGVmaW5lZCkgIT09IHRlc3RbaV0pIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckb3InOlxuXHRcdFx0XHRcdFx0XHQvLyBNYXRjaCB0cnVlIG9uIEFOWSBjaGVjayB0byBwYXNzXG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cblx0XHRcdFx0XHRcdFx0Zm9yICh2YXIgb3JJbmRleCA9IDA7IG9ySW5kZXggPCB0ZXN0W2ldLmxlbmd0aDsgb3JJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHRoaXMuX21hdGNoKHNvdXJjZSwgdGVzdFtpXVtvckluZGV4XSwgJ2FuZCcpKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJGFuZCc6XG5cdFx0XHRcdFx0XHRcdC8vIE1hdGNoIHRydWUgb24gQUxMIGNoZWNrcyB0byBwYXNzXG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cblx0XHRcdFx0XHRcdFx0Zm9yICh2YXIgYW5kSW5kZXggPSAwOyBhbmRJbmRleCA8IHRlc3RbaV0ubGVuZ3RoOyBhbmRJbmRleCsrKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF0aGlzLl9tYXRjaChzb3VyY2UsIHRlc3RbaV1bYW5kSW5kZXhdLCAnYW5kJykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRcdGNhc2UgJyRpbic6XG5cdFx0XHRcdFx0XHRcdC8vIEluXG5cblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgdGhhdCB0aGUgaW4gdGVzdCBpcyBhbiBhcnJheVxuXHRcdFx0XHRcdFx0XHRpZiAodGVzdFtpXSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGluQXJyID0gdGVzdFtpXSxcblx0XHRcdFx0XHRcdFx0XHRcdGluQXJyQ291bnQgPSBpbkFyci5sZW5ndGgsXG5cdFx0XHRcdFx0XHRcdFx0XHRpbkFyckluZGV4LFxuXHRcdFx0XHRcdFx0XHRcdFx0aXNJbiA9IGZhbHNlO1xuXG5cdFx0XHRcdFx0XHRcdFx0Zm9yIChpbkFyckluZGV4ID0gMDsgaW5BcnJJbmRleCA8IGluQXJyQ291bnQ7IGluQXJySW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGluQXJyW2luQXJySW5kZXhdID09PSBzb3VyY2UpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0aXNJbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmIChpc0luKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93KCdDYW5ub3QgdXNlIGEgJG5pbiBvcGVyYXRvciBvbiBhIG5vbi1hcnJheSBrZXk6ICcgKyBpKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0XHRjYXNlICckbmluJzpcblx0XHRcdFx0XHRcdFx0Ly8gTm90IGluXG5cblx0XHRcdFx0XHRcdFx0Ly8gQ2hlY2sgdGhhdCB0aGUgbm90LWluIHRlc3QgaXMgYW4gYXJyYXlcblx0XHRcdFx0XHRcdFx0aWYgKHRlc3RbaV0gaW5zdGFuY2VvZiBBcnJheSkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBub3RJbkFyciA9IHRlc3RbaV0sXG5cdFx0XHRcdFx0XHRcdFx0XHRub3RJbkFyckNvdW50ID0gbm90SW5BcnIubGVuZ3RoLFxuXHRcdFx0XHRcdFx0XHRcdFx0bm90SW5BcnJJbmRleCxcblx0XHRcdFx0XHRcdFx0XHRcdG5vdEluID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0XHRcdGZvciAobm90SW5BcnJJbmRleCA9IDA7IG5vdEluQXJySW5kZXggPCBub3RJbkFyckNvdW50OyBub3RJbkFyckluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChub3RJbkFycltub3RJbkFyckluZGV4XSA9PT0gc291cmNlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5vdEluID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmIChub3RJbikge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHR0aHJvdygnQ2Fubm90IHVzZSBhICRuaW4gb3BlcmF0b3Igb24gYSBub24tYXJyYXkga2V5OiAnICsgaSk7XG5cdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRvcGVyYXRpb24gPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdFx0Y2FzZSAnJG5lJzpcblx0XHRcdFx0XHRcdFx0Ly8gTm90IGVxdWFsc1xuXHRcdFx0XHRcdFx0XHRpZiAoc291cmNlICE9IHRlc3RbaV0pIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdG9wZXJhdGlvbiA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIENoZWNrIGZvciByZWdleFxuXHRcdFx0XHRpZiAoIW9wZXJhdGlvbiAmJiB0ZXN0W2ldIGluc3RhbmNlb2YgUmVnRXhwKSB7XG5cdFx0XHRcdFx0b3BlcmF0aW9uID0gdHJ1ZTtcblxuXHRcdFx0XHRcdGlmICh0eXBlb2Yoc291cmNlKSA9PT0gJ29iamVjdCcgJiYgc291cmNlW2ldICE9PSB1bmRlZmluZWQgJiYgdGVzdFtpXS50ZXN0KHNvdXJjZVtpXSkpIHtcblx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIW9wZXJhdGlvbikge1xuXHRcdFx0XHRcdC8vIENoZWNrIGlmIG91ciBxdWVyeSBpcyBhbiBvYmplY3Rcblx0XHRcdFx0XHRpZiAodHlwZW9mKHRlc3RbaV0pID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0Ly8gQmVjYXVzZSB0ZXN0W2ldIGlzIGFuIG9iamVjdCwgc291cmNlIG11c3QgYWxzbyBiZSBhbiBvYmplY3RcblxuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgb3VyIHNvdXJjZSBkYXRhIHdlIGFyZSBjaGVja2luZyB0aGUgdGVzdCBxdWVyeSBhZ2FpbnN0XG5cdFx0XHRcdFx0XHQvLyBpcyBhbiBvYmplY3Qgb3IgYW4gYXJyYXlcblx0XHRcdFx0XHRcdGlmIChzb3VyY2VbaV0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFx0XHRpZiAoc291cmNlW2ldIGluc3RhbmNlb2YgQXJyYXkgJiYgISh0ZXN0W2ldIGluc3RhbmNlb2YgQXJyYXkpKSB7XG5cdFx0XHRcdFx0XHRcdFx0Ly8gVGhlIHNvdXJjZSBkYXRhIGlzIGFuIGFycmF5LCBzbyBjaGVjayBlYWNoIGl0ZW0gdW50aWwgYVxuXHRcdFx0XHRcdFx0XHRcdC8vIG1hdGNoIGlzIGZvdW5kXG5cdFx0XHRcdFx0XHRcdFx0cmVjdXJzZVZhbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdGZvciAodG1wSW5kZXggPSAwOyB0bXBJbmRleCA8IHNvdXJjZVtpXS5sZW5ndGg7IHRtcEluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJlY3Vyc2VWYWwgPSB0aGlzLl9tYXRjaChzb3VyY2VbaV1bdG1wSW5kZXhdLCB0ZXN0W2ldLCBhcHBseU9wKTtcblxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHJlY3Vyc2VWYWwpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gT25lIG9mIHRoZSBhcnJheSBpdGVtcyBtYXRjaGVkIHRoZSBxdWVyeSBzbyB3ZSBjYW5cblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gaW5jbHVkZSB0aGlzIGl0ZW0gaW4gdGhlIHJlc3VsdHMsIHNvIGJyZWFrIG5vd1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRpZiAocmVjdXJzZVZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmICghKHNvdXJjZVtpXSBpbnN0YW5jZW9mIEFycmF5KSAmJiB0ZXN0W2ldIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBUaGUgdGVzdCBrZXkgZGF0YSBpcyBhbiBhcnJheSBhbmQgdGhlIHNvdXJjZSBrZXkgZGF0YSBpcyBub3Qgc28gY2hlY2tcblx0XHRcdFx0XHRcdFx0XHQvLyBlYWNoIGl0ZW0gaW4gdGhlIHRlc3Qga2V5IGRhdGEgdG8gc2VlIGlmIHRoZSBzb3VyY2UgaXRlbSBtYXRjaGVzIG9uZVxuXHRcdFx0XHRcdFx0XHRcdC8vIG9mIHRoZW0uIFRoaXMgaXMgZWZmZWN0aXZlbHkgYW4gJGluIHNlYXJjaC5cblx0XHRcdFx0XHRcdFx0XHRyZWN1cnNlVmFsID0gZmFsc2U7XG5cblx0XHRcdFx0XHRcdFx0XHRmb3IgKHRtcEluZGV4ID0gMDsgdG1wSW5kZXggPCB0ZXN0W2ldLmxlbmd0aDsgdG1wSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmVjdXJzZVZhbCA9IHRoaXMuX21hdGNoKHNvdXJjZVtpXSwgdGVzdFtpXVt0bXBJbmRleF0sIGFwcGx5T3ApO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAocmVjdXJzZVZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBPbmUgb2YgdGhlIGFycmF5IGl0ZW1zIG1hdGNoZWQgdGhlIHF1ZXJ5IHNvIHdlIGNhblxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBpbmNsdWRlIHRoaXMgaXRlbSBpbiB0aGUgcmVzdWx0cywgc28gYnJlYWsgbm93XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZihzb3VyY2UpID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdFx0XHRcdC8vIFJlY3Vyc2UgZG93biB0aGUgb2JqZWN0IHRyZWVcblx0XHRcdFx0XHRcdFx0XHRyZWN1cnNlVmFsID0gdGhpcy5fbWF0Y2goc291cmNlW2ldLCB0ZXN0W2ldLCBhcHBseU9wKTtcblxuXHRcdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAob3BUb0FwcGx5ID09PSAnb3InKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHJlY3Vyc2VWYWwgPSB0aGlzLl9tYXRjaCh1bmRlZmluZWQsIHRlc3RbaV0sIGFwcGx5T3ApO1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKHJlY3Vyc2VWYWwpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdvcicpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdC8vIEZpcnN0IGNoZWNrIGlmIHRoZSB0ZXN0IG1hdGNoIGlzIGFuICRleGlzdHNcblx0XHRcdFx0XHRcdFx0aWYgKHRlc3RbaV0gJiYgdGVzdFtpXVsnJGV4aXN0cyddICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRcdFx0XHQvLyBQdXNoIHRoZSBpdGVtIHRocm91Z2ggYW5vdGhlciBtYXRjaCByZWN1cnNlXG5cdFx0XHRcdFx0XHRcdFx0cmVjdXJzZVZhbCA9IHRoaXMuX21hdGNoKHVuZGVmaW5lZCwgdGVzdFtpXSwgYXBwbHlPcCk7XG5cblx0XHRcdFx0XHRcdFx0XHRpZiAocmVjdXJzZVZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRtYXRjaGVkQWxsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIHByb3AgbWF0Y2hlcyBvdXIgdGVzdCB2YWx1ZVxuXHRcdFx0XHRcdFx0aWYgKHNvdXJjZSAmJiBzb3VyY2VbaV0gPT09IHRlc3RbaV0pIHtcblx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHNvdXJjZSAmJiBzb3VyY2VbaV0gJiYgc291cmNlW2ldIGluc3RhbmNlb2YgQXJyYXkgJiYgdGVzdFtpXSAmJiB0eXBlb2YodGVzdFtpXSkgIT09IFwib2JqZWN0XCIpIHtcblx0XHRcdFx0XHRcdFx0Ly8gV2UgYXJlIGxvb2tpbmcgZm9yIGEgdmFsdWUgaW5zaWRlIGFuIGFycmF5XG5cblx0XHRcdFx0XHRcdFx0Ly8gVGhlIHNvdXJjZSBkYXRhIGlzIGFuIGFycmF5LCBzbyBjaGVjayBlYWNoIGl0ZW0gdW50aWwgYVxuXHRcdFx0XHRcdFx0XHQvLyBtYXRjaCBpcyBmb3VuZFxuXHRcdFx0XHRcdFx0XHRyZWN1cnNlVmFsID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdGZvciAodG1wSW5kZXggPSAwOyB0bXBJbmRleCA8IHNvdXJjZVtpXS5sZW5ndGg7IHRtcEluZGV4KyspIHtcblx0XHRcdFx0XHRcdFx0XHRyZWN1cnNlVmFsID0gdGhpcy5fbWF0Y2goc291cmNlW2ldW3RtcEluZGV4XSwgdGVzdFtpXSwgYXBwbHlPcCk7XG5cblx0XHRcdFx0XHRcdFx0XHRpZiAocmVjdXJzZVZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gT25lIG9mIHRoZSBhcnJheSBpdGVtcyBtYXRjaGVkIHRoZSBxdWVyeSBzbyB3ZSBjYW5cblx0XHRcdFx0XHRcdFx0XHRcdC8vIGluY2x1ZGUgdGhpcyBpdGVtIGluIHRoZSByZXN1bHRzLCBzbyBicmVhayBub3dcblx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGlmIChyZWN1cnNlVmFsKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKG9wVG9BcHBseSA9PT0gJ29yJykge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdG1hdGNoZWRBbGwgPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0bWF0Y2hlZEFsbCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChvcFRvQXBwbHkgPT09ICdhbmQnICYmICFtYXRjaGVkQWxsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG1hdGNoZWRBbGw7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgY3VycmVudGx5IGluIHRoZSBjb2xsZWN0aW9uLlxuICogQHJldHVybnMge051bWJlcn1cbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMpIHtcblx0aWYgKCFxdWVyeSkge1xuXHRcdHJldHVybiB0aGlzLl9kYXRhLmxlbmd0aDtcblx0fSBlbHNlIHtcblx0XHQvLyBSdW4gcXVlcnkgYW5kIHJldHVybiBjb3VudFxuXHRcdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpLmxlbmd0aDtcblx0fVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgbGluayB0byB0aGUgRE9NIGJldHdlZW4gdGhlIGNvbGxlY3Rpb24gZGF0YSBhbmQgdGhlIGVsZW1lbnRzXG4gKiBpbiB0aGUgcGFzc2VkIG91dHB1dCBzZWxlY3Rvci4gV2hlbiBuZXcgZWxlbWVudHMgYXJlIG5lZWRlZCBvciBjaGFuZ2VzXG4gKiBvY2N1ciB0aGUgcGFzc2VkIHRlbXBsYXRlU2VsZWN0b3IgaXMgdXNlZCB0byBnZXQgdGhlIHRlbXBsYXRlIHRoYXQgaXNcbiAqIG91dHB1dCB0byB0aGUgRE9NLlxuICogQHBhcmFtIG91dHB1dFRhcmdldFNlbGVjdG9yXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5saW5rID0gZnVuY3Rpb24gKG91dHB1dFRhcmdldFNlbGVjdG9yLCB0ZW1wbGF0ZVNlbGVjdG9yKSB7XG5cdC8vIENoZWNrIGZvciBleGlzdGluZyBkYXRhIGJpbmRpbmdcblx0dGhpcy5fbGlua3MgPSB0aGlzLl9saW5rcyB8fCB7fTtcblxuXHRpZiAoIXRoaXMuX2xpbmtzW3RlbXBsYXRlU2VsZWN0b3JdKSB7XG5cdFx0aWYgKCQob3V0cHV0VGFyZ2V0U2VsZWN0b3IpLmxlbmd0aCkge1xuXHRcdFx0Ly8gRW5zdXJlIHRoZSB0ZW1wbGF0ZSBpcyBpbiBtZW1vcnkgYW5kIGlmIG5vdCwgdHJ5IHRvIGdldCBpdFxuXHRcdFx0aWYgKCEkLnRlbXBsYXRlc1t0ZW1wbGF0ZVNlbGVjdG9yXSkge1xuXHRcdFx0XHQvLyBHcmFiIHRoZSB0ZW1wbGF0ZVxuXHRcdFx0XHR2YXIgdGVtcGxhdGUgPSAkKHRlbXBsYXRlU2VsZWN0b3IpO1xuXHRcdFx0XHRpZiAodGVtcGxhdGUubGVuZ3RoKSB7XG5cdFx0XHRcdFx0JC52aWV3cy50ZW1wbGF0ZXModGVtcGxhdGVTZWxlY3RvciwgJCh0ZW1wbGF0ZVswXSkuaHRtbCgpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aHJvdygnVW5hYmxlIHRvIGJpbmQgY29sbGVjdGlvbiB0byB0YXJnZXQgYmVjYXVzZSB0ZW1wbGF0ZSBkb2VzIG5vdCBleGlzdDogJyArIHRlbXBsYXRlU2VsZWN0b3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIENyZWF0ZSB0aGUgZGF0YSBiaW5kaW5nXG5cdFx0XHQkLnRlbXBsYXRlc1t0ZW1wbGF0ZVNlbGVjdG9yXS5saW5rKG91dHB1dFRhcmdldFNlbGVjdG9yLCB0aGlzLl9kYXRhKTtcblxuXHRcdFx0Ly8gQWRkIGxpbmsgdG8gZmxhZ3Ncblx0XHRcdHRoaXMuX2xpbmtzW3RlbXBsYXRlU2VsZWN0b3JdID0gb3V0cHV0VGFyZ2V0U2VsZWN0b3I7XG5cblx0XHRcdC8vIFNldCB0aGUgbGlua2VkIGZsYWdcblx0XHRcdHRoaXMuX2xpbmtlZCsrO1xuXG5cdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuQ29sbGVjdGlvbjogQWRkZWQgYmluZGluZyBjb2xsZWN0aW9uIFwiJyArIHRoaXMubmFtZSgpICsgJ1wiIHRvIG91dHB1dCB0YXJnZXQ6ICcgKyBvdXRwdXRUYXJnZXRTZWxlY3Rvcik7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdygnQ2Fubm90IGJpbmQgdmlldyBkYXRhIHRvIG91dHB1dCB0YXJnZXQgc2VsZWN0b3IgXCInICsgb3V0cHV0VGFyZ2V0U2VsZWN0b3IgKyAnXCIgYmVjYXVzZSBpdCBkb2VzIG5vdCBleGlzdCBpbiB0aGUgRE9NIScpO1xuXHRcdH1cblx0fVxuXG5cdHRocm93KCdDYW5ub3QgY3JlYXRlIGEgZHVwbGljYXRlIGxpbmsgdG8gdGhlIHRhcmdldDogJyArIG91dHB1dFRhcmdldFNlbGVjdG9yICsgJyB3aXRoIHRoZSB0ZW1wbGF0ZTogJyArIHRlbXBsYXRlU2VsZWN0b3IpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgbGluayB0byB0aGUgRE9NIGJldHdlZW4gdGhlIGNvbGxlY3Rpb24gZGF0YSBhbmQgdGhlIGVsZW1lbnRzXG4gKiBpbiB0aGUgcGFzc2VkIG91dHB1dCBzZWxlY3RvciB0aGF0IHdhcyBjcmVhdGVkIHVzaW5nIHRoZSBsaW5rKCkgbWV0aG9kLlxuICogQHBhcmFtIG91dHB1dFRhcmdldFNlbGVjdG9yXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS51bmxpbmsgPSBmdW5jdGlvbiAob3V0cHV0VGFyZ2V0U2VsZWN0b3IsIHRlbXBsYXRlU2VsZWN0b3IpIHtcblx0Ly8gQ2hlY2sgZm9yIGJpbmRpbmdcblx0dGhpcy5fbGlua3MgPSB0aGlzLl9saW5rcyB8fCB7fTtcblxuXHRpZiAodGhpcy5fbGlua3NbdGVtcGxhdGVTZWxlY3Rvcl0pIHtcblx0XHQvLyBSZW1vdmUgdGhlIGRhdGEgYmluZGluZ1xuXHRcdCQudGVtcGxhdGVzW3RlbXBsYXRlU2VsZWN0b3JdLnVubGluayhvdXRwdXRUYXJnZXRTZWxlY3Rvcik7XG5cblx0XHQvLyBSZW1vdmUgbGluayBmcm9tIGZsYWdzXG5cdFx0ZGVsZXRlIHRoaXMuX2xpbmtzW3RlbXBsYXRlU2VsZWN0b3JdO1xuXG5cdFx0Ly8gU2V0IHRoZSBsaW5rZWQgZmxhZ1xuXHRcdHRoaXMuX2xpbmtlZC0tO1xuXG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5Db2xsZWN0aW9uOiBSZW1vdmVkIGJpbmRpbmcgY29sbGVjdGlvbiBcIicgKyB0aGlzLm5hbWUoKSArICdcIiB0byBvdXRwdXQgdGFyZ2V0OiAnICsgb3V0cHV0VGFyZ2V0U2VsZWN0b3IpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0Y29uc29sZS5sb2coJ0Nhbm5vdCByZW1vdmUgbGluaywgb25lIGRvZXMgbm90IGV4aXN0IHRvIHRoZSB0YXJnZXQ6ICcgKyBvdXRwdXRUYXJnZXRTZWxlY3RvciArICcgd2l0aCB0aGUgdGVtcGxhdGU6ICcgKyB0ZW1wbGF0ZVNlbGVjdG9yKTtcbn07XG5cbi8qKlxuICogRmluZHMgc3ViLWRvY3VtZW50cyBmcm9tIHRoZSBjb2xsZWN0aW9uJ3MgZG9jdW1lbnRzLlxuICogQHBhcmFtIG1hdGNoXG4gKiBAcGFyYW0gcGF0aFxuICogQHBhcmFtIHN1YkRvY1F1ZXJ5XG4gKiBAcGFyYW0gc3ViRG9jT3B0aW9uc1xuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmZpbmRTdWIgPSBmdW5jdGlvbiAobWF0Y2gsIHBhdGgsIHN1YkRvY1F1ZXJ5LCBzdWJEb2NPcHRpb25zKSB7XG5cdHZhciBwYXRoSGFuZGxlciA9IG5ldyBQYXRoKHBhdGgpLFxuXHRcdGRvY0FyciA9IHRoaXMuZmluZChtYXRjaCksXG5cdFx0ZG9jQ291bnQgPSBkb2NBcnIubGVuZ3RoLFxuXHRcdGRvY0luZGV4LFxuXHRcdHN1YkRvY0Fycixcblx0XHRzdWJEb2NDb2xsZWN0aW9uID0gdGhpcy5fZGIuY29sbGVjdGlvbignX19GREJfdGVtcF8nICsgdGhpcy5vYmplY3RJZCgpKSxcblx0XHRzdWJEb2NSZXN1bHRzLFxuXHRcdHJlc3VsdE9iaiA9IHtcblx0XHRcdHBhcmVudHM6IGRvY0NvdW50LFxuXHRcdFx0c3ViRG9jVG90YWw6IDAsXG5cdFx0XHRzdWJEb2NzOiBbXSxcblx0XHRcdHBhdGhGb3VuZDogZmFsc2UsXG5cdFx0XHRlcnI6ICcnXG5cdFx0fTtcblxuXHRmb3IgKGRvY0luZGV4ID0gMDsgZG9jSW5kZXggPCBkb2NDb3VudDsgZG9jSW5kZXgrKykge1xuXHRcdHN1YkRvY0FyciA9IHBhdGhIYW5kbGVyLnZhbHVlKGRvY0Fycltkb2NJbmRleF0pWzBdO1xuXHRcdGlmIChzdWJEb2NBcnIpIHtcblx0XHRcdHN1YkRvY0NvbGxlY3Rpb24uc2V0RGF0YShzdWJEb2NBcnIpO1xuXHRcdFx0c3ViRG9jUmVzdWx0cyA9IHN1YkRvY0NvbGxlY3Rpb24uZmluZChzdWJEb2NRdWVyeSwgc3ViRG9jT3B0aW9ucyk7XG5cdFx0XHRpZiAoc3ViRG9jT3B0aW9ucy5yZXR1cm5GaXJzdCAmJiBzdWJEb2NSZXN1bHRzLmxlbmd0aCkge1xuXHRcdFx0XHRyZXR1cm4gc3ViRG9jUmVzdWx0c1swXTtcblx0XHRcdH1cblxuXHRcdFx0cmVzdWx0T2JqLnN1YkRvY3MucHVzaChzdWJEb2NSZXN1bHRzKTtcblx0XHRcdHJlc3VsdE9iai5zdWJEb2NUb3RhbCArPSBzdWJEb2NSZXN1bHRzLmxlbmd0aDtcblx0XHRcdHJlc3VsdE9iai5wYXRoRm91bmQgPSB0cnVlO1xuXHRcdH1cblx0fVxuXG5cdC8vIERyb3AgdGhlIHN1Yi1kb2N1bWVudCBjb2xsZWN0aW9uXG5cdHN1YkRvY0NvbGxlY3Rpb24uZHJvcCgpO1xuXG5cdC8vIENoZWNrIGlmIHRoZSBjYWxsIHNob3VsZCBub3QgcmV0dXJuIHN0YXRzLCBpZiBzbyByZXR1cm4gb25seSBzdWJEb2NzIGFycmF5XG5cdGlmIChzdWJEb2NPcHRpb25zLm5vU3RhdHMpIHtcblx0XHRyZXR1cm4gcmVzdWx0T2JqLnN1YkRvY3M7XG5cdH1cblxuXHRpZiAoIXJlc3VsdE9iai5wYXRoRm91bmQpIHtcblx0XHRyZXN1bHRPYmouZXJyID0gJ05vIG9iamVjdHMgZm91bmQgaW4gdGhlIHBhcmVudCBkb2N1bWVudHMgd2l0aCBhIG1hdGNoaW5nIHBhdGggb2Y6ICcgKyBwYXRoO1xuXHR9XG5cblx0cmV0dXJuIHJlc3VsdE9iajtcbn07XG5cbi8qKlxuICogQ2hlY2tzIHRoYXQgdGhlIHBhc3NlZCBkb2N1bWVudCB3aWxsIG5vdCB2aW9sYXRlIGFueSBpbmRleCBydWxlcyBpZlxuICogaW5zZXJ0ZWQgaW50byB0aGUgY29sbGVjdGlvbi5cbiAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGNoZWNrIGluZGV4ZXMgYWdhaW5zdC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBFaXRoZXIgZmFsc2UgKG5vIHZpb2xhdGlvbiBvY2N1cnJlZCkgb3IgdHJ1ZSBpZlxuICogYSB2aW9sYXRpb24gd2FzIGRldGVjdGVkLlxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbnNlcnRJbmRleFZpb2xhdGlvbiA9IGZ1bmN0aW9uIChkb2MpIHtcblx0dmFyIGluZGV4VmlvbGF0ZWQsXG5cdFx0YXJyID0gdGhpcy5faW5kZXhCeU5hbWUsXG5cdFx0YXJySW5kZXgsXG5cdFx0YXJySXRlbTtcblxuXHQvLyBDaGVjayB0aGUgaXRlbSdzIHByaW1hcnkga2V5IGlzIG5vdCBhbHJlYWR5IGluIHVzZVxuXHRpZiAodGhpcy5fcHJpbWFyeUluZGV4LmdldChkb2NbdGhpcy5fcHJpbWFyeUtleV0pKSB7XG5cdFx0aW5kZXhWaW9sYXRlZCA9IHRoaXMuX3ByaW1hcnlJbmRleDtcblx0fSBlbHNlIHtcblx0XHQvLyBDaGVjayB2aW9sYXRpb25zIG9mIG90aGVyIGluZGV4ZXNcblx0XHRmb3IgKGFyckluZGV4IGluIGFycikge1xuXHRcdFx0aWYgKGFyci5oYXNPd25Qcm9wZXJ0eShhcnJJbmRleCkpIHtcblx0XHRcdFx0YXJySXRlbSA9IGFyclthcnJJbmRleF07XG5cblx0XHRcdFx0aWYgKGFyckl0ZW0udW5pcXVlKCkpIHtcblx0XHRcdFx0XHRpZiAoYXJySXRlbS52aW9sYXRpb24oZG9jKSkge1xuXHRcdFx0XHRcdFx0aW5kZXhWaW9sYXRlZCA9IGFyckl0ZW07XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gaW5kZXhWaW9sYXRlZCA/IGluZGV4VmlvbGF0ZWQubmFtZSgpIDogZmFsc2U7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gaW5kZXggb24gdGhlIHNwZWNpZmllZCBrZXlzLlxuICogQHBhcmFtIHtPYmplY3R9IGtleXMgVGhlIG9iamVjdCBjb250YWluaW5nIGtleXMgdG8gaW5kZXguXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBBbiBvcHRpb25zIG9iamVjdC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5lbnN1cmVJbmRleCA9IGZ1bmN0aW9uIChrZXlzLCBvcHRpb25zKSB7XG5cdHRoaXMuX2luZGV4QnlOYW1lID0gdGhpcy5faW5kZXhCeU5hbWUgfHwge307XG5cdHRoaXMuX2luZGV4QnlJZCA9IHRoaXMuX2luZGV4QnlJZCB8fCB7fTtcblxuXHR2YXIgaW5kZXggPSBuZXcgSW5kZXgoa2V5cywgb3B0aW9ucywgdGhpcyksXG5cdFx0dGltZSA9IHtcblx0XHRcdHN0YXJ0OiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXHRcdH07XG5cblx0Ly8gQ2hlY2sgdGhlIGluZGV4IGRvZXMgbm90IGFscmVhZHkgZXhpc3Rcblx0aWYgKHRoaXMuX2luZGV4QnlOYW1lW2luZGV4Lm5hbWUoKV0pIHtcblx0XHQvLyBJbmRleCBhbHJlYWR5IGV4aXN0c1xuXHRcdHJldHVybiB7XG5cdFx0XHRlcnI6ICdJbmRleCB3aXRoIHRoYXQgbmFtZSBhbHJlYWR5IGV4aXN0cydcblx0XHR9O1xuXHR9XG5cblx0aWYgKHRoaXMuX2luZGV4QnlJZFtpbmRleC5pZCgpXSkge1xuXHRcdC8vIEluZGV4IGFscmVhZHkgZXhpc3RzXG5cdFx0cmV0dXJuIHtcblx0XHRcdGVycjogJ0luZGV4IHdpdGggdGhvc2Uga2V5cyBhbHJlYWR5IGV4aXN0cydcblx0XHR9O1xuXHR9XG5cblx0Ly8gQ3JlYXRlIHRoZSBpbmRleFxuXHRpbmRleC5yZWJ1aWxkKCk7XG5cblx0Ly8gQWRkIHRoZSBpbmRleFxuXHR0aGlzLl9pbmRleEJ5TmFtZVtpbmRleC5uYW1lKCldID0gaW5kZXg7XG5cdHRoaXMuX2luZGV4QnlJZFtpbmRleC5pZCgpXSA9IGluZGV4O1xuXG5cdHRpbWUuZW5kID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdHRpbWUudG90YWwgPSB0aW1lLmVuZCAtIHRpbWUuc3RhcnQ7XG5cblx0dGhpcy5fbGFzdE9wID0ge1xuXHRcdHR5cGU6ICdlbnN1cmVJbmRleCcsXG5cdFx0c3RhdHM6IHtcblx0XHRcdHRpbWU6IHRpbWVcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRpbmRleDogaW5kZXgsXG5cdFx0aWQ6IGluZGV4LmlkKCksXG5cdFx0bmFtZTogaW5kZXgubmFtZSgpLFxuXHRcdHN0YXRlOiBpbmRleC5zdGF0ZSgpXG5cdH07XG59O1xuXG4vKipcbiAqIEdldHMgYW4gaW5kZXggYnkgaXQncyBuYW1lLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGluZGV4IHRvIHJldHJlaXZlLlxuICogQHJldHVybnMgeyp9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluZGV4ID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0aWYgKHRoaXMuX2luZGV4QnlOYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2luZGV4QnlOYW1lW25hbWVdO1xuXHR9XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIGxhc3QgcmVwb3J0aW5nIG9wZXJhdGlvbidzIGRldGFpbHMgc3VjaCBhcyBydW4gdGltZS5cbiAqIEByZXR1cm5zIHtPYmplY3R9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmxhc3RPcCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX21ldHJpY3MubGlzdCgpO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBuZXcgMTYtY2hhcmFjdGVyIGhleGFkZWNpbWFsIHVuaXF1ZSBJRCBvclxuICogZ2VuZXJhdGVzIGEgbmV3IDE2LWNoYXJhY3RlciBoZXhhZGVjaW1hbCBJRCBiYXNlZCBvblxuICogdGhlIHBhc3NlZCBzdHJpbmcuIFdpbGwgYWx3YXlzIGdlbmVyYXRlIHRoZSBzYW1lIElEXG4gKiBmb3IgdGhlIHNhbWUgc3RyaW5nLlxuICogQHBhcmFtIHtTdHJpbmc9fSBzdHIgQSBzdHJpbmcgdG8gZ2VuZXJhdGUgdGhlIElEIGZyb20uXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLm9iamVjdElkID0gZnVuY3Rpb24gKHN0cikge1xuXHR2YXIgaWQsXG5cdFx0cG93ID0gTWF0aC5wb3coMTAsIDE3KTtcblxuXHRpZiAoIXN0cikge1xuXHRcdFNoYXJlZC5pZENvdW50ZXIrKztcblxuXHRcdGlkID0gKFNoYXJlZC5pZENvdW50ZXIgKyAoXG5cdFx0XHRNYXRoLnJhbmRvbSgpICogcG93ICtcblx0XHRcdFx0TWF0aC5yYW5kb20oKSAqIHBvdyArXG5cdFx0XHRcdE1hdGgucmFuZG9tKCkgKiBwb3cgK1xuXHRcdFx0XHRNYXRoLnJhbmRvbSgpICogcG93XG5cdFx0XHQpXG5cdFx0XHQpLnRvU3RyaW5nKDE2KTtcblx0fSBlbHNlIHtcblx0XHR2YXIgdmFsID0gMCxcblx0XHRcdGNvdW50ID0gc3RyLmxlbmd0aCxcblx0XHRcdGk7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuXHRcdFx0dmFsICs9IHN0ci5jaGFyQ29kZUF0KGkpICogcG93O1xuXHRcdH1cblxuXHRcdGlkID0gdmFsLnRvU3RyaW5nKDE2KTtcblx0fVxuXG5cdHJldHVybiBpZDtcbn07XG5cbi8qKlxuICogR2VuZXJhdGVzIGEgZGlmZmVyZW5jZSBvYmplY3QgdGhhdCBjb250YWlucyBpbnNlcnQsIHVwZGF0ZSBhbmQgcmVtb3ZlIGFycmF5c1xuICogcmVwcmVzZW50aW5nIHRoZSBvcGVyYXRpb25zIHRvIGV4ZWN1dGUgdG8gbWFrZSB0aGlzIGNvbGxlY3Rpb24gaGF2ZSB0aGUgc2FtZVxuICogZGF0YSBhcyB0aGUgb25lIHBhc3NlZC5cbiAqIEBwYXJhbSB7Q29sbGVjdGlvbn0gY29sbGVjdGlvbiBUaGUgY29sbGVjdGlvbiB0byBkaWZmIGFnYWluc3QuXG4gKiBAcmV0dXJucyB7e319XG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmRpZmYgPSBmdW5jdGlvbiAoY29sbGVjdGlvbikge1xuXHR2YXIgZGlmZiA9IHtcblx0XHRpbnNlcnQ6IFtdLFxuXHRcdHVwZGF0ZTogW10sXG5cdFx0cmVtb3ZlOiBbXVxuXHR9O1xuXG5cdHZhciBwbSA9IHRoaXMucHJpbWFyeUtleSgpLFxuXHRcdGFycixcblx0XHRhcnJJbmRleCxcblx0XHRhcnJJdGVtLFxuXHRcdGFyckNvdW50O1xuXG5cdC8vIENoZWNrIGlmIHRoZSBwcmltYXJ5IGtleSBpbmRleCBvZiBlYWNoIGNvbGxlY3Rpb24gY2FuIGJlIHV0aWxpc2VkXG5cdGlmIChwbSA9PT0gY29sbGVjdGlvbi5wcmltYXJ5S2V5KCkpIHtcblx0XHQvLyBVc2UgdGhlIGNvbGxlY3Rpb24gcHJpbWFyeSBrZXkgaW5kZXggdG8gZG8gdGhlIGRpZmYgKHN1cGVyLWZhc3QpXG5cdFx0YXJyID0gY29sbGVjdGlvbi5fZGF0YTtcblx0XHRhcnJDb3VudCA9IGFyci5sZW5ndGg7XG5cblx0XHQvLyBMb29wIHRoZSBjb2xsZWN0aW9uJ3MgZGF0YSBhcnJheSBhbmQgY2hlY2sgZm9yIG1hdGNoaW5nIGl0ZW1zXG5cdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdGFyckl0ZW0gPSBhcnJbYXJySW5kZXhdO1xuXG5cdFx0XHQvLyBDaGVjayBmb3IgYSBtYXRjaGluZyBpdGVtIGluIHRoaXMgY29sbGVjdGlvblxuXHRcdFx0aWYgKHRoaXMuX3ByaW1hcnlJbmRleC5nZXQoYXJySXRlbVtwbV0pKSB7XG5cdFx0XHRcdC8vIE1hdGNoaW5nIGl0ZW0gZXhpc3RzLCBjaGVjayBpZiB0aGUgZGF0YSBpcyB0aGUgc2FtZVxuXHRcdFx0XHRpZiAodGhpcy5fcHJpbWFyeUNyYy5nZXQoYXJySXRlbVtwbV0pID09PSBjb2xsZWN0aW9uLl9wcmltYXJ5Q3JjLmdldChhcnJJdGVtW3BtXSkpIHtcblx0XHRcdFx0XHQvLyBNYXRjaGluZyBvYmplY3RzLCBubyB1cGRhdGUgcmVxdWlyZWRcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBUaGUgZG9jdW1lbnRzIGV4aXN0IGluIGJvdGggY29sbGVjdGlvbnMgYnV0IGRhdGEgZGlmZmVycywgdXBkYXRlIHJlcXVpcmVkXG5cdFx0XHRcdFx0ZGlmZi51cGRhdGUucHVzaChhcnJJdGVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gVGhlIGRvY3VtZW50IGlzIG1pc3NpbmcgZnJvbSB0aGlzIGNvbGxlY3Rpb24sIGluc2VydCByZXF1cmllZFxuXHRcdFx0XHRkaWZmLmluc2VydC5wdXNoKGFyckl0ZW0pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIE5vdyBsb29wIHRoaXMgY29sbGVjdGlvbidzIGRhdGEgYW5kIGNoZWNrIGZvciBtYXRjaGluZyBpdGVtc1xuXHRcdGFyciA9IHRoaXMuX2RhdGE7XG5cdFx0YXJyQ291bnQgPSBhcnIubGVuZ3RoO1xuXG5cdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdGFyckl0ZW0gPSBhcnJbYXJySW5kZXhdO1xuXHRcdFx0aWYgKCFjb2xsZWN0aW9uLl9wcmltYXJ5SW5kZXguZ2V0KGFyckl0ZW1bcG1dKSkge1xuXHRcdFx0XHQvLyBUaGUgZG9jdW1lbnQgZG9lcyBub3QgZXhpc3QgaW4gdGhlIG90aGVyIGNvbGxlY3Rpb24sIHJlbW92ZSByZXF1aXJlZFxuXHRcdFx0XHRkaWZmLnJlbW92ZS5wdXNoKGFyckl0ZW0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQvLyBUaGUgcHJpbWFyeSBrZXlzIG9mIGVhY2ggY29sbGVjdGlvbiBhcmUgZGlmZmVyZW50IHNvIHRoZSBwcmltYXJ5XG5cdFx0Ly8ga2V5IGluZGV4IGNhbm5vdCBiZSB1c2VkIGZvciBkaWZmaW5nLCBkbyBhbiBvbGQtZmFzaGlvbmVkIGRpZmZcblxuXHR9XG5cblx0cmV0dXJuIGRpZmY7XG59O1xuXG4vKipcbiAqIEdldCBhIGNvbGxlY3Rpb24gYnkgbmFtZS4gSWYgdGhlIGNvbGxlY3Rpb24gZG9lcyBub3QgYWxyZWFkeSBleGlzdFxuICogdGhlbiBvbmUgaXMgY3JlYXRlZCBmb3IgdGhhdCBuYW1lIGF1dG9tYXRpY2FsbHkuXG4gKiBAcGFyYW0ge1N0cmluZ30gY29sbGVjdGlvbk5hbWUgVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZz19IHByaW1hcnlLZXkgT3B0aW9uYWwgcHJpbWFyeSBrZXkgdG8gc3BlY2lmeSB0aGUgcHJpbWFyeSBrZXkgZmllbGQgb24gdGhlIGNvbGxlY3Rpb25cbiAqIG9iamVjdHMuIERlZmF1bHRzIHRvIFwiX2lkXCIuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqL1xuQ29yZS5wcm90b3R5cGUuY29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgcHJpbWFyeUtleSkge1xuXHRpZiAoY29sbGVjdGlvbk5hbWUpIHtcblx0XHRpZiAoIXRoaXMuX2NvbGxlY3Rpb25bY29sbGVjdGlvbk5hbWVdKSB7XG5cdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdDcmVhdGluZyBjb2xsZWN0aW9uICcgKyBjb2xsZWN0aW9uTmFtZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5fY29sbGVjdGlvbltjb2xsZWN0aW9uTmFtZV0gPSB0aGlzLl9jb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXSB8fCBuZXcgQ29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSkuZGIodGhpcyk7XG5cblx0XHRpZiAocHJpbWFyeUtleSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHR0aGlzLl9jb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXS5wcmltYXJ5S2V5KHByaW1hcnlLZXkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLl9jb2xsZWN0aW9uW2NvbGxlY3Rpb25OYW1lXTtcblx0fSBlbHNlIHtcblx0XHR0aHJvdygnQ2Fubm90IGdldCBjb2xsZWN0aW9uIHdpdGggdW5kZWZpbmVkIG5hbWUhJyk7XG5cdH1cbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgY29sbGVjdGlvbiB3aXRoIHRoZSBwYXNzZWQgbmFtZSBhbHJlYWR5IGV4aXN0cy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2aWV3TmFtZSBUaGUgbmFtZSBvZiB0aGUgY29sbGVjdGlvbiB0byBjaGVjayBmb3IuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuQ29yZS5wcm90b3R5cGUuY29sbGVjdGlvbkV4aXN0cyA9IGZ1bmN0aW9uICh2aWV3TmFtZSkge1xuXHRyZXR1cm4gQm9vbGVhbih0aGlzLl9jb2xsZWN0aW9uW3ZpZXdOYW1lXSk7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgY29sbGVjdGlvbnMgdGhlIERCIGN1cnJlbnRseSBoYXMuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFuIGFycmF5IG9mIG9iamVjdHMgY29udGFpbmluZyBkZXRhaWxzIG9mIGVhY2ggY29sbGVjdGlvblxuICogdGhlIGRhdGFiYXNlIGlzIGN1cnJlbnRseSBtYW5hZ2luZy5cbiAqL1xuQ29yZS5wcm90b3R5cGUuY29sbGVjdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBhcnIgPSBbXSxcblx0XHRpO1xuXG5cdGZvciAoaSBpbiB0aGlzLl9jb2xsZWN0aW9uKSB7XG5cdFx0aWYgKHRoaXMuX2NvbGxlY3Rpb24uaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGFyci5wdXNoKHtcblx0XHRcdFx0bmFtZTogaSxcblx0XHRcdFx0Y291bnQ6IHRoaXMuX2NvbGxlY3Rpb25baV0uY291bnQoKVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGFycjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvbjsiLCIvLyBJbXBvcnQgZXh0ZXJuYWwgbmFtZXMgbG9jYWxseVxudmFyIFNoYXJlZCxcblx0Q29yZSxcblx0Q29yZUluaXQsXG5cdENvbGxlY3Rpb24sXG5cdE92ZXJsb2FkO1xuXG5TaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpO1xuXG52YXIgQ29sbGVjdGlvbkdyb3VwID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHR0aGlzLl9uYW1lID0gbmFtZTtcblx0dGhpcy5fY29sbGVjdGlvbkFyciA9IFtdO1xuXHR0aGlzLl92aWV3cyA9IFtdO1xuXG5cdC8vIFJlZ2lzdGVyIGxpc3RlbmVycyBmb3IgdGhlIENSVUQgZXZlbnRzXG5cdHRoaXMuX29uQ29sbGVjdGlvbkluc2VydCA9IGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9vbkluc2VydC5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHRoaXMuX29uQ29sbGVjdGlvblVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9vblVwZGF0ZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHRoaXMuX29uQ29sbGVjdGlvblJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9vblJlbW92ZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHRoaXMuX29uQ29sbGVjdGlvbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9vbkNoYW5nZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xufTtcblxuU2hhcmVkLm1vZHVsZXMuQ29sbGVjdGlvbkdyb3VwID0gQ29sbGVjdGlvbkdyb3VwO1xuXG5Db2xsZWN0aW9uID0gcmVxdWlyZSgnLi9Db2xsZWN0aW9uJyk7XG5PdmVybG9hZCA9IHJlcXVpcmUoJy4vT3ZlcmxvYWQnKTtcbkNvcmUgPSBTaGFyZWQubW9kdWxlcy5Db3JlO1xuQ29yZUluaXQgPSBTaGFyZWQubW9kdWxlcy5Db3JlLnByb3RvdHlwZS5pbml0O1xuXG4vKkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcbiB0aGlzLl9saXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwge307XG4gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF0gfHwgW107XG4gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcblxuIHJldHVybiB0aGlzO1xuIH07XG5cbiBDb2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuIGlmIChldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcbiB2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSxcbiBpbmRleCA9IGFyci5pbmRleE9mKGxpc3RlbmVyKTtcblxuIGlmIChpbmRleCA+IC0xKSB7XG4gYXJyLnNwbGljZShpbmRleCwgMSk7XG4gfVxuIH1cblxuIHJldHVybiB0aGlzO1xuIH07XG5cbiBDb2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCwgZGF0YSkge1xuIHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblxuIGlmIChldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcbiB2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSxcbiBhcnJDb3VudCA9IGFyci5sZW5ndGgsXG4gYXJySW5kZXg7XG5cbiBmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBhcnJDb3VudDsgYXJySW5kZXgrKykge1xuIGFyclthcnJJbmRleF0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gfVxuIH1cblxuIHJldHVybiB0aGlzO1xuIH07Ki9cblxuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5vbiA9IG5ldyBPdmVybG9hZChbXG5cdGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10gfHwgW107XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddLnB1c2gobGlzdGVuZXIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZnVuY3Rpb24oZXZlbnQsIGlkLCBsaXN0ZW5lcikge1xuXHRcdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCB7fTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2lkXSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdIHx8IFtdO1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1baWRdLnB1c2gobGlzdGVuZXIpO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbl0pO1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLm9mZiA9IG5ldyBPdmVybG9hZChbXG5cdGZ1bmN0aW9uIChldmVudCkge1xuXHRcdGlmICh0aGlzLl9saXN0ZW5lcnMgJiYgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSAmJiBldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHRcdGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGZ1bmN0aW9uKGV2ZW50LCBsaXN0ZW5lcikge1xuXHRcdHZhciBhcnIsXG5cdFx0XHRpbmRleDtcblxuXHRcdGlmICh0eXBlb2YobGlzdGVuZXIpID09PSAnc3RyaW5nJykge1xuXHRcdFx0aWYgKHRoaXMuX2xpc3RlbmVycyAmJiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdICYmIHRoaXMuX2xpc3RlbmVyc1tldmVudF1bbGlzdGVuZXJdKSB7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2xpc3RlbmVyXTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdFx0XHRhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ107XG5cdFx0XHRcdGluZGV4ID0gYXJyLmluZGV4T2YobGlzdGVuZXIpO1xuXG5cdFx0XHRcdGlmIChpbmRleCA+IC0xKSB7XG5cdFx0XHRcdFx0YXJyLnNwbGljZShpbmRleCwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRmdW5jdGlvbiAoZXZlbnQsIGlkLCBsaXN0ZW5lcikge1xuXHRcdGlmICh0aGlzLl9saXN0ZW5lcnMgJiYgZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0XHR2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtpZF0sXG5cdFx0XHRcdGluZGV4ID0gYXJyLmluZGV4T2YobGlzdGVuZXIpO1xuXG5cdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRhcnIuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbl0pO1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCwgZGF0YSkge1xuXHR0aGlzLl9saXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwge307XG5cblx0aWYgKGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdC8vIEhhbmRsZSBnbG9iYWwgZW1pdFxuXHRcdGlmICh0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10pIHtcblx0XHRcdHZhciBhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10sXG5cdFx0XHRcdGFyckNvdW50ID0gYXJyLmxlbmd0aCxcblx0XHRcdFx0YXJySW5kZXg7XG5cblx0XHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGFyckNvdW50OyBhcnJJbmRleCsrKSB7XG5cdFx0XHRcdGFyclthcnJJbmRleF0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSGFuZGxlIGluZGl2aWR1YWwgZW1pdFxuXHRcdGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdC8vIENoZWNrIGlmIHRoZSBhcnJheSBpcyBhbiBhcnJheSBvZiBvYmplY3RzIGluIHRoZSBjb2xsZWN0aW9uXG5cdFx0XHRpZiAoZGF0YVswXSAmJiBkYXRhWzBdW3RoaXMuX3ByaW1hcnlLZXldKSB7XG5cdFx0XHRcdC8vIExvb3AgdGhlIGFycmF5IGFuZCBjaGVjayBmb3IgbGlzdGVuZXJzIGFnYWluc3QgdGhlIHByaW1hcnkga2V5XG5cdFx0XHRcdHZhciBsaXN0ZW5lcklkQXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSxcblx0XHRcdFx0XHRsaXN0ZW5lcklkQ291bnQsXG5cdFx0XHRcdFx0bGlzdGVuZXJJZEluZGV4LFxuXHRcdFx0XHRcdGFyckNvdW50ID0gZGF0YS5sZW5ndGgsXG5cdFx0XHRcdFx0YXJySW5kZXg7XG5cblx0XHRcdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdFx0XHRpZiAobGlzdGVuZXJJZEFycltkYXRhW2FyckluZGV4XVt0aGlzLl9wcmltYXJ5S2V5XV0pIHtcblx0XHRcdFx0XHRcdC8vIEVtaXQgZm9yIHRoaXMgaWRcblx0XHRcdFx0XHRcdGxpc3RlbmVySWRDb3VudCA9IGxpc3RlbmVySWRBcnJbZGF0YVthcnJJbmRleF1bdGhpcy5fcHJpbWFyeUtleV1dLmxlbmd0aDtcblx0XHRcdFx0XHRcdGZvciAobGlzdGVuZXJJZEluZGV4ID0gMDsgbGlzdGVuZXJJZEluZGV4IDwgbGlzdGVuZXJJZENvdW50OyBsaXN0ZW5lcklkSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRsaXN0ZW5lcklkQXJyW2RhdGFbYXJySW5kZXhdW3RoaXMuX3ByaW1hcnlLZXldXVtsaXN0ZW5lcklkSW5kZXhdLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgZGIgaW5zdGFuY2UgdGhlIGNvbGxlY3Rpb24gZ3JvdXAgYmVsb25ncyB0by5cbiAqIEBwYXJhbSB7REJ9IGRiIFRoZSBkYiBpbnN0YW5jZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLmRiID0gZnVuY3Rpb24gKGRiKSB7XG5cdGlmIChkYiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fZGIgPSBkYjtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9kYjtcbn07XG5cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuYWRkQ29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XG5cdGlmIChjb2xsZWN0aW9uKSB7XG5cdFx0aWYgKHRoaXMuX2NvbGxlY3Rpb25BcnIuaW5kZXhPZihjb2xsZWN0aW9uKSA9PT0gLTEpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Ly8gQ2hlY2sgZm9yIGNvbXBhdGlibGUgcHJpbWFyeSBrZXlzXG5cdFx0XHRpZiAodGhpcy5fY29sbGVjdGlvbkFyci5sZW5ndGgpIHtcblx0XHRcdFx0aWYgKHRoaXMuX3ByaW1hcnlLZXkgIT09IGNvbGxlY3Rpb24ucHJpbWFyeUtleSgpKSB7XG5cdFx0XHRcdFx0dGhyb3coXCJBbGwgY29sbGVjdGlvbnMgaW4gYSBjb2xsZWN0aW9uIGdyb3VwIG11c3QgaGF2ZSB0aGUgc2FtZSBwcmltYXJ5IGtleSFcIik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFNldCB0aGUgcHJpbWFyeSBrZXkgdG8gdGhlIGZpcnN0IGNvbGxlY3Rpb24gYWRkZWRcblx0XHRcdFx0dGhpcy5fcHJpbWFyeUtleSA9IGNvbGxlY3Rpb24ucHJpbWFyeUtleSgpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgdGhlIGNvbGxlY3Rpb25cblx0XHRcdHRoaXMuX2NvbGxlY3Rpb25BcnIucHVzaChjb2xsZWN0aW9uKTtcblx0XHRcdGNvbGxlY3Rpb24uX2dyb3Vwcy5wdXNoKHRoaXMpO1xuXG5cdFx0XHQvLyBMaXN0ZW4gdG8gZXZlbnRzIGZyb20gdGhlIGNvbGxlY3Rpb25cblx0XHRcdGNvbGxlY3Rpb24ub24oJ2luc2VydCcsIHRoaXMuX29uQ29sbGVjdGlvbkluc2VydCk7XG5cdFx0XHRjb2xsZWN0aW9uLm9uKCd1cGRhdGUnLCB0aGlzLl9vbkNvbGxlY3Rpb25VcGRhdGUpO1xuXHRcdFx0Y29sbGVjdGlvbi5vbigncmVtb3ZlJywgdGhpcy5fb25Db2xsZWN0aW9uUmVtb3ZlKTtcblx0XHRcdGNvbGxlY3Rpb24ub24oJ2NoYW5nZScsIHRoaXMuX29uQ29sbGVjdGlvbkNoYW5nZSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLnJlbW92ZUNvbGxlY3Rpb24gPSBmdW5jdGlvbiAoY29sbGVjdGlvbikge1xuXHRpZiAoY29sbGVjdGlvbikge1xuXHRcdHZhciBjb2xsZWN0aW9uSW5kZXggPSB0aGlzLl9jb2xsZWN0aW9uQXJyLmluZGV4T2YoY29sbGVjdGlvbiksXG5cdFx0XHRncm91cEluZGV4O1xuXG5cdFx0aWYgKGNvbGxlY3Rpb25JbmRleCAhPT0gLTEpIHtcblx0XHRcdC8vIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMgZnJvbSB0aGlzIGNvbGxlY3Rpb25cblx0XHRcdGNvbGxlY3Rpb24ub2ZmKCdpbnNlcnQnLCB0aGlzLl9vbkNvbGxlY3Rpb25JbnNlcnQpO1xuXHRcdFx0Y29sbGVjdGlvbi5vZmYoJ3VwZGF0ZScsIHRoaXMuX29uQ29sbGVjdGlvblVwZGF0ZSk7XG5cdFx0XHRjb2xsZWN0aW9uLm9mZigncmVtb3ZlJywgdGhpcy5fb25Db2xsZWN0aW9uUmVtb3ZlKTtcblx0XHRcdGNvbGxlY3Rpb24ub2ZmKCdjaGFuZ2UnLCB0aGlzLl9vbkNvbGxlY3Rpb25DaGFuZ2UpO1xuXG5cdFx0XHR0aGlzLl9jb2xsZWN0aW9uQXJyLnNwbGljZShjb2xsZWN0aW9uSW5kZXgsIDEpO1xuXG5cdFx0XHRncm91cEluZGV4ID0gY29sbGVjdGlvbi5fZ3JvdXBzLmluZGV4T2YodGhpcyk7XG5cblx0XHRcdGlmIChncm91cEluZGV4ICE9PSAtMSkge1xuXHRcdFx0XHRjb2xsZWN0aW9uLl9ncm91cHMuc3BsaWNlKGdyb3VwSW5kZXgsIDEpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9jb2xsZWN0aW9uQXJyLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0Ly8gV2lwZSB0aGUgcHJpbWFyeSBrZXlcblx0XHRcdGRlbGV0ZSB0aGlzLl9wcmltYXJ5S2V5O1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5maW5kID0gZnVuY3Rpb24gKHF1ZXJ5LCBvcHRpb25zKSB7XG5cdC8vIExvb3AgdGhlIGNvbGxlY3Rpb25zIGluIHRoaXMgZ3JvdXAgYW5kIGZpbmQgZmlyc3QgbWF0Y2hpbmcgaXRlbSByZXNwb25zZVxuXHR2YXIgZGF0YSA9IG5ldyBDb2xsZWN0aW9uKCkucHJpbWFyeUtleSh0aGlzLl9jb2xsZWN0aW9uQXJyWzBdLnByaW1hcnlLZXkoKSksXG5cdFx0aTtcblxuXHRmb3IgKGkgPSAwOyBpIDwgdGhpcy5fY29sbGVjdGlvbkFyci5sZW5ndGg7IGkrKykge1xuXHRcdGRhdGEuaW5zZXJ0KHRoaXMuX2NvbGxlY3Rpb25BcnJbaV0uZmluZChxdWVyeSkpO1xuXHR9XG5cblx0cmV0dXJuIGRhdGEuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucykge1xuXHQvLyBMb29wIHRoZSBjb2xsZWN0aW9ucyBpbiB0aGlzIGdyb3VwIGFuZCBhcHBseSB0aGUgaW5zZXJ0XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY29sbGVjdGlvbkFyci5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb25BcnJbaV0uaW5zZXJ0KHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxufTtcblxuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocXVlcnksIHVwZGF0ZSkge1xuXHQvLyBMb29wIHRoZSBjb2xsZWN0aW9ucyBpbiB0aGlzIGdyb3VwIGFuZCBhcHBseSB0aGUgdXBkYXRlXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY29sbGVjdGlvbkFyci5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb25BcnJbaV0udXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xuXHR9XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLnVwZGF0ZUJ5SWQgPSBmdW5jdGlvbiAoaWQsIHVwZGF0ZSkge1xuXHQvLyBMb29wIHRoZSBjb2xsZWN0aW9ucyBpbiB0aGlzIGdyb3VwIGFuZCBhcHBseSB0aGUgdXBkYXRlXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fY29sbGVjdGlvbkFyci5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb25BcnJbaV0udXBkYXRlQnlJZChpZCwgdXBkYXRlKTtcblx0fVxufTtcblxuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAocXVlcnkpIHtcblx0Ly8gTG9vcCB0aGUgY29sbGVjdGlvbnMgaW4gdGhpcyBncm91cCBhbmQgYXBwbHkgdGhlIHJlbW92ZVxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NvbGxlY3Rpb25BcnIubGVuZ3RoOyBpKyspIHtcblx0XHR0aGlzLl9jb2xsZWN0aW9uQXJyW2ldLnJlbW92ZShxdWVyeSk7XG5cdH1cbn07XG5cbi8qKlxuICogSGVscGVyIG1ldGhvZCB0aGF0IHJlbW92ZXMgYSBkb2N1bWVudCB0aGF0IG1hdGNoZXMgdGhlIGdpdmVuIGlkLlxuICogQHBhcmFtIHtTdHJpbmd9IGlkIFRoZSBpZCBvZiB0aGUgZG9jdW1lbnQgdG8gcmVtb3ZlLlxuICovXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLnJlbW92ZUJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcblx0Ly8gTG9vcCB0aGUgY29sbGVjdGlvbnMgaW4gdGhpcyBncm91cCBhbmQgYXBwbHkgdGhlIHJlbW92ZVxuXHRmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX2NvbGxlY3Rpb25BcnIubGVuZ3RoOyBpKyspIHtcblx0XHR0aGlzLl9jb2xsZWN0aW9uQXJyW2ldLnJlbW92ZUJ5SWQoaWQpO1xuXHR9XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLl9vbkluc2VydCA9IGZ1bmN0aW9uIChzdWNjZXNzQXJyLCBmYWlsQXJyKSB7XG5cdHRoaXMuZW1pdCgnaW5zZXJ0Jywgc3VjY2Vzc0FyciwgZmFpbEFycik7XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLl9vblVwZGF0ZSA9IGZ1bmN0aW9uIChzdWNjZXNzQXJyLCBmYWlsQXJyKSB7XG5cdHRoaXMuZW1pdCgndXBkYXRlJywgc3VjY2Vzc0FyciwgZmFpbEFycik7XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLl9vblJlbW92ZSA9IGZ1bmN0aW9uIChzdWNjZXNzQXJyLCBmYWlsQXJyKSB7XG5cdHRoaXMuZW1pdCgncmVtb3ZlJywgc3VjY2Vzc0FyciwgZmFpbEFycik7XG59O1xuXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLl9vbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5lbWl0KCdjaGFuZ2UnKTtcbn07XG5cbi8qKlxuICogVXNlcyB0aGUgcGFzc2VkIHF1ZXJ5IHRvIGdlbmVyYXRlIGEgbmV3IGNvbGxlY3Rpb24gd2l0aCByZXN1bHRzXG4gKiBtYXRjaGluZyB0aGUgcXVlcnkgcGFyYW1ldGVycy5cbiAqXG4gKiBAcGFyYW0gcXVlcnlcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5zdWJzZXQgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMpIHtcblx0dmFyIHJlc3VsdCA9IHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cblx0cmV0dXJuIG5ldyBDb2xsZWN0aW9uKClcblx0XHQuX3N1YnNldE9mKHRoaXMpXG5cdFx0LnByaW1hcnlLZXkodGhpcy5fcHJpbWFyeUtleSlcblx0XHQuc2V0RGF0YShyZXN1bHQpO1xufTtcblxuLyoqXG4gKiBEcm9wcyBhIGNvbGxlY3Rpb24gZ3JvdXAgZnJvbSB0aGUgZGF0YWJhc2UuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBvbiBzdWNjZXNzLCBmYWxzZSBvbiBmYWlsdXJlLlxuICovXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBpLFxuXHRcdGNvbGxBcnIgPSBbXS5jb25jYXQodGhpcy5fY29sbGVjdGlvbkFyciksXG5cdFx0dmlld0FyciA9IFtdLmNvbmNhdCh0aGlzLl92aWV3cyk7XG5cblx0aWYgKHRoaXMuX2RlYnVnKSB7XG5cdFx0Y29uc29sZS5sb2coJ0Ryb3BwaW5nIGNvbGxlY3Rpb24gZ3JvdXAgJyArIHRoaXMuX25hbWUpO1xuXHR9XG5cblx0Zm9yIChpID0gMDsgaSA8IGNvbGxBcnIubGVuZ3RoOyBpKyspIHtcblx0XHR0aGlzLnJlbW92ZUNvbGxlY3Rpb24oY29sbEFycltpXSk7XG5cdH1cblxuXHRmb3IgKGkgPSAwOyBpIDwgdmlld0Fyci5sZW5ndGg7IGkrKykge1xuXHRcdHRoaXMuX3JlbW92ZVZpZXcodmlld0FycltpXSk7XG5cdH1cblxuXHR0aGlzLmVtaXQoJ2Ryb3AnKTtcblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEV4dGVuZCBEQiB0byBpbmNsdWRlIGNvbGxlY3Rpb24gZ3JvdXBzXG5Db3JlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9jb2xsZWN0aW9uR3JvdXAgPSB7fTtcblx0Q29yZUluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbkNvcmUucHJvdG90eXBlLmNvbGxlY3Rpb25Hcm91cCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uR3JvdXBOYW1lKSB7XG5cdGlmIChjb2xsZWN0aW9uR3JvdXBOYW1lKSB7XG5cdFx0dGhpcy5fY29sbGVjdGlvbkdyb3VwW2NvbGxlY3Rpb25Hcm91cE5hbWVdID0gdGhpcy5fY29sbGVjdGlvbkdyb3VwW2NvbGxlY3Rpb25Hcm91cE5hbWVdIHx8IG5ldyBDb2xsZWN0aW9uR3JvdXAoY29sbGVjdGlvbkdyb3VwTmFtZSkuZGIodGhpcyk7XG5cdFx0cmV0dXJuIHRoaXMuX2NvbGxlY3Rpb25Hcm91cFtjb2xsZWN0aW9uR3JvdXBOYW1lXTtcblx0fSBlbHNlIHtcblx0XHQvLyBSZXR1cm4gYW4gb2JqZWN0IG9mIGNvbGxlY3Rpb24gZGF0YVxuXHRcdHJldHVybiB0aGlzLl9jb2xsZWN0aW9uR3JvdXA7XG5cdH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29sbGVjdGlvbkdyb3VwOyIsIi8qXG4gVGhlIE1JVCBMaWNlbnNlIChNSVQpXG5cbiBDb3B5cmlnaHQgKGMpIDIwMTQgSXJyZWxvbiBTb2Z0d2FyZSBMaW1pdGVkXG4gaHR0cDovL3d3dy5pcnJlbG9uLmNvbVxuXG4gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSwgdXJsIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cbiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuIFRIRSBTT0ZUV0FSRS5cblxuIFNvdXJjZTogaHR0cHM6Ly9naXRodWIuY29tL2Nvb2xibG9rZTEzMjQvRm9yZXJ1bm5lckRCXG4gKi9cbnZhciBTaGFyZWQsXG5cdE92ZXJsb2FkLFxuXHRDb2xsZWN0aW9uLFxuXHRNZXRyaWNzLFxuXHRDcmM7XG5cblNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkLmpzJyk7XG5cbi8qKlxuICogVGhlIG1haW4gRm9yZXJ1bm5lckRCIGNvcmUgb2JqZWN0LlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBDb3JlID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbkNvcmUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2NvbGxlY3Rpb24gPSB7fTtcblx0dGhpcy5fZGVidWcgPSB7fTtcbn07XG5cblNoYXJlZC5tb2R1bGVzLkNvcmUgPSBDb3JlO1xuXG5PdmVybG9hZCA9IHJlcXVpcmUoJy4vT3ZlcmxvYWQuanMnKTtcbkNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24uanMnKTtcbk1ldHJpY3MgPSByZXF1aXJlKCcuL01ldHJpY3MuanMnKTtcbkNyYyA9IHJlcXVpcmUoJy4vQ3JjLmpzJyk7XG5cbkNvcmUucHJvdG90eXBlLl9pc1NlcnZlciA9IGZhbHNlO1xuXG5Db3JlLnByb3RvdHlwZS5pc0NsaWVudCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuICF0aGlzLl9pc1NlcnZlcjtcbn07XG5cbkNvcmUucHJvdG90eXBlLmlzU2VydmVyID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5faXNTZXJ2ZXI7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBjaGVja3N1bSBvZiBhIHN0cmluZy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIHN0cmluZyB0byBjaGVja3N1bS5cbiAqIEByZXR1cm4ge1N0cmluZ30gVGhlIGNoZWNrc3VtIGdlbmVyYXRlZC5cbiAqL1xuQ29yZS5wcm90b3R5cGUuY3JjID0gQ3JjO1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgZGF0YWJhc2UgaXMgcnVubmluZyBvbiBhIGNsaWVudCAoYnJvd3Nlcikgb3JcbiAqIGEgc2VydmVyIChub2RlLmpzKS5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBSZXR1cm5zIHRydWUgaWYgcnVubmluZyBvbiBhIGJyb3dzZXIuXG4gKi9cbkNvcmUucHJvdG90eXBlLmlzQ2xpZW50ID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gIXRoaXMuX2lzU2VydmVyO1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgdGhlIGRhdGFiYXNlIGlzIHJ1bm5pbmcgb24gYSBjbGllbnQgKGJyb3dzZXIpIG9yXG4gKiBhIHNlcnZlciAobm9kZS5qcykuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHJ1bm5pbmcgb24gYSBzZXJ2ZXIuXG4gKi9cbkNvcmUucHJvdG90eXBlLmlzU2VydmVyID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5faXNTZXJ2ZXI7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBub24tcmVmZXJlbmNlZCB2ZXJzaW9uIG9mIHRoZSBwYXNzZWQgb2JqZWN0IC8gYXJyYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgb2JqZWN0IG9yIGFycmF5IHRvIHJldHVybiBhcyBhIG5vbi1yZWZlcmVuY2VkIHZlcnNpb24uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29yZS5wcm90b3R5cGUuZGVjb3VwbGUgPSBmdW5jdGlvbiAoZGF0YSkge1xuXHRyZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShkYXRhKSk7XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBkZWJ1ZyBmbGFnIGZvciB0aGUgZGF0YWJhc2UuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHZhbCBJZiB0cnVlLCBkZWJ1ZyBtZXNzYWdlcyB3aWxsIGJlIG91dHB1dCB0byB0aGUgY29uc29sZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5Db3JlLnByb3RvdHlwZS5kZWJ1ZyA9IG5ldyBPdmVybG9hZChbXG5cdGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZGVidWcuYWxsO1xuXHR9LFxuXG5cdGZ1bmN0aW9uICh2YWwpIHtcblx0XHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmICh0eXBlb2YgdmFsID09PSAnYm9vbGVhbicpIHtcblx0XHRcdFx0dGhpcy5fZGVidWcuYWxsID0gdmFsO1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5fZGVidWcuYWxsO1xuXHR9LFxuXG5cdGZ1bmN0aW9uICh0eXBlLCB2YWwpIHtcblx0XHRpZiAodHlwZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5fZGVidWdbdHlwZV0gPSB2YWw7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5fZGVidWdbdHlwZV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2RlYnVnLmFsbDtcblx0fVxuXSk7XG5cbi8qKlxuICogQ29udmVydHMgYSBub3JtYWwgamF2YXNjcmlwdCBhcnJheSBvZiBvYmplY3RzIGludG8gYSBEQiBjb2xsZWN0aW9uLlxuICogQHBhcmFtIHtBcnJheX0gYXJyIEFuIGFycmF5IG9mIG9iamVjdHMuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn0gQSBuZXcgY29sbGVjdGlvbiBpbnN0YW5jZSB3aXRoIHRoZSBkYXRhIHNldCB0byB0aGVcbiAqIGFycmF5IHBhc3NlZC5cbiAqL1xuQ29yZS5wcm90b3R5cGUuYXJyYXlUb0NvbGxlY3Rpb24gPSBmdW5jdGlvbiAoYXJyKSB7XG5cdHJldHVybiBuZXcgQ29sbGVjdGlvbigpLnNldERhdGEoYXJyKTtcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyIGFnYWluc3QgYW4gZXZlbnQgbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gbGlzdGVuIGZvci5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIFRoZSBsaXN0ZW5lciBtZXRob2QgdG8gY2FsbCB3aGVuXG4gKiB0aGUgZXZlbnQgaXMgZmlyZWQuXG4gKiBAcmV0dXJucyB7aW5pdH1cbiAqL1xuQ29yZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblx0dGhpcy5fbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzIHx8IHt9O1xuXHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSB8fCBbXTtcblx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XS5wdXNoKGxpc3RlbmVyKTtcblxuXHRyZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGUtcmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyIGZyb20gYW4gZXZlbnQgbmFtZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gc3RvcCBsaXN0ZW5pbmcgZm9yLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgVGhlIGxpc3RlbmVyIG1ldGhvZCBwYXNzZWQgdG8gb24oKSB3aGVuXG4gKiByZWdpc3RlcmluZyB0aGUgZXZlbnQgbGlzdGVuZXIuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29yZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cdGlmIChldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHR2YXIgYXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSxcblx0XHRcdGluZGV4ID0gYXJyLmluZGV4T2YobGlzdGVuZXIpO1xuXG5cdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbWl0cyBhbiBldmVudCBieSBuYW1lIHdpdGggdGhlIGdpdmVuIGRhdGEuXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgVGhlIG5hbWUgb2YgdGhlIGV2ZW50IHRvIGVtaXQuXG4gKiBAcGFyYW0geyo9fSBkYXRhIFRoZSBkYXRhIHRvIGVtaXQgd2l0aCB0aGUgZXZlbnQuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29yZS5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50LCBkYXRhKSB7XG5cdHRoaXMuX2xpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVycyB8fCB7fTtcblxuXHRpZiAoZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0dmFyIGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF0sXG5cdFx0XHRhcnJDb3VudCA9IGFyci5sZW5ndGgsXG5cdFx0XHRhcnJJbmRleDtcblxuXHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGFyckNvdW50OyBhcnJJbmRleCsrKSB7XG5cdFx0XHRhcnJbYXJySW5kZXhdLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSBuZXcgMTYtY2hhcmFjdGVyIGhleGFkZWNpbWFsIHVuaXF1ZSBJRCBvclxuICogZ2VuZXJhdGVzIGEgbmV3IDE2LWNoYXJhY3RlciBoZXhhZGVjaW1hbCBJRCBiYXNlZCBvblxuICogdGhlIHBhc3NlZCBzdHJpbmcuIFdpbGwgYWx3YXlzIGdlbmVyYXRlIHRoZSBzYW1lIElEXG4gKiBmb3IgdGhlIHNhbWUgc3RyaW5nLlxuICogQHBhcmFtIHtTdHJpbmc9fSBzdHIgQSBzdHJpbmcgdG8gZ2VuZXJhdGUgdGhlIElEIGZyb20uXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cbkNvcmUucHJvdG90eXBlLm9iamVjdElkID0gZnVuY3Rpb24gKHN0cikge1xuXHR2YXIgaWQsXG5cdFx0dmFsLFxuXHRcdGNvdW50LFxuXHRcdHBvdyA9IE1hdGgucG93KDEwLCAxNyksXG5cdFx0aTtcblxuXHRpZiAoIXN0cikge1xuXHRcdFNoYXJlZC5pZENvdW50ZXIrKztcblxuXHRcdGlkID0gKFNoYXJlZC5pZENvdW50ZXIgKyAoXG5cdFx0XHRNYXRoLnJhbmRvbSgpICogcG93ICtcblx0XHRcdFx0TWF0aC5yYW5kb20oKSAqIHBvdyArXG5cdFx0XHRcdE1hdGgucmFuZG9tKCkgKiBwb3cgK1xuXHRcdFx0XHRNYXRoLnJhbmRvbSgpICogcG93XG5cdFx0XHQpXG5cdFx0KS50b1N0cmluZygxNik7XG5cdH0gZWxzZSB7XG5cdFx0dmFsID0gMDtcblx0XHRjb3VudCA9IHN0ci5sZW5ndGg7XG5cblx0XHRmb3IgKGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuXHRcdFx0dmFsICs9IHN0ci5jaGFyQ29kZUF0KGkpICogcG93O1xuXHRcdH1cblxuXHRcdGlkID0gdmFsLnRvU3RyaW5nKDE2KTtcblx0fVxuXG5cdHJldHVybiBpZDtcbn07XG5cbi8qKlxuICogRmluZCBhbGwgZG9jdW1lbnRzIGFjcm9zcyBhbGwgY29sbGVjdGlvbnMgaW4gdGhlIGRhdGFiYXNlIHRoYXQgbWF0Y2ggdGhlIHBhc3NlZFxuICogc3RyaW5nIG9yIHNlYXJjaCBvYmplY3QuXG4gKiBAcGFyYW0gc2VhcmNoIFN0cmluZyBvciBzZWFyY2ggb2JqZWN0LlxuICogQHJldHVybnMge0FycmF5fVxuICovXG5Db3JlLnByb3RvdHlwZS5wZWVrID0gZnVuY3Rpb24gKHNlYXJjaCkge1xuXHR2YXIgaSxcblx0XHRjb2xsLFxuXHRcdGFyciA9IFtdLFxuXHRcdHR5cGVPZlNlYXJjaCA9IHR5cGVvZiBzZWFyY2g7XG5cblx0Ly8gTG9vcCBjb2xsZWN0aW9uc1xuXHRmb3IgKGkgaW4gdGhpcy5fY29sbGVjdGlvbikge1xuXHRcdGlmICh0aGlzLl9jb2xsZWN0aW9uLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRjb2xsID0gdGhpcy5fY29sbGVjdGlvbltpXTtcblxuXHRcdFx0aWYgKHR5cGVPZlNlYXJjaCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0YXJyID0gYXJyLmNvbmNhdChjb2xsLnBlZWsoc2VhcmNoKSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhcnIgPSBhcnIuY29uY2F0KGNvbGwuZmluZChzZWFyY2gpKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gYXJyO1xufTtcblxuLyoqXG4gKiBGaW5kIGFsbCBkb2N1bWVudHMgYWNyb3NzIGFsbCBjb2xsZWN0aW9ucyBpbiB0aGUgZGF0YWJhc2UgdGhhdCBtYXRjaCB0aGUgcGFzc2VkXG4gKiBzdHJpbmcgb3Igc2VhcmNoIG9iamVjdCBhbmQgcmV0dXJuIHRoZW0gaW4gYW4gb2JqZWN0IHdoZXJlIGVhY2gga2V5IGlzIHRoZSBuYW1lXG4gKiBvZiB0aGUgY29sbGVjdGlvbiB0aGF0IHRoZSBkb2N1bWVudCB3YXMgbWF0Y2hlZCBpbi5cbiAqIEBwYXJhbSBzZWFyY2ggU3RyaW5nIG9yIHNlYXJjaCBvYmplY3QuXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbkNvcmUucHJvdG90eXBlLnBlZWtDYXQgPSBmdW5jdGlvbiAoc2VhcmNoKSB7XG5cdHZhciBpLFxuXHRcdGNvbGwsXG5cdFx0Y2F0ID0ge30sXG5cdFx0YXJyLFxuXHRcdHR5cGVPZlNlYXJjaCA9IHR5cGVvZiBzZWFyY2g7XG5cblx0Ly8gTG9vcCBjb2xsZWN0aW9uc1xuXHRmb3IgKGkgaW4gdGhpcy5fY29sbGVjdGlvbikge1xuXHRcdGlmICh0aGlzLl9jb2xsZWN0aW9uLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRjb2xsID0gdGhpcy5fY29sbGVjdGlvbltpXTtcblxuXHRcdFx0aWYgKHR5cGVPZlNlYXJjaCA9PT0gJ3N0cmluZycpIHtcblx0XHRcdFx0YXJyID0gY29sbC5wZWVrKHNlYXJjaCk7XG5cblx0XHRcdFx0aWYgKGFyciAmJiBhcnIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Y2F0W2NvbGwubmFtZSgpXSA9IGFycjtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXJyID0gY29sbC5maW5kKHNlYXJjaCk7XG5cblx0XHRcdFx0aWYgKGFyciAmJiBhcnIubGVuZ3RoKSB7XG5cdFx0XHRcdFx0Y2F0W2NvbGwubmFtZSgpXSA9IGFycjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBjYXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvcmU7IiwidmFyIGNyY1RhYmxlID0gKGZ1bmN0aW9uICgpIHtcblx0dmFyIGNyY1RhYmxlID0gW10sXG5cdFx0YywgbiwgaztcblxuXHRmb3IgKG4gPSAwOyBuIDwgMjU2OyBuKyspIHtcblx0XHRjID0gbjtcblxuXHRcdGZvciAoayA9IDA7IGsgPCA4OyBrKyspIHtcblx0XHRcdGMgPSAoKGMgJiAxKSA/ICgweEVEQjg4MzIwIF4gKGMgPj4+IDEpKSA6IChjID4+PiAxKSk7XG5cdFx0fVxuXG5cdFx0Y3JjVGFibGVbbl0gPSBjO1xuXHR9XG5cblx0cmV0dXJuIGNyY1RhYmxlO1xufSgpKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzdHIpIHtcblx0dmFyIGNyYyA9IDAgXiAoLTEpLFxuXHRcdGk7XG5cblx0Zm9yIChpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuXHRcdGNyYyA9IChjcmMgPj4+IDgpIF4gY3JjVGFibGVbKGNyYyBeIHN0ci5jaGFyQ29kZUF0KGkpKSAmIDB4RkZdO1xuXHR9XG5cblx0cmV0dXJuIChjcmMgXiAoLTEpKSA+Pj4gMDtcbn07IiwiLy8gSW1wb3J0IGV4dGVybmFsIG5hbWVzIGxvY2FsbHlcbnZhciBTaGFyZWQsXG5cdENvbGxlY3Rpb24sXG5cdENvbGxlY3Rpb25Jbml0O1xuXG5TaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpO1xuXG4vKipcbiAqIFRoZSBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEhpZ2hjaGFydCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uLCBvcHRpb25zKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuSGlnaGNoYXJ0LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24sIG9wdGlvbnMpIHtcblx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG5cdHRoaXMuX3NlbGVjdG9yID0gJCh0aGlzLl9vcHRpb25zLnNlbGVjdG9yKTtcblx0dGhpcy5fbGlzdGVuZXJzID0ge307XG5cdHRoaXMuX2NvbGxlY3Rpb24gPSBjb2xsZWN0aW9uO1xuXG5cdC8vIFNldHVwIHRoZSBjaGFydFxuXHR0aGlzLl9vcHRpb25zLnNlcmllcyA9IFtdO1xuXG5cdC8vIFNldCB0aGUgZGF0YSBmb3IgdGhlIGNoYXJ0XG5cdHZhciBkYXRhLFxuXHRcdHNlcmllc09iaixcblx0XHRjaGFydERhdGEsXG5cdFx0aTtcblxuXHRzd2l0Y2ggKHRoaXMuX29wdGlvbnMudHlwZSkge1xuXHRcdGNhc2UgJ3BpZSc6XG5cdFx0XHQvLyBDcmVhdGUgY2hhcnQgZnJvbSBkYXRhXG5cdFx0XHR0aGlzLl9zZWxlY3Rvci5oaWdoY2hhcnRzKHRoaXMuX29wdGlvbnMuY2hhcnRPcHRpb25zKTtcblx0XHRcdHRoaXMuX2NoYXJ0ID0gdGhpcy5fc2VsZWN0b3IuaGlnaGNoYXJ0cygpO1xuXG5cdFx0XHQvLyBHZW5lcmF0ZSBncmFwaCBkYXRhIGZyb20gY29sbGVjdGlvbiBkYXRhXG5cdFx0XHRkYXRhID0gdGhpcy5fY29sbGVjdGlvbi5maW5kKCk7XG5cblx0XHRcdHNlcmllc09iaiA9IHtcblx0XHRcdFx0YWxsb3dQb2ludFNlbGVjdDogdHJ1ZSxcblx0XHRcdFx0Y3Vyc29yOiAncG9pbnRlcicsXG5cdFx0XHRcdGRhdGFMYWJlbHM6IHtcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxuXHRcdFx0XHRcdGZvcm1hdDogJzxiPntwb2ludC5uYW1lfTwvYj46IHt5fSAoe3BvaW50LnBlcmNlbnRhZ2U6LjBmfSUpJyxcblx0XHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdFx0Y29sb3I6IChIaWdoY2hhcnRzLnRoZW1lICYmIEhpZ2hjaGFydHMudGhlbWUuY29udHJhc3RUZXh0Q29sb3IpIHx8ICdibGFjaydcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cblx0XHRcdGNoYXJ0RGF0YSA9IHRoaXMucGllRGF0YUZyb21Db2xsZWN0aW9uRGF0YShkYXRhLCB0aGlzLl9vcHRpb25zLmtleUZpZWxkLCB0aGlzLl9vcHRpb25zLnZhbEZpZWxkKTtcblxuXHRcdFx0JC5leHRlbmQoc2VyaWVzT2JqLCB0aGlzLl9vcHRpb25zLnNlcmllc09wdGlvbnMpO1xuXG5cdFx0XHQkLmV4dGVuZChzZXJpZXNPYmosIHtcblx0XHRcdFx0dHlwZTogJ3BpZScsXG5cdFx0XHRcdG5hbWU6IHRoaXMuX29wdGlvbnMuc2VyaWVzTmFtZSxcblx0XHRcdFx0ZGF0YTogY2hhcnREYXRhXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5fY2hhcnQuYWRkU2VyaWVzKHNlcmllc09iaik7XG5cdFx0XHRicmVhaztcblxuXHRcdGNhc2UgJ2xpbmUnOlxuXHRcdFx0Ly8gR2VuZXJhdGUgZ3JhcGggZGF0YSBmcm9tIGNvbGxlY3Rpb24gZGF0YVxuXHRcdFx0LypzZXJpZXNPYmogPSB7XG5cdFx0XHRcdGFsbG93UG9pbnRTZWxlY3Q6IHRydWUsXG5cdFx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0XHR9OyovXG5cblx0XHRcdGNoYXJ0RGF0YSA9IHRoaXMubGluZURhdGFGcm9tQ29sbGVjdGlvbkRhdGEoXG5cdFx0XHRcdHRoaXMuX29wdGlvbnMuc2VyaWVzRmllbGQsXG5cdFx0XHRcdHRoaXMuX29wdGlvbnMua2V5RmllbGQsXG5cdFx0XHRcdHRoaXMuX29wdGlvbnMudmFsRmllbGQsXG5cdFx0XHRcdHRoaXMuX29wdGlvbnMub3JkZXJCeVxuXHRcdFx0KTtcblxuXHRcdFx0dGhpcy5fb3B0aW9ucy5jaGFydE9wdGlvbnMueEF4aXMgPSBjaGFydERhdGEueEF4aXM7XG5cdFx0XHR0aGlzLl9vcHRpb25zLmNoYXJ0T3B0aW9ucy5zZXJpZXMgPSBjaGFydERhdGEuc2VyaWVzO1xuXG5cdFx0XHR0aGlzLl9zZWxlY3Rvci5oaWdoY2hhcnRzKHRoaXMuX29wdGlvbnMuY2hhcnRPcHRpb25zKTtcblx0XHRcdHRoaXMuX2NoYXJ0ID0gdGhpcy5fc2VsZWN0b3IuaGlnaGNoYXJ0cygpO1xuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHQvLyBIb29rIHRoZSBjb2xsZWN0aW9uIGV2ZW50cyB0byBhdXRvLXVwZGF0ZSB0aGUgY2hhcnRcblx0dGhpcy5faG9va0V2ZW50cygpO1xufTtcblxuQ29sbGVjdGlvbiA9IFNoYXJlZC5tb2R1bGVzLkNvbGxlY3Rpb247XG5Db2xsZWN0aW9uSW5pdCA9IENvbGxlY3Rpb24ucHJvdG90eXBlLmluaXQ7XG5cbi8qKlxuICogR2VuZXJhdGUgcGllLWNoYXJ0IHNlcmllcyBkYXRhIGZyb20gdGhlIGdpdmVuIGNvbGxlY3Rpb24gZGF0YSBhcnJheS5cbiAqIEBwYXJhbSBkYXRhXG4gKiBAcGFyYW0ga2V5RmllbGRcbiAqIEBwYXJhbSB2YWxGaWVsZFxuICogQHJldHVybnMge0FycmF5fVxuICovXG5IaWdoY2hhcnQucHJvdG90eXBlLnBpZURhdGFGcm9tQ29sbGVjdGlvbkRhdGEgPSBmdW5jdGlvbiAoZGF0YSwga2V5RmllbGQsIHZhbEZpZWxkKSB7XG5cdHZhciBncmFwaERhdGEgPSBbXSxcblx0XHRpO1xuXG5cdGZvciAoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0Z3JhcGhEYXRhLnB1c2goW2RhdGFbaV1ba2V5RmllbGRdLCBkYXRhW2ldW3ZhbEZpZWxkXV0pO1xuXHR9XG5cblx0cmV0dXJuIGdyYXBoRGF0YTtcbn07XG5cbi8qKlxuICogR2VuZXJhdGUgbGluZS1jaGFydCBzZXJpZXMgZGF0YSBmcm9tIHRoZSBnaXZlbiBjb2xsZWN0aW9uIGRhdGEgYXJyYXkuXG4gKiBAcGFyYW0gc2VyaWVzRmllbGRcbiAqIEBwYXJhbSBrZXlGaWVsZFxuICogQHBhcmFtIHZhbEZpZWxkXG4gKiBAcGFyYW0gb3JkZXJCeVxuICovXG5IaWdoY2hhcnQucHJvdG90eXBlLmxpbmVEYXRhRnJvbUNvbGxlY3Rpb25EYXRhID0gZnVuY3Rpb24gKHNlcmllc0ZpZWxkLCBrZXlGaWVsZCwgdmFsRmllbGQsIG9yZGVyQnkpIHtcblx0dmFyIGRhdGEgPSB0aGlzLl9jb2xsZWN0aW9uLmRpc3RpbmN0KHNlcmllc0ZpZWxkKSxcblx0XHRzZXJpZXNEYXRhID0gW10sXG5cdFx0eEF4aXMgPSB7XG5cdFx0XHRjYXRlZ29yaWVzOiBbXVxuXHRcdH0sXG5cdFx0c2VyaWVzTmFtZSxcblx0XHRxdWVyeSxcblx0XHRkYXRhU2VhcmNoLFxuXHRcdHNlcmllc1ZhbHVlcyxcblx0XHRpLCBrO1xuXG5cdC8vIFdoYXQgd2UgV0FOVCB0byBvdXRwdXQ6XG5cdC8qc2VyaWVzOiBbe1xuXHRcdG5hbWU6ICdSZXNwb25zZXMnLFxuXHRcdGRhdGE6IFs3LjAsIDYuOSwgOS41LCAxNC41LCAxOC4yLCAyMS41LCAyNS4yLCAyNi41LCAyMy4zLCAxOC4zLCAxMy45LCA5LjZdXG5cdH1dKi9cblxuXHQvLyBMb29wIGtleXNcblx0Zm9yIChpID0gMDsgaSA8IGRhdGEubGVuZ3RoOyBpKyspIHtcblx0XHRzZXJpZXNOYW1lID0gZGF0YVtpXTtcblx0XHRxdWVyeSA9IHt9O1xuXHRcdHF1ZXJ5W3Nlcmllc0ZpZWxkXSA9IHNlcmllc05hbWU7XG5cblx0XHRzZXJpZXNWYWx1ZXMgPSBbXTtcblx0XHRkYXRhU2VhcmNoID0gdGhpcy5fY29sbGVjdGlvbi5maW5kKHF1ZXJ5LCB7XG5cdFx0XHRvcmRlckJ5OiBvcmRlckJ5XG5cdFx0fSk7XG5cblx0XHQvLyBMb29wIHRoZSBrZXlTZWFyY2ggZGF0YSBhbmQgZ3JhYiB0aGUgdmFsdWUgZm9yIGVhY2ggaXRlbVxuXHRcdGZvciAoayA9IDA7IGsgPCBkYXRhU2VhcmNoLmxlbmd0aDsgaysrKSB7XG5cdFx0XHR4QXhpcy5jYXRlZ29yaWVzLnB1c2goZGF0YVNlYXJjaFtrXVtrZXlGaWVsZF0pO1xuXHRcdFx0c2VyaWVzVmFsdWVzLnB1c2goZGF0YVNlYXJjaFtrXVt2YWxGaWVsZF0pO1xuXHRcdH1cblxuXHRcdHNlcmllc0RhdGEucHVzaCh7XG5cdFx0XHRuYW1lOiBzZXJpZXNOYW1lLFxuXHRcdFx0ZGF0YTogc2VyaWVzVmFsdWVzXG5cdFx0fSk7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdHhBeGlzOiB4QXhpcyxcblx0XHRzZXJpZXM6IHNlcmllc0RhdGFcblx0fTtcbn07XG5cbkhpZ2hjaGFydC5wcm90b3R5cGUuX2hvb2tFdmVudHMgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRzZWxmLl9jb2xsZWN0aW9uLm9uKCdjaGFuZ2UnLCBzZWxmLl9jaGFuZ2VMaXN0ZW5lcik7XG5cblx0Ly8gSWYgdGhlIGNvbGxlY3Rpb24gaXMgZHJvcHBlZCwgY2xlYW4gdXAgYWZ0ZXIgb3Vyc2VsdmVzXG5cdHNlbGYuX2NvbGxlY3Rpb24ub24oJ2Ryb3AnLCBzZWxmLl9kcm9wTGlzdGVuZXIpO1xufTtcblxuSGlnaGNoYXJ0LnByb3RvdHlwZS5fY2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHQvLyBVcGRhdGUgdGhlIHNlcmllcyBkYXRhIG9uIHRoZSBjaGFydFxuXHRpZih0eXBlb2Ygc2VsZi5fY29sbGVjdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZi5fY2hhcnQpIHtcblx0XHR2YXIgZGF0YSA9IHNlbGYuX2NvbGxlY3Rpb24uZmluZCgpO1xuXG5cdFx0c3dpdGNoIChzZWxmLl9vcHRpb25zLnR5cGUpIHtcblx0XHRcdGNhc2UgJ3BpZSc6XG5cdFx0XHRcdHNlbGYuX2NoYXJ0LnNlcmllc1swXS5zZXREYXRhKFxuXHRcdFx0XHRcdHNlbGYucGllRGF0YUZyb21Db2xsZWN0aW9uRGF0YShcblx0XHRcdFx0XHRcdGRhdGEsXG5cdFx0XHRcdFx0XHRzZWxmLl9vcHRpb25zLmtleUZpZWxkLFxuXHRcdFx0XHRcdFx0c2VsZi5fb3B0aW9ucy52YWxGaWVsZFxuXHRcdFx0XHRcdClcblx0XHRcdFx0KTtcblx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdGNhc2UgJ2xpbmUnOlxuXHRcdFx0XHR2YXIgbGluZVNlcmllc0RhdGEgPSBzZWxmLmxpbmVEYXRhRnJvbUNvbGxlY3Rpb25EYXRhKFxuXHRcdFx0XHRcdHNlbGYuX29wdGlvbnMuc2VyaWVzRmllbGQsXG5cdFx0XHRcdFx0c2VsZi5fb3B0aW9ucy5rZXlGaWVsZCxcblx0XHRcdFx0XHRzZWxmLl9vcHRpb25zLnZhbEZpZWxkLFxuXHRcdFx0XHRcdHNlbGYuX29wdGlvbnMub3JkZXJCeVxuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdHNlbGYuX2NoYXJ0LnhBeGlzWzBdLnNldENhdGVnb3JpZXMoXG5cdFx0XHRcdFx0bGluZVNlcmllc0RhdGEueEF4aXMuY2F0ZWdvcmllc1xuXHRcdFx0XHQpO1xuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGluZVNlcmllc0RhdGEuc2VyaWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0c2VsZi5fY2hhcnQuc2VyaWVzW2ldLnNldERhdGEoXG5cdFx0XHRcdFx0XHRsaW5lU2VyaWVzRGF0YS5zZXJpZXNbaV0uZGF0YVxuXHRcdFx0XHRcdCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0fVxuXHR9XG59O1xuXG5IaWdoY2hhcnQucHJvdG90eXBlLl9kcm9wTGlzdGVuZXIgPSBmdW5jdGlvbiAoKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRzZWxmLl9jb2xsZWN0aW9uLm9mZignY2hhbmdlJywgc2VsZi5fY2hhbmdlTGlzdGVuZXIpO1xuXHRzZWxmLl9jb2xsZWN0aW9uLm9mZignZHJvcCcsIHNlbGYuX2Ryb3BMaXN0ZW5lcik7XG59O1xuXG5IaWdoY2hhcnQucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2NoYXJ0LmRlc3Ryb3koKTtcblxuXHR0aGlzLl9jb2xsZWN0aW9uLm9mZignY2hhbmdlJywgdGhpcy5fY2hhbmdlTGlzdGVuZXIpO1xuXHR0aGlzLl9jb2xsZWN0aW9uLm9mZignZHJvcCcsIHRoaXMuX2Ryb3BMaXN0ZW5lcik7XG5cblx0ZGVsZXRlIHRoaXMuX2NvbGxlY3Rpb24uX2hpZ2hjaGFydHNbdGhpcy5fb3B0aW9ucy5zZWxlY3Rvcl07XG5cdGRlbGV0ZSB0aGlzLl9jaGFydDtcblx0ZGVsZXRlIHRoaXMuX29wdGlvbnM7XG5cdGRlbGV0ZSB0aGlzLl9jb2xsZWN0aW9uO1xuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLy8gRXh0ZW5kIGNvbGxlY3Rpb24gd2l0aCB2aWV3IGluaXRcbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2hpZ2hjaGFydHMgPSB7fTtcblx0Q29sbGVjdGlvbkluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlLmNoYXJ0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcblx0aWYgKCF0aGlzLl9oaWdoY2hhcnRzW29wdGlvbnMuc2VsZWN0b3JdKSB7XG5cdFx0Ly8gU3RvcmUgbmV3IGNoYXJ0IGluIGNoYXJ0cyBhcnJheVxuXHRcdHRoaXMuX2hpZ2hjaGFydHNbb3B0aW9ucy5zZWxlY3Rvcl0gPSBuZXcgSGlnaGNoYXJ0KHRoaXMsIG9wdGlvbnMpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2hpZ2hjaGFydHNbb3B0aW9ucy5zZWxlY3Rvcl07XG59O1xuXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5kcm9wQ2hhcnQgPSBmdW5jdGlvbiAoc2VsZWN0b3IpIHtcblx0aWYgKHRoaXMuX2hpZ2hjaGFydHNbc2VsZWN0b3JdKSB7XG5cdFx0dGhpcy5faGlnaGNoYXJ0c1tzZWxlY3Rvcl0uZHJvcCgpO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhpZ2hjaGFydDsiLCJ2YXIgU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKSxcblx0UGF0aCA9IHJlcXVpcmUoJy4vUGF0aCcpO1xuXG4vKipcbiAqIFRoZSBpbmRleCBjbGFzcyB1c2VkIHRvIGluc3RhbnRpYXRlIGluZGV4ZXMgdGhhdCB0aGUgZGF0YWJhc2UgY2FuXG4gKiB1c2UgdG8gc3BlZWQgdXAgcXVlcmllcyBvbiBjb2xsZWN0aW9ucyBhbmQgdmlld3MuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEluZGV4ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGtleXMsIG9wdGlvbnMsIGNvbGxlY3Rpb24pIHtcblx0dGhpcy5fY3Jvc3NSZWYgPSB7fTtcblx0dGhpcy5fc2l6ZSA9IDA7XG5cdHRoaXMuX2lkID0gdGhpcy5faXRlbUtleUhhc2goa2V5cywga2V5cyk7XG5cblx0dGhpcy5kYXRhKHt9KTtcblx0dGhpcy51bmlxdWUob3B0aW9ucyAmJiBvcHRpb25zLnVuaXF1ZSA/IG9wdGlvbnMudW5pcXVlIDogZmFsc2UpO1xuXG5cdGlmIChrZXlzICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLmtleXMoa2V5cyk7XG5cdH1cblxuXHRpZiAoY29sbGVjdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5jb2xsZWN0aW9uKGNvbGxlY3Rpb24pO1xuXHR9XG5cblx0dGhpcy5uYW1lKG9wdGlvbnMgJiYgb3B0aW9ucy5uYW1lID8gb3B0aW9ucy5uYW1lIDogdGhpcy5faWQpO1xufTtcblxuU2hhcmVkLm1vZHVsZXMuSW5kZXggPSBJbmRleDtcblxuSW5kZXgucHJvdG90eXBlLmlkID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5faWQ7XG59O1xuXG5JbmRleC5wcm90b3R5cGUuc3RhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9zdGF0ZTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5fc2l6ZTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9kYXRhID0gdmFsO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2RhdGE7XG59O1xuXG5JbmRleC5wcm90b3R5cGUubmFtZSA9IGZ1bmN0aW9uICh2YWwpIHtcblx0aWYgKHZhbCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fbmFtZSA9IHZhbDtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9uYW1lO1xufTtcblxuSW5kZXgucHJvdG90eXBlLmNvbGxlY3Rpb24gPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb24gPSB2YWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fY29sbGVjdGlvbjtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9rZXlzID0gdmFsO1xuXG5cdFx0Ly8gQ291bnQgdGhlIGtleXNcblx0XHR0aGlzLl9rZXlDb3VudCA9IChuZXcgUGF0aCgpKS5wYXJzZSh0aGlzLl9rZXlzKS5sZW5ndGg7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fa2V5cztcbn07XG5cbkluZGV4LnByb3RvdHlwZS50eXBlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl90eXBlID0gdmFsO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX3R5cGU7XG59O1xuXG5JbmRleC5wcm90b3R5cGUudW5pcXVlID0gZnVuY3Rpb24gKHZhbCkge1xuXHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl91bmlxdWUgPSB2YWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fdW5pcXVlO1xufTtcblxuSW5kZXgucHJvdG90eXBlLnJlYnVpbGQgPSBmdW5jdGlvbiAoKSB7XG5cdC8vIERvIHdlIGhhdmUgYSBjb2xsZWN0aW9uP1xuXHRpZiAodGhpcy5fY29sbGVjdGlvbikge1xuXHRcdC8vIEdldCBzb3J0ZWQgZGF0YVxuXHRcdHZhciBjb2xsZWN0aW9uID0gdGhpcy5fY29sbGVjdGlvbi5zdWJzZXQoe30sIHtcblx0XHRcdFx0ZGVjb3VwbGU6IGZhbHNlLFxuXHRcdFx0XHRzb3J0OiB0aGlzLl9rZXlzXG5cdFx0XHR9KSxcblx0XHRcdGNvbGxlY3Rpb25EYXRhID0gY29sbGVjdGlvbi5maW5kKCksXG5cdFx0XHRkYXRhSW5kZXgsXG5cdFx0XHRkYXRhQ291bnQgPSBjb2xsZWN0aW9uRGF0YS5sZW5ndGg7XG5cblx0XHQvLyBDbGVhciB0aGUgaW5kZXggZGF0YSBmb3IgdGhlIGluZGV4XG5cdFx0dGhpcy5fZGF0YSA9IHt9O1xuXG5cdFx0aWYgKHRoaXMuX3VuaXF1ZSkge1xuXHRcdFx0dGhpcy5fdW5pcXVlTG9va3VwID0ge307XG5cdFx0fVxuXG5cdFx0Ly8gTG9vcCB0aGUgY29sbGVjdGlvbiBkYXRhXG5cdFx0Zm9yIChkYXRhSW5kZXggPSAwOyBkYXRhSW5kZXggPCBkYXRhQ291bnQ7IGRhdGFJbmRleCsrKSB7XG5cdFx0XHR0aGlzLmluc2VydChjb2xsZWN0aW9uRGF0YVtkYXRhSW5kZXhdKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLl9zdGF0ZSA9IHtcblx0XHRuYW1lOiB0aGlzLl9uYW1lLFxuXHRcdGtleXM6IHRoaXMuX2tleXMsXG5cdFx0aW5kZXhTaXplOiB0aGlzLl9zaXplLFxuXHRcdGJ1aWx0OiBuZXcgRGF0ZSgpLFxuXHRcdHVwZGF0ZWQ6IG5ldyBEYXRlKCksXG5cdFx0b2s6IHRydWVcblx0fTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoZGF0YUl0ZW0sIG9wdGlvbnMpIHtcblx0dmFyIHVuaXF1ZUZsYWcgPSB0aGlzLl91bmlxdWUsXG5cdFx0dW5pcXVlSGFzaCxcblx0XHRpdGVtSGFzaEFycixcblx0XHRoYXNoSW5kZXg7XG5cblx0aWYgKHVuaXF1ZUZsYWcpIHtcblx0XHR1bmlxdWVIYXNoID0gdGhpcy5faXRlbUhhc2goZGF0YUl0ZW0sIHRoaXMuX2tleXMpO1xuXHRcdHRoaXMuX3VuaXF1ZUxvb2t1cFt1bmlxdWVIYXNoXSA9IGRhdGFJdGVtO1xuXHR9XG5cblx0Ly8gR2VuZXJhdGUgaXRlbSBoYXNoXG5cdGl0ZW1IYXNoQXJyID0gdGhpcy5faXRlbUhhc2hBcnIoZGF0YUl0ZW0sIHRoaXMuX2tleXMpO1xuXG5cdC8vIEdldCB0aGUgcGF0aCBzZWFyY2ggcmVzdWx0cyBhbmQgc3RvcmUgdGhlbVxuXHRmb3IgKGhhc2hJbmRleCA9IDA7IGhhc2hJbmRleCA8IGl0ZW1IYXNoQXJyLmxlbmd0aDsgaGFzaEluZGV4KyspIHtcblx0XHR0aGlzLnB1c2hUb1BhdGhWYWx1ZShpdGVtSGFzaEFycltoYXNoSW5kZXhdLCBkYXRhSXRlbSk7XG5cdH1cbn07XG5cbkluZGV4LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoZGF0YUl0ZW0sIG9wdGlvbnMpIHtcblx0dmFyIHVuaXF1ZUZsYWcgPSB0aGlzLl91bmlxdWUsXG5cdFx0dW5pcXVlSGFzaCxcblx0XHRpdGVtSGFzaEFycixcblx0XHRoYXNoSW5kZXg7XG5cblx0aWYgKHVuaXF1ZUZsYWcpIHtcblx0XHR1bmlxdWVIYXNoID0gdGhpcy5faXRlbUhhc2goZGF0YUl0ZW0sIHRoaXMuX2tleXMpO1xuXHRcdGRlbGV0ZSB0aGlzLl91bmlxdWVMb29rdXBbdW5pcXVlSGFzaF07XG5cdH1cblxuXHQvLyBHZW5lcmF0ZSBpdGVtIGhhc2hcblx0aXRlbUhhc2hBcnIgPSB0aGlzLl9pdGVtSGFzaEFycihkYXRhSXRlbSwgdGhpcy5fa2V5cyk7XG5cblx0Ly8gR2V0IHRoZSBwYXRoIHNlYXJjaCByZXN1bHRzIGFuZCBzdG9yZSB0aGVtXG5cdGZvciAoaGFzaEluZGV4ID0gMDsgaGFzaEluZGV4IDwgaXRlbUhhc2hBcnIubGVuZ3RoOyBoYXNoSW5kZXgrKykge1xuXHRcdHRoaXMucHVsbEZyb21QYXRoVmFsdWUoaXRlbUhhc2hBcnJbaGFzaEluZGV4XSwgZGF0YUl0ZW0pO1xuXHR9XG59O1xuXG5JbmRleC5wcm90b3R5cGUudmlvbGF0aW9uID0gZnVuY3Rpb24gKGRhdGFJdGVtKSB7XG5cdC8vIEdlbmVyYXRlIGl0ZW0gaGFzaFxuXHR2YXIgdW5pcXVlSGFzaCA9IHRoaXMuX2l0ZW1IYXNoKGRhdGFJdGVtLCB0aGlzLl9rZXlzKTtcblxuXHQvLyBDaGVjayBpZiB0aGUgaXRlbSBicmVha3MgdGhlIHVuaXF1ZSBjb25zdHJhaW50XG5cdHJldHVybiBCb29sZWFuKHRoaXMuX3VuaXF1ZUxvb2t1cFt1bmlxdWVIYXNoXSk7XG59O1xuXG5JbmRleC5wcm90b3R5cGUuaGFzaFZpb2xhdGlvbiA9IGZ1bmN0aW9uICh1bmlxdWVIYXNoKSB7XG5cdC8vIENoZWNrIGlmIHRoZSBpdGVtIGJyZWFrcyB0aGUgdW5pcXVlIGNvbnN0cmFpbnRcblx0cmV0dXJuIEJvb2xlYW4odGhpcy5fdW5pcXVlTG9va3VwW3VuaXF1ZUhhc2hdKTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5wdXNoVG9QYXRoVmFsdWUgPSBmdW5jdGlvbiAoaGFzaCwgb2JqKSB7XG5cdHZhciBwYXRoVmFsQXJyID0gdGhpcy5fZGF0YVtoYXNoXSA9IHRoaXMuX2RhdGFbaGFzaF0gfHwgW107XG5cblx0Ly8gTWFrZSBzdXJlIHdlIGhhdmUgbm90IGFscmVhZHkgaW5kZXhlZCB0aGlzIG9iamVjdCBhdCB0aGlzIHBhdGgvdmFsdWVcblx0aWYgKHBhdGhWYWxBcnIuaW5kZXhPZihvYmopID09PSAtMSkge1xuXHRcdC8vIEluZGV4IHRoZSBvYmplY3Rcblx0XHRwYXRoVmFsQXJyLnB1c2gob2JqKTtcblxuXHRcdC8vIFJlY29yZCB0aGUgcmVmZXJlbmNlIHRvIHRoaXMgb2JqZWN0IGluIG91ciBpbmRleCBzaXplXG5cdFx0dGhpcy5fc2l6ZSsrO1xuXG5cdFx0Ly8gQ3Jvc3MtcmVmZXJlbmNlIHRoaXMgYXNzb2NpYXRpb24gZm9yIGxhdGVyIGxvb2t1cFxuXHRcdHRoaXMucHVzaFRvQ3Jvc3NSZWYob2JqLCBwYXRoVmFsQXJyKTtcblx0fVxufTtcblxuSW5kZXgucHJvdG90eXBlLnB1bGxGcm9tUGF0aFZhbHVlID0gZnVuY3Rpb24gKGhhc2gsIG9iaikge1xuXHR2YXIgcGF0aFZhbEFyciA9IHRoaXMuX2RhdGFbaGFzaF0sXG5cdFx0aW5kZXhPZk9iamVjdDtcblxuXHQvLyBNYWtlIHN1cmUgd2UgaGF2ZSBhbHJlYWR5IGluZGV4ZWQgdGhpcyBvYmplY3QgYXQgdGhpcyBwYXRoL3ZhbHVlXG5cdGluZGV4T2ZPYmplY3QgPSBwYXRoVmFsQXJyLmluZGV4T2Yob2JqKTtcblxuXHRpZiAoaW5kZXhPZk9iamVjdCA+IC0xKSB7XG5cdFx0Ly8gVW4taW5kZXggdGhlIG9iamVjdFxuXHRcdHBhdGhWYWxBcnIuc3BsaWNlKGluZGV4T2ZPYmplY3QsIDEpO1xuXG5cdFx0Ly8gUmVjb3JkIHRoZSByZWZlcmVuY2UgdG8gdGhpcyBvYmplY3QgaW4gb3VyIGluZGV4IHNpemVcblx0XHR0aGlzLl9zaXplLS07XG5cblx0XHQvLyBSZW1vdmUgb2JqZWN0IGNyb3NzLXJlZmVyZW5jZVxuXHRcdHRoaXMucHVsbEZyb21Dcm9zc1JlZihvYmosIHBhdGhWYWxBcnIpO1xuXHR9XG5cblx0Ly8gQ2hlY2sgaWYgd2Ugc2hvdWxkIHJlbW92ZSB0aGUgcGF0aCB2YWx1ZSBhcnJheVxuXHRpZiAoIXBhdGhWYWxBcnIubGVuZ3RoKSB7XG5cdFx0Ly8gUmVtb3ZlIHRoZSBhcnJheVxuXHRcdGRlbGV0ZSB0aGlzLl9kYXRhW2hhc2hdO1xuXHR9XG59O1xuXG5JbmRleC5wcm90b3R5cGUucHVsbCA9IGZ1bmN0aW9uIChvYmopIHtcblx0Ly8gR2V0IGFsbCBwbGFjZXMgdGhlIG9iamVjdCBoYXMgYmVlbiB1c2VkIGFuZCByZW1vdmUgdGhlbVxuXHR2YXIgaWQgPSBvYmpbdGhpcy5fY29sbGVjdGlvbi5wcmltYXJ5S2V5KCldLFxuXHRcdGNyb3NzUmVmQXJyID0gdGhpcy5fY3Jvc3NSZWZbaWRdLFxuXHRcdGFyckluZGV4LFxuXHRcdGFyckNvdW50ID0gY3Jvc3NSZWZBcnIubGVuZ3RoLFxuXHRcdGFyckl0ZW07XG5cblx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRhcnJJdGVtID0gY3Jvc3NSZWZBcnJbYXJySW5kZXhdO1xuXG5cdFx0Ly8gUmVtb3ZlIGl0ZW0gZnJvbSB0aGlzIGluZGV4IGxvb2t1cCBhcnJheVxuXHRcdHRoaXMuX3B1bGxGcm9tQXJyYXkoYXJySXRlbSwgb2JqKTtcblx0fVxuXG5cdC8vIFJlY29yZCB0aGUgcmVmZXJlbmNlIHRvIHRoaXMgb2JqZWN0IGluIG91ciBpbmRleCBzaXplXG5cdHRoaXMuX3NpemUtLTtcblxuXHQvLyBOb3cgcmVtb3ZlIHRoZSBjcm9zcy1yZWZlcmVuY2UgZW50cnkgZm9yIHRoaXMgb2JqZWN0XG5cdGRlbGV0ZSB0aGlzLl9jcm9zc1JlZltpZF07XG59O1xuXG5JbmRleC5wcm90b3R5cGUuX3B1bGxGcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyLCBvYmopIHtcblx0dmFyIGFyckNvdW50ID0gYXJyLmxlbmd0aDtcblxuXHR3aGlsZSAoYXJyQ291bnQtLSkge1xuXHRcdGlmIChhcnJbYXJyQ291bnRdID09PSBvYmopIHtcblx0XHRcdGFyci5zcGxpY2UoYXJyQ291bnQsIDEpO1xuXHRcdH1cblx0fVxufTtcblxuSW5kZXgucHJvdG90eXBlLnB1c2hUb0Nyb3NzUmVmID0gZnVuY3Rpb24gKG9iaiwgcGF0aFZhbEFycikge1xuXHR2YXIgaWQgPSBvYmpbdGhpcy5fY29sbGVjdGlvbi5wcmltYXJ5S2V5KCldLFxuXHRcdGNyT2JqO1xuXG5cdHRoaXMuX2Nyb3NzUmVmW2lkXSA9IHRoaXMuX2Nyb3NzUmVmW2lkXSB8fCBbXTtcblxuXHQvLyBDaGVjayBpZiB0aGUgY3Jvc3MtcmVmZXJlbmNlIHRvIHRoZSBwYXRoVmFsIGFycmF5IGFscmVhZHkgZXhpc3RzXG5cdGNyT2JqID0gdGhpcy5fY3Jvc3NSZWZbaWRdO1xuXG5cdGlmIChjck9iai5pbmRleE9mKHBhdGhWYWxBcnIpID09PSAtMSkge1xuXHRcdC8vIEFkZCB0aGUgY3Jvc3MtcmVmZXJlbmNlXG5cdFx0Y3JPYmoucHVzaChwYXRoVmFsQXJyKTtcblx0fVxufTtcblxuSW5kZXgucHJvdG90eXBlLnB1bGxGcm9tQ3Jvc3NSZWYgPSBmdW5jdGlvbiAob2JqLCBwYXRoVmFsQXJyKSB7XG5cdHZhciBpZCA9IG9ialt0aGlzLl9jb2xsZWN0aW9uLnByaW1hcnlLZXkoKV0sXG5cdFx0Y3JPYmo7XG5cblx0ZGVsZXRlIHRoaXMuX2Nyb3NzUmVmW2lkXTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5sb29rdXAgPSBmdW5jdGlvbiAocXVlcnkpIHtcblx0cmV0dXJuIHRoaXMuX2RhdGFbdGhpcy5faXRlbUhhc2gocXVlcnksIHRoaXMuX2tleXMpXSB8fCBbXTtcbn07XG5cbkluZGV4LnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucykge1xuXHQvLyBDaGVjayBpZiB0aGUgcGFzc2VkIHF1ZXJ5IGhhcyBkYXRhIGluIHRoZSBrZXlzIG91ciBpbmRleFxuXHQvLyBvcGVyYXRlcyBvbiBhbmQgaWYgc28sIGlzIHRoZSBxdWVyeSBzb3J0IG1hdGNoaW5nIG91ciBvcmRlclxuXHR2YXIgcGF0aFNvbHZlciA9IG5ldyBQYXRoKCk7XG5cdHJldHVybiBwYXRoU29sdmVyLmNvdW50T2JqZWN0UGF0aHModGhpcy5fa2V5cywgcXVlcnkpO1xufTtcblxuSW5kZXgucHJvdG90eXBlLl9pdGVtSGFzaCA9IGZ1bmN0aW9uIChpdGVtLCBrZXlzKSB7XG5cdHZhciBwYXRoID0gbmV3IFBhdGgoKSxcblx0XHRwYXRoRGF0YSxcblx0XHRoYXNoID0gJycsXG5cdFx0aztcblxuXHRwYXRoRGF0YSA9IHBhdGgucGFyc2Uoa2V5cyk7XG5cblx0Zm9yIChrID0gMDsgayA8IHBhdGhEYXRhLmxlbmd0aDsgaysrKSB7XG5cdFx0aWYgKGhhc2gpIHsgaGFzaCArPSAnXyc7IH1cblx0XHRoYXNoICs9IHBhdGgudmFsdWUoaXRlbSwgcGF0aERhdGFba10ucGF0aCkuam9pbignOicpO1xuXHR9XG5cblx0cmV0dXJuIGhhc2g7XG59O1xuXG5JbmRleC5wcm90b3R5cGUuX2l0ZW1LZXlIYXNoID0gZnVuY3Rpb24gKGl0ZW0sIGtleXMpIHtcblx0dmFyIHBhdGggPSBuZXcgUGF0aCgpLFxuXHRcdHBhdGhEYXRhLFxuXHRcdGhhc2ggPSAnJyxcblx0XHRrO1xuXG5cdHBhdGhEYXRhID0gcGF0aC5wYXJzZShrZXlzKTtcblxuXHRmb3IgKGsgPSAwOyBrIDwgcGF0aERhdGEubGVuZ3RoOyBrKyspIHtcblx0XHRpZiAoaGFzaCkgeyBoYXNoICs9ICdfJzsgfVxuXHRcdGhhc2ggKz0gcGF0aC5rZXlWYWx1ZShpdGVtLCBwYXRoRGF0YVtrXS5wYXRoKTtcblx0fVxuXG5cdHJldHVybiBoYXNoO1xufTtcblxuSW5kZXgucHJvdG90eXBlLl9pdGVtSGFzaEFyciA9IGZ1bmN0aW9uIChpdGVtLCBrZXlzKSB7XG5cdHZhciBwYXRoID0gbmV3IFBhdGgoKSxcblx0XHRwYXRoRGF0YSxcblx0XHRoYXNoID0gJycsXG5cdFx0aGFzaEFyciA9IFtdLFxuXHRcdHZhbEFycixcblx0XHRpLCBrLCBqO1xuXG5cdHBhdGhEYXRhID0gcGF0aC5wYXJzZShrZXlzKTtcblxuXHRmb3IgKGsgPSAwOyBrIDwgcGF0aERhdGEubGVuZ3RoOyBrKyspIHtcblx0XHR2YWxBcnIgPSBwYXRoLnZhbHVlKGl0ZW0sIHBhdGhEYXRhW2tdLnBhdGgpO1xuXG5cdFx0Zm9yIChpID0gMDsgaSA8IHZhbEFyci5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0Ly8gU2V0dXAgdGhlIGluaXRpYWwgaGFzaCBhcnJheVxuXHRcdFx0XHRoYXNoQXJyLnB1c2godmFsQXJyW2ldKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIExvb3AgdGhlIGhhc2ggYXJyYXkgYW5kIGNvbmNhdCB0aGUgdmFsdWUgdG8gaXRcblx0XHRcdFx0Zm9yIChqID0gMDsgaiA8IGhhc2hBcnIubGVuZ3RoOyBqKyspIHtcblx0XHRcdFx0XHRoYXNoQXJyW2pdID0gaGFzaEFycltqXSArICdfJyArIHZhbEFycltpXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBoYXNoQXJyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmRleDsiLCJ2YXIgU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKTtcblxuLyoqXG4gKiBUaGUga2V5IHZhbHVlIHN0b3JlIGNsYXNzIHVzZWQgd2hlbiBzdG9yaW5nIGJhc2ljIGluLW1lbW9yeSBLViBkYXRhLFxuICogYW5kIGNhbiBiZSBxdWVyaWVkIGZvciBxdWljayByZXRyaWV2YWwuIE1vc3RseSB1c2VkIGZvciBjb2xsZWN0aW9uXG4gKiBwcmltYXJ5IGtleSBpbmRleGVzIGFuZCBsb29rdXBzLlxuICogQHBhcmFtIHtTdHJpbmc9fSBuYW1lIE9wdGlvbmFsIEtWIHN0b3JlIG5hbWUuXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEtleVZhbHVlU3RvcmUgPSBmdW5jdGlvbiAobmFtZSkge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbktleVZhbHVlU3RvcmUucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAobmFtZSkge1xuXHR0aGlzLl9uYW1lID0gbmFtZTtcblx0dGhpcy5fZGF0YSA9IHt9O1xuXHR0aGlzLl9wcmltYXJ5S2V5ID0gJ19pZCc7XG59O1xuXG5TaGFyZWQubW9kdWxlcy5LZXlWYWx1ZVN0b3JlID0gS2V5VmFsdWVTdG9yZTtcblxuLyoqXG4gKiBHZXQgLyBzZXQgdGhlIG5hbWUgb2YgdGhlIGtleS92YWx1ZSBzdG9yZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWwgVGhlIG5hbWUgdG8gc2V0LlxuICogQHJldHVybnMgeyp9XG4gKi9cbktleVZhbHVlU3RvcmUucHJvdG90eXBlLm5hbWUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX25hbWUgPSB2YWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fbmFtZTtcbn07XG5cbi8qKlxuICogR2V0IC8gc2V0IHRoZSBwcmltYXJ5IGtleS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byBzZXQuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUucHJpbWFyeUtleSA9IGZ1bmN0aW9uIChrZXkpIHtcblx0aWYgKGtleSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcHJpbWFyeUtleSA9IGtleTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9wcmltYXJ5S2V5O1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFsbCBkYXRhIGZyb20gdGhlIHN0b3JlLlxuICogQHJldHVybnMgeyp9XG4gKi9cbktleVZhbHVlU3RvcmUucHJvdG90eXBlLnRydW5jYXRlID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9kYXRhID0ge307XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIGRhdGEgYWdhaW5zdCBhIGtleSBpbiB0aGUgc3RvcmUuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFRoZSBrZXkgdG8gc2V0IGRhdGEgZm9yLlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gYXNzaWduIHRvIHRoZSBrZXkuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0dGhpcy5fZGF0YVtrZXldID0gdmFsdWUgPyB2YWx1ZSA6IHRydWU7XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzIGRhdGEgc3RvcmVkIGZvciB0aGUgcGFzc2VkIGtleS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byBnZXQgZGF0YSBmb3IuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuXHRyZXR1cm4gdGhpcy5fZGF0YVtrZXldO1xufTtcblxuLyoqXG4gKiBHZXQgLyBzZXQgdGhlIHByaW1hcnkga2V5LlxuICogQHBhcmFtIHsqfSBvYmogQSBsb29rdXAgcXVlcnksIGNhbiBiZSBhIHN0cmluZyBrZXksIGFuIGFycmF5IG9mIHN0cmluZyBrZXlzLFxuICogYW4gb2JqZWN0IHdpdGggZnVydGhlciBxdWVyeSBjbGF1c2VzIG9yIGEgcmVndWxhciBleHByZXNzaW9uIHRoYXQgc2hvdWxkIGJlXG4gKiBydW4gYWdhaW5zdCBhbGwga2V5cy5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5LZXlWYWx1ZVN0b3JlLnByb3RvdHlwZS5sb29rdXAgPSBmdW5jdGlvbiAob2JqKSB7XG5cdHZhciBwS2V5VmFsID0gb2JqW3RoaXMuX3ByaW1hcnlLZXldLFxuXHRcdGFyckluZGV4LFxuXHRcdGFyckNvdW50LFxuXHRcdGxvb2t1cEl0ZW0sXG5cdFx0cmVzdWx0O1xuXG5cdGlmIChwS2V5VmFsIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHQvLyBBbiBhcnJheSBvZiBwcmltYXJ5IGtleXMsIGZpbmQgYWxsIG1hdGNoZXNcblx0XHRhcnJDb3VudCA9IHBLZXlWYWwubGVuZ3RoO1xuXHRcdHJlc3VsdCA9IFtdO1xuXG5cdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdGxvb2t1cEl0ZW0gPSB0aGlzLl9kYXRhW3BLZXlWYWxbYXJySW5kZXhdXTtcblxuXHRcdFx0aWYgKGxvb2t1cEl0ZW0pIHtcblx0XHRcdFx0cmVzdWx0LnB1c2gobG9va3VwSXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSBlbHNlIGlmIChwS2V5VmFsIGluc3RhbmNlb2YgUmVnRXhwKSB7XG5cdFx0Ly8gQ3JlYXRlIG5ldyBkYXRhXG5cdFx0cmVzdWx0ID0gW107XG5cblx0XHRmb3IgKGFyckluZGV4IGluIHRoaXMuX2RhdGEpIHtcblx0XHRcdGlmICh0aGlzLl9kYXRhLmhhc093blByb3BlcnR5KGFyckluZGV4KSkge1xuXHRcdFx0XHRpZiAocEtleVZhbC50ZXN0KGFyckluZGV4KSkge1xuXHRcdFx0XHRcdHJlc3VsdC5wdXNoKHRoaXMuX2RhdGFbYXJySW5kZXhdKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0gZWxzZSBpZiAodHlwZW9mIHBLZXlWYWwgPT09ICdvYmplY3QnKSB7XG5cdFx0Ly8gVGhlIHByaW1hcnkga2V5IGNsYXVzZSBpcyBhbiBvYmplY3QsIG5vdyB3ZSBoYXZlIHRvIGRvIHNvbWVcblx0XHQvLyBtb3JlIGV4dGVuc2l2ZSBzZWFyY2hpbmdcblx0XHRpZiAocEtleVZhbC4kbmUpIHtcblx0XHRcdC8vIENyZWF0ZSBuZXcgZGF0YVxuXHRcdFx0cmVzdWx0ID0gW107XG5cblx0XHRcdGZvciAoYXJySW5kZXggaW4gdGhpcy5fZGF0YSkge1xuXHRcdFx0XHRpZiAodGhpcy5fZGF0YS5oYXNPd25Qcm9wZXJ0eShhcnJJbmRleCkpIHtcblx0XHRcdFx0XHRpZiAoYXJySW5kZXggIT09IHBLZXlWYWwuJG5lKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQucHVzaCh0aGlzLl9kYXRhW2FyckluZGV4XSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXG5cdFx0aWYgKHBLZXlWYWwuJGluICYmIChwS2V5VmFsLiRpbiBpbnN0YW5jZW9mIEFycmF5KSkge1xuXHRcdFx0Ly8gQ3JlYXRlIG5ldyBkYXRhXG5cdFx0XHRyZXN1bHQgPSBbXTtcblxuXHRcdFx0Zm9yIChhcnJJbmRleCBpbiB0aGlzLl9kYXRhKSB7XG5cdFx0XHRcdGlmICh0aGlzLl9kYXRhLmhhc093blByb3BlcnR5KGFyckluZGV4KSkge1xuXHRcdFx0XHRcdGlmIChwS2V5VmFsLiRpbi5pbmRleE9mKGFyckluZGV4KSA+IC0xKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQucHVzaCh0aGlzLl9kYXRhW2FyckluZGV4XSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXG5cdFx0aWYgKHBLZXlWYWwuJG5pbiAmJiAocEtleVZhbC4kbmluIGluc3RhbmNlb2YgQXJyYXkpKSB7XG5cdFx0XHQvLyBDcmVhdGUgbmV3IGRhdGFcblx0XHRcdHJlc3VsdCA9IFtdO1xuXG5cdFx0XHRmb3IgKGFyckluZGV4IGluIHRoaXMuX2RhdGEpIHtcblx0XHRcdFx0aWYgKHRoaXMuX2RhdGEuaGFzT3duUHJvcGVydHkoYXJySW5kZXgpKSB7XG5cdFx0XHRcdFx0aWYgKHBLZXlWYWwuJG5pbi5pbmRleE9mKGFyckluZGV4KSA9PT0gLTEpIHtcblx0XHRcdFx0XHRcdHJlc3VsdC5wdXNoKHRoaXMuX2RhdGFbYXJySW5kZXhdKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cblx0XHRpZiAocEtleVZhbC4kb3IgJiYgKHBLZXlWYWwuJG9yIGluc3RhbmNlb2YgQXJyYXkpKSB7XG5cdFx0XHQvLyBDcmVhdGUgbmV3IGRhdGFcblx0XHRcdHJlc3VsdCA9IFtdO1xuXG5cdFx0XHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBwS2V5VmFsLiRvci5sZW5ndGg7IGFyckluZGV4KyspIHtcblx0XHRcdFx0cmVzdWx0ID0gcmVzdWx0LmNvbmNhdCh0aGlzLmxvb2t1cChwS2V5VmFsLiRvclthcnJJbmRleF0pKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Ly8gS2V5IGlzIGEgYmFzaWMgbG9va3VwIGZyb20gc3RyaW5nXG5cdFx0bG9va3VwSXRlbSA9IHRoaXMuX2RhdGFbcEtleVZhbF07XG5cblx0XHRpZiAobG9va3VwSXRlbSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRyZXR1cm4gW2xvb2t1cEl0ZW1dO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gW107XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgZGF0YSBmb3IgdGhlIGdpdmVuIGtleSBmcm9tIHRoZSBzdG9yZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXkgVGhlIGtleSB0byB1bi1zZXQuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuS2V5VmFsdWVTdG9yZS5wcm90b3R5cGUudW5TZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdGRlbGV0ZSB0aGlzLl9kYXRhW2tleV07XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIGRhdGEgZm9yIHRoZSBnaXZlIGtleSBpbiB0aGUgc3RvcmUgb25seSB3aGVyZSB0aGUgZ2l2ZW4ga2V5XG4gKiBkb2VzIG5vdCBhbHJlYWR5IGhhdmUgYSB2YWx1ZSBpbiB0aGUgc3RvcmUuXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFRoZSBrZXkgdG8gc2V0IGRhdGEgZm9yLlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gYXNzaWduIHRvIHRoZSBrZXkuXG4gKiBAcmV0dXJucyB7Qm9vbGVhbn0gVHJ1ZSBpZiBkYXRhIHdhcyBzZXQgb3IgZmFsc2UgaWYgZGF0YSBhbHJlYWR5XG4gKiBleGlzdHMgZm9yIHRoZSBrZXkuXG4gKi9cbktleVZhbHVlU3RvcmUucHJvdG90eXBlLnVuaXF1ZVNldCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG5cdGlmICh0aGlzLl9kYXRhW2tleV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2RhdGFba2V5XSA9IHZhbHVlO1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlWYWx1ZVN0b3JlOyIsInZhciBTaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpLFxuXHRPcGVyYXRpb24gPSByZXF1aXJlKCcuL09wZXJhdGlvbicpO1xuXG4vKipcbiAqIFRoZSBtZXRyaWNzIGNsYXNzIHVzZWQgdG8gc3RvcmUgZGV0YWlscyBhYm91dCBvcGVyYXRpb25zLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBNZXRyaWNzID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbk1ldHJpY3MucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX2RhdGEgPSBbXTtcbn07XG5cblNoYXJlZC5tb2R1bGVzLk1ldHJpY3MgPSBNZXRyaWNzO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gb3BlcmF0aW9uIHdpdGhpbiB0aGUgbWV0cmljcyBpbnN0YW5jZSBhbmQgaWYgbWV0cmljc1xuICogYXJlIGN1cnJlbnRseSBlbmFibGVkIChieSBjYWxsaW5nIHRoZSBzdGFydCgpIG1ldGhvZCkgdGhlIG9wZXJhdGlvblxuICogaXMgYWxzbyBzdG9yZWQgaW4gdGhlIG1ldHJpY3MgbG9nLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIG9wZXJhdGlvbi5cbiAqIEByZXR1cm5zIHtPcGVyYXRpb259XG4gKi9cbk1ldHJpY3MucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHZhciBvcCA9IG5ldyBPcGVyYXRpb24obmFtZSk7XG5cblx0aWYgKHRoaXMuX2VuYWJsZWQpIHtcblx0XHR0aGlzLl9kYXRhLnB1c2gob3ApO1xuXHR9XG5cblx0cmV0dXJuIG9wO1xufTtcblxuLyoqXG4gKiBTdGFydHMgbG9nZ2luZyBvcGVyYXRpb25zLlxuICogQHJldHVybnMge01ldHJpY3N9XG4gKi9cbk1ldHJpY3MucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9lbmFibGVkID0gdHJ1ZTtcblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFN0b3BzIGxvZ2dpbmcgb3BlcmF0aW9ucy5cbiAqIEByZXR1cm5zIHtNZXRyaWNzfVxuICovXG5NZXRyaWNzLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9lbmFibGVkID0gZmFsc2U7XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDbGVhcnMgYWxsIGxvZ2dlZCBvcGVyYXRpb25zLlxuICogQHJldHVybnMge01ldHJpY3N9XG4gKi9cbk1ldHJpY3MucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9kYXRhID0gW107XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIGFsbCBsb2dnZWQgb3BlcmF0aW9ucy5cbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuTWV0cmljcy5wcm90b3R5cGUubGlzdCA9IGZ1bmN0aW9uICgpIHtcblx0cmV0dXJuIHRoaXMuX2RhdGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1ldHJpY3M7IiwiLy8gR3JhYiB0aGUgdmlldyBjbGFzc1xudmFyIFNoYXJlZCxcblx0Q29yZSxcblx0T2xkVmlldyxcblx0T2xkVmlld0luaXQ7XG5cblNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyk7XG5Db3JlID0gU2hhcmVkLm1vZHVsZXMuQ29yZTtcbk9sZFZpZXcgPSBTaGFyZWQubW9kdWxlcy5PbGRWaWV3O1xuT2xkVmlld0luaXQgPSBPbGRWaWV3LnByb3RvdHlwZS5pbml0O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0dGhpcy5fYmluZHMgPSBbXTtcblx0dGhpcy5fcmVuZGVyU3RhcnQgPSAwO1xuXHR0aGlzLl9yZW5kZXJFbmQgPSAwO1xuXG5cdHRoaXMuX2RlZmVyUXVldWUgPSB7XG5cdFx0aW5zZXJ0OiBbXSxcblx0XHR1cGRhdGU6IFtdLFxuXHRcdHJlbW92ZTogW10sXG5cdFx0dXBzZXJ0OiBbXSxcblx0XHRfYmluZEluc2VydDogW10sXG5cdFx0X2JpbmRVcGRhdGU6IFtdLFxuXHRcdF9iaW5kUmVtb3ZlOiBbXSxcblx0XHRfYmluZFVwc2VydDogW11cblx0fTtcblxuXHR0aGlzLl9kZWZlclRocmVzaG9sZCA9IHtcblx0XHRpbnNlcnQ6IDEwMCxcblx0XHR1cGRhdGU6IDEwMCxcblx0XHRyZW1vdmU6IDEwMCxcblx0XHR1cHNlcnQ6IDEwMCxcblx0XHRfYmluZEluc2VydDogMTAwLFxuXHRcdF9iaW5kVXBkYXRlOiAxMDAsXG5cdFx0X2JpbmRSZW1vdmU6IDEwMCxcblx0XHRfYmluZFVwc2VydDogMTAwXG5cdH07XG5cblx0dGhpcy5fZGVmZXJUaW1lID0ge1xuXHRcdGluc2VydDogMTAwLFxuXHRcdHVwZGF0ZTogMSxcblx0XHRyZW1vdmU6IDEsXG5cdFx0dXBzZXJ0OiAxLFxuXHRcdF9iaW5kSW5zZXJ0OiAxMDAsXG5cdFx0X2JpbmRVcGRhdGU6IDEsXG5cdFx0X2JpbmRSZW1vdmU6IDEsXG5cdFx0X2JpbmRVcHNlcnQ6IDFcblx0fTtcblxuXHRPbGRWaWV3SW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG5cdC8vIEhvb2sgdmlldyBldmVudHMgdG8gdXBkYXRlIGJpbmRzXG5cdHRoaXMub24oJ2luc2VydCcsIGZ1bmN0aW9uIChzdWNjZXNzQXJyLCBmYWlsQXJyKSB7XG5cdFx0c2VsZi5fYmluZEV2ZW50KCdpbnNlcnQnLCBzdWNjZXNzQXJyLCBmYWlsQXJyKTtcblx0fSk7XG5cblx0dGhpcy5vbigndXBkYXRlJywgZnVuY3Rpb24gKHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0XHRzZWxmLl9iaW5kRXZlbnQoJ3VwZGF0ZScsIHN1Y2Nlc3NBcnIsIGZhaWxBcnIpO1xuXHR9KTtcblxuXHR0aGlzLm9uKCdyZW1vdmUnLCBmdW5jdGlvbiAoc3VjY2Vzc0FyciwgZmFpbEFycikge1xuXHRcdHNlbGYuX2JpbmRFdmVudCgncmVtb3ZlJywgc3VjY2Vzc0FyciwgZmFpbEFycik7XG5cdH0pO1xuXG5cdHRoaXMub24oJ2NoYW5nZScsIHNlbGYuX2JpbmRDaGFuZ2UpO1xufTtcblxuLyoqXG4gKiBCaW5kcyBhIHNlbGVjdG9yIHRvIHRoZSBpbnNlcnQsIHVwZGF0ZSBhbmQgZGVsZXRlIGV2ZW50cyBvZiBhIHBhcnRpY3VsYXJcbiAqIHZpZXcgYW5kIGtlZXBzIHRoZSBzZWxlY3RvciBpbiBzeW5jIHNvIHRoYXQgdXBkYXRlcyBhcmUgcmVmbGVjdGVkIG9uIHRoZVxuICogd2ViIHBhZ2UgaW4gcmVhbC10aW1lLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciBUaGUgalF1ZXJ5IHNlbGVjdG9yIHN0cmluZyB0byBnZXQgdGFyZ2V0IGVsZW1lbnRzLlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgVGhlIG9wdGlvbnMgb2JqZWN0LlxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBvcHRpb25zKSB7XG5cdGlmIChvcHRpb25zICYmIG9wdGlvbnMudGVtcGxhdGUpIHtcblx0XHR0aGlzLl9iaW5kc1tzZWxlY3Rvcl0gPSBvcHRpb25zO1xuXHR9IGVsc2Uge1xuXHRcdHRocm93KCdDYW5ub3QgYmluZCBkYXRhIHRvIGVsZW1lbnQsIG1pc3Npbmcgb3B0aW9ucyBpbmZvcm1hdGlvbiEnKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVbi1iaW5kcyBhIHNlbGVjdG9yIGZyb20gdGhlIHZpZXcgY2hhbmdlcy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciBUaGUgalF1ZXJ5IHNlbGVjdG9yIHN0cmluZyB0byBpZGVudGlmeSB0aGUgYmluZCB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUudW5CaW5kID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG5cdGRlbGV0ZSB0aGlzLl9iaW5kc1tzZWxlY3Rvcl07XG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIHNlbGVjdG9yIGlzIGJvdW5kIHRvIHRoZSB2aWV3LlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIFRoZSBqUXVlcnkgc2VsZWN0b3Igc3RyaW5nIHRvIGlkZW50aWZ5IHRoZSBiaW5kIHRvIGNoZWNrIGZvci5cbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5pc0JvdW5kID0gZnVuY3Rpb24gKHNlbGVjdG9yKSB7XG5cdHJldHVybiBCb29sZWFuKHRoaXMuX2JpbmRzW3NlbGVjdG9yXSk7XG59O1xuXG4vKipcbiAqIFNvcnRzIGl0ZW1zIGluIHRoZSBET00gYmFzZWQgb24gdGhlIGJpbmQgc2V0dGluZ3MgYW5kIHRoZSBwYXNzZWQgaXRlbSBhcnJheS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciBUaGUgalF1ZXJ5IHNlbGVjdG9yIG9mIHRoZSBiaW5kIGNvbnRhaW5lci5cbiAqIEBwYXJhbSB7QXJyYXl9IGl0ZW1BcnIgVGhlIGFycmF5IG9mIGl0ZW1zIHVzZWQgdG8gZGV0ZXJtaW5lIHRoZSBvcmRlciB0aGUgRE9NXG4gKiBlbGVtZW50cyBzaG91bGQgYmUgaW4gYmFzZWQgb24gdGhlIG9yZGVyIHRoZXkgYXJlIGluLCBpbiB0aGUgYXJyYXkuXG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLmJpbmRTb3J0RG9tID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBpdGVtQXJyKSB7XG5cdHZhciBjb250YWluZXIgPSAkKHNlbGVjdG9yKSxcblx0XHRhcnJJbmRleCxcblx0XHRhcnJJdGVtLFxuXHRcdGRvbUl0ZW07XG5cblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldy5CaW5kOiBTb3J0aW5nIGRhdGEgaW4gRE9NLi4uJywgaXRlbUFycik7XG5cdH1cblxuXHRmb3IgKGFyckluZGV4ID0gMDsgYXJySW5kZXggPCBpdGVtQXJyLmxlbmd0aDsgYXJySW5kZXgrKykge1xuXHRcdGFyckl0ZW0gPSBpdGVtQXJyW2FyckluZGV4XTtcblxuXHRcdC8vIE5vdyB3ZSd2ZSBkb25lIG91ciBpbnNlcnRzIGludG8gdGhlIERPTSwgbGV0J3MgZW5zdXJlXG5cdFx0Ly8gdGhleSBhcmUgc3RpbGwgb3JkZXJlZCBjb3JyZWN0bHlcblx0XHRkb21JdGVtID0gY29udGFpbmVyLmZpbmQoJyMnICsgYXJySXRlbVt0aGlzLl9wcmltYXJ5S2V5XSk7XG5cblx0XHRpZiAoZG9tSXRlbS5sZW5ndGgpIHtcblx0XHRcdGlmIChhcnJJbmRleCA9PT0gMCkge1xuXHRcdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3LkJpbmQ6IFNvcnQsIG1vdmluZyB0byBpbmRleCAwLi4uJywgZG9tSXRlbSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29udGFpbmVyLnByZXBlbmQoZG9tSXRlbSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3LkJpbmQ6IFNvcnQsIG1vdmluZyB0byBpbmRleCAnICsgYXJySW5kZXggKyAnLi4uJywgZG9tSXRlbSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZG9tSXRlbS5pbnNlcnRBZnRlcihjb250YWluZXIuY2hpbGRyZW4oJzplcSgnICsgKGFyckluZGV4IC0gMSkgKyAnKScpKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXcuQmluZDogV2FybmluZywgZWxlbWVudCBmb3IgYXJyYXkgaXRlbSBub3QgZm91bmQhJywgYXJySXRlbSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5iaW5kUmVmcmVzaCA9IGZ1bmN0aW9uIChvYmopIHtcblx0dmFyIGJpbmRzID0gdGhpcy5fYmluZHMsXG5cdFx0YmluZEtleSxcblx0XHRiaW5kO1xuXG5cdGlmICghb2JqKSB7XG5cdFx0Ly8gR3JhYiBjdXJyZW50IGRhdGFcblx0XHRvYmogPSB7XG5cdFx0XHRkYXRhOiB0aGlzLmZpbmQoKVxuXHRcdH07XG5cdH1cblxuXHRmb3IgKGJpbmRLZXkgaW4gYmluZHMpIHtcblx0XHRpZiAoYmluZHMuaGFzT3duUHJvcGVydHkoYmluZEtleSkpIHtcblx0XHRcdGJpbmQgPSBiaW5kc1tiaW5kS2V5XTtcblxuXHRcdFx0aWYgKHRoaXMuZGVidWcoKSkgeyBjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXcuQmluZDogU29ydGluZyBET00uLi4nKTsgfVxuXHRcdFx0dGhpcy5iaW5kU29ydERvbShiaW5kS2V5LCBvYmouZGF0YSk7XG5cblx0XHRcdGlmIChiaW5kLmFmdGVyT3BlcmF0aW9uKSB7XG5cdFx0XHRcdGJpbmQuYWZ0ZXJPcGVyYXRpb24oKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGJpbmQucmVmcmVzaCkge1xuXHRcdFx0XHRiaW5kLnJlZnJlc2goKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbi8qKlxuICogUmVuZGVycyBhIGJpbmQgdmlldyBkYXRhIHRvIHRoZSBET00uXG4gKiBAcGFyYW0ge1N0cmluZ30gYmluZFNlbGVjdG9yIFRoZSBqUXVlcnkgc2VsZWN0b3Igc3RyaW5nIHRvIHVzZSB0byBpZGVudGlmeVxuICogdGhlIGJpbmQgdGFyZ2V0LiBNdXN0IG1hdGNoIHRoZSBzZWxlY3RvciB1c2VkIHdoZW4gZGVmaW5pbmcgdGhlIG9yaWdpbmFsIGJpbmQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9uPX0gZG9tSGFuZGxlciBJZiBzcGVjaWZpZWQsIHRoaXMgaGFuZGxlciBtZXRob2Qgd2lsbCBiZSBjYWxsZWRcbiAqIHdpdGggdGhlIGZpbmFsIEhUTUwgZm9yIHRoZSB2aWV3IGluc3RlYWQgb2YgdGhlIERCIGhhbmRsaW5nIHRoZSBET00gaW5zZXJ0aW9uLlxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5iaW5kUmVuZGVyID0gZnVuY3Rpb24gKGJpbmRTZWxlY3RvciwgZG9tSGFuZGxlcikge1xuXHQvLyBDaGVjayB0aGUgYmluZCBleGlzdHNcblx0dmFyIGJpbmQgPSB0aGlzLl9iaW5kc1tiaW5kU2VsZWN0b3JdLFxuXHRcdGRvbVRhcmdldCA9ICQoYmluZFNlbGVjdG9yKSxcblx0XHRhbGxEYXRhLFxuXHRcdGRhdGFJdGVtLFxuXHRcdGl0ZW1IdG1sLFxuXHRcdGZpbmFsSHRtbCA9ICQoJzx1bD48L3VsPicpLFxuXHRcdGk7XG5cblx0aWYgKGJpbmQpIHtcblx0XHRhbGxEYXRhID0gdGhpcy5fZGF0YS5maW5kKCk7XG5cblx0XHQvLyBMb29wIGFsbCBpdGVtcyBhbmQgYWRkIHRoZW0gdG8gdGhlIHNjcmVlblxuXHRcdGZvciAoaSA9IDA7IGkgPCBhbGxEYXRhLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRkYXRhSXRlbSA9IGFsbERhdGFbaV07XG5cblx0XHRcdGl0ZW1IdG1sID0gYmluZC50ZW1wbGF0ZShkYXRhSXRlbSwgZnVuY3Rpb24gKGl0ZW1IdG1sKSB7XG5cdFx0XHRcdGZpbmFsSHRtbC5hcHBlbmQoaXRlbUh0bWwpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFkb21IYW5kbGVyKSB7XG5cdFx0XHRkb21UYXJnZXQuYXBwZW5kKGZpbmFsSHRtbC5odG1sKCkpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkb21IYW5kbGVyKGJpbmRTZWxlY3RvciwgZmluYWxIdG1sLmh0bWwoKSk7XG5cdFx0fVxuXHR9XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5wcm9jZXNzUXVldWUgPSBmdW5jdGlvbiAodHlwZSwgY2FsbGJhY2spIHtcblx0dmFyIHF1ZXVlID0gdGhpcy5fZGVmZXJRdWV1ZVt0eXBlXSxcblx0XHRkZWZlclRocmVzaG9sZCA9IHRoaXMuX2RlZmVyVGhyZXNob2xkW3R5cGVdLFxuXHRcdGRlZmVyVGltZSA9IHRoaXMuX2RlZmVyVGltZVt0eXBlXTtcblxuXHRpZiAocXVldWUubGVuZ3RoKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0ZGF0YUFycjtcblxuXHRcdC8vIFByb2Nlc3MgaXRlbXMgdXAgdG8gdGhlIHRocmVzaG9sZFxuXHRcdGlmIChxdWV1ZS5sZW5ndGgpIHtcblx0XHRcdGlmIChxdWV1ZS5sZW5ndGggPiBkZWZlclRocmVzaG9sZCkge1xuXHRcdFx0XHQvLyBHcmFiIGl0ZW1zIHVwIHRvIHRoZSB0aHJlc2hvbGQgdmFsdWVcblx0XHRcdFx0ZGF0YUFyciA9IHF1ZXVlLnNwbGljZSgwLCBkZWZlclRocmVzaG9sZCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBHcmFiIGFsbCB0aGUgcmVtYWluaW5nIGl0ZW1zXG5cdFx0XHRcdGRhdGFBcnIgPSBxdWV1ZS5zcGxpY2UoMCwgcXVldWUubGVuZ3RoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fYmluZEV2ZW50KHR5cGUsIGRhdGFBcnIsIFtdKTtcblx0XHR9XG5cblx0XHQvLyBRdWV1ZSBhbm90aGVyIHByb2Nlc3Ncblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcblx0XHRcdHNlbGYucHJvY2Vzc1F1ZXVlKHR5cGUsIGNhbGxiYWNrKTtcblx0XHR9LCBkZWZlclRpbWUpO1xuXHR9IGVsc2Uge1xuXHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygpOyB9XG5cdFx0dGhpcy5lbWl0KCdiaW5kUXVldWVDb21wbGV0ZScpO1xuXHR9XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5fYmluZEV2ZW50ID0gZnVuY3Rpb24gKHR5cGUsIHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0dmFyIHF1ZXVlID0gdGhpcy5fZGVmZXJRdWV1ZVt0eXBlXSxcblx0XHRkZWZlclRocmVzaG9sZCA9IHRoaXMuX2RlZmVyVGhyZXNob2xkW3R5cGVdLFxuXHRcdGRlZmVyVGltZSA9IHRoaXMuX2RlZmVyVGltZVt0eXBlXTtcblxuXHR2YXIgYmluZHMgPSB0aGlzLl9iaW5kcyxcblx0XHR1bmZpbHRlcmVkRGF0YVNldCA9IHRoaXMuZmluZCh7fSksXG5cdFx0ZmlsdGVyZWREYXRhU2V0LFxuXHRcdGJpbmRLZXk7XG5cblx0Ly8gQ2hlY2sgaWYgdGhlIG51bWJlciBvZiBpbnNlcnRzIGlzIGdyZWF0ZXIgdGhhbiB0aGUgZGVmZXIgdGhyZXNob2xkXG5cdC8qaWYgKHN1Y2Nlc3NBcnIgJiYgc3VjY2Vzc0Fyci5sZW5ndGggPiBkZWZlclRocmVzaG9sZCkge1xuXHQgLy8gQnJlYWsgdXAgdXBzZXJ0IGludG8gYmxvY2tzXG5cdCB0aGlzLl9kZWZlclF1ZXVlW3R5cGVdID0gcXVldWUuY29uY2F0KHN1Y2Nlc3NBcnIpO1xuXG5cdCAvLyBGaXJlIG9mZiB0aGUgaW5zZXJ0IHF1ZXVlIGhhbmRsZXJcblx0IHRoaXMucHJvY2Vzc1F1ZXVlKHR5cGUpO1xuXG5cdCByZXR1cm47XG5cdCB9IGVsc2UgeyovXG5cdGZvciAoYmluZEtleSBpbiBiaW5kcykge1xuXHRcdGlmIChiaW5kcy5oYXNPd25Qcm9wZXJ0eShiaW5kS2V5KSkge1xuXHRcdFx0aWYgKGJpbmRzW2JpbmRLZXldLnJlZHVjZSkge1xuXHRcdFx0XHRmaWx0ZXJlZERhdGFTZXQgPSB0aGlzLmZpbmQoYmluZHNbYmluZEtleV0ucmVkdWNlLnF1ZXJ5LCBiaW5kc1tiaW5kS2V5XS5yZWR1Y2Uub3B0aW9ucyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmaWx0ZXJlZERhdGFTZXQgPSB1bmZpbHRlcmVkRGF0YVNldDtcblx0XHRcdH1cblxuXHRcdFx0c3dpdGNoICh0eXBlKSB7XG5cdFx0XHRcdGNhc2UgJ2luc2VydCc6XG5cdFx0XHRcdFx0dGhpcy5fYmluZEluc2VydChiaW5kS2V5LCBiaW5kc1tiaW5kS2V5XSwgc3VjY2Vzc0FyciwgZmFpbEFyciwgZmlsdGVyZWREYXRhU2V0KTtcblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRjYXNlICd1cGRhdGUnOlxuXHRcdFx0XHRcdHRoaXMuX2JpbmRVcGRhdGUoYmluZEtleSwgYmluZHNbYmluZEtleV0sIHN1Y2Nlc3NBcnIsIGZhaWxBcnIsIGZpbHRlcmVkRGF0YVNldCk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0Y2FzZSAncmVtb3ZlJzpcblx0XHRcdFx0XHR0aGlzLl9iaW5kUmVtb3ZlKGJpbmRLZXksIGJpbmRzW2JpbmRLZXldLCBzdWNjZXNzQXJyLCBmYWlsQXJyLCBmaWx0ZXJlZERhdGFTZXQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHQvL31cbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9iaW5kQ2hhbmdlID0gZnVuY3Rpb24gKG5ld0RhdGFBcnIpIHtcblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldy5CaW5kOiBCaW5kIGRhdGEgY2hhbmdlLCByZWZyZXNoaW5nIGJpbmQuLi4nLCBuZXdEYXRhQXJyKTtcblx0fVxuXG5cdHRoaXMuYmluZFJlZnJlc2gobmV3RGF0YUFycik7XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5fYmluZEluc2VydCA9IGZ1bmN0aW9uIChzZWxlY3Rvciwgb3B0aW9ucywgc3VjY2Vzc0FyciwgZmFpbEFyciwgYWxsKSB7XG5cdHZhciBjb250YWluZXIgPSAkKHNlbGVjdG9yKSxcblx0XHRpdGVtRWxlbSxcblx0XHRpdGVtSHRtbCxcblx0XHRpO1xuXG5cdC8vIExvb3AgdGhlIGluc2VydGVkIGl0ZW1zXG5cdGZvciAoaSA9IDA7IGkgPCBzdWNjZXNzQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0Ly8gQ2hlY2sgZm9yIGV4aXN0aW5nIGl0ZW0gaW4gdGhlIGNvbnRhaW5lclxuXHRcdGl0ZW1FbGVtID0gY29udGFpbmVyLmZpbmQoJyMnICsgc3VjY2Vzc0FycltpXVt0aGlzLl9wcmltYXJ5S2V5XSk7XG5cblx0XHRpZiAoIWl0ZW1FbGVtLmxlbmd0aCkge1xuXHRcdFx0aXRlbUh0bWwgPSBvcHRpb25zLnRlbXBsYXRlKHN1Y2Nlc3NBcnJbaV0sIGZ1bmN0aW9uIChpdGVtRWxlbSwgaW5zZXJ0ZWRJdGVtLCBmYWlsQXJyLCBhbGwpIHsgcmV0dXJuIGZ1bmN0aW9uIChpdGVtSHRtbCkge1xuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGVyZSBpcyBjdXN0b20gRE9NIGluc2VydCBtZXRob2Rcblx0XHRcdFx0aWYgKG9wdGlvbnMuaW5zZXJ0KSB7XG5cdFx0XHRcdFx0b3B0aW9ucy5pbnNlcnQoaXRlbUh0bWwsIGluc2VydGVkSXRlbSwgZmFpbEFyciwgYWxsKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBIYW5kbGUgdGhlIGluc2VydCBhdXRvbWF0aWNhbGx5XG5cdFx0XHRcdFx0Ly8gQWRkIHRoZSBpdGVtIHRvIHRoZSBjb250YWluZXJcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5wcmVwZW5kSW5zZXJ0KSB7XG5cdFx0XHRcdFx0XHRjb250YWluZXIucHJlcGVuZChpdGVtSHRtbCk7XG5cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29udGFpbmVyLmFwcGVuZChpdGVtSHRtbCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKG9wdGlvbnMuYWZ0ZXJJbnNlcnQpIHtcblx0XHRcdFx0XHRvcHRpb25zLmFmdGVySW5zZXJ0KGl0ZW1IdG1sLCBpbnNlcnRlZEl0ZW0sIGZhaWxBcnIsIGFsbCk7XG5cdFx0XHRcdH1cblx0XHRcdH19KGl0ZW1FbGVtLCBzdWNjZXNzQXJyW2ldLCBmYWlsQXJyLCBhbGwpKTtcblx0XHR9XG5cdH1cbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9iaW5kVXBkYXRlID0gZnVuY3Rpb24gKHNlbGVjdG9yLCBvcHRpb25zLCBzdWNjZXNzQXJyLCBmYWlsQXJyLCBhbGwpIHtcblx0dmFyIGNvbnRhaW5lciA9ICQoc2VsZWN0b3IpLFxuXHRcdGl0ZW1FbGVtLFxuXHRcdGk7XG5cblx0Ly8gTG9vcCB0aGUgdXBkYXRlZCBpdGVtc1xuXHRmb3IgKGkgPSAwOyBpIDwgc3VjY2Vzc0Fyci5sZW5ndGg7IGkrKykge1xuXHRcdC8vIENoZWNrIGZvciBleGlzdGluZyBpdGVtIGluIHRoZSBjb250YWluZXJcblx0XHRpdGVtRWxlbSA9IGNvbnRhaW5lci5maW5kKCcjJyArIHN1Y2Nlc3NBcnJbaV1bdGhpcy5fcHJpbWFyeUtleV0pO1xuXG5cdFx0b3B0aW9ucy50ZW1wbGF0ZShzdWNjZXNzQXJyW2ldLCBmdW5jdGlvbiAoaXRlbUVsZW0sIGl0ZW1EYXRhKSB7IHJldHVybiBmdW5jdGlvbiAoaXRlbUh0bWwpIHtcblx0XHRcdC8vIENoZWNrIGlmIHRoZXJlIGlzIGN1c3RvbSBET00gaW5zZXJ0IG1ldGhvZFxuXHRcdFx0aWYgKG9wdGlvbnMudXBkYXRlKSB7XG5cdFx0XHRcdG9wdGlvbnMudXBkYXRlKGl0ZW1IdG1sLCBpdGVtRGF0YSwgYWxsLCBpdGVtRWxlbS5sZW5ndGggPyAndXBkYXRlJyA6ICdhcHBlbmQnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChpdGVtRWxlbS5sZW5ndGgpIHtcblx0XHRcdFx0XHQvLyBBbiBleGlzdGluZyBpdGVtIGlzIGluIHRoZSBjb250YWluZXIsIHJlcGxhY2UgaXQgd2l0aCB0aGVcblx0XHRcdFx0XHQvLyBuZXcgcmVuZGVyZWQgaXRlbSBmcm9tIHRoZSB1cGRhdGVkIGRhdGFcblx0XHRcdFx0XHRpdGVtRWxlbS5yZXBsYWNlV2l0aChpdGVtSHRtbCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gVGhlIGl0ZW0gZWxlbWVudCBkb2VzIG5vdCBhbHJlYWR5IGV4aXN0LCBhcHBlbmQgaXRcblx0XHRcdFx0XHRpZiAob3B0aW9ucy5wcmVwZW5kVXBkYXRlKSB7XG5cdFx0XHRcdFx0XHRjb250YWluZXIucHJlcGVuZChpdGVtSHRtbCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnRhaW5lci5hcHBlbmQoaXRlbUh0bWwpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAob3B0aW9ucy5hZnRlclVwZGF0ZSkge1xuXHRcdFx0XHRvcHRpb25zLmFmdGVyVXBkYXRlKGl0ZW1IdG1sLCBpdGVtRGF0YSwgYWxsKTtcblx0XHRcdH1cblx0XHR9fShpdGVtRWxlbSwgc3VjY2Vzc0FycltpXSkpO1xuXHR9XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5fYmluZFJlbW92ZSA9IGZ1bmN0aW9uIChzZWxlY3Rvciwgb3B0aW9ucywgc3VjY2Vzc0FyciwgZmFpbEFyciwgYWxsKSB7XG5cdHZhciBjb250YWluZXIgPSAkKHNlbGVjdG9yKSxcblx0XHRpdGVtRWxlbSxcblx0XHRpO1xuXG5cdC8vIExvb3AgdGhlIHJlbW92ZWQgaXRlbXNcblx0Zm9yIChpID0gMDsgaSA8IHN1Y2Nlc3NBcnIubGVuZ3RoOyBpKyspIHtcblx0XHQvLyBDaGVjayBmb3IgZXhpc3RpbmcgaXRlbSBpbiB0aGUgY29udGFpbmVyXG5cdFx0aXRlbUVsZW0gPSBjb250YWluZXIuZmluZCgnIycgKyBzdWNjZXNzQXJyW2ldW3RoaXMuX3ByaW1hcnlLZXldKTtcblxuXHRcdGlmIChpdGVtRWxlbS5sZW5ndGgpIHtcblx0XHRcdGlmIChvcHRpb25zLmJlZm9yZVJlbW92ZSkge1xuXHRcdFx0XHRvcHRpb25zLmJlZm9yZVJlbW92ZShpdGVtRWxlbSwgc3VjY2Vzc0FycltpXSwgYWxsLCBmdW5jdGlvbiAoaXRlbUVsZW0sIGRhdGEsIGFsbCkgeyByZXR1cm4gZnVuY3Rpb24gKCkge1xuXHRcdFx0XHRcdGlmIChvcHRpb25zLnJlbW92ZSkge1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5yZW1vdmUoaXRlbUVsZW0sIGRhdGEsIGFsbCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGl0ZW1FbGVtLnJlbW92ZSgpO1xuXG5cdFx0XHRcdFx0XHRpZiAob3B0aW9ucy5hZnRlclJlbW92ZSkge1xuXHRcdFx0XHRcdFx0XHRvcHRpb25zLmFmdGVyUmVtb3ZlKGl0ZW1FbGVtLCBkYXRhLCBhbGwpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fX0oaXRlbUVsZW0sIHN1Y2Nlc3NBcnJbaV0sIGFsbCkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKG9wdGlvbnMucmVtb3ZlKSB7XG5cdFx0XHRcdFx0b3B0aW9ucy5yZW1vdmUoaXRlbUVsZW0sIHN1Y2Nlc3NBcnJbaV0sIGFsbCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aXRlbUVsZW0ucmVtb3ZlKCk7XG5cblx0XHRcdFx0XHRpZiAob3B0aW9ucy5hZnRlclJlbW92ZSkge1xuXHRcdFx0XHRcdFx0b3B0aW9ucy5hZnRlclJlbW92ZShpdGVtRWxlbSwgc3VjY2Vzc0FycltpXSwgYWxsKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn07IiwiLy8gSW1wb3J0IGV4dGVybmFsIG5hbWVzIGxvY2FsbHlcbnZhciBTaGFyZWQsXG5cdENvcmUsXG5cdENvbGxlY3Rpb25Hcm91cCxcblx0Q29sbGVjdGlvbixcblx0Q29sbGVjdGlvbkluaXQsXG5cdENvbGxlY3Rpb25Hcm91cEluaXQsXG5cdENvcmVJbml0LFxuXHRPdmVybG9hZDtcblxuU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKTtcblxuLyoqXG4gKiBUaGUgdmlldyBjb25zdHJ1Y3Rvci5cbiAqIEBwYXJhbSB2aWV3TmFtZVxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBPbGRWaWV3ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAodmlld05hbWUpIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdHRoaXMuX25hbWUgPSB2aWV3TmFtZTtcblx0dGhpcy5fZ3JvdXBzID0gW107XG5cdHRoaXMuX2xpc3RlbmVycyA9IHt9O1xuXHR0aGlzLl9xdWVyeSA9IHtcblx0XHRxdWVyeToge30sXG5cdFx0b3B0aW9uczoge31cblx0fTtcblxuXHQvLyBSZWdpc3RlciBsaXN0ZW5lcnMgZm9yIHRoZSBDUlVEIGV2ZW50c1xuXHR0aGlzLl9vbkZyb21TZXREYXRhID0gZnVuY3Rpb24gKCkge1xuXHRcdHNlbGYuX29uU2V0RGF0YS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHRoaXMuX29uRnJvbUluc2VydCA9IGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9vbkluc2VydC5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHRoaXMuX29uRnJvbVVwZGF0ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9vblVwZGF0ZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHRoaXMuX29uRnJvbVJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRzZWxmLl9vblJlbW92ZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xuXG5cdHRoaXMuX29uRnJvbUNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoc2VsZi5kZWJ1ZygpKSB7IGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogUmVjZWl2ZWQgY2hhbmdlJyk7IH1cblx0XHRzZWxmLl9vbkNoYW5nZS5hcHBseShzZWxmLCBhcmd1bWVudHMpO1xuXHR9O1xufTtcblxuU2hhcmVkLm1vZHVsZXMuT2xkVmlldyA9IE9sZFZpZXc7XG5cbkNvbGxlY3Rpb25Hcm91cCA9IHJlcXVpcmUoJy4vQ29sbGVjdGlvbkdyb3VwJyk7XG5Db2xsZWN0aW9uID0gcmVxdWlyZSgnLi9Db2xsZWN0aW9uJyk7XG5Db2xsZWN0aW9uSW5pdCA9IENvbGxlY3Rpb24ucHJvdG90eXBlLmluaXQ7XG5Db2xsZWN0aW9uR3JvdXBJbml0ID0gQ29sbGVjdGlvbkdyb3VwLnByb3RvdHlwZS5pbml0O1xuT3ZlcmxvYWQgPSByZXF1aXJlKCcuL092ZXJsb2FkJyk7XG5Db3JlID0gU2hhcmVkLm1vZHVsZXMuQ29yZTtcbkNvcmVJbml0ID0gQ29yZS5wcm90b3R5cGUuaW5pdDtcblxuT2xkVmlldy5wcm90b3R5cGUub24gPSBuZXcgT3ZlcmxvYWQoW1xuXHRmdW5jdGlvbihldmVudCwgbGlzdGVuZXIpIHtcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwge307XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF0gfHwge307XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVsnKiddIHx8IFtdO1xuXHRcdHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXS5wdXNoKGxpc3RlbmVyKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGZ1bmN0aW9uKGV2ZW50LCBpZCwgbGlzdGVuZXIpIHtcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwge307XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF0gfHwge307XG5cdFx0dGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtpZF0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2lkXSB8fCBbXTtcblx0XHR0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2lkXS5wdXNoKGxpc3RlbmVyKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5dKTtcblxuT2xkVmlldy5wcm90b3R5cGUub2ZmID0gbmV3IE92ZXJsb2FkKFtcblx0ZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMuX2xpc3RlbmVycyAmJiB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdICYmIGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdFx0ZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1tldmVudF07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0ZnVuY3Rpb24oZXZlbnQsIGxpc3RlbmVyKSB7XG5cdFx0dmFyIGFycixcblx0XHRcdGluZGV4O1xuXG5cdFx0aWYgKHR5cGVvZihsaXN0ZW5lcikgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRpZiAodGhpcy5fbGlzdGVuZXJzICYmIHRoaXMuX2xpc3RlbmVyc1tldmVudF0gJiYgdGhpcy5fbGlzdGVuZXJzW2V2ZW50XVtsaXN0ZW5lcl0pIHtcblx0XHRcdFx0ZGVsZXRlIHRoaXMuX2xpc3RlbmVyc1tldmVudF1bbGlzdGVuZXJdO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoZXZlbnQgaW4gdGhpcy5fbGlzdGVuZXJzKSB7XG5cdFx0XHRcdGFyciA9IHRoaXMuX2xpc3RlbmVyc1tldmVudF1bJyonXTtcblx0XHRcdFx0aW5kZXggPSBhcnIuaW5kZXhPZihsaXN0ZW5lcik7XG5cblx0XHRcdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdFx0XHRhcnIuc3BsaWNlKGluZGV4LCAxKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdGZ1bmN0aW9uIChldmVudCwgaWQsIGxpc3RlbmVyKSB7XG5cdFx0aWYgKHRoaXMuX2xpc3RlbmVycyAmJiBldmVudCBpbiB0aGlzLl9saXN0ZW5lcnMpIHtcblx0XHRcdHZhciBhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdW2lkXSxcblx0XHRcdFx0aW5kZXggPSBhcnIuaW5kZXhPZihsaXN0ZW5lcik7XG5cblx0XHRcdGlmIChpbmRleCA+IC0xKSB7XG5cdFx0XHRcdGFyci5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXSk7XG5cbk9sZFZpZXcucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCwgZGF0YSkge1xuXHR0aGlzLl9saXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwge307XG5cblx0aWYgKGV2ZW50IGluIHRoaXMuX2xpc3RlbmVycykge1xuXHRcdC8vIEhhbmRsZSBnbG9iYWwgZW1pdFxuXHRcdGlmICh0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10pIHtcblx0XHRcdHZhciBhcnIgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnRdWycqJ10sXG5cdFx0XHRcdGFyckNvdW50ID0gYXJyLmxlbmd0aCxcblx0XHRcdFx0YXJySW5kZXg7XG5cblx0XHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGFyckNvdW50OyBhcnJJbmRleCsrKSB7XG5cdFx0XHRcdGFyclthcnJJbmRleF0uYXBwbHkodGhpcywgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gSGFuZGxlIGluZGl2aWR1YWwgZW1pdFxuXHRcdGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXkpIHtcblx0XHRcdC8vIENoZWNrIGlmIHRoZSBhcnJheSBpcyBhbiBhcnJheSBvZiBvYmplY3RzIGluIHRoZSBjb2xsZWN0aW9uXG5cdFx0XHRpZiAoZGF0YVswXSAmJiBkYXRhWzBdW3RoaXMuX3ByaW1hcnlLZXldKSB7XG5cdFx0XHRcdC8vIExvb3AgdGhlIGFycmF5IGFuZCBjaGVjayBmb3IgbGlzdGVuZXJzIGFnYWluc3QgdGhlIHByaW1hcnkga2V5XG5cdFx0XHRcdHZhciBsaXN0ZW5lcklkQXJyID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50XSxcblx0XHRcdFx0XHRsaXN0ZW5lcklkQ291bnQsXG5cdFx0XHRcdFx0bGlzdGVuZXJJZEluZGV4LFxuXHRcdFx0XHRcdGFyckNvdW50ID0gZGF0YS5sZW5ndGgsXG5cdFx0XHRcdFx0YXJySW5kZXg7XG5cblx0XHRcdFx0Zm9yIChhcnJJbmRleCA9IDA7IGFyckluZGV4IDwgYXJyQ291bnQ7IGFyckluZGV4KyspIHtcblx0XHRcdFx0XHRpZiAobGlzdGVuZXJJZEFycltkYXRhW2FyckluZGV4XVt0aGlzLl9wcmltYXJ5S2V5XV0pIHtcblx0XHRcdFx0XHRcdC8vIEVtaXQgZm9yIHRoaXMgaWRcblx0XHRcdFx0XHRcdGxpc3RlbmVySWRDb3VudCA9IGxpc3RlbmVySWRBcnJbZGF0YVthcnJJbmRleF1bdGhpcy5fcHJpbWFyeUtleV1dLmxlbmd0aDtcblx0XHRcdFx0XHRcdGZvciAobGlzdGVuZXJJZEluZGV4ID0gMDsgbGlzdGVuZXJJZEluZGV4IDwgbGlzdGVuZXJJZENvdW50OyBsaXN0ZW5lcklkSW5kZXgrKykge1xuXHRcdFx0XHRcdFx0XHRsaXN0ZW5lcklkQXJyW2RhdGFbYXJySW5kZXhdW3RoaXMuX3ByaW1hcnlLZXldXVtsaXN0ZW5lcklkSW5kZXhdLmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEcm9wcyBhIHZpZXcgYW5kIGFsbCBpdCdzIHN0b3JlZCBkYXRhIGZyb20gdGhlIGRhdGFiYXNlLlxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgb24gc3VjY2VzcywgZmFsc2Ugb24gZmFpbHVyZS5cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUuZHJvcCA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKCh0aGlzLl9kYiB8fCB0aGlzLl9mcm9tKSAmJiB0aGlzLl9uYW1lKSB7XG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBEcm9wcGluZyB2aWV3ICcgKyB0aGlzLl9uYW1lKTtcblx0XHR9XG5cblx0XHR0aGlzLmVtaXQoJ2Ryb3AnKTtcblxuXHRcdGlmICh0aGlzLl9kYikge1xuXHRcdFx0ZGVsZXRlIHRoaXMuX2RiLl9vbGRWaWV3c1t0aGlzLl9uYW1lXTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5fZnJvbSkge1xuXHRcdFx0ZGVsZXRlIHRoaXMuX2Zyb20uX29sZFZpZXdzW3RoaXMuX25hbWVdO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufTtcblxuT2xkVmlldy5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbiAoKSB7XG5cdC8vIFRPRE86IE1ha2UgdGhpcyBmdW5jdGlvbiB3b3JrXG5cdHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIERCIHRoZSB2aWV3IGlzIGJvdW5kIGFnYWluc3QuIEF1dG9tYXRpY2FsbHkgc2V0XG4gKiB3aGVuIHRoZSBkYi5vbGRWaWV3KHZpZXdOYW1lKSBtZXRob2QgaXMgY2FsbGVkLlxuICogQHBhcmFtIGRiXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUuZGIgPSBmdW5jdGlvbiAoZGIpIHtcblx0aWYgKGRiICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9kYiA9IGRiO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2RiO1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgY29sbGVjdGlvbiB0aGF0IHRoZSB2aWV3IGRlcml2ZXMgaXQncyBkYXRhIGZyb20uXG4gKiBAcGFyYW0geyp9IGNvbGxlY3Rpb24gQSBjb2xsZWN0aW9uIGluc3RhbmNlIG9yIHRoZSBuYW1lIG9mIGEgY29sbGVjdGlvblxuICogdG8gdXNlIGFzIHRoZSBkYXRhIHNldCB0byBkZXJpdmUgdmlldyBkYXRhIGZyb20uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUuZnJvbSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uKSB7XG5cdGlmIChjb2xsZWN0aW9uICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgY29sbGVjdGlvbiBuYW1lIG9yIGEgY29sbGVjdGlvbiBpbnN0YW5jZVxuXHRcdGlmICh0eXBlb2YoY29sbGVjdGlvbikgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRpZiAodGhpcy5fZGIuY29sbGVjdGlvbkV4aXN0cyhjb2xsZWN0aW9uKSkge1xuXHRcdFx0XHRjb2xsZWN0aW9uID0gdGhpcy5fZGIuY29sbGVjdGlvbihjb2xsZWN0aW9uKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93KCdJbnZhbGlkIGNvbGxlY3Rpb24gaW4gdmlldy5mcm9tKCkgY2FsbC4nKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBDaGVjayBpZiB0aGUgZXhpc3RpbmcgZnJvbSBtYXRjaGVzIHRoZSBwYXNzZWQgb25lXG5cdFx0aWYgKHRoaXMuX2Zyb20gIT09IGNvbGxlY3Rpb24pIHtcblx0XHRcdC8vIENoZWNrIGlmIHdlIGFscmVhZHkgaGF2ZSBhIGNvbGxlY3Rpb24gYXNzaWduZWRcblx0XHRcdGlmICh0aGlzLl9mcm9tKSB7XG5cdFx0XHRcdC8vIFJlbW92ZSBvdXJzZWx2ZXMgZnJvbSB0aGUgY29sbGVjdGlvbiB2aWV3IGxvb2t1cFxuXHRcdFx0XHR0aGlzLnJlbW92ZUZyb20oKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5hZGRGcm9tKGNvbGxlY3Rpb24pO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX2Zyb207XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5hZGRGcm9tID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcblx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdHRoaXMuX2Zyb20gPSBjb2xsZWN0aW9uO1xuXG5cdGlmICh0aGlzLl9mcm9tKSB7XG5cdFx0dGhpcy5fZnJvbS5vbignc2V0RGF0YScsIHRoaXMuX29uRnJvbVNldERhdGEpO1xuXHRcdC8vdGhpcy5fZnJvbS5vbignaW5zZXJ0JywgdGhpcy5fb25Gcm9tSW5zZXJ0KTtcblx0XHQvL3RoaXMuX2Zyb20ub24oJ3VwZGF0ZScsIHRoaXMuX29uRnJvbVVwZGF0ZSk7XG5cdFx0Ly90aGlzLl9mcm9tLm9uKCdyZW1vdmUnLCB0aGlzLl9vbkZyb21SZW1vdmUpO1xuXHRcdHRoaXMuX2Zyb20ub24oJ2NoYW5nZScsIHRoaXMuX29uRnJvbUNoYW5nZSk7XG5cblx0XHQvLyBBZGQgdGhpcyB2aWV3IHRvIHRoZSBjb2xsZWN0aW9uJ3MgdmlldyBsb29rdXBcblx0XHR0aGlzLl9mcm9tLl9hZGRPbGRWaWV3KHRoaXMpO1xuXHRcdHRoaXMuX3ByaW1hcnlLZXkgPSB0aGlzLl9mcm9tLl9wcmltYXJ5S2V5O1xuXG5cdFx0dGhpcy5yZWZyZXNoKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0gZWxzZSB7XG5cdFx0dGhyb3coJ0Nhbm5vdCBkZXRlcm1pbmUgY29sbGVjdGlvbiB0eXBlIGluIHZpZXcuZnJvbSgpJyk7XG5cdH1cbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLnJlbW92ZUZyb20gPSBmdW5jdGlvbiAoKSB7XG5cdC8vIFVuc3Vic2NyaWJlIGZyb20gZXZlbnRzIG9uIHRoaXMgXCJmcm9tXCJcblx0dGhpcy5fZnJvbS5vZmYoJ3NldERhdGEnLCB0aGlzLl9vbkZyb21TZXREYXRhKTtcblx0Ly90aGlzLl9mcm9tLm9mZignaW5zZXJ0JywgdGhpcy5fb25Gcm9tSW5zZXJ0KTtcblx0Ly90aGlzLl9mcm9tLm9mZigndXBkYXRlJywgdGhpcy5fb25Gcm9tVXBkYXRlKTtcblx0Ly90aGlzLl9mcm9tLm9mZigncmVtb3ZlJywgdGhpcy5fb25Gcm9tUmVtb3ZlKTtcblx0dGhpcy5fZnJvbS5vZmYoJ2NoYW5nZScsIHRoaXMuX29uRnJvbUNoYW5nZSk7XG5cblx0dGhpcy5fZnJvbS5fcmVtb3ZlT2xkVmlldyh0aGlzKTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgcHJpbWFyeSBrZXkgZm9yIHRoaXMgdmlldyBmcm9tIHRoZSBhc3NpZ25lZCBjb2xsZWN0aW9uLlxuICogQHJldHVybnMge1N0cmluZ31cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUucHJpbWFyeUtleSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuX2Zyb20pIHtcblx0XHRyZXR1cm4gdGhpcy5fZnJvbS5wcmltYXJ5S2V5KCk7XG5cdH1cblxuXHRyZXR1cm4gdW5kZWZpbmVkO1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgcXVlcnkgdGhhdCB0aGUgdmlldyB1c2VzIHRvIGJ1aWxkIGl0J3MgZGF0YSBzZXQuXG4gKiBAcGFyYW0ge09iamVjdD19IHF1ZXJ5XG4gKiBAcGFyYW0ge0Jvb2xlYW49fSBvcHRpb25zIEFuIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBhZnRlclxuICogdGhpcyBvcGVyYXRpb24uIERlZmF1bHRzIHRvIHRydWUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUucXVlcnlEYXRhID0gZnVuY3Rpb24gKHF1ZXJ5LCBvcHRpb25zLCByZWZyZXNoKSB7XG5cdGlmIChxdWVyeSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcXVlcnkucXVlcnkgPSBxdWVyeTtcblx0fVxuXG5cdGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9xdWVyeS5vcHRpb25zID0gb3B0aW9ucztcblx0fVxuXG5cdGlmIChxdWVyeSAhPT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmIChyZWZyZXNoID09PSB1bmRlZmluZWQgfHwgcmVmcmVzaCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5yZWZyZXNoKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcXVlcnk7XG59O1xuXG4vKipcbiAqIEFkZCBkYXRhIHRvIHRoZSBleGlzdGluZyBxdWVyeS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIGRhdGEgd2hvc2Uga2V5cyB3aWxsIGJlIGFkZGVkIHRvIHRoZSBleGlzdGluZ1xuICogcXVlcnkgb2JqZWN0LlxuICogQHBhcmFtIHtCb29sZWFufSBvdmVyd3JpdGUgV2hldGhlciBvciBub3QgdG8gb3ZlcndyaXRlIGRhdGEgdGhhdCBhbHJlYWR5XG4gKiBleGlzdHMgaW4gdGhlIHF1ZXJ5IG9iamVjdC4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAqIEBwYXJhbSB7Qm9vbGVhbj19IHJlZnJlc2ggV2hldGhlciBvciBub3QgdG8gcmVmcmVzaCB0aGUgdmlldyBkYXRhIHNldFxuICogb25jZSB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlLiBEZWZhdWx0cyB0byB0cnVlLlxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5xdWVyeUFkZCA9IGZ1bmN0aW9uIChvYmosIG92ZXJ3cml0ZSwgcmVmcmVzaCkge1xuXHR2YXIgcXVlcnkgPSB0aGlzLl9xdWVyeS5xdWVyeSxcblx0XHRpO1xuXG5cdGlmIChvYmogIT09IHVuZGVmaW5lZCkge1xuXHRcdC8vIExvb3Agb2JqZWN0IHByb3BlcnRpZXMgYW5kIGFkZCB0byBleGlzdGluZyBxdWVyeVxuXHRcdGZvciAoaSBpbiBvYmopIHtcblx0XHRcdGlmIChvYmouaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdFx0aWYgKHF1ZXJ5W2ldID09PSB1bmRlZmluZWQgfHwgKHF1ZXJ5W2ldICE9PSB1bmRlZmluZWQgJiYgb3ZlcndyaXRlKSkge1xuXHRcdFx0XHRcdHF1ZXJ5W2ldID0gb2JqW2ldO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0dGhpcy5yZWZyZXNoKCk7XG5cdH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGRhdGEgZnJvbSB0aGUgZXhpc3RpbmcgcXVlcnkuXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBkYXRhIHdob3NlIGtleXMgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIGV4aXN0aW5nXG4gKiBxdWVyeSBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW49fSByZWZyZXNoIFdoZXRoZXIgb3Igbm90IHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBzZXRcbiAqIG9uY2UgdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZS4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUucXVlcnlSZW1vdmUgPSBmdW5jdGlvbiAob2JqLCByZWZyZXNoKSB7XG5cdHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5LnF1ZXJ5LFxuXHRcdGk7XG5cblx0aWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gTG9vcCBvYmplY3QgcHJvcGVydGllcyBhbmQgYWRkIHRvIGV4aXN0aW5nIHF1ZXJ5XG5cdFx0Zm9yIChpIGluIG9iaikge1xuXHRcdFx0aWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0XHRkZWxldGUgcXVlcnlbaV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0dGhpcy5yZWZyZXNoKCk7XG5cdH1cbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIHF1ZXJ5IGJlaW5nIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHZpZXcgZGF0YS5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcnkgVGhlIHF1ZXJ5IHRvIHNldC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj19IHJlZnJlc2ggV2hldGhlciB0byByZWZyZXNoIHRoZSB2aWV3IGRhdGEgYWZ0ZXJcbiAqIHRoaXMgb3BlcmF0aW9uLiBEZWZhdWx0cyB0byB0cnVlLlxuICogQHJldHVybnMgeyp9XG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKHF1ZXJ5LCByZWZyZXNoKSB7XG5cdGlmIChxdWVyeSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcXVlcnkucXVlcnkgPSBxdWVyeTtcblxuXHRcdGlmIChyZWZyZXNoID09PSB1bmRlZmluZWQgfHwgcmVmcmVzaCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5yZWZyZXNoKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX3F1ZXJ5LnF1ZXJ5O1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgcXVlcnkgb3B0aW9ucyB1c2VkIHdoZW4gYXBwbHlpbmcgc29ydGluZyBldGMgdG8gdGhlXG4gKiB2aWV3IGRhdGEgc2V0LlxuICogQHBhcmFtIHtPYmplY3Q9fSBvcHRpb25zIEFuIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIHRvIHJlZnJlc2ggdGhlIHZpZXcgZGF0YSBhZnRlclxuICogdGhpcyBvcGVyYXRpb24uIERlZmF1bHRzIHRvIHRydWUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUucXVlcnlPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMsIHJlZnJlc2gpIHtcblx0aWYgKG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3F1ZXJ5Lm9wdGlvbnMgPSBvcHRpb25zO1xuXG5cdFx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcXVlcnkub3B0aW9ucztcbn07XG5cbi8qKlxuICogUmVmcmVzaGVzIHRoZSB2aWV3IGRhdGEgYW5kIGRpZmZzIGJldHdlZW4gcHJldmlvdXMgYW5kIG5ldyBkYXRhIHRvXG4gKiBkZXRlcm1pbmUgaWYgYW55IGV2ZW50cyBuZWVkIHRvIGJlIHRyaWdnZXJlZCBvciBET00gYmluZHMgdXBkYXRlZC5cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUucmVmcmVzaCA9IGZ1bmN0aW9uIChmb3JjZSkge1xuXHRpZiAodGhpcy5fZnJvbSkge1xuXHRcdC8vIFRha2UgYSBjb3B5IG9mIHRoZSBkYXRhIGJlZm9yZSB1cGRhdGluZyBpdCwgd2Ugd2lsbCB1c2UgdGhpcyB0b1xuXHRcdC8vIFwiZGlmZlwiIGJldHdlZW4gdGhlIG9sZCBhbmQgbmV3IGRhdGEgYW5kIGhhbmRsZSBET00gYmluZCB1cGRhdGVzXG5cdFx0dmFyIG9sZERhdGEgPSB0aGlzLl9kYXRhLFxuXHRcdFx0b2xkRGF0YUFycixcblx0XHRcdG9sZERhdGFJdGVtLFxuXHRcdFx0bmV3RGF0YSxcblx0XHRcdG5ld0RhdGFBcnIsXG5cdFx0XHRxdWVyeSxcblx0XHRcdHByaW1hcnlLZXksXG5cdFx0XHRkYXRhSXRlbSxcblx0XHRcdGluc2VydGVkID0gW10sXG5cdFx0XHR1cGRhdGVkID0gW10sXG5cdFx0XHRyZW1vdmVkID0gW10sXG5cdFx0XHRvcGVyYXRlZCA9IGZhbHNlLFxuXHRcdFx0aTtcblxuXHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogUmVmcmVzaGluZyB2aWV3ICcgKyB0aGlzLl9uYW1lKTtcblx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogRXhpc3RpbmcgZGF0YTogJyArICh0eXBlb2YodGhpcy5fZGF0YSkgIT09IFwidW5kZWZpbmVkXCIpKTtcblx0XHRcdGlmICh0eXBlb2YodGhpcy5fZGF0YSkgIT09IFwidW5kZWZpbmVkXCIpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBDdXJyZW50IGRhdGEgcm93czogJyArIHRoaXMuX2RhdGEuZmluZCgpLmxlbmd0aCk7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKE9sZFZpZXcucHJvdG90eXBlLnJlZnJlc2guY2FsbGVyKTtcblx0XHR9XG5cblx0XHQvLyBRdWVyeSB0aGUgY29sbGVjdGlvbiBhbmQgdXBkYXRlIHRoZSBkYXRhXG5cdFx0aWYgKHRoaXMuX3F1ZXJ5KSB7XG5cdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogVmlldyBoYXMgcXVlcnkgYW5kIG9wdGlvbnMsIGdldHRpbmcgc3Vic2V0Li4uJyk7XG5cdFx0XHR9XG5cdFx0XHQvLyBSdW4gcXVlcnkgYWdhaW5zdCBjb2xsZWN0aW9uXG5cdFx0XHQvL2NvbnNvbGUubG9nKCdyZWZyZXNoIHdpdGggcXVlcnkgYW5kIG9wdGlvbnMnLCB0aGlzLl9xdWVyeS5vcHRpb25zKTtcblx0XHRcdHRoaXMuX2RhdGEgPSB0aGlzLl9mcm9tLnN1YnNldCh0aGlzLl9xdWVyeS5xdWVyeSwgdGhpcy5fcXVlcnkub3B0aW9ucyk7XG5cdFx0XHQvL2NvbnNvbGUubG9nKHRoaXMuX2RhdGEpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBObyBxdWVyeSwgcmV0dXJuIHdob2xlIGNvbGxlY3Rpb25cblx0XHRcdGlmICh0aGlzLl9xdWVyeS5vcHRpb25zKSB7XG5cdFx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IFZpZXcgaGFzIG9wdGlvbnMsIGdldHRpbmcgc3Vic2V0Li4uJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fZGF0YSA9IHRoaXMuX2Zyb20uc3Vic2V0KHt9LCB0aGlzLl9xdWVyeS5vcHRpb25zKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IFZpZXcgaGFzIG5vIHF1ZXJ5IG9yIG9wdGlvbnMsIGdldHRpbmcgc3Vic2V0Li4uJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5fZGF0YSA9IHRoaXMuX2Zyb20uc3Vic2V0KHt9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBDaGVjayBpZiB0aGVyZSB3YXMgb2xkIGRhdGFcblx0XHRpZiAoIWZvcmNlICYmIG9sZERhdGEpIHtcblx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBSZWZyZXNoIG5vdCBmb3JjZWQsIG9sZCBkYXRhIGRldGVjdGVkLi4uJyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIE5vdyBkZXRlcm1pbmUgdGhlIGRpZmZlcmVuY2Vcblx0XHRcdG5ld0RhdGEgPSB0aGlzLl9kYXRhO1xuXG5cdFx0XHRpZiAob2xkRGF0YS5zdWJzZXRPZigpID09PSBuZXdEYXRhLnN1YnNldE9mKCkpIHtcblx0XHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogT2xkIGFuZCBuZXcgZGF0YSBhcmUgZnJvbSBzYW1lIGNvbGxlY3Rpb24uLi4nKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRuZXdEYXRhQXJyID0gbmV3RGF0YS5maW5kKCk7XG5cdFx0XHRcdG9sZERhdGFBcnIgPSBvbGREYXRhLmZpbmQoKTtcblx0XHRcdFx0cHJpbWFyeUtleSA9IG5ld0RhdGEuX3ByaW1hcnlLZXk7XG5cblx0XHRcdFx0Ly8gVGhlIG9sZCBkYXRhIGFuZCBuZXcgZGF0YSB3ZXJlIGRlcml2ZWQgZnJvbSB0aGUgc2FtZSBwYXJlbnQgY29sbGVjdGlvblxuXHRcdFx0XHQvLyBzbyBzY2FuIHRoZSBkYXRhIHRvIGRldGVybWluZSBjaGFuZ2VzXG5cdFx0XHRcdGZvciAoaSA9IDA7IGkgPCBuZXdEYXRhQXJyLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0ZGF0YUl0ZW0gPSBuZXdEYXRhQXJyW2ldO1xuXG5cdFx0XHRcdFx0cXVlcnkgPSB7fTtcblx0XHRcdFx0XHRxdWVyeVtwcmltYXJ5S2V5XSA9IGRhdGFJdGVtW3ByaW1hcnlLZXldO1xuXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpdGVtIGV4aXN0cyBpbiB0aGUgb2xkIGRhdGFcblx0XHRcdFx0XHRvbGREYXRhSXRlbSA9IG9sZERhdGEuZmluZChxdWVyeSlbMF07XG5cblx0XHRcdFx0XHRpZiAoIW9sZERhdGFJdGVtKSB7XG5cdFx0XHRcdFx0XHQvLyBOZXcgaXRlbSBkZXRlY3RlZFxuXHRcdFx0XHRcdFx0aW5zZXJ0ZWQucHVzaChkYXRhSXRlbSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIENoZWNrIGlmIGFuIHVwZGF0ZSBoYXMgb2NjdXJyZWRcblx0XHRcdFx0XHRcdGlmIChKU09OLnN0cmluZ2lmeShvbGREYXRhSXRlbSkgIT09IEpTT04uc3RyaW5naWZ5KGRhdGFJdGVtKSkge1xuXHRcdFx0XHRcdFx0XHQvLyBVcGRhdGVkIC8gYWxyZWFkeSBpbmNsdWRlZCBpdGVtIGRldGVjdGVkXG5cdFx0XHRcdFx0XHRcdHVwZGF0ZWQucHVzaChkYXRhSXRlbSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gTm93IGxvb3AgdGhlIG9sZCBkYXRhIGFuZCBjaGVjayBpZiBhbnkgcmVjb3JkcyB3ZXJlIHJlbW92ZWRcblx0XHRcdFx0Zm9yIChpID0gMDsgaSA8IG9sZERhdGFBcnIubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRkYXRhSXRlbSA9IG9sZERhdGFBcnJbaV07XG5cblx0XHRcdFx0XHRxdWVyeSA9IHt9O1xuXHRcdFx0XHRcdHF1ZXJ5W3ByaW1hcnlLZXldID0gZGF0YUl0ZW1bcHJpbWFyeUtleV07XG5cblx0XHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGl0ZW0gZXhpc3RzIGluIHRoZSBvbGQgZGF0YVxuXHRcdFx0XHRcdGlmICghbmV3RGF0YS5maW5kKHF1ZXJ5KVswXSkge1xuXHRcdFx0XHRcdFx0Ly8gUmVtb3ZlZCBpdGVtIGRldGVjdGVkXG5cdFx0XHRcdFx0XHRyZW1vdmVkLnB1c2goZGF0YUl0ZW0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IFJlbW92ZWQgJyArIHJlbW92ZWQubGVuZ3RoICsgJyByb3dzJyk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBJbnNlcnRlZCAnICsgaW5zZXJ0ZWQubGVuZ3RoICsgJyByb3dzJyk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBVcGRhdGVkICcgKyB1cGRhdGVkLmxlbmd0aCArICcgcm93cycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gTm93IHdlIGhhdmUgYSBkaWZmIG9mIHRoZSB0d28gZGF0YSBzZXRzLCB3ZSBuZWVkIHRvIGdldCB0aGUgRE9NIHVwZGF0ZWRcblx0XHRcdFx0aWYgKGluc2VydGVkLmxlbmd0aCkge1xuXHRcdFx0XHRcdHRoaXMuX29uSW5zZXJ0KGluc2VydGVkLCBbXSk7XG5cdFx0XHRcdFx0b3BlcmF0ZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHVwZGF0ZWQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0dGhpcy5fb25VcGRhdGUodXBkYXRlZCwgW10pO1xuXHRcdFx0XHRcdG9wZXJhdGVkID0gdHJ1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChyZW1vdmVkLmxlbmd0aCkge1xuXHRcdFx0XHRcdHRoaXMuX29uUmVtb3ZlKHJlbW92ZWQsIFtdKTtcblx0XHRcdFx0XHRvcGVyYXRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFRoZSBwcmV2aW91cyBkYXRhIGFuZCB0aGUgbmV3IGRhdGEgYXJlIGRlcml2ZWQgZnJvbSBkaWZmZXJlbnQgY29sbGVjdGlvbnNcblx0XHRcdFx0Ly8gYW5kIGNhbiB0aGVyZWZvcmUgbm90IGJlIGNvbXBhcmVkLCBhbGwgZGF0YSBpcyB0aGVyZWZvcmUgZWZmZWN0aXZlbHkgXCJuZXdcIlxuXHRcdFx0XHQvLyBzbyBmaXJzdCBwZXJmb3JtIGEgcmVtb3ZlIG9mIGFsbCBleGlzdGluZyBkYXRhIHRoZW4gZG8gYW4gaW5zZXJ0IG9uIGFsbCBuZXcgZGF0YVxuXHRcdFx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBPbGQgYW5kIG5ldyBkYXRhIGFyZSBmcm9tIGRpZmZlcmVudCBjb2xsZWN0aW9ucy4uLicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJlbW92ZWQgPSBvbGREYXRhLmZpbmQoKTtcblxuXHRcdFx0XHRpZiAocmVtb3ZlZC5sZW5ndGgpIHtcblx0XHRcdFx0XHR0aGlzLl9vblJlbW92ZShyZW1vdmVkKTtcblx0XHRcdFx0XHRvcGVyYXRlZCA9IHRydWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpbnNlcnRlZCA9IG5ld0RhdGEuZmluZCgpO1xuXG5cdFx0XHRcdGlmIChpbnNlcnRlZC5sZW5ndGgpIHtcblx0XHRcdFx0XHR0aGlzLl9vbkluc2VydChpbnNlcnRlZCk7XG5cdFx0XHRcdFx0b3BlcmF0ZWQgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIEZvcmNlIGFuIHVwZGF0ZSBhcyBpZiB0aGUgdmlldyBuZXZlciBnb3QgY3JlYXRlZCBieSBwYWRkaW5nIGFsbCBlbGVtZW50c1xuXHRcdFx0Ly8gdG8gdGhlIGluc2VydFxuXHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IEZvcmNpbmcgZGF0YSB1cGRhdGUnLCBuZXdEYXRhQXJyKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fZGF0YSA9IHRoaXMuX2Zyb20uc3Vic2V0KHRoaXMuX3F1ZXJ5LnF1ZXJ5LCB0aGlzLl9xdWVyeS5vcHRpb25zKTtcblx0XHRcdG5ld0RhdGFBcnIgPSB0aGlzLl9kYXRhLmZpbmQoKTtcblxuXHRcdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IEVtaXR0aW5nIGNoYW5nZSBldmVudCB3aXRoIGRhdGEnLCBuZXdEYXRhQXJyKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuX29uSW5zZXJ0KG5ld0RhdGFBcnIsIFtdKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5kZWJ1ZygpKSB7IGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogRW1pdHRpbmcgY2hhbmdlJyk7IH1cblx0XHR0aGlzLmVtaXQoJ2NoYW5nZScpO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIG51bWJlciBvZiBkb2N1bWVudHMgY3VycmVudGx5IGluIHRoZSB2aWV3LlxuICogQHJldHVybnMge051bWJlcn1cbiAqL1xuT2xkVmlldy5wcm90b3R5cGUuY291bnQgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9kYXRhICYmIHRoaXMuX2RhdGEuX2RhdGEgPyB0aGlzLl9kYXRhLl9kYXRhLmxlbmd0aCA6IDA7XG59O1xuXG4vKipcbiAqIFF1ZXJpZXMgdGhlIHZpZXcgZGF0YS4gU2VlIENvbGxlY3Rpb24uZmluZCgpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgeyp9XG4gKi9cbk9sZFZpZXcucHJvdG90eXBlLmZpbmQgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9kYXRhKSB7XG5cdFx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5PbGRWaWV3OiBGaW5kaW5nIGRhdGEgaW4gdmlldyBjb2xsZWN0aW9uLi4uJywgdGhpcy5fZGF0YSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2RhdGEuZmluZC5hcHBseSh0aGlzLl9kYXRhLCBhcmd1bWVudHMpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBbXTtcblx0fVxufTtcblxuLyoqXG4gKiBJbnNlcnRzIGludG8gdmlldyBkYXRhIHZpYSB0aGUgdmlldyBjb2xsZWN0aW9uLiBTZWUgQ29sbGVjdGlvbi5pbnNlcnQoKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9mcm9tKSB7XG5cdFx0Ly8gUGFzcyB0aGUgYXJncyB0aHJvdWdoIHRvIHRoZSBmcm9tIG9iamVjdFxuXHRcdHJldHVybiB0aGlzLl9mcm9tLmluc2VydC5hcHBseSh0aGlzLl9mcm9tLCBhcmd1bWVudHMpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBbXTtcblx0fVxufTtcblxuLyoqXG4gKiBVcGRhdGVzIGludG8gdmlldyBkYXRhIHZpYSB0aGUgdmlldyBjb2xsZWN0aW9uLiBTZWUgQ29sbGVjdGlvbi51cGRhdGUoKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9mcm9tKSB7XG5cdFx0Ly8gUGFzcyB0aGUgYXJncyB0aHJvdWdoIHRvIHRoZSBmcm9tIG9iamVjdFxuXHRcdHJldHVybiB0aGlzLl9mcm9tLnVwZGF0ZS5hcHBseSh0aGlzLl9mcm9tLCBhcmd1bWVudHMpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBbXTtcblx0fVxufTtcblxuLyoqXG4gKiBSZW1vdmVkIGZyb20gdmlldyBkYXRhIHZpYSB0aGUgdmlldyBjb2xsZWN0aW9uLiBTZWUgQ29sbGVjdGlvbi5yZW1vdmUoKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PbGRWaWV3LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9mcm9tKSB7XG5cdFx0Ly8gUGFzcyB0aGUgYXJncyB0aHJvdWdoIHRvIHRoZSBmcm9tIG9iamVjdFxuXHRcdHJldHVybiB0aGlzLl9mcm9tLnJlbW92ZS5hcHBseSh0aGlzLl9mcm9tLCBhcmd1bWVudHMpO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBbXTtcblx0fVxufTtcblxuT2xkVmlldy5wcm90b3R5cGUuX29uU2V0RGF0YSA9IGZ1bmN0aW9uIChuZXdEYXRhQXJyLCBvbGREYXRhQXJyKSB7XG5cdHRoaXMuZW1pdCgncmVtb3ZlJywgb2xkRGF0YUFyciwgW10pO1xuXHR0aGlzLmVtaXQoJ2luc2VydCcsIG5ld0RhdGFBcnIsIFtdKTtcblx0Ly90aGlzLnJlZnJlc2goKTtcbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9vbkluc2VydCA9IGZ1bmN0aW9uIChzdWNjZXNzQXJyLCBmYWlsQXJyKSB7XG5cdHRoaXMuZW1pdCgnaW5zZXJ0Jywgc3VjY2Vzc0FyciwgZmFpbEFycik7XG5cdC8vdGhpcy5yZWZyZXNoKCk7XG59O1xuXG5PbGRWaWV3LnByb3RvdHlwZS5fb25VcGRhdGUgPSBmdW5jdGlvbiAoc3VjY2Vzc0FyciwgZmFpbEFycikge1xuXHR0aGlzLmVtaXQoJ3VwZGF0ZScsIHN1Y2Nlc3NBcnIsIGZhaWxBcnIpO1xuXHQvL3RoaXMucmVmcmVzaCgpO1xufTtcblxuT2xkVmlldy5wcm90b3R5cGUuX29uUmVtb3ZlID0gZnVuY3Rpb24gKHN1Y2Nlc3NBcnIsIGZhaWxBcnIpIHtcblx0dGhpcy5lbWl0KCdyZW1vdmUnLCBzdWNjZXNzQXJyLCBmYWlsQXJyKTtcblx0Ly90aGlzLnJlZnJlc2goKTtcbn07XG5cbk9sZFZpZXcucHJvdG90eXBlLl9vbkNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcblx0aWYgKHRoaXMuZGVidWcoKSkgeyBjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLk9sZFZpZXc6IFJlZnJlc2hpbmcgZGF0YScpOyB9XG5cdHRoaXMucmVmcmVzaCgpO1xufTtcblxuLy8gRXh0ZW5kIGNvbGxlY3Rpb24gd2l0aCB2aWV3IGluaXRcbkNvbGxlY3Rpb24ucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoKSB7XG5cdHRoaXMuX29sZFZpZXdzID0gW107XG5cdENvbGxlY3Rpb25Jbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIEFkZHMgYSB2aWV3IHRvIHRoZSBpbnRlcm5hbCB2aWV3IGxvb2t1cC5cbiAqIEBwYXJhbSB7Vmlld30gdmlldyBUaGUgdmlldyB0byBhZGQuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9hZGRPbGRWaWV3ID0gZnVuY3Rpb24gKHZpZXcpIHtcblx0aWYgKHZpZXcgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX29sZFZpZXdzW3ZpZXcuX25hbWVdID0gdmlldztcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgdmlldyBmcm9tIHRoZSBpbnRlcm5hbCB2aWV3IGxvb2t1cC5cbiAqIEBwYXJhbSB7Vmlld30gdmlldyBUaGUgdmlldyB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9yZW1vdmVPbGRWaWV3ID0gZnVuY3Rpb24gKHZpZXcpIHtcblx0aWYgKHZpZXcgIT09IHVuZGVmaW5lZCkge1xuXHRcdGRlbGV0ZSB0aGlzLl9vbGRWaWV3c1t2aWV3Ll9uYW1lXTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLy8gRXh0ZW5kIGNvbGxlY3Rpb24gd2l0aCB2aWV3IGluaXRcbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fb2xkVmlld3MgPSBbXTtcblx0Q29sbGVjdGlvbkdyb3VwSW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgdmlldyB0byB0aGUgaW50ZXJuYWwgdmlldyBsb29rdXAuXG4gKiBAcGFyYW0ge1ZpZXd9IHZpZXcgVGhlIHZpZXcgdG8gYWRkLlxuICogQHJldHVybnMge0NvbGxlY3Rpb259XG4gKiBAcHJpdmF0ZVxuICovXG5Db2xsZWN0aW9uR3JvdXAucHJvdG90eXBlLl9hZGRPbGRWaWV3ID0gZnVuY3Rpb24gKHZpZXcpIHtcblx0aWYgKHZpZXcgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX29sZFZpZXdzW3ZpZXcuX25hbWVdID0gdmlldztcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgdmlldyBmcm9tIHRoZSBpbnRlcm5hbCB2aWV3IGxvb2t1cC5cbiAqIEBwYXJhbSB7Vmlld30gdmlldyBUaGUgdmlldyB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb25Hcm91cC5wcm90b3R5cGUuX3JlbW92ZU9sZFZpZXcgPSBmdW5jdGlvbiAodmlldykge1xuXHRpZiAodmlldyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0ZGVsZXRlIHRoaXMuX29sZFZpZXdzW3ZpZXcuX25hbWVdO1xuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vLyBFeHRlbmQgREIgd2l0aCB2aWV3cyBpbml0XG5Db3JlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9vbGRWaWV3cyA9IHt9O1xuXHRDb3JlSW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBHZXRzIGEgdmlldyBieSBpdCdzIG5hbWUuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmlld05hbWUgVGhlIG5hbWUgb2YgdGhlIHZpZXcgdG8gcmV0cmlldmUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29yZS5wcm90b3R5cGUub2xkVmlldyA9IGZ1bmN0aW9uICh2aWV3TmFtZSkge1xuXHRpZiAoIXRoaXMuX29sZFZpZXdzW3ZpZXdOYW1lXSkge1xuXHRcdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuT2xkVmlldzogQ3JlYXRpbmcgdmlldyAnICsgdmlld05hbWUpO1xuXHRcdH1cblx0fVxuXG5cdHRoaXMuX29sZFZpZXdzW3ZpZXdOYW1lXSA9IHRoaXMuX29sZFZpZXdzW3ZpZXdOYW1lXSB8fCBuZXcgT2xkVmlldyh2aWV3TmFtZSkuZGIodGhpcyk7XG5cdHJldHVybiB0aGlzLl9vbGRWaWV3c1t2aWV3TmFtZV07XG59O1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZpZXcgd2l0aCB0aGUgcGFzc2VkIG5hbWUgYWxyZWFkeSBleGlzdHMuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmlld05hbWUgVGhlIG5hbWUgb2YgdGhlIHZpZXcgdG8gY2hlY2sgZm9yLlxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbkNvcmUucHJvdG90eXBlLm9sZFZpZXdFeGlzdHMgPSBmdW5jdGlvbiAodmlld05hbWUpIHtcblx0cmV0dXJuIEJvb2xlYW4odGhpcy5fb2xkVmlld3Nbdmlld05hbWVdKTtcbn07XG5cbi8qKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiB2aWV3cyB0aGUgREIgY3VycmVudGx5IGhhcy5cbiAqIEByZXR1cm5zIHtBcnJheX0gQW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIGRldGFpbHMgb2YgZWFjaCB2aWV3XG4gKiB0aGUgZGF0YWJhc2UgaXMgY3VycmVudGx5IG1hbmFnaW5nLlxuICovXG5Db3JlLnByb3RvdHlwZS5vbGRWaWV3cyA9IGZ1bmN0aW9uICgpIHtcblx0dmFyIGFyciA9IFtdLFxuXHRcdGk7XG5cblx0Zm9yIChpIGluIHRoaXMuX29sZFZpZXdzKSB7XG5cdFx0aWYgKHRoaXMuX29sZFZpZXdzLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRhcnIucHVzaCh7XG5cdFx0XHRcdG5hbWU6IGksXG5cdFx0XHRcdGNvdW50OiB0aGlzLl9vbGRWaWV3c1tpXS5jb3VudCgpXG5cdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gYXJyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPbGRWaWV3OyIsInZhciBTaGFyZWQgPSByZXF1aXJlKCcuL1NoYXJlZCcpLFxuXHRQYXRoID0gcmVxdWlyZSgnLi9QYXRoJyk7XG5cbi8qKlxuICogVGhlIG9wZXJhdGlvbiBjbGFzcywgdXNlZCB0byBzdG9yZSBkZXRhaWxzIGFib3V0IGFuIG9wZXJhdGlvbiBiZWluZ1xuICogcGVyZm9ybWVkIGJ5IHRoZSBkYXRhYmFzZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBvcGVyYXRpb24uXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIE9wZXJhdGlvbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG5cdHRoaXMucGF0aFNvbHZlciA9IG5ldyBQYXRoKCk7XG5cdHRoaXMuY291bnRlciA9IDA7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuT3BlcmF0aW9uLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKG5hbWUpIHtcblx0dGhpcy5fZGF0YSA9IHtcblx0XHRvcGVyYXRpb246IG5hbWUsIC8vIFRoZSBuYW1lIG9mIHRoZSBvcGVyYXRpb24gZXhlY3V0ZWQgc3VjaCBhcyBcImZpbmRcIiwgXCJ1cGRhdGVcIiBldGNcblx0XHRpbmRleDoge1xuXHRcdFx0cG90ZW50aWFsOiBbXSwgLy8gSW5kZXhlcyB0aGF0IGNvdWxkIGhhdmUgcG90ZW50aWFsbHkgYmVlbiB1c2VkXG5cdFx0XHR1c2VkOiBmYWxzZSAvLyBUaGUgaW5kZXggdGhhdCB3YXMgcGlja2VkIHRvIHVzZVxuXHRcdH0sXG5cdFx0c3RlcHM6IFtdLCAvLyBUaGUgc3RlcHMgdGFrZW4gdG8gZ2VuZXJhdGUgdGhlIHF1ZXJ5IHJlc3VsdHMsXG5cdFx0dGltZToge1xuXHRcdFx0c3RhcnRNczogMCxcblx0XHRcdHN0b3BNczogMCxcblx0XHRcdHRvdGFsTXM6IDAsXG5cdFx0XHRwcm9jZXNzOiB7fVxuXHRcdH0sXG5cdFx0ZmxhZzoge30sIC8vIEFuIG9iamVjdCB3aXRoIGZsYWdzIHRoYXQgZGVub3RlIGNlcnRhaW4gZXhlY3V0aW9uIHBhdGhzXG5cdFx0bG9nOiBbXSAvLyBBbnkgZXh0cmEgZGF0YSB0aGF0IG1pZ2h0IGJlIHVzZWZ1bCBzdWNoIGFzIHdhcm5pbmdzIG9yIGhlbHBmdWwgaGludHNcblx0fTtcbn07XG5cblNoYXJlZC5tb2R1bGVzLk9wZXJhdGlvbiA9IE9wZXJhdGlvbjtcblxuLyoqXG4gKiBTdGFydHMgdGhlIG9wZXJhdGlvbiB0aW1lci5cbiAqL1xuT3BlcmF0aW9uLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fZGF0YS50aW1lLnN0YXJ0TXMgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbn07XG5cbi8qKlxuICogQWRkcyBhbiBpdGVtIHRvIHRoZSBvcGVyYXRpb24gbG9nLlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBpdGVtIHRvIGxvZy5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5PcGVyYXRpb24ucHJvdG90eXBlLmxvZyA9IGZ1bmN0aW9uIChldmVudCkge1xuXHRpZiAoZXZlbnQpIHtcblx0XHR2YXIgbGFzdExvZ1RpbWUgPSB0aGlzLl9sb2cubGVuZ3RoID4gMCA/IHRoaXMuX2RhdGEubG9nW3RoaXMuX2RhdGEubG9nLmxlbmd0aCAtIDFdLnRpbWUgOiAwLFxuXHRcdFx0bG9nT2JqID0ge1xuXHRcdFx0XHRldmVudDogZXZlbnQsXG5cdFx0XHRcdHRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxuXHRcdFx0XHRkZWx0YTogMFxuXHRcdFx0fTtcblxuXHRcdHRoaXMuX2RhdGEubG9nLnB1c2gobG9nT2JqKTtcblxuXHRcdGlmIChsYXN0TG9nVGltZSkge1xuXHRcdFx0bG9nT2JqLmRlbHRhID0gbG9nT2JqLnRpbWUgLSBsYXN0TG9nVGltZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9kYXRhLmxvZztcbn07XG5cbi8qKlxuICogQ2FsbGVkIHdoZW4gc3RhcnRpbmcgYW5kIGVuZGluZyBhIHRpbWVkIG9wZXJhdGlvbiwgdXNlZCB0byB0aW1lXG4gKiBpbnRlcm5hbCBjYWxscyB3aXRoaW4gYW4gb3BlcmF0aW9uJ3MgZXhlY3V0aW9uLlxuICogQHBhcmFtIHtTdHJpbmd9IHNlY3Rpb24gQW4gb3BlcmF0aW9uIG5hbWUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT3BlcmF0aW9uLnByb3RvdHlwZS50aW1lID0gZnVuY3Rpb24gKHNlY3Rpb24pIHtcblx0aWYgKHNlY3Rpb24gIT09IHVuZGVmaW5lZCkge1xuXHRcdHZhciBwcm9jZXNzID0gdGhpcy5fZGF0YS50aW1lLnByb2Nlc3MsXG5cdFx0XHRwcm9jZXNzT2JqID0gcHJvY2Vzc1tzZWN0aW9uXSA9IHByb2Nlc3Nbc2VjdGlvbl0gfHwge307XG5cblx0XHRpZiAoIXByb2Nlc3NPYmouc3RhcnRNcykge1xuXHRcdFx0Ly8gVGltZXIgc3RhcnRlZFxuXHRcdFx0cHJvY2Vzc09iai5zdGFydE1zID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHRwcm9jZXNzT2JqLnN0ZXBPYmogPSB7XG5cdFx0XHRcdG5hbWU6IHNlY3Rpb25cblx0XHRcdH07XG5cblx0XHRcdHRoaXMuX2RhdGEuc3RlcHMucHVzaChwcm9jZXNzT2JqLnN0ZXBPYmopO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwcm9jZXNzT2JqLnN0b3BNcyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHRcdFx0cHJvY2Vzc09iai50b3RhbE1zID0gcHJvY2Vzc09iai5zdG9wTXMgLSBwcm9jZXNzT2JqLnN0YXJ0TXM7XG5cdFx0XHRwcm9jZXNzT2JqLnN0ZXBPYmoudG90YWxNcyA9IHByb2Nlc3NPYmoudG90YWxNcztcblx0XHRcdGRlbGV0ZSBwcm9jZXNzT2JqLnN0ZXBPYmo7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fZGF0YS50aW1lO1xufTtcblxuLyoqXG4gKiBVc2VkIHRvIHNldCBrZXkvdmFsdWUgZmxhZ3MgZHVyaW5nIG9wZXJhdGlvbiBleGVjdXRpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuT3BlcmF0aW9uLnByb3RvdHlwZS5mbGFnID0gZnVuY3Rpb24gKGtleSwgdmFsKSB7XG5cdGlmIChrZXkgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2RhdGEuZmxhZ1trZXldID0gdmFsO1xuXHR9IGVsc2UgaWYgKGtleSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2RhdGEuZmxhZ1trZXldO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB0aGlzLl9kYXRhLmZsYWc7XG5cdH1cbn07XG5cbk9wZXJhdGlvbi5wcm90b3R5cGUuZGF0YSA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG5vVGltZSkge1xuXHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBBc3NpZ24gdmFsdWUgdG8gb2JqZWN0IHBhdGhcblx0XHR0aGlzLnBhdGhTb2x2ZXIuc2V0KHRoaXMuX2RhdGEsIHBhdGgsIHZhbCk7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLnBhdGhTb2x2ZXIuZ2V0KHRoaXMuX2RhdGEsIHBhdGgpO1xufTtcblxuT3BlcmF0aW9uLnByb3RvdHlwZS5wdXNoRGF0YSA9IGZ1bmN0aW9uIChwYXRoLCB2YWwsIG5vVGltZSkge1xuXHQvLyBBc3NpZ24gdmFsdWUgdG8gb2JqZWN0IHBhdGhcblx0dGhpcy5wYXRoU29sdmVyLnB1c2godGhpcy5fZGF0YSwgcGF0aCwgdmFsKTtcbn07XG5cbi8qKlxuICogU3RvcHMgdGhlIG9wZXJhdGlvbiB0aW1lci5cbiAqL1xuT3BlcmF0aW9uLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9kYXRhLnRpbWUuc3RvcE1zID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdHRoaXMuX2RhdGEudGltZS50b3RhbE1zID0gdGhpcy5fZGF0YS50aW1lLnN0b3BNcyAtIHRoaXMuX2RhdGEudGltZS5zdGFydE1zO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBPcGVyYXRpb247IiwidmFyIFNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyk7XG5cbi8qKlxuICogQWxsb3dzIGEgbWV0aG9kIHRvIGJlIG92ZXJsb2FkZWQuXG4gKiBAcGFyYW0gYXJyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIE92ZXJsb2FkID0gZnVuY3Rpb24gKGFycikge1xuXHRpZiAoYXJyKSB7XG5cdFx0dmFyIGFyckluZGV4LFxuXHRcdFx0YXJyQ291bnQgPSBhcnIubGVuZ3RoO1xuXG5cdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdGZvciAoYXJySW5kZXggPSAwOyBhcnJJbmRleCA8IGFyckNvdW50OyBhcnJJbmRleCsrKSB7XG5cdFx0XHRcdGlmIChhcnJbYXJySW5kZXhdLmxlbmd0aCA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0XHRcdHJldHVybiBhcnJbYXJySW5kZXhdLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcbn07XG5cblNoYXJlZC5tb2R1bGVzLk92ZXJsb2FkID0gT3ZlcmxvYWQ7XG5cbm1vZHVsZS5leHBvcnRzID0gT3ZlcmxvYWQ7IiwidmFyIFNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyk7XG5cbi8qKlxuICogUGF0aCBvYmplY3QgdXNlZCB0byByZXNvbHZlIG9iamVjdCBwYXRocyBhbmQgcmV0cmlldmUgZGF0YSBmcm9tXG4gKiBvYmplY3RzIGJ5IHVzaW5nIHBhdGhzLlxuICogQHBhcmFtIHtTdHJpbmc9fSBwYXRoIFRoZSBwYXRoIHRvIGFzc2lnbi5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG5cdHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuUGF0aC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChwYXRoKSB7XG5cdGlmIChwYXRoKSB7XG5cdFx0dGhpcy5wYXRoKHBhdGgpO1xuXHR9XG59O1xuXG5TaGFyZWQubW9kdWxlcy5QYXRoID0gUGF0aDtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgZ2l2ZW4gcGF0aCBmb3IgdGhlIFBhdGggaW5zdGFuY2UuXG4gKiBAcGFyYW0ge1N0cmluZz19IHBhdGggVGhlIHBhdGggdG8gYXNzaWduLlxuICovXG5QYXRoLnByb3RvdHlwZS5wYXRoID0gZnVuY3Rpb24gKHBhdGgpIHtcblx0aWYgKHBhdGggIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX3BhdGggPSB0aGlzLmNsZWFuKHBhdGgpO1xuXHRcdHRoaXMuX3BhdGhQYXJ0cyA9IHRoaXMuX3BhdGguc3BsaXQoJy4nKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9wYXRoO1xufTtcblxuLyoqXG4gKiBUZXN0cyBpZiB0aGUgcGFzc2VkIG9iamVjdCBoYXMgdGhlIHBhdGhzIHRoYXQgYXJlIHNwZWNpZmllZCBhbmQgdGhhdFxuICogYSB2YWx1ZSBleGlzdHMgaW4gdGhvc2UgcGF0aHMuXG4gKiBAcGFyYW0ge09iamVjdH0gdGVzdEtleXMgVGhlIG9iamVjdCBkZXNjcmliaW5nIHRoZSBwYXRocyB0byB0ZXN0IGZvci5cbiAqIEBwYXJhbSB7T2JqZWN0fSB0ZXN0T2JqIFRoZSBvYmplY3QgdG8gdGVzdCBwYXRocyBhZ2FpbnN0LlxuICogQHJldHVybnMge0Jvb2xlYW59IFRydWUgaWYgdGhlIG9iamVjdCBwYXRocyBleGlzdC5cbiAqL1xuUGF0aC5wcm90b3R5cGUuaGFzT2JqZWN0UGF0aHMgPSBmdW5jdGlvbiAodGVzdEtleXMsIHRlc3RPYmopIHtcblx0dmFyIHJlc3VsdCA9IHRydWUsXG5cdFx0aTtcblxuXHRmb3IgKGkgaW4gdGVzdEtleXMpIHtcblx0XHRpZiAodGVzdEtleXMuaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGlmICh0ZXN0T2JqW2ldID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodHlwZW9mIHRlc3RLZXlzW2ldID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHQvLyBSZWN1cnNlIG9iamVjdFxuXHRcdFx0XHRyZXN1bHQgPSB0aGlzLmhhc09iamVjdFBhdGhzKHRlc3RLZXlzW2ldLCB0ZXN0T2JqW2ldKTtcblxuXHRcdFx0XHQvLyBTaG91bGQgd2UgZXhpdCBlYXJseT9cblx0XHRcdFx0aWYgKCFyZXN1bHQpIHtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBDb3VudHMgdGhlIHRvdGFsIG51bWJlciBvZiBrZXkgZW5kcG9pbnRzIGluIHRoZSBwYXNzZWQgb2JqZWN0LlxuICogQHBhcmFtIHtPYmplY3R9IHRlc3RPYmogVGhlIG9iamVjdCB0byBjb3VudCBrZXkgZW5kcG9pbnRzIGZvci5cbiAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1iZXIgb2YgZW5kcG9pbnRzLlxuICovXG5QYXRoLnByb3RvdHlwZS5jb3VudEtleXMgPSBmdW5jdGlvbiAodGVzdE9iaikge1xuXHR2YXIgdG90YWxLZXlzID0gMCxcblx0XHRpO1xuXG5cdGZvciAoaSBpbiB0ZXN0T2JqKSB7XG5cdFx0aWYgKHRlc3RPYmouaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGlmICh0ZXN0T2JqW2ldICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiB0ZXN0T2JqW2ldICE9PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdHRvdGFsS2V5cysrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRvdGFsS2V5cyArPSB0aGlzLmNvdW50S2V5cyh0ZXN0T2JqW2ldKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB0b3RhbEtleXM7XG59O1xuXG4vKipcbiAqIFRlc3RzIGlmIHRoZSBwYXNzZWQgb2JqZWN0IGhhcyB0aGUgcGF0aHMgdGhhdCBhcmUgc3BlY2lmaWVkIGFuZCB0aGF0XG4gKiBhIHZhbHVlIGV4aXN0cyBpbiB0aG9zZSBwYXRocyBhbmQgaWYgc28gcmV0dXJucyB0aGUgbnVtYmVyIG1hdGNoZWQuXG4gKiBAcGFyYW0ge09iamVjdH0gdGVzdEtleXMgVGhlIG9iamVjdCBkZXNjcmliaW5nIHRoZSBwYXRocyB0byB0ZXN0IGZvci5cbiAqIEBwYXJhbSB7T2JqZWN0fSB0ZXN0T2JqIFRoZSBvYmplY3QgdG8gdGVzdCBwYXRocyBhZ2FpbnN0LlxuICogQHJldHVybnMge09iamVjdH0gU3RhdHMgb24gdGhlIG1hdGNoZWQga2V5c1xuICovXG5QYXRoLnByb3RvdHlwZS5jb3VudE9iamVjdFBhdGhzID0gZnVuY3Rpb24gKHRlc3RLZXlzLCB0ZXN0T2JqKSB7XG5cdHZhciBtYXRjaERhdGEsXG5cdFx0bWF0Y2hlZEtleXMgPSB7fSxcblx0XHRtYXRjaGVkS2V5Q291bnQgPSAwLFxuXHRcdHRvdGFsS2V5Q291bnQgPSAwLFxuXHRcdGk7XG5cblx0Zm9yIChpIGluIHRlc3RPYmopIHtcblx0XHRpZiAodGVzdE9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0aWYgKHR5cGVvZiB0ZXN0T2JqW2ldID09PSAnb2JqZWN0Jykge1xuXHRcdFx0XHQvLyBUaGUgdGVzdCAvIHF1ZXJ5IG9iamVjdCBrZXkgaXMgYW4gb2JqZWN0LCByZWN1cnNlXG5cdFx0XHRcdG1hdGNoRGF0YSA9IHRoaXMuY291bnRPYmplY3RQYXRocyh0ZXN0S2V5c1tpXSwgdGVzdE9ialtpXSk7XG5cblx0XHRcdFx0bWF0Y2hlZEtleXNbaV0gPSBtYXRjaERhdGEubWF0Y2hlZEtleXM7XG5cdFx0XHRcdHRvdGFsS2V5Q291bnQgKz0gbWF0Y2hEYXRhLnRvdGFsS2V5Q291bnQ7XG5cdFx0XHRcdG1hdGNoZWRLZXlDb3VudCArPSBtYXRjaERhdGEubWF0Y2hlZEtleUNvdW50O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gVGhlIHRlc3QgLyBxdWVyeSBvYmplY3QgaGFzIGEgcHJvcGVydHkgdGhhdCBpcyBub3QgYW4gb2JqZWN0IHNvIGFkZCBpdCBhcyBhIGtleVxuXHRcdFx0XHR0b3RhbEtleUNvdW50Kys7XG5cblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIHRlc3Qga2V5cyBhbHNvIGhhdmUgdGhpcyBrZXkgYW5kIGl0IGlzIGFsc28gbm90IGFuIG9iamVjdFxuXHRcdFx0XHRpZiAodGVzdEtleXMgJiYgdGVzdEtleXNbaV0gJiYgdHlwZW9mIHRlc3RLZXlzW2ldICE9PSAnb2JqZWN0Jykge1xuXHRcdFx0XHRcdG1hdGNoZWRLZXlzW2ldID0gdHJ1ZTtcblx0XHRcdFx0XHRtYXRjaGVkS2V5Q291bnQrKztcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRtYXRjaGVkS2V5c1tpXSA9IGZhbHNlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRtYXRjaGVkS2V5czogbWF0Y2hlZEtleXMsXG5cdFx0bWF0Y2hlZEtleUNvdW50OiBtYXRjaGVkS2V5Q291bnQsXG5cdFx0dG90YWxLZXlDb3VudDogdG90YWxLZXlDb3VudFxuXHR9O1xufTtcblxuLyoqXG4gKiBUYWtlcyBhIG5vbi1yZWN1cnNpdmUgb2JqZWN0IGFuZCBjb252ZXJ0cyB0aGUgb2JqZWN0IGhpZXJhcmNoeSBpbnRvXG4gKiBhIHBhdGggc3RyaW5nLlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHBhcnNlLlxuICogQHBhcmFtIHtCb29sZWFuPX0gd2l0aFZhbHVlIElmIHRydWUgd2lsbCBpbmNsdWRlIGEgJ3ZhbHVlJyBrZXkgaW4gdGhlIHJldHVybmVkXG4gKiBvYmplY3QgdGhhdCByZXByZXNlbnRzIHRoZSB2YWx1ZSB0aGUgb2JqZWN0IHBhdGggcG9pbnRzIHRvLlxuICogQHJldHVybnMge09iamVjdH1cbiAqL1xuUGF0aC5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbiAob2JqLCB3aXRoVmFsdWUpIHtcblx0dmFyIHBhdGhzID0gW10sXG5cdFx0cGF0aCA9ICcnLFxuXHRcdHJlc3VsdERhdGEsXG5cdFx0aSwgaztcblxuXHRmb3IgKGkgaW4gb2JqKSB7XG5cdFx0aWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0Ly8gU2V0IHRoZSBwYXRoIHRvIHRoZSBrZXlcblx0XHRcdHBhdGggPSBpO1xuXG5cdFx0XHRpZiAodHlwZW9mKG9ialtpXSkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdGlmICh3aXRoVmFsdWUpIHtcblx0XHRcdFx0XHRyZXN1bHREYXRhID0gdGhpcy5wYXJzZShvYmpbaV0sIHdpdGhWYWx1ZSk7XG5cblx0XHRcdFx0XHRmb3IgKGsgPSAwOyBrIDwgcmVzdWx0RGF0YS5sZW5ndGg7IGsrKykge1xuXHRcdFx0XHRcdFx0cGF0aHMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdHBhdGg6IHBhdGggKyAnLicgKyByZXN1bHREYXRhW2tdLnBhdGgsXG5cdFx0XHRcdFx0XHRcdHZhbHVlOiByZXN1bHREYXRhW2tdLnZhbHVlXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzdWx0RGF0YSA9IHRoaXMucGFyc2Uob2JqW2ldKTtcblxuXHRcdFx0XHRcdGZvciAoayA9IDA7IGsgPCByZXN1bHREYXRhLmxlbmd0aDsgaysrKSB7XG5cdFx0XHRcdFx0XHRwYXRocy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0cGF0aDogcGF0aCArICcuJyArIHJlc3VsdERhdGFba10ucGF0aFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAod2l0aFZhbHVlKSB7XG5cdFx0XHRcdFx0cGF0aHMucHVzaCh7XG5cdFx0XHRcdFx0XHRwYXRoOiBwYXRoLFxuXHRcdFx0XHRcdFx0dmFsdWU6IG9ialtpXVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBhdGhzLnB1c2goe1xuXHRcdFx0XHRcdFx0cGF0aDogcGF0aFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHBhdGhzO1xufTtcblxuLyoqXG4gKiBUYWtlcyBhIG5vbi1yZWN1cnNpdmUgb2JqZWN0IGFuZCBjb252ZXJ0cyB0aGUgb2JqZWN0IGhpZXJhcmNoeSBpbnRvXG4gKiBhbiBhcnJheSBvZiBwYXRoIHN0cmluZ3MgdGhhdCBhbGxvdyB5b3UgdG8gdGFyZ2V0IGFsbCBwb3NzaWJsZSBwYXRoc1xuICogaW4gYW4gb2JqZWN0LlxuICpcbiAqIEByZXR1cm5zIHtBcnJheX1cbiAqL1xuUGF0aC5wcm90b3R5cGUucGFyc2VBcnIgPSBmdW5jdGlvbiAob2JqLCBvcHRpb25zKSB7XG5cdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXHRyZXR1cm4gdGhpcy5fcGFyc2VBcnIob2JqLCAnJywgW10sIG9wdGlvbnMpO1xufTtcblxuUGF0aC5wcm90b3R5cGUuX3BhcnNlQXJyID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgcGF0aHMsIG9wdGlvbnMpIHtcblx0dmFyIGksXG5cdFx0bmV3UGF0aCA9ICcnO1xuXG5cdHBhdGggPSBwYXRoIHx8ICcnO1xuXHRwYXRocyA9IHBhdGhzIHx8IFtdO1xuXG5cdGZvciAoaSBpbiBvYmopIHtcblx0XHRpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRpZiAoIW9wdGlvbnMuaWdub3JlIHx8IChvcHRpb25zLmlnbm9yZSAmJiAhb3B0aW9ucy5pZ25vcmUudGVzdChpKSkpIHtcblx0XHRcdFx0aWYgKHBhdGgpIHtcblx0XHRcdFx0XHRuZXdQYXRoID0gcGF0aCArICcuJyArIGk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0bmV3UGF0aCA9IGk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodHlwZW9mKG9ialtpXSkgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0dGhpcy5fcGFyc2VBcnIob2JqW2ldLCBuZXdQYXRoLCBwYXRocywgb3B0aW9ucyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGF0aHMucHVzaChuZXdQYXRoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBwYXRocztcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgdmFsdWUocykgdGhhdCB0aGUgb2JqZWN0IGNvbnRhaW5zIGZvciB0aGUgY3VycmVudGx5IGFzc2lnbmVkIHBhdGggc3RyaW5nLlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIGV2YWx1YXRlIHRoZSBwYXRoIGFnYWluc3QuXG4gKiBAcGFyYW0ge1N0cmluZz19IHBhdGggQSBwYXRoIHRvIHVzZSBpbnN0ZWFkIG9mIHRoZSBleGlzdGluZyBvbmUgcGFzc2VkIGluIHBhdGgoKS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQW4gYXJyYXkgb2YgdmFsdWVzIGZvciB0aGUgZ2l2ZW4gcGF0aC5cbiAqL1xuUGF0aC5wcm90b3R5cGUudmFsdWUgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG5cdGlmIChvYmogIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuXHRcdHZhciBwYXRoUGFydHMsXG5cdFx0XHRhcnIsXG5cdFx0XHRhcnJDb3VudCxcblx0XHRcdG9ialBhcnQsXG5cdFx0XHRvYmpQYXJ0UGFyZW50LFxuXHRcdFx0dmFsdWVzQXJyID0gW10sXG5cdFx0XHRpLCBrO1xuXG5cdFx0aWYgKHBhdGggIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cGF0aCA9IHRoaXMuY2xlYW4ocGF0aCk7XG5cdFx0XHRwYXRoUGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG5cdFx0fVxuXG5cdFx0YXJyID0gcGF0aFBhcnRzIHx8IHRoaXMuX3BhdGhQYXJ0cztcblx0XHRhcnJDb3VudCA9IGFyci5sZW5ndGg7XG5cdFx0b2JqUGFydCA9IG9iajtcblxuXHRcdGZvciAoaSA9IDA7IGkgPCBhcnJDb3VudDsgaSsrKSB7XG5cdFx0XHRvYmpQYXJ0ID0gb2JqUGFydFthcnJbaV1dO1xuXG5cdFx0XHRpZiAob2JqUGFydFBhcmVudCBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdC8vIFNlYXJjaCBpbnNpZGUgdGhlIGFycmF5IGZvciB0aGUgbmV4dCBrZXlcblx0XHRcdFx0Zm9yIChrID0gMDsgayA8IG9ialBhcnRQYXJlbnQubGVuZ3RoOyBrKyspIHtcblx0XHRcdFx0XHR2YWx1ZXNBcnIgPSB2YWx1ZXNBcnIuY29uY2F0KHRoaXMudmFsdWUob2JqUGFydFBhcmVudCwgayArICcuJyArIGFycltpXSkpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIHZhbHVlc0Fycjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICghb2JqUGFydCB8fCB0eXBlb2Yob2JqUGFydCkgIT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0b2JqUGFydFBhcmVudCA9IG9ialBhcnQ7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFtvYmpQYXJ0XTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gW107XG5cdH1cbn07XG5cbi8qKlxuICogU2V0cyBhIHZhbHVlIG9uIGFuIG9iamVjdCBmb3IgdGhlIHNwZWNpZmllZCBwYXRoLlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7Kn0gdmFsIFRoZSB2YWx1ZSB0byBzZXQgdGhlIG9iamVjdCBwYXRoIHRvLlxuICogQHJldHVybnMgeyp9XG4gKi9cblBhdGgucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbCkge1xuXHRpZiAob2JqICE9PSB1bmRlZmluZWQgJiYgcGF0aCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dmFyIHBhdGhQYXJ0cyxcblx0XHRcdHBhcnQ7XG5cblx0XHRwYXRoID0gdGhpcy5jbGVhbihwYXRoKTtcblx0XHRwYXRoUGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG5cblx0XHRwYXJ0ID0gcGF0aFBhcnRzLnNoaWZ0KCk7XG5cblx0XHRpZiAocGF0aFBhcnRzLmxlbmd0aCkge1xuXHRcdFx0Ly8gR2VuZXJhdGUgdGhlIHBhdGggcGFydCBpbiB0aGUgb2JqZWN0IGlmIGl0IGRvZXMgbm90IGFscmVhZHkgZXhpc3Rcblx0XHRcdG9ialtwYXJ0XSA9IG9ialtwYXJ0XSB8fCB7fTtcblxuXHRcdFx0Ly8gUmVjdXJzZVxuXHRcdFx0dGhpcy5zZXQob2JqW3BhcnRdLCBwYXRoUGFydHMuam9pbignLicpLCB2YWwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBTZXQgdGhlIHZhbHVlXG5cdFx0XHRvYmpbcGFydF0gPSB2YWw7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG9iajtcbn07XG5cblBhdGgucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcblx0cmV0dXJuIHRoaXMudmFsdWUob2JqLCBwYXRoKVswXTtcbn07XG5cbi8qKlxuICogUHVzaCBhIHZhbHVlIHRvIGFuIGFycmF5IG9uIGFuIG9iamVjdCBmb3IgdGhlIHNwZWNpZmllZCBwYXRoLlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFRoZSBwYXRoIHRvIHRoZSBhcnJheSB0byBwdXNoIHRvLlxuICogQHBhcmFtIHsqfSB2YWwgVGhlIHZhbHVlIHRvIHB1c2ggdG8gdGhlIGFycmF5IGF0IHRoZSBvYmplY3QgcGF0aC5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5QYXRoLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsKSB7XG5cdGlmIChvYmogIT09IHVuZGVmaW5lZCAmJiBwYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHR2YXIgcGF0aFBhcnRzLFxuXHRcdFx0cGFydDtcblxuXHRcdHBhdGggPSB0aGlzLmNsZWFuKHBhdGgpO1xuXHRcdHBhdGhQYXJ0cyA9IHBhdGguc3BsaXQoJy4nKTtcblxuXHRcdHBhcnQgPSBwYXRoUGFydHMuc2hpZnQoKTtcblxuXHRcdGlmIChwYXRoUGFydHMubGVuZ3RoKSB7XG5cdFx0XHQvLyBHZW5lcmF0ZSB0aGUgcGF0aCBwYXJ0IGluIHRoZSBvYmplY3QgaWYgaXQgZG9lcyBub3QgYWxyZWFkeSBleGlzdFxuXHRcdFx0b2JqW3BhcnRdID0gb2JqW3BhcnRdIHx8IHt9O1xuXG5cdFx0XHQvLyBSZWN1cnNlXG5cdFx0XHR0aGlzLnNldChvYmpbcGFydF0sIHBhdGhQYXJ0cy5qb2luKCcuJyksIHZhbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIFNldCB0aGUgdmFsdWVcblx0XHRcdG9ialtwYXJ0XSA9IG9ialtwYXJ0XSB8fCBbXTtcblxuXHRcdFx0aWYgKG9ialtwYXJ0XSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cdFx0XHRcdG9ialtwYXJ0XS5wdXNoKHZhbCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdygnQ2Fubm90IHB1c2ggdG8gYSBwYXRoIHdob3NlIGVuZHBvaW50IGlzIG5vdCBhbiBhcnJheSEnKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gb2JqO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSB2YWx1ZShzKSB0aGF0IHRoZSBvYmplY3QgY29udGFpbnMgZm9yIHRoZSBjdXJyZW50bHkgYXNzaWduZWQgcGF0aCBzdHJpbmdcbiAqIHdpdGggdGhlaXIgYXNzb2NpYXRlZCBrZXlzLlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIGV2YWx1YXRlIHRoZSBwYXRoIGFnYWluc3QuXG4gKiBAcGFyYW0ge1N0cmluZz19IHBhdGggQSBwYXRoIHRvIHVzZSBpbnN0ZWFkIG9mIHRoZSBleGlzdGluZyBvbmUgcGFzc2VkIGluIHBhdGgoKS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQW4gYXJyYXkgb2YgdmFsdWVzIGZvciB0aGUgZ2l2ZW4gcGF0aCB3aXRoIHRoZSBhc3NvY2lhdGVkIGtleS5cbiAqL1xuUGF0aC5wcm90b3R5cGUua2V5VmFsdWUgPSBmdW5jdGlvbiAob2JqLCBwYXRoKSB7XG5cdHZhciBwYXRoUGFydHMsXG5cdFx0YXJyLFxuXHRcdGFyckNvdW50LFxuXHRcdG9ialBhcnQsXG5cdFx0b2JqUGFydFBhcmVudCxcblx0XHRvYmpQYXJ0SGFzaCxcblx0XHRpO1xuXG5cdGlmIChwYXRoICE9PSB1bmRlZmluZWQpIHtcblx0XHRwYXRoID0gdGhpcy5jbGVhbihwYXRoKTtcblx0XHRwYXRoUGFydHMgPSBwYXRoLnNwbGl0KCcuJyk7XG5cdH1cblxuXHRhcnIgPSBwYXRoUGFydHMgfHwgdGhpcy5fcGF0aFBhcnRzO1xuXHRhcnJDb3VudCA9IGFyci5sZW5ndGg7XG5cdG9ialBhcnQgPSBvYmo7XG5cblx0Zm9yIChpID0gMDsgaSA8IGFyckNvdW50OyBpKyspIHtcblx0XHRvYmpQYXJ0ID0gb2JqUGFydFthcnJbaV1dO1xuXG5cdFx0aWYgKCFvYmpQYXJ0IHx8IHR5cGVvZihvYmpQYXJ0KSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdG9ialBhcnRIYXNoID0gYXJyW2ldICsgJzonICsgb2JqUGFydDtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdG9ialBhcnRQYXJlbnQgPSBvYmpQYXJ0O1xuXHR9XG5cblx0cmV0dXJuIG9ialBhcnRIYXNoO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGxlYWRpbmcgcGVyaW9kICguKSBmcm9tIHN0cmluZyBhbmQgcmV0dXJucyBpdC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIHN0cmluZyB0byBjbGVhbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5QYXRoLnByb3RvdHlwZS5jbGVhbiA9IGZ1bmN0aW9uIChzdHIpIHtcblx0aWYgKHN0ci5zdWJzdHIoMCwgMSkgPT09ICcuJykge1xuXHRcdHN0ciA9IHN0ci5zdWJzdHIoMSwgc3RyLmxlbmd0aCAtMSk7XG5cdH1cblxuXHRyZXR1cm4gc3RyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQYXRoOyIsIi8vIEltcG9ydCBleHRlcm5hbCBuYW1lcyBsb2NhbGx5XG52YXIgU2hhcmVkID0gcmVxdWlyZSgnLi9TaGFyZWQnKSxcblx0Q29yZSxcblx0Q29sbGVjdGlvbixcblx0Q29sbGVjdGlvbkRyb3AsXG5cdENvbGxlY3Rpb25Hcm91cCxcblx0Q29sbGVjdGlvbkluaXQsXG5cdENvcmVJbml0LFxuXHRPdmVybG9hZCxcblx0UGVyc2lzdDtcblxuUGVyc2lzdCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5pbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5QZXJzaXN0LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGRiKSB7XG5cdC8vIENoZWNrIGVudmlyb25tZW50XG5cdGlmIChkYi5pc0NsaWVudCgpKSB7XG5cdFx0aWYgKFN0b3JhZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5tb2RlKCdsb2NhbFN0b3JhZ2UnKTtcblx0XHR9XG5cdH1cbn07XG5cblNoYXJlZC5tb2R1bGVzLlBlcnNpc3QgPSBQZXJzaXN0O1xuXG5Db3JlID0gU2hhcmVkLm1vZHVsZXMuQ29yZTtcbkNvbGxlY3Rpb24gPSByZXF1aXJlKCcuL0NvbGxlY3Rpb24nKTtcbkNvbGxlY3Rpb25Ecm9wID0gQ29sbGVjdGlvbi5wcm90b3R5cGUuZHJvcDtcbkNvbGxlY3Rpb25Hcm91cCA9IHJlcXVpcmUoJy4vQ29sbGVjdGlvbkdyb3VwJyk7XG5Db2xsZWN0aW9uSW5pdCA9IENvbGxlY3Rpb24ucHJvdG90eXBlLmluaXQ7XG5PdmVybG9hZCA9IHJlcXVpcmUoJy4vT3ZlcmxvYWQnKTtcbkNvcmVJbml0ID0gQ29yZS5wcm90b3R5cGUuaW5pdDtcblxuUGVyc2lzdC5wcm90b3R5cGUubW9kZSA9IGZ1bmN0aW9uICh0eXBlKSB7XG5cdGlmICh0eXBlICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9tb2RlID0gdHlwZTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdHJldHVybiB0aGlzLl9tb2RlO1xufTtcblxuUGVyc2lzdC5wcm90b3R5cGUuc2F2ZSA9IGZ1bmN0aW9uIChrZXksIGRhdGEsIGNhbGxiYWNrKSB7XG5cdHZhciB2YWw7XG5cblx0c3dpdGNoICh0aGlzLm1vZGUoKSkge1xuXHRcdGNhc2UgJ2xvY2FsU3RvcmFnZSc6XG5cdFx0XHRpZiAodHlwZW9mIGRhdGEgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRcdHZhbCA9ICdqc29uOjpmZGI6OicgKyBKU09OLnN0cmluZ2lmeShkYXRhKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbCA9ICdyYXc6OmZkYjo6JyArIGRhdGE7XG5cdFx0XHR9XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKGUpOyB9XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjayhmYWxzZSk7IH1cblx0XHRcdGJyZWFrO1xuXHR9XG5cblx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCdObyBkYXRhIGhhbmRsZXIuJyk7IH1cbn07XG5cblBlcnNpc3QucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbiAoa2V5LCBjYWxsYmFjaykge1xuXHR2YXIgdmFsLFxuXHRcdHBhcnRzLFxuXHRcdGRhdGE7XG5cblx0c3dpdGNoICh0aGlzLm1vZGUoKSkge1xuXHRcdGNhc2UgJ2xvY2FsU3RvcmFnZSc6XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR2YWwgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRjYWxsYmFjayhlLCBudWxsKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHZhbCkge1xuXHRcdFx0XHRwYXJ0cyA9IHZhbC5zcGxpdCgnOjpmZGI6OicpO1xuXG5cdFx0XHRcdHN3aXRjaCAocGFydHNbMF0pIHtcblx0XHRcdFx0XHRjYXNlICdqc29uJzpcblx0XHRcdFx0XHRcdGRhdGEgPSBKU09OLnBhcnNlKHBhcnRzWzFdKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Y2FzZSAncmF3Jzpcblx0XHRcdFx0XHRcdGRhdGEgPSBwYXJ0c1sxXTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKGZhbHNlLCBkYXRhKTsgfVxuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soJ05vIGRhdGEgaGFuZGxlciBvciB1bnJlY29nbmlzZWQgZGF0YSB0eXBlLicpOyB9XG59O1xuXG5QZXJzaXN0LnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKGtleSwgY2FsbGJhY2spIHtcblx0c3dpdGNoICh0aGlzLm1vZGUoKSkge1xuXHRcdGNhc2UgJ2xvY2FsU3RvcmFnZSc6XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soZSk7IH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKGZhbHNlKTsgfVxuXHRcdFx0YnJlYWs7XG5cdH1cblxuXHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soJ05vIGRhdGEgaGFuZGxlciBvciB1bnJlY29nbmlzZWQgZGF0YSB0eXBlLicpOyB9XG59O1xuXG4vLyBFeHRlbmQgdGhlIENvbGxlY3Rpb24gcHJvdG90eXBlIHdpdGggcGVyc2lzdCBtZXRob2RzXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5kcm9wID0gZnVuY3Rpb24gKHJlbW92ZVBlcnNpc3RlbnQpIHtcblx0Ly8gUmVtb3ZlIHBlcnNpc3RlbnQgc3RvcmFnZVxuXHRpZiAocmVtb3ZlUGVyc2lzdGVudCkge1xuXHRcdGlmICh0aGlzLl9uYW1lKSB7XG5cdFx0XHRpZiAodGhpcy5fZGIpIHtcblx0XHRcdFx0Ly8gU2F2ZSB0aGUgY29sbGVjdGlvbiBkYXRhXG5cdFx0XHRcdHRoaXMuX2RiLnBlcnNpc3QuZHJvcCh0aGlzLl9uYW1lKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygnQ2Fubm90IGRyb3AgYSBjb2xsZWN0aW9uXFwncyBwZXJzaXN0ZW50IHN0b3JhZ2Ugd2hlbiB0aGUgY29sbGVjdGlvbiBpcyBub3QgYXR0YWNoZWQgdG8gYSBkYXRhYmFzZSEnKTsgfVxuXHRcdFx0XHRyZXR1cm4gJ0Nhbm5vdCBkcm9wIGEgY29sbGVjdGlvblxcJ3MgcGVyc2lzdGVudCBzdG9yYWdlIHdoZW4gdGhlIGNvbGxlY3Rpb24gaXMgbm90IGF0dGFjaGVkIHRvIGEgZGF0YWJhc2UhJztcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKGNhbGxiYWNrKSB7IGNhbGxiYWNrKCdDYW5ub3QgZHJvcCBhIGNvbGxlY3Rpb25cXCdzIHBlcnNpc3RlbnQgc3RvcmFnZSB3aGVuIG5vIG5hbWUgYXNzaWduZWQgdG8gY29sbGVjdGlvbiEnKTsgfVxuXHRcdFx0cmV0dXJuICdDYW5ub3QgZHJvcCBhIGNvbGxlY3Rpb25cXCdzIHBlcnNpc3RlbnQgc3RvcmFnZSB3aGVuIG5vIG5hbWUgYXNzaWduZWQgdG8gY29sbGVjdGlvbiEnO1xuXHRcdH1cblx0fVxuXG5cdC8vIENhbGwgdGhlIG9yaWdpbmFsIG1ldGhvZFxuXHRDb2xsZWN0aW9uRHJvcC5hcHBseSh0aGlzKTtcbn07XG5cbkNvbGxlY3Rpb24ucHJvdG90eXBlLnNhdmUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblx0aWYgKHRoaXMuX25hbWUpIHtcblx0XHRpZiAodGhpcy5fZGIpIHtcblx0XHRcdC8vIFNhdmUgdGhlIGNvbGxlY3Rpb24gZGF0YVxuXHRcdFx0dGhpcy5fZGIucGVyc2lzdC5zYXZlKHRoaXMuX25hbWUsIHRoaXMuX2RhdGEpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soJ0Nhbm5vdCBzYXZlIGEgY29sbGVjdGlvbiB0aGF0IGlzIG5vdCBhdHRhY2hlZCB0byBhIGRhdGFiYXNlIScpOyB9XG5cdFx0XHRyZXR1cm4gJ0Nhbm5vdCBzYXZlIGEgY29sbGVjdGlvbiB0aGF0IGlzIG5vdCBhdHRhY2hlZCB0byBhIGRhdGFiYXNlISc7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygnQ2Fubm90IHNhdmUgYSBjb2xsZWN0aW9uIHdpdGggbm8gYXNzaWduZWQgbmFtZSEnKTsgfVxuXHRcdHJldHVybiAnQ2Fubm90IHNhdmUgYSBjb2xsZWN0aW9uIHdpdGggbm8gYXNzaWduZWQgbmFtZSEnO1xuXHR9XG59O1xuXG5Db2xsZWN0aW9uLnByb3RvdHlwZS5sb2FkID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cdHZhciBzZWxmID0gdGhpcztcblxuXHRpZiAodGhpcy5fbmFtZSkge1xuXHRcdGlmICh0aGlzLl9kYikge1xuXHRcdFx0Ly8gTG9hZCB0aGUgY29sbGVjdGlvbiBkYXRhXG5cdFx0XHR0aGlzLl9kYi5wZXJzaXN0LmxvYWQodGhpcy5fbmFtZSwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuXHRcdFx0XHRpZiAoIWVycikge1xuXHRcdFx0XHRcdGlmIChkYXRhKSB7XG5cdFx0XHRcdFx0XHRzZWxmLnNldERhdGEoZGF0YSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjayhmYWxzZSk7IH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soZXJyKTsgfVxuXHRcdFx0XHRcdHJldHVybiBlcnI7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoY2FsbGJhY2spIHsgY2FsbGJhY2soJ0Nhbm5vdCBsb2FkIGEgY29sbGVjdGlvbiB0aGF0IGlzIG5vdCBhdHRhY2hlZCB0byBhIGRhdGFiYXNlIScpOyB9XG5cdFx0XHRyZXR1cm4gJ0Nhbm5vdCBsb2FkIGEgY29sbGVjdGlvbiB0aGF0IGlzIG5vdCBhdHRhY2hlZCB0byBhIGRhdGFiYXNlISc7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGlmIChjYWxsYmFjaykgeyBjYWxsYmFjaygnQ2Fubm90IGxvYWQgYSBjb2xsZWN0aW9uIHdpdGggbm8gYXNzaWduZWQgbmFtZSEnKTsgfVxuXHRcdHJldHVybiAnQ2Fubm90IGxvYWQgYSBjb2xsZWN0aW9uIHdpdGggbm8gYXNzaWduZWQgbmFtZSEnO1xuXHR9XG59O1xuXG4vLyBPdmVycmlkZSB0aGUgREIgaW5pdCB0byBpbnN0YW50aWF0ZSB0aGUgcGx1Z2luXG5Db3JlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLnBlcnNpc3QgPSBuZXcgUGVyc2lzdCh0aGlzKTtcblx0Q29yZUluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGVyc2lzdDsiLCJ2YXIgU2hhcmVkID0ge1xuXHRpZENvdW50ZXI6IDAsXG5cdG1vZHVsZXM6IHt9LFxuXHRwcm90b3R5cGVzOiB7fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTaGFyZWQ7IiwiLy8gSW1wb3J0IGV4dGVybmFsIG5hbWVzIGxvY2FsbHlcbnZhciBTaGFyZWQsXG5cdENvcmUsXG5cdENvbGxlY3Rpb24sXG5cdENvbGxlY3Rpb25Jbml0LFxuXHRDb3JlSW5pdCxcblx0T3ZlcmxvYWQ7XG5cblNoYXJlZCA9IHJlcXVpcmUoJy4vU2hhcmVkJyk7XG5cbi8qKlxuICogVGhlIHZpZXcgY29uc3RydWN0b3IuXG4gKiBAcGFyYW0gdmlld05hbWVcbiAqIEBjb25zdHJ1Y3RvclxuICovXG52YXIgVmlldyA9IGZ1bmN0aW9uIChuYW1lLCBxdWVyeSwgb3B0aW9ucykge1xuXHR0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cblZpZXcucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAobmFtZSwgcXVlcnksIG9wdGlvbnMpIHtcblx0dGhpcy5fbmFtZSA9IG5hbWU7XG5cdHRoaXMuX2NvbGxlY3Rpb25zID0gW107XG5cdHRoaXMuX2dyb3VwcyA9IFtdO1xuXHR0aGlzLl9saXN0ZW5lcnMgPSB7fTtcblx0dGhpcy5fcXVlcnlTZXR0aW5ncyA9IHtcblx0XHRxdWVyeTogcXVlcnksXG5cdFx0b3B0aW9uczogb3B0aW9uc1xuXHR9O1xuXHR0aGlzLl9kZWJ1ZyA9IHt9O1xuXG5cdHRoaXMuX3ByaXZhdGVEYXRhID0gbmV3IENvbGxlY3Rpb24oJ19fRkRCX192aWV3X3ByaXZhdGVEYXRhXycgKyB0aGlzLl9uYW1lKTtcbn07XG5cblNoYXJlZC5tb2R1bGVzLlZpZXcgPSBWaWV3O1xuXG5Db2xsZWN0aW9uID0gcmVxdWlyZSgnLi9Db2xsZWN0aW9uJyk7XG5PdmVybG9hZCA9IHJlcXVpcmUoJy4vT3ZlcmxvYWQnKTtcbkNvbGxlY3Rpb25Jbml0ID0gQ29sbGVjdGlvbi5wcm90b3R5cGUuaW5pdDtcbkNvcmUgPSBTaGFyZWQubW9kdWxlcy5Db3JlO1xuQ29yZUluaXQgPSBDb3JlLnByb3RvdHlwZS5pbml0O1xuXG5WaWV3LnByb3RvdHlwZS5kZWJ1ZyA9IG5ldyBPdmVybG9hZChbXG5cdGZ1bmN0aW9uICgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZGVidWcuYWxsO1xuXHR9LFxuXG5cdGZ1bmN0aW9uICh2YWwpIHtcblx0XHRpZiAodmFsICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmICh0eXBlb2YgdmFsID09PSAnYm9vbGVhbicpIHtcblx0XHRcdFx0dGhpcy5fZGVidWcuYWxsID0gdmFsO1xuXHRcdFx0XHR0aGlzLnByaXZhdGVEYXRhKCkuZGVidWcodmFsKTtcblx0XHRcdFx0dGhpcy5wdWJsaWNEYXRhKCkuZGVidWcodmFsKTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5fZGVidWcuYWxsO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLl9kZWJ1Zy5hbGw7XG5cdH0sXG5cblx0ZnVuY3Rpb24gKHR5cGUsIHZhbCkge1xuXHRcdGlmICh0eXBlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHR0aGlzLl9kZWJ1Z1t0eXBlXSA9IHZhbDtcblx0XHRcdFx0dGhpcy5wcml2YXRlRGF0YSgpLmRlYnVnKHR5cGUsIHZhbCk7XG5cdFx0XHRcdHRoaXMucHVibGljRGF0YSgpLmRlYnVnKHR5cGUsIHZhbCk7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5fZGVidWdbdHlwZV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuX2RlYnVnLmFsbDtcblx0fVxuXSk7XG5cblZpZXcucHJvdG90eXBlLm5hbWUgPSBmdW5jdGlvbiAodmFsKSB7XG5cdGlmICh2YWwgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX25hbWUgPSB2YWw7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fbmFtZTtcbn07XG5cbi8qKlxuICogUXVlcmllcyB0aGUgdmlldyBkYXRhLiBTZWUgQ29sbGVjdGlvbi5maW5kKCkgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuVmlldy5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChxdWVyeSwgb3B0aW9ucykge1xuXHRyZXR1cm4gdGhpcy5wdWJsaWNEYXRhKCkuZmluZChxdWVyeSwgb3B0aW9ucyk7XG59O1xuXG4vKipcbiAqIEluc2VydHMgaW50byB2aWV3IGRhdGEgdmlhIHRoZSB2aWV3IGNvbGxlY3Rpb24uIFNlZSBDb2xsZWN0aW9uLmluc2VydCgpIGZvciBtb3JlIGluZm9ybWF0aW9uLlxuICogQHJldHVybnMgeyp9XG4gKi9cblZpZXcucHJvdG90eXBlLmluc2VydCA9IGZ1bmN0aW9uIChkYXRhLCBpbmRleCwgY2FsbGJhY2spIHtcblx0Ly8gRGVjb3VwbGUgdGhlIGRhdGEgdG8gZW5zdXJlIHdlIGFyZSB3b3JraW5nIHdpdGggb3VyIG93biBjb3B5XG5cdGRhdGEgPSB0aGlzLl9wcml2YXRlRGF0YS5kZWNvdXBsZShkYXRhKTtcblxuXHRpZiAodHlwZW9mKGluZGV4KSA9PT0gJ2Z1bmN0aW9uJykge1xuXHRcdGNhbGxiYWNrID0gaW5kZXg7XG5cdFx0aW5kZXggPSB0aGlzLl9wcml2YXRlRGF0YS5sZW5ndGg7XG5cdH0gZWxzZSBpZiAoaW5kZXggPT09IHVuZGVmaW5lZCkge1xuXHRcdGluZGV4ID0gdGhpcy5fcHJpdmF0ZURhdGEubGVuZ3RoO1xuXHR9XG5cblx0Ly8gTW9kaWZ5IHRyYW5zZm9ybSBkYXRhXG5cdHRoaXMuX3RyYW5zZm9ybUluc2VydChkYXRhLCBpbmRleCk7XG5cblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuVmlldzogSW5zZXJ0aW5nIHNvbWUgZGF0YSBvbiB2aWV3IFwiJyArIHRoaXMubmFtZSgpICsgJ1wiIGluIHVuZGVybHlpbmcgKGludGVybmFsKSB2aWV3IGNvbGxlY3Rpb24gXCInICsgdGhpcy5fcHJpdmF0ZURhdGEubmFtZSgpICsgJ1wiJyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcHJpdmF0ZURhdGEuX2luc2VydEhhbmRsZShkYXRhLCBpbmRleCwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIGludG8gdmlldyBkYXRhIHZpYSB0aGUgdmlldyBjb2xsZWN0aW9uLiBTZWUgQ29sbGVjdGlvbi51cGRhdGUoKSBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5WaWV3LnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAocXVlcnksIHVwZGF0ZSkge1xuXHQvLyBNb2RpZnkgdHJhbnNmb3JtIGRhdGFcblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuVmlldzogVXBkYXRpbmcgc29tZSBkYXRhIG9uIHZpZXcgXCInICsgdGhpcy5uYW1lKCkgKyAnXCIgaW4gdW5kZXJseWluZyAoaW50ZXJuYWwpIHZpZXcgY29sbGVjdGlvbiBcIicgKyB0aGlzLl9wcml2YXRlRGF0YS5uYW1lKCkgKyAnXCInKTtcblx0fVxuXG5cdHZhciB1cGRhdGVzID0gdGhpcy5fcHJpdmF0ZURhdGEudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpLFxuXHRcdHByaW1hcnlLZXksXG5cdFx0dFF1ZXJ5LFxuXHRcdGl0ZW07XG5cblx0aWYgKHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQgJiYgdGhpcy5fdHJhbnNmb3JtSW4pIHtcblx0XHRwcmltYXJ5S2V5ID0gdGhpcy5fcHVibGljRGF0YS5wcmltYXJ5S2V5KCk7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHVwZGF0ZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHRRdWVyeSA9IHt9O1xuXHRcdFx0aXRlbSA9IHVwZGF0ZXNbaV07XG5cdFx0XHR0UXVlcnlbcHJpbWFyeUtleV0gPSBpdGVtW3ByaW1hcnlLZXldO1xuXG5cdFx0XHR0aGlzLl90cmFuc2Zvcm1VcGRhdGUodFF1ZXJ5LCBpdGVtKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdXBkYXRlcztcbn07XG5cbi8qKlxuICogUmVtb3ZlZCBmcm9tIHZpZXcgZGF0YSB2aWEgdGhlIHZpZXcgY29sbGVjdGlvbi4gU2VlIENvbGxlY3Rpb24ucmVtb3ZlKCkgZm9yIG1vcmUgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuVmlldy5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKHF1ZXJ5KSB7XG5cdC8vIE1vZGlmeSB0cmFuc2Zvcm0gZGF0YVxuXHR0aGlzLl90cmFuc2Zvcm1SZW1vdmUocXVlcnkpO1xuXG5cdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLlZpZXc6IFJlbW92aW5nIHNvbWUgZGF0YSBvbiB2aWV3IFwiJyArIHRoaXMubmFtZSgpICsgJ1wiIGluIHVuZGVybHlpbmcgKGludGVybmFsKSB2aWV3IGNvbGxlY3Rpb24gXCInICsgdGhpcy5fcHJpdmF0ZURhdGEubmFtZSgpICsgJ1wiJyk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcHJpdmF0ZURhdGEucmVtb3ZlKHF1ZXJ5KTtcbn07XG5cblZpZXcucHJvdG90eXBlLmxpbmsgPSBmdW5jdGlvbiAob3V0cHV0VGFyZ2V0U2VsZWN0b3IsIHRlbXBsYXRlU2VsZWN0b3IpIHtcblx0dmFyIHB1YmxpY0RhdGEgPSB0aGlzLnB1YmxpY0RhdGEoKTtcblx0aWYgKHRoaXMuZGVidWcoKSkge1xuXHRcdGNvbnNvbGUubG9nKCdGb3JlcnVubmVyREIuVmlldzogU2V0dGluZyB1cCBkYXRhIGJpbmRpbmcgb24gdmlldyBcIicgKyB0aGlzLm5hbWUoKSArICdcIiBpbiB1bmRlcmx5aW5nIChpbnRlcm5hbCkgdmlldyBjb2xsZWN0aW9uIFwiJyArIHB1YmxpY0RhdGEubmFtZSgpICsgJ1wiIGZvciBvdXRwdXQgdGFyZ2V0OiAnICsgb3V0cHV0VGFyZ2V0U2VsZWN0b3IpO1xuXHR9XG5cdHJldHVybiBwdWJsaWNEYXRhLmxpbmsob3V0cHV0VGFyZ2V0U2VsZWN0b3IsIHRlbXBsYXRlU2VsZWN0b3IpO1xufTtcblxuVmlldy5wcm90b3R5cGUudW5saW5rID0gZnVuY3Rpb24gKG91dHB1dFRhcmdldFNlbGVjdG9yLCB0ZW1wbGF0ZVNlbGVjdG9yKSB7XG5cdHZhciBwdWJsaWNEYXRhID0gdGhpcy5wdWJsaWNEYXRhKCk7XG5cdGlmICh0aGlzLmRlYnVnKCkpIHtcblx0XHRjb25zb2xlLmxvZygnRm9yZXJ1bm5lckRCLlZpZXc6IFJlbW92aW5nIGRhdGEgYmluZGluZyBvbiB2aWV3IFwiJyArIHRoaXMubmFtZSgpICsgJ1wiIGluIHVuZGVybHlpbmcgKGludGVybmFsKSB2aWV3IGNvbGxlY3Rpb24gXCInICsgcHVibGljRGF0YS5uYW1lKCkgKyAnXCIgZm9yIG91dHB1dCB0YXJnZXQ6ICcgKyBvdXRwdXRUYXJnZXRTZWxlY3Rvcik7XG5cdH1cblx0cmV0dXJuIHB1YmxpY0RhdGEudW5saW5rKG91dHB1dFRhcmdldFNlbGVjdG9yLCB0ZW1wbGF0ZVNlbGVjdG9yKTtcbn07XG5cblZpZXcucHJvdG90eXBlLmZyb20gPSBmdW5jdGlvbiAoY29sbGVjdGlvbikge1xuXHRpZiAoY29sbGVjdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0aWYgKHR5cGVvZihjb2xsZWN0aW9uKSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdGNvbGxlY3Rpb24gPSB0aGlzLl9kYi5jb2xsZWN0aW9uKGNvbGxlY3Rpb24pO1xuXHRcdH1cblxuXHRcdHRoaXMuX2FkZENvbGxlY3Rpb24oY29sbGVjdGlvbik7XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cblZpZXcucHJvdG90eXBlLl9hZGRDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcblx0aWYgKHRoaXMuX2NvbGxlY3Rpb25zLmluZGV4T2YoY29sbGVjdGlvbikgPT09IC0xKSB7XG5cdFx0dGhpcy5fY29sbGVjdGlvbnMucHVzaChjb2xsZWN0aW9uKTtcblx0XHRjb2xsZWN0aW9uLl9hZGRWaWV3KHRoaXMpO1xuXG5cdFx0dmFyIGNvbGxEYXRhID0gY29sbGVjdGlvbi5maW5kKHRoaXMuX3F1ZXJ5U2V0dGluZ3MucXVlcnksIHRoaXMuX3F1ZXJ5U2V0dGluZ3Mub3B0aW9ucyk7XG5cblx0XHR0aGlzLl90cmFuc2Zvcm1QcmltYXJ5S2V5KGNvbGxlY3Rpb24ucHJpbWFyeUtleSgpKTtcblx0XHR0aGlzLl90cmFuc2Zvcm1JbnNlcnQoY29sbERhdGEpO1xuXG5cdFx0dGhpcy5fcHJpdmF0ZURhdGEucHJpbWFyeUtleShjb2xsZWN0aW9uLnByaW1hcnlLZXkoKSk7XG5cdFx0dGhpcy5fcHJpdmF0ZURhdGEuaW5zZXJ0KGNvbGxEYXRhKTtcblx0fVxuXHRyZXR1cm4gdGhpcztcbn07XG5cblZpZXcucHJvdG90eXBlLl9yZW1vdmVDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb24pIHtcblx0dmFyIGNvbGxlY3Rpb25JbmRleCA9IHRoaXMuX2NvbGxlY3Rpb25zLmluZGV4T2YoY29sbGVjdGlvbik7XG5cdGlmIChjb2xsZWN0aW9uSW5kZXggPiAtMSkge1xuXHRcdHRoaXMuX2NvbGxlY3Rpb25zLnNwbGljZShjb2xsZWN0aW9uLCAxKTtcblx0XHRjb2xsZWN0aW9uLl9yZW1vdmVWaWV3KHRoaXMpO1xuXHRcdHRoaXMuX3ByaXZhdGVEYXRhLnJlbW92ZShjb2xsZWN0aW9uLmZpbmQodGhpcy5fcXVlcnlTZXR0aW5ncy5xdWVyeSwgdGhpcy5fcXVlcnlTZXR0aW5ncy5vcHRpb25zKSk7XG5cdH1cblxuXHRyZXR1cm4gdGhpcztcbn07XG5cblZpZXcucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl9wcml2YXRlRGF0YS5vbi5hcHBseSh0aGlzLl9wcml2YXRlRGF0YSwgYXJndW1lbnRzKTtcbn07XG5cblZpZXcucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fcHJpdmF0ZURhdGEub2ZmLmFwcGx5KHRoaXMuX3ByaXZhdGVEYXRhLCBhcmd1bWVudHMpO1xufTtcblxuVmlldy5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uICgpIHtcblx0dGhpcy5fcHJpdmF0ZURhdGEuZW1pdC5hcHBseSh0aGlzLl9wcml2YXRlRGF0YSwgYXJndW1lbnRzKTtcbn07XG5cbi8qKlxuICogRHJvcHMgYSB2aWV3IGFuZCBhbGwgaXQncyBzdG9yZWQgZGF0YSBmcm9tIHRoZSBkYXRhYmFzZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIG9uIHN1Y2Nlc3MsIGZhbHNlIG9uIGZhaWx1cmUuXG4gKi9cblZpZXcucHJvdG90eXBlLmRyb3AgPSBmdW5jdGlvbiAoKSB7XG5cdGlmICh0aGlzLl9jb2xsZWN0aW9ucyAmJiB0aGlzLl9jb2xsZWN0aW9ucy5sZW5ndGgpIHtcblx0XHRpZiAodGhpcy5kZWJ1ZygpIHx8ICh0aGlzLl9kYiAmJiB0aGlzLl9kYi5kZWJ1ZygpKSkge1xuXHRcdFx0Y29uc29sZS5sb2coJ0ZvcmVydW5uZXJEQi5WaWV3OiBEcm9wcGluZyB2aWV3ICcgKyB0aGlzLl9uYW1lKTtcblx0XHR9XG5cblx0XHR0aGlzLmVtaXQoJ2Ryb3AnKTtcblxuXHRcdC8vIExvb3AgY29sbGVjdGlvbnMgYW5kIHJlbW92ZSB1cyBmcm9tIHRoZW1cblx0XHR2YXIgYXJyQ291bnQgPSB0aGlzLl9jb2xsZWN0aW9ucy5sZW5ndGg7XG5cdFx0d2hpbGUgKGFyckNvdW50LS0pIHtcblx0XHRcdHRoaXMuX3JlbW92ZUNvbGxlY3Rpb24odGhpcy5fY29sbGVjdGlvbnNbYXJyQ291bnRdKTtcblx0XHR9XG5cblx0XHQvLyBEcm9wIHRoZSB2aWV3J3MgaW50ZXJuYWwgY29sbGVjdGlvblxuXHRcdHRoaXMuX3ByaXZhdGVEYXRhLmRyb3AoKTtcblxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0cmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBHZXRzIC8gc2V0cyB0aGUgREIgdGhlIHZpZXcgaXMgYm91bmQgYWdhaW5zdC4gQXV0b21hdGljYWxseSBzZXRcbiAqIHdoZW4gdGhlIGRiLm9sZFZpZXcodmlld05hbWUpIG1ldGhvZCBpcyBjYWxsZWQuXG4gKiBAcGFyYW0gZGJcbiAqIEByZXR1cm5zIHsqfVxuICovXG5WaWV3LnByb3RvdHlwZS5kYiA9IGZ1bmN0aW9uIChkYikge1xuXHRpZiAoZGIgIT09IHVuZGVmaW5lZCkge1xuXHRcdHRoaXMuX2RiID0gZGI7XG5cdFx0dGhpcy5wcml2YXRlRGF0YSgpLmRiKGRiKTtcblx0XHR0aGlzLnB1YmxpY0RhdGEoKS5kYihkYik7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fZGI7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHByaW1hcnkga2V5IGZvciB0aGlzIHZpZXcgZnJvbSB0aGUgYXNzaWduZWQgY29sbGVjdGlvbi5cbiAqIEByZXR1cm5zIHtTdHJpbmd9XG4gKi9cblZpZXcucHJvdG90eXBlLnByaW1hcnlLZXkgPSBmdW5jdGlvbiAoKSB7XG5cdHJldHVybiB0aGlzLl9wcml2YXRlRGF0YS5wcmltYXJ5S2V5KCk7XG59O1xuXG4vKipcbiAqIEdldHMgLyBzZXRzIHRoZSBxdWVyeSB0aGF0IHRoZSB2aWV3IHVzZXMgdG8gYnVpbGQgaXQncyBkYXRhIHNldC5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcnlcbiAqIEBwYXJhbSB7Qm9vbGVhbj19IG9wdGlvbnMgQW4gb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW49fSByZWZyZXNoIFdoZXRoZXIgdG8gcmVmcmVzaCB0aGUgdmlldyBkYXRhIGFmdGVyXG4gKiB0aGlzIG9wZXJhdGlvbi4gRGVmYXVsdHMgdG8gdHJ1ZS5cbiAqIEByZXR1cm5zIHsqfVxuICovXG5WaWV3LnByb3RvdHlwZS5xdWVyeURhdGEgPSBmdW5jdGlvbiAocXVlcnksIG9wdGlvbnMsIHJlZnJlc2gpIHtcblx0aWYgKHF1ZXJ5ICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9xdWVyeVNldHRpbmdzLnF1ZXJ5ID0gcXVlcnk7XG5cdH1cblxuXHRpZiAob3B0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcXVlcnlTZXR0aW5ncy5vcHRpb25zID0gb3B0aW9ucztcblx0fVxuXG5cdGlmIChxdWVyeSAhPT0gdW5kZWZpbmVkIHx8IG9wdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuXHRcdGlmIChyZWZyZXNoID09PSB1bmRlZmluZWQgfHwgcmVmcmVzaCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5yZWZyZXNoKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcXVlcnlTZXR0aW5ncztcbn07XG5cbi8qKlxuICogQWRkIGRhdGEgdG8gdGhlIGV4aXN0aW5nIHF1ZXJ5LlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgZGF0YSB3aG9zZSBrZXlzIHdpbGwgYmUgYWRkZWQgdG8gdGhlIGV4aXN0aW5nXG4gKiBxdWVyeSBvYmplY3QuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IG92ZXJ3cml0ZSBXaGV0aGVyIG9yIG5vdCB0byBvdmVyd3JpdGUgZGF0YSB0aGF0IGFscmVhZHlcbiAqIGV4aXN0cyBpbiB0aGUgcXVlcnkgb2JqZWN0LiBEZWZhdWx0cyB0byB0cnVlLlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIG9yIG5vdCB0byByZWZyZXNoIHRoZSB2aWV3IGRhdGEgc2V0XG4gKiBvbmNlIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGUuIERlZmF1bHRzIHRvIHRydWUuXG4gKi9cblZpZXcucHJvdG90eXBlLnF1ZXJ5QWRkID0gZnVuY3Rpb24gKG9iaiwgb3ZlcndyaXRlLCByZWZyZXNoKSB7XG5cdHZhciBxdWVyeSA9IHRoaXMuX3F1ZXJ5U2V0dGluZ3MucXVlcnksXG5cdFx0aTtcblxuXHRpZiAob2JqICE9PSB1bmRlZmluZWQpIHtcblx0XHQvLyBMb29wIG9iamVjdCBwcm9wZXJ0aWVzIGFuZCBhZGQgdG8gZXhpc3RpbmcgcXVlcnlcblx0XHRmb3IgKGkgaW4gb2JqKSB7XG5cdFx0XHRpZiAob2JqLmhhc093blByb3BlcnR5KGkpKSB7XG5cdFx0XHRcdGlmIChxdWVyeVtpXSA9PT0gdW5kZWZpbmVkIHx8IChxdWVyeVtpXSAhPT0gdW5kZWZpbmVkICYmIG92ZXJ3cml0ZSkpIHtcblx0XHRcdFx0XHRxdWVyeVtpXSA9IG9ialtpXTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGlmIChyZWZyZXNoID09PSB1bmRlZmluZWQgfHwgcmVmcmVzaCA9PT0gdHJ1ZSkge1xuXHRcdHRoaXMucmVmcmVzaCgpO1xuXHR9XG59O1xuXG4vKipcbiAqIFJlbW92ZSBkYXRhIGZyb20gdGhlIGV4aXN0aW5nIHF1ZXJ5LlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgZGF0YSB3aG9zZSBrZXlzIHdpbGwgYmUgcmVtb3ZlZCBmcm9tIHRoZSBleGlzdGluZ1xuICogcXVlcnkgb2JqZWN0LlxuICogQHBhcmFtIHtCb29sZWFuPX0gcmVmcmVzaCBXaGV0aGVyIG9yIG5vdCB0byByZWZyZXNoIHRoZSB2aWV3IGRhdGEgc2V0XG4gKiBvbmNlIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGUuIERlZmF1bHRzIHRvIHRydWUuXG4gKi9cblZpZXcucHJvdG90eXBlLnF1ZXJ5UmVtb3ZlID0gZnVuY3Rpb24gKG9iaiwgcmVmcmVzaCkge1xuXHR2YXIgcXVlcnkgPSB0aGlzLl9xdWVyeVNldHRpbmdzLnF1ZXJ5LFxuXHRcdGk7XG5cblx0aWYgKG9iaiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0Ly8gTG9vcCBvYmplY3QgcHJvcGVydGllcyBhbmQgYWRkIHRvIGV4aXN0aW5nIHF1ZXJ5XG5cdFx0Zm9yIChpIGluIG9iaikge1xuXHRcdFx0aWYgKG9iai5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0XHRkZWxldGUgcXVlcnlbaV07XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0dGhpcy5yZWZyZXNoKCk7XG5cdH1cbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIHF1ZXJ5IGJlaW5nIHVzZWQgdG8gZ2VuZXJhdGUgdGhlIHZpZXcgZGF0YS5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gcXVlcnkgVGhlIHF1ZXJ5IHRvIHNldC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj19IHJlZnJlc2ggV2hldGhlciB0byByZWZyZXNoIHRoZSB2aWV3IGRhdGEgYWZ0ZXJcbiAqIHRoaXMgb3BlcmF0aW9uLiBEZWZhdWx0cyB0byB0cnVlLlxuICogQHJldHVybnMgeyp9XG4gKi9cblZpZXcucHJvdG90eXBlLnF1ZXJ5ID0gZnVuY3Rpb24gKHF1ZXJ5LCByZWZyZXNoKSB7XG5cdGlmIChxdWVyeSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fcXVlcnlTZXR0aW5ncy5xdWVyeSA9IHF1ZXJ5O1xuXG5cdFx0aWYgKHJlZnJlc2ggPT09IHVuZGVmaW5lZCB8fCByZWZyZXNoID09PSB0cnVlKSB7XG5cdFx0XHR0aGlzLnJlZnJlc2goKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4gdGhpcy5fcXVlcnlTZXR0aW5ncy5xdWVyeTtcbn07XG5cbi8qKlxuICogR2V0cyAvIHNldHMgdGhlIHF1ZXJ5IG9wdGlvbnMgdXNlZCB3aGVuIGFwcGx5aW5nIHNvcnRpbmcgZXRjIHRvIHRoZVxuICogdmlldyBkYXRhIHNldC5cbiAqIEBwYXJhbSB7T2JqZWN0PX0gb3B0aW9ucyBBbiBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Qm9vbGVhbj19IHJlZnJlc2ggV2hldGhlciB0byByZWZyZXNoIHRoZSB2aWV3IGRhdGEgYWZ0ZXJcbiAqIHRoaXMgb3BlcmF0aW9uLiBEZWZhdWx0cyB0byB0cnVlLlxuICogQHJldHVybnMgeyp9XG4gKi9cblZpZXcucHJvdG90eXBlLnF1ZXJ5T3B0aW9ucyA9IGZ1bmN0aW9uIChvcHRpb25zLCByZWZyZXNoKSB7XG5cdGlmIChvcHRpb25zICE9PSB1bmRlZmluZWQpIHtcblx0XHR0aGlzLl9xdWVyeVNldHRpbmdzLm9wdGlvbnMgPSBvcHRpb25zO1xuXHRcdGlmIChvcHRpb25zLmRlY291cGxlID09PSB1bmRlZmluZWQpIHsgb3B0aW9ucy5kZWNvdXBsZSA9IHRydWU7IH1cblxuXHRcdGlmIChyZWZyZXNoID09PSB1bmRlZmluZWQgfHwgcmVmcmVzaCA9PT0gdHJ1ZSkge1xuXHRcdFx0dGhpcy5yZWZyZXNoKCk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0cmV0dXJuIHRoaXMuX3F1ZXJ5U2V0dGluZ3Mub3B0aW9ucztcbn07XG5cbi8qKlxuICogUmVmcmVzaGVzIHRoZSB2aWV3IGRhdGEgc3VjaCBhcyBvcmRlcmluZyBldGMuXG4gKi9cblZpZXcucHJvdG90eXBlLnJlZnJlc2ggPSBmdW5jdGlvbiAoZm9yY2UpIHtcblx0dmFyIHNvcnRlZERhdGEsXG5cdFx0Y29sbGVjdGlvbixcblx0XHRwdWJEYXRhID0gdGhpcy5wdWJsaWNEYXRhKCksXG5cdFx0aTtcblxuXHQvLyBSZS1ncmFiIGFsbCB0aGUgZGF0YSBmb3IgdGhlIHZpZXcgZnJvbSB0aGUgY29sbGVjdGlvbnNcblx0dGhpcy5fcHJpdmF0ZURhdGEucmVtb3ZlKCk7XG5cdHB1YkRhdGEucmVtb3ZlKCk7XG5cblx0Zm9yIChpID0gMDsgaSA8IHRoaXMuX2NvbGxlY3Rpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0Y29sbGVjdGlvbiA9IHRoaXMuX2NvbGxlY3Rpb25zW2ldO1xuXHRcdHRoaXMuX3ByaXZhdGVEYXRhLmluc2VydChjb2xsZWN0aW9uLmZpbmQodGhpcy5fcXVlcnlTZXR0aW5ncy5xdWVyeSwgdGhpcy5fcXVlcnlTZXR0aW5ncy5vcHRpb25zKSk7XG5cdH1cblxuXHRzb3J0ZWREYXRhID0gdGhpcy5fcHJpdmF0ZURhdGEuZmluZCh7fSwgdGhpcy5fcXVlcnlTZXR0aW5ncy5vcHRpb25zKTtcblxuXHRpZiAocHViRGF0YS5fbGlua2VkKSB7XG5cdFx0Ly8gVXBkYXRlIGRhdGEgYW5kIG9ic2VydmVyc1xuXHRcdC8vIFRPRE86IFNob3VsZG4ndCB0aGlzIGRhdGEgZ2V0IHBhc3NlZCBpbnRvIGEgdHJhbnNmb3JtSW4gZmlyc3Q/XG5cdFx0JC5vYnNlcnZhYmxlKHB1YkRhdGEuX2RhdGEpLnJlZnJlc2goc29ydGVkRGF0YSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gVXBkYXRlIHRoZSB1bmRlcmx5aW5nIGRhdGEgd2l0aCB0aGUgbmV3IHNvcnRlZCBkYXRhXG5cdFx0dGhpcy5fcHJpdmF0ZURhdGEuX2RhdGEubGVuZ3RoID0gMDtcblx0XHR0aGlzLl9wcml2YXRlRGF0YS5fZGF0YSA9IHRoaXMuX3ByaXZhdGVEYXRhLl9kYXRhLmNvbmNhdChzb3J0ZWREYXRhKTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIGN1cnJlbnRseSBpbiB0aGUgdmlldy5cbiAqIEByZXR1cm5zIHtOdW1iZXJ9XG4gKi9cblZpZXcucHJvdG90eXBlLmNvdW50ID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5fcHJpdmF0ZURhdGEgJiYgdGhpcy5fcHJpdmF0ZURhdGEuX2RhdGEgPyB0aGlzLl9wcml2YXRlRGF0YS5fZGF0YS5sZW5ndGggOiAwO1xufTtcblxuLyoqXG4gKiBUYWtlcyBhbiBvYmplY3Qgd2l0aCB0aGUga2V5cyBcImVuYWJsZWRcIiwgXCJkYXRhSW5cIiBhbmQgXCJkYXRhT3V0XCI6XG4gKiB7XG4gKiBcdFwiZW5hYmxlZFwiOiB0cnVlLFxuICogXHRcImRhdGFJblwiOiBmdW5jdGlvbiAoZGF0YSkgeyByZXR1cm4gZGF0YTsgfSxcbiAqIFx0XCJkYXRhT3V0XCI6IGZ1bmN0aW9uIChkYXRhKSB7IHJldHVybiBkYXRhOyB9XG4gKiB9XG4gKiBAcGFyYW0gb2JqXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuVmlldy5wcm90b3R5cGUudHJhbnNmb3JtID0gZnVuY3Rpb24gKG9iaikge1xuXHRpZiAob2JqICE9PSB1bmRlZmluZWQpIHtcblx0XHRpZiAodHlwZW9mIG9iaiA9PT0gXCJvYmplY3RcIikge1xuXHRcdFx0aWYgKG9iai5lbmFibGVkICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5fdHJhbnNmb3JtRW5hYmxlZCA9IG9iai5lbmFibGVkO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAob2JqLmRhdGFJbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHRoaXMuX3RyYW5zZm9ybUluID0gb2JqLmRhdGFJbjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG9iai5kYXRhT3V0ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0dGhpcy5fdHJhbnNmb3JtT3V0ID0gb2JqLmRhdGFPdXQ7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChvYmogPT09IGZhbHNlKSB7XG5cdFx0XHRcdC8vIFR1cm4gb2ZmIHRyYW5zZm9ybXNcblx0XHRcdFx0dGhpcy5fdHJhbnNmb3JtRW5hYmxlZCA9IGZhbHNlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gVHVybiBvbiB0cmFuc2Zvcm1zXG5cdFx0XHRcdHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFVwZGF0ZSB0aGUgdHJhbnNmb3JtZWQgZGF0YSBvYmplY3Rcblx0XHR0aGlzLl90cmFuc2Zvcm1QcmltYXJ5S2V5KHRoaXMucHJpdmF0ZURhdGEoKS5wcmltYXJ5S2V5KCkpO1xuXHRcdHRoaXMuX3RyYW5zZm9ybVNldERhdGEodGhpcy5wcml2YXRlRGF0YSgpLmZpbmQoKSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdGVuYWJsZWQ6IHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQsXG5cdFx0ZGF0YUluOiB0aGlzLl90cmFuc2Zvcm1Jbixcblx0XHRkYXRhT3V0OiB0aGlzLl90cmFuc2Zvcm1PdXRcblx0fTtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgbm9uLXRyYW5zZm9ybWVkIGRhdGEgdGhlIHZpZXcgaG9sZHMuXG4gKi9cblZpZXcucHJvdG90eXBlLnByaXZhdGVEYXRhID0gZnVuY3Rpb24gKCkge1xuXHRyZXR1cm4gdGhpcy5fcHJpdmF0ZURhdGE7XG59O1xuXG4vKipcbiAqIFJldHVybnMgYSBkYXRhIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHB1YmxpYyBkYXRhIHRoaXMgdmlld1xuICogY29udGFpbnMuIFRoaXMgY2FuIGNoYW5nZSBkZXBlbmRpbmcgb24gaWYgdHJhbnNmb3JtcyBhcmUgYmVpbmdcbiAqIGFwcGxpZWQgdG8gdGhlIHZpZXcgb3Igbm90LlxuICpcbiAqIElmIG5vIHRyYW5zZm9ybXMgYXJlIGFwcGxpZWQgdGhlbiB0aGUgcHVibGljIGRhdGEgd2lsbCBiZSB0aGVcbiAqIHNhbWUgYXMgdGhlIHByaXZhdGUgZGF0YSB0aGUgdmlldyBob2xkcy4gSWYgdHJhbnNmb3JtcyBhcmVcbiAqIGFwcGxpZWQgdGhlbiB0aGUgcHVibGljIGRhdGEgd2lsbCBjb250YWluIHRoZSB0cmFuc2Zvcm1lZCB2ZXJzaW9uXG4gKiBvZiB0aGUgcHJpdmF0ZSBkYXRhLlxuICovXG5WaWV3LnByb3RvdHlwZS5wdWJsaWNEYXRhID0gZnVuY3Rpb24gKCkge1xuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCkge1xuXHRcdHJldHVybiB0aGlzLl9wdWJsaWNEYXRhO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiB0aGlzLl9wcml2YXRlRGF0YTtcblx0fVxufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBwdWJsaWMgZGF0YSBvYmplY3QgdG8gbWF0Y2ggZGF0YSBmcm9tIHRoZSBwcml2YXRlIGRhdGEgb2JqZWN0XG4gKiBieSBydW5uaW5nIHByaXZhdGUgZGF0YSB0aHJvdWdoIHRoZSBkYXRhSW4gbWV0aG9kIHByb3ZpZGVkIGluXG4gKiB0aGUgdHJhbnNmb3JtKCkgY2FsbC5cbiAqIEBwcml2YXRlXG4gKi9cblZpZXcucHJvdG90eXBlLl90cmFuc2Zvcm1TZXREYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcblx0aWYgKHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQpIHtcblx0XHQvLyBDbGVhciBleGlzdGluZyBkYXRhXG5cdFx0dGhpcy5fcHVibGljRGF0YSA9IG5ldyBDb2xsZWN0aW9uKCdfX0ZEQl9fdmlld19wdWJsaWNEYXRhXycgKyB0aGlzLl9uYW1lKTtcblx0XHR0aGlzLl9wdWJsaWNEYXRhLmRiKHRoaXMuX3ByaXZhdGVEYXRhLl9kYik7XG5cdFx0dGhpcy5fcHVibGljRGF0YS50cmFuc2Zvcm0oe1xuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcblx0XHRcdGRhdGFJbjogdGhpcy5fdHJhbnNmb3JtSW4sXG5cdFx0XHRkYXRhT3V0OiB0aGlzLl90cmFuc2Zvcm1PdXRcblx0XHR9KTtcblxuXHRcdHRoaXMuX3B1YmxpY0RhdGEuc2V0RGF0YShkYXRhKTtcblx0fVxufTtcblxuVmlldy5wcm90b3R5cGUuX3RyYW5zZm9ybUluc2VydCA9IGZ1bmN0aW9uIChkYXRhLCBpbmRleCkge1xuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCAmJiB0aGlzLl9wdWJsaWNEYXRhKSB7XG5cdFx0dGhpcy5fcHVibGljRGF0YS5pbnNlcnQoZGF0YSwgaW5kZXgpO1xuXHR9XG59O1xuXG5WaWV3LnByb3RvdHlwZS5fdHJhbnNmb3JtVXBkYXRlID0gZnVuY3Rpb24gKHF1ZXJ5LCB1cGRhdGUpIHtcblx0aWYgKHRoaXMuX3RyYW5zZm9ybUVuYWJsZWQgJiYgdGhpcy5fcHVibGljRGF0YSkge1xuXHRcdHRoaXMuX3B1YmxpY0RhdGEudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xuXHR9XG59O1xuXG5WaWV3LnByb3RvdHlwZS5fdHJhbnNmb3JtUmVtb3ZlID0gZnVuY3Rpb24gKHF1ZXJ5KSB7XG5cdGlmICh0aGlzLl90cmFuc2Zvcm1FbmFibGVkICYmIHRoaXMuX3B1YmxpY0RhdGEpIHtcblx0XHR0aGlzLl9wdWJsaWNEYXRhLnJlbW92ZShxdWVyeSk7XG5cdH1cbn07XG5cblZpZXcucHJvdG90eXBlLl90cmFuc2Zvcm1QcmltYXJ5S2V5ID0gZnVuY3Rpb24gKGtleSkge1xuXHRpZiAodGhpcy5fdHJhbnNmb3JtRW5hYmxlZCAmJiB0aGlzLl9wdWJsaWNEYXRhKSB7XG5cdFx0dGhpcy5fcHVibGljRGF0YS5wcmltYXJ5S2V5KGtleSk7XG5cdH1cbn07XG5cbi8vIEV4dGVuZCBjb2xsZWN0aW9uIHdpdGggdmlldyBpbml0XG5Db2xsZWN0aW9uLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl92aWV3cyA9IFtdO1xuXHRDb2xsZWN0aW9uSW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuQ29sbGVjdGlvbi5wcm90b3R5cGUudmlldyA9IGZ1bmN0aW9uIChuYW1lLCBxdWVyeSwgb3B0aW9ucykge1xuXHR2YXIgdmlldyA9IG5ldyBWaWV3KG5hbWUsIHF1ZXJ5LCBvcHRpb25zKVxuXHRcdC5kYih0aGlzLl9kYilcblx0XHQuX2FkZENvbGxlY3Rpb24odGhpcyk7XG5cblx0dGhpcy5fdmlld3MgPSB0aGlzLl92aWV3cyB8fCBbXTtcblx0dGhpcy5fdmlld3MucHVzaCh2aWV3KTtcblxuXHRyZXR1cm4gdmlldztcbn07XG5cbi8qKlxuICogQWRkcyBhIHZpZXcgdG8gdGhlIGludGVybmFsIHZpZXcgbG9va3VwLlxuICogQHBhcmFtIHtWaWV3fSB2aWV3IFRoZSB2aWV3IHRvIGFkZC5cbiAqIEByZXR1cm5zIHtDb2xsZWN0aW9ufVxuICogQHByaXZhdGVcbiAqL1xuQ29sbGVjdGlvbi5wcm90b3R5cGUuX2FkZFZpZXcgPSBmdW5jdGlvbiAodmlldykge1xuXHRpZiAodmlldyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhpcy5fdmlld3MucHVzaCh2aWV3KTtcblx0fVxuXG5cdHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIGEgdmlldyBmcm9tIHRoZSBpbnRlcm5hbCB2aWV3IGxvb2t1cC5cbiAqIEBwYXJhbSB7Vmlld30gdmlldyBUaGUgdmlldyB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Q29sbGVjdGlvbn1cbiAqIEBwcml2YXRlXG4gKi9cbkNvbGxlY3Rpb24ucHJvdG90eXBlLl9yZW1vdmVWaWV3ID0gZnVuY3Rpb24gKHZpZXcpIHtcblx0aWYgKHZpZXcgIT09IHVuZGVmaW5lZCkge1xuXHRcdHZhciBpbmRleCA9IHRoaXMuX3ZpZXdzLmluZGV4T2Yodmlldyk7XG5cdFx0aWYgKGluZGV4ID4gLTEpIHtcblx0XHRcdHRoaXMuX3ZpZXdzLnNwbGljZShpbmRleCwgMSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHRoaXM7XG59O1xuXG4vLyBFeHRlbmQgREIgd2l0aCB2aWV3cyBpbml0XG5Db3JlLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKCkge1xuXHR0aGlzLl92aWV3cyA9IHt9O1xuXHRDb3JlSW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBHZXRzIGEgdmlldyBieSBpdCdzIG5hbWUuXG4gKiBAcGFyYW0ge1N0cmluZ30gdmlld05hbWUgVGhlIG5hbWUgb2YgdGhlIHZpZXcgdG8gcmV0cmlldmUuXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuQ29yZS5wcm90b3R5cGUudmlldyA9IGZ1bmN0aW9uICh2aWV3TmFtZSkge1xuXHRpZiAoIXRoaXMuX3ZpZXdzW3ZpZXdOYW1lXSkge1xuXHRcdGlmICh0aGlzLmRlYnVnKCkgfHwgKHRoaXMuX2RiICYmIHRoaXMuX2RiLmRlYnVnKCkpKSB7XG5cdFx0XHRjb25zb2xlLmxvZygnQ29yZS5WaWV3OiBDcmVhdGluZyB2aWV3ICcgKyB2aWV3TmFtZSk7XG5cdFx0fVxuXHR9XG5cblx0dGhpcy5fdmlld3Nbdmlld05hbWVdID0gdGhpcy5fdmlld3Nbdmlld05hbWVdIHx8IG5ldyBWaWV3KHZpZXdOYW1lKS5kYih0aGlzKTtcblx0cmV0dXJuIHRoaXMuX3ZpZXdzW3ZpZXdOYW1lXTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmlldyB3aXRoIHRoZSBwYXNzZWQgbmFtZSBhbHJlYWR5IGV4aXN0cy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB2aWV3TmFtZSBUaGUgbmFtZSBvZiB0aGUgdmlldyB0byBjaGVjayBmb3IuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuQ29yZS5wcm90b3R5cGUudmlld0V4aXN0cyA9IGZ1bmN0aW9uICh2aWV3TmFtZSkge1xuXHRyZXR1cm4gQm9vbGVhbih0aGlzLl92aWV3c1t2aWV3TmFtZV0pO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIHZpZXdzIHRoZSBEQiBjdXJyZW50bHkgaGFzLlxuICogQHJldHVybnMge0FycmF5fSBBbiBhcnJheSBvZiBvYmplY3RzIGNvbnRhaW5pbmcgZGV0YWlscyBvZiBlYWNoIHZpZXdcbiAqIHRoZSBkYXRhYmFzZSBpcyBjdXJyZW50bHkgbWFuYWdpbmcuXG4gKi9cbkNvcmUucHJvdG90eXBlLnZpZXdzID0gZnVuY3Rpb24gKCkge1xuXHR2YXIgYXJyID0gW10sXG5cdFx0aTtcblxuXHRmb3IgKGkgaW4gdGhpcy5fdmlld3MpIHtcblx0XHRpZiAodGhpcy5fdmlld3MuaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdGFyci5wdXNoKHtcblx0XHRcdFx0bmFtZTogaSxcblx0XHRcdFx0Y291bnQ6IHRoaXMuX3ZpZXdzW2ldLmNvdW50KClcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhcnI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXc7Il19
