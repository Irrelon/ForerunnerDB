module.exports = function (TB, ForerunnerDB) {
	TB.test('Collection', 'Instantiate a Collection Instance', function (callback) {
		var fdb = new ForerunnerDB(),
			db = fdb.db('temp'),
			coll = db.collection('test');

		TB.strictEqual(coll instanceof ForerunnerDB.shared.modules.Collection, true, 'ForerunnerDB instance is instantiated');

		TB.expect(1);
		callback();
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

			TB.expect(25);
			callback();
		});
	});
};