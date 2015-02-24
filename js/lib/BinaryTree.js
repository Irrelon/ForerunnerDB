var compareFunc = function (a, b) {
	if (a !== undefined && b !== undefined) {
		if (a.name < b.name) {
			return -1;
		} else if (a.name > b.name) {
			return 1;
		} else {
			if (a.age > b.age) {
				return -1;
			} else if (a.age < b.age) {
				return 1;
			} else {
				return 0;
			}
		}
	}

	return 0;
};

var Node = function(value) {
	this.value = value;
	this.left = null;
	this.right = null;
	return this;
};

Node.prototype.insert = function(newNode) {
	var result = compareFunc(newNode.value, this.value);

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

Node.prototype.search = function (searchFunc, resultArr) {
	var result = searchFunc(this.value);

	if(result === 0) {
		// We have a matching result, add it to results
		resultArr.push(this.value);

		// Now scan both tree branches for more matches
		this.left.search(searchFunc, resultArr);
		this.right.search(searchFunc, resultArr);
	} else if(result === -1 && this.left !== null) {
		// This node does not match and we have been told to look left
		this.left.search(searchFunc, resultArr);
	} else if(result === 1 && this.right !== null) {
		// This node does not match and we have been told to look right
		this.right.search(searchFunc, resultArr);
	}
};

Node.prototype.depthFirstSearch = function(search) {
	var result = compareFunc(search, this.value);
	console.log(search, ":", this.value);

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
	console.log(this.value);
	if(this.right !== null) {
		this.right.inorderTraversal();
	}
};

Node.prototype.preOrderTraversal = function() {
	console.log(this.value);
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
	console.log(this.value);
};

var BinarySearchTree = function(insertNode) {
	if(insertNode instanceof Node) {
		this.root = insertNode;
	} else {
		this.root = new Node(insertNode);
	}
	return this;
};

BinarySearchTree.prototype.search = function (searchFunc) {
	var resultArr = [];
	this.root.search(searchFunc, resultArr);

	return resultArr;
};

BinarySearchTree.prototype.insert = function(insert) {
	if (insert instanceof Node) {
		this.root.insert(insert);
	} else {
		this.root.insert(new Node(insert));
	}
};

BinarySearchTree.prototype.depthFirstSearch = function(searchValue) {
	this.root.depthFirstSearch(searchValue);
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
		console.log(tempNode.value); // Visit current node
		if(tempNode.left !== null) {
			queue.push(tempNode.left);
		}
		if(tempNode.right !== null) {
			queue.push(tempNode.right);
		}
	}
};

BinarySearchTree.prototype.inOrderTraversal = function(){
	this.root.inorderTraversal();
};
BinarySearchTree.prototype.preOrderTraversal = function(){
	this.root.preOrderTraversal();
};
BinarySearchTree.prototype.postOrderTraversal = function(){
	this.root.postOrderTraversal();
};