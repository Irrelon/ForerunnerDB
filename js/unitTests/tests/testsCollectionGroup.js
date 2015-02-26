ForerunnerDB.moduleLoaded('CollectionGroup', function () {
	test("Core - CollectionGroup.find() :: Single collection", function() {
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

	test("Core - CollectionGroup.find() :: Single collection, descending sort", function() {
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
});