"use strict";

var Shared = require('./Shared'),
	Path = require('./Path');

var BinaryTree = function (data, compareFunc, hashFunc) {
	this.init.apply(this, arguments);
};

BinaryTree.prototype.init = function (data, index, compareFunc, hashFunc) {
	this._store = [];
	this._keys = [];

	if (index !== undefined) { this.index(index); }
	if (compareFunc !== undefined) { this.compareFunc(compareFunc); }
	if (hashFunc !== undefined) { this.hashFunc(hashFunc); }
	if (data !== undefined) { this.data(data); }
};

Shared.addModule('BinaryTree', BinaryTree);
Shared.mixin(BinaryTree.prototype, 'Mixin.ChainReactor');
Shared.mixin(BinaryTree.prototype, 'Mixin.Sorting');
Shared.mixin(BinaryTree.prototype, 'Mixin.Common');

Shared.synthesize(BinaryTree.prototype, 'compareFunc');
Shared.synthesize(BinaryTree.prototype, 'hashFunc');
Shared.synthesize(BinaryTree.prototype, 'indexDir');
Shared.synthesize(BinaryTree.prototype, 'keys');
Shared.synthesize(BinaryTree.prototype, 'index', function (index) {
	if (index !== undefined) {
		// Convert the index object to an array of key val objects
		this.keys(this.extractKeys(index));
	}

	return this.$super.call(this, index);
});

BinaryTree.prototype.extractKeys = function (obj) {
	var i,
		keys = [];

	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			keys.push({
				key: i,
				val: obj[i]
			});
		}
	}

	return keys;
};

BinaryTree.prototype.data = function (val) {
	if (val !== undefined) {
		this._data = val;

		if (this._hashFunc) { this._hash = this._hashFunc(val); }
		return this;
	}

	return this._data;
};

/**
 * Pushes an item to the binary tree node's store array.
 * @param {*} val The item to add to the store.
 * @returns {*}
 */
BinaryTree.prototype.push = function (val) {
	if (val !== undefined) {
		this._store.push(val);
		return this;
	}

	return false;
};

/**
 * Pulls an item from the binary tree node's store array.
 * @param {*} val The item to remove from the store.
 * @returns {*}
 */
BinaryTree.prototype.pull = function (val) {
	if (val !== undefined) {
		var index = this._store.indexOf(val);

		if (index > -1) {
			this._store.splice(index, 1);
			return this;
		}
	}

	return false;
};

/**
 * Default compare method. Can be overridden.
 * @param a
 * @param b
 * @returns {number}
 * @private
 */
BinaryTree.prototype._compareFunc = function (a, b) {
	// Loop the index array
	var i,
		indexData,
		result = 0;

	for (i = 0; i < this._keys.length; i++) {
		indexData = this._keys[i];

		if (indexData.val === 1) {
			result = this.sortAsc(a[indexData.key], b[indexData.key]);
		} else if (indexData.val === -1) {
			result = this.sortDesc(a[indexData.key], b[indexData.key]);
		}

		if (result !== 0) {
			return result;
		}
	}

	return result;
};

/**
 * Default hash function. Can be overridden.
 * @param obj
 * @private
 */
BinaryTree.prototype._hashFunc = function (obj) {
	/*var i,
		indexData,
		hash = '';

	for (i = 0; i < this._keys.length; i++) {
		indexData = this._keys[i];

		if (hash) { hash += '_'; }
		hash += obj[indexData.key];
	}

	return hash;*/

	return obj[this._keys[0].key];
};

BinaryTree.prototype.insert = function (data) {
	var result,
		inserted,
		failed,
		i;

	if (data instanceof Array) {
		// Insert array of data
		inserted = [];
		failed = [];

		for (i = 0; i < data.length; i++) {
			if (this.insert(data[i])) {
				inserted.push(data[i]);
			} else {
				failed.push(data[i]);
			}
		}

		return {
			inserted: inserted,
			failed: failed
		};
	}

	if (!this._data) {
		// Insert into this node (overwrite) as there is no data
		this.data(data);
		//this.push(data);
		return true;
	}

	result = this._compareFunc(this._data, data);

	if (result === 0) {
		this.push(data);

		// Less than this node
		if (this._left) {
			// Propagate down the left branch
			this._left.insert(data);
		} else {
			// Assign to left branch
			this._left = new BinaryTree(data, this._index, this._compareFunc, this._hashFunc);
		}

		return true;
	}

	if (result === -1) {
		// Greater than this node
		if (this._right) {
			// Propagate down the right branch
			this._right.insert(data);
		} else {
			// Assign to right branch
			this._right = new BinaryTree(data, this._index, this._compareFunc, this._hashFunc);
		}

		return true;
	}

	if (result === 1) {
		// Less than this node
		if (this._left) {
			// Propagate down the left branch
			this._left.insert(data);
		} else {
			// Assign to left branch
			this._left = new BinaryTree(data, this._index, this._compareFunc, this._hashFunc);
		}

		return true;
	}

	return false;
};

