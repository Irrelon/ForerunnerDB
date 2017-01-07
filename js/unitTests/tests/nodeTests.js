"use strict";

var TB = require('testbear'),
	ForerunnerDB = require('../../builds/nodecore');

//TB.config.noCatch = true;
TB.timeout = 10000;

TB.test('Core', 'Instantiate ForerunnerDB', function (callback) {
	var fdb = new ForerunnerDB();

	TB.strictEqual(fdb instanceof ForerunnerDB, true, 'ForerunnerDB instance is instantiated');

	callback();
});

TB.test('Core', 'Instantiate a Database Instance', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp');

	TB.strictEqual(db instanceof ForerunnerDB.shared.modules.Db, true, 'ForerunnerDB database instance is instantiated');

	callback();
});

TB.test('Collection', 'Instantiate a Collection Instance', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp'),
		coll = db.collection('test');

	TB.strictEqual(coll instanceof ForerunnerDB.shared.modules.Collection, true, 'ForerunnerDB instance is instantiated');

	callback();
});

TB.test('Collection', 'Upsert with array in update correctly removes maintain references', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp'),
		coll = db.collection('test'),
		newArr = [{
			_id: 0,
			attended: 0
		}, {
			_id: 1,
			attended: 0
		}],
		data;
	
	coll.insert({_id: 1, arr: []}, {_id: 2, arr: []});
	coll.upsert({
		_id: 1,
		arr: newArr
	});
	coll.upsert({
		_id: 2,
		arr: newArr
	});
	
	coll.update({
		_id: 1,
		'arr.$': {
			_id: 0
		}
	}, {
		arr: {
			attended:1
		}
	});
	
	// Check if upsert worked
	data = coll.find();
	
	TB.strictEqual(data.length, 2, 'Data length is correct');
	TB.strictEqual(data[0]._id, 1, 'Data id 1 is correct');
	TB.strictEqual(data[1]._id, 2, 'Data id 2 is correct');
	TB.strictEqual(data[0].arr[0].attended, 1, 'Data id 1 arr 1 is correct');
	TB.strictEqual(data[1].arr[0].attended, 0, 'Data id 2 arr 1 is correct');
	TB.strictEqual(data[0].arr.length, 2, 'Data 1 length is correct');
	TB.strictEqual(data[1].arr.length, 2, 'Data 1 length is correct');
	
	// Check if the arrays are non-referenced in find
	TB.strictEqual(data[0].arr === data[1].arr, false, 'Data arrays in find result have been decoupled');
	
	// Check if the arrays are non-referenced in underlying data objects
	TB.strictEqual(coll._data[0].arr === coll._data[1].arr, false, 'Data arrays in underlying data have been decoupled');
	
	callback();
});

