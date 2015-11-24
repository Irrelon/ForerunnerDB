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
