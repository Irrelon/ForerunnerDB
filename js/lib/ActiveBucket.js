var Shared = require('./Shared'),
	Path = require('./Path');

var ActiveBucket = function (orderBy) {
	var sortKey,
		bucketData;

	this._primaryKey = '_id';
	this._keyArr = [];
	this._bucketData = {};
	this._count = 0;
	this._order = [];
	this._ref = {};

	for (sortKey in orderBy) {
		if (orderBy.hasOwnProperty(sortKey)) {
			/*sortSingleObj = {};
			sortSingleObj[sortKey] = orderBy[sortKey];
			sortSingleObj.___fdbKey = sortKey;*/
			this._keyArr.push(sortKey);

			bucketData = this._bucketData[sortKey] = new BucketData();
			bucketData._path = sortKey;
			bucketData._dir = orderBy[sortKey];
		}
	}
};

Shared.addModule('ActiveBucket', ActiveBucket);
Shared.synthesize(ActiveBucket.prototype, 'primaryKey');

ActiveBucket.prototype.add = function (obj) {
	var index,
		docIndex,
		arr = this._keyArr,
		count = arr.length;

	for (index = 0; index < count; index++) {
		this._bucketData[arr[index]].add(obj);
	}

	// Create a reference to the document
	this._addRef(obj);

	this._count++;
};

ActiveBucket.prototype._addRef = function (obj) {
	var index,
		arr = this._keyArr,
		arrCount = arr.length,
		currRef = this._ref,
		key,
		keyValue;

	for (index = 0; index < arrCount; index++) {
		key = arr[index];
		keyValue = obj[key];

		if (index === arrCount - 1) {
			// This is the last key, assign the object
			currRef = currRef[keyValue] = currRef[keyValue] || [];

			// Push the object to the array
			currRef.push(obj);
		} else {
			currRef = currRef[keyValue] = currRef[keyValue] || {};
		}
	}
};

ActiveBucket.prototype.remove = function (obj) {
	this._bucketData.remove(obj);
	this._count--;
};

ActiveBucket.prototype.index = function (obj) {
	var index,
		positionArr = [],
		arr = this._keyArr,
		count = arr.length,
		docIndex,
		key,
		currRef = this._ref,
		finalIndex;

	for (index = 0; index < count; index++) {
		key = arr[index];
		currRef = currRef[obj[key]];

		docIndex = this._bucketData[key].index(obj);
		docIndex = index === 0 ? docIndex : ("000000" + docIndex).slice(-6);

		if (index === count - 1) {
			// Assign the array index to the index
			finalIndex = currRef.indexOf(obj);

			if (finalIndex === -1) {
				finalIndex = currRef.length;
			}

			docIndex += '.' + ("000000" + finalIndex).slice(-6);
		}

		positionArr.push(docIndex);
	}

	return positionArr.join('.');
};

ActiveBucket.prototype.count = function () {
	return this._count;
};

BucketData = function () {
	this._path = ''; // The name of the key to sort on
	this._dir = 1; // The direction to sort in (defaults to ascending)
	this._data = {}; // The bucket's data
	this._order = []; // The sorted keys
	this._count = 0; // The overall number of objects held in reference
};

BucketData.prototype.add = function (obj) {
	var keyValue = obj[this._path];

	// Check if the object has the path we need to sort on
	if (keyValue !== undefined) {
		// Check if this is a new key or existing one
		if (this._data[keyValue] === undefined) {
			// Add the new key as an object we can store further data against
			this._data[keyValue] = 1;

			// Add the key to the order array
			this._order.push(keyValue);

			// Sort the key array so it's always up to date
			if (this._dir === 1) {
				// Sort ascending
				this._order.sort(this._sortAsc);
			} else if (this._dir === -1) {
				// Sort descending
				this._order.sort(this._sortDesc);
			}
		} else {
			// Add to the existing reference count
			this._data[keyValue]++;
		}

		this._count++;
	}
};

BucketData.prototype.remove = function (obj) {
	var keyValue = obj[this._path],
		keyIndex;

	// Check if the object has the path we need to sort on
	if (keyValue !== undefined) {
		// Check if this is a new key or existing one
		if (this._data[keyValue]) {
			// Dereference this object from the ref counter
			this._data[keyValue]--;

			// Check if the key is no longer referenced
			if (this._data[keyValue] === 0) {
				// The key is no longer referenced, remove it
				keyIndex = this._order.indexOf(keyValue);

				if (keyIndex > -1) {
					this._order.splice(keyIndex, 1);
				}

				delete this._data[keyValue];
			}
		}

		this._count--;
	}
};

BucketData.prototype.index = function (obj) {
	return this._order.indexOf(obj[this._path]);
};

BucketData.prototype.count = function  () {
	return this._count;
};

BucketData.prototype.keyCount = function () {
	return this._order.length;
};

BucketData.prototype._sortAsc = function (a, b) {
	if (typeof(a) === 'string' && typeof(b) === 'string') {
		return a.localeCompare(b);
	} else {
		if (a > b) {
			return 1;
		} else if (a < b) {
			return -1;
		}
	}

	return 0;
};

BucketData.prototype._sortDesc = function (a, b) {
	if (typeof(a) === 'string' && typeof(b) === 'string') {
		return a.localeCompare(b) === true ? -1 : 1;
	} else {
		if (a > b) {
			return -1;
		} else if (a < b) {
			return 1;
		}
	}

	return 0;
};

Shared.addModule('BucketData', BucketData);