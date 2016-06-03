QUnit.module('Index2d');
QUnit.test("Collection.ensureIndex() :: Assign an index to a collection", function() {
	base.dbUp();

	var coll = db.collection('houses').truncate();
	var indexResult = coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'testIndex1',
		type: '2d'
	});

	strictEqual(indexResult.err, undefined, "Initialise index error: " + indexResult.err);
	ok(indexResult.state !== undefined, "Check index state object: " + JSON.stringify(indexResult.state));
	strictEqual(indexResult.state.ok, true, "Check index state ok: " + indexResult.state.ok);
	strictEqual(indexResult.state.name, 'testIndex1', "Check index state name: " + indexResult.state.name);

	base.dbDown();
});

QUnit.test("Collection.ensureIndex() :: Check that the index identifies itself as a match for geospatial query", function() {
	base.dbUp();

	var coll = db.collection('houses').truncate(),
		index,
		indexResult,
		result;

	indexResult = coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'testIndex1',
		type: '2d'
	});

	index = coll.index('testIndex1');

	result = index.match({
		lngLat: {
			$near: {
				$point: [],
				$maxDistance: 5,
				$distanceUnits: 'miles'
			}
		}
	});

	strictEqual(result.score, 1, "Index agrees it will be able to satisfy the query");

	base.dbDown();
});

QUnit.test("Collection.index() :: Test 2d index search", function () {
	base.dbUp();

	var coll = db.collection('houses').truncate(),
		result;

	coll.ensureIndex({
		lngLat: 1
	}, {
		name: 'testIndex2',
		type: '2d'
	});

	coll.insert([{
		lngLat: [51.50722, -0.12750],
		name: 'Central London'
	}, {
		lngLat: [51.525745, -0.167550], // 2.18 miles
		name: 'Marylebone, London'
	}, {
		lngLat: [51.576981, -0.335091], // 10.54 miles
		name: 'Harrow, London'
	}, {
		lngLat: [51.769451, 0.086509], // 20.33 miles
		name: 'Harlow, Essex'
	}]);

	var index = coll.index('testIndex2');

	ok(index !== undefined, "Check index is available: " + index);
	ok(index.name() === 'testIndex2', "Check index is correct name: " + index.name());

	// Query index by distance
	// $near queries are sorted by distance from center point by default
	result = coll.find({
		lngLat: {
			$near: {
				$point: [51.50722, -0.12750],
				$maxDistance: 3,
				$distanceUnits: 'miles'
			}
		}
	});

	strictEqual(result.length, 2, 'Result count correct');
	strictEqual(result[0].name, 'Central London', 'Result 1 correct');
	strictEqual(result[1].name, 'Marylebone, London', 'Result 2 correct');

	base.dbDown();
});

QUnit.asyncTest("Collection.index() :: Test 2d index search on large data set", function () {
	base.dbUp();
	expect(5);

	var coll = db.collection('cities').truncate(),
		result1,
		result2;

	// Load the data
	$.getJSON('./data/cities.json', function (cityData) {
		coll.ensureIndex({
			lngLat: 1
		}, {
			name: 'cityLatLngIndex',
			type: '2d'
		});

		console.log('Inserting records: ' + cityData.length);

		coll.insert(cityData, function () {
			console.log('Collection record count: ' + coll.count());

			var index = coll.index('cityLatLngIndex');

			ok(index !== undefined, "Check index is available: " + index);
			ok(index.name() === 'cityLatLngIndex', "Check index is correct name: " + index.name());

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

			debugger;

			strictEqual(result1.length < result2.length, true, 'Number of doc in 100 miles is more than docs in 50 miles');

			strictEqual(result1.length, 2, 'Result1 count correct');

			if (result1.length) {
				strictEqual(result1[0].name, 'Central London', 'Result 1 correct');
				strictEqual(result1[1].name, 'Marylebone, London', 'Result 2 correct');
			}

			start();

			//base.dbDown();
		});
	});
});