BinaryTree.prototype.lookup = function (data, resultArr) {
	var result = this._compareFunc(this._data, data);

	resultArr = resultArr || [];

	if (result === 0) {
		if (this._left) { this._left.lookup(data, resultArr); }
		resultArr.push(this._data);
		if (this._right) { this._right.lookup(data, resultArr); }
	}

	if (result === -1) {
		if (this._right) { this._right.lookup(data, resultArr); }
	}

	if (result === 1) {
		if (this._left) { this._left.lookup(data, resultArr); }
	}

	return resultArr;
};

BinaryTree.prototype.inOrder = function (type, resultArr) {
	resultArr = resultArr || [];

	if (this._left) {
		this._left.inOrder(type, resultArr);
	}

	switch (type) {
		case 'hash':
			resultArr.push(this._hash);
			break;

		case 'data':
			resultArr.push(this._data);
			break;

		default:
			resultArr.push({
				key: this._data,
				arr: this._store
			});
			break;
	}

	if (this._right) {
		this._right.inOrder(type, resultArr);
	}

	return resultArr;
};

/*BinaryTree.prototype.find = function (type, search, resultArr) {
	resultArr = resultArr || [];

	if (this._left) {
		this._left.find(type, search, resultArr);
	}

	// Check if this node's data is greater or less than the from value
	var fromResult = this.sortAsc(this._data[key], from),
			toResult = this.sortAsc(this._data[key], to);

	if ((fromResult === 0 || fromResult === 1) && (toResult === 0 || toResult === -1)) {
		// This data node is greater than or equal to the from value,
		// and less than or equal to the to value so include it
		switch (type) {
			case 'hash':
				resultArr.push(this._hash);
				break;

			case 'data':
				resultArr.push(this._data);
				break;

			default:
				resultArr.push({
					key: this._data,
					arr: this._store
				});
				break;
		}
	}

	if (this._right) {
		this._right.find(type, search, resultArr);
	}

	return resultArr;
};*/

/**
 *
 * @param {String} type
 * @param {String} key The data key / path to range search against.
 * @param {Number} from Range search from this value (inclusive)
 * @param {Number} to Range search to this value (inclusive)
 * @param {Array=} resultArr Leave undefined when calling (internal use),
 * passes the result array between recursive calls to be returned when
 * the recursion chain completes.
 * @param {Path=} pathResolver Leave undefined when calling (internal use),
 * caches the path resolver instance for performance.
 * @returns {Array} Array of matching document objects
 */
BinaryTree.prototype.findRange = function (type, key, from, to, resultArr, pathResolver) {
	resultArr = resultArr || [];
	pathResolver = pathResolver || new Path(key);

	if (this._left) {
		this._left.findRange(type, key, from, to, resultArr, pathResolver);
	}

	// Check if this node's data is greater or less than the from value
	var pathVal = pathResolver.value(this._data),
		fromResult = this.sortAsc(pathVal, from),
		toResult = this.sortAsc(pathVal, to);

	if ((fromResult === 0 || fromResult === 1) && (toResult === 0 || toResult === -1)) {
		// This data node is greater than or equal to the from value,
		// and less than or equal to the to value so include it
		switch (type) {
			case 'hash':
				resultArr.push(this._hash);
				break;

			case 'data':
				resultArr.push(this._data);
				break;

			default:
				resultArr.push({
					key: this._data,
					arr: this._store
				});
				break;
		}
	}

	if (this._right) {
		this._right.findRange(type, key, from, to, resultArr, pathResolver);
	}

	return resultArr;
};

/*BinaryTree.prototype.findRegExp = function (type, key, pattern, resultArr) {
	resultArr = resultArr || [];

	if (this._left) {
		this._left.findRegExp(type, key, pattern, resultArr);
	}

	// Check if this node's data is greater or less than the from value
	var fromResult = this.sortAsc(this._data[key], from),
			toResult = this.sortAsc(this._data[key], to);

	if ((fromResult === 0 || fromResult === 1) && (toResult === 0 || toResult === -1)) {
		// This data node is greater than or equal to the from value,
		// and less than or equal to the to value so include it
		switch (type) {
			case 'hash':
				resultArr.push(this._hash);
				break;

			case 'data':
				resultArr.push(this._data);
				break;

			default:
				resultArr.push({
					key: this._data,
					arr: this._store
				});
				break;
		}
	}

	if (this._right) {
		this._right.findRegExp(type, key, pattern, resultArr);
	}

	return resultArr;
};*/

BinaryTree.prototype.match = function (query, options) {
	// Check if the passed query has data in the keys our index
	// operates on and if so, is the query sort matching our order
	var pathSolver = new Path(),
		indexKeyArr,
		queryArr,
		matchedKeys = [],
		matchedKeyCount = 0,
		i;

	indexKeyArr = pathSolver.parseArr(this._index, {
		verbose: true
	});

	queryArr = pathSolver.parseArr(query, {
		ignore:/\$/,
		verbose: true
	});

	// Loop the query array and check the order of keys against the
	// index key array to see if this index can be used
	for (i = 0; i < indexKeyArr.length; i++) {
		if (queryArr[i] === indexKeyArr[i]) {
			matchedKeyCount++;
			matchedKeys.push(queryArr[i]);
		}
	}

	return {
		matchedKeys: matchedKeys,
		totalKeyCount: queryArr.length,
		score: matchedKeyCount
	};

	//return pathSolver.countObjectPaths(this._keys, query);
};

Shared.finishModule('BinaryTree');
module.exports = BinaryTree;