"use strict";

QUnit.module('Db');
QUnit.test("DB.collection() :: Create Collection", function() {
	base.dbUp();

	user = db.collection('user');
	organisation = db.collection('organisation');
	ok(user !== undefined, "Complete");

	base.dbDown();
});

QUnit.test("DB.collection() :: Check that passing a collection to get a collection returns the same collection", function() {
	base.dbUp();

	var coll = db.collection('moo');
	var coll2 = db.collection(coll);

	strictEqual(coll, coll2, "Collections are the same");

	base.dbDown();
});

QUnit.test("Drop DB", function() {
	base.dbUp();

	var coll = db.collection('test');
	coll.insert({moo: true});

	strictEqual(coll.find().length, 1, 'Check collection has been set up correctly');

	db.drop();

	var coll = db.collection('test');
	strictEqual(coll.find().length, 0, 'Check db had dropped collections');

	base.dbDown();
});

QUnit.test("DB.peek() :: Search all database collections for string", function() {
	base.dbUp();
	base.dataUp();

	var result = db.peek('an');

	strictEqual(result.length, 16, "Got correct number of results");
	strictEqual(result[0]._id, '2', "Got expected result id");
	strictEqual(result[1]._id, '4', "Got expected result id");
	strictEqual(result[2]._id, '5', "Got expected result id");

	base.dbDown();
});

QUnit.test("DB.peekCat() :: Search all database collections for string", function() {
	base.dbUp();
	base.dataUp();

	var result = db.peekCat('an');

	strictEqual(result.organisation && result.organisation.length, 13, "Got correct number of organisation results");
	strictEqual(result.user && result.user.length, 3, "Got correct number of user results");

	base.dbDown();
});