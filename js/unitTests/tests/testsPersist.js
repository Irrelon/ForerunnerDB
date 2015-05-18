QUnit.module('Persist');
ForerunnerDB.moduleLoaded('Persist', function () {
	QUnit.asyncTest('Collection.save() :: Save data to storage and load it back', function () {
		expect(6);

		base.dbUp();

		ok(db.persist.driver(), 'Check that there is a persistent storage driver: ' + db.persist.driver());

		var coll = db.collection('test'), result;
		coll.insert({
			name: 'Test'
		});

		coll.save(function (err) {
			if (err) {
				console.log(err);
				ok(false, err);
			} else {
				ok(!err, 'Save did not produce an error');
			}

			base.dbDown(false);
			base.dbUp();

			coll = db.collection('test');

			// Make sure the item does not currently exist
			result = coll.find();
			strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

			coll.load(function (err) {
				if (err) {
					console.log(err);
					ok(false, err);
				} else {
					ok(!err, 'Load did not produce an error');
				}

				result = coll.find();
				debugger;
				strictEqual(result.length, 1, 'Check that items were loaded correctly');
				strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');

				base.dbDown();

				start();
			});
		});
	});
});