QUnit.module('Persist');
ForerunnerDB.moduleLoaded('Persist', function () {
	QUnit.asyncTest('Collection.save() :: Save data to storage and load it back', function () {
		expect(7);

		base.dbUp();

		ok(db.persist.driver(), 'Check that there is a persistent storage driver: ' + db.persist.driver());

		var coll = db.collection('test', {
				changeTimestamp: true
			}),
			result,
			lastChange;

		coll.insert({
			name: 'Test'
		});

		lastChange = coll.metaData().lastChange;

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

				strictEqual(result.length, 1, 'Check that items were loaded correctly');
				strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
				strictEqual(coll.metaData().lastChange, lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');

				base.dbDown();

				start();
			});
		});
	});

	QUnit.asyncTest('Collection.save() :: Save data to multiple database storage with same collection names', function () {
		expect(12);

		var fdb = new ForerunnerDB(),
			db1 = fdb.db('db1'),
			db2 = fdb.db('db2');

		ok(db1.persist.driver(), 'Check that there is a persistent storage driver db1: ' + db1.persist.driver());
		ok(db2.persist.driver(), 'Check that there is a persistent storage driver db2: ' + db2.persist.driver());

		var coll1 = db1.collection('test'),
			coll2 = db2.collection('test'),
			result;

		coll1.insert({
			name: 'Test1'
		});

		coll2.insert({
			name: 'Test2'
		});

		coll1.save(function (err) {
			if (err) {
				console.log(err);
				ok(false, err);
			} else {
				ok(!err, 'Save did not produce an error');
			}

			coll2.save(function (err) {
				if (err) {
					console.log(err);
					ok(false, err);
				} else {
					ok(!err, 'Save did not produce an error');
				}

				db1.drop(false);
				db2.drop(false);

				db1 = fdb.db('db1');
				db2 = fdb.db('db2');

				coll1 = db1.collection('test');
				coll2 = db2.collection('test');

				// Make sure the item does not currently exist
				result = coll1.find();
				strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db1');

				result = coll2.find();
				strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db2');

				coll1.load(function (err) {
					if (err) {
						console.log(err);
						ok(false, err);
					} else {
						ok(!err, 'Load did not produce an error');
					}

					coll2.load(function (err) {
						if (err) {
							console.log(err);
							ok(false, err);
						} else {
							ok(!err, 'Load did not produce an error');
						}

						result = coll1.find();

						strictEqual(result.length, 1, 'Check that items were loaded correctly');
						strictEqual(result[0] && result[0].name, 'Test1', 'Check that the data loaded holds correct information');

						result = coll2.find();

						strictEqual(result.length, 1, 'Check that items were loaded correctly');
						strictEqual(result[0] && result[0].name, 'Test2', 'Check that the data loaded holds correct information');

						// Fully drop databases
						/*db1.drop(true, function (err) {
							if (err) {
								console.log(err);
								ok(false, err);
							} else {
								ok(!err, 'Drop did not produce an error');
							}

							db2.drop(true, function (err) {
								if (err) {
									console.log(err);
									ok(false, err);
								} else {
									ok(!err, 'Drop did not produce an error');
								}

								// Now get them again
								db1 = fdb.db('db1');
								db2 = fdb.db('db2');

								coll1 = db1.collection('test');
								coll2 = db2.collection('test');

								// Now load data again and check that it has dropped correctly
								coll1.load(function (err) {
									if (err) {
										console.log(err);
										ok(false, err);
									} else {
										ok(!err, 'Load did not produce an error');
									}

									coll2.load(function (err) {
										if (err) {
											console.log(err);
											ok(false, err);
										} else {
											ok(!err, 'Load did not produce an error');
										}

										// Make sure the item does not currently exist
										result = coll1.find();
										strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db1');

										result = coll2.find();
										strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db2');

										start();
									});
								});
							});
						});*/

						start();
					});
				});
			});
		});
	});
});