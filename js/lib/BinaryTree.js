var Node = function(tree, key, value) {
	this.tree = tree;
	this.key = key;
	this.data = [value];
	this.left = null;
	this.right = null;
	return this;
};

Node.prototype.insert = function(newNode) {
	var result = this.tree._sort(newNode.key, this.key);

	if(result === -1) {
		if(this.left === null) {
			this.left = newNode;
		} else {
			this.left.insert(newNode);
		}
	} else if(result === 1) {
		if(this.right === null) {
			this.right = newNode;
		} else {
			this.right.insert(newNode);
		}
	} else {
		return true;
	}
};

Node.prototype.search = function (query, resultArr) {
	var result = this.tree._operationCompare(query, this.key);

	if(result === 0) {
		// We have a matching result, add it to results
		if (this.left !== null) {
			this.left.search(query, resultArr);
		}

		// It is very important that we push here below the left-side traversal
		// otherwise the order of the returned items will be incorrect
		resultArr.push(this.key);

		// Now scan both tree branches for more matches
		if (this.right !== null) {
			this.right.search(query, resultArr);
		}
	} else if(result === -1 && this.left !== null) {
		// This node does not match and we have been told to look left
		this.left.search(query, resultArr);
	} else if(result === 1 && this.right !== null) {
		// This node does not match and we have been told to look right
		this.right.search(query, resultArr);
	}
};

Node.prototype.depthFirstSearch = function(search) {
	var result = this.tree._sort(search, this.key);
	console.log(search, ":", this.key);

	if(result === 0) {
		console.log("search item found");
		return true;
	} else if(result === -1 && this.left !== null) {
		return this.left.depthFirstSearch(search);
	} else if(result === 1 && this.right !== null) {
		return this.right.depthFirstSearch(search);
	} else {
		console.log("could not find "+search);
		return false;
	}
};


Node.prototype.inorderTraversal = function() {
	if(this.left !== null) {
		this.left.inorderTraversal();
	}
	console.log(this.key);
	if(this.right !== null) {
		this.right.inorderTraversal();
	}
};

Node.prototype.preOrderTraversal = function() {
	console.log(this.key);
	if(this.left !== null) {
		this.left.preOrderTraversal();
	}
	if(this.right !== null) {
		this.right.preOrderTraversal();
	}
};

Node.prototype.postOrderTraversal = function() {
	if(this.left !== null) {
		this.left.postOrderTraversal();
	}
	if(this.right !== null) {
		this.right.postOrderTraversal();
	}
	console.log(this.key);
};

var BinarySearchTree = function(orderBy) {
	var i, keyData;

	// TODO when added to the main system, use shared ref to module
	this.pathSolver = new ForerunnerDB.shared.modules.Path();

	this._orderKeys = this.pathSolver.parseArr(orderBy);
	this._orderKeyData = [];
	this._orderKeyDataByKey = {};

	for (i = 0; i < this._orderKeys.length; i++) {
		keyData = {
			key: this._orderKeys[i],
			dir: this.pathSolver.get(orderBy, this._orderKeys[i]),
			pathSolver: new ForerunnerDB.shared.modules.Path(this._orderKeys[i])
		};

		this._orderKeyData.push(keyData);
		this._orderKeyDataByKey[this._orderKeys[i]] = keyData;
	}
};

ForerunnerDB.shared.mixin(BinarySearchTree.prototype, 'Mixin.Matching');

BinarySearchTree.prototype._sort = function (a, b) {
	var aVal,
		bVal,
		arr = this._orderKeyData,
		count = arr.length,
		index,
		sortData,
		castType;

	for (index = 0; index < count; index++) {
		sortData = arr[index];

		aVal = a[sortData.key];
		bVal = b[sortData.key];

		castType = typeof aVal;

		if (castType === 'number') {
			aVal = Number(aVal);
			bVal = Number(bVal);
		}

		// Check for non-equal items
		if (aVal !== bVal) {
			// Return the sorted items
			if (sortData.dir === 1) {
				return this.sortAsc(aVal, bVal);
			}

			if (sortData.dir === -1) {
				return this.sortDesc(aVal, bVal);
			}
		}
	}

	return 0;
};

