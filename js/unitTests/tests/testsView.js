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

		coll.insert({
			moo: true
		});

		view.drop();

		try {
			coll.setData({
				moo: true
			});
		} catch (e) {
			strictEqual(true, false, 'Dropped view caused error: ' + e);
		}

		strictEqual(coll, coll, 'OK');

		base.dbDown();
	});
});