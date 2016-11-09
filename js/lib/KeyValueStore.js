"use strict";

var Shared = require('./Shared');

/**
 * The key value store class used when storing basic in-memory KV data,
 * and can be queried for quick retrieval. Mostly used for collection
 * primary key indexes and lookups.
 * @param {String=} name Optional KV store name.
 * @param {Object=} options Optional KV store options object. Currently
 * supports "primaryKey" as a string.
 * @constructor
 */
var KeyValueStore = function (name, options) {
	this.init.apply(this, arguments);
};

KeyValueStore.prototype.init = function (name, options) {
	// Ensure we have options
	options = options || {};
	
	// Set our internal data settings
	this._name = name;
	this._data = {};
	this._primaryKey = options.primaryKey || '_id';
};

Shared.addModule('KeyValueStore', KeyValueStore);
Shared.mixin(KeyValueStore.prototype, 'Mixin.ChainReactor');

/**
 * Get / set the name of the key/value store.
 * @param {String} val The name to set.
 * @returns {*}
 */
Shared.synthesize(KeyValueStore.prototype, 'name');

/**
 * Get / set the primary key.
 * @param {String} key The key to set.
 * @returns {*}
 */
KeyValueStore.prototype.primaryKey = function (key) {
	if (key !== undefined) {
		this._primaryKey = key;
		return this;
	}

	return this._primaryKey;
};

/**
 * Removes all data from the store.
 * @returns {*}
 */
KeyValueStore.prototype.truncate = function () {
	this._data = {};
	return this;
};

/**
 * Sets data against a key in the store.
 * @param {String} key The key to set data for.
 * @param {*} value The value to assign to the key.
 * @returns {*}
 */
KeyValueStore.prototype.set = function (key, value) {
	this._data[key] = value ? value : true;
	return this;
};

/**
 * Gets data stored for the passed key.
 * @param {String} key The key to get data for.
 * @returns {*}
 */
KeyValueStore.prototype.get = function (key) {
	return this._data[key];
};

/**
 * Get / set the primary key.
 * @param {*} val A lookup query.
 * @returns {*}
 */
KeyValueStore.prototype.lookup = function (val) {
	var pk = this._primaryKey,
		valType = typeof val,
		arrIndex,
		arrCount,
		lookupItem,
		result = [];

	// Check for early exit conditions
	if (valType === 'string' || valType === 'number') {
		lookupItem = this.get(val);
		if (lookupItem !== undefined) {
			return [lookupItem];
		} else {
			return [];
		}
	} else if (valType === 'object') {
		if (val instanceof Array) {
			// An array of primary keys, find all matches
			arrCount = val.length;
			result = [];

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				lookupItem = this.lookup(val[arrIndex]);

				if (lookupItem) {
					if (lookupItem instanceof Array) {
						result = result.concat(lookupItem);
					} else {
						result.push(lookupItem);
					}
				}
			}

			return result;
		} else if (val[pk] !== undefined && val[pk] !== null) {
			return this.lookup(val[pk]);
		}
	}

	// COMMENTED AS CODE WILL NEVER BE REACHED
	// Complex lookup
	/*lookupData = this._lookupKeys(val);
	keys = lookupData.keys;
	negate = lookupData.negate;

	if (!negate) {
		// Loop keys and return values
		for (arrIndex = 0; arrIndex < keys.length; arrIndex++) {
			result.push(this.get(keys[arrIndex]));
		}
	} else {
		// Loop data and return non-matching keys
		for (arrIndex in this._data) {
			if (this._data.hasOwnProperty(arrIndex)) {
				if (keys.indexOf(arrIndex) === -1) {
					result.push(this.get(arrIndex));
				}
			}
		}
	}

	return result;*/
};

// COMMENTED AS WE ARE NOT CURRENTLY PASSING COMPLEX QUERIES TO KEYVALUESTORE INDEXES
/*KeyValueStore.prototype._lookupKeys = function (val) {
	var pk = this._primaryKey,
		valType = typeof val,
		arrIndex,
		arrCount,
		lookupItem,
		bool,
		result;

	if (valType === 'string' || valType === 'number') {
		return {
			keys: [val],
			negate: false
		};
	} else if (valType === 'object') {
		if (val instanceof RegExp) {
			// Create new data
			result = [];

			for (arrIndex in this._data) {
				if (this._data.hasOwnProperty(arrIndex)) {
					if (val.test(arrIndex)) {
						result.push(arrIndex);
					}
				}
			}

			return {
				keys: result,
				negate: false
			};
		} else if (val instanceof Array) {
			// An array of primary keys, find all matches
			arrCount = val.length;
			result = [];

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				result = result.concat(this._lookupKeys(val[arrIndex]).keys);
			}

			return {
				keys: result,
				negate: false
			};
		} else if (val.$in && (val.$in instanceof Array)) {
			return {
				keys: this._lookupKeys(val.$in).keys,
				negate: false
			};
		} else if (val.$nin && (val.$nin instanceof Array)) {
			return {
				keys: this._lookupKeys(val.$nin).keys,
				negate: true
			};
		} else if (val.$ne) {
			return {
				keys: this._lookupKeys(val.$ne, true).keys,
				negate: true
			};
		} else if (val.$or && (val.$or instanceof Array)) {
			// Create new data
			result = [];

			for (arrIndex = 0; arrIndex < val.$or.length; arrIndex++) {
				result = result.concat(this._lookupKeys(val.$or[arrIndex]).keys);
			}

			return {
				keys: result,
				negate: false
			};
		} else if (val[pk]) {
			return this._lookupKeys(val[pk]);
		}
	}
};*/

/**
 * Removes data for the given key from the store.
 * @param {String} key The key to un-set.
 * @returns {*}
 */
KeyValueStore.prototype.unSet = function (key) {
	delete this._data[key];
	return this;
};

/**
 * Sets data for the give key in the store only where the given key
 * does not already have a value in the store.
 * @param {String} key The key to set data for.
 * @param {*} value The value to assign to the key.
 * @returns {Boolean} True if data was set or false if data already
 * exists for the key.
 */
KeyValueStore.prototype.uniqueSet = function (key, value) {
	if (this._data[key] === undefined) {
		this._data[key] = value;
		return true;
	}

	return false;
};

Shared.finishModule('KeyValueStore');
module.exports = KeyValueStore;