BinarySearchTree.prototype.sortAsc = function (a, b) {
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

BinarySearchTree.prototype.sortDesc = function (a, b) {
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

BinarySearchTree.prototype.search = function (query) {
	var resultArr = [],
		searchKey = this.objKey(query);

	// Check for no matching key values and return early if -1
	if (searchKey === -1) {
		return resultArr;
	}

	this.root.search(searchKey, resultArr);

	return resultArr;
};

BinarySearchTree.prototype._operationCompare = function (a, b) {
	var aVal,
		bVal,
		index,
		arr = this._orderKeyDataByKey,
		sortData,
		matchVal;

	for (index in a) {
		if (a.hasOwnProperty(index)) {
			sortData = arr[index];

			aVal = a[sortData.key];
			bVal = b[sortData.key];

			// Run operation on values
			if (!this._match(bVal, aVal)) {
				// Get the value of the field without any operation
				// keys getting in the way
				if (typeof aVal === 'object') {
					if (aVal.$gt || aVal.$gt) {
						matchVal = aVal.$gt;
					}

					if (aVal.$gte) {
						matchVal = aVal.$gte;
					}

					if (aVal.$lt) {
						matchVal = aVal.$lt;
					}

					if (aVal.$lte) {
						matchVal = aVal.$lte;
					}
				} else {
					matchVal = aVal;
				}

				// Return the sorted items
				if (sortData.dir === 1) {
					return this.sortAsc(matchVal, bVal);
				}

				if (sortData.dir === -1) {
					return this.sortDesc(matchVal, bVal);
				}
			}
		}
	}

	return 0;
};

// Generate a key from the passed object
BinarySearchTree.prototype.objKey = function (obj) {
	var key = {},
		arr = this._orderKeyData,
		count = arr.length,
		index,
		keyData,
		keyVal,
		gotVal = false;

	for (index = 0; index < count; index++) {
		keyData = arr[index];
		keyVal = keyData.pathSolver.get(obj);

		if (keyVal !== undefined) {
			key[keyData.key] = keyVal;
			gotVal = true;
		} else {
			break;
		}
	}

	if (!gotVal) {
		return -1;
	}

	return key;
};

BinarySearchTree.prototype.insert = function(insert) {
	if (!this.root) {
		if(insert instanceof Node) {
			this.root = insert;
		} else {
			this.root = new Node(this, this.objKey(insert), insert);
		}
	} else {
		if (insert instanceof Node) {
			this.root.insert(insert);
		} else {
			this.root.insert(new Node(this, this.objKey(insert), insert));
		}
	}

	return this;
};

BinarySearchTree.prototype.depthFirstSearch = function(searchValue) {
	this.root.depthFirstSearch(searchValue);
	return this;
};

BinarySearchTree.prototype.breadthFirstTraversal = function() {
	console.log("Breadth First Traversal");

	// For our intensive purposes,
	// our array is acting as a queue for us.
	var queue = [],
		current = this.root;

	if(current !== null) {
		queue.push(current);
	}

	// start off enqueing root
	while(queue.length > 0) {
		var tempNode = queue.shift();
		console.log(tempNode.key); // Visit current node
		if(tempNode.left !== null) {
			queue.push(tempNode.left);
		}
		if(tempNode.right !== null) {
			queue.push(tempNode.right);
		}
	}
	return this;
};

BinarySearchTree.prototype.inOrderTraversal = function(){
	this.root.inorderTraversal();
	return this;
};
BinarySearchTree.prototype.preOrderTraversal = function(){
	this.root.preOrderTraversal();
	return this;
};
BinarySearchTree.prototype.postOrderTraversal = function(){
	this.root.postOrderTraversal();
	return this;
};