QUnit.module('Sorting');
QUnit.test("Sorting :: Single key number ascending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'price': 1
		}
	});

	strictEqual(result[0].name, 'Dog Food', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Single key number descending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'price': -1
		}
	});

	strictEqual(result[0].name, 'Cat Litter', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Single key string ascending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'name': 1
		}
	});

	strictEqual(result[0].name, 'Cat Litter', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Single key string descending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'name': -1
		}
	});

	strictEqual(result[0].name, 'Dog Food', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Multi key number ascending, string ascending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'price': 1,
			'name': 1
		}
	});

	strictEqual(result[0].name, 'Dog Food', "Correct ordering");

	result = itemCollection.find({}, {
		'$orderBy': {
			'price': -1,
			'name': 1
		}
	});

	strictEqual(result[0].name, 'Cat Litter', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Multi key number descending, string ascending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'price': -1,
			'name': 1
		}
	});

	strictEqual(result[0].name, 'Cat Litter', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Multi key number ascending, string descending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'price': 1,
			'name': -1
		}
	});

	strictEqual(result[0].name, 'Dog Food', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Date objects ascending", function () {
	base.dbUp();

	var itemCollection = db.collection('item'),
			result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		date: new Date('2014-12-23T16:32:22.444Z')
	}, {
		_id: 2,
		name: 'Dog Food',
		date: new Date('2015-11-13T18:53:39.422Z')
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'date': 1
		}
	});

	strictEqual(result[0].name, 'Cat Litter', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Date objects descending", function () {
	base.dbUp();

	var itemCollection = db.collection('item').truncate(),
		result;

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		date: new Date('2014-12-23T16:32:22.444Z')
	}, {
		_id: 2,
		name: 'Dog Food',
		date: new Date('2015-11-13T18:53:39.422Z')
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'date': -1
		}
	});

	strictEqual(result[0].name, 'Dog Food', "Correct ordering");

	base.dbDown();
});

QUnit.test("Sorting :: Nested key sorts", function () {
	base.dbUp();

	var itemCollection = db.collection('item').truncate(),
			result;

	itemCollection.setData([{
		_id: 1,
		name: 'Window 1',
		location: {
			title: 'Kitchen'
		}
	}, {
		_id: 2,
		name: 'Window 2',
		location: {
			title: 'Kitchen'
		}
	}, {
		_id: 3,
		name: 'Window 1',
		location: {
			title: 'Bathroom 2'
		}
	}, {
		_id: 4,
		name: 'Window 1',
		location: {
			title: 'Bathroom 1'
		}
	}, {
		_id: 5,
		name: 'Window 4',
		location: {
			title: 'Bathroom 1'
		}
	}, {
		_id: 6,
		name: 'Window 2',
		location: {
			title: 'Bathroom 1'
		}
	}, {
		_id: 7,
		name: 'Window 3',
		location: {
			title: 'Bathroom 1'
		}
	}, {
		_id: 8,
		name: 'Front Door Open',
		location: {
			title: 'Lobby'
		}
	}]);

	result = itemCollection.find({}, {
		'$orderBy': {
			'location': {
				title: 1
			},
			'name': 1
		}
	});

	strictEqual(result[0].name, 'Window 1', "Correct ordering");
	strictEqual(result[0].location.title, 'Bathroom 1', "Correct ordering");

	strictEqual(result[1].name, 'Window 2', "Correct ordering");
	strictEqual(result[1].location.title, 'Bathroom 1', "Correct ordering");

	strictEqual(result[2].name, 'Window 3', "Correct ordering");
	strictEqual(result[2].location.title, 'Bathroom 1', "Correct ordering");

	strictEqual(result[3].name, 'Window 4', "Correct ordering");
	strictEqual(result[3].location.title, 'Bathroom 1', "Correct ordering");

	strictEqual(result[4].name, 'Window 1', "Correct ordering");
	strictEqual(result[4].location.title, 'Bathroom 2', "Correct ordering");

	strictEqual(result[5].name, 'Window 1', "Correct ordering");
	strictEqual(result[5].location.title, 'Kitchen', "Correct ordering");

	strictEqual(result[6].name, 'Window 2', "Correct ordering");
	strictEqual(result[6].location.title, 'Kitchen', "Correct ordering");

	strictEqual(result[7].name, 'Front Door Open', "Correct ordering");
	strictEqual(result[7].location.title, 'Lobby', "Correct ordering");

	base.dbDown();
});

