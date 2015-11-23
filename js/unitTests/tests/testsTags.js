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

	QUnit.test('Collection.tagDrop() :: Add a tag to a collection', function () {
		"use strict";
		base.dbUp();

		var coll1 = db.collection('test1'),
			coll2 = db.collection('test2'),
			arr;

		coll1.tagAdd('users/list');
		coll2.tagAdd('users/list');

		strictEqual(coll1.isDropped(), false, 'Collection 1 is not dropped');
		strictEqual(coll2.isDropped(), false, 'Collection 2 is not dropped');

		// Drop collections by tag
		db.tagDrop('users/list');

		strictEqual(coll1.isDropped(), true, 'Collection 1 is dropped');
		strictEqual(coll2.isDropped(), true, 'Collection 2 is dropped');

		base.dbDown();
	});
});