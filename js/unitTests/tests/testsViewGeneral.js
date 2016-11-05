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

	/*QUnit.test('View.find() :: Update an underlying collection with data changed in a before trigger and check view has same record', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			collResult,
			viewResult;

		view.from(coll);

		collResult = coll.find({});
		viewResult = view.find({});

		strictEqual(viewResult.length, 0, 'Collection result count before insert correct');
		strictEqual(viewResult.length, 0, 'View result count before insert correct');

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

		collResult = coll.find({});
		viewResult = view.find({});

		strictEqual(collResult.length, 1, 'Collection result count after update correct');
		strictEqual(collResult[0].moo, false, 'Collection result data after update correct');
		strictEqual(collResult[0].foo, true, 'Collection result trigger data after update correct');

		strictEqual(viewResult.length, 1, 'View result count after update correct');
		strictEqual(viewResult[0].moo, false, 'View result data after update correct');
		strictEqual(viewResult[0].foo, true, 'View result trigger data after update correct');

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

		db.collection('user').update({
			_id: '2'
		}, {
			moo: '52'
		});

		result = db.collection('user').find({_id: '2'});

		// Check we haven't contaminated the collection data with view data
		strictEqual(result[0].org, undefined, "Check view data hasn't contaminated collection data");

		base.dbDown();
	});

	QUnit.asyncTest('View.on("change") :: Change event fired when underlying data source updates view content', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('test'),
			result,
			changeCount = 0,
			immediateChangeCount = 0;

		view
			.queryData({}, {
				$orderBy: {
					createdTs: -1
				}
			})
			.from(coll);

		view.on('immediateChange', function () {
			immediateChangeCount++;
		});

		view.on('change', function () {
			changeCount++;
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

			ok(result.length, 'Results were found');

			if (result.length) {
				strictEqual(result[0]._id, 2, 'Result 0 id is correct');
				strictEqual(result[1]._id, 1, 'Result 1 id is correct');
				strictEqual(changeCount, 1, 'The change count is correct (only one event should be fired)');
				strictEqual(immediateChangeCount, 2, 'The immediate change count is correct (two events should be fired)');
			}

			base.dbDown();
			start();
		}, 200);
	});

	/*QUnit.test('View.from() :: View from a view from a collection', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view1 = db.view('test1'),
			view2 = db.view('test2'),
			from,
			result;

		view1.from(coll);
		view2.from(view1);

		view1.query({

		});

		view2.query({
			inView2: true
		}, {
			$page: 0,
			$limit: 10
		});

		coll.insert([{
			_id: '1',
			inColl: true,
			inView1: true,
			inView2: false
		}, {
			_id: '2',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '3',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '4',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '5',
			inColl: true,
			inView1: true,
			inView2: false
		}, {
			_id: '6',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '7',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '8',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '9',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '10',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '11',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '12',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '13',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '14',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '15',
			inColl: true,
			inView1: true,
			inView2: true
		}, {
			_id: '16',
			inColl: true,
			inView1: true,
			inView2: true
		}]);

		result = view2.find();

		strictEqual(result.length, 10, 'View 2 count is correct');

		// Break the view2 from view1
		view2.from('tempColl');

		result = view2.find();

		strictEqual(result.length, 0, 'View 2 count is correct');

		// Re-establish the view2 from view1
		view2.from(view1);

		result = view2.find();

		strictEqual(result.length, 10, 'View 2 count is correct');

		base.dbDown();
	});*/
});