ForerunnerDB.moduleLoaded(['View', 'Angular'], function () {
	QUnit.asyncTest("Sorting Views :: Nested key sorts", function () {
		base.dbUp();

		expect(32);

		var itemCollection = db.collection('item').truncate(),
			result;

		$scope = {
			$apply: function () {},
			$on: function () {}
		};

		view = db.view('myView')
			.from(itemCollection)
			.queryData({
				state: {
					functionName: 'sensorBinary'
				}
			}, {
				'$orderBy': {
					'location': {
						title: 1
					},
					'name': 1
				}
			})
			.ng($scope, 'data');

		itemCollection.insert([{
			_id: 9,
			state: {
				functionName: 'switchBinary'
			},
			name: 'Door Lock',
			location: {
				title: 'Bathroom 2'
			}
		}, {
			_id: 1,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Window 2',
			location: {
				title: 'Kitchen'
			}
		}, {
			_id: 2,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Window 1',
			location: {
				title: 'Kitchen'
			}
		}, {
			_id: 3,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Window 1',
			location: {
				title: 'Bathroom 2'
			}
		}, {
			_id: 10,
			state: {
				functionName: 'switchBinary'
			},
			name: 'Door Lock',
			location: {
				title: 'Bathroom 1'
			}
		}, {
			_id: 4,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Window 1',
			location: {
				title: 'Bathroom 1'
			}
		}, {
			_id: 5,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Window 4',
			location: {
				title: 'Bathroom 1'
			}
		}, {
			_id: 6,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Window 3',
			location: {
				title: 'Bathroom 1'
			}
		}, {
			_id: 7,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Window 2',
			location: {
				title: 'Bathroom 1'
			}
		}, {
			_id: 8,
			state: {
				functionName: 'sensorBinary'
			},
			name: 'Front Door Open',
			location: {
				title: 'Lobby'
			}
		}]);

		setTimeout(function () {
			result = $scope.data;

			strictEqual(result[0].name, 'Window 1', "Correct ordering");
			strictEqual(result[0].location.title, 'Bathroom 1', "Correct ordering");

			strictEqual(result[1].name, 'Window 2', "Correct ordering");
			strictEqual(result[1].location.title, 'Bathroom 1', "Correct ordering");

			strictEqual(result[2].name, 'Window 3', "Correct ordering");
			strictEqual(result[2].location.title, 'Bathroom 1', "Correct ordering");

			strictEqual(result[3].name, 'Window 4', "Correct ordering");
			strictEqual(result[3].location.title, 'Bathroom 1', "Correct ordering");

			strictEqual(result[4].name, 'Window 1', "Correct ordering");
			strictEqual(result[4].location.title, 'Bathroom 2', "Correct ordering");

			strictEqual(result[5].name, 'Window 1', "Correct ordering");
			strictEqual(result[5].location.title, 'Kitchen', "Correct ordering");

			strictEqual(result[6].name, 'Window 2', "Correct ordering");
			strictEqual(result[6].location.title, 'Kitchen', "Correct ordering");

			strictEqual(result[7].name, 'Front Door Open', "Correct ordering");
			strictEqual(result[7].location.title, 'Lobby', "Correct ordering");

			// Now run an update and check order
			itemCollection.update({
				_id: 9
			}, {
				name: 'Door Lock1'
			});

			setTimeout(function () {
				result = $scope.data;

				strictEqual(result[0].name, 'Window 1', "Correct ordering");
				strictEqual(result[0].location.title, 'Bathroom 1', "Correct ordering");

				strictEqual(result[1].name, 'Window 2', "Correct ordering");
				strictEqual(result[1].location.title, 'Bathroom 1', "Correct ordering");

				strictEqual(result[2].name, 'Window 3', "Correct ordering");
				strictEqual(result[2].location.title, 'Bathroom 1', "Correct ordering");

				strictEqual(result[3].name, 'Window 4', "Correct ordering");
				strictEqual(result[3].location.title, 'Bathroom 1', "Correct ordering");

				strictEqual(result[4].name, 'Window 1', "Correct ordering");
				strictEqual(result[4].location.title, 'Bathroom 2', "Correct ordering");

				strictEqual(result[5].name, 'Window 1', "Correct ordering");
				strictEqual(result[5].location.title, 'Kitchen', "Correct ordering");

				strictEqual(result[6].name, 'Window 2', "Correct ordering");
				strictEqual(result[6].location.title, 'Kitchen', "Correct ordering");

				strictEqual(result[7].name, 'Front Door Open', "Correct ordering");
				strictEqual(result[7].location.title, 'Lobby', "Correct ordering");
				base.dbDown();

				start();
			}, 1000);
		}, 1000);
	});
});