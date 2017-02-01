QUnit.module('IndexBinaryTree');
QUnit.test("Collection.ensureIndex() :: Assign an index to a collection", function() {
	base.dbUp();
	base.dataUp();

	var indexResult = user.ensureIndex({
		arr: {
			val: 1
		},
		name: 1
	}, {
		unique: true,
		name: 'testIndex1',
		type: 'btree'
	});

	strictEqual(indexResult.err, undefined, "Initialise index error: " + indexResult.err);
	ok(indexResult.state !== undefined, "Check index state object: " + JSON.stringify(indexResult.state));
	strictEqual(indexResult.state.ok, true, "Check index state ok: " + indexResult.state.ok);
	strictEqual(indexResult.state.name, 'testIndex1', "Check index state name: " + indexResult.state.name);

	base.dbDown();
});

/*ForerunnerDB.moduleLoaded('Persist', function () {
	QUnit.asyncTest("Collection.ensureIndex() :: Ensure an index is maintained after persist.load()", function () {
		expect(3);

		base.dbUp();
		base.dataUp();

		var coll = db.collection('test27'),
			result;

		coll.insert({name: 'Jim'});

		coll.save(function () {
			// Data saved, now clear the collection
			db.collection('test27').drop(false);

			// Check that there are no docs
			result = db.collection('test27').find();

			strictEqual(result.length, 0, 'Check for empty collection');

			// Now create an index on the collection
			var indexResult = db.collection('test27').ensureIndex({
				name: 1
			}, {
				unique: true,
				name: 'testIndex',
				type: 'btree'
			});

			// Now load the persisted data
			db.collection('test27').load(function () {
				// Now check that we have our doc
				result = db.collection('test27').find();
				strictEqual(result.length, 1, 'Check for doc in collection');

				// Now query for the doc with explain to see if an index is used
				result = db.collection('test27').explain({name: 'Jim'});
				ok(result.index.used, 'Check for index use in query');

				start();
				base.dbDown();
			});
		});
	});
});*/

QUnit.test("Collection.index() :: Test lookup of index from collection by name", function () {
	base.dbUp();
	base.dataUp();

	var indexResult = user.ensureIndex({
		arr: {
			val: 1
		},
		name: 1
	}, {
		unique: true,
		name: 'testIndex2',
		type: 'btree'
	});

	var index = user.index('testIndex2');

	ok(index !== undefined, "Check index is available: " + index);
	ok(index.name() === 'testIndex2', "Check index is correct name: " + index.name());

	base.dbDown();
});

QUnit.test("Index.lookup() :: Test optimal query index detection", function () {
	base.dbUp();
	base.dataUp();

	user.ensureIndex({
		name: 1
	}, {
		unique: true,
		name: 'testName1',
		type: 'btree'
	});

	user.ensureIndex({
		arr: {
			val: 1
		}
	}, {
		unique: true,
		name: 'testArrVal1',
		type: 'btree'
	});

	user.ensureIndex({
		orgId: 1
	}, {
		unique: false,
		name: 'testOrgId1',
		type: 'btree'
	});

	user.ensureIndex({
		arr: {
			val: 1
		},
		orgId: 1
	}, {
		unique: false,
		name: 'testArrValAndOrgId1',
		type: 'btree'
	});

	var a = user.explain({
		arr: {
			val: 5
		},
		orgId: "3"
	});

	strictEqual(a && a.index.used && a.index.potential.length, 2, "Query analyser returned correct number of indexes to use");
	strictEqual(a.index.used._name, 'testArrValAndOrgId1', "Check index name: " + a.index.used._name);

	base.dbDown();
});

QUnit.test("Index.lookup() :: Test lookup from index", function () {
	base.dbUp();
	base.dataUp();

	user.ensureIndex({
		nested: {
			nested: {
				order: 1,
				age: 1
			}
		},
		name: 1
	}, {
		unique: true,
		name: 'testIndex2',
		type: 'btree',
		debug: true
	});

	var index = user.index('testIndex2');
	//console.log(index);
	var lookup = index.lookup({
		nested: {
			nested: {
				order: 2
			}
		}
	});

	console.log(lookup);

	strictEqual(lookup.length, 2, "Lookup returned correct number of results");
	strictEqual(lookup[0]._id, '3', "Lookup returned correct result 1");
	strictEqual(lookup[1]._id, '2', "Lookup returned correct result 2");

	base.dbDown();
});

