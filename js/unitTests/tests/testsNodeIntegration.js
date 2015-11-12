"use strict";

QUnit.module("Core", {
	setup: function() {
		this.ForerunnerDB = require('../../builds/nodecore');
	}
});

test('Instantiate ForerunnerDB', 1, function () {
	this.fdb = new this.ForerunnerDB();

	strictEqual(this.fdb instanceof this.ForerunnerDB, true, 'ForerunnerDB instance is instantiated');
});

test('Instantiate a Database Instance', 1, function () {
	this.fdb = new this.ForerunnerDB();
	this.db = this.fdb.db('temp');

	strictEqual(this.db instanceof this.ForerunnerDB.shared.modules.Db, true, 'ForerunnerDB instance is instantiated');
});

test('Instantiate a Collection Instance', 1, function () {
	this.fdb = new this.ForerunnerDB();
	this.db = this.fdb.db('temp');
	this.coll = this.db.collection('test');

	strictEqual(this.coll instanceof this.ForerunnerDB.shared.modules.Collection, true, 'ForerunnerDB instance is instantiated');
});

test('Save Collection Data and Load it Back From File-Based Persistent Storage', function () {
	QUnit.expect(5);
	QUnit.stop();
	this.fdb = new this.ForerunnerDB();
	var self = this,
		db = this.fdb.db('temp'),
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
			QUnit.ok(false, err);
		} else {
			QUnit.equal(err, false, 'Save did not produce an error');
		}

		db.drop();
		db = self.fdb.db('temp');

		coll = db.collection('test');

		// Make sure the item does not currently exist
		result = coll.find();
		strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

		coll.load(function (err) {
			if (err) {
				console.log(err);
				ok(false, err);
			} else {
				ok(!err, 'Load did not produce an error');
			}

			result = coll.find();

			strictEqual(result.length, 1, 'Check that items were loaded correctly');
			strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
			strictEqual(coll.metaData().lastChange, lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');

			start();
		});
	});
});