TB.test('Persist', 'Save Collection Data and Load it Back From File-Based Persistent Storage', function (callback) {
	var fdb = new ForerunnerDB(),
		self = this,
		db = fdb.db('temp'),
		coll = db.collection('test', {
			changeTimestamp: true
		}),
		result,
		lastChange;

	db.persist.dataDir('./configData');

	coll.insert({
		name: 'Test'
	});

	lastChange = coll.metaData().lastChange;

	coll.save(function (err) {
		if (err) {
			console.log(err);
			TB.ok(false, err);
		} else {
			TB.equal(err, false, 'Save did not produce an error');
		}

		db.drop(false);
		db = fdb.db('temp');
		db.persist.dataDir('./configData');

		coll = db.collection('test');

		// Make sure the item does not currently exist
		result = coll.find();
		TB.strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

		coll.load(function (err) {
			if (err) {
				console.log(err);
				TB.ok(false, err);
			} else {
				TB.ok(!err, 'Load did not produce an error');
			}

			result = coll.find();

			TB.strictEqual(result.length, 1, 'Check that items were loaded correctly');
			TB.strictEqual(result[0] && result[0].name, 'Test', 'Check that the data loaded holds correct information');
			TB.strictEqual(coll.metaData().lastChange.toISOString(), lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');

			db.drop();

			callback();
		});
	});
});

TB.test('Persist', 'Timed save, 50,000 records', function (callback) {
	var fdb = new ForerunnerDB(),
		self = this,
		db = fdb.db('temp'),
		coll = db.collection('test', {
			changeTimestamp: true
		}),
		result,
		lastChange,
		dataArr = [],
		dataCount = 50000,
		testString,
		i = 0;

	db.persist.dataDir('./configData');

	testString = JSON.stringify({
		"_id": String(i),
		"data": [{
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}, {
			"moo": db.objectId(),
			"foo": db.objectId()
		}]
	});

	TB.ok(testString.length === 519 || testString.length === 520, 'Check that each entry is 519 or 520 bytes');

	TB.time('Generating ' + dataCount + ' records');
	for (i = 0; i < dataCount; i++) {
		dataArr.push({
			"_id": String(i),
			"data": [{
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}, {
				"moo": db.objectId(),
				"foo": db.objectId()
			}]
		});
	}
	TB.time('Generating ' + dataCount + ' records');

	TB.time('Inserting ' + dataCount + ' records');
	coll.insert(dataArr, function () {
		TB.time('Inserting ' + dataCount + ' records');
		lastChange = coll.metaData().lastChange;
		//console.log('Test', lastChange.toString());

		TB.time('Saving data');
		coll.save(function (err) {
			TB.time('Saving data');
			if (err) {
				console.log(err);
				TB.ok(false, err);
			} else {
				TB.equal(err, false, 'Save did not produce an error');
			}

			db.drop(false);
			db = fdb.db('temp');
			db.persist.dataDir('./configData');

			coll = db.collection('test');

			// Make sure the item does not currently exist
			result = coll.find();
			TB.strictEqual(result.length, 0, 'Check that there are currently no items in the collection');

			TB.time('Loading data');
			coll.load(function (err) {
				TB.time('Loading data');
				if (err) {
					console.log(err);
					TB.ok(false, err);
				} else {
					TB.ok(!err, 'Load did not produce an error');
				}

				TB.time('Running find on collection');
				result = coll.find({}, {$decouple: false});
				TB.time('Running find on collection');

				TB.strictEqual(dataCount, result.length, 'Check that items were loaded correctly');

				if (coll.metaData() && coll.metaData().lastChange && coll.metaData().lastChange.toISOString && lastChange) {
					TB.strictEqual(coll.metaData().lastChange.toISOString(), lastChange.toISOString(), 'Collection lastChange flag in metadata is the same as when saved');
				}

				db.drop();

				callback();
			});
		});
	});
});

TB.test('Collection', 'index() :: Test 2d index search on large data set', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp'),
		coll = db.collection('cities').truncate(),
		result1,
		result2,
		cityData;

	cityData = require('./cities.json');

	coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'cityLatLngIndex',
		type: '2d'
	});

	TB.ok(cityData.length, 499, 'Correct number of geospatial records loaded from data file');

	coll.insert(cityData, function () {
		TB.ok(cityData.length, coll.count(), 'Correct number of geospatial records inserted');
		console.log('Collection record count: ' + coll.count());

		var index = coll.index('cityLatLngIndex');

		TB.ok(index !== undefined, "Check index is available: " + index.name());
		TB.ok(index.name() === 'cityLatLngIndex', "Check index is correct name: " + index.name());

		// Query index by distance
		// $near queries are sorted by distance from center point by default
		result1 = coll.find({
			lngLat: {
				$near: {
					$point: [51.50722, -0.12750],
					$maxDistance: 50,
					$distanceUnits: 'miles',
					$distanceField: 'dist',
					$geoHashField: 'geoHash'
				}
			}
		});

		result2 = coll.find({
			lngLat: {
				$near: {
					$point: [51.50722, -0.12750],
					$maxDistance: 100,
					$distanceUnits: 'miles',
					$distanceField: 'dist',
					$geoHashField: 'geoHash'
				}
			}
		});

		TB.strictEqual(result1.length < result2.length, true, 'Number of doc in 100 miles is more than docs in 50 miles');

		TB.strictEqual(result1.length, 9, 'Result1 count correct');
		TB.strictEqual(result2.length, 22, 'Result2 count correct');

		TB.strictEqual(result1[0].name, 'London, UK', 'Result 1 correct');
		TB.strictEqual(result1[1].name, 'Wycombe, Swanley, Greater London BR8, UK', 'Result 2 correct');
		TB.strictEqual(result1[2].name, 'Basildon, Essex, UK', 'Result 3 correct');
		TB.strictEqual(result1[3].name, 'Luton, UK', 'Result 4 correct');
		TB.strictEqual(result1[4].name, 'Chelmsford, Essex, UK', 'Result 5 correct');
		TB.strictEqual(result1[5].name, 'Southend-on-Sea, UK', 'Result 6 correct');
		TB.strictEqual(result1[6].name, 'Aylesbury, Buckinghamshire, UK', 'Result 7 correct');
		TB.strictEqual(result1[7].name, 'Milton Keynes, UK', 'Result 8 correct');
		TB.strictEqual(result1[8].name, 'Brighton, Brighton and Hove, UK', 'Result 9 correct');

		TB.strictEqual(result2[0].name, 'London, UK', 'Result 1 correct');
		TB.strictEqual(result2[1].name, 'Wycombe, Swanley, Greater London BR8, UK', 'Result 2 correct');
		TB.strictEqual(result2[2].name, 'Basildon, Essex, UK', 'Result 3 correct');
		TB.strictEqual(result2[3].name, 'Luton, UK', 'Result 4 correct');
		TB.strictEqual(result2[4].name, 'Chelmsford, Essex, UK', 'Result 5 correct');
		TB.strictEqual(result2[5].name, 'Southend-on-Sea, UK', 'Result 6 correct');
		TB.strictEqual(result2[6].name, 'Aylesbury, Buckinghamshire, UK', 'Result 7 correct');
		TB.strictEqual(result2[7].name, 'Milton Keynes, UK', 'Result 8 correct');
		TB.strictEqual(result2[8].name, 'Brighton, Brighton and Hove, UK', 'Result 9 correct');

		callback();
	});
});

