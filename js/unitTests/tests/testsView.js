QUnit.module('Views');
ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test('View.from() :: Drop a view\'s underlying collection', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('test'),
			from;

		view.from(coll);

		coll.insert({
			moo: true
		});

		coll.drop();

		from = view.from();

		// TODO this test is currently useless as it is not written yet
		strictEqual(from, from, 'OK');

		base.dbDown();
	});

	QUnit.test('View.drop() :: Drop a view and check underlying collection doesn\'t still chain data to the dropped view', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test'),
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

	QUnit.test('View.queryData() :: Set query and data and check that returned data matches expected result', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			result;

		view
			.queryData({}, {
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

	/*QUnit.asyncTest('View.on("change") :: Change event fired when underlying data source updates view content', function () {
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
	});*/
});