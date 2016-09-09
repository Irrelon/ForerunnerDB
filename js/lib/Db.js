"use strict";

var Shared,
	Core,
	Collection,
	Metrics,
	Overload;

Shared = require('./Shared');
Overload = require('./Overload');

/**
 * Creates a new ForerunnerDB database instance.
 * @constructor
 */
var Db = function (name, core) {
	this.init.apply(this, arguments);
};

Db.prototype.init = function (name, core) {
	this.core(core);
	this._primaryKey = '_id';
	this._name = name;
	this._collection = {};
	this._debug = {};
};

Shared.addModule('Db', Db);

Db.prototype.moduleLoaded = new Overload({
	/**
	 * Checks if a module has been loaded into the database.
	 * @func moduleLoaded
	 * @memberof Db
	 * @param {String} moduleName The name of the module to check for.
	 * @returns {Boolean} True if the module is loaded, false if not.
	 */
	'string': function (moduleName) {
		if (moduleName !== undefined) {
			moduleName = moduleName.replace(/ /g, '');

			var modules = moduleName.split(','),
				index;

			for (index = 0; index < modules.length; index++) {
				if (!Shared.modules[modules[index]]) {
					return false;
				}
			}

			return true;
		}

		return false;
	},

	/**
	 * Checks if a module is loaded and if so calls the passed
	 * callback method.
	 * @func moduleLoaded
	 * @memberof Db
	 * @param {String} moduleName The name of the module to check for.
	 * @param {Function} callback The callback method to call if module is loaded.
	 */
	'string, function': function (moduleName, callback) {
		if (moduleName !== undefined) {
			moduleName = moduleName.replace(/ /g, '');

			var modules = moduleName.split(','),
				index;

			for (index = 0; index < modules.length; index++) {
				if (!Shared.modules[modules[index]]) {
					return false;
				}
			}

			if (callback) { callback(); }
		}
	},

	/**
	 * Checks if a module is loaded and if so calls the passed
	 * success method, otherwise calls the failure method.
	 * @func moduleLoaded
	 * @memberof Db
	 * @param {String} moduleName The name of the module to check for.
	 * @param {Function} success The callback method to call if module is loaded.
	 * @param {Function} failure The callback method to call if module not loaded.
	 */
	'string, function, function': function (moduleName, success, failure) {
		if (moduleName !== undefined) {
			moduleName = moduleName.replace(/ /g, '');

			var modules = moduleName.split(','),
				index;

			for (index = 0; index < modules.length; index++) {
				if (!Shared.modules[modules[index]]) {
					failure();
					return false;
				}
			}

			success();
		}
	}
});

/**
 * Checks version against the string passed and if it matches (or partially matches)
 * then the callback is called.
 * @param {String} val The version to check against.
 * @param {Function} callback The callback to call if match is true.
 * @returns {Boolean}
 */
Db.prototype.version = function (val, callback) {
	if (val !== undefined) {
		if (Shared.version.indexOf(val) === 0) {
			if (callback) { callback(); }
			return true;
		}

		return false;
	}

	return Shared.version;
};

// Expose moduleLoaded method to non-instantiated object ForerunnerDB
Db.moduleLoaded = Db.prototype.moduleLoaded;

// Expose version method to non-instantiated object ForerunnerDB
Db.version = Db.prototype.version;

// Provide public access to the Shared object
Db.shared = Shared;
Db.prototype.shared = Shared;

Shared.addModule('Db', Db);
Shared.mixin(Db.prototype, 'Mixin.Common');
Shared.mixin(Db.prototype, 'Mixin.ChainReactor');
Shared.mixin(Db.prototype, 'Mixin.Constants');
Shared.mixin(Db.prototype, 'Mixin.Tags');
Shared.mixin(Db.prototype, 'Mixin.Events');

Core = Shared.modules.Core;
Collection = require('./Collection.js');
Metrics = require('./Metrics.js');

Db.prototype._isServer = false;

/**
 * Gets / sets the core object this database belongs to.
 */
Shared.synthesize(Db.prototype, 'core');

/**
 * Gets / sets the default primary key for new collections.
 * @param {String=} val The name of the primary key to set.
 * @returns {*}
 */
