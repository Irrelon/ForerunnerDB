QUnit.module('CollectionGroup');
ForerunnerDB.moduleLoaded('CollectionGroup', function () {
	QUnit.test("CollectionGroup.find() :: Single collection", function() {
		base.dbUp();
		base.dataUp();

		var group = db.collectionGroup('testGroup')
			.addCollection(user);

		var result = group.find({}, {
			"$orderBy": {
				"age": 1
			}
		});

		strictEqual(result[0].name === 'Dean' && result[0].age, 5, "Name and Lookup");
		strictEqual(result[1].name === 'Dean' && result[1].age, 5, "Name and Lookup");
		strictEqual(result[2].name === 'Kat' && result[2].age, 12, "Name and Lookup");
		strictEqual(result[3].name === 'Jim' && result[3].age, 15, "Name and Lookup");

		base.dbDown();
	});

	QUnit.test("CollectionGroup.find() :: Single collection, descending sort", function() {
		base.dbUp();
		base.dataUp();

		var group = db.collectionGroup('testGroup')
			.addCollection(user);

		var result = group.find({}, {
			"$orderBy": {
				"age": -1
			}
		});

		strictEqual(result[0].name === 'Jim' && result[0].age, 15, "Name and Lookup");
		strictEqual(result[1].name === 'Kat' && result[1].age, 12, "Name and Lookup");
		strictEqual(result[2].name === 'Dean' && result[2].age, 5, "Name and Lookup");

		base.dbDown();
	});

	QUnit.test("CollectionGroup.find() :: Multiple collections", function() {
		base.dbUp();

		var test1 = db.collection('test1'),
			test2 = db.collection('test2'),
			group = db.collectionGroup('testGroup')
				.addCollection(test1)
				.addCollection(test2);

		test1.insert({
			_id: '1',
			name: 'Bill',
			age: 12
		});

		test2.insert({
			_id: '2',
			name: 'Jim',
			age: 6
		});

		var result = group.find({}, {
			"$orderBy": {
				"age": 1
			}
		});

		strictEqual(result[0].name === 'Jim' && result[0].age, 6, "Name and Lookup");
		strictEqual(result[1].name === 'Bill' && result[1].age, 12, "Name and Lookup");

		base.dbDown();
	});

	QUnit.test("CollectionGroup.find() :: Multiple collections, descending sort", function() {
		base.dbUp();

		var test1 = db.collection('test1'),
			test2 = db.collection('test2'),
			group = db.collectionGroup('testGroup')
				.addCollection(test1)
				.addCollection(test2);

		test1.insert({
			_id: '1',
			name: 'Bill',
			age: 12
		});

		test2.insert({
			_id: '2',
			name: 'Jim',
			age: 6
		});

		var result = group.find({}, {
			"$orderBy": {
				"age": -1
			}
		});

		strictEqual(result[0].name === 'Bill' && result[0].age, 12, "Name and Lookup");
		strictEqual(result[1].name === 'Jim' && result[1].age, 6, "Name and Lookup");

		base.dbDown();
	});
});