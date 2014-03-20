(function () {
	// Import external names locally
	var Collection = ForerunnerDB.classes.Collection,
		CollectionGroup = ForerunnerDB.classes.CollectionGroup,
		CollectionInit = Collection.prototype.init,
		DBInit = ForerunnerDB.prototype.init;

	/**
	 * The view constructor.
	 * @param viewName
	 * @constructor
	 */
	var View = function () {
		this.init.apply(this, arguments);
	};

	View.prototype.init = function (viewName) {
		var self = this;

		this._name = viewName;
		this._groups = [];
		this._listeners = {};
		this._query = {
			query: {},
			options: {}
		};

		// Register listeners for the CRUD events
		this._onFromInsert = function () {
			self._onInsert.apply(self, arguments);
		};

		this._onFromUpdate = function () {
			self._onUpdate.apply(self, arguments);
		};

		this._onFromRemove = function () {
			self._onRemove.apply(self, arguments);
		};
	};

	View.prototype.on = function(event, listener) {
		this._listeners = this._listeners || {};
		this._listeners[event] = this._listeners[event] || [];
		this._listeners[event].push(listener);

		return this;
	};

	View.prototype.off = function(event, listener) {
		if (event in this._listeners) {
			var arr = this._listeners[event],
				index = arr.indexOf(listener);

			if (index > -1) {
				arr.splice(index, 1);
			}
		}

		return this;
	};

	View.prototype.emit = function(event, data) {
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
	 * Drops a view and all it's stored data from the database.
	 * @returns {boolean} True on success, false on failure.
	 */
	View.prototype.drop = function () {
		if ((this._db || this._from) && this._name) {
			if (this._debug || (this._from && this._from._debug) || (this._db && this._db._debug)) {
				console.log('Dropping view ' + this._name);
			}

			this.emit('drop');

			if (this._db) {
				delete this._db._views[this._name];
			}

			if (this._from) {
				delete this._from._views[this._name];
			}

			return true;
		}

		return false;
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

	View.prototype.addFrom = function (collection) {
		var self = this;

		// Check if this is a collection name or a collection instance
		if (collection instanceof Collection || collection instanceof CollectionGroup) {
			this._from = collection;
		} else if (typeof(collection) === 'string') {
			this._from = this._db.collection(collection);
		}

		if (this._from) {
			this._from.on('insert', this._onFromInsert);
			this._from.on('update', this._onFromUpdate);
			this._from.on('remove', this._onFromRemove);

			// Add this view to the collection's view lookup
			this._from._addView(this);
			this._primaryKey = this._from._primaryKey;

			this.refresh();
			return this;
		} else {
			throw('Cannot determine collection type in view.from()');
		}
	};

	View.prototype.removeFrom = function () {
		// Unsubscribe from events on this "from"
		this._from.off('insert', this._onFromInsert);
		this._from.off('update', this._onFromUpdate);
		this._from.off('remove', this._onFromRemove);

		this._from._removeView(this);
	};

	/**
	 * Gets the primary key for this view from the assigned collection.
	 * @returns {String}
	 */
	View.prototype.primaryKey = function () {
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
	View.prototype.refresh = function (force) {
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

		if (!force) {
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

					this.emit('change', {data: newDataArr});
				} else {
					// The previous data and the new data are derived from different collections
					// and can therefore not be compared, all data is therefore effectively "new"
					// so first perform a remove of all existing data then do an insert on all new data
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
			}
		} else {
			// Force an update as if the view never got created by padding all elements
			// to the insert
			newDataArr = this._data.find();
			this._onInsert(newDataArr, []);
			this.emit('change', {data: newDataArr});
		}

		return this;
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
	 * Inserts into view data via the view collection. See Collection.insert() for more information.
	 * @returns {*}
	 */
	View.prototype.insert = function () {
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
	View.prototype.update = function () {
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
	View.prototype.remove = function () {
		if (this._from) {
			// Pass the args through to the from object
			return this._from.remove.apply(this._from, arguments);
		} else {
			return [];
		}
	};

	View.prototype._onInsert = function (successArr, failArr) {
		this.emit('insert', successArr, failArr);
	};

	View.prototype._onUpdate = function (successArr, failArr) {
		this.emit('update', successArr, failArr);
	};

	View.prototype._onRemove = function (successArr, failArr) {
		this.emit('remove', successArr, failArr);
	};
	
	// Extend collection with view init
	Collection.prototype.init = function () {
		this._views = [];
		CollectionInit.apply(this, arguments);
	};
	
	/**
	 * Adds a view to the internal view lookup.
	 * @param {View} view The view to add.
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
	 * @param {View} view The view to remove.
	 * @returns {Collection}
	 * @private
	 */
	Collection.prototype._removeView = function (view) {
		if (view !== undefined) {
			delete this._views[view._name];
		}

		return this;
	};
	
	// Extend DB with views init
	ForerunnerDB.prototype.init = function () {
		this._views = {};
		DBInit.apply(this, arguments);
	};

	/**
	 * Gets a view by it's name.
	 * @param {String} viewName The name of the view to retrieve.
	 * @returns {*}
	 */
	ForerunnerDB.prototype.view = function (viewName) {
		if (!this._views[viewName]) {
			if (this._debug) {
				console.log('Creating view ' + viewName);
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
	ForerunnerDB.prototype.viewExists = function (viewName) {
		return Boolean(this._views[viewName]);
	};

	/**
	 * Returns an array of views the DB currently has.
	 * @returns {Array} An array of objects containing details of each view
	 * the database is currently managing.
	 */
	ForerunnerDB.prototype.views = function () {
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

	ForerunnerDB.classes.View = View;
})();