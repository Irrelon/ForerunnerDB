test("Init DB", function() {
	buildUp();

	ok(db instanceof ForerunnerDB, "Failed!");

	pullDown();
});

test("DB.collection() :: Create Collection", function() {
	buildUp();

	user = db.collection('user');
	organisation = db.collection('organisation');
	ok(user instanceof ForerunnerDB.classes.Collection, "Failed!");

	pullDown();
});

test("Collection.setData() :: Single Document Object", function() {
	buildUp();

	user.setData(singleUserObject);
	ok(user.find({_id: '1'})[0], "Failed!");
	ok(user.find({_id: '1'})[0].name === 'Sam', "Failed!");

	pullDown();
});

test("Collection.remove() :: Remove Single Document via Find", function() {
	buildUp();

	user.setData(singleUserObject);
	ok(user.find({_id: '1'})[0], "Failed!");

	var result = user.remove({_id: '1'});
	ok(!user.find({moo: true})[0], "Failed!");
	ok(result.length === 1, "Failed!");

	pullDown();
});

test("Collection.setData() :: Multiple Documents via Array", function() {
	buildUp();
	buildData();

	count = user.count();
	ok(count === usersData.length, "Failed!");
	ok(user.find({_id: '2'})[0], "Failed!");
	ok(user.find({_id: '2'})[0].name === 'Jim', "Failed!");

	pullDown();
});

test("Collection.remove() :: Remove Multiple Documents via Find Boolean", function() {
	buildUp();
	buildData();

	var result = user.remove({lookup: true});
	ok(!user.find({_id: '2'})[0], "Failed!");
	ok(!user.find({_id: '4'})[0], "Failed!");
	ok(result.length === 2, "Failed!");
	pullDown();
});

test("Collection.insert() :: Check Primary Key Violation is Working", function() {
	buildUp();
	buildData();

	user.remove({lookup: true});
	var result = user.insert(usersData);

	ok(result.inserted.length === 2, "Failed!");
	ok(result.failed.length === 1, "Failed!");

	pullDown();
});

test("Collection.setData() :: Multiple Records Re-Insert Data", function() {
	buildUp();
	buildData();

	var result = user.setData(usersData);
	count = user.count();
	ok(count === usersData.length, "Failed!");
	ok(user.find({_id: '2'})[0], "Failed!");
	ok(user.find({_id: '2'})[0].name === 'Jim', "Failed!");

	pullDown();
});

test("Collection.find() :: $exists clause true on field that does exist", function() {
	buildUp();
	buildData();

	var result = user.find({name: {
		$exists: true
	}});

	ok(result.length === 3, "Failed!");

	pullDown();
});

test("Collection.find() :: $exists clause true on field that does not exist", function() {
	buildUp();
	buildData();

	var result = user.find({doesNotExist: {
		$exists: true
	}});

	ok(result.length === 0, "Failed!");

	pullDown();
});

test("Collection.find() :: $exists clause true on field that does exist", function() {
	buildUp();
	buildData();

	user._debug = false;
	var result = user.find({onlyOne: {
		$exists: true
	}});
	user._debug = false;

	ok(result.length === 1, "Failed!");

	pullDown();
});

test("Collection.find() :: $exists clause false", function() {
	buildUp();
	buildData();

	user._debug = false;
	var result = user.find({doesNotExist: {
		$exists: false
	}});
	user._debug = false;

	ok(result.length === 3, "Failed!");

	pullDown();
});

test("Collection.find() :: $gt clause", function() {
	buildUp();
	buildData();

	var result = user.find({age: {
		$gt: 11
	}});

	ok(result.length === 2, "Failed!");

	pullDown();
});

test("Collection.find() :: $gte clause", function() {
	buildUp();
	buildData();

	var result = user.find({age: {
		$gte: 12
	}});

	ok(result.length === 2, "Failed!");

	pullDown();
});

test("Collection.find() :: $lt clause", function() {
	buildUp();
	buildData();

	var result = user.find({age: {
		$lt: 12
	}});

	ok(result.length === 1, "Failed!");

	pullDown();
});

test("Collection.find() :: $lte clause", function() {
	buildUp();
	buildData();

	var result = user.find({age: {
		$lte: 12
	}});

	ok(result.length === 2, "Failed!");

	pullDown();
});

test("Collection.find() :: $gt $lt clause combined", function() {
	buildUp();
	buildData();

	var result = user.find({age: {
		$lt: 13,
		$gt: 5
	}});

	ok(result.length === 1, "Failed!");

	pullDown();
});

