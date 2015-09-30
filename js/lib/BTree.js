"use strict";

/**
 * The binary tree class.
 * @param {Object} val The object to index.
 * @param {Object} index The index object.
 * @constructor
 */
var BinaryTree = function (val, index) {
	this._store = [];
	this.index(index);

	if (val !== undefined) {
		this.data(val);
		this.insertMiddle(val);
	}
};

/**
 * Gets / sets the data this tree node holds.
 * @param {Object=} val The tree node data.
 * @returns {*}
 */
BinaryTree.prototype.data = function (val) {
	if (val !== undefined) {
		this._data = val;
		return this;
	}

	return this._data;
};

/**
 * Gets / sets the index object used to determine which fields
 * are indexed in the objects being added to the tree and in what
 * order they are sorted.
 * @param {Object=} obj The index object.
 * @returns {*}
 */
BinaryTree.prototype.index = function (obj) {
	if (obj !== undefined) {
		if (obj instanceof Array) {
			this._index = obj;
		} else {
			this._index = this.keys(obj);
		}

		this._indexField = this._index[0];
		return this;
	}

	return this._index;
};

/**
 * Gets / sets the node's left tree node.
 * @param {BinaryTree=} tree The tree node.
 * @returns {*}
 */
BinaryTree.prototype.left = function (tree) {
	if (tree !== undefined) {
		this._left = tree;
		return this;
	}

	return this._left;
};

/**
 * Gets / sets the node's middle tree node.
 * @param {BinaryTree=} tree The tree node.
 * @returns {*}
 */
BinaryTree.prototype.middle = function (tree) {
	if (tree !== undefined) {
		this._middle = tree;
		return this;
	}

	return this._middle;
};

/**
 * Gets / sets the node's right tree node.
 * @param {BinaryTree=} tree The tree node.
 * @returns {*}
 */
BinaryTree.prototype.right = function (tree) {
	if (tree !== undefined) {
		this._right = tree;
		return this;
	}

	return this._right;
};

/**
 * Inserts a value into the binary tree.
 * @param {String|Number|Array} val The value to insert.
 * @returns {*}
 */
BinaryTree.prototype.insert = function (val) {
	var inserted,
		failed,
		comp,
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
		this.insertMiddle(val);
		return true;
	}

	comp = this._compareFunc(val, this._data);

	if (comp === -1) {
		this.insertLeft(val);
	}

	if (comp === 0) {
		this.insertMiddle(val);
	}

	if (comp === 1) {
		this.insertRight(val);
	}
};

/**
 * Inserts an object into the left side of this node's tree, or
 * creates a new tree node on the left and then inserts the object.
 * @param {Object} val The object to insert.
 * @returns {*}
 */
BinaryTree.prototype.insertLeft = function (val) {
	// Store left
	if (this._left) {
		return this._left.insert(val);
	} else {
		return this.left(new BinaryTree(val, this._index));
	}
};

/**
 * Inserts an object into the middle of this node's tree, or
 * creates a new tree node in the middle and then inserts the object.
 * @param {Object} val The object to insert.
 * @returns {*}
 */
BinaryTree.prototype.insertMiddle = function (val) {
	var newIndexArr;

	// Store reference in store
	this._store.push(val);

	// Store middle
	if (this._middle) {
		return this._middle.insert(val);
	} else {
		// Pull the first item off the index array and create new index array
		newIndexArr = this._index.slice(1);

		if (newIndexArr[0]) {
			return this.middle(new BinaryTree(val, newIndexArr));
		} else {
			return true;
		}
	}
};

/**
 * Inserts an object into the right side of this node's tree, or
 * creates a new tree node on the right and then inserts the object.
 * @param {Object} val The object to insert.
 * @returns {*}
 */
BinaryTree.prototype.insertRight = function (val) {
	// Store right
	if (this._right) {
		return this._right.insert(val);
	} else {
		return this.right(new BinaryTree(val, this._index));
	}
};

/**
 * Returns an array of all items in the tree in ascending order.
 * @param {Array=} resultArr Used internally by the method.
 * @returns {Array} Ascending order results array.
 */
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

/**
 * Scans the passed object and returns an array of objects, each containing
 * the key and the value of each object key.
 * @param {Object} obj The object to scan keys from.
 * @returns {Array} An array of key/val objects.
 */
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

BinaryTree.prototype.varType = function (myVar) {
	var type = typeof myVar;

	if (type === 'object') {
		// Work out the object type
		if (myVar instanceof Array) {
			return 'array';
		}

		if (myVar instanceof RegExp) {
			return 'regexp';
		}
	}

	return type;
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

/**
 * Returns a non-referenced version of the passed object / array.
 * @param {Object} data The object or array to return as a non-referenced version.
 * @param {Number=} copies Optional number of copies to produce. If specified, the return
 * value will be an array of decoupled objects, each distinct from the other.
 * @returns {*}
 */
BinaryTree.prototype.decouple = function (data, copies) {
	if (data !== undefined) {
		if (!copies) {
			return JSON.parse(JSON.stringify(data));
		} else {
			var i,
				json = JSON.stringify(data),
				copyArr = [];

			for (i = 0; i < copies; i++) {
				copyArr.push(JSON.parse(json));
			}

			return copyArr;
		}
	}

	return undefined;
};

/**
 * Retrieves results based on the query object.
 * @param {Object} query The query object.
 * @returns {Array} The result array.
 */
BinaryTree.prototype.lookup = function (query) {
	var result,
		resultArr = [];

	if (query[this._indexField.key]) {
		result = this._compareFunc(query, this._data);
	} else {
		// Return all results in this b-tree
		if (this._left) {
			resultArr = resultArr.concat(this._left.lookup(query));
		}

		if (this._middle) {
			resultArr = resultArr.concat(this._middle.lookup(query));
		} else {
			resultArr = resultArr.concat(this._store);
		}

		if (this._right) {
			resultArr = resultArr.concat(this._right.lookup(query));
		}

		return resultArr;
	}

	if (result === -1) {
		if (this._left) {
			resultArr = resultArr.concat(this._left.lookup(query, resultArr));
		}
	}

	if (result === 0) {
		query = this.decouple(query);
		delete query[this._indexField.key];

		if (this._middle) {
			if (query[this._middle._indexField.key] !== undefined) {
				resultArr = resultArr.concat(this._middle.lookup(query, resultArr));
			} else {
				resultArr = resultArr.concat(this._middle.inOrder());
			}
		} else {
			resultArr = resultArr.concat(this._store);
		}
	}

	if (result === 1) {
		if (this._right) {
			resultArr = resultArr.concat(this._right.lookup(query));
		}
	}

	return resultArr;
};