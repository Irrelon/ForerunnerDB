"use strict";

var TB = require('testbear'),
	ForerunnerDB = require('../../builds/nodecore');

TB.test('Instantiate ForerunnerDB', function (callback) {
	var fdb = new ForerunnerDB();

	TB.strictEqual(fdb instanceof ForerunnerDB, true, 'ForerunnerDB instance is instantiated');

	callback();
});

TB.test('Instantiate a Database Instance', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp');

	TB.strictEqual(db instanceof ForerunnerDB.shared.modules.Db, true, 'ForerunnerDB database instance is instantiated');

	callback();
});

TB.test('Instantiate a Collection Instance', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp'),
		coll = db.collection('test');

	TB.strictEqual(coll instanceof ForerunnerDB.shared.modules.Collection, true, 'ForerunnerDB instance is instantiated');

	callback();
});

TB.test('Save Collection Data and Load it Back From File-Based Persistent Storage', function (callback) {
	var fdb = new ForerunnerDB(),
		self = this,
		db = fdb.db('temp'),
		coll = db.collection('test', {
			changeTimestamp: true
		}),
		result,
		lastChange;

	db.persist.dataDir('./configData');

	coll.insert({
		name: 'Test'
	});

	lastChange = coll.metaData().lastChange;

	coll.save(function (err) {
		if (err) {
			console.log(err);
			TB.ok(false, err);
		} else {
			TB.equal(err, false, 'Save did not produce an error');
		}

		db.drop(false);
		db = fdb.db('temp');
		db.persist.dataDir('./configData');

		coll = db.collection('test');

		// Make sure the item does not currently exist
		result = coll.find();
		TB.strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

		coll.load(function (err) {
			if (err) {
				console.log(err);
				TB.ok(false, err);
			} else {
				TB.ok(!err, 'Load did not produce an error');
			}

			result = coll.find();

			TB.strictEqual(result.length, 1, 'Check that items were loaded correctly');
			TB.strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
			TB.strictEqual(coll.metaData().lastChange.toISOString(), lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');

			db.drop();

			callback();
		});
	});
});

TB.test('Timed save, 50,000 records', function (callback) {
	var fdb = new ForerunnerDB(),
		self = this,
		db = fdb.db('temp'),
		coll = db.collection('test', {
			changeTimestamp: true
		}),
		result,
		lastChange,
		dataArr = [],
		dataCount = 50000,
		testString,
		i = 0;

	db.persist.dataDir('./configData');

	testString = JSON.stringify({
		"_id": String(i),
		"data": [{
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}]
	});

	TB.ok(testString.length === 519 || testString.length === 520, 'Check that each entry is 519 or 520 bytes');

	TB.time('Generating ' + dataCount + ' records');
	for (i = 0; i < dataCount; i++) {
		dataArr.push({
			"_id": String(i),
			"data": [{
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}]
		});
	}
	TB.time('Generating ' + dataCount + ' records');

	TB.time('Inserting ' + dataCount + ' records');
	coll.insert(dataArr, function () {
		TB.time('Inserting ' + dataCount + ' records');
		lastChange = coll.metaData().lastChange;
		//console.log('Test', lastChange.toString());

		TB.time('Saving data');
		coll.save(function (err) {
			TB.time('Saving data');
			if (err) {
				console.log(err);
				TB.ok(false, err);
			} else {
				TB.equal(err, false, 'Save did not produce an error');
			}

			db.drop(false);
			db = fdb.db('temp');
			db.persist.dataDir('./configData');

			coll = db.collection('test');

			// Make sure the item does not currently exist
			result = coll.find();
			TB.strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

			TB.time('Loading data');
			coll.load(function (err) {
				TB.time('Loading data');
				if (err) {
					console.log(err);
					TB.ok(false, err);
				} else {
					TB.ok(!err, 'Load did not produce an error');
				}

				TB.time('Running find on collection');
				result = coll.find({}, {$decouple: false});
				TB.time('Running find on collection');

				TB.strictEqual(dataCount, result.length, 'Check that items were loaded correctly');

				if (coll.metaData() && coll.metaData().lastChange && coll.metaData().lastChange.toISOString && lastChange) {
					TB.strictEqual(coll.metaData().lastChange.toISOString(), lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');
				}

				db.drop();

				callback();
			});
		});
	});
});

TB.test('Collection.index() :: Test 2d index search on large data set', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp'),
		coll = db.collection('cities').truncate(),
		result1,
		result2,
		cityData;

	cityData = require('../data/cities.json');

	coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'cityLatLngIndex',
		type: '2d'
	});

	console.log('Inserting records: ' + cityData.length);

	coll.insert(cityData, function () {
		console.log('Collection record count: ' + coll.count());

		var index = coll.index('cityLatLngIndex');

		TB.ok(index !== undefined, "Check index is available: " + index.name());
		TB.ok(index.name() === 'cityLatLngIndex', "Check index is correct name: " + index.name());

		// Query index by distance
		// $near queries are sorted by distance from center point by default
		result1 = coll.find({
			lngLat: {
				$near: {
					$point: [51.50722, -0.12750],
					$maxDistance: 50,
					$distanceUnits: 'miles',
					$distanceField: 'dist',
					$geoHashField: 'geoHash'
				}
			}
		});

		result2 = coll.find({
			lngLat: {
				$near: {
					$point: [51.50722, -0.12750],
					$maxDistance: 100,
					$distanceUnits: 'miles',
					$distanceField: 'dist',
					$geoHashField: 'geoHash'
				}
			}
		});

		TB.strictEqual(result1.length < result2.length, true, 'Number of doc in 100 miles is more than docs in 50 miles');

		TB.strictEqual(result1.length, 9, 'Result1 count correct');
		TB.strictEqual(result2.length, 22, 'Result2 count correct');

		TB.strictEqual(result1[0].name, 'London, UK', 'Result 1 correct');
		TB.strictEqual(result1[1].name, 'Wycombe, Swanley, Greater London BR8, UK', 'Result 2 correct');
		TB.strictEqual(result1[2].name, 'Basildon, Essex, UK', 'Result 3 correct');
		TB.strictEqual(result1[3].name, 'Luton, UK', 'Result 4 correct');
		TB.strictEqual(result1[4].name, 'Chelmsford, Essex, UK', 'Result 5 correct');
		TB.strictEqual(result1[5].name, 'Southend-on-Sea, UK', 'Result 6 correct');
		TB.strictEqual(result1[6].name, 'Aylesbury, Buckinghamshire, UK', 'Result 7 correct');
		TB.strictEqual(result1[7].name, 'Milton Keynes, UK', 'Result 8 correct');
		TB.strictEqual(result1[8].name, 'Brighton, Brighton and Hove, UK', 'Result 9 correct');

		TB.strictEqual(result2[0].name, 'London, UK', 'Result 1 correct');
		TB.strictEqual(result2[1].name, 'Wycombe, Swanley, Greater London BR8, UK', 'Result 2 correct');
		TB.strictEqual(result2[2].name, 'Basildon, Essex, UK', 'Result 3 correct');
		TB.strictEqual(result2[3].name, 'Luton, UK', 'Result 4 correct');
		TB.strictEqual(result2[4].name, 'Chelmsford, Essex, UK', 'Result 5 correct');
		TB.strictEqual(result2[5].name, 'Southend-on-Sea, UK', 'Result 6 correct');
		TB.strictEqual(result2[6].name, 'Aylesbury, Buckinghamshire, UK', 'Result 7 correct');
		TB.strictEqual(result2[7].name, 'Milton Keynes, UK', 'Result 8 correct');
		TB.strictEqual(result2[8].name, 'Brighton, Brighton and Hove, UK', 'Result 9 correct');

		callback();
	});
});

TB.start();