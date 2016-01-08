QUnit.module('Index2d');
QUnit.test("Collection.ensureIndex() :: Assign an index to a collection", function() {
	base.dbUp();

	var coll = db.collection('houses').truncate();
	var indexResult = coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'testIndex1',
		type: '2d'
	});

	strictEqual(indexResult.err, undefined, "Initialise index error: " + indexResult.err);
	ok(indexResult.state !== undefined, "Check index state object: " + JSON.stringify(indexResult.state));
	strictEqual(indexResult.state.ok, true, "Check index state ok: " + indexResult.state.ok);
	strictEqual(indexResult.state.name, 'testIndex1', "Check index state name: " + indexResult.state.name);

	base.dbDown();
});

QUnit.test("Collection.ensureIndex() :: Check that the index identifies itself as a match for geospatial query", function() {
	base.dbUp();

	var coll = db.collection('houses').truncate(),
		index,
		indexResult,
		result;

	indexResult = coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'testIndex1',
		type: '2d'
	});

	index = coll.index('testIndex1');

	result = index.match({
		lngLat: {
			$near: {
				$point: [],
				$maxDistance: 5,
				$distanceUnits: 'miles'
			}
		}
	});

	strictEqual(result.score, 1, "Index agrees it will be able to satisfy the query");

	base.dbDown();
});

QUnit.test("Collection.index() :: Test 2d index search", function () {
	base.dbUp();

	var coll = db.collection('houses').truncate(),
		result;

	coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'testIndex2',
		type: '2d'
	});

	coll.insert([{
		lngLat: [51.50722, -0.12750],
		name: 'Central London'
	}, {
		lngLat: [51.525745, -0.167550], // 2.18 miles
		name: 'Marylebone, London'
	}, {
		lngLat: [51.576981, -0.335091], // 10.54 miles
		name: 'Harrow, London'
	}, {
		lngLat: [51.769451, 0.086509], // 20.33 miles
		name: 'Harlow, Essex'
	}]);

	var index = coll.index('testIndex2');

	ok(index !== undefined, "Check index is available: " + index);
	ok(index.name() === 'testIndex2', "Check index is correct name: " + index.name());

	// Query index by distance
	// $near queries are sorted by distance from center point by default
	result = coll.find({
		lngLat: {
			$near: {
				$point: [51.50722, -0.12750],
				$maxDistance: 3,
				$distanceUnits: 'miles'
			}
		}
	});

	strictEqual(result.length, 2, 'Result count correct');
	strictEqual(result[0].name, 'Central London', 'Result 1 correct');
	strictEqual(result[1].name, 'Marylebone, London', 'Result 2 correct');

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

ForerunnerDB.version('1.4', function () {
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

ForerunnerDB.version('1.4', function () {
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