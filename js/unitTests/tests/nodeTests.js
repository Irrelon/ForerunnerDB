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

TB.start();