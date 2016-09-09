"use strict";

// Import external names locally
var Shared,
	Collection;

Shared = require('./Shared');

/**
 * The ODM class provides some experimental interfaces for accessing collection data.
 * This is considered alpha code and should not be used in production.
 * @experimental
 * @class
 * @constructor
 */
var Odm = function () {
	this.init.apply(this, arguments);
};

Odm.prototype.init = function (from, name) {
	var self = this;

	self.name(name);

	self._collectionDroppedWrap = function () {
		self._collectionDropped.apply(self, arguments);
	};

	self.from(from);
};

Shared.addModule('Odm', Odm);
Shared.mixin(Odm.prototype, 'Mixin.Common');
Shared.mixin(Odm.prototype, 'Mixin.ChainReactor');
Shared.mixin(Odm.prototype, 'Mixin.Constants');
Shared.mixin(Odm.prototype, 'Mixin.Events');

Collection = require('./Collection');

Shared.synthesize(Odm.prototype, 'name');
Shared.synthesize(Odm.prototype, 'state');
Shared.synthesize(Odm.prototype, 'parent');
Shared.synthesize(Odm.prototype, 'query');
Shared.synthesize(Odm.prototype, 'from', function (val) {
	if (val !== undefined) {
		val.chain(this);
		val.on('drop', this._collectionDroppedWrap);
	}

	return this.$super(val);
});

Odm.prototype._collectionDropped = function (collection) {
	this.drop();
};

Odm.prototype._chainHandler = function (chainPacket) {
	switch (chainPacket.type) {
		case 'setData':
		case 'insert':
		case 'update':
		case 'remove':
			//this._refresh();
			break;

		default:
			break;
	}
};

Odm.prototype.drop = function () {
	if (!this.isDropped()) {
		this.state('dropped');

		this.emit('drop', this);

		if (this._from) {
			delete this._from._odm;
		}

		delete this._listeners;
	}

	return true;
};

/**
 * Queries the current object and returns a result that can
 * also be queried in the same way.
 * @param {String} prop The property to delve into.
 * @param {Object=} query Optional query that limits the returned documents.
 * @returns {Odm}
 */
Odm.prototype.$ = function (prop, query) {
	var data,
		tmpQuery,
		tmpColl,
		tmpOdm;

	if (prop === this._from.primaryKey()) {
		// Query is against a specific PK id
		tmpQuery = {};
		tmpQuery[prop] = query;

		data = this._from.find(tmpQuery, {$decouple: false});
		tmpColl = new Collection();

		tmpColl.setData(data, {$decouple: false});
		tmpColl._linked = this._from._linked;
	} else {
		// Query is against an array of sub-documents
		tmpColl = new Collection();
		data = this._from.find({}, {$decouple: false});

		if (data[0] && data[0][prop]) {
			// Set the temp collection data to the array property
			tmpColl.setData(data[0][prop], {$decouple: false});

			// Check if we need to filter this array further
			if (query) {
				data = tmpColl.find(query, {$decouple: false});
				tmpColl.setData(data, {$decouple: false});
			}
		}

		tmpColl._linked = this._from._linked;
	}

	tmpOdm = new Odm(tmpColl);

	tmpOdm.parent(this);
	tmpOdm.query(query);

	return tmpOdm;
};

/**
 * Gets / sets a property on the current ODM document.
 * @param {String} prop The name of the property.
 * @param {*} val Optional value to set.
 * @returns {*}
 */
Odm.prototype.prop = function (prop, val) {
	var tmpQuery;

	if (prop !== undefined) {
		if (val !== undefined) {
			tmpQuery = {};
			tmpQuery[prop] = val;

			return this._from.update({}, tmpQuery);
		}

		if (this._from._data[0]) {
			return this._from._data[0][prop];
		}
	}

	return undefined;
};

/**
 * Get the ODM instance for this collection.
 * @returns {Odm}
 */
Collection.prototype.odm = function (name) {
	if (!this._odm) {
		this._odm = new Odm(this, name);
	}

	return this._odm;
};

Shared.finishModule('Odm');
module.exports = Odm;