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