QUnit.test("Collection.find() :: Test query that should use an index", function () {
	base.dbUp();
	base.dataUp();

	user.ensureIndex({
		nested: {
			nested: {
				age: 1,
				order: 1
			}
		},
		name: 1
	}, {
		unique: true,
		name: 'testIndex3',
		type: 'btree'
	});

	var result = user.find({
		nested: {
			nested: {
				age: 5
			}
		},
		name: 'Dean'
	});

	strictEqual(result && result.length, 2, "Check correct number of results returned");
	strictEqual(result[0]._id, "5", "Check returned data 1 id");
	strictEqual(result[1]._id, "4", "Check returned data 2 id");

	base.dbDown();
});

QUnit.test("Collection.find() :: Test index doesn't interfere with other queries", function () {
	base.dbUp();

	var coll = db.collection('testIndexColl').truncate();

	coll.insert([{
		_id: '1',
		name: 'jim',
		age: 13
	}, {
		_id: '2',
		name: 'rice',
		age: 14
	}, {
		_id: '3',
		name: 'paddy',
		age: 11
	}, {
		_id: '4',
		name: 'alan',
		age: 19
	}, {
		_id: '5',
		name: 'moon',
		age: 14
	}]);

	coll.ensureIndex({
		age: 1,
		name: 1
	}, {
		type: 'btree'
	});

	var result = coll.find({
		age: 14
	});

	strictEqual(result && result.length, 2, "Check correct number of results returned : " + result.length);
	strictEqual(result[0]._id, "5", "Check returned data 1 id");
	strictEqual(result[1]._id, "2", "Check returned data 2 id");

	base.dbDown();
});

QUnit.test("Collection.find() :: Random data inserted into collection and indexed with existing index", function () {
	base.dbUp();

	var collection = db.collection('temp').truncate(),
		names = ['Jim', 'Bob', 'Bill', 'Max', 'Jane', 'Kim', 'Sally', 'Sam'],
		data = [],
		tempName,
		tempAge,
		a, b, c,
		i;

	for (i = 0; i < 1000; i++) {
		tempName = names[Math.ceil(Math.random() * names.length) - 1];
		tempAge = Math.ceil(Math.random() * 100);

		data.push({
			_id: String(i),
			name: tempName,
			age: tempAge
		});
	}

	collection.setData(data, {ensureKeys: false, violationCheck: false});

	var indexResult = collection.ensureIndex({
		name: 1
	}, {
		unique: false,
		name: 'index_name',
		type: 'btree'
	});

	// Run with index
	a = collection.find({name: 'Sally'}, {$decouple: false, $skipIndex: false});

	// Run without index
	b = collection.find({name: 'Sally'}, {$decouple: false, $skipIndex: true});

	// Run with index + table scan
	c = collection.find({name: 'Sally', age: 12}, {$decouple: false, $skipIndex: false});

	strictEqual(a.__fdbOp.data('index.used') && a.__fdbOp.data('index.used').name(), 'index_name', "Check that index-bound query used the index");
	strictEqual(b.__fdbOp.data('index.used'), false, "Check that non-index-bound query didn't use the index");

	//ok(a.__fdbOp.time().totalMs <= b.__fdbOp.time().totalMs, "Check that index was faster than lookup (Indexed: " + a.length + " rows in " + a.__fdbOp.time().totalMs + "ms vs Non-Indexed: " + b.length + " rows in " + b.__fdbOp.time().totalMs + "ms)");

	base.dbDown();
});

QUnit.test("Collection.find() :: Test index created before inserting data", function () {
	base.dbUp();

	var coll = db.collection('temp').truncate();
	var result = coll.ensureIndex({
		name: 1
	}, {
		unique: true,
		type: 'btree'
	});

	var insert1 = coll.insert({
		name: 'Bob'
	});

	var insert2 = coll.insert({
		name: 'Bob'
	});

	strictEqual(insert1.inserted.length, 1, "Check returned data 1 length");
	strictEqual(insert2.inserted.length, 0, "Check returned data 2 length");

	base.dbDown();
});

QUnit.test("Index.remove() :: Test index is being kept up to date with CRUD", function () {
	base.dbUp();

	var coll,
		result,
		insert1,
		insert2,
		find,
		index, anna, barry, jill, zebra, lewis;

	coll = db.collection('temp').truncate();
	result = coll.ensureIndex({
		name: 1
	}, {
		unique: true,
		name: 'uniqueName',
		type: 'btree'
	});

	coll.insert({
		name: 'Bob'
	});

	coll.insert({
		name: 'Jill'
	});

	coll.insert({
		name: 'Anna'
	});

	coll.insert({
		name: 'Barry'
	});

	coll.insert({
		name: 'Zebra'
	});

	coll.insert({
		name: 'Lewis'
	});

	find = coll.find();
	index = coll.index('uniqueName');

	strictEqual(find.length, 6, "Check data length");
	strictEqual(index.size(), 6, "Check index size");

	// Now remove item and check that it cannot be found in the index
	coll.remove({
		name: 'Bob'
	});

	find = coll.find();
	index = coll.index('uniqueName');

	anna = index._btree;
	barry = anna._right;
	jill = barry._right
	zebra = jill._right;
	lewis = zebra._left;

	strictEqual(anna._data.name, 'Anna', "Tree data correct");
	strictEqual(barry._data.name, 'Barry', "Tree data correct");
	strictEqual(jill._data.name, 'Jill', "Tree data correct");
	strictEqual(zebra._data.name, 'Zebra', "Tree data correct");
	strictEqual(lewis._data.name, 'Lewis', "Tree data correct");

	strictEqual(index.size(), 5, "Check index size");

	base.dbDown();
});

