QUnit.module('Views General');
ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test('View.from() :: Drop a view\'s underlying collection', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			from;

		view.from(coll);

		coll.insert({
			moo: true
		});

		from = view.from();

		strictEqual(from, coll, 'From is correct before drop');

		coll.drop();

		from = view.from();

		strictEqual(from, undefined, 'From is now undefined after drop');

		base.dbDown();
	});

	QUnit.test('View.drop() :: Drop a view and check underlying collection doesn\'t still chain data to the dropped view', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			from;

		view.from(coll);
		view.from(coll);

		coll.insert({
			moo: true
		});

		view.drop();

		try {
			coll.remove({
				moo: true
			});
		} catch (e) {
			strictEqual(true, false, 'Dropped view caused error: ' + e);
		}

		strictEqual(coll, coll, 'OK');

		base.dbDown();
	});

	QUnit.test('View.query() :: Query options on view has $orderBy, test order is correct', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			result;

		view
			.query({

			}, {
				$orderBy: {
					createdTs: -1
				}
			})
			.from(coll);

		coll.insert({
			_id: 1,
			createdTs: 1
		});

		coll.insert({
			_id: 2,
			createdTs: 2
		});

		result = view.find();

		strictEqual(result[0]._id, 2, 'OK');
		strictEqual(result[1]._id, 1, 'OK');

		base.dbDown();
	});

	QUnit.test('View.find() :: Insert into an underlying collection and check view has record', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			result;

		view.from(coll);

		result = view.find({});

		strictEqual(result.length, 0, 'Result count before insert correct');

		coll.insert({
			moo: true
		});

		result = view.find({});

		strictEqual(result.length, 1, 'Result count after insert correct');

		base.dbDown();
	});

	QUnit.test('View.find() :: Insert into an underlying collection with data changed in a before trigger and check view has same record', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			result;

		view.from(coll);

		result = view.find({});

		strictEqual(result.length, 0, 'Result count before insert correct');

		coll.addTrigger('beforeInsert', db.TYPE_INSERT, db.PHASE_BEFORE, function (operation, oldDoc, newDoc) {
			// Modify the object
			newDoc.foo = true;
		});

		coll.insert({
			moo: true
		});

		result = view.find({});

		strictEqual(result.length, 1, 'Result count after insert correct');
		strictEqual(result[0].moo, true, 'Result data after insert correct');
		strictEqual(result[0].foo, true, 'Result trigger data after insert correct');

		base.dbDown();
	});

	// TODO: This will currently fail, fix this bug!
	/*QUnit.test('View.find() :: Update an underlying collection with data changed in a before trigger and check view has same record', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			result;

		view.from(coll);

		result = view.find({});

		strictEqual(result.length, 0, 'Result count before insert correct');

		coll.insert({
			moo: true
		});

		coll.addTrigger('beforeUpdate', db.TYPE_UPDATE, db.PHASE_BEFORE, function (operation, oldDoc, newDoc) {
			// Modify the object
			newDoc.foo = true;
		});

		coll.update({
			moo: true
		}, {
			moo: false
		});

		result = view.find({});

		strictEqual(result.length, 1, 'Result count after update correct');
		strictEqual(result[0].moo, false, 'Result data after update correct');
		strictEqual(result[0].foo, true, 'Result trigger data after update correct');

		base.dbDown();
	});*/

	QUnit.test('View.find() :: Update an underlying collection and check view is updated', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			result;

		view.from(coll);

		result = view.find({});

		strictEqual(result.length, 0, 'Result count before insert correct');

		coll.insert({
			moo: true,
			moduleData: {
				listenList: [{
					_id: "1345",
					name: 'Old'
				}]
			}
		});

		result = view.find({});

		strictEqual(result.length, 1, 'Result count after insert correct');
		strictEqual(result[0].moo, true, 'Result data before update correct');
		strictEqual(result[0].moduleData.listenList[0].name, "Old", 'Result nested data before update correct');

		coll.update({
			_id: result[0]._id
		}, {
			moo: false
		});

		result = view.find({});

		strictEqual(result.length, 1, 'Result count after update correct');
		strictEqual(result[0].moo, false, 'Result data after update correct');

		// Try an advanced update (into a sub-document)
		coll.update({
			_id: result[0]._id,
			moduleData: {
				listenList: {
					_id: "1345"
				}
			}
		}, {
			moduleData: {
				'listenList.$': {
					name: "New"
				}
			}
		});

		result = view.find({});

		strictEqual(result.length, 1, 'Result count after update correct');
		strictEqual(result[0].moo, false, 'Result data after update correct');
		strictEqual(result[0].moduleData.listenList[0].name, "New", 'Result nested data after update correct');

		base.dbDown();
	});

	QUnit.test("View $join :: Update joined collection and ensure view is properly updated", function () {
		base.dbUp();
		base.dataUp();

		var userView = db.view('userView')
			.from('user')
			.query({}, {
				"$join": [{
					"organisation": {
						"_id": "orgId",
						"$as": "org",
						"$require": true,
						"$multi": false
					}
				}]
			});

		var result = userView.find();

		strictEqual(result[0].orgId, result[0].org._id, "Complete");
		strictEqual(result[1].orgId, result[1].org._id, "Complete");
		strictEqual(result[2].orgId, result[2].org._id, "Complete");

		// Now update organisation collection and check that view has new updated data
		db.collection('organisation').update({}, {
			newDataInOrg: true
		});

		// Check view data (should have newDataInOrg in the org data)
		result = userView.find();

		strictEqual(result[0].org.newDataInOrg, true, "Complete");
		strictEqual(result[1].org.newDataInOrg, true, "Complete");
		strictEqual(result[2].org.newDataInOrg, true, "Complete");

		base.dbDown();
	});

	QUnit.asyncTest('View.on("change") :: Change event fired when underlying data source updates view content', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('test'),
			result,
				count = 0;

		view
			.queryData({}, {
				$orderBy: {
					createdTs: -1
				}
			})
			.from(coll);

		view.on('change', function () {
			count++;
		});

		coll.insert({
			_id: 1,
			createdTs: 1
		});

		coll.insert({
			_id: 2,
			createdTs: 2
		});

		setTimeout(function () {
			result = view.find();

			strictEqual(result[0]._id, 2, 'OK');
			strictEqual(result[1]._id, 1, 'OK');
			strictEqual(count, 2, 'OK');

			base.dbDown();
			start();
		}, 1000);
	});
});