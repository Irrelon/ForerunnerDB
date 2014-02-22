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
var ForerunnerDB = (function () {
	var idCounter = 0;

	var escapeSelector = function (selector) {
		return selector.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, '\\$1');
	};

	/**
	 * Path object used to resolve object paths and retrieve data from
	 * objects by using paths.
	 * @param {String=} path The path to assign.
	 * @constructor
	 */
	var Path = function (path) {
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

	/**
	 * Takes a non-recursive object and converts the object hierarchy into
	 * a path string.
	 * @param {Object} obj The object to parse.
	 * @param {Boolean=} withValue If true will include a 'value' key in the returned
	 * object that represents the value the object path points to.
	 * @returns {Object}
	 */
	Path.prototype.parse = function (obj, withValue) {
		var path = '',
			value,
			resultData,
			i;

		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				path += i;

				if (typeof(obj[i]) === 'object') {
					if (withValue) {
						resultData = this.parse(obj[i], withValue);
						path += '.' + resultData.path;
						value = resultData.value;
					} else {
						path += '.' + this.parse(obj[i], withValue);
					}
				} else {
					if (withValue) {
						value = obj[i];
					}
				}

				break;
			}
		}

		if (withValue) {
			return {
				path: path,
				value: value
			};
		} else {
			return {
				path: path
			};
		}
	};

	/**
	 * Gets the value that the object contains for the currently assigned
	 * path string.
	 * @param {Object} obj The object to evaluate the path against.
	 * @returns {*}
	 */
	Path.prototype.value = function (obj) {
		var arr = this._pathParts,
			arrCount = arr.length,
			objPart = obj,
			i;

		for (i = 0; i < arrCount; i++) {
			objPart = objPart[arr[i]];

			if (!objPart || typeof(objPart) !== 'object') {
				break;
			}
		}

		return objPart;
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
		this._primaryKey = '_id';
		this._name = name;
		this._data = [];
		this._binds = {};
		this._views = [];

		// Set the subset to itself since it is the root collection
		this._subsetOf(this);
	};

	Collection.prototype.primaryKey = function (keyName) {
		if (keyName !== undefined) {
			this._primaryKey = keyName;
			return this;
		}

		return this._primaryKey;
	};

	/**
	 * Adds a view to the internal view lookup.
	 * @param view
	 * @returns {Collection}
	 * @private
	 */
	Collection.prototype._addView = function (view) {
		if (view !== undefined) {
			this._views[view._name] = view;
		}

		return this;
	};

	/**
	 * Removes a view from the internal view lookup.
	 * @param view
	 * @returns {Collection}
	 * @private
	 */
	Collection.prototype._removeView = function (view) {
		if (view !== undefined) {
			delete this._views[view._name];
		}

		return this;
	};

	Collection.prototype._onInsert = function (inserted, failed) {
		var binds = this._binds,
			views = this._views,
			unfilteredDataSet = this.find({}),
			filteredDataSet;

		for (var i in binds) {
			if (binds.hasOwnProperty(i)) {
				if (binds[i].reduce) {
					filteredDataSet = this.find(binds[i].reduce.query, binds[i].reduce.options);
				} else {
					filteredDataSet = unfilteredDataSet;
				}
				this._fireInsert(i, binds[i], inserted, failed, filteredDataSet);
			}
		}

		// Loop views and inform them of the underlying data change
		for (i in views) {
			if (views.hasOwnProperty(i)) {
				views[i]._onInsert(inserted, failed);
			}
		}
	};

	Collection.prototype._onUpdate = function (items) {
		var binds = this._binds,
			views = this._views,
			unfilteredDataSet = this.find({}),
			filteredDataSet,
			i;

		// Loop and update all binds
		for (i in binds) {
			if (binds.hasOwnProperty(i)) {
				if (binds[i].reduce) {
					filteredDataSet = this.find(binds[i].reduce.query, binds[i].reduce.options);
				} else {
					filteredDataSet = unfilteredDataSet;
				}
				this._fireUpdate(i, binds[i], items, filteredDataSet);
			}
		}

		// Loop views and inform them of the underlying data change
		for (i in views) {
			if (views.hasOwnProperty(i)) {
				views[i]._onUpdate(items);
			}
		}
	};

	Collection.prototype._onRemove = function (items) {
		var binds = this._binds,
			views = this._views,
			unfilteredDataSet = this.find({}),
			filteredDataSet;

		for (var i in binds) {
			if (binds.hasOwnProperty(i)) {
				if (binds[i].reduce) {
					filteredDataSet = this.find(binds[i].reduce.query, binds[i].reduce.options);
				} else {
					filteredDataSet = unfilteredDataSet;
				}
				this._fireRemove(i, binds[i], items, filteredDataSet);
			}
		}

		// Loop views and inform them of the underlying data change
		for (i in views) {
			if (views.hasOwnProperty(i)) {
				views[i]._onRemove(items);
			}
		}
	};

	Collection.prototype._fireInsert = function (selector, options, inserted, failed, all) {
		var container = $(selector),
			itemElem,
			itemHtml,
			i;

		// Loop the inserted items
		for (i = 0; i < inserted.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + escapeSelector(inserted[i][this._primaryKey]));

			if (!itemElem.length) {
				itemHtml = options.template(inserted[i], function (itemElem, insertedItem, failed, all) { return function (itemHtml) {
					// Check if there is custom DOM insert method
					if (options.insert) {
						options.insert(itemHtml, insertedItem, failed, all);
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
						options.afterInsert(itemHtml, insertedItem, failed, all);
					}
				}}(itemElem, inserted[i], failed, all));
			}
		}
	};

	Collection.prototype._fireUpdate = function (selector, options, items, all) {
		var container = $(selector),
			itemElem,
			i;

		// Loop the updated items
		for (i = 0; i < items.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + escapeSelector(items[i][this._primaryKey]));

			options.template(items[i], function (itemElem, itemData) { return function (itemHtml) {
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
			}}(itemElem, items[i]));
		}
	};

	Collection.prototype._fireRemove = function (selector, options, items, all) {
		var container = $(selector),
			itemElem,
			i;

		// Loop the removed items
		for (i = 0; i < items.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + escapeSelector(items[i][this._primaryKey]));

			if (itemElem.length) {
				if (options.beforeRemove) {
					options.beforeRemove(itemElem, items[i], all, function (itemElem, data, all) { return function () {
						if (options.remove) {
							options.remove(itemElem, data, all);
						} else {
							itemElem.remove();

							if (options.afterRemove) {
								options.afterRemove(itemElem, data, all);
							}
						}
					}}(itemElem, items[i], all));
				} else {
					if (options.remove) {
						options.remove(itemElem, data, all);
					} else {
						itemElem.remove();

						if (options.afterRemove) {
							options.afterRemove(itemElem, items[i], all);
						}
					}
				}
			}
		}
	};

	/**
	 * Binds a selector to the insert, update and delete events of a particular
	 * collection / query and keeps the selector in sync so that updates are reflected
	 * on the web page in real-time.
	 *
	 * @param {String} selector The jQuery selector string to get target elements.
	 * @param {Object} options The options object.
	 */
	Collection.prototype.bind = function (selector, options) {
		if (options && options.template) {
			this._binds[selector] = options;
		} else {
			throw('Cannot bind data to element, missing options information!');
		}

		return this;
	};

	/**
	 * Un-binds a selector to the DB collection changes.
	 * @param {String} selector The jQuery selector string to identify the bind to remove.
	 * @returns {Collection}
	 */
	Collection.prototype.unBind = function (selector) {
		delete this._binds[selector];
		return this;
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
	 * Adds an event listener to the collection.
	 */
	Collection.prototype.on = function () {
		var elem = $(this);
		elem.on.apply(elem, arguments);

		return this;
	};

	/**
	 * Removes an event listener from the collection.
	 */
	Collection.prototype.off = function () {
		var elem = $(this);
		elem.off.apply(elem, arguments);

		return this;
	};

	/**
	 * Sets the collection's data to the array of documents passed.
	 * @param arr
	 */
	Collection.prototype.setData = function (arr) {
		if (arr) {
			// Overwrite the data
			this._data = [];
			this._data = this._data.concat(arr);

			this._onUpdate(this._data);
		}

		return this;
	};

	/**
	 * Clears all data from the collection.
	 * @returns {Collection}
	 */
	Collection.prototype.truncate = function () {
		this._onRemove(this._data);
		this._data.length = 0;
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
	Collection.prototype.upsert = function (obj) {
		var returnData = {},
			query,
			i;

		// Determine if the object passed is an array or not
		if (obj instanceof Array) {
			// Loop the array and upsert each item
			returnData = [];
			
			for (i = 0; i < obj.length; i++) {
				returnData.push(this.upsert(obj[i]));
			}
			
			return returnData;
		}
		
		// Determine if the operation is an insert or an update
		if (obj[this._primaryKey]) {
			// Check if an object with this primary key already exists
			query = {};
			query[this._primaryKey] = obj[this._primaryKey];

			if (this.find(query).length) {
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
		var self = this,
			dataSet = this.find(query),
			updated,
			updateCall = function (doc) {
				return self._updateObject(doc, update, query);
			};

		if (dataSet.length) {
			updated = dataSet.filter(updateCall);

			if (updated.length) {
				this._onUpdate(updated);
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
						case '$push':
							operation = true;

							// Do a push operation
							for (k in update[i]) {
								if (update[i].hasOwnProperty(k)) {
									if (doc[k] instanceof Array) {
										doc[k].push(update[i][k]);
										updated = true;
									} else {
										throw("Cannot push to a key that is not an array! (" + k + ")!");
									}
								}
							}
							break;

						case '$pull':
							operation = true;

							// Do a pull operation
							for (k in update[i]) {
								if (update[i].hasOwnProperty(k)) {
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
											doc[k].splice(tmpArray[tmpCount], 1);
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
							if (this._match(doc[i][tmpIndex], pathInstance.value(query))) {
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
									doc[i] = update[i];
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
							doc[i] = update[i];
							updated = true;
						}
					} else {
						if (doc[i] !== update[i]) {
							doc[i] = update[i];
							updated = true;
						}
					}
				}
			}
		}

		return updated;
	};

	/**
	 * Removes any documents from the collection that match the search query
	 * key/values.
	 * @param {Object} query The query object.
	 * @returns {Array} An array of the documents that were removed.
	 */
	Collection.prototype.remove = function (query) {
		var self = this,
			dataSet = this.find(query),
			index;

		if (dataSet.length) {
			// Remove the data from the collection
			for (var i = 0; i < dataSet.length; i++) {
				index = this._data.indexOf(dataSet[i]);
				this._data.splice(index, 1);
			}

			this._onRemove(dataSet);
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
	 * Inserts a document or array of documents into the collection.
	 * @param {Object||Array} data Either a document object or array of document
	 * objects to insert into the collection.
	 */
	Collection.prototype.insert = function (data) {
		var inserted = [],
			failed = [],
			insertResult,
			i;

		if (data instanceof Array) {
			// Loop the array and add items
			for (i = 0; i < data.length; i++) {
				insertResult = this._insert(data[i]);

				if (insertResult === true) {
					inserted.push(data[i]);
				} else {
					failed.push({
						doc: data[i],
						reason: insertResult
					});
				}
			}
		} else {
			// Store the data item
			insertResult = this._insert(data);

			if (insertResult === true) {
				inserted.push(data);
			} else {
				failed.push({
					doc: data,
					reason: insertResult
				});
			}
		}

		this._onInsert(inserted, failed);

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
	Collection.prototype._insert = function (doc) {
		if (doc) {
			var indexViolation;

			// Check indexes are not going to be broken by the document
			indexViolation = this._indexViolation(doc);

			if (!indexViolation) {
				// Insert the document
				this._data.push(doc);

				return true;
			} else {
				return indexViolation;
			}
		}

		return false;
	};

	/**
	 * Checks that the passed document will not violate any index rules.
	 * @param {Object} doc The document to check indexes against.
	 * @returns {Object} Either null (no violation occurred) or an object with
	 * details about the violation.
	 */
	Collection.prototype._indexViolation = function (doc) {
		return null
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
	 * Queries the collection based on the query object passed.
	 * @param {Object} query The query key/values that a document must match in
	 * order for it to be returned in the result array.
	 * @param {Object=} options The options object, allowed keys are sort and limit.
	 * @returns {Array} The results array from the find operation, containing all
	 * documents that matched the query.
	 */
	Collection.prototype.find = function (query, options) {
		query = query || {};
		options = options || {};

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
					joinQuery = joinPath.value(query);
					joinCollection[analysis.joinsOn[joinIndex]] = this._db.collection(analysis.joinsOn[joinIndex]).subset(joinQuery);
				}
			}

			// Filter the source data and return the result
			resultArr = this._data.filter(matcher);

			// Order the array if we were passed a sort clause
			if (options.sort) {
				resultArr = this.sort(options.sort, resultArr);
			}

			if (options.limit) {
				resultArr.length = options.limit;
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
											}
										} else {
											// TODO: Could optimise this by caching path objects
											// Get the data to match against and store in the search object
											joinSearch[joinMatchIndex] = new Path(joinMatch[joinMatchIndex]).value(resultArr[resultIndex]);
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

			return resultArr;
		} else {
			return [];
		}
	};

	/**
	 * Sorts an array of documents by the given sort path.
	 * @param {String} sortPath The path to the key that the array should be sorted by.
	 * @param {Array} arr The array of documents to sort.
	 * @returns {Array}
	 */
	Collection.prototype.sort = function (sortPath, arr) {
		// Make sure we have an array object
		arr = arr || [];

		// Create a data path from the sort object
		var pathSolver = new Path(),
			dataPath = pathSolver.parse(sortPath, true),
			sorterMethod;

		pathSolver.path(dataPath.path);

		if (dataPath.value === 1) {
			// Sort ascending
			sorterMethod = function (a, b) {
				var valA = pathSolver.value(a),
					valB = pathSolver.value(b);

				if (valA > valB) {
					return 1;
				} else if (valA < valB) {
					return -1;
				}

				return 0;
			};
		} else {
			// Sort descending
			sorterMethod = function (a, b) {
				var valA = pathSolver.value(a),
					valB = pathSolver.value(b);

				if (valA > valB) {
					return -1;
				} else if (valA < valB) {
					return 1;
				}

				return 0;
			};
		}

		return arr.sort(sorterMethod);
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
			index;

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
								applyOp = 'or';
								operation = true;

								recurseVal = this._match(source, test[i], applyOp);

								if (recurseVal) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
								break;

							case '$and':
								// Match true on ALL checks to pass
								applyOp = 'and';
								operation = true;

								recurseVal = this._match(source, test[i], applyOp);

								if (!recurseVal) {
									if (opToApply === 'and') {
										return false;
									}

									matchedAll = false;
								}
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
								matchedAll = false;
							}
						} else {
							// Check if the prop matches our test value
							if (source && source[i] === test[i]) {
								if (opToApply === 'or') {
									return true;
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
	Collection.prototype.count = function () {
		return this._data.length;
	};

	/**
	 * The view constructor.
	 * @param viewName
	 * @constructor
	 */
	var View = function (viewName) {
		this._name = viewName;
		this._binds = [];
		this._query = {
			query: {},
			options: {}
		};
	};

	/**
	 * Gets / sets the DB the view is bound against. Automatically set
	 * when the db.view(viewName) method is called.
	 * @param db
	 * @returns {*}
	 */
	View.prototype.db = function (db) {
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
	View.prototype.from = function (collection) {
		if (collection !== undefined) {
			// Check if we already have a collection assigned
			if (this._from) {
				// Remove ourselves from the collection view lookup
				this._from._removeView(this);
			}

			// Check if this is a collection name or a collection instance
			if (collection instanceof Collection) {
				this._from = collection;
			} else if (typeof(collection) === 'string') {
				this._from = this._db.collection(collection);
			}

			if (this._from) {
				// Add this view to the collection's view lookup
				this._from._addView(this);

				this._primaryKey = this._from._primaryKey;
				this.refresh();
				return this;
			} else {
				throw('Cannot determine collection type in view.from()');
			}
		}

		return this._from;
	};

	/**
	 * Gets / sets the query that the view uses to build it's data set.
	 * @param {Object=} query
	 * @param {Boolean=} options An options object.
	 * @param {Boolean=} refresh Whether to refresh the view data after
	 * this operation. Defaults to true.
	 * @returns {*}
	 */
	View.prototype.query = function (query, options, refresh) {
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
	View.prototype.queryAdd = function (obj, overwrite, refresh) {
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
	 * Renive data from the existing query.
	 * @param {Object} obj The data whose keys will be removed from the existing
	 * query object.
	 * @param {Boolean=} refresh Whether or not to refresh the view data set
	 * once the operation is complete. Defaults to true.
	 */
	View.prototype.queryRemove = function (obj, refresh) {
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
	View.prototype.queryObj = function (query, refresh) {
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
	View.prototype.queryOptions = function (options, refresh) {
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
	View.prototype.refresh = function () {
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
			binds = this._binds,
			bindKey,
			i;

		// Query the collection and update the data
		if (this._from) {
			if (this._query) {
				// Run query against collection
				this._data = this._from.subset(this._query.query, this._query.options);
			} else {
				// No query, return whole collection
				this._data = this._from.subset({});
			}
		}

		// Check if there was old data
		if (oldData) {
			// Now determine the difference
			newData = this._data;

			if (oldData.subsetOf() === newData.subsetOf()) {
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

				// Now we have a diff of the two data sets, we need to get the DOM updated
				if (inserted.length) {
					this._onInsert(inserted, []);
				}

				if (updated.length) {
					this._onUpdate(updated);
				}

				if (removed.length) {
					this._onRemove(removed);
				}

				for (bindKey in binds) {
					if (binds.hasOwnProperty(bindKey)) {
						if (binds[bindKey].maintainSort) {
							this.sortDomBind(bindKey, newDataArr);
						}
					}
				}
			} else {
				// The previous data and the new data are derived from different collections
				// and can therefore not be compared, all data is therefore effectively "new"
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
	View.prototype.render = function (bindSelector, domHandler) {
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

	/**
	 * Returns the number of documents currently in the view.
	 * @returns {Number}
	 */
	View.prototype.count = function () {
		return this._data && this._data._data ? this._data._data.length : 0;
	};

	/**
	 * Queries the view data. See Collection.find() for more information.
	 * @returns {*}
	 */
	View.prototype.find = function () {
		if (this._data) {
			// Pass the args through to the internal subset data and return
			return this._data.find.apply(this._data, arguments);
		} else {
			return [];
		}
	};

	/**
	 * Binds a selector to the insert, update and delete events of a particular
	 * view and keeps the selector in sync so that updates are reflected on the
	 * web page in real-time.
	 *
	 * @param {String} selector The jQuery selector string to get target elements.
	 * @param {Object} options The options object.
	 */
	View.prototype.bind = function (selector, options) {
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
	View.prototype.unBind = function (selector) {
		delete this._binds[selector];
		return this;
	};

	/**
	 * Sorts items in the DOM based on the bind settings and the passed item array.
	 * @param {String} selector The jQuery selector of the bind container.
	 * @param {Array} itemArr The array of items used to determine the order the DOM
	 * elements should be in based on the order they are in, in the array.
	 */
	View.prototype.sortDomBind = function (selector, itemArr) {
		var container = $(selector),
			arrIndex,
			arrItem,
			domItem;

		for (arrIndex = 0; arrIndex < itemArr.length; arrIndex++) {
			arrItem = itemArr[arrIndex];

			// Now we've done our inserts into the DOM, let's ensure they are still
			// ordered correctly
			domItem = container.find('#' + arrItem[this._primaryKey]);

			if (arrIndex === 0) {
				container.prepend(domItem);
			} else {
				domItem.insertAfter(container.children(':eq(' + (arrIndex - 1) + ')'));
			}
		}
	};

	View.prototype._onInsert = function (inserted, failed) {
		var binds = this._binds,
			unfilteredDataSet = this.find({}),
			filteredDataSet,
			bindKey;

		for (bindKey in binds) {
			if (binds.hasOwnProperty(bindKey)) {
				if (binds[bindKey].reduce) {
					filteredDataSet = this.find(binds[bindKey].reduce.query, binds[bindKey].reduce.options);
				} else {
					filteredDataSet = unfilteredDataSet;
				}

				this._fireInsert(bindKey, binds[bindKey], inserted, failed, filteredDataSet);
			}
		}

		this.refresh();
	};

	View.prototype._onUpdate = function (items) {
		var binds = this._binds,
			unfilteredDataSet = this.find({}),
			filteredDataSet,
			bindKey;

		for (bindKey in binds) {
			if (binds.hasOwnProperty(bindKey)) {
				if (binds[bindKey].reduce) {
					filteredDataSet = this.find(binds[bindKey].reduce.query, binds[bindKey].reduce.options);
				} else {
					filteredDataSet = unfilteredDataSet;
				}

				this._fireUpdate(bindKey, binds[bindKey], items, filteredDataSet);
			}
		}

		this.refresh();
	};

	View.prototype._onRemove = function (items) {
		var binds = this._binds,
			unfilteredDataSet = this.find({}),
			filteredDataSet,
			bindKey;

		for (bindKey in binds) {
			if (binds.hasOwnProperty(bindKey)) {
				if (binds[bindKey].reduce) {
					filteredDataSet = this.find(binds[bindKey].reduce.query, binds[bindKey].reduce.options);
				} else {
					filteredDataSet = unfilteredDataSet;
				}

				this._fireRemove(bindKey, binds[bindKey], items, filteredDataSet);
			}
		}

		this.refresh();
	};

	View.prototype._fireInsert = function (selector, options, inserted, failed, all) {
		var container = $(selector),
			itemElem,
			itemHtml,
			sortIndex,
			i;

		// Loop the inserted items
		for (i = 0; i < inserted.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + escapeSelector(inserted[i][this._primaryKey]));

			if (!itemElem.length) {
				itemHtml = options.template(inserted[i], function (itemElem, insertedItem, failed, all) { return function (itemHtml) {
					// Check if there is custom DOM insert method
					if (options.insert) {
						options.insert(itemHtml, insertedItem, failed, all);
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
						options.afterInsert(itemHtml, insertedItem, failed, all);
					}
				}}(itemElem, inserted[i], failed, all));
			}
		}
	};

	View.prototype._fireUpdate = function (selector, options, items, all) {
		var container = $(selector),
			itemElem,
			i;

		// Loop the updated items
		for (i = 0; i < items.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + escapeSelector(items[i][this._primaryKey]));

			options.template(items[i], function (itemElem, itemData) { return function (itemHtml) {
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
			}}(itemElem, items[i]));
		}
	};

	View.prototype._fireRemove = function (selector, options, items, all) {
		var container = $(selector),
			itemElem,
			i;

		// Loop the removed items
		for (i = 0; i < items.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + escapeSelector(items[i][this._primaryKey]));

			if (itemElem.length) {
				if (options.beforeRemove) {
					options.beforeRemove(itemElem, items[i], all, function (itemElem, data, all) { return function () {
						if (options.remove) {
							options.remove(itemElem, data, all);
						} else {
							itemElem.remove();

							if (options.afterRemove) {
								options.afterRemove(itemElem, data, all);
							}
						}
					}}(itemElem, items[i], all));
				} else {
					if (options.remove) {
						options.remove(itemElem, data, all);
					} else {
						itemElem.remove();

						if (options.afterRemove) {
							options.afterRemove(itemElem, items[i], all);
						}
					}
				}
			}
		}
	};

	/**
	 * Creates a new objectId object.
	 * @constructor
	 */
	var ObjectId = function (id) {
		idCounter++;

		if (!id) {
			this._val = (
				idCounter + (
					Math.random() * Math.pow(10, 17) +
					Math.random() * Math.pow(10, 17) +
					Math.random() * Math.pow(10, 17) +
					Math.random() * Math.pow(10, 17)
				)
			).toString(24);
		} else {
			this._val = id;
		}
	};

	ObjectId.prototype.toString = function () {
		return this._val;
	};

	/**
	 * The main DB object used to store collections.
	 * @constructor
	 */
	var DB = function () {
		this._collection = {};
		this._view = {};

		// Init plugins
		for (var i in this.Plugin) {
			if (this.Plugin.hasOwnProperty(i)) {
				console.log('ForerunnerDB Init Plugin: ' + i + '...');
				this[i.substr(0, 1).toLowerCase() + i.substr(1, i.length - 1)] = new this.Plugin[i](this);
			}
		}
	};

	/**
	 * Accessor to internal data type constructors.
	 * @returns {Object}
	 */
	DB.types = {
		Path: Path,
		Collection: Collection,
		ObjectId: ObjectId
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

	/**
	 * Adds an event listener to the db.
	 */
	DB.prototype.on = function () {
		var elem = $(this);
		elem.on.apply(elem, arguments);
	};

	/**
	 * Removes an event listener from the db.
	 */
	DB.prototype.off = function () {
		var elem = $(this);
		elem.off.apply(elem, arguments);
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
			this._collection[collectionName] = this._collection[collectionName] || new Collection(collectionName).db(this);

			if (primaryKey !== undefined) {
				this._collection[collectionName].primaryKey(primaryKey);
			}

			return this._collection[collectionName];
		} else {
			// Return an object of collection data
			return this._collection;
		}
	};

	DB.prototype.view = function (viewName) {
		this._view[viewName] = this._view[viewName] || new View(viewName).db(this);
		return this._view[viewName];
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
	 * Returns an array of views the DB currently has.
	 * @returns {Array} An array of objects containing details of each view
	 * the database is currently managing.
	 */
	DB.prototype.views = function () {
		var arr = [],
			i;

		for (i in this._view) {
			if (this._view.hasOwnProperty(i)) {
				arr.push({
					name: i,
					count: this._view[i].count()
				});
			}
		}

		return arr;
	};

	DB.prototype.Plugin = {};

	return DB;
})();

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = ForerunnerDB; }
