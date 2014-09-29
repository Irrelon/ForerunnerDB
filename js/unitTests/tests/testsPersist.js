test('Persistence - Collection.save() :: Save data to storage and load it back', function () {
	base.dbUp();

	var coll = db.collection('test');
	coll.insert({
		name: 'Test'
	});

	var result = coll.save();

	base.dbDown();
	base.dbUp();

	coll = db.collection('test');

	// Make sure the item does not currently exist
	result = coll.find();
	ok(result.length === 0, 'Check that there are currently no items in the collection');

	result = coll.load();

	result = coll.find();
	ok(result.length === 1, 'Check that items were loaded correctly');
	ok(result[0].name === 'Test', 'Check that the data loaded holds correct information');

	base.dbDown();
});