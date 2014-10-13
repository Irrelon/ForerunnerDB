var Shared = require('./Shared'),
	Path = require('./Path');

var ActiveBucket = function (orderBy) {
	var sortKey,
		bucketData;

	this._keyArr = [];
	this._bucketData = {};
	this._count = 0;

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

ActiveBucket.prototype.add = function (obj) {
	var index,
		arr = this._keyArr,
		count = arr.length;

	for (index = 0; index < count; index++) {
		this._bucketData[arr[index]].add(obj);
	}

	this._count++;
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
		multiplier;

	for (index = 0; index < count; index++) {
		multiplier = index === 0 ? 1 : index * 1000;
		positionArr.push((this._bucketData[arr[index]].index(obj) * multiplier));
	}

	return positionArr;
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