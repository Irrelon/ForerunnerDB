QUnit.module('Views');
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