test("Collection.find() :: $gte $lte clause combined", function() {
	buildUp();
	buildData();

	var result = user.find({age: {
		$lte: 13,
		$gte: 5
	}});

	ok(result.length === 2, "Failed!");

	pullDown();
});

test("Collection.find() :: $or clause", function() {
	buildUp();
	buildData();

	var result = user.find({
		$or: [{
			age: 15
		}, {
			name: 'Dean'
		}]
	});

	ok(result.length === 2, "Failed!");

	pullDown();
});

test("Collection.find() :: $and clause", function() {
	buildUp();
	buildData();

	var result = user.find({
		$and: [{
			age: 15
		}, {
			name: 'Jim'
		}]
	});

	ok(result.length === 1, "Failed!");

	pullDown();
});

test("Collection.find() :: Nested $or clause", function() {
	buildUp();
	buildData();

	var result = user.find({
		log: {
			$or: [{
				val: 1
			}, {
				val: 2
			}]
		}
	});

	ok(result.length === 2, "Failed!");

	pullDown();
});

test("Collection.update() :: arrayKey.$ Positional array selector", function() {
	buildUp();
	buildData();

	var before = user.find({
		"arr": {
			"_id": "lsd"
		}
	});
	
	ok(before.length === 1, "Failed in finding document to update!");
	
	var beforeValue;
	
	for (var i = 0; i < before[0].arr.length; i++) {
		if (before[0].arr[i]._id === 'lsd') {
			beforeValue = before[0].arr[i].val;
		}
	}
	
	ok(beforeValue === 1, "Failed in finding document to update!");
	
	var result = user.update({
		"arr": {
			"_id": "lsd"
		}
	}, {
		"arr.$": {
			val: 2
		}
	});

	ok(result.length === 1, "Failed to update document with positional data!");
	
	var after = user.find({
		"arr": {
			"_id": "lsd"
		}
	});
	
	var afterValue;
	
	for (var i = 0; i < after[0].arr.length; i++) {
		if (after[0].arr[i]._id === 'lsd') {
			afterValue = after[0].arr[i].val;
		}
	}
	
	ok(afterValue === 2, "Failed in finding document to update!");

	pullDown();
});

test("Collection.find() :: Options :: Single join", function() {
	buildUp();
	buildData();

	var result = user.find({}, {
		"join": [{
			"organisation": {
				"_id": "orgId",
				"$as": "org",
				"$require": true,
				"$multi": false
			}
		}]
	});
	
	ok(result[0].orgId === result[0].org._id, "Failed!");
	ok(result[1].orgId === result[1].org._id, "Failed!");
	ok(result[2].orgId === result[2].org._id, "Failed!");

	pullDown();
});

test("Collection.updateById() :: $push array operator", function() {
	buildUp();
	buildData();

	var before = user.findById("2");
	
	ok(before.arr.length === 2, "Failed!");
	
	var result = user.updateById("2", {
		"$push": {
			"arr": {
				_id: 'ahh',
				val: 8
			}
		}
	});
	
	var after = user.findById("2");
	
	ok(after.arr.length === 3, "Failed!");

	pullDown();
});

test("Collection.updateById() :: $pull array operator", function() {
	buildUp();
	buildData();

	var before = user.findById("2");
	
	ok(before.arr.length === 3, "Failed!");
	
	var result = user.updateById("2", {
		"$pull": {
			"arr": {
				_id: 'ahh'
			}
		}
	});
	
	var after = user.findById("2");
	
	ok(after.arr.length === 2, "Failed!");

	pullDown();
});

test("Collection.upsert() :: Insert on upsert call", function() {
	buildUp();
	buildData();

	var before = user.findById("1");

	ok(!before, "Failed!");

	var result = user.upsert(singleUserObject);

	ok(result.op === 'insert', "Failed!");

	var after = user.findById("1");

	ok(after, "Failed!");

	pullDown();
});

test("Collection.upsert() :: Update on upsert call", function() {
	buildUp();
	buildData();

	user.upsert(singleUserObject);
	var before = user.findById("1");

	ok(before, "Failed!");

	var copy = JSON.parse(JSON.stringify(singleUserObject));
	copy.updated = true;

	var result = user.upsert(copy);

	ok(result.op === 'update', "Failed!");

	var after = user.findById("1");

	ok(after.updated === true, "Failed!");

	pullDown();
});