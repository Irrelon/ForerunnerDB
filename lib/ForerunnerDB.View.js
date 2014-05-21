(function () {
	var init = (function (ForerunnerDB) {
		// Import external names locally
		var Collection = ForerunnerDB.classes.Collection,
			CollectionGroup = ForerunnerDB.classes.CollectionGroup,
			CollectionInit = Collection.prototype.init,
			DBInit = ForerunnerDB.prototype.init,
			Overload = ForerunnerDB.classes.Overload;

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

			this._data = new Collection('__FDB__view_' + this._name);
		};

		/**
		 * Queries the view data. See Collection.find() for more information.
		 * @returns {*}
		 */
		View.prototype.find = function (query, options) {
			return this._data.find(query, options);
		};

		/**
		 * Inserts into view data via the view collection. See Collection.insert() for more information.
		 * @returns {*}
		 */
		View.prototype.insert = function (data, index, callback) {
			// Decouple the data to ensure we are working with our own copy
			data = this._data.decouple(data);

			if (typeof(index) === 'function') {
				callback = index;
				index = this._data.length;
			} else if (index === undefined) {
				index = this._data.length;
			}

			return this._data._insertHandle(data, index, callback);
		};

		/**
		 * Updates into view data via the view collection. See Collection.update() for more information.
		 * @returns {*}
		 */
		View.prototype.update = function (query, update) {
			return this._data.update(query, update);
		};

		/**
		 * Removed from view data via the view collection. See Collection.remove() for more information.
		 * @returns {*}
		 */
		View.prototype.remove = function (query) {
			return this._data.remove(query);
		};

		View.prototype.link = function (outputTargetSelector, templateSelector) {
			return this._data.link(outputTargetSelector, templateSelector);
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
				this._data.primaryKey(collection.primaryKey());

				this._data.insert(collection.find(this._querySettings.query, this._querySettings.options));
			}
			return this;
		};

		View.prototype._removeCollection = function (collection) {
			var collectionIndex = this._collections.indexOf(collection);
			if (collectionIndex > -1) {
				this._collections.splice(collection, 1);
				collection._removeView(this);
				this._data.remove(collection.find(this._querySettings.query, this._querySettings.options));
			}

			return this;
		};

		View.prototype.on = function () {
			this._data.on.apply(this._data, arguments);
		};

		View.prototype.off = function () {
			this._data.off.apply(this._data, arguments);
		};

		View.prototype.emit = function () {
			this._data.emit.apply(this._data, arguments);
		};

		/**
		 * Drops a view and all it's stored data from the database.
		 * @returns {boolean} True on success, false on failure.
		 */
		View.prototype.drop = function () {
			if (this._collections && this._collections.length) {
				if (this._debug || (this._db && this._db._debug)) {
					console.log('ForerunnerDB.View: Dropping view ' + this._name);
				}

				this.emit('drop');

				// Loop collections and remove us from them
				var arrCount = this._collections.length;
				while (arrCount--) {
					this._removeCollection(this._collections[arrCount]);
				}

				// Drop the view's internal collection
				this._data.drop();

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
		 * Gets the primary key for this view from the assigned collection.
		 * @returns {String}
		 */
		View.prototype.primaryKey = function () {
			return this._data.primaryKey();
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
			var sortedData = this.find({}, this._querySettings.options);

			if (this._data._linked) {
				// Update data and observers
				$.observable(this._data._data).refresh(sortedData);
			} else {
				// Update the underlying data with the new sorted data
				this._data._data.length = 0;
				this._data._data = this._data._data.concat(sortedData);
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

		// Extend collection with view init
		Collection.prototype.init = function () {
			this._views = [];
			CollectionInit.apply(this, arguments);
		};

		Collection.prototype.view = function (name, query, options) {
			var view = new View(name, query, options)
				._addCollection(this)
				.db(this._db);

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
				if (this._debug || (this._db && this._db._debug)) {
					console.log('ForerunnerDB.View: Creating view ' + viewName);
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
	});

	if (typeof(define) === 'function' && define.amd) {
		// Use AMD
		define(['require', '../ForerunnerDB', './ForerunnerDB.CollectionGroup'], function (require, ForerunnerDB) {
			return init(ForerunnerDB);
		});
	} else {
		// Use global
		init(ForerunnerDB);
	}
})();