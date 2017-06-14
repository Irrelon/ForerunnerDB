"use strict";

var Shared = require('./Shared'),
	Path = require('./Path'),
	sharedPathSolver;

/**
 * Creates an always-sorted multi-key bucket that allows ForerunnerDB to
 * know the index that a document will occupy in an array with minimal
 * processing, speeding up things like sorted views.
 * @param {Object} orderBy An order object.
 * @class
 */
var ActiveBucket = function (orderBy) {
	this._primaryKey = '_id';
	this._keyArr = [];
	this._data = [];
	this._objLookup = {};
	this._count = 0;

	this._keyArr = sharedPathSolver.parse(orderBy, true);
};

Shared.addModule('ActiveBucket', ActiveBucket);
Shared.mixin(ActiveBucket.prototype, 'Mixin.Sorting');

sharedPathSolver = new Path();

/**
 * Gets / sets the primary key used by the active bucket.
 * @returns {String} The current primary key.
 */
Shared.synthesize(ActiveBucket.prototype, 'primaryKey');

/**
 * Quicksorts a single document into the passed array and
 * returns the index that the document should occupy.
 * @param {Object} obj The document to calculate index for.
 * @param {Array} arr The array the document index will be
 * calculated for.
 * @param {String} item The string key representation of the
 * document whose index is being calculated.
 * @param {Function} fn The comparison function that is used
 * to determine if a document is sorted below or above the
 * document we are calculating the index for.
 * @returns {Number} The index the document should occupy.
 */
ActiveBucket.prototype.qs = function (obj, arr, item, fn) {
	// If the array is empty then return index zero
	if (!arr.length) {
		return 0;
	}

	var lastMidwayIndex = -1,
		midwayIndex,
		lookupItem,
		result,
		start = 0,
		end = arr.length - 1;

	// Loop the data until our range overlaps
	while (end >= start) {
		// Calculate the midway point (divide and conquer)
		midwayIndex = Math.floor((start + end) / 2);

		if (lastMidwayIndex === midwayIndex) {
			// No more items to scan
			break;
		}

		// Get the item to compare against
		lookupItem = arr[midwayIndex];

		if (lookupItem !== undefined) {
			// Compare items
			result = fn(this, obj, item, lookupItem);

			if (result > 0) {
				start = midwayIndex + 1;
			}

			if (result < 0) {
				end = midwayIndex - 1;
			}
		}

		lastMidwayIndex = midwayIndex;
	}

	if (result > 0) {
		return midwayIndex + 1;
	} else {
		return midwayIndex;
	}

};

/**
 * Calculates the sort position of an item against another item.
 * @param {Object} sorter An object or instance that contains
 * sortAsc and sortDesc methods.
 * @param {Object} obj The document to compare.
 * @param {String} a The first key to compare.
 * @param {String} b The second key to compare.
 * @returns {Number} Either 1 for sort a after b or -1 to sort
 * a before b.
 * @private
 */
ActiveBucket.prototype._sortFunc = function (sorter, obj, a, b) {
	var aVals = a.split('.:.'),
		bVals = b.split('.:.'),
		arr = sorter._keyArr,
		count = arr.length,
		index,
		sortType,
		castType;

	for (index = 0; index < count; index++) {
		sortType = arr[index];
		castType = typeof sharedPathSolver.get(obj, sortType.path);

		if (castType === 'number') {
			aVals[index] = Number(aVals[index]);
			bVals[index] = Number(bVals[index]);
		}

		// Check for non-equal items
		if (aVals[index] !== bVals[index]) {
			// Return the sorted items
			if (sortType.value === 1) {
				return sorter.sortAsc(aVals[index], bVals[index]);
			}

			if (sortType.value === -1) {
				return sorter.sortDesc(aVals[index], bVals[index]);
			}
		}
	}
};

/**
 * Inserts a document into the active bucket.
 * @param {Object} obj The document to insert.
 * @returns {Number} The index the document now occupies.
 */
ActiveBucket.prototype.insert = function (obj) {
	var key,
		keyIndex;

	key = this.documentKey(obj);
	keyIndex = this._data.indexOf(key);

	if (keyIndex === -1) {
		// Insert key
		keyIndex = this.qs(obj, this._data, key, this._sortFunc);

		this._data.splice(keyIndex, 0, key);
	} else {
		this._data.splice(keyIndex, 0, key);
	}

	this._objLookup[obj[this._primaryKey]] = key;

	this._count++;
	return keyIndex;
};

/**
 * Removes a document from the active bucket.
 * @param {Object} obj The document to remove.
 * @returns {Number} The index of the document if the document
 * was removed successfully or -1 if it wasn't found in the
 * active bucket.
 */
ActiveBucket.prototype.remove = function (obj) {
	var key,
		keyIndex;

	key = this._objLookup[obj[this._primaryKey]];

	if (key) {
		keyIndex = this._data.indexOf(key);

		if (keyIndex > -1) {
			this._data.splice(keyIndex, 1);
			delete this._objLookup[obj[this._primaryKey]];

			this._count--;
			return keyIndex;
		} else {
			return keyIndex;
		}
	}

	return -1;
};

/**
 * Get the index that the passed document currently occupies
 * or the index it will occupy if added to the active bucket.
 * @param {Object} obj The document to get the index for.
 * @returns {Number} The index.
 */
ActiveBucket.prototype.index = function (obj) {
	var key,
		keyIndex;

	key = this.documentKey(obj);
	keyIndex = this._data.indexOf(key);

	if (keyIndex === -1) {
		// Get key index
		keyIndex = this.qs(obj, this._data, key, this._sortFunc);
	}

	return keyIndex;
};

/**
 * The key that represents the passed document.
 * @param {Object} obj The document to get the key for.
 * @returns {String} The document key.
 */
ActiveBucket.prototype.documentKey = function (obj) {
	var key = '',
		arr = this._keyArr,
		count = arr.length,
		val,
		index,
		sortType;
	
	for (index = 0; index < count; index++) {
		sortType = arr[index];
		
		if (key) {
			key += '.:.';
		}
		
		val = sharedPathSolver.get(obj, sortType.path);
		
		if (val !== undefined) {
			// The value of the sort path in the object is not undefined
			key += val;
		} else {
			// The value of the sort path in the object is undefined. This
			// will cause sorting issues. undefined is therefore recorded
			// as string zero which will sort to low value.
			key += "0";
		}
	}
	
	// Add the unique identifier on the end of the key
	key += '.:.' + obj[this._primaryKey];
	
	return key;
};

/**
 * Get the number of documents currently indexed in the active
 * bucket instance.
 * @returns {Number} The number of documents.
 */
ActiveBucket.prototype.count = function () {
	return this._count;
};

Shared.finishModule('ActiveBucket');
module.exports = ActiveBucket;