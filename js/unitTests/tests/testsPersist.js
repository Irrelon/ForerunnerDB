ForerunnerDB.moduleLoaded('Persist', function () {
	asyncTest('Persistence - Collection.save() :: Save data to storage and load it back', function () {
		expect(5);

		base.dbUp();

		var coll = db.collection('test');
		coll.insert({
			name: 'Test'
		});

		coll.save(function (err) {
			if (err) {
				console.log(err);
				ok(false, err);
			} else {
				ok(!err, 'Check that there are currently no items in the collection');
			}
			//coll.drop();

			base.dbDown();
			base.dbUp();

			coll = db.collection('test');

			// Make sure the item does not currently exist
			result = coll.find();

			ok(db.persist.driver(), 'Check that there is a persistent storage driver: ' + db.persist.driver());
			strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

			coll.load(function (err) {
				result = coll.find();
				strictEqual(result.length, 1, 'Check that items were loaded correctly');
				strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');

				base.dbDown();

				start();
			});
		});
	});
});