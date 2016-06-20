module.exports = function (TB, ForerunnerDB) {
	TB.test('Joins', 'Join multiple levels', function (callback) {
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

		TB.strictEqual(result instanceof Array, true, 'Result is an array');
		TB.strictEqual(result.length, 2, 'Result array is correct length');
		TB.strictEqual(typeof result[0], 'object', 'Result[0] is an object');

		TB.strictEqual(result[0]._id, 1, 'Result[0]._id is correct');
		TB.strictEqual(result[0].customerDetails instanceof Array, true, 'Result[0].customerDetails is an array');
		TB.strictEqual(result[0].customerDetails.length, 2, 'Customer details array is correct length');
		TB.strictEqual(result[0].customerDetails[0]._id, 1, 'customerDetails[0]._id is correct');
		TB.strictEqual(result[0].customerDetails[1]._id, 2, 'customerDetails[1]._id is correct');
		TB.strictEqual(result[0].customerDetails[0].customerAddress instanceof Object, true, '[0]customerAddress is an object');
		TB.strictEqual(result[0].customerDetails[1].customerAddress instanceof Object, true, '[1]customerAddress is an object');
		TB.strictEqual(result[0].customerDetails[0].customerAddress.address, 'Customer 1 Address', '[0]customerAddress.address is correct');
		TB.strictEqual(result[0].customerDetails[1].customerAddress.address, 'Customer 2 Address', '[1]customerAddress.address is correct');

		TB.strictEqual(result[1]._id, 2, 'Result[1]._id is correct');
		TB.strictEqual(result[1].customerDetails instanceof Array, true, 'Result[1].customerDetails is an array');
		TB.strictEqual(result[1].customerDetails.length, 2, 'Customer details array is correct length');
		TB.strictEqual(result[1].customerDetails[0]._id, 3, 'customerDetails[0]._id is correct');
		TB.strictEqual(result[1].customerDetails[1]._id, 4, 'customerDetails[1]._id is correct');
		TB.strictEqual(result[1].customerDetails[0].customerAddress instanceof Object, true, '[0]customerAddress is an object');
		TB.strictEqual(result[1].customerDetails[1].customerAddress instanceof Object, true, '[1]customerAddress is an object');
		TB.strictEqual(result[1].customerDetails[0].customerAddress.address, 'Customer 3 Address', '[0]customerAddress.address is correct');
		TB.strictEqual(result[1].customerDetails[1].customerAddress.address, 'Customer 4 Address', '[1]customerAddress.address is correct');

		TB.expect(21);
		callback();
	});
};