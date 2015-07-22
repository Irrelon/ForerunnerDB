"use strict";

var Shared = require('./Shared');

var BinaryTree = function (data, compareFunc, hashFunc) {
	this.init.apply(this, arguments);
};

BinaryTree.prototype.init = function (data, index, compareFunc, hashFunc) {
	this._store = [];

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
Shared.synthesize(BinaryTree.prototype, 'index', function (index) {
	if (index !== undefined) {
		if (index[0]) {
			this._indexProp = index[0].prop;
			this._indexDir = index[0].dir;
		} else {
			this._indexProp = null;
			this._indexDir = 0;
		}
	}

	return this.$super.call(this, index);
});

BinaryTree.prototype.data = function (val) {
	if (val !== undefined) {
		this._data = val;

		if (this._hashFunc) { this._hash = this._hashFunc(val); }
		return this;
	}

	return this._data;
};

BinaryTree.prototype.push = function (val) {
	if (val !== undefined) {
		this._store.push(val);
		return this;
	}

	return false;
};

BinaryTree.prototype.pull = function (val) {
	if (val !== undefined) {
		var index = this._store.indexOf(val);

		if (index > -1) {
			this._store.splice(index, 1);
			return true;
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

	for (i = 0; i < this._index.length; i++) {
		indexData = this._index[i];

		if (indexData.dir === 1) {
			result = this.sortAsc(a[indexData.prop], b[indexData.prop]);
		} else if (indexData.dir === -1) {
			result = this.sortDesc(a[indexData.prop], b[indexData.prop]);
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
	return obj[this._indexProp];
};

BinaryTree.prototype.insert = function (data) {
	var result,
		subIndex;

	if (!this._data) {
		// Insert into this node (overwrite) as there is no data
		this.data(data);
		this.push(data);
		return true;
	}

	result = this._compareFunc(this._data, data);

	if (result === 0) {
		// Equal to this node, push to node's data array
		this.push(data);

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

BinaryTree.prototype.lookup = function (data) {
	var result = this._compareFunc(this._data, data);

	if (result === 0) {
		return this._store;
	}

	if (result === -1) {
		return this._right.lookup(data);
	}

	if (result === 1) {
		return this._left.lookup(data);
	}
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

		case 'key':
			resultArr.push(this._data);
			break;

		default:
			resultArr.push({
				key: this._key,
				arr: this._store
			});
			break;
	}

	if (this._right) {
		this._right.inOrder(type, resultArr);
	}

	return resultArr;
};

Shared.finishModule('BinaryTree');
module.exports = BinaryTree;