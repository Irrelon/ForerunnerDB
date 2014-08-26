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

 Changelog:
 Version 1.0.0:
 First commit
 */
(function () {
	var init = (function () {
		var idCounter = 0;

		/**
		 * Escapes a CSS selector.
		 * @param {String} selector The selector string to escape.
		 * @returns {String} The escaped selector string.
		 */
		var escapeSelector = function (selector) {
			return selector.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, '\\$1');
		};

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
				}
			} else {
				return function () {};
			}
		};

		/**
		 * Path object used to resolve object paths and retrieve data from
		 * objects by using paths.
		 * @param {String=} path The path to assign.
		 * @constructor
		 */
		var Path = function () {
			this.init.apply(this, arguments);
		};

		Path.prototype.init = function (path) {
			if (path) {
				this.path(path);
			}
		};

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
				pathIndex = 0,
				value,
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

		/**
		 * Collection object used to store data.
		 * @constructor
		 */
		var Collection = function (name) {
			this.init.apply(this, arguments);
		};

		Collection.prototype.init = function (name) {
			this._primaryKey = '_id';
			this._name = name;
			this._data = [];
			this._groups = [];

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
		 * Drops a collection and all it's stored data from the database.
		 * @returns {boolean} True on success, false on failure.
		 */
		Collection.prototype.drop = function () {
			if (this._db && this._name) {
				if (this._debug || (this._db && this._db._debug)) {
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
				if (!(data instanceof Array)) {
					data = [data];
				}

				data = this.transformIn(data);

				var oldData = this._data;

				// Overwrite the data
				this._data = [];

				if (data.length) {
					this._data = this._data.concat(data);
				}

				this.emit('setData', this._data, oldData);
			}

			if (callback) { callback(false); }

			return this;
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
		 * @returns {Object} An object containing two keys, "op" contains either "insert" or
		 * "update" depending on the type of operation that was performed and "result"
		 * contains the return data from the operation used.
		 */
		Collection.prototype.upsert = function (obj, callback) {
			if (obj) {
				var queue = this._deferQueue.upsert,
					deferThreshold = this._deferThreshold.upsert,
					deferTime = this._deferTime.upsert;

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
		 * @returns {Array} The items that were updated.
		 */
		Collection.prototype.update = function (query, update) {
			// Decouple the update data
			update = this.decouple(update);

			// Handle transform
			update = this.transformIn(update);

			var self = this,
				dataSet = this.find(query, {decouple: false}),
				updated,
				updateCall = function (doc) {
					update = JSON.parse(JSON.stringify(update));
					return self._updateObject(doc, update, query, '');
				},
				views = this._views,
				viewIndex;

			if (dataSet.length) {
				updated = dataSet.filter(updateCall);

				if (updated.length) {
					// Loop views and pass them the update query
					if (views && views.length) {
						for (viewIndex = 0; viewIndex < views.length; viewIndex++) {
							views[viewIndex].update(query, update);
						}
					}

					this._onUpdate(updated);
					this.deferEmit('change', {type: 'update', data: updated});
				}
			}

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
		 * @param path
		 * @returns {Boolean} True if the document was updated with new / changed data or
		 * false if it was not updated because the data was the same.
		 * @private
		 */
		Collection.prototype._updateObject = function (doc, update, query, path) {
			update = JSON.parse(JSON.stringify(update));
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
												objHash = JSON.stringify(update[i][k]),
												addObj = true;

											for (targetArrIndex = 0; targetArrIndex < targetArrCount; targetArrIndex++) {
												if (JSON.stringify(targetArr[targetArrIndex]) === objHash) {
													// The object already exists, don't add it
													addObj = false;
													break;
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

								// Do a pull operation
								for (k in update[i]) {
									if (update[i].hasOwnProperty(k) && k.substr(0, 1) !== '$') {
										if (doc[k] instanceof Array) {
											// Loop the array and find matches to our search
											for (tmpIndex = 0; tmpIndex < doc[k].length; tmpIndex++) {
												if (this._match(doc[k][tmpIndex], update[i][k])) {
													var moveToIndex = update[i].$index;

													if (tempIndex !== undefined) {
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
								recurseUpdated = this._updateObject(doc[i][tmpArray[tmpIndex]], update[i + '.$'], query, path + '.' + i);
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
											recurseUpdated = this._updateObject(doc[i][tmpIndex], update[i], query, path + '.' + i);
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
									recurseUpdated = this._updateObject(doc[i], update[i], query, path + '.' + i);
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

		Collection.prototype._updateProperty = function (doc, prop, val) {
			if (this._linked) {
				$.observable(doc).setProperty(prop, val);
			} else {
				doc[prop] = val;
			}
		};

		Collection.prototype._updateSpliceMove = function (arr, indexFrom, indexTo) {
			if (this._linked) {
				$.observable(arr).move(indexFrom, indexTo);
			} else {
				arr.splice(indexTo, 0, arr.splice(indexFrom, 1)[0]);
			}
		};

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

		Collection.prototype._updatePush = function (arr, doc) {
			if (this._linked) {
				$.observable(arr).insert(doc);
			} else {
				arr.push(doc);
			}
		};

		Collection.prototype._updatePull = function (arr, index) {
			if (this._linked) {
				$.observable(arr).remove(index);
			} else {
				arr.splice(index, 1);
			}
		};

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
				dataSet = this.find(query, {decouple: false}),
				index,
				views = this._views,
				viewIndex;

			if (dataSet.length) {
				// Remove the data from the collection
				for (var i = 0; i < dataSet.length; i++) {
					index = this._data.indexOf(dataSet[i]);

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
					if (self._debug || (self._db && self._db._debug)) { console.log('Collection: emitting ' + args[0]); }
					self.emit.apply(self, args);
				}, 100);
			} else {
				this.emit.apply(this, arguments);
			}
		};

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
		 * @returns {Boolean|Object} True on success, false if no document passed,
		 * or an object containing details about an index violation if one occurred.
		 * @private
		 */
		Collection.prototype._insert = function (doc, index) {
			if (doc) {
				var indexViolation;

				if (doc[this._primaryKey] === undefined) {
					// Assign a primary key automatically
					doc[this._primaryKey] = this._db.objectId();
				}

				// Check indexes are not going to be broken by the document
				indexViolation = this.insertIndexViolation(doc);

				if (!indexViolation) {
					// Insert the document
					if (this._linked) {
						$.observable(this._data).insert(index, doc);
					} else {
						this._data.splice(index, 0, doc);
					}

					return true;
				} else {
					return false;
				}
			}

			return false;
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
		 * Finds all documents that contain the passed string regardless of where
		 * the string might occur within the document. This will match strings
		 * from the start, middle or end of the document's string (partial match).
		 * @param str The string to search for. Case sensitive.
		 * @param options A standard find() options object.
		 * @returns {Array} An array of documents that matched the search string.
		 */
		Collection.prototype.findByString = function (str, options) {
			// Loop all items
			var arr = this._data,
				arrCount = arr.length,
				arrIndex,
				arrItem,
				tempColl = new Collection();

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				// Get json representation of object
				arrItem = JSON.stringify(arr[arrIndex]);

				// Check if string exists in object json
				if (arrItem.indexOf(str) > -1) {
					// Add this item to the temp collection
					tempColl.insert(arr[arrIndex]);
				}
			}

			return tempColl.find({}, options);
		};

		/**
		 * Queries the collection based on the query object passed.
		 * @param {Object} query The query key/values that a document must match in
		 * order for it to be returned in the result array.
		 *
		 * @returns {Array} The results array from the find operation, containing all
		 * documents that matched the query.
		 */
		Collection.prototype.find = function (query, options) {
			query = query || {};
			options = options || {};

			options.decouple = options.decouple !== undefined ? options.decouple : true;

			var analysis,
				self = this,
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

			if (query) {
				// Get query analysis to execute best optimised code path
				analysis = this._analyseQuery(query, options);

				if (analysis.hasJoin && analysis.queriesJoin) {
					// The query has a join and tries to limit by it's joined data
					// Get an instance reference to the join collections
					for (joinIndex = 0; joinIndex < analysis.joinsOn.length; joinIndex++) {
						joinCollectionName = analysis.joinsOn[joinIndex];
						joinPath = new Path(analysis.joinQueries[joinCollectionName]);
						joinQuery = joinPath.value(query)[0];
						joinCollection[analysis.joinsOn[joinIndex]] = this._db.collection(analysis.joinsOn[joinIndex]).subset(joinQuery);
					}
				}

				// Check if an index lookup can be used to return this result
				if (analysis.usesIndex.length) {
					// Get the data from the index
					resultArr = analysis.usesIndex[0].lookup(query);
				} else {
					// Filter the source data and return the result
					resultArr = this._data.filter(matcher);

					// Order the array if we were passed a sort clause
					if (options.sort) {
						resultArr = this.sort(options.sort, resultArr);
					}
				}

				if (options.limit && resultArr && resultArr.length > options.limit) {
					resultArr.length = options.limit;
				}

				if (options.decouple) {
					// Now decouple the data from the original objects
					resultArr = this.decouple(resultArr);
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
				}

				// Process removal queue
				for (i = 0; i < resultRemove.length; i++) {
					index = resultArr.indexOf(resultRemove[i]);

					if (index > -1) {
						resultArr.splice(index, 1);
					}
				}

				if (options.transform) {
					for (i = 0; i < resultArr.length; i++) {
						resultArr.splice(i, 1, options.transform(resultArr[i]));
					}
				}

				// Process transforms
				resultArr = this.transformOut(resultArr);

				return resultArr;
			} else {
				return [];
			}
		};

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
		 * @returns {Object}
		 * @private
		 */
		Collection.prototype._analyseQuery = function (query, options) {
			var analysis = {
					queriesOn: [this._name],
					usesIndex: [],
					hasJoin: false,
					queriesJoin: false,
					joinQueries: {}
				},
				joinCollectionIndex,
				joinCollectionName,
				joinCollections = [],
				joinCollectionReferences = [],
				queryPath,
				index,
				i;

			// Check if an index can speed up the query
			for (i in this._indexById) {
				if (this._indexById.hasOwnProperty(i)) {
					if (this._indexById[i].match(query, options)) {
						// This index can be used, store it
						analysis.usesIndex.push(this._indexById[i]);
					}
				}
			}

			// Sort array descending on index key count (effectively a measure of relevance to the query)
			analysis.usesIndex.sort(function (a, b) {
				return b._keyCount - a._keyCount;
			});

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
			// Create the data binding
			$.templates[templateSelector].link(outputTargetSelector, this._data);

			// Set the linked flag
			this._linked = true;
		};

		/**
		 * Removes a link to the DOM between the collection data and the elements
		 * in the passed output selector that was created using the link() method.
		 * @param outputTargetSelector
		 * @param templateSelector
		 */
		Collection.prototype.unlink = function (outputTargetSelector, templateSelector) {
			// Remove the data binding
			$.templates[templateSelector].unlink(outputTargetSelector);

			// Set the linked flag
			this._linked = false;
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
				subDocCollection = this._db.collection('__FDB_temp_' + this._db.objectId()),
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
		 * Checks that the passed document will not violate any index rules.
		 * @param {Object} doc The document to check indexes against.
		 * @returns {Object} Either null (no violation occurred) or an object with
		 * details about the violation.
		 */
		Collection.prototype.insertIndexViolation = function (doc) {
			// Check the item's primary key is not already in use
			var item = this.findById(doc[this._primaryKey]);

			return Boolean(item);
		};

		Collection.prototype.ensureIndex = function (keys, options) {
			this._indexByName = this._indexByName || {};
			this._indexById = this._indexById || {};

			var index = new Index(keys, options, this);

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

			return {
				index: index,
				id: index.id(),
				name: index.name(),
				state: index.state()
			};
		};

		Collection.prototype.index = function (name) {
			return this._indexByName[name];
		};

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

		Index.prototype.id = function () {
			return this._id;
		};

		Index.prototype.state = function () {
			return this._state;
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
					dataCount = collectionData.length,
					dataItem,
					uniqueLookup = {},
					uniqueFlag = this._unique,
					uniqueHash,
					itemHashArr,
					hashIndex;

				// Clear the index data for the index
				this._data = {};

				// Loop the collection data
				for (dataIndex = 0; dataIndex < dataCount; dataIndex++) {
					dataItem = collectionData[dataIndex];

					if (uniqueFlag) {
						// Generate item hash
						uniqueHash = this._itemHash(dataItem, this._keys);

						// Check if the item breaks the unique constraint
						if (uniqueLookup[uniqueHash]) {
							// Item breaks unique constraint
							this._state = {
								err: 'Unique constraint violation with existing data, cannot create index!',
								keys: this._keys,
								hash: uniqueHash,
								clashItem: dataItem,
								clashedWith: uniqueLookup[uniqueHash]
							};

							return this._state;
						} else {
							uniqueLookup[uniqueHash] = dataItem;
						}
					}

					// Generate item hash
					itemHashArr = this._itemHashArr(dataItem, this._keys);

					// Get the path search results and store them
					for (hashIndex = 0; hashIndex < itemHashArr.length; hashIndex++) {
						this.pushToPathValue(itemHashArr[hashIndex], dataItem);
					}
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

		Index.prototype.lookup = function (query) {
			return this._data[this._itemHash(query, this._keys)] || [];
		};

		Index.prototype.match = function (query, options) {
			// Check if the passed query has data in the keys our index
			// operates on and if so, is the query sort matching our order
			var pathSolver = new Path();
			return pathSolver.hasObjectPaths(this._keys, query);
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

		/**
		 * The main DB object used to store collections.
		 * @constructor
		 */
		var DB = function () {
			this.init.apply(this, arguments);
		};

		DB.prototype._isServer = false;

		DB.prototype.isClient = function () {
			return !this._isServer;
		};

		DB.prototype.isServer = function () {
			return this._isServer;
		};

		DB.prototype.init = function () {
			this._collection = {};

			// Init plugins
			for (var i in this.Plugin) {
				if (this.Plugin.hasOwnProperty(i)) {
					//console.log('ForerunnerDB Init Plugin: ' + i + '...');
					this[i.substr(0, 1).toLowerCase() + i.substr(1, i.length - 1)] = new this.Plugin[i](this);
				}
			}
		};

		DB.prototype.debug = function (val) {
			if (val !== undefined) {
				this._debug = val;
				return this;
			}

			return this._debug;
		};

		/**
		 * Converts a normal javascript array of objects into a DB collection.
		 * @param {Array} arr An array of objects.
		 * @returns {Collection} A new collection instance with the data set to the
		 * array passed.
		 */
		DB.prototype.arrayToCollection = function (arr) {
			return new Collection().setData(arr);
		};

		DB.prototype.on = function(event, listener) {
			this._listeners = this._listeners || {};
			this._listeners[event] = this._listeners[event] || [];
			this._listeners[event].push(listener);

			return this;
		};

		DB.prototype.off = function(event, listener) {
			if (event in this._listeners) {
				var arr = this._listeners[event],
					index = arr.indexOf(listener);

				if (index > -1) {
					arr.splice(index, 1);
				}
			}

			return this;
		};

		DB.prototype.emit = function(event, data) {
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
		 * Get a collection by name. If the collection does not already exist
		 * then one is created for that name automatically.
		 * @param {String} collectionName The name of the collection.
		 * @param {String=} primaryKey Optional primary key to specify the primary key field on the collection
		 * objects. Defaults to "_id".
		 * @returns {Collection}
		 */
		DB.prototype.collection = function (collectionName, primaryKey) {
			if (collectionName) {
				if (!this._collection[collectionName]) {
					if (this._debug || (this._db && this._db._debug)) {
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
		DB.prototype.collectionExists = function (viewName) {
			return Boolean(this._collection[viewName]);
		};

		/**
		 * Returns an array of collections the DB currently has.
		 * @returns {Array} An array of objects containing details of each collection
		 * the database is currently managing.
		 */
		DB.prototype.collections = function () {
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

		/**
		 * Generates a new 16-character hexadecimal unique ID or
		 * generates a new 16-character hexadecimal ID based on
		 * the passed string. Will always generate the same ID
		 * for the same string.
		 * @param {String=} str A string to generate the ID from.
		 * @return {String}
		 */
		DB.prototype.objectId = function (str) {
			var id;

			if (!str) {
				idCounter++;

				id = (idCounter + (
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
		 * Accessor to internal class constructors.
		 * @returns {Object}
		 */
		DB.classes = {
			Path: Path,
			Collection: Collection,
			Overload: Overload
		};

		DB.prototype.Plugin = {};

		return DB;
	});

	// Export
	if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
		/**
		 * Common.js module support.
		 */
		var ForerunnerDB = init();
		ForerunnerDB.prototype._isServer = true;
		module.exports = ForerunnerDB;
	} else if (typeof(define) === 'function' && define.amd) {
		/**
		 * AMD module support.
		 */
		define([], function() {
			window.ForerunnerDB = init();
			return window.ForerunnerDB;
		});
	} else {
		// Define a browser global
		window.ForerunnerDB = init();
	}
})();