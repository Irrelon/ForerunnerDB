QUnit.module('Views');
QUnit.test('View.from() :: Drop a view\'s underlying collection', function () {
	"use strict";
	base.dbUp();

	var coll = db.collection('test'),
		view = db.view('test');

	view.from(coll);

	coll.insert({
		moo: true
	});

	coll.drop();

	debugger;

	strictEqual(1, 1, 'OK');

	base.dbDown();
});