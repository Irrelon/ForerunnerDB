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
	
	QUnit.asyncTest('Persist.load() :: Load un-saved collection', function () {
		expect(1);
		
		base.dbUp();
		
		try {
			db.collection('random112354234').load(function (err, tableStats, metaStats) {
				equal(Boolean(err), false, 'Didn\'t cause an error');
				base.dbDown();
				start();
			});
		} catch (e) {
			ok(false, 'Caused an error!');
			start();
		}
	});
	
	QUnit.asyncTest('Persist.save() :: Save data to storage and load it back', function () {
		expect(13);
		
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
			
			coll.load(function (err, tableStats, metaStats) {
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
				
				// Check the stats objects are correct
				strictEqual(typeof tableStats, 'object', 'Table stats is an object');
				strictEqual(typeof metaStats, 'object', 'Meta stats is an object');
				strictEqual(tableStats.foundData, true, 'Table stats found data');
				strictEqual(metaStats.foundData, true, 'Meta stats found data');
				strictEqual(tableStats.rowCount, 1, 'Table stats row count correct');
				strictEqual(metaStats.rowCount, 0, 'Meta stats row count correct');
				
				base.dbDown();
				
				start();
			});
		});
	});
	
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
	
	QUnit.asyncTest('Persist.save() :: Save data to multiple database storage with same collection names', function () {
		expect(18);
		
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
				
				// Drop the databases but don't drop persistent storage
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
				
				coll1.load(function (err, tableStats, metaStats) {
					if (err) {
						console.log(err);
						ok(false, err);
					} else {
						ok(!err, 'Load did not produce an error');
					}
					
					coll2.load(function (err, tableStats, metaStats) {
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
						
						// Fully drop databases including persistent storage
						db1.drop(true, function (err) {
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
								coll1.load(function (err, tableStats, metaStats) {
									if (err) {
										console.log(err);
										ok(false, err);
									} else {
										ok(!err, 'Load did not produce an error');
									}
									
									coll2.load(function (err, tableStats, metaStats) {
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
						});
						
						//start();
					});
				});
			});
		});
	});
	
	QUnit.asyncTest('Persist.save() :: Select and use plugins', function () {
		expect(5);
		base.dbUp();
		
		var coll = db.collection('test', {
				changeTimestamp: true
			}),
			result;
		
		db.persist.addStep(new db.shared.plugins.FdbCompress());
		db.persist.addStep(new db.shared.plugins.FdbCrypto({
			pass: 'testing'
		}));
		
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
			
			db.persist.addStep(new db.shared.plugins.FdbCompress());
			db.persist.addStep(new db.shared.plugins.FdbCrypto({
				pass: 'testing'
			}));
			
			coll = db.collection('test');
			
			// Make sure the item does not currently exist
			result = coll.find();
			strictEqual(result.length, 0, 'Check that there are currently no items in the collection');
			
			coll.load(function (err, tableStats, metaStats) {
				if (err) {
					console.log(err);
					ok(false, err);
				} else {
					ok(!err, 'Load did not produce an error');
				}
				
				result = coll.find();
				
				strictEqual(result.length, 1, 'Check that items were loaded correctly');
				strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
				
				base.dbDown();
				
				start();
			});
		});
	});
	
	QUnit.asyncTest('Persist.save() :: Save large amount of data and ensure load callback is called AFTER it has all been inserted', function () {
		expect(7);
		
		var fdb = new ForerunnerDB(),
			db = fdb.db('db1'),
			items = db.collection('project'),
			tmpData = [],
			numRecords,
			data,
			i;
		
		numRecords = 25000;
		
		for (i = 0; i < numRecords; i++) {
			data = {
				_id: i,
				data: 'data ' + i
			};
			
			tmpData.push(data);
		}
		
		items.insert(tmpData, function (result) {
			strictEqual(result.inserted.length === numRecords, true, 'Inserted correct number of rows');
			strictEqual(result.failed.length === 0, true, 'No inserted rows failed');
			strictEqual(items.count(), numRecords, 'The collection contains the correct number of rows after insert');
			
			items.save(function (err, data) {
				strictEqual(Boolean(err), false, 'The save operation did not result in error');
				
				// Drop the database from memory without dropping persistent storage (pass false)
				db.drop(false);
				
				// Now get new database reference
				db = fdb.db('db1');
				
				// Get new collection reference
				items = db.collection('project');
				
				items.load(function (err, tableStats, metaStats) {
					strictEqual(Boolean(err), false, 'The load operation did not produce an error');
					strictEqual(tableStats.rowCount > 0, true, 'Loaded data contains rows');
					strictEqual(items.count(), numRecords, 'Loaded data contains the correct number of rows');
					
					// Now drop the whole database, removing all persistent storage as well
					db.drop(true);
					start();
				});
			});
		});
	});
	
	QUnit.asyncTest('Persist.save() :: Save with empty collection then load back empty collection check that callbacks fire', function () {
		expect(7);
		
		var fdb = new ForerunnerDB(),
			db = fdb.db('db1'),
			items = db.collection('project'),
			tmpData = [],
			numRecords,
			data,
			i;
		
		numRecords = 0;
		
		for (i = 0; i < numRecords; i++) {
			data = {
				_id: i,
				data: 'data ' + i
			};
			
			tmpData.push(data);
		}
		
		items.insert(tmpData, function (result) {
			strictEqual(result.inserted.length === numRecords, true, 'Inserted correct number of rows');
			strictEqual(result.failed.length === 0, true, 'No inserted rows failed');
			strictEqual(items.count(), numRecords, 'The collection contains the correct number of rows after insert');
			
			items.save(function (err, data) {
				strictEqual(Boolean(err), false, 'The save operation did not result in error');
				
				// Drop the database from memory without dropping persistent storage (pass false)
				db.drop(false);
				
				// Now get new database reference
				db = fdb.db('db1');
				
				// Get new collection reference
				items = db.collection('project');
				
				items.load(function (err, tableStats, metaStats) {
					strictEqual(Boolean(err), false, 'The load operation did not produce an error');
					strictEqual(tableStats.rowCount === 0, true, 'Loaded data contains zero rows');
					strictEqual(items.count(), numRecords, 'Loaded data contains the correct number of rows');
					
					// Now drop the whole database, removing all persistent storage as well
					db.drop(true);
					start();
				});
			});
		});
	});
	
	QUnit.asyncTest('Persist.save() :: Handle crypto incorrect password', function () {
		expect(3);
		base.dbUp();
		
		var coll = db.collection('testPersistCrypto', {
				changeTimestamp: true
			}),
			result;
		
		console.log('Adding crypto step for save');
		db.persist.addStep(new db.shared.plugins.FdbCrypto({
			pass: 'testing'
		}));
		
		console.log('Inserting data');
		coll.insert({
			name: 'Test'
		});
		
		console.log('Saving data');
		coll.save(function (err) {
			if (err) {
				console.log(err);
				ok(false, err);
			} else {
				ok(!err, 'Save did not produce an error');
			}
			
			console.log('Dropping db');
			base.dbDown(false);
			base.dbUp();
			
			setTimeout(function () {
				console.log('Adding crypto step for load');
				db.persist.addStep(new db.shared.plugins.FdbCrypto({
					pass: 'aaa'
				}));
				
				coll = db.collection('testPersistCrypto');
				
				// Make sure the item does not currently exist
				console.log('Checking for no data');
				result = coll.find();
				strictEqual(result.length, 0, 'Check that there are currently no items in the collection');
				
				console.log('Loading data');
				coll.load(function (err, tableStats, metaStats) {
					ok(err, 'Load produced an error as expected: ' + err);
					
					base.dbDown();
					
					console.log('Test complete');
					start();
				});
			}, 1);
		});
	});
	
	QUnit.asyncTest('Persist.save() :: Change password after initial save', function () {
		expect(12);
		base.dbUp();
		
		var coll = db.collection('testPersistCrypto', {
				changeTimestamp: true
			}),
			result,
			testObj,
			crypto;
		
		testObj = {
			name: 'Test'
		};
		
		crypto = new db.shared.plugins.FdbCrypto({
			pass: 'testing'
		});
		
		console.log('Adding crypto step for save');
		db.persist.addStep(crypto);
		
		console.log('Inserting data');
		coll.insert(testObj);
		
		console.log('Saving data');
		coll.save(function (err) {
			if (err) {
				console.log(err);
				ok(false, err);
			} else {
				ok(!err, 'Save did not produce an error');
			}
			
			console.log('Dropping db');
			base.dbDown(false);
			base.dbUp();
			
			db.persist.addStep(crypto);
			
			coll = db.collection('testPersistCrypto');
			
			ok(coll.count() === 0, 'Collection is currently empty after drop');
			
			console.log('Loading data');
			coll.load(function (err, tableStats, metaStats) {
				ok(!err, 'Loaded data without error');
				
				result = coll.find();
				
				ok(result, 'Result exists');
				ok(result[0], 'Result index zero exists');
				ok(result[0].name === testObj.name, 'Data is the same and loaded correctly');
				
				// Now change the password
				crypto.pass('myNewPassword');
				
				coll.save(function (err) {
					if (err) {
						console.log(err);
						ok(false, err);
					} else {
						ok(!err, 'Save did not produce an error');
					}
					
					base.dbDown(false);
					base.dbUp();
					
					db.persist.addStep(crypto);
					
					coll = db.collection('testPersistCrypto');
					
					ok(coll.count() === 0, 'Collection is currently empty after drop');
					
					console.log('Loading data');
					coll.load(function (err, tableStats, metaStats) {
						ok(!err, 'Loaded data without error');
						
						result = coll.find();
						
						ok(result, 'Result exists');
						ok(result[0], 'Result index zero exists');
						ok(result[0].name === testObj.name, 'Data is the same and loaded correctly');
						
						base.dbDown();
						
						console.log('Test complete');
						start();
					});
				});
			});
		});
	});
	
	// promisify save
	function asyncSave (oCollection) {
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
	function asyncInsert (oCollection, oContent) {
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
	function asyncDrop (oObject, bDropPersistent) {
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
	
	// promisify find
	function asyncFind (oCollection, query) {
		return new Promise(function (resolve, reject) {
			if (query) {
				resolve(oCollection.find(query));
			} else {
				resolve(oCollection.find());
			}
			
		})
	}
	
	// promisify size check
	function asyncSizeCheck (oDbColl) {
		return new Promise(function (resolve, reject) {
			oDbColl.persistedSize(function (err, resultMap) {
				if (!err) {
					resolve(resultMap);
				} else {
					reject(err);
				}
			})
		})
	}
	
	QUnit.asyncTest('Persist.persistedSize() :: collection: save random amount (< 1MB) of data into a collection and expect exactly that size (+ persistence overhead) reported', function () {
		// prepare things
		var dbName = new Date().toJSON();
		var db = fdb.db(dbName);
		
		var expectedSize = 0;
		var collName = "testCollPersistedSize";
		
		var bytes = Math.floor((Math.random() * 1000000) + 1);
		var char = "a";
		
		// phantomjs doesn't know String.repeat(x)...
		var content = "";
		for (var i = 0; i < bytes; i++) {
			content += char;
		}
		
		var doc = {_id: content};
		var coll = db.collection(collName);
		
		Promise.resolve().then(function () {
			// calc expected size
			// also db- and collection-prefixes count toward expected byte size of storage object
			// for simplicity's sake, UTF8 names are expected here so .length can be used
			var _dbPrefix = db._name + "-" + coll._name;
			// also content-prefix of actual stored data count toward expected size of storage object
			// shady as of now, but localforage's API doesn't provide getting the "raw storage format wrap" at runtime
			var _contentWrap = "json::fdb::[" + "]";
			var _metaDataWrap = "json::fdb::{}";
			
			// total bytes to expect in persistence
			expectedSize = _dbPrefix.length + _contentWrap.length
				+ (_dbPrefix + "-metaData").length + _metaDataWrap.length
				+ JSON.stringify(doc).length;
			
			// insert content into collection
			return asyncInsert(coll, doc);
		}).then(function (coll) {
			// persist collection
			return asyncSave(coll);
		}).then(function () {
			// drop DB from mem, but not from persistence
			console.log("...dropping db");
			return asyncDrop(db, false);
		}).then(function () {
			// re-create DB in mem
			console.log("...recreating db");
			return fdb.db(dbName);
		}).then(function (dbNew) {
			// re-create collection
			db = dbNew;
			coll = db.collection(collName);
			console.log("...recreating collection");
			// make sure its empty - the persisted version is of interest, not the runtime version
			return asyncFind(coll);
		}).then(function (result) {
			console.log("...validating empty collection: result: " + result.length);
			strictEqual(result.length, 0, 'Check that there are currently no items in the collection');
			return true;
		}).then(function () {
			// check size of persisted collection
			return asyncSizeCheck(coll);
		}).then(function (resultMap) {
			// assertion
			console.log("...counted " + resultMap.total + " bytes");
			return strictEqual(resultMap.total, expectedSize, resultMap.total + ' bytes were reported correctly');
		}).then(function () {
			// clean up
			console.log("...finally dropping db from persistence layer");
			return asyncDrop(db, true);
		}).then(function () {
			// trigger async QUnit
			start();
		}).catch(function (err) {
			ok(false, err);
			console.log(JSON.stringify(err));
		});
		
	});
	
	QUnit.asyncTest('Persist.persistedSize() :: DB: save random amount (< 1MB) of data into a random number of collections and expect total + persistence overhead reported', function () {
		// prepare things
		var dbName = new Date().toJSON();
		var db = fdb.db(dbName);
		
		var expectedSize = 0;
		
		var collectionTemplate = "coll-";
		
		var bytes = Math.floor((Math.random() * 1000000) + 1);
		// split total bytes up into unequal parts
		var aCollections = [];
		while (bytes > 0) {
			var byteChunk = Math.round(Math.random() * bytes);
			aCollections.push(byteChunk);
			bytes -= byteChunk;
		}
		console.info("Test.persistedSize: chunks: " + aCollections);
		
		// this is for easier debugging purposes - content of the collections
		var aChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
		
		Promise.resolve().then(function () {
			return Promise.all(aCollections.map(function (byteChunk, index) {
				// create a collection for each byte chunk
				var coll = db.collection(collectionTemplate + index);
				
				// phantomjs doesn't know String.repeat(x)...
				var content = "";
				// insert incremented char from chars array
				for (var i = 0; i < byteChunk; i++) {
					content += aChars[index];
				}
				var doc = {_id: index, data: content};
				
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
				
				// content -> collection
				return asyncInsert(coll, doc);
			}))
		}).then(function (aResults) {
			// persist all created collections
			return Promise.all(aResults.map(function (coll, index) {
				console.log("...persisting collection#" + index);
				return asyncSave(coll);
			}))
		}).then(function () {
			// drop DB from mem, but not from persistence
			console.log("...dropping db");
			return asyncDrop(db, false);
		}).then(function () {
			// re-create DB in mem
			console.log("...recreating db");
			return fdb.db(dbName);
		}).then(function (dbNew) {
			// restore all runtime collections
			db = dbNew;
			return Promise.all(aCollections.map(function (byteChunk, index) {
				// create a collection for each byte chunk
				var coll = db.collection(collectionTemplate + index);
				console.log("...recreating " + collectionTemplate + index);
				// make sure its empty - the persisted version is of interest, not the runtime version
				return asyncFind(coll, '');
			}))
		}).then(function (aResults) {
			aResults.map(function (result, index) {
				console.log("...validating empty collection#" + index + ": result: " + result.length);
				strictEqual(result.length, 0, 'Check that there are currently no items in the collection#' + index);
			});
			return true;
		}).then(function () {
			// determine entire DB size
			return asyncSizeCheck(db);
		}).then(function (resultMap) {
			// assertion
			console.log("...counted " + resultMap.total + " bytes");
			return strictEqual(resultMap.total, expectedSize, resultMap.total + ' bytes were reported correctly');
		}).then(function () {
			// clean-up
			console.log("...finally dropping db from persistence layer");
			return asyncDrop(db, true);
		}).then(function () {
			// trigger async QUnit
			start();
		}).catch(function (err) {
			ok(false, err);
			console.log(JSON.stringify(err));
		});
		
	});
	
	QUnit.asyncTest('Persist.persistedSize() :: DB + collection: if no data is persisted, return 0 (and not an error)', function () {
		// prepare things
		var dbName = new Date().toJSON();
		var db = fdb.db(dbName);
		
		var collName = "testCollNoData";
		
		var doc = {_id: 4711};
		var coll = db.collection(collName);
		
		Promise.resolve().then(function () {
			return asyncInsert(coll, doc);
		}).then(function () {
			// check size of persisted collection
			return asyncSizeCheck(coll);
		}).then(function (resultMap) {
			// assertion
			console.log("...counted " + resultMap + " bytes");
			return strictEqual(resultMap.total, 0, 'no collection persisted -> 0 bytes were reported correctly');
		}).then(function () {
			// check size of DB
			return asyncSizeCheck(db);
		}).then(function (resultMap) {
			// assertion
			console.log("...counted " + resultMap + " bytes");
			return strictEqual(resultMap.total, 0, 'no DB persisted -> 0 bytes were reported correctly');
		}).then(function () {
			// clean up
			console.log("...finally dropping db");
			return asyncDrop(db, false);
		}).then(function () {
			// trigger async QUnit
			start();
		}).catch(function (err) {
			ok(false, err);
			console.log(JSON.stringify(err));
		});
		
	});
	
	QUnit.asyncTest('Persist.persistedSize() :: DB + collections: even when not re-attached, all persisted collections are reported with their correct size)', function () {
		// prepare things
		var dbName = new Date().toJSON();
		var db = fdb.db(dbName);
		
		var collNames = ["testColl1", "testColl2", "testColl3"];
		var colRefs = [];
		var doc = {_id: 4711};
		
		// colNames are of same length, so we use the first one for the example calc
		// also UTF8 only here, so 1 char = 1 byte -> .length property can be used
		var exampleKey = db._name + "-" + collNames[0];
		var exampleValue = "json::fdb::[" + JSON.stringify(doc) + "]";
		
		var exampleMetaKey = db._name + "-" + collNames[0] + "-metaData";
		var exampleMetaValue = "json::fdb::{}";
		
		var expectedSize = collNames.length *
			( (exampleKey + exampleValue).length + (exampleMetaKey + exampleMetaValue).length );
		
		// attach all collections to DB
		collNames.forEach(function (col) {
			colRefs.push(db.collection(col));
		});
		
		Promise.resolve().then(function () {
			// insert content for all collections
			return Promise.all(colRefs.map(function (colRef) {
				return asyncInsert(colRef, doc);
			}));
		}).then(function () {
			// persist all collections
			return Promise.all(colRefs.map(function (colRef) {
				return asyncSave(colRef);
			}));
		}).then(function () {
			// drop DB from mem, but not from persistence
			console.log("...dropping db from memory");
			return asyncDrop(db, false);
		}).then(function () {
			// re-create DB in mem
			console.log("...recreating db");
			return fdb.db(dbName);
		}).then(function (dbNew) {
			// restore only first collection and
			// make sure its also empty
			db = dbNew;
			var coll1 = db.collection(collNames[0]);
			return asyncFind(coll1, '');
		}).then(function (result) {
			strictEqual(result.length, 0, 'Check that reattached collection is empty');
			return true;
		}).then(function () {
			// check size of DB
			return asyncSizeCheck(db);
		}).then(function (resultMap) {
			// assertion
			console.log("...counted " + resultMap.totalc + " bytes");
			return strictEqual(resultMap.total, expectedSize, resultMap.total + ' bytes were reported of all persisted collections, even though only first was attached at runtime');
		}).then(function () {
			// clean up
			console.log("...finally dropping db");
			return asyncDrop(db, true);
		}).then(function () {
			// trigger async QUnit
			start();
		}).catch(function (err) {
			ok(false, err);
			console.log(JSON.stringify(err));
		});
		
	});
	
	QUnit.asyncTest('Persist.persistedSize() :: collection: compress (well-suited) string when persisting -> persisted size < runtime size', function () {
		// prepare things
		var dbName = new Date().toJSON();
		var db = fdb.db(dbName);
		
		var collName = "testCollPersistedCompressedSize";
		
		var bytes = Math.floor((Math.random() * 100000) + 1);
		var char = "z";
		
		// phantomjs doesn't know String.repeat(x)...
		// provide an easy to compress string
		var content = "";
		for (var i = 0; i < bytes; i++) {
			content += char;
		}
		
		var doc = {_id: 4711, data: content};
		var coll = db.collection(collName);
		
		// add compression step
		db.persist.addStep(new db.shared.plugins.FdbCompress());
		
		// calc runtime size
		// also db- and collection-prefixes count toward expected byte size of storage object
		// for simplicity's sake, UTF8 names are expected here so .length can be used
		var _dbPrefix = db._name + "-" + coll._name;
		// also content-prefix of actual stored data count toward expected size of storage object
		// shady as of now, but localforage's API doesn't provide getting the "raw storage format wrap" at runtime
		var _contentWrap = "json::fdb::[]";
		
		// total bytes to expect in persistence
		var runtimeSize = _dbPrefix.length + _contentWrap.length
			+ JSON.stringify(doc).length;
		
		Promise.resolve().then(function () {
			// insert content into collection
			return asyncInsert(coll, doc);
		}).then(function (coll) {
			// persist collection
			return asyncSave(coll);
		}).then(function () {
			// check size of persisted collection
			return asyncSizeCheck(coll);
		}).then(function (resultMap) {
			// assertion
			console.log("...counted " + resultMap.total + " bytes");
			var persistedSize = resultMap.collections[0][1];
			return notStrictEqual(persistedSize, runtimeSize, persistedSize + ' bytes in persistence vs '
				+ runtimeSize + ' bytes at runtime. Compression ratio: ' + (1 - Number((persistedSize / runtimeSize).toFixed(2))));
			
		}).then(function () {
			// clean up
			console.log("...finally dropping db from persistence layer");
			return asyncDrop(db, true);
		}).then(function () {
			// trigger async QUnit
			start();
		}).catch(function (err) {
			ok(false, err);
			console.log(JSON.stringify(err));
		});
		
	});
	
});