TB.test('Condition', 'Test IFTTT condition functionality', function (finishTest) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('test'),
		coll = db.collection('stocksIOwn'),
		condition;

	condition = coll.when({
			_id: 'TSLA',
			val: {
				$gt: 210
			}
		})
		.and({
			_id: 'SCTY',
			val: {
				$gt: 23
			}
		})
		.then(function () {
			var tsla = coll.findById('TSLA'),
				scty = coll.findById('SCTY');

			TB.strictEqual(tsla.val, 214, 'TSLA value is 214');
			TB.strictEqual(scty.val, 25, 'TSLA value is 25');

			TB.expect(4);
			finishTest();
		})
		.else(function () {
			var tsla = coll.findById('TSLA'),
				scty = coll.findById('SCTY');

			TB.strictEqual(tsla.val, 214, 'TSLA value is 214');
			TB.strictEqual(scty.val, 20, 'TSLA value is 20');
		});

	coll.insert([{
		_id: 'TSLA',
		val: 214
	}, {
		_id: 'SCTY',
		val: 20
	}]);

	condition.start(undefined);

	coll.update({_id: 'SCTY'}, {val: 25});
});

TB.test('Persist', 'Check persist.auto()', function (finishTest) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('testPersistDb'),
		coll;
	
	db.persist.dataDir('./testData');
	db.persist.auto(true);
	
	coll = db.collection('testPersist');
	
	coll.on('load', function () {
		TB.ok(true, 'Collection load event fired');
		finishTest();
	});
});

TB.test('Collection', 'Check aggregation', function (finishTest) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('testPersistDb'),
		coll = db.collection("res");
	
	coll.primaryKey("resId");
	coll.insert({
		resId: 1,
		TypeId: "Person",
		UID: "Bob",
		Data: {Age: 20, Name:"Bob"}
	});
	coll.insert({
		resId: 2,
		TypeId: "Person",
		UID: "Bob",
		Data: {Age: 25, Name:"Bob"}
	});
	coll.insert({
		resId: 3,
		TypeId: "Car",
		UID: "TeslaModelX",
		Data: {Manufacturer: "Tesla", Owner:"Bob"}
	});
	coll.insert({
		resId: 4,
		TypeId: "Person",
		UID: "Bill",
		Data: {Age: 22, Name:"Bill"}
	});
	
	var tmpObj = {},
		val;
	
	val = coll.sort({resId: -1}, coll.find({
		"TypeId": "Person"
	})).filter(function (doc) {
		return coll._match(doc, {
			$distinct: {
				UID: 1
			}
		}, {}, 'and', tmpObj);
	});
	
	TB.ok(val.length === 2, 'The return data length is correct');
	finishTest();
});

// This works but haven't written any test (strictEquals) stuff for it
/*TB.test('Joins', 'Join multiple levels', function (callback) {
	var fdb = new ForerunnerDB(),
		db = fdb.db('temp'),
		customers = db.collection('customers'),
		orders = db.collection('orders'),
		addresses = db.collection('addresses');

	customers.insert([{
		"_id": 1,
		"name": 'Customer 1'
	}, {
		"_id": 2,
		"name": 'Customer 2'
	}, {
		"_id": 3,
		"name": 'Customer 3'
	}, {
		"_id": 4,
		"name": 'Customer 4'
	}]);

	addresses.insert([{
		"customerId": 1,
		"address": "Customer 1 Address"
	}, {
		"customerId": 2,
		"address": "Customer 2 Address"
	}, {
		"customerId": 3,
		"address": "Customer 3 Address"
	}, {
		"customerId": 4,
		"address": "Customer 4 Address"
	}]);

	orders.insert([{
		"_id": 1,
		"customers": [
			1, 2
		]
	}, {
		"_id": 2,
		"customers": [
			3, 4
		]
	}]);

	var result = orders.find({}, {
		"$join": [{
			"customers": {
				"$where": {
					"$query": {
						"_id": "$$.customers"
					},
					$options: {
						"$join": [{
							"addresses": {
								"$where": {
									"$query": {
										"customerId": "$$._id"
									}
								},
								"$as": "customerAddress",
								"$require": false,
								"$multi": false
							}
						}]
					}
				},
				"$as": "customerDetails",
				"$require": false,
				"$multi": true
			}
		}]
	});

	TB.strictEqual(result.length, 2, 'Customer data joined');

	callback();
});*/

TB.start();