QUnit.test("Index.remove() :: Test index unique constraint violation denies insert", function () {
	base.dbUp();

	var coll,
		result,
		insert1,
		insert2,
		insert3,
		find,
		index;

	coll = db.collection('temp').truncate();
	result = coll.ensureIndex({
		name: 1
	}, {
		unique: true,
		name: 'uniqueName',
		type: 'btree'
	});

	insert1 = coll.insert({
		name: 'Bob'
	});

	insert2 = coll.insert({
		name: 'Jill'
	});

	find = coll.find();
	index = coll.index('uniqueName');

	strictEqual(find.length, 2, "Check data length");
	strictEqual(index.size(), 2, "Check index size");

	// Now try to violate the unique index constraint
	insert3 = coll.insert({
		name: 'Bob'
	});

	find = coll.find();
	index = coll.index('uniqueName');

	strictEqual(find.length, 2, "Check data length");
	strictEqual(index.size(), 2, "Check index size");
	strictEqual(insert3.failed[0].reason, 'Index violation in index: uniqueName', 'Index violation was reason for failed insert');

	base.dbDown();
});

ForerunnerDB.version('1.6', function () {
	QUnit.test("Collection.find() :: Test index based on range search ($gt, $lt etc)", function () {
		base.dbUp();

		var names = ['Jim', 'Bob', 'Bill', 'Max', 'Jane', 'Kim', 'Sally', 'Sam'],
			collection = db.collection('test').truncate(),
			tempName,
			tempAge,
			i;

		for (i = 0; i < 1000; i++) {
			tempName = names[Math.ceil(Math.random() * names.length) - 1];
			tempAge = Math.ceil(Math.random() * 100);

			collection.insert({
				name: tempName,
				age: tempAge
			});
		}

		collection.ensureIndex({
			age: 1
		}, {
			type: 'btree'
		});

		var explain = collection.explain({
			age: {
				'$gte': 30,
				'$lte': 40
			}
		});

		strictEqual(explain.index.used, true, 'Query explanation shows index in use');
		console.log(explain);

		base.dbDown();
	});
});

ForerunnerDB.version('1.6', function () {
	QUnit.test("Collection.ensureIndex() :: Test index against a key in a sub-array of documents", function () {
		base.dbUp();

		var coll,
			result,
			allowedInsert,
			deniedInsert,
			find,
			index;

		coll = db.collection('temp').truncate();
		coll.setData([{
			"_id": "139",
			"eventId": "139",
			"nthRepeat": 0,
			"name": "Test",
			"notes": "wfewef",
			"startDateTime": "2014-09-01T23:00:00+00:00",
			"endDateTime": "2014-09-03T23:00:00+00:00",
			"reminderType": "",
			"reminderTime": 0,
			"isRepeatedEvent": false,
			"repeatContext": null,
			"repeatDate": null,
			"repeatForever": 0,
			"creator": {
				"organisationUserId": "63614",
				"dateTime": "2014-09-01T13:01:54+00:00"
			},
			"updated": [],
			"_s": "Test:::01:::09:00",
			"attendees": {
				"moo": {
					"foo": [{
						"name": "1"
					}]
				}
			}
		}]);

		result = coll.ensureIndex({
			attendees: {
				moo: {
					foo: 1
				}
			}
		}, {
			unique: true, // Only allow unique values
			scope: 'document', // Index against documents individually rather than the whole collection
			name: 'uniqueAttendeeMooFoo',
			type: 'btree'
		});

		allowedInsert = coll.updateById("139", {
			"attendees": {
				"moo": {
					"$push": {
						"foo": {
							"name": "2"
						}
					}
				}
			}
		});

		deniedInsert = coll.update({_id: "139"}, {
			"attendees": {
				"moo": {
					"$push": {
						"foo": {
							"name": "2"
						}
					}
				}
			}
		});

		find = coll.find();

		strictEqual(find.length, 1, "Check expected number of items exists");
		strictEqual(allowedInsert.length, 1, "Check expected update worked (index should allow it)");
		strictEqual(deniedInsert.length, 0, "Check expected update failed (index should make it fail)");

		base.dbDown();
	});
});