Shared.synthesize(Db.prototype, 'primaryKey');

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(Db.prototype, 'state');

/**
 * Gets / sets the name of the database.
 * @param {String=} val The name of the database to set.
 * @returns {*}
 */
Shared.synthesize(Db.prototype, 'name');

/**
 * Gets / sets mongodb emulation mode.
 * @param {Boolean=} val True to enable, false to disable.
 * @returns {*}
 */
Shared.synthesize(Db.prototype, 'mongoEmulation');

/**
 * Returns true if ForerunnerDB is running on a client browser.
 * @returns {boolean}
 */
Db.prototype.isClient = function () {
	return !this._isServer;
};

/**
 * Returns true if ForerunnerDB is running on a server.
 * @returns {boolean}
 */
Db.prototype.isServer = function () {
	return this._isServer;
};

/**
 * Checks if the database is running on a client (browser) or
 * a server (node.js).
 * @returns {Boolean} Returns true if running on a browser.
 */
Db.prototype.isClient = function () {
	return !this._isServer;
};

/**
 * Checks if the database is running on a client (browser) or
 * a server (node.js).
 * @returns {Boolean} Returns true if running on a server.
 */
Db.prototype.isServer = function () {
	return this._isServer;
};

/**
 * Converts a normal javascript array of objects into a DB collection.
 * @param {Array} arr An array of objects.
 * @returns {Collection} A new collection instance with the data set to the
 * array passed.
 */
Db.prototype.arrayToCollection = function (arr) {
	return new Collection().setData(arr);
};

/**
 * Registers an event listener against an event name.
 * @param {String} event The name of the event to listen for.
 * @param {Function} listener The listener method to call when
 * the event is fired.
 * @returns {*}
 */
/*Db.prototype.on = function(event, listener) {
	this._listeners = this._listeners || {};
	this._listeners[event] = this._listeners[event] || [];
	this._listeners[event].push(listener);

	return this;
};*/

/**
 * De-registers an event listener from an event name.
 * @param {String} event The name of the event to stop listening for.
 * @param {Function} listener The listener method passed to on() when
 * registering the event listener.
 * @returns {*}
 */
/*Db.prototype.off = function(event, listener) {
	if (event in this._listeners) {
		var arr = this._listeners[event],
			index = arr.indexOf(listener);

		if (index > -1) {
			arr.splice(index, 1);
		}
	}

	return this;
};*/

/**
 * Emits an event by name with the given data.
 * @param {String} event The name of the event to emit.
 * @param {*=} data The data to emit with the event.
 * @returns {*}
 */
/*Db.prototype.emit = function(event, data) {
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

Db.prototype.peek = function (search) {
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
 * string or search object.
 * @param search String or search object.
 * @returns {Array}
 */
