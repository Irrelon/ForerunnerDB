QUnit.module('Serialiser');
QUnit.test("Serialiser() :: Check serialisation of null value is handled correctly", function () {
	base.dbUp();

	var coll = db.collection('test').truncate(),
		result;

	coll.insert({
		a: null
	});

	result = coll.find();

	strictEqual(result[0].a, null, 'After serialisation and de-serialisation the value is still null');

	base.dbDown();
});

QUnit.test("Serialiser() :: Date objects encode/decode working", function () {
	base.dbUp();

	var coll = db.collection('test').truncate(),
		result;

	coll.insert({
		a: fdb.make(new Date())
	});

	result = coll.find();

	strictEqual(result[0].a instanceof Date, true, 'After serialisation and de-serialisation the value is still a date object');

	base.dbDown();
});

QUnit.test("Serialiser() :: RegExp objects encode/decode working", function () {
	base.dbUp();

	var coll = db.collection('test').truncate(),
		result;

	coll.insert({
		a: fdb.make(new RegExp('.*', 'i'))
	});

	result = coll.find();

	strictEqual(result[0].a instanceof RegExp, true, 'After serialisation and de-serialisation the value is still a RegExp object');

	base.dbDown();
});

/*QUnit.test("Serialiser() :: NaN objects encode/decode working", function () {
	base.dbUp();

	var coll = db.collection('test').truncate(),
			result;

	coll.insert({
		a: NaN
	});

	result = coll.find();

	strictEqual(isNaN(result[0].a), true, 'After serialisation and de-serialisation the value is still an NaN');

	base.dbDown();
});*/
