QUnit.module('BinaryTree');
ForerunnerDB.moduleLoaded('BinaryTree', function () {
	QUnit.test("Binary Tree :: Test intrinsic ordering via inOrder('data')", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
			search,
			alpha,
			data = [],
			count = 500,
			countMax = count,
			total = count,
			name,
			obj,
			start,
			overall = 0,
			names = ['Jim', 'Alan', 'Bob', 'Nigel', 'Jane', 'Alice', 'DJ Kool', 'Anne', 'Tamara'],
			collectionResult,
			treeResult,
			indexOrdering = {
				name: -1,
				age: -1,
				type: 1
			},
			i;

		tree.index(indexOrdering);

		data.push({
			name: 'Charlie',
			age: 15,
			type: 'User'
		});
		data.push({
			name: 'Charlie',
			age: 12,
			type: 'User'
		});
		data.push({
			name: 'Angel',
			age: 20,
			type: 'User'
		});
		data.push({
			name: 'Bill',
			age: 11,
			type: 'User'
		});
		data.push({
			name: 'Angel',
			age: 21,
			type: 'User'
		});
		data.push({
			name: 'Bill',
			age: 50,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 12,
			type: 'User'
		});
		data.push({
			name: 'Angel',
			age: 50,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 82,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 82,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 82,
			type: 'User'
		});

		// This test passing relies on the fact that collection's sorting is
		// already tested and bulletproof (which it is)
		db.collection('sorted').setData(data);
		collectionResult = db.collection('sorted').find({}, {
			$orderBy: indexOrdering
		});

		for (i = 0; i < data.length; i++) {
			tree.insert(data[i]);
		}

		treeResult = tree.inOrder('data');

		strictEqual(treeResult.length, data.length, 'Number of results is correct');

		for (i = 0; i < collectionResult.length; i++) {
			strictEqual(treeResult[i].name, collectionResult[i].name, 'Correct order of name for item ' + i);
			strictEqual(treeResult[i].age, collectionResult[i].age, 'Correct order of age for item ' + i);
			strictEqual(treeResult[i].type, collectionResult[i].type, 'Correct order of type for item ' + i);
		}

		base.dbDown();
	});

	QUnit.test("Binary Tree :: Test intrinsic ordering via inOrder('data') with random generated data", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
			data = [],
			count = 500,
			name,
			names = ['Jim', 'Alan', 'Bob', 'Nigel', 'Jane', 'Alice', 'DJ Kool', 'Anne', 'Tamara'],
			types = ['user', 'staff', 'student'],
			collectionResult,
			treeResult,
			indexOrdering = {
				name: -1,
				age: -1,
				type: 1
			},
			i;

		for (i = 0; i < count; i++) {
			data.push({
				name: names[Math.floor(Math.random() * names.length)],
				age: Math.floor(Math.random() * 50),
				type: types[Math.floor(Math.random() * types.length)]
			});
		}

		tree.index(indexOrdering);

		// This test passing relies on the fact that collection's sorting is
		// already tested and bulletproof (which it is)
		db.collection('sorted').setData(data);
		collectionResult = db.collection('sorted').find({}, {
			$orderBy: indexOrdering
		});

		//.time('Tree insert');
		tree.insert(data);
		//console.timeEnd('Tree insert');

		treeResult = tree.inOrder('data');

		strictEqual(treeResult.length, data.length, 'Number of results is correct');

		for (i = 0; i < collectionResult.length; i++) {
			strictEqual(treeResult[i].name, collectionResult[i].name, 'Correct order of name for item ' + i);
			strictEqual(treeResult[i].age, collectionResult[i].age, 'Correct order of age for item ' + i);
			strictEqual(treeResult[i].type, collectionResult[i].type, 'Correct order of type for item ' + i);
		}

		base.dbDown();
	});

	QUnit.test("Binary Tree :: Test range search $gte $lte", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
			data = [],
			count = 500,
			name,
			collectionResult,
			treeResult,
			indexOrdering = {
				name: -1,
				age: -1,
				type: 1
			},
			i;

		tree.index(indexOrdering);

		data.push({
			name: 'Charlie',
			age: 15,
			type: 'User'
		});
		data.push({
			name: 'Charlie',
			age: 12,
			type: 'User'
		});
		data.push({
			name: 'Angel',
			age: 20,
			type: 'User'
		});
		data.push({
			name: 'Bill',
			age: 11,
			type: 'User'
		});
		data.push({
			name: 'Angel',
			age: 21,
			type: 'User'
		});
		data.push({
			name: 'Bill',
			age: 50,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 12,
			type: 'User'
		});
		data.push({
			name: 'Angel',
			age: 50,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 82,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 82,
			type: 'Staff'
		});
		data.push({
			name: 'Angel',
			age: 82,
			type: 'User'
		});

		// This test passing relies on the fact that collection's sorting is
		// already tested and bulletproof (which it is)
		db.collection('sorted').setData(data);
		collectionResult = db.collection('sorted').find({
			age: {
				$gte: 10,
				$lte: 25
			}
		}, {
			$orderBy: indexOrdering,
			_id: 0
		});

		for (i = 0; i < data.length; i++) {
			tree.insert(data[i]);
		}

		treeResult = tree.findRange('data', 'age', 10, 25);
		//console.table(collectionResult);
		//console.table(treeResult);

		strictEqual(collectionResult.length, treeResult.length, 'Number of results is correct');

		for (i = 0; i < collectionResult.length; i++) {
			strictEqual(treeResult[i].name, collectionResult[i].name, 'Correct order of name for item ' + i);
			strictEqual(treeResult[i].age, collectionResult[i].age, 'Correct order of age for item ' + i);
			strictEqual(treeResult[i].type, collectionResult[i].type, 'Correct order of type for item ' + i);
		}

		base.dbDown();
	});

	QUnit.test("Binary Tree :: Test indexed range search against un-indexed full table scan on collection", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
				data = [],
				count = 500,
				name,
				names = ['Jim', 'Alan', 'Bob', 'Nigel', 'Jane', 'Alice', 'DJ Kool', 'Anne', 'Tamara'],
				types = ['user', 'staff', 'student'],
				collectionResult,
				treeResult,
				startTime,
				endTime,
				collectionTime,
				indexTime,
				indexOrdering = {
					name: -1,
					age: -1,
					type: 1
				},
				i;

		for (i = 0; i < count; i++) {
			data.push({
				name: names[Math.floor(Math.random() * names.length)],
				age: Math.floor(Math.random() * 50),
				type: types[Math.floor(Math.random() * types.length)]
			});
		}

		tree.index(indexOrdering);

		// This test passing relies on the fact that collection's sorting is
		// already tested and bulletproof (which it is)

		//console.time('Collection insert');
		db.collection('sorted').setData(data);
		//console.timeEnd('Collection insert');

		//console.time('Tree insert');
		tree.insert(data);
		//console.timeEnd('Tree insert');

		//console.time('Collection search');
		startTime = new Date().getTime();
		collectionResult = db.collection('sorted').find({
			age: {
				$gte: 10,
				$lte: 25
			}
		}, {
			$orderBy: indexOrdering,
			_id: 0
		});
		endTime = new Date().getTime();
		//console.timeEnd('Collection search');

		collectionTime = endTime - startTime;

		//console.time('Index search');
		startTime = new Date().getTime();
		treeResult = tree.findRange('data', 'age', 10, 25);
		endTime = new Date().getTime();
		//console.timeEnd('Index search');

		indexTime = endTime - startTime;

		strictEqual(collectionResult.length, treeResult.length, 'Collection result count matches tree result count');
		ok(indexTime < collectionTime, 'Index was faster than collection');

		for (i = 0; i < collectionResult.length; i++) {
			strictEqual(treeResult[i].name, collectionResult[i].name, 'Correct order of name for item ' + i);
			strictEqual(treeResult[i].age, collectionResult[i].age, 'Correct order of age for item ' + i);
			strictEqual(treeResult[i].type, collectionResult[i].type, 'Correct order of type for item ' + i);
		}

		base.dbDown();
	});

	QUnit.test("Binary Tree :: Test indexed range search on nested field", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
			data = [],
			count = 500,
			name,
			names = ['Jim', 'Alan', 'Bob', 'Nigel', 'Jane', 'Alice', 'DJ Kool', 'Anne', 'Tamara'],
			types = ['user', 'staff', 'student'],
			collectionResult,
			treeResult,
			startTime,
			endTime,
			collectionTime,
			indexTime,
			indexOrdering = {
				"name": -1,
				"obj.age": -1,
				"type": -1
			},
			i, treeResultComp, collResultComp;

		for (i = 0; i < count; i++) {
			data.push({
				_id: db.objectId(),
				name: names[Math.floor(Math.random() * names.length)],
				obj: {
					age: Math.floor(Math.random() * 50)
				},
				type: types[Math.floor(Math.random() * types.length)]
			});
		}

		tree.index(indexOrdering);

		//console.time('Collection insert');
		db.collection('sorted').setData(data);
		//console.timeEnd('Collection insert');

		//console.time('Tree insert');
		tree.insert(data);
		//console.timeEnd('Tree insert');

		//console.time('Collection search');
		startTime = new Date().getTime();
		collectionResult = db.collection('sorted').find({
			obj: {
				age: {
					$gte: 10,
					$lte: 25
				}
			}
		}, {
			$orderBy: indexOrdering
		});
		endTime = new Date().getTime();
		//console.timeEnd('Collection search');

		collectionTime = endTime - startTime;

		//console.time('Index search');
		startTime = new Date().getTime();
		treeResult = tree.findRange('data', 'obj.age', 10, 25);
		endTime = new Date().getTime();
		//console.timeEnd('Index search');

		indexTime = endTime - startTime;

		strictEqual(treeResult.length, collectionResult.length, 'Collection result count (' + collectionResult.length + ') matches tree result count (' + treeResult.length + ')');
		ok(indexTime < collectionTime, 'Index was faster than collection');

		for (i = 0; i < collectionResult.length; i++) {
			treeResultComp = treeResult[i];
			collResultComp = collectionResult[i];
			//if (treeResultComp.name !== collResultComp.name) {debugger;}
			//if (treeResultComp.age !== collResultComp.age) {debugger;}
			//if (treeResultComp.type !== collResultComp.type) {debugger;}
			strictEqual(treeResultComp.name, collResultComp.name, 'Correct order of name for item ' + i);
			strictEqual(treeResultComp.age, collResultComp.age, 'Correct order of age for item ' + i);
			strictEqual(treeResultComp.type, collResultComp.type, 'Correct order of type for item ' + i);
		}

		base.dbDown();
	});

	QUnit.test("Binary Tree :: Test query matching to indexed fields to identify if an index can handle the query efficiently", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
			data = [],
			count = 500,
			name,
			names = ['Jim', 'Alan', 'Bob', 'Nigel', 'Jane', 'Alice', 'DJ Kool', 'Anne', 'Tamara'],
			types = ['user', 'staff', 'student'],
			matchResult,
			indexOrdering = {
				name: -1,
				age: -1,
				type: 1
			},
			i;

		for (i = 0; i < count; i++) {
			data.push({
				name: names[Math.floor(Math.random() * names.length)],
				age: Math.floor(Math.random() * 50),
				type: types[Math.floor(Math.random() * types.length)]
			});
		}

		tree.index(indexOrdering);
		tree.insert(data);

		matchResult = tree.match({
			name: 'Jim',
			age: {
				$gt: 1
			}
		});

		strictEqual(matchResult.matchedKeys[0], 'name', 'Field 1 match');
		strictEqual(matchResult.matchedKeys[1], 'age', 'Field 2 match');
		strictEqual(matchResult.totalKeyCount, 2, 'Key count is correct');
		strictEqual(matchResult.score, 2, 'Score is correct');

		base.dbDown();
	});

	QUnit.test("Binary Tree :: Test query matching with nested indexed fields", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
				data = [],
				count = 500,
				name,
				names = ['Jim', 'Alan', 'Bob', 'Nigel', 'Jane', 'Alice', 'DJ Kool', 'Anne', 'Tamara'],
				types = ['user', 'staff', 'student'],
				matchResult,
				indexOrdering = {
					name: -1,
					obj: {
						age: -1
					},
					type: 1
				},
				i;

		for (i = 0; i < count; i++) {
			data.push({
				name: names[Math.floor(Math.random() * names.length)],
				obj: {
					age: Math.floor(Math.random() * 50)
				},
				type: types[Math.floor(Math.random() * types.length)]
			});
		}

		tree.index(indexOrdering);
		tree.insert(data);

		matchResult = tree.match({
			name: 'Jim',
			obj: {
				age: {
					$gt: 1
				}
			}
		});

		strictEqual(matchResult.matchedKeys[0], 'name', 'Field 1 match');
		strictEqual(matchResult.matchedKeys[1], 'obj', 'Field 2 match');
		strictEqual(matchResult.matchedKeys[2], 'obj.age', 'Field 3 match');
		strictEqual(matchResult.totalKeyCount, 3, 'Key count is correct');
		strictEqual(matchResult.score, 3, 'Score is correct');

		base.dbDown();
	});

	QUnit.test("Binary Tree :: Insert", function () {
		base.dbUp();

		var tree = new ForerunnerDB.shared.modules.BinaryTree(),
			matchResult;

		tree.index({
			name: 1
		});

		tree.insert({
			name: "abcd"
		});

		tree.insert({
			name: "abcd"
		});

		matchResult = tree.lookup({
			name: "abcd"
		});

		strictEqual(matchResult.length, 2, 'Correct result length');
		strictEqual(matchResult[0].name, 'abcd', 'Record 1 match');
		strictEqual(matchResult[1].name, 'abcd', 'Record 2 match');

		base.dbDown();
	});
});