"use strict";

/*
name(string)
id(string)
rebuild(null)
state ?? needed?
match(query, options)
lookup(query, options)
insert(doc)
remove(doc)
primaryKey(string)
collection(collection)
*/

var Shared = require('./Shared'),
	Path = require('./Path'),
	BinaryTree = require('./BinaryTree');

/**
 * The index class used to instantiate btree indexes that the database can
 * use to speed up queries on collections and views.
 * @constructor
 */
var IndexBinaryTree = function () {
	this.init.apply(this, arguments);
};

IndexBinaryTree.prototype.init = function (keys, options, collection) {
	this._btree = new BinaryTree();
	this._btree.index(keys);
	this._size = 0;
	this._id = this._itemKeyHash(keys, keys);
	this._debug = options && options.debug ? options.debug : false;

	this.unique(options && options.unique ? options.unique : false);

	if (keys !== undefined) {
		this.keys(keys);
	}

	if (collection !== undefined) {
		this.collection(collection);
		this._btree.primaryKey(collection.primaryKey());
	}

	this.name(options && options.name ? options.name : this._id);
	this._btree.debug(this._debug);
};

Shared.addModule('IndexBinaryTree', IndexBinaryTree);
Shared.mixin(IndexBinaryTree.prototype, 'Mixin.ChainReactor');
Shared.mixin(IndexBinaryTree.prototype, 'Mixin.Sorting');

IndexBinaryTree.prototype.id = function () {
	return this._id;
};

IndexBinaryTree.prototype.state = function () {
	return this._state;
};

IndexBinaryTree.prototype.size = function () {
	return this._size;
};

Shared.synthesize(IndexBinaryTree.prototype, 'data');
Shared.synthesize(IndexBinaryTree.prototype, 'name');
Shared.synthesize(IndexBinaryTree.prototype, 'collection');
Shared.synthesize(IndexBinaryTree.prototype, 'type');
Shared.synthesize(IndexBinaryTree.prototype, 'unique');

IndexBinaryTree.prototype.keys = function (val) {
	if (val !== undefined) {
		this._keys = val;

		// Count the keys
		this._keyCount = (new Path()).parse(this._keys).length;
		return this;
	}

	return this._keys;
};

IndexBinaryTree.prototype.rebuild = function () {
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
		this._btree.clear();
		this._size = 0;

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

IndexBinaryTree.prototype.insert = function (dataItem, options) {
	var uniqueFlag = this._unique,
		uniqueHash;

	if (uniqueFlag) {
		uniqueHash = this._itemHash(dataItem, this._keys);
		this._uniqueLookup[uniqueHash] = dataItem;
	}

	if (this._btree.insert(dataItem)) {
		this._size++;

		return true;
	}

	return false;
};

IndexBinaryTree.prototype.remove = function (dataItem, options) {
	var uniqueFlag = this._unique,
		uniqueHash;

	if (uniqueFlag) {
		uniqueHash = this._itemHash(dataItem, this._keys);
		delete this._uniqueLookup[uniqueHash];
	}

	if (this._btree.remove(dataItem)) {
		this._size--;

		return true;
	}

	return false;
};

IndexBinaryTree.prototype.violation = function (dataItem) {
	// Generate item hash
	var uniqueHash = this._itemHash(dataItem, this._keys);

	// Check if the item breaks the unique constraint
	return Boolean(this._uniqueLookup[uniqueHash]);
};

IndexBinaryTree.prototype.hashViolation = function (uniqueHash) {
	// Check if the item breaks the unique constraint
	return Boolean(this._uniqueLookup[uniqueHash]);
};

IndexBinaryTree.prototype.lookup = function (query, options, op) {
	return this._btree.lookup(query, options, op);
};

IndexBinaryTree.prototype.match = function (query, options) {
	return this._btree.match(query, options);
};

IndexBinaryTree.prototype._itemHash = function (item, keys) {
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

IndexBinaryTree.prototype._itemKeyHash = function (item, keys) {
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

IndexBinaryTree.prototype._itemHashArr = function (item, keys) {
	var path = new Path(),
		pathData,
		//hash = '',
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

// Register this index on the shared object
Shared.index.btree = IndexBinaryTree;

Shared.finishModule('IndexBinaryTree');
module.exports = IndexBinaryTree;