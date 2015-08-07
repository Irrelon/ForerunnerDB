"use strict";

var BinaryTree = function (val, index) {
	this._store = [];

	this.data(val);
	this.index(index);
};

BinaryTree.prototype.data = function (val) {
	if (val !== undefined) {
		this._store.push(val);
		this._data = val;
	}
};

BinaryTree.prototype.index = function (obj) {
	if (obj !== undefined) {
		if (obj instanceof Array) {
			this._index = obj;
		} else {
			this._index = this.keys(obj);
		}

		this._indexField = this._index[0];
	}

	return this._index;
};

BinaryTree.prototype.left = function (val) {
	this._left = val;
	return true;
};

BinaryTree.prototype.middle = function (val) {
	this._middle = val;
	return true;
};

BinaryTree.prototype.right = function (val) {
	this._right = val;
	return true;
};

BinaryTree.prototype.insert = function (val) {
	var inserted,
		failed,
		comp,
		newIndex,
		i;

	if (val instanceof Array) {
		// Insert array of data
		inserted = [];
		failed = [];

		for (i = 0; i < val.length; i++) {
			if (this.insert(val[i])) {
				inserted.push(val[i]);
			} else {
				failed.push(val[i]);
			}
		}

		return {
			inserted: inserted,
			failed: failed
		};
	}

	if (!this._data) {
		// Store data for this node
		this.data(val);
		return true;
	}

	comp = this._compareFunc(val, this._data);

	if (comp === -1) {
		// Store left
		if (this._left) {
			return this._left.insert(val);
		} else {
			return this.left(new BinaryTree(val, this._index));
		}
	}

	if (comp === 0) {
		// Store reference in store
		this._store.push(val);

		// Store middle
		if (this._middle) {
			return this._middle.insert(val);
		} else {
			newIndex = this._index.slice(1);

			if (newIndex[0]) {
				return this.middle(new BinaryTree(val, newIndex));
			} else {
				return true;
			}
		}
	}

	if (comp === 1) {
		// Store right
		if (this._right) {
			return this._right.insert(val);
		} else {
			return this.right(new BinaryTree(val, this._index));
		}
	}
};

BinaryTree.prototype.inOrder = function (resultArr) {
	resultArr = resultArr || [];

	if (this._left) {
		resultArr = this._left.inOrder(resultArr);
	}

	if (this._middle) {
		resultArr = this._middle.inOrder(resultArr);
	} else {
		resultArr = resultArr.concat(this._store);
	}

	if (this._right) {
		resultArr = this._right.inOrder(resultArr);
	}

	return resultArr;
};

BinaryTree.prototype.keys = function (obj) {
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

/**
 * Default compare method. Can be overridden.
 * @param a
 * @param b
 * @returns {number}
 * @private
 */
BinaryTree.prototype._compareFunc = function (a, b) {
	var indexData = this._indexField,
		result = 0;

	if (indexData) {
		if (indexData.val === 1) {
			result = this.sortAsc(a[indexData.key], b[indexData.key]);
		} else if (indexData.val === -1) {
			result = this.sortDesc(a[indexData.key], b[indexData.key]);
		}
	}

	return result;
};



/**
 * Sorts the passed value a against the passed value b ascending.
 * @param {*} a The first value to compare.
 * @param {*} b The second value to compare.
 * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
 */
BinaryTree.prototype.sortAsc = function (a, b) {
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

/**
 * Sorts the passed value a against the passed value b descending.
 * @param {*} a The first value to compare.
 * @param {*} b The second value to compare.
 * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
 */
BinaryTree.prototype.sortDesc = function (a, b) {
	if (typeof(a) === 'string' && typeof(b) === 'string') {
		return b.localeCompare(a);
	} else {
		if (a > b) {
			return -1;
		} else if (a < b) {
			return 1;
		}
	}

	return 0;
};