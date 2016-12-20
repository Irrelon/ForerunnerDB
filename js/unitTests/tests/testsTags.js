QUnit.module('Tags');
ForerunnerDB.moduleLoaded('Collection', function () {
	QUnit.test('Collection.tagAdd() :: Add a tag to a collection', function () {
		"use strict";
		base.dbUp();

		var coll1 = db.collection('test1'),
			coll2 = db.collection('test2'),
			arr;

		coll1.tagAdd('users/list');
		coll2.tagAdd('users/list');

		// Get the collections by their tag
		arr = db.tagLookup('users/list');

		strictEqual(arr.length, 2, 'OK');

		base.dbDown();
	});

	QUnit.asyncTest('Collection.tagDrop() :: Drop collections by tag', function () {
		"use strict";
		expect(6);
		base.dbUp();

		var coll1 = db.collection('test1'),
			coll2 = db.collection('test2'),
			arr;

		coll1.tagAdd('users/list');
		coll2.tagAdd('users/list');

		arr = db.tagLookup('users/list');

		strictEqual(arr.length, 2, 'OK');

		strictEqual(coll1.isDropped(), false, 'Collection 1 is not dropped');
		strictEqual(coll2.isDropped(), false, 'Collection 2 is not dropped');

		// Drop collections by tag
		db.tagDrop('users/list', function () {
			strictEqual(coll1.isDropped(), true, 'Collection 1 is dropped');
			strictEqual(coll2.isDropped(), true, 'Collection 2 is dropped');

			arr = db.tagLookup('users/list');

			strictEqual(arr.length, 0, 'OK');

			start();
			base.dbDown();
		});
	});
});

ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test('View.tagAdd() :: Add a tag to a view', function () {
		"use strict";
		base.dbUp();

		var coll1 = db.view('test1'),
			coll2 = db.view('test2'),
			arr;

		coll1.tagAdd('users/list');
		coll2.tagAdd('users/list');

		// Get the views by their tag
		arr = db.tagLookup('users/list');

		strictEqual(arr.length, 2, 'OK');

		base.dbDown();
	});

	QUnit.asyncTest('View.tagDrop() :: Drop views by tag', function () {
		"use strict";
		expect(6);
		base.dbUp();

		var coll1 = db.view('test1'),
			coll2 = db.view('test2'),
			arr;

		coll1.tagAdd('users/list');
		coll2.tagAdd('users/list');

		arr = db.tagLookup('users/list');

		strictEqual(arr.length >= 2, true, 'OK');

		strictEqual(coll1.isDropped(), false, 'View 1 is not dropped');
		strictEqual(coll2.isDropped(), false, 'View 2 is not dropped');

		// Drop views by tag
		db.tagDrop('users/list', function () {
			strictEqual(coll1.isDropped(), true, 'View 1 is dropped');
			strictEqual(coll2.isDropped(), true, 'View 2 is dropped');

			arr = db.tagLookup('users/list');

			strictEqual(arr.length, 0, 'OK');

			start();
			base.dbDown();
		});
	});
});