Db.prototype.peek = function (search) {
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
 * @returns {Object}
 */
Db.prototype.peekCat = function (search) {
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

Db.prototype.drop = new Overload({
	/**
	 * Drops the database.
	 * @func drop
	 * @memberof Db
	 */
	'': function () {
		if (!this.isDropped()) {
			var arr = this.collections(),
				arrCount = arr.length,
				arrIndex;

			this._state = 'dropped';

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				this.collection(arr[arrIndex].name).drop();
				delete this._collection[arr[arrIndex].name];
			}

			this.emit('drop', this);

			delete this._listeners;
			delete this._core._db[this._name];
		}

		return true;
	},

	/**
	 * Drops the database with optional callback method.
	 * @func drop
	 * @memberof Db
	 * @param {Function} callback Optional callback method.
	 */
	'function': function (callback) {
		if (!this.isDropped()) {
			var arr = this.collections(),
				arrCount = arr.length,
				arrIndex,
				finishCount = 0,
				afterDrop = function () {
					finishCount++;

					if (finishCount === arrCount) {
						if (callback) { callback();	}
					}
				};

			this._state = 'dropped';

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				this.collection(arr[arrIndex].name).drop(afterDrop);

				delete this._collection[arr[arrIndex].name];
			}

			this.emit('drop', this);

			delete this._listeners;
			delete this._core._db[this._name];
		}

		return true;
	},

	/**
	 * Drops the database with optional persistent storage drop. Persistent
	 * storage is dropped by default if no preference is provided.
	 * @func drop
	 * @memberof Db
	 * @param {Boolean} removePersist Drop persistent storage for this database.
	 */
	'boolean': function (removePersist) {
		if (!this.isDropped()) {
			var arr = this.collections(),
				arrCount = arr.length,
				arrIndex;

			this._state = 'dropped';

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				this.collection(arr[arrIndex].name).drop(removePersist);
				delete this._collection[arr[arrIndex].name];
			}

			this.emit('drop', this);

			delete this._listeners;
			delete this._core._db[this._name];
		}

		return true;
	},

	/**
	 * Drops the database and optionally controls dropping persistent storage
	 * and callback method.
	 * @func drop
	 * @memberof Db
	 * @param {Boolean} removePersist Drop persistent storage for this database.
	 * @param {Function} callback Optional callback method.
	 */
	'boolean, function': function (removePersist, callback) {
		if (!this.isDropped()) {
			var arr = this.collections(),
				arrCount = arr.length,
				arrIndex,
				finishCount = 0,
				afterDrop = function () {
					finishCount++;

					if (finishCount === arrCount) {
						if (callback) { callback();	}
					}
				};

			this._state = 'dropped';

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				this.collection(arr[arrIndex].name).drop(removePersist, afterDrop);
				delete this._collection[arr[arrIndex].name];
			}

			this.emit('drop', this);

			delete this._listeners;
			delete this._core._db[this._name];
		}

		return true;
	}
});

/**
 * Gets a database instance by name.
 * @memberof Core
 * @param {String=} name Optional name of the database. If none is provided
 * a random name is assigned.
 * @returns {Db}
 */
Core.prototype.db = function (name) {
	// Handle being passed an instance
	if (name instanceof Db) {
		return name;
	}

	if (!name) {
		name = this.objectId();
	}

	this._db[name] = this._db[name] || new Db(name, this);

	this._db[name].mongoEmulation(this.mongoEmulation());

	return this._db[name];
};

/**
 * Returns an array of databases that ForerunnerDB currently has.
 * @memberof Core
 * @param {String|RegExp=} search The optional search string or regular expression to use
 * to match collection names against.
 * @returns {Array} An array of objects containing details of each database
 * that ForerunnerDB is currently managing and it's child entities.
 */
Core.prototype.databases = function (search) {
	var arr = [],
		tmpObj,
		addDb,
		i;

	if (search) {
		if (!(search instanceof RegExp)) {
			// Turn the search into a regular expression
			search = new RegExp(search);
		}
	}

	for (i in this._db) {
		if (this._db.hasOwnProperty(i)) {
			addDb = true;

			if (search) {
				if (!search.exec(i)) {
					addDb = false;
				}
			}

			if (addDb) {
				tmpObj = {
					name: i,
					children: []
				};

				if (this.shared.moduleExists('Collection')) {
					tmpObj.children.push({
						module: 'collection',
						moduleName: 'Collections',
						count: this._db[i].collections().length
					});
				}

				if (this.shared.moduleExists('CollectionGroup')) {
					tmpObj.children.push({
						module: 'collectionGroup',
						moduleName: 'Collection Groups',
						count: this._db[i].collectionGroups().length
					});
				}

				if (this.shared.moduleExists('Document')) {
					tmpObj.children.push({
						module: 'document',
						moduleName: 'Documents',
						count: this._db[i].documents().length
					});
				}

				if (this.shared.moduleExists('Grid')) {
					tmpObj.children.push({
						module: 'grid',
						moduleName: 'Grids',
						count: this._db[i].grids().length
					});
				}

				if (this.shared.moduleExists('Overview')) {
					tmpObj.children.push({
						module: 'overview',
						moduleName: 'Overviews',
						count: this._db[i].overviews().length
					});
				}

				if (this.shared.moduleExists('View')) {
					tmpObj.children.push({
						module: 'view',
						moduleName: 'Views',
						count: this._db[i].views().length
					});
				}

				arr.push(tmpObj);
			}
		}
	}

	arr.sort(function (a, b) {
		return a.name.localeCompare(b.name);
	});

	return arr;
};

Shared.finishModule('Db');
module.exports = Db;