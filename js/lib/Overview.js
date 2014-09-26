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
};

Shared.addModule('Overview', Overview);
Shared.inherit(Overview.prototype, Shared.chainSystem);

Collection = require('./Collection');
Document = require('./Document');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

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

/**
 * Gets / sets debug flag that can enable debug message output to the
 * console if required.
 * @param {Boolean} val The value to set debug flag to.
 * @return {Boolean} True if enabled, false otherwise.
 */
/**
 * Sets debug flag for a particular type that can enable debug message
 * output to the console if required.
 * @param {String} type The name of the debug type to set flag for.
 * @param {Boolean} val The value to set debug flag to.
 * @return {Boolean} True if enabled, false otherwise.
 */
Overview.prototype.debug = Shared.common.debug;
Overview.prototype.objectId = Shared.common.objectId;

Overview.prototype.from = function (collection) {
	if (collection !== undefined) {
		if (typeof(collection) === 'string') {
			collection = this._db.collection(collection);
		}

		this._addCollection(collection);
	}

	return this;
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
		this._refresh();
	}
	return this;
};

Overview.prototype._removeCollection = function (collection) {
	var collectionIndex = this._collections.indexOf(collection);
	if (collectionIndex > -1) {
		this._collections.splice(collection, 1);
		collection.unChain(this);
		this._refresh();
	}

	return this;
};

Overview.prototype._refresh = function () {
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

};

Overview.prototype._chainHandler = function (sender, type, data, options) {
	switch (type) {
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
 * Creates a link to the DOM between the overview data and the elements
 * in the passed output selector. When new elements are needed or changes
 * occur the passed templateSelector is used to get the template that is
 * output to the DOM.
 * @param outputTargetSelector
 * @param templateSelector
 */
Overview.prototype.link = function (outputTargetSelector, templateSelector) {
	this._data.link.apply(this._data, arguments);
	this._refresh();
};

/**
 * Removes a link to the DOM between the overview data and the elements
 * in the passed output selector that was created using the link() method.
 * @param outputTargetSelector
 * @param templateSelector
 */
Overview.prototype.unlink = function (outputTargetSelector, templateSelector) {
	this._data.unlink.apply(this._data, arguments);
	this._refresh();
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

module.exports = Overview;