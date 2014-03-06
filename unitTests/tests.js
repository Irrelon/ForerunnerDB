var db,
	coll1,
	count,
	singleObject = {
		_id: '1',
		name: 'Sam',
		age: 19,
		lookup: true
	},
	multipleObjects = [{
		_id: '2',
		name: 'Jim',
		age: 15,
		lookup: true,
		onlyOne: true
	}, {
		_id: '3',
		name: 'Kat',
		age: 12,
		lookup: false
	}, {
		_id: '4',
		name: 'Dean',
		age: 5,
		lookup: true
	}];

QUnit.config.reorder = false;

test("Init DB", function() {
	db = new ForerunnerDB();
	ok(db instanceof ForerunnerDB, "Failed!");
});

test("DB.collection() :: Create Collection", function() {
	coll1 = db.collection('coll1');
	ok(coll1 instanceof ForerunnerDB.types.Collection, "Failed!");
});

test("Collection.setData() :: Single Document Object", function() {
	coll1.setData(singleObject);
	ok(coll1.find({_id: '1'})[0] && coll1.find({_id: '1'})[0].name === 'Sam', "Failed!");
});

test("Collection.remove() :: Remove Single Document via Find", function() {
	var result = coll1.remove({_id: '1'});
	ok(!coll1.find({moo: true})[0] && result.length === 1, "Failed!");
});

test("Collection.setData() :: Multiple Documents via Array", function() {
	coll1.setData(multipleObjects);
	count = coll1.count();
	ok(count === multipleObjects.length && coll1.find({_id: '2'})[0] && coll1.find({_id: '2'})[0].name === 'Jim', "Failed!");
});

test("Collection.remove() :: Remove Multiple Documents via Find Boolean", function() {
	var result = coll1.remove({lookup: true});
	ok(!coll1.find({_id: '2'})[0] && !coll1.find({_id: '4'})[0] && result.length === 2, "Failed!");
});

test("Collection.insert() :: Check Primary Key Violation is Working", function() {
	var result = coll1.insert(multipleObjects);

	ok(result.inserted.length === 2 && result.failed.length === 1, "Failed!");
});

test("Collection.setData() :: Multiple Records Re-Insert Data", function() {
	var result = coll1.setData(multipleObjects);
	count = coll1.count();
	ok(count === multipleObjects.length && coll1.find({_id: '2'})[0] && coll1.find({_id: '2'})[0].name === 'Jim', "Failed!");
});

test("Collection.find() :: $exists clause true on field that does exist", function() {
	var result = coll1.find({name: {
		$exists: true
	}});

	ok(result.length === 3, "Failed!");
});

test("Collection.find() :: $exists clause true on field that does not exist", function() {
	var result = coll1.find({doesNotExist: {
		$exists: true
	}});

	ok(result.length === 0, "Failed!");
});

test("Collection.find() :: $exists clause false", function() {
	var result = coll1.find({doesNotExist: {
		$exists: false
	}});

	ok(result.length === 3, "Failed!");
});

test("Collection.find() :: $gt clause", function() {
	var result = coll1.find({age: {
		$gt: 11
	}});

	ok(result.length === 2, "Failed!");
});

test("Collection.find() :: $gte clause", function() {
	var result = coll1.find({age: {
		$gte: 12
	}});

	ok(result.length === 2, "Failed!");
});

test("Collection.find() :: $lt clause", function() {
	var result = coll1.find({age: {
		$lt: 12
	}});

	ok(result.length === 1, "Failed!");
});

test("Collection.find() :: $lte clause", function() {
	var result = coll1.find({age: {
		$lte: 12
	}});

	ok(result.length === 2, "Failed!");
});

test("Collection.find() :: $gt $lt clause combined", function() {
	var result = coll1.find({age: {
		$lt: 13,
		$gt: 5
	}});

	ok(result.length === 1, "Failed!");
});

test("Collection.find() :: $gte $lte clause combined", function() {
	var result = coll1.find({age: {
		$lte: 13,
		$gte: 5
	}});

	ok(result.length === 2, "Failed!");
});

test("Collection.find() :: $or clause", function() {
	var result = coll1.find({
		$or: [{
			age: 15
		}, {
			name: 'Dean'
		}]
	});
	console.log(result);

	ok(result.length === 2, "Failed!");
});

test("Collection.find() :: $and clause", function() {
	var result = coll1.find({
		$and: [{
			age: 15
		}, {
			name: 'Jim'
		}]
	});
	console.log(result);

	ok(result.length === 1, "Failed!");
});