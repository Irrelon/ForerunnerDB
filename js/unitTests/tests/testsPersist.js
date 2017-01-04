"use strict";

QUnit.module('Persist');
ForerunnerDB.moduleLoaded('Persist', function () {
	/*QUnit.asyncTest('Persist.load() :: Check for saved databases', function () {
		expect(1);

		base.dbUp();

		db.collection('test1').insert({"test": true});
		db.collection('test2').insert({"test": true});
		db.collection('test3').insert({"test": true});

		db.load(function (err, tableStats, metaStats) {
			equal(Boolean(err), false, 'Didn\'t cause an error');
			base.dbDown();
			start();
		});
	});*/

	// QUnit.asyncTest('Persist.load() :: Load un-saved collection', function () {
	// 	expect(1);
    //
	// 	base.dbUp();
    //
	// 	try {
	// 		db.collection('random112354234').load(function (err, tableStats, metaStats) {
	// 			equal(Boolean(err), false, 'Didn\'t cause an error');
	// 			base.dbDown();
	// 			start();
	// 		});
	// 	} catch (e) {
	// 		ok(false, 'Caused an error!');
	// 		start();
	// 	}
	// });
    //
	// QUnit.asyncTest('Persist.save() :: Save data to storage and load it back', function () {
	// 	expect(13);
    //
	// 	base.dbUp();
    //
	// 	ok(db.persist.driver(), 'Check that there is a persistent storage driver: ' + db.persist.driver());
    //
	// 	var coll = db.collection('test', {
	// 			changeTimestamp: true
	// 		}),
	// 		result,
	// 		lastChange;
    //
	// 	coll.insert({
	// 		name: 'Test'
	// 	});
    //
	// 	lastChange = coll.metaData().lastChange;
    //
	// 	coll.save(function (err) {
	// 		if (err) {
	// 			console.log(err);
	// 			ok(false, err);
	// 		} else {
	// 			ok(!err, 'Save did not produce an error');
	// 		}
    //
	// 		base.dbDown(false);
	// 		base.dbUp();
    //
	// 		coll = db.collection('test');
    //
	// 		// Make sure the item does not currently exist
	// 		result = coll.find();
	// 		strictEqual(result.length, 0, 'Check that there are currently no items in the collection');
    //
	// 		coll.load(function (err, tableStats, metaStats) {
	// 			if (err) {
	// 				console.log(err);
	// 				ok(false, err);
	// 			} else {
	// 				ok(!err, 'Load did not produce an error');
	// 			}
    //
	// 			result = coll.find();
    //
	// 			strictEqual(result.length, 1, 'Check that items were loaded correctly');
	// 			strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
	// 			strictEqual(coll.metaData().lastChange.toISOString(), lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');
    //
	// 			// Check the stats objects are correct
	// 			strictEqual(typeof tableStats, 'object', 'Table stats is an object');
	// 			strictEqual(typeof metaStats, 'object', 'Meta stats is an object');
	// 			strictEqual(tableStats.foundData, true, 'Table stats found data');
	// 			strictEqual(metaStats.foundData, true, 'Meta stats found data');
	// 			strictEqual(tableStats.rowCount, 1, 'Table stats row count correct');
	// 			strictEqual(metaStats.rowCount, 0, 'Meta stats row count correct');
    //
	// 			base.dbDown();
    //
	// 			start();
	// 		});
	// 	});
	// });

	/*QUnit.asyncTest('Persist.auto(true) :: Save data to storage and load it back in auto-mode', function () {
		expect(7);

		base.dbUp();

		ok(db.persist.driver(), 'Check that there is a persistent storage driver: ' + db.persist.driver());

		var coll = db.collection('test', {
				changeTimestamp: true
			}),
			result,
			lastChange;

		db.persist.auto(true);

		coll.once('save', function (err) {
			if (err) {
				console.log(err);
				ok(false, err);
			} else {
				ok(!err, 'Save did not produce an error');
			}

			base.dbDown(false);
			base.dbUp();

			db.persist.auto(true);

			coll = db.collection('test');

			// Make sure the item does not currently exist
			result = coll.find();
			strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

			coll.once('load', function (err) {
				if (err) {
					console.log(err);
					ok(false, err);
				} else {
					ok(!err, 'Load did not produce an error');
				}

				result = coll.find();

				strictEqual(result.length, 1, 'Check that items were loaded correctly');
				strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
				strictEqual(coll.metaData().lastChange.toISOString(), lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');

				base.dbDown();

				start();
			});
		});

		coll.insert({
			name: 'Test'
		});

		lastChange = coll.metaData().lastChange;
	});*/

	// QUnit.asyncTest('Persist.save() :: Save data to multiple database storage with same collection names', function () {
	// 	expect(18);
    //
	// 	var fdb = new ForerunnerDB(),
	// 		db1 = fdb.db('db1'),
	// 		db2 = fdb.db('db2');
    //
	// 	ok(db1.persist.driver(), 'Check that there is a persistent storage driver db1: ' + db1.persist.driver());
	// 	ok(db2.persist.driver(), 'Check that there is a persistent storage driver db2: ' + db2.persist.driver());
    //
	// 	var coll1 = db1.collection('test'),
	// 		coll2 = db2.collection('test'),
	// 		result;
    //
	// 	coll1.insert({
	// 		name: 'Test1'
	// 	});
    //
	// 	coll2.insert({
	// 		name: 'Test2'
	// 	});
    //
	// 	coll1.save(function (err) {
	// 		if (err) {
	// 			console.log(err);
	// 			ok(false, err);
	// 		} else {
	// 			ok(!err, 'Save did not produce an error');
	// 		}
    //
	// 		coll2.save(function (err) {
	// 			if (err) {
	// 				console.log(err);
	// 				ok(false, err);
	// 			} else {
	// 				ok(!err, 'Save did not produce an error');
	// 			}
    //
	// 			// Drop the databases but don't drop persistent storage
	// 			db1.drop(false);
	// 			db2.drop(false);
    //
	// 			db1 = fdb.db('db1');
	// 			db2 = fdb.db('db2');
    //
	// 			coll1 = db1.collection('test');
	// 			coll2 = db2.collection('test');
    //
	// 			// Make sure the item does not currently exist
	// 			result = coll1.find();
	// 			strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db1');
    //
	// 			result = coll2.find();
	// 			strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db2');
    //
	// 			coll1.load(function (err, tableStats, metaStats) {
	// 				if (err) {
	// 					console.log(err);
	// 					ok(false, err);
	// 				} else {
	// 					ok(!err, 'Load did not produce an error');
	// 				}
    //
	// 				coll2.load(function (err, tableStats, metaStats) {
	// 					if (err) {
	// 						console.log(err);
	// 						ok(false, err);
	// 					} else {
	// 						ok(!err, 'Load did not produce an error');
	// 					}
    //
	// 					result = coll1.find();
    //
	// 					strictEqual(result.length, 1, 'Check that items were loaded correctly');
	// 					strictEqual(result[0] && result[0].name, 'Test1', 'Check that the data loaded holds correct information');
    //
	// 					result = coll2.find();
    //
	// 					strictEqual(result.length, 1, 'Check that items were loaded correctly');
	// 					strictEqual(result[0] && result[0].name, 'Test2', 'Check that the data loaded holds correct information');
    //
	// 					// Fully drop databases including persistent storage
	// 					db1.drop(true, function (err) {
	// 						if (err) {
	// 							console.log(err);
	// 							ok(false, err);
	// 						} else {
	// 							ok(!err, 'Drop did not produce an error');
	// 						}
    //
	// 						db2.drop(true, function (err) {
	// 							if (err) {
	// 								console.log(err);
	// 								ok(false, err);
	// 							} else {
	// 								ok(!err, 'Drop did not produce an error');
	// 							}
    //
	// 							// Now get them again
	// 							db1 = fdb.db('db1');
	// 							db2 = fdb.db('db2');
    //
	// 							coll1 = db1.collection('test');
	// 							coll2 = db2.collection('test');
    //
	// 							// Now load data again and check that it has dropped correctly
	// 							coll1.load(function (err, tableStats, metaStats) {
	// 								if (err) {
	// 									console.log(err);
	// 									ok(false, err);
	// 								} else {
	// 									ok(!err, 'Load did not produce an error');
	// 								}
    //
	// 								coll2.load(function (err, tableStats, metaStats) {
	// 									if (err) {
	// 										console.log(err);
	// 										ok(false, err);
	// 									} else {
	// 										ok(!err, 'Load did not produce an error');
	// 									}
    //
	// 									// Make sure the item does not currently exist
	// 									result = coll1.find();
	// 									strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db1');
    //
	// 									result = coll2.find();
	// 									strictEqual(result.length, 0, 'Check that there are currently no items in the test collection for db2');
    //
	// 									start();
	// 								});
	// 							});
	// 						});
	// 					});
    //
	// 					//start();
	// 				});
	// 			});
	// 		});
	// 	});
	// });
    //
	// QUnit.asyncTest('Persist.save() :: Select and use plugins', function () {
	// 	expect(5);
	// 	base.dbUp();
    //
	// 	var coll = db.collection('test', {
	// 			changeTimestamp: true
	// 		}),
	// 		result;
    //
	// 	db.persist.addStep(new db.shared.plugins.FdbCompress());
	// 	db.persist.addStep(new db.shared.plugins.FdbCrypto({
	// 		pass: 'testing'
	// 	}));
    //
	// 	coll.insert({
	// 		name: 'Test'
	// 	});
    //
	// 	coll.save(function (err) {
	// 		if (err) {
	// 			console.log(err);
	// 			ok(false, err);
	// 		} else {
	// 			ok(!err, 'Save did not produce an error');
	// 		}
    //
	// 		base.dbDown(false);
	// 		base.dbUp();
    //
	// 		db.persist.addStep(new db.shared.plugins.FdbCompress());
	// 		db.persist.addStep(new db.shared.plugins.FdbCrypto({
	// 			pass: 'testing'
	// 		}));
    //
	// 		coll = db.collection('test');
    //
	// 		// Make sure the item does not currently exist
	// 		result = coll.find();
	// 		strictEqual(result.length, 0, 'Check that there are currently no items in the collection');
    //
	// 		coll.load(function (err, tableStats, metaStats) {
	// 			if (err) {
	// 				console.log(err);
	// 				ok(false, err);
	// 			} else {
	// 				ok(!err, 'Load did not produce an error');
	// 			}
    //
	// 			result = coll.find();
    //
	// 			strictEqual(result.length, 1, 'Check that items were loaded correctly');
	// 			strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
    //
	// 			base.dbDown(false);
    //
	// 			start();
	// 		});
	// 	});
	// });
    //
	// QUnit.asyncTest('Persist.save() :: Save large amount of data and ensure load callback is called AFTER it has all been inserted', function () {
	// 	expect(7);
    //
	// 	var fdb = new ForerunnerDB(),
	// 		db = fdb.db('db1'),
	// 		items = db.collection('project'),
	// 		tmpData = [],
	// 		numRecords,
	// 		data,
	// 		i;
    //
	// 	numRecords = 25000;
    //
	// 	for (i = 0; i < numRecords; i++) {
	// 		data = {
	// 			_id: i,
	// 			data: 'data ' + i
	// 		};
    //
	// 		tmpData.push(data);
	// 	}
    //
	// 	items.insert(tmpData, function (result) {
	// 		strictEqual(result.inserted.length === numRecords, true, 'Inserted correct number of rows');
	// 		strictEqual(result.failed.length === 0, true, 'No inserted rows failed');
	// 		strictEqual(items.count(), numRecords, 'The collection contains the correct number of rows after insert');
    //
	// 		items.save(function (err, data) {
	// 			strictEqual(Boolean(err), false, 'The save operation did not result in error');
    //
	// 			// Drop the database from memory without dropping persistent storage (pass false)
	// 			db.drop(false);
    //
	// 			// Now get new database reference
	// 			db = fdb.db('db1');
    //
	// 			// Get new collection reference
	// 			items = db.collection('project');
    //
	// 			items.load(function (err, tableStats, metaStats) {
	// 				strictEqual(Boolean(err), false, 'The load operation did not produce an error');
	// 				strictEqual(tableStats.rowCount > 0, true, 'Loaded data contains rows');
	// 				strictEqual(items.count(), numRecords, 'Loaded data contains the correct number of rows');
    //
	// 				// Now drop the whole database, removing all persistent storage as well
	// 				db.drop(true);
	// 				start();
	// 			});
	// 		});
	// 	});
	// });
    //
	// QUnit.asyncTest('Persist.save() :: Save with empty collection then load back empty collection check that callbacks fire', function () {
	// 	expect(7);
    //
	// 	var fdb = new ForerunnerDB(),
	// 		db = fdb.db('db1'),
	// 		items = db.collection('project'),
	// 		tmpData = [],
	// 		numRecords,
	// 		data,
	// 		i;
    //
	// 	numRecords = 0;
    //
	// 	for (i = 0; i < numRecords; i++) {
	// 		data = {
	// 			_id: i,
	// 			data: 'data ' + i
	// 		};
    //
	// 		tmpData.push(data);
	// 	}
    //
	// 	items.insert(tmpData, function (result) {
	// 		strictEqual(result.inserted.length === numRecords, true, 'Inserted correct number of rows');
	// 		strictEqual(result.failed.length === 0, true, 'No inserted rows failed');
	// 		strictEqual(items.count(), numRecords, 'The collection contains the correct number of rows after insert');
    //
	// 		items.save(function (err, data) {
	// 			strictEqual(Boolean(err), false, 'The save operation did not result in error');
    //
	// 			// Drop the database from memory without dropping persistent storage (pass false)
	// 			db.drop(false);
    //
	// 			// Now get new database reference
	// 			db = fdb.db('db1');
    //
	// 			// Get new collection reference
	// 			items = db.collection('project');
    //
	// 			items.load(function (err, tableStats, metaStats) {
	// 				strictEqual(Boolean(err), false, 'The load operation did not produce an error');
	// 				strictEqual(tableStats.rowCount === 0, true, 'Loaded data contains zero rows');
	// 				strictEqual(items.count(), numRecords, 'Loaded data contains the correct number of rows');
    //
	// 				// Now drop the whole database, removing all persistent storage as well
	// 				db.drop(true);
	// 				start();
	// 			});
	// 		});
	// 	});
	// });
	//
	// QUnit.asyncTest('Persist.save() :: Handle crypto incorrect password', function () {
	// 	expect(3);
	// 	base.dbUp();
	//
	// 	var coll = db.collection('testPersistCrypto', {
	// 			changeTimestamp: true
	// 		}),
	// 		result;
	//
	// 	console.log('Adding crypto step for save');
	// 	db.persist.addStep(new db.shared.plugins.FdbCrypto({
	// 		pass: 'testing'
	// 	}));
	//
	// 	console.log('Inserting data');
	// 	coll.insert({
	// 		name: 'Test'
	// 	});
	//
	// 	console.log('Saving data');
	// 	coll.save(function (err) {
	// 		if (err) {
	// 			console.log(err);
	// 			ok(false, err);
	// 		} else {
	// 			ok(!err, 'Save did not produce an error');
	// 		}
	//
	// 		console.log('Dropping db');
	// 		base.dbDown(false);
	// 		base.dbUp();
	//
	// 		setTimeout(function () {
	// 			console.log('Adding crypto step for load');
	// 			db.persist.addStep(new db.shared.plugins.FdbCrypto({
	// 				pass: 'aaa'
	// 			}));
	//
	// 			coll = db.collection('testPersistCrypto');
	//
	// 			// Make sure the item does not currently exist
	// 			console.log('Checking for no data');
	// 			result = coll.find();
	// 			strictEqual(result.length, 0, 'Check that there are currently no items in the collection');
	//
	// 			console.log('Loading data');
	// 			coll.load(function (err, tableStats, metaStats) {
	// 				ok(err, 'Load produced an error as expected: ' + err);
	//
	// 				base.dbDown();
	//
	// 				console.log('Test complete');
	// 				start();
	// 			});
	// 		}, 1);
	// 	});
	// });
	//
	// QUnit.asyncTest('Persist.save() :: Change password after initial save', function () {
	// 	expect(12);
	// 	base.dbUp();
	//
	// 	var coll = db.collection('testPersistCrypto', {
	// 			changeTimestamp: true
	// 		}),
	// 		result,
	// 		testObj,
	// 		crypto;
	//
	// 	testObj = {
	// 		name: 'Test'
	// 	};
	//
	// 	crypto = new db.shared.plugins.FdbCrypto({
	// 		pass: 'testing'
	// 	});
	//
	// 	console.log('Adding crypto step for save');
	// 	db.persist.addStep(crypto);
	//
	// 	console.log('Inserting data');
	// 	coll.insert(testObj);
	//
	// 	console.log('Saving data');
	// 	coll.save(function (err) {
	// 		if (err) {
	// 			console.log(err);
	// 			ok(false, err);
	// 		} else {
	// 			ok(!err, 'Save did not produce an error');
	// 		}
	//
	// 		console.log('Dropping db');
	// 		base.dbDown(false);
	// 		base.dbUp();
	//
	// 		db.persist.addStep(crypto);
	//
	// 		coll = db.collection('testPersistCrypto');
	//
	// 		ok(coll.count() === 0, 'Collection is currently empty after drop');
	//
	// 		console.log('Loading data');
	// 		coll.load(function (err, tableStats, metaStats) {
	// 			ok(!err, 'Loaded data without error');
	//
	// 			result = coll.find();
	//
	// 			ok(result, 'Result exists');
	// 			ok(result[0], 'Result index zero exists');
	// 			ok(result[0].name === testObj.name, 'Data is the same and loaded correctly');
	//
	// 			// Now change the password
	// 			crypto.pass('myNewPassword');
	//
	// 			coll.save(function (err) {
	// 				if (err) {
	// 					console.log(err);
	// 					ok(false, err);
	// 				} else {
	// 					ok(!err, 'Save did not produce an error');
	// 				}
	//
	// 				base.dbDown(false);
	// 				base.dbUp();
	//
	// 				db.persist.addStep(crypto);
	//
	// 				coll = db.collection('testPersistCrypto');
	//
	// 				ok(coll.count() === 0, 'Collection is currently empty after drop');
	//
	// 				console.log('Loading data');
	// 				coll.load(function (err, tableStats, metaStats) {
	// 					ok(!err, 'Loaded data without error');
	//
	// 					result = coll.find();
	//
	// 					ok(result, 'Result exists');
	// 					ok(result[0], 'Result index zero exists');
	// 					ok(result[0].name === testObj.name, 'Data is the same and loaded correctly');
	//
	// 					base.dbDown();
	//
	// 					console.log('Test complete');
	// 					start();
	// 				});
	// 			});
	// 		});
	// 	});
	// });

    // QUnit.asyncTest('Persist.persistedSize() :: collection: save random amount (< 5MB) of data into a collection and expect exactly that size (+ persistence overhead) reported', function () {
    //     expect(3);
    //
    //     base.dbUp();
    //
    //     var collName = "testCollPersistedSize";
    //
    //     // insert record with >0 <5MB content
    //     var bytes = Math.floor((Math.random() * 4900000) + 1);
    //     var char = "a";
    //
    //     // phantomjs doesn't know String.repeat(x)...
    //     var content = "";
    //     for (var i = 0; i < bytes; i++) {
    //         content += char;
    //     }
    //
    //     // insert random sized content
    //     var doc = {_id: content};
    //     var coll = db.collection(collName);
    //     coll.insert(doc);
    //
    //     // also db- and collection-prefixes count toward expected byte size of storage object
    //     // for simplicity's sake, UTF8 names are expected here so .length can be used
    //     var _dbPrefix = db._name + "-" + coll._name;
    //     // also content-prefix of actual stored data count toward expected size of storage object
    //     // shady as of now, but localforage's API doesn't provide getting the "raw storage format wrap" at runtime
    //     var _contentWrap = "json::fdb::[" + "]";
    //     var _metaDataWrap = "json::fdb::{}";
    //
    //     // total bytes to expect in persistence
    //     var expectedSize = _dbPrefix.length + _contentWrap.length
    //         + (_dbPrefix + "-metaData").length + _metaDataWrap.length
    //         + JSON.stringify(doc).length;
    //
    //     /**
    //      * named helper func as callback to coll.save
    //      *
    //      * @private
    //      */
    //     function _size() {
    //         var coll = db.collection(collName);
    //         // make sure collection isn't loaded at runtime
    //         // we want to check the persisted object
    //         // not the runtime object
    //         var result = coll.find();
    //         strictEqual(result.length, 0, 'Check that there are currently no items in the collection');
    //
    //         // center piece
    //         coll.persistedSize(function (err, persistedSize) {
    //             if (err) {
    //                 console.log(err);
    //                 ok(false, err);
    //             } else {
    //                 strictEqual(persistedSize, expectedSize, persistedSize + ' bytes were reported correctly');
    //             }
    //
    //             // old QUnit version...
    //             start();
    // 			   // clean up
    //             base.dbDown(true);
    //         });
    //
    //
    //
    //         // actual centerpiece of test
    //         // coll.persistedSize()
    //         // .then( function(persistedSize) {
    //         // 	strictEqual(persistedSize, bytes, persistedSize + ' bytes were reported correctly');
    //         // })
    //         // .catch( function(err) {
    //         // 	if (err) {
    //         //             console.log(err);
    //         //             ok(false, err);
    //         //         }
    //         // });
    //     }
    //
    //     // init the test with persisting content
    //     coll.save(function (err) {
    //         if (err) {
    //             console.log(err);
    //             ok(false, err);
    //         } else {
    //             ok(!err, 'Save did not produce an error');
    //         }
    //
    //         // start from scratch again
    //         base.dbDown(false);
    //         base.dbUp();
    //
    //         _size();
    //     })
    //
    //
    // });

    QUnit.asyncTest('Persist.persistedSize() :: DB: save random amount (< 5MB) of data into a random number of collections and expect total + persistence overhead reported', function () {
        var dbName = new Date().toJSON();
    	var db = fdb.db(dbName);

        var expectedSize = 0;

        var collectionTemplate = "coll-";

        // >0 <4.5MB content - to leave room for persistence adminstrative data overhead
        var bytes = Math.floor((Math.random() * 4500000) + 1);
        // split up into unequal parts
        var aCollections = [];
        while (bytes > 0) {
            var byteChunk = Math.round(Math.random() * bytes);
            aCollections.push(byteChunk);
            bytes -= byteChunk;
        }
        console.info("Test.persistedSize: chunks: " + aCollections);

        var aChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

        // promisify save
        function asyncSave(oCollection) {
            return new Promise(function (resolve, reject) {
                oCollection.save(function (err) {
                    if (!err) {
                        resolve();
                    } else {
                        reject(err);
                    }
                })
            })
        }
        // promisify insert
        function asyncInsert(oCollection, oContent) {
            return new Promise(function (resolve, reject) {
                oCollection.insert(oContent, function (result) {
                    if (result.failed.length === 0) {
                        resolve(oCollection);
                    } else {
                        reject(result.failed);
                    }
                })
            })
        }
		// promisify drop
		function asyncDrop(oObject, bDropPersistent) {
            return new Promise(function (resolve, reject) {
                oObject.drop(bDropPersistent, function (err) {
                    if (!err) {
                        resolve();
                    } else {
                        reject(err);
                    }
                })
            })
        }

        function asyncFind(oCollection, query) {
            return new Promise(function (resolve, reject) {
                if (query) {
                    resolve(oCollection.find(query));
                } else {
                    resolve(oCollection.find());
                }

            })
		}

		function asyncSizeCheck(oDB) {
            return new Promise(function (resolve, reject) {
                oDB.persistedSize(function (err, persistedSize) {
                    if (!err) {
                        resolve(persistedSize);
                    } else {
                        reject(err);
                    }
                })
            })
		}


        Promise.resolve().then(function() {
        	return Promise.all(aCollections.map( function(byteChunk, index) {
                // create a collection for each byte chunk
                var coll = db.collection(collectionTemplate + index);

                // phantomjs doesn't know String.repeat(x)...
                var content = "";
                // insert incremented char from chars array
                for (var i = 0; i < byteChunk; i++) {
                    content += aChars[index];
                }
                var doc = { _id: index, data: content };


                // count 'em all
                // db- and collection-prefixes count toward expected byte size of storage object
                // for simplicity's sake, UTF8 names are expected here so .length can be used
                var _dbPrefix = db._name + "-" + coll._name;
                // also content-prefix of actual stored data count toward expected size of storage object
                // shady as of now, but localforage's API doesn't provide getting the "raw storage format wrap" at runtime
                var _contentWrap = "json::fdb::[]";
                var _dbSize = _dbPrefix.length + _contentWrap.length + JSON.stringify(doc).length;
                console.log("Test.persistedSize: " + _dbPrefix + " length: " + _dbSize);

                var _metaDataPrefix = db._name + "-" + coll._name + "-metaData";
                var _metaDataWrap = "json::fdb::{}";
                var _dbMetaSize = _metaDataPrefix.length + _metaDataWrap.length;
                console.log("Test.persistedSize: " + _metaDataPrefix + " length: " + _dbMetaSize);


                expectedSize += _dbSize + _dbMetaSize;

                console.log("...inserting " + JSON.stringify(doc).length + " bytes into " + coll._name);

                return asyncInsert(coll, doc);
			}))
		}).then(function(aResults) {
			return Promise.all(aResults.map( function(coll, index) {
				console.log("...persisting collection#" + index);
				return asyncSave(coll);
			}))
		}).then(function() {
            console.log("...dropping db");
			return asyncDrop(db, false);
		}).then(function() {
            console.log("...recreating db");
        	return fdb.db(dbName);
    	}).then(function(dbNew) {
    		db = dbNew;
            return Promise.all(aCollections.map( function(byteChunk, index) {
                // create a collection for each byte chunk
                var coll = db.collection(collectionTemplate + index);
                console.log("...recreating " + collectionTemplate + index);
                // make sure its empty
                return asyncFind(coll, '');
            }))
        }).then( function(aResults) {
        	aResults.map(function(result, index) {
        	    console.log("...validating empty collection#" + index + ": result: " + result.length);
                strictEqual(result.length, 0, 'Check that there are currently no items in the collection#' + index);
			});
        	return true;
		}).then( function() {
			return asyncSizeCheck(db);
        }).then( function(persistedSize) {
            console.log("...counted " + persistedSize + " bytes");
            return strictEqual(persistedSize, expectedSize, persistedSize + ' bytes were reported correctly');
        }).catch(console.log.bind(console));
        //        .catch(function (err) {
        //     ok(false, err);
        //     console.log(err);
        // });




    });


	// meeeeeeh
	// QUnit.asyncTest('Persist.persistedSize() :: DB: save random amount (< 5MB) of data into a random number of collections and expect total + persistence overhead reported', function () {
     //    var dbName = new Date().toJSON();
    	// var db = fdb.db(dbName);
    //
     //    var expectedSize = 0;
    //
     //    var collectionTemplate = "coll-";
    //
     //    // >0 <4.5MB content - to leave room for persistence adminstrative data overhead
     //    var bytes = Math.floor((Math.random() * 4500000) + 1);
     //    // split up into unequal parts
     //    var aCollections = [];
     //    while (bytes > 0) {
     //        var byteChunk = Math.round(Math.random() * bytes);
     //        aCollections.push(byteChunk);
     //        bytes -= byteChunk;
     //    }
     //    console.info("Test.persistedSize: chunks: " + aCollections);
    //
     //    var aChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
     //
     //    // Promise.all(
     //    	// aCollections.map(function(byteChunk, index) {
     //    	// 	return Promise.resolve( function() {
     //    	// 		return
	// 	// 		})
	// 	// 	})
	// 	// );
     //    aCollections.forEach(function(byteChunk, index, array) {
     //        // create a collection for each byte chunk
     //        var coll = db.collection(collectionTemplate + index);
     //        // make sure we're synchronous here in order not to produce unwanted size effect
     //        coll.deferredCalls(false);
     //        coll._noEmitDefer = true;
    //
     //        // phantomjs doesn't know String.repeat(x)...
     //        var content = "";
     //        // insert incremented char from chars array
     //        for (var i = 0; i < byteChunk; i++) {
     //            content += aChars[index];
     //        }
     //        var doc = {_id: content};
    //
     //        coll.insert(doc);
    //
     //        /*****/
    //
     //        // count 'em all
     //        // db- and collection-prefixes count toward expected byte size of storage object
     //        // for simplicity's sake, UTF8 names are expected here so .length can be used
     //        var _dbPrefix = db._name + "-" + coll._name;
     //        // also content-prefix of actual stored data count toward expected size of storage object
     //        // shady as of now, but localforage's API doesn't provide getting the "raw storage format wrap" at runtime
     //        var _contentWrap = "json::fdb::[]";
     //        var _dbSize = _dbPrefix.length + _contentWrap.length + JSON.stringify(doc).length;
     //        console.log("Test.persistedSize: " + _dbPrefix + " length: " + _dbSize);
    //
     //        var _metaDataPrefix = db._name + "-" + coll._name + "-metaData";
     //        var _metaDataWrap = "json::fdb::{}";
     //        var _dbMetaSize = _metaDataPrefix.length + _metaDataWrap.length;
     //        console.log("Test.persistedSize: " + _metaDataPrefix + " length: " + _dbMetaSize);
    //
    //
     //        expectedSize += _dbSize + _dbMetaSize;
    //
    //
    //
     //        /*****/
     //        // persist things
     //        coll.save();
     //        console.log("Test.persistedSize: saved " + _dbPrefix);
    //
     //        // after last persist operation, do the actual test
     //        if (index === array.length - 1) {
    //
     //            console.log("Test.persistedSize: now proceeding...")
     //            // start from scratch again
     //            db.drop();
     //            db = fdb.db(dbName);
    //
     //            // get back the collections
	// 			aCollections.forEach(function(coll1, index) {
     //                var coll = db.collection(collectionTemplate + index);
     //                // make sure its empty
     //                var result = coll.find();
	// 				strictEqual(result.length, 0, 'Check that there are currently no items in the collection ' + coll._name);
	// 			});
    //
     //            // center piece
     //            db.persistedSize(function (err, persistedSize) {
     //                if (err) {
     //                    console.log(err);
     //                    ok(false, err);
     //                } else {
     //                    strictEqual(persistedSize, expectedSize, persistedSize + ' bytes were reported correctly');
     //                }
    //
	// 				//db.drop(true);
    //
     //                // old QUnit version...
     //                start();
    //
    //
     //            });
    //
    //
	// 		}
     //    });
    //
    //
    //
    // })

});