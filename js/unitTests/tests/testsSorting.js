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