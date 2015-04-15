QUnit.module('Collection -> CollectionGroup');
ForerunnerDB.moduleLoaded('CollectionGroup', function () {
	QUnit.test("Chains CRUD - setData", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testGroup');

		group.addCollection(coll);

		coll.setData({
			name: 'Fred'
		});

		var result = group.find();

		strictEqual(result.length, 1, "Correct number of results in group find");
		strictEqual(result.length && result[0].name, 'Fred', "Correct entry data");

		base.dbDown();
	});

	QUnit.test("Chains CRUD - insert", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testView');

		group.addCollection(coll);

		coll.insert({
			name: 'Fred'
		});

		var result = group.find();

		strictEqual(result.length, 1, "Correct number of results in group find: " + result.length);
		strictEqual(result.length && result[0].name, 'Fred', "Correct entry data");

		base.dbDown();
	});

	QUnit.test("Chains CRUD - updated", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testView');

		group.addCollection(coll);

		coll.insert({
			name: 'Fred'
		});

		coll.insert({
			name: 'Joe'
		});

		coll.update({name: 'Fred'}, {name: 'Jim'});

		var result = group.find();

		strictEqual(result.length, 2, "Correct number of results in group find: " + result.length);
		strictEqual(result.length && result[0].name, 'Jim', "Correct entry data");

		base.dbDown();
	});

	QUnit.test("Chains CRUD - remove", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testView');

		group.addCollection(coll);

		coll.insert({
			name: 'Fred'
		});

		coll.insert({
			name: 'Joe'
		});

		coll.remove({name: 'Fred'});

		var result = group.find();

		strictEqual(result.length, 1, "Correct number of results in group find: " + result.length);
		strictEqual(result.length && result[0].name, 'Joe', "Correct entry data");

		base.dbDown();
	});
});