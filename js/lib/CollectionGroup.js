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
	this._collectionArr = [];
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
		if (this._collectionArr.indexOf(collection) === -1) {
			var self = this;

			// Check for compatible primary keys
			if (this._collectionArr.length) {
				if (this._primaryKey !== collection.primaryKey()) {
					throw("All collections in a collection group must have the same primary key!");
				}
			} else {
				// Set the primary key to the first collection added
				this.primaryKey(collection.primaryKey());
			}

			// Add the collection
			this._collectionArr.push(collection);
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
		var collectionIndex = this._collectionArr.indexOf(collection),
			groupIndex;

		if (collectionIndex !== -1) {
			collection.unChain(this);
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

CollectionGroup.prototype.find = function (query, options) {
	return this._data.find(query, options);
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