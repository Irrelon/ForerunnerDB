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