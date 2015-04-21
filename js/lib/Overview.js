"use strict";

// Import external names locally
var Shared,
	Core,
	CoreInit,
	Collection,
	Document;

Shared = require('./Shared');

var Overview = function () {
	this.init.apply(this, arguments);
};

Overview.prototype.init = function (name) {
	var self = this;

	this._name = name;
	this._data = new Document('__FDB__dc_data_' + this._name);
	this._collData = new Collection();
	this._collections = [];

	this._collectionDroppedWrap = function () {
		self._collectionDropped.apply(self, arguments);
	};
};

Shared.addModule('Overview', Overview);
Shared.mixin(Overview.prototype, 'Mixin.Common');
Shared.mixin(Overview.prototype, 'Mixin.ChainReactor');
Shared.mixin(Overview.prototype, 'Mixin.Constants');
Shared.mixin(Overview.prototype, 'Mixin.Triggers');
Shared.mixin(Overview.prototype, 'Mixin.Events');

Collection = require('./Collection');
Document = require('./Document');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(Overview.prototype, 'state');

Shared.synthesize(Overview.prototype, 'db');
Shared.synthesize(Overview.prototype, 'name');
Shared.synthesize(Overview.prototype, 'query', function (val) {
	var ret = this.$super(val);

	if (val !== undefined) {
		this._refresh();
	}

	return ret;
});
Shared.synthesize(Overview.prototype, 'queryOptions', function (val) {
	var ret = this.$super(val);

	if (val !== undefined) {
		this._refresh();
	}

	return ret;
});
Shared.synthesize(Overview.prototype, 'reduce', function (val) {
	var ret = this.$super(val);

	if (val !== undefined) {
		this._refresh();
	}

	return ret;
});

Overview.prototype.from = function (collection) {
	if (collection !== undefined) {
		if (typeof(collection) === 'string') {
			collection = this._db.collection(collection);
		}

		this._addCollection(collection);
		return this;
	}

	return this._collections;
};

Overview.prototype.find = function () {
	return this._collData.find.apply(this._collData, arguments);
};

Overview.prototype.count = function () {
	return this._collData.count.apply(this._collData, arguments);
};

Overview.prototype._addCollection = function (collection) {
	if (this._collections.indexOf(collection) === -1) {
		this._collections.push(collection);
		collection.chain(this);

		collection.on('drop', this._collectionDroppedWrap);

		this._refresh();
	}
	return this;
};

Overview.prototype._removeCollection = function (collection) {
	var collectionIndex = this._collections.indexOf(collection);

	if (collectionIndex > -1) {
		this._collections.splice(collection, 1);
		collection.unChain(this);

		collection.off('drop', this._collectionDroppedWrap);

		this._refresh();
	}

	return this;
};

Overview.prototype._collectionDropped = function (collection) {
	if (collection) {
		// Collection was dropped, remove from overview
		this._removeCollection(collection);
	}
};

Overview.prototype._refresh = function () {
	if (this._state !== 'dropped') {
		if (this._collections && this._collections[0]) {
			this._collData.primaryKey(this._collections[0].primaryKey());
			var tempArr = [],
				i;

			for (i = 0; i < this._collections.length; i++) {
				tempArr = tempArr.concat(this._collections[i].find(this._query, this._queryOptions));
			}

			this._collData.setData(tempArr);
		}

		// Now execute the reduce method
		if (this._reduce) {
			var reducedData = this._reduce();

			// Update the document with the newly returned data
			this._data.setData(reducedData);
		}
	}
};

Overview.prototype._chainHandler = function (chainPacket) {
	switch (chainPacket.type) {
		case 'setData':
		case 'insert':
		case 'update':
		case 'remove':
			this._refresh();
			break;

		default:
			break;
	}
};

/**
 * Gets the module's internal data collection.
 * @returns {Collection}
 */
Overview.prototype.data = function () {
	return this._data;
};

Overview.prototype.drop = function () {
	if (this._state !== 'dropped') {
		this._state = 'dropped';

		delete this._data;
		delete this._collData;

		// Remove all collection references
		while (this._collections.length) {
			this._removeCollection(this._collections[0]);
		}

		delete this._collections;

		if (this._db && this._name) {
			delete this._db._overview[this._name];
		}

		delete this._name;

		this.emit('drop', this);
	}

	return true;
};

// Extend DB to include collection groups
Core.prototype.init = function () {
	this._overview = {};
	CoreInit.apply(this, arguments);
};

Core.prototype.overview = function (overviewName) {
	if (overviewName) {
		this._overview[overviewName] = this._overview[overviewName] || new Overview(overviewName).db(this);
		return this._overview[overviewName];
	} else {
		// Return an object of collection data
		return this._overview;
	}
};

Shared.finishModule('Overview');
module.exports = Overview;