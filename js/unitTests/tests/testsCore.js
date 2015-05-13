QUnit.module('Core');
QUnit.test("Init DB", function() {
	base.dbUp();

	ok(db instanceof ForerunnerDB, "Complete");

	base.dbDown();
});

QUnit.test("Drop DB", function() {
	base.dbUp();

	var coll = db.collection('test');
	coll.insert({moo: true});

	strictEqual(coll.find().length, 1, 'Check collection has been set up correctly');

	db.drop();

	var coll = db.collection('test');
	strictEqual(coll.find().length, 0, 'Check db had dropped collections');

	base.dbDown();
});

QUnit.test("DB.collection() :: Create Collection", function() {
	base.dbUp();

	user = db.collection('user');
	organisation = db.collection('organisation');
	ok(user !== undefined, "Complete");

	base.dbDown();
});

QUnit.test("Collection.setData() :: Single Document Object", function() {
	base.dbUp();

	user.setData(singleUserObject);
	ok(user.find({_id: '1'})[0], "Complete");
	strictEqual(user.find({_id: '1'})[0].name, 'Sam', "Complete");

	base.dbDown();
});

QUnit.test("Collection.update() :: Update a document", function() {
	base.dbUp();

	user.setData(singleUserObject);
	ok(user.find({_id: '1'})[0], "Doc exists");
	strictEqual(user.find({_id: '1'})[0].name, 'Sam', "Original value, Sam: " + user.find({_id: '1'})[0].name);

	user.update({
		_id: '1'
	}, {
		name: 'MooFoo'
	});

	ok(user.find({_id: '1'})[0], "Doc exists");
	strictEqual(user.find({_id: '1'})[0].name, 'MooFoo', "New value, MooFoo: " + user.find({_id: '1'})[0].name);

	base.dbDown();
});

QUnit.test("Collection.remove() :: Remove Single Document via Find", function() {
	base.dbUp();

	user.setData(singleUserObject);
	ok(user.find({_id: '1'})[0], "Complete");

	var result = user.remove({_id: '1'});
	ok(!user.find({moo: true})[0], "Complete");
	strictEqual(result.length, 1, "Complete");

	base.dbDown();
});

QUnit.test("Collection.setData() :: Multiple Documents via Array", function() {
	base.dbUp();
	base.dataUp();

	count = user.count();
	strictEqual(count, usersData.length, "Complete");
	ok(user.find({_id: '2'})[0], "Complete");
	strictEqual(user.find({_id: '2'})[0].name, 'Jim', "Complete");

	base.dbDown();
});

QUnit.test("Collection.remove() :: Remove Multiple Documents via Find Boolean", function() {
	base.dbUp();
	base.dataUp();

	var result = user.remove({lookup: true});
	ok(!user.find({_id: '2'})[0], "Complete");
	ok(!user.find({_id: '4'})[0], "Complete");
	strictEqual(result.length, 2, "Complete");
	base.dbDown();
});

QUnit.test("Collection.insert() :: Check Primary Key Violation is Working", function() {
	base.dbUp();
	base.dataUp();

	var count = user.count({lookup: true});

	user.remove({lookup: true});
	var result = user.insert(usersData);

	strictEqual(result.inserted.length, 2, "Complete");
	strictEqual(result.failed.length, count, "Complete");

	base.dbDown();
});

QUnit.test("Collection.setData() :: Multiple Records Re-Insert Data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.setData(usersData);
	count = user.count();
	strictEqual(count, usersData.length, "Complete");
	ok(user.find({_id: '2'})[0], "Complete");
	strictEqual(user.find({_id: '2'})[0].name, 'Jim', "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $exists clause true on field that does exist", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({name: {
		$exists: true
	}});

	strictEqual(result.length, 4, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $exists clause true on field that does not exist", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({doesNotExist: {
		$exists: true
	}});

	strictEqual(result.length, 0, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $exists clause true on field that does exist", function() {
	base.dbUp();
	base.dataUp();

	user._debug = false;
	var result = user.find({onlyOne: {
		$exists: true
	}});
	user._debug = false;

	strictEqual(result.length, 1, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $exists clause false", function() {
	base.dbUp();
	base.dataUp();

	user._debug = false;
	var result = user.find({doesNotExist: {
		$exists: false
	}});
	user._debug = false;

	strictEqual(result.length, 4, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $gt clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$gt: 11
	}});

	strictEqual(result.length, 2, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $gte clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$gte: 12
	}});

	strictEqual(result.length, 2, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $lt clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lt: 12
	}});

	strictEqual(result.length, 2, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $lte clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lte: 12
	}});

	strictEqual(result.length, 3, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $gt $lt clause combined", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lt: 13,
		$gt: 5
	}});

	strictEqual(result.length, 1, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $gte $lte clause combined", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lte: 13,
		$gte: 5
	}});

	strictEqual(result.length, 3, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $ne clause basic string", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$ne: 12
	}});

	strictEqual(result.length, 3, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Primary key string lookup", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: "2"
	});

	strictEqual(result.length, 1, "Check result count is as expected");

	base.dbDown();
});

QUnit.test("Collection.find() :: Regex lookup", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		name: /a/i
	});

	strictEqual(result.length, 3, "Check result count is as expected");

	base.dbDown();
});

QUnit.test("Collection.find() :: Primary key regex lookup", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: new RegExp('4', 'i')
	});

	strictEqual(result.length, 1, "Check result count is as expected");

	base.dbDown();
});

QUnit.test("Collection.find() :: $ne clause primary key object", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: {
			$ne: "2"
		}
	});

	strictEqual(result.length, 3, "Check result count is as expected");

	base.dbDown();
});

QUnit.test("Collection.find() :: $nin clause primary key object", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: {
			$nin: ["2", "3"]
		}
	});

	strictEqual(result.length, 2, "Check result count is as expected");

	base.dbDown();
});

QUnit.test("Collection.find() :: $in clause primary key object", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: {
			$in: ["2", "3", "5"]
		}
	});

	strictEqual(result.length, 3, "Check result count is as expected");

	base.dbDown();
});

QUnit.test("Collection.find() :: $or clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		$or: [{
			age: 15
		}, {
			name: 'Dean'
		}]
	});

	strictEqual(result.length, 3, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $and clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		$and: [{
			age: 15
		}, {
			name: 'Jim'
		}]
	});

	strictEqual(result.length, 1, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Nested $or clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		log: {
			$or: [{
				val: 1
			}, {
				val: 2
			}]
		}
	});

	strictEqual(result.length, 3, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: $in clause against root key data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		age: {
			$in: [
				5, 12
			]
		}
	});

	strictEqual(result.length, 3, "In returned correct number of results");
	strictEqual(result[0].name, 'Kat', "In returned expected result data");

	base.dbDown();
});

QUnit.test("Collection.find() :: $in clause against multi-level key data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		arr: {
			val: {
				$in: [
					2, 4
				]
			}
		}
	});

	strictEqual(result.length, 1, "In returned correct number of results");
	strictEqual(result[0].name, 'Jim', "In returned expected result data");

	base.dbDown();
});

QUnit.test("Collection.peek() :: Search collection for string", function() {
	base.dbUp();
	base.dataUp();

	var result = user.peek('anf');

	strictEqual(result.length, 1, "Got correct number of results");
	strictEqual(result[0].name, 'Jim', "Got expected result data");
	strictEqual(result[0]._id, '2', "Got expected result id");

	base.dbDown();
});

QUnit.test("DB.peek() :: Search all database collections for string", function() {
	base.dbUp();
	base.dataUp();

	var result = db.peek('an');

	strictEqual(result.length, 16, "Got correct number of results");
	strictEqual(result[0]._id, '2', "Got expected result id");
	strictEqual(result[1]._id, '4', "Got expected result id");
	strictEqual(result[2]._id, '5', "Got expected result id");

	base.dbDown();
});

QUnit.test("DB.peekCat() :: Search all database collections for string", function() {
	base.dbUp();
	base.dataUp();

	var result = db.peekCat('an');

	strictEqual(result.organisation && result.organisation.length, 13, "Got correct number of organisation results");
	strictEqual(result.user && result.user.length, 3, "Got correct number of user results");

	base.dbDown();
});

QUnit.test("Collection.find() :: $nin clause against root key data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		age: {
			$nin: [
				5, 12
			]
		}
	});

	strictEqual(result.length, 1, "Not in returned correct number of results");
	strictEqual(result[0].name, 'Jim', "Not in returned expected result data");

	base.dbDown();
});

QUnit.test("Collection.find() :: $nin clause against multi-level key data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		arr: {
			val: {
				$nin: [
					2, 4
				]
			}
		}
	});

	strictEqual(result.length, 3, "Not in returned correct number of results");
	strictEqual(result[0].name, 'Kat', "Not in returned expected result data");

	base.dbDown();
});

QUnit.test("Collection.update() :: arrayKey.$ Positional array selector", function() {
	base.dbUp();
	base.dataUp();

	var beforeAll = user.find();
	var beforeComparison = beforeAll[0].arr[1].val;

	var before = user.find({
		_id: '4',
		"arr": {
			"_id": "lsd"
		}
	});

	strictEqual(before.length, 1, "Failed in finding document to update!");

	var beforeValue,
		beforeNonChangingValue;

	for (var i = 0; i < before[0].arr.length; i++) {
		if (before[0].arr[i]._id === 'lsd') {
			beforeValue = before[0].arr[i].val;
		} else {
			beforeNonChangingValue = before[0].arr[i].val;
		}
	}

	strictEqual(beforeValue, 1, "Failed in finding document to update!");
	strictEqual(beforeNonChangingValue, 5, "Failed in finding document to update!");

	var result = user.update({
		_id: '4',
		"arr": {
			"_id": "lsd"
		}
	}, {
		"arr.$": {
			val: 2
		}
	});

	strictEqual(result.length, 1, "Failed to update document with positional data!");

	var afterAll = user.find();

	var afterComparison = afterAll[0].arr[1].val;
	var after = user.find({
		_id: '4',
		"arr": {
			"_id": "lsd"
		}
	});

	var afterValue,
		afterNonChangingValue;

	for (var i = 0; i < after[0].arr.length; i++) {
		if (after[0].arr[i]._id === 'lsd') {
			afterValue = after[0].arr[i].val;
		} else {
			afterNonChangingValue = before[0].arr[i].val;
		}
	}

	strictEqual(afterValue, 2, "Failed in finding document to update!");
	strictEqual(beforeNonChangingValue, afterNonChangingValue, "Update changed documents it should not have!");
	strictEqual(beforeComparison, afterComparison, "Update changed documents it should not have!");

	base.dbDown();
});

/*test("Collection.update() :: arrayKey.$ Positional array selector", function() {
	base.dbUp();
	base.dataUp();

	var coll = db.collection('test').truncate();

	coll.setData([{
		_id: 1,
		arr: [{
			_id: 1,
			name: 'A'
		}, {
			_id: 2,
			name: 'B'
		}]
	}, {
		_id: 2,
		arr: [{
			_id: 1,
			name: 'A'
		}, {
			_id: 2,
			name: 'B'
		}]
	}]);

	ok(true, "Test not yet written!");

	base.dbDown();
});*/

QUnit.test("Collection.update() :: $addToSet operator for unique push operation", function() {
	base.dbUp();
	base.dataUp();

	var temp = db.collection('temp').truncate(),
		updated,
		before;

	temp.insert({
		_id: '1',
		arr: []
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 0, "Check existing document count is correct");

	// Now push an entry into the array using $addToSet
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				name: 'Fufu'
			}
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 1, "Check updated document count is correct");
	strictEqual(updated.length, 1, "Check that the update operation returned correct count");

	// Now push the same entry into the array using $addToSet - this should fail
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				name: 'Fufu'
			}
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 1, "Check updated document count is correct");
	strictEqual(updated.length, 0, "Check that the update operation returned correct count");

	base.dbDown();
});

QUnit.test("Collection.update() :: $addToSet operator for unique push operation against a specific key path", function() {
	base.dbUp();
	base.dataUp();

	var temp = db.collection('temp').truncate(),
		updated,
		before;

	temp.insert({
		_id: '1',
		arr: []
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 0, "Check existing document count is correct");

	// Now push an entry into the array using $addToSet
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				name: 'Fufu',
				test: '1',
				moo: {
					foo: 1
				}
			}
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 1, "Check updated document count is correct");
	strictEqual(updated.length, 1, "Check that the update operation returned correct count");

	// Now push the same entry into the array using $addToSet but only checking against arr.test - this should pass
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				name: 'Fufu',
				test: '2',
				moo: {
					foo: 2
				}
			}
		}
	}, {
		$addToSet: {
			key: 'moo.foo'
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 2, "Check updated document count is correct");
	strictEqual(updated.length, 1, "Check that the update operation returned correct count");
	strictEqual(updated && updated[0] && updated[0].arr.length, 2, "Check that the update operation returned correct count");

	// Now push the same entry into the array using $addToSet but test against the "name" field, should fail
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				name: 'Fufu'
			}
		}
	}, {
		$addToSet: {
			key: 'name'
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 2, "Check updated document count is correct");
	strictEqual(updated.length, 0, "Check that the update operation returned correct count");

	base.dbDown();
});

QUnit.test("Collection.update() :: $addToSet operator for unique push operation against a specific key path using new $key", function() {
	base.dbUp();
	base.dataUp();

	var temp = db.collection('temp').truncate(),
		updated,
		before;

	temp.insert({
		_id: '1',
		arr: []
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 0, "Check existing document count is correct");

	// Now push an entry into the array using $addToSet
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				$key: 'moo.foo',
				name: 'Fufu',
				test: '1',
				moo: {
					foo: 1
				}
			}
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 1, "Check updated document count is correct");
	strictEqual(updated.length, 1, "Check that the update operation returned correct count");
	strictEqual(before[0].arr[0].$key, undefined, "Check that the $key property does not exist in the pushed object: " + before[0].arr[0].$key);

	// Now push the same entry into the array using $addToSet but only checking against moo.foo - this should pass
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				$key: 'moo.foo',
				name: 'Fufu',
				test: '2',
				moo: {
					foo: 2
				}
			}
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 2, "Check updated document count is correct");
	strictEqual(updated.length, 1, "Check that the update operation returned correct count");
	strictEqual(updated && updated[0] && updated[0].arr.length, 2, "Check that the update operation returned correct count");
	strictEqual(before[0].arr[1].$key, undefined, "Check that the $key property does not exist in the pushed object: " + before[0].arr[1].$key);

	// Now push the same entry into the array using $addToSet but test against the "name" field, should fail
	updated = temp.update({
		_id: '1'
	}, {
		$addToSet: {
			arr: {
				$key: 'name',
				name: 'Fufu'
			}
		}
	});

	before = temp.find();

	strictEqual(before.length === 1 && before[0].arr.length, 2, "Check updated document count is correct");
	strictEqual(updated.length, 0, "Check that the update operation returned correct count");

	base.dbDown();
});

QUnit.test("Collection.find() :: Value in array of strings", function() {
	base.dbUp();
	base.dataUp();

	//db._debug = true;
	var record = user.find({
		stringArr: 'moo'
	});
	db._debug = false;
	strictEqual(record.length, 1, "Failed in finding document to by string array value!");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Single join", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"$join": [{
			"organisation": {
				"_id": "orgId",
				"$as": "org",
				"$require": true,
				"$multi": false
			}
		}]
	});

	strictEqual(result[0].orgId, result[0].org._id, "Complete");
	strictEqual(result[1].orgId, result[1].org._id, "Complete");
	strictEqual(result[2].orgId, result[2].org._id, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Single join, array of ids", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"$join": [{
			"organisation": {
				"_id": "orgId",
				"$as": "org",
				"$require": true,
				"$multi": false
			}
		}, {
			"user": {
				"_id": "friends",
				"$as": "friendData",
				"$require": true,
				"$multi": true
			}
		}]
	});

	strictEqual(result[0].orgId, result[0].org._id, "Complete");
	strictEqual(result[1].orgId, result[1].org._id, "Complete");
	strictEqual(result[2].orgId, result[2].org._id, "Complete");

	strictEqual(result[0].friends[0], result[0].friendData[0]._id, "Complete");
	strictEqual(result[1].friends[0], result[1].friendData[0]._id, "Complete");
	strictEqual(result[2].friends[0], result[2].friendData[0]._id, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Multi join", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"$join": [{
			"user": {
				"_id": "friends",
				"$as": "friendData",
				"$require": true,
				"$multi": true
			}
		}]
	});

	strictEqual(result[0].friends[0], result[0].friendData[0]._id, "Complete");
	strictEqual(result[1].friends[0], result[1].friendData[0]._id, "Complete");
	strictEqual(result[2].friends[0], result[2].friendData[0]._id, "Complete");

	base.dbDown();
});

QUnit.test("Collection.update() :: $inc operator", function() {
	base.dbUp();
	
	var coll = db.collection('test');
	
	coll.setData([{
		_id: '1',
		remaining: 20
	}]);
	
	var before = coll.find()[0];
	
	strictEqual(before.remaining, 20, "Check initial numbers");
	
	coll.update({
		_id: "1"
	}, {
		$inc: {
			remaining: -1
		} 
	});

	var after = coll.find()[0];
	
	strictEqual(after.remaining, 19, "Check final numbers");

	base.dbDown();
});

QUnit.test("Collection.update() :: $inc operator advanced", function() {
	base.dbUp();
	
	var coll = db.collection('test');
	
	coll.setData([{
		_id: '1',
		remaining: 20,
		purchased: 0,
		likes: [{
			_id: 'jimjonjibbajabba@gmail.com',
			likeCount: 0,
			unLikeCount: 10
		}, {
			_id: 'billbradleybonnington@gmail.com',
			likeCount: 12,
			unLikeCount: 6
		}]
	}]);
	
	var before = coll.find()[0];
	
	strictEqual(before.remaining, 20, "Check initial numbers");
	strictEqual(before.purchased, 0, "Check initial numbers");
	strictEqual(before.likes[0].likeCount, 0, "Check initial numbers");
	strictEqual(before.likes[0].unLikeCount, 10, "Check initial numbers");
	
	coll.update({
		_id: "1",
		likes: {
			_id: "jimjonjibbajabba@gmail.com"
		}
	}, {
		$inc: {
			purchased: 1,
			remaining: -1,
			"likes.$": {
				likeCount: 1,
				unLikeCount: -3
			}
		}
	});

	var after = coll.find()[0];
	
	strictEqual(after.remaining, 19, "Check final numbers");
	strictEqual(after.purchased, 1, "Check final numbers");
	strictEqual(after.likes[0].likeCount, 1, "Check final numbers");
	strictEqual(after.likes[0].unLikeCount, 7, "Check final numbers");

	base.dbDown();
});

QUnit.test("Collection.updateById() :: $push array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	strictEqual(before.arr.length, 2, "Complete");

	var result = user.updateById("2", {
		"$push": {
			"arr": {
				_id: 'ahh',
				val: 8
			}
		}
	});

	var after = user.findById("2");

	strictEqual(after.arr.length, 3, "Complete");

	base.dbDown();
});

QUnit.test("Collection.update() :: $push array operator with $each modifier", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	strictEqual(before.friends.length, 2, "Check for correct initial array length");
	strictEqual(before.friends[0] === "3" && before.friends[1], "4", "Check for correct initial values");

	var result = user.update({
		_id: "2"
	}, {
		"$push": {
			"friends": {
				"$each": ["6", "8"]
			}
		}
	});

	var after = user.findById("2");

	strictEqual(after.friends.length, 4, "Check for correct new array length");
	strictEqual(after.friends[0] === "3" && after.friends[1] === "4" && after.friends[2] === "6" && after.friends[3], "8", "Check for correct new values");

	base.dbDown();
});

QUnit.test("Collection.update() :: $push array operator with $each and $position modifier", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	strictEqual(before.friends.length, 2, "Check for correct initial array length");
	strictEqual(before.friends[0] === "3" && before.friends[1], "4", "Check for correct initial values");

	var result = user.update({
		_id: "2"
	}, {
		"$push": {
			"friends": {
				"$each": ["6", "8"],
				"$position": 1
			}
		}
	});

	var after = user.findById("2");

	strictEqual(after.friends.length, 4, "Check for correct new array length");
	strictEqual(after.friends[0] === "3" && after.friends[1] === "6" && after.friends[2] === "8" && after.friends[3], "4", "Check for correct new values");

	base.dbDown();
});

QUnit.test("Collection.update() :: $push array operator to undefined field (should assign new array to field)", function() {
	base.dbUp();
	
	var coll = db.collection('test');
	coll.setData([{
		_id: 'fooItem',
		name: 'foo'
	}]);

	coll.update({
		_id: "fooItem"
	}, {
		"$push": {
			"arr": {
				_id: 'ahh',
				val: 8
			}
		}
	});

	var after = coll.findById("fooItem");

	strictEqual(after.arr instanceof Array && after.arr.length, 1, "Complete");

	base.dbDown();
});

QUnit.test("Collection.update() :: $each, $cast and $push array operator to undefined multiple nested fields (should assign new array to field)", function() {
	base.dbUp();

	var coll = db.collection('test');
	coll.setData([{
		_id: 'fooItem',
		name: 'foo'
	}]);

	coll.update({
		_id: "fooItem"
	}, {
		"$each": [{
			"$cast": {
				"arr": "array",
				$data: [{}]
			}
		}, {
			"arr": {
				"$cast": {
					"secondArr": "array"
				}
			}
		}, {
			"arr": {
				$push: {
					"secondArr": {
						_id: 'ahh',
						val: 8
					}
				}
			}
		}]
	});

	var after = coll.findById("fooItem");

	ok(after.arr && after.arr[0] && after.arr[0].secondArr && after.arr[0].secondArr.length === 1, 'Nested push created multiple arrays correctly');

	base.dbDown();
});

QUnit.test("Collection.update() :: $splicePush array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	strictEqual(before.friends.length, 2, "Check for correct initial array length");
	strictEqual(before.friends[0] === "3" && before.friends[1], "4", "Check for correct initial values");

	var result = user.updateById("2", {
		"$splicePush": {
			"friends": "6",
			"$index": 1
		}
	});

	var after = user.findById("2");
	
	strictEqual(after.friends.length, 3, "Check for correct new array length");
	strictEqual(after.friends[0] === "3" && after.friends[1] === "6" && after.friends[2], "4", "Check for correct new values");

	base.dbDown();
});

QUnit.test("Collection.update() :: $move array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	strictEqual(before.friends.length, 2, "Check for correct initial array length");
	strictEqual(before.friends[0] === "3" && before.friends[1], "4", "Check for correct initial values");

	var result = user.updateById("2", {
		"$move": {
			"friends": "3",
			"$index": 1
		}
	});

	var after = user.findById("2");

	strictEqual(after.friends.length, 2, "Check for correct new array length");
	strictEqual(after.friends[0] === "4" && after.friends[1], "3", "Check for correct new values");

	base.dbDown();
});

/*test("Collection.update() :: $splicePush into empty array with incorrect index", function() {
	base.dbUp();
	base.dataUp();

	var coll = db.collection('test').setData({});
	coll.insert({
		_id: '1',
		arr: []
	});

	var result = user.update({
		_id: "1"
	}, {
		"$splicePush": {
			"arr": {
				name: 'testObj'
			},
			"$index": 1
		}
	});

	var after = coll.findById("1");

	strictEqual(after.arr.length, 1, "Check for correct new array length");
	strictEqual(after.arr[0].name, "testObj", "Check for correct new values");

	base.dbDown();
});*/

QUnit.test("Collection.updateById() :: $pull array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	strictEqual(before.arr.length, 2, "Complete");

	var result = user.updateById("2", {
		"$pull": {
			"arr": {
				_id: 'lsd'
			}
		}
	});

	var after = user.findById("2");

	strictEqual(after.arr.length, 1, "Complete");

	base.dbDown();
});

QUnit.test("Collection.updateById() :: $pullAll array operator", function() {
	base.dbUp();

	var coll = db.collection('test');
	coll.setData({
		_id: "1",
		arr: [0, 1, 2, 3, 0, 1, 2, 3, 5, 4, 3, 2, 1]
	});

	var before = coll.findById("1");

	strictEqual(before.arr.length, 13, "Complete");

	var result = coll.updateById("1", {
		"$pullAll": {
			"arr": [0, 4, 3]
		}
	});

	var after = coll.findById("1");

	strictEqual(after.arr.length, 8, "Complete");

	base.dbDown();
});

QUnit.test("Collection.update() :: $mul operator", function() {
	base.dbUp();
	
	var coll = db.collection('test');
	
	coll.setData([{
		_id: '1',
		remaining: 20
	}]);
	
	var before = coll.find()[0];
	
	strictEqual(before.remaining, 20, "Check initial numbers");
	
	coll.update({
		_id: "1"
	}, {
		$mul: {
			remaining: 1.5
		} 
	});

	var after = coll.find()[0];
	
	strictEqual(after.remaining, 30, "Check final numbers");

	base.dbDown();
});

QUnit.test("Collection.update() :: $rename operator", function() {
	base.dbUp();

	var coll = db.collection('test');

	coll.setData([{
		_id: '1',
		remaining: 20
	}]);

	var before = coll.find()[0];

	strictEqual(before.remaining, 20, "Check initial numbers");

	coll.update({
		_id: "1"
	}, {
		$rename: {
			remaining: 'upstarted'
		}
	});

	var after = coll.find()[0];

	strictEqual(after.remaining, undefined, "Check final properties");
	strictEqual(after.upstarted, 20, "Check final properties");

	base.dbDown();
});

QUnit.test("Collection.update() :: $unset operator", function() {
	base.dbUp();

	var coll = db.collection('test');

	coll.setData([{
		_id: '1',
		remaining: 20
	}]);

	var before = coll.find()[0];

	strictEqual(before.remaining, 20, "Check initial numbers");

	coll.update({
		_id: "1"
	}, {
		$unset: {
			remaining: 1
		}
	});

	var after = coll.find()[0];

	strictEqual(after.remaining, undefined, "Check final properties");

	base.dbDown();
});

QUnit.test("Collection.update() :: $unset operator inside sub-array", function() {
	base.dbUp();

	var coll = db.collection('test');

	coll.setData([{
		_id: '1',
		arr: [{
			_id: 22,
			remaining: 20,
			count: 10
		}, {
			_id: 33,
			remaining: 15,
			count: 7
		}]
	}]);

	var before = coll.find()[0];

	strictEqual(before.arr[0].remaining, 20, "Check initial numbers");
	strictEqual(before.arr[1].remaining, 15, "Check initial numbers");

	coll.update({
		_id: "1",
		arr: {
			_id: 22
		}
	}, {
		"arr.$": {
			$unset: {
				remaining: 1
			}
		}
	});

	var after = coll.find()[0];

	strictEqual(after.arr[0].remaining, undefined, "Check final properties");
	strictEqual(after.arr[1].remaining, 15, "Check final properties");

	base.dbDown();
});

QUnit.test("Collection.upsert() :: Insert on upsert call", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("1");

	ok(!before, "Complete");

	var result = user.upsert(singleUserObject);

	strictEqual(result.op, 'insert', "Complete");

	var after = user.findById("1");

	ok(after, "Complete");

	base.dbDown();
});

QUnit.test("Collection.upsert() :: Update on upsert call", function() {
	base.dbUp();
	base.dataUp();

	user.upsert(singleUserObject);
	var before = user.findById("1");

	ok(before, "Complete");

	var copy = JSON.parse(JSON.stringify(singleUserObject));
	copy.updated = true;

	var result = user.upsert(copy);

	strictEqual(result && result.op, 'update', "Complete");

	var after = user.findById("1");

	strictEqual(after && after.updated, true, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Single Sort Argument, Ascending", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"$orderBy": {
			"name": 1
		}
	});

	strictEqual(result[0].name, 'Dean', "Complete");
	strictEqual(result[1].name, 'Dean', "Complete");
	strictEqual(result[2].name, 'Jim', "Complete");
	strictEqual(result[3].name, 'Kat', "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Single Sort Argument, Descending", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"$orderBy": {
			"name": -1
		}
	});

	strictEqual(result[0].name, 'Kat', "Complete");
	strictEqual(result[1].name, 'Jim', "Complete");
	strictEqual(result[2].name, 'Dean', "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Multi Sort Arguments (2 arguments), Ascending, Ascending", function() {
	base.dbUp();
	base.dataUp();

	var result = organisation.find({
		"$or": [{
			"industry": "construction"
		}, {
			"industry": "it"
		}]
	}, {
		"$orderBy": {
			"industry": 1,
			"profit": 1
		}
	});

	strictEqual(result[0].industry === 'construction' && result[0].profit, 27, "Complete");
	strictEqual(result[1].industry === 'construction' && result[1].profit, 45, "Complete");
	strictEqual(result[2].industry === 'construction' && result[2].profit, 340, "Complete");
	strictEqual(result[3].industry === 'construction' && result[3].profit, 664, "Complete");
	strictEqual(result[4].industry === 'construction' && result[4].profit, 980, "Complete");

	strictEqual(result[5].industry === 'it' && result[5].profit, 135, "Complete");
	strictEqual(result[6].industry === 'it' && result[6].profit, 135, "Complete");
	strictEqual(result[7].industry === 'it' && result[7].profit, 135, "Complete");

	strictEqual(result[8].industry === 'it' && result[8].profit, 200, "Complete");
	strictEqual(result[9].industry === 'it' && result[9].profit, 780, "Complete");

	strictEqual(result[10].industry === 'it' && result[10].profit, 1002, "Complete");
	strictEqual(result[11].industry === 'it' && result[11].profit, 1002, "Complete");
	strictEqual(result[12].industry === 'it' && result[12].profit, 1002, "Complete");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Multi Sort Arguments (3 arguments), Ascending, Ascending, Ascending", function() {
	base.dbUp();
	base.dataUp();

	var result = organisation.find({
		"$or": [{
			"industry": "construction"
		}, {
			"industry": "it"
		}]
	}, {
		"$orderBy": {
			"industry": 1,
			"profit": 1,
			"type": 1
		}
	});

	strictEqual(result[0].industry === 'construction' && result[0].profit, 27, "Profit");
	strictEqual(result[1].industry === 'construction' && result[1].profit, 45, "Profit");
	strictEqual(result[2].industry === 'construction' && result[2].profit, 340, "Profit");
	strictEqual(result[3].industry === 'construction' && result[3].profit, 664, "Profit");
	strictEqual(result[4].industry === 'construction' && result[4].profit, 980, "Profit");

	strictEqual(result[5].industry === 'it' && result[5].profit === 135 && result[5].type, 'beta', "Profit and Type");
	strictEqual(result[6].industry === 'it' && result[6].profit === 135 && result[6].type, 'cappa', "Profit and Type");
	strictEqual(result[7].industry === 'it' && result[7].profit === 135 && result[7].type, 'delta', "Profit and Type");

	strictEqual(result[8].industry === 'it' && result[8].profit === 200 && result[8].type, 'alpha', "Profit and Type");
	strictEqual(result[9].industry === 'it' && result[9].profit === 780 && result[9].type, 'cappa', "Profit and Type");

	strictEqual(result[10].industry === 'it' && result[10].profit === 1002 && result[10].type, 'alpha', "Profit and Type");
	strictEqual(result[11].industry === 'it' && result[11].profit === 1002 && result[11].type, 'gamma', "Profit and Type");
	strictEqual(result[12].industry === 'it' && result[12].profit === 1002 && result[12].type, 'xray', "Profit and Type");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Multi Sort Arguments (3 arguments), Ascending, Ascending, Descending", function() {
	base.dbUp();
	base.dataUp();

	var result = organisation.find({
		"$or": [{
			"industry": "construction"
		}, {
			"industry": "it"
		}]
	}, {
		"$orderBy": {
			"industry": 1,
			"profit": 1,
			"type": -1
		}
	});

	strictEqual(result[0].industry === 'construction' && result[0].profit, 27, "Profit");
	strictEqual(result[1].industry === 'construction' && result[1].profit, 45, "Profit");
	strictEqual(result[2].industry === 'construction' && result[2].profit, 340, "Profit");
	strictEqual(result[3].industry === 'construction' && result[3].profit, 664, "Profit");
	strictEqual(result[4].industry === 'construction' && result[4].profit, 980, "Profit");

	strictEqual(result[5].industry === 'it' && result[5].profit === 135 && result[5].type, 'delta', "Profit and Type");
	strictEqual(result[6].industry === 'it' && result[6].profit === 135 && result[6].type, 'cappa', "Profit and Type");
	strictEqual(result[7].industry === 'it' && result[7].profit === 135 && result[7].type, 'beta', "Profit and Type");

	strictEqual(result[8].industry === 'it' && result[8].profit === 200 && result[8].type, 'alpha', "Profit and Type");
	strictEqual(result[9].industry === 'it' && result[9].profit === 780 && result[9].type, 'cappa', "Profit and Type");

	strictEqual(result[10].industry === 'it' && result[10].profit === 1002 && result[10].type, 'xray', "Profit and Type");
	strictEqual(result[11].industry === 'it' && result[11].profit === 1002 && result[11].type, 'gamma', "Profit and Type");
	strictEqual(result[12].industry === 'it' && result[12].profit === 1002 && result[12].type, 'alpha', "Profit and Type");

	base.dbDown();
});

QUnit.test("Collection.find() :: Options :: Multi Sort Arguments (2 arguments), Descending, Descending with Numbers and Booleans", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({

	}, {
		"$orderBy": {
			"lookup": 1,
			"age": 1
		}
	});

	strictEqual(result[0].name === 'Dean' && result[0].lookup, false, "Name and Lookup");
	strictEqual(result[1].name === 'Kat' && result[1].lookup, false, "Name and Lookup");
	strictEqual(result[2].name === 'Dean' && result[1].lookup, false, "Name and Lookup");
	strictEqual(result[3].name === 'Jim' && result[2].lookup, true, "Name and Lookup");

	base.dbDown();
});

QUnit.test("Collection.setData() :: Drop a collection and then set data against it", function() {
	base.dbUp();

	var coll = db.collection('test');

	coll.setData([{'test': 1}]);

	strictEqual(coll.find()[0].test, 1, 'Check data inserted correctly');

	coll.drop();

	coll = undefined;

	var coll = db.collection('test');

	coll.setData([{'test': 1}]);

	strictEqual(coll.find()[0].test, 1, 'Check data inserted correctly');

	base.dbDown();
});

QUnit.test("Collection.find() :: $distinct clause", function() {
	base.dbUp();

	var coll = db.collection('test').truncate(),
		result;

	coll.setData([{'test': 1}, {'test': 1}, {'test': 2}]);

	strictEqual(coll.find().length, 3, 'Check data inserted correctly');

	// Run distinct query
	result = coll.find({
		$distinct: {
			test: 1
		}
	});

	strictEqual(result.length, 2, 'Check correct $distinct query result number');
	strictEqual(result[0].test, 1, 'Check correct result 1');
	strictEqual(result[1].test, 2, 'Check correct result 2');

	base.dbDown();
});

QUnit.test("Collection.find() :: // Comment properties", function() {
	base.dbUp();

	var coll = db.collection('test').truncate(),
		result;

	coll.setData([{'test': 1}, {'test': 1}, {'test': 2}]);

	strictEqual(coll.find().length, 3, 'Check data inserted correctly');

	// Run distinct query
	result = coll.find({
		'test': 1,
		'//myData': {
			'someVal': 'moo'
		}
	});

	strictEqual(result.length, 2, 'Check correct result number');

	base.dbDown();
});

QUnit.test('Collection.find() :: $orderBy with blank object', function () {
	base.dbUp();

	var coll = db.collection('test');

	try {
		coll.find({}, {
			$orderBy: {}
		});

		err = false;
	} catch (e) {
		err = true;
	}

	strictEqual(err, true, 'The call produced no error');

	base.dbDown();
});

QUnit.test('Collection.find() :: $elemMatch projection', function () {
	base.dbUp();

	var coll = db.collection('test'),
		result;

	coll.setData([{
		names: [{
			text: 'Jim',
			index: 1
		}, {
			text: 'Bill',
			index: 2
		}, {
			text: 'Carry',
			index: 2
		}, {
			text: 'Jill',
			index: 3
		}, {
			text: 'Tim',
			index: 3
		}, {
			text: 'John',
			index: 1
		}]
	}, {
		names: [{
			text: 'Tim',
			index: 1
		}, {
			text: 'Axel',
			index: 2
		}, {
			text: 'Carry',
			index: 2
		}, {
			text: 'Uber',
			index: 3
		}, {
			text: 'Tim',
			index: 3
		}, {
			text: 'Kiki',
			index: 1
		}]
	}]);

	result = coll.find({}, {
		$elemMatch: {
			names: {
				text: 'Tim'
			}
		}
	});

	// $elemMatch matches ONLY the first item so results should always only
	// contain the first result that matches
	strictEqual(result[0].names.length, 1, 'Result 1 names were projected correctly');
	strictEqual(result[1].names.length, 1, 'Result 2 names were projected correctly');

	strictEqual(result[0].names[0].text, 'Tim', 'Result 1 name is correct');
	strictEqual(result[1].names[0].text, 'Tim', 'Result 2 name is correct');

	result = coll.find({}, {
		$elemMatch: {
			names: {
				index: {
					$gt: 1
				}
			}
		}
	});

	strictEqual(result[0].names.length, 1, 'Result 1 names were projected correctly');
	strictEqual(result[1].names.length, 1, 'Result 2 names were projected correctly');

	strictEqual(result[0].names[0].text, 'Bill', 'Result 1 name is correct');
	strictEqual(result[1].names[0].text, 'Axel', 'Result 2 name is correct');

	base.dbDown();
});

QUnit.test('Collection.find() :: $elemsMatch projection', function () {
	base.dbUp();

	var coll = db.collection('test'),
		result,
		i, j;

	coll.setData([{
		names: [{
			text: 'Jim',
			index: 1
		}, {
			text: 'Bill',
			index: 2
		}, {
			text: 'Carry',
			index: 2
		}, {
			text: 'Jill',
			index: 3
		}, {
			text: 'Tim',
			index: 3
		}, {
			text: 'John',
			index: 1
		}]
	}, {
		names: [{
			text: 'Tim',
			index: 1
		}, {
			text: 'Axel',
			index: 2
		}, {
			text: 'Carry',
			index: 2
		}, {
			text: 'Uber',
			index: 3
		}, {
			text: 'Tim',
			index: 3
		}, {
			text: 'Kiki',
			index: 1
		}]
	}]);

	result = coll.find({}, {
		$elemsMatch: {
			names: {
				text: 'Tim'
			}
		}
	});

	strictEqual(result[0].names.length, 1, 'Result 1 names were projected correctly');
	strictEqual(result[1].names.length, 2, 'Result 2 names were projected correctly');

	strictEqual(result[0].names[0].text, 'Tim', 'Result 1 name is correct');
	strictEqual(result[1].names[0].text, 'Tim', 'Result 2 name is correct');
	strictEqual(result[1].names[1].text, 'Tim', 'Result 3 name is correct');

	result = coll.find({}, {
		$elemsMatch: {
			names: {
				index: {
					$gt: 1
				}
			}
		}
	});

	strictEqual(result[0].names.length, 4, 'Result 1 names were projected correctly');
	strictEqual(result[1].names.length, 4, 'Result 2 names were projected correctly');

	for (i = 0; i < result.length; i++) {
		for (j = 0; j < result[i].names.length; j++) {
			ok(result[i].names[j].index > 1, 'Result ' + i + ' index ' + j + ' is correct');
		}
	}

	base.dbDown();
});

QUnit.test('Collection.find() :: Return field selection', function () {
	base.dbUp();

	var coll = db.collection('test'),
		result,
		i, j;

	coll.setData([{
		text: 'Jim',
		index: 1
	}, {
		text: 'Bill',
		index: 2
	}, {
		text: 'Carry',
		index: 2
	}, {
		text: 'Jill',
		index: 3
	}, {
		text: 'Tim',
		index: 3
	}, {
		text: 'John',
		index: 1
	}, {
		text: 'Tim',
		index: 1
	}, {
		text: 'Axel',
		index: 2
	}, {
		text: 'Carry',
		index: 2
	}, {
		text: 'Uber',
		index: 3
	}, {
		text: 'Tim',
		index: 3
	}, {
		text: 'Kiki',
		index: 1
	}]);

	result = coll.find({}, {
		text: 1
	});

	strictEqual(typeof result[0]._id, 'string', 'Primary key exists in return fields');
	strictEqual(typeof result[0].text, 'string', 'Text key exists in return fields');
	strictEqual(typeof result[0].index, 'undefined', 'Index key does not exist in return fields');

	result = coll.find({}, {
		index: 1
	});

	strictEqual(typeof result[0]._id, 'string', 'Primary key exists in return fields');
	strictEqual(typeof result[0].text, 'undefined', 'Text key exists in return fields');
	strictEqual(typeof result[0].index, 'number', 'Index key exists in return fields');

	result = coll.find({}, {
		index: 1,
		_id: 0
	});

	strictEqual(typeof result[0]._id, 'undefined', 'Primary key exists in return fields');
	strictEqual(typeof result[0].text, 'undefined', 'Text key exists in return fields');
	strictEqual(typeof result[0].index, 'number', 'Index key exists in return fields');

	result = coll.find({}, {
		_id: 0
	});

	strictEqual(typeof result[0]._id, 'undefined', 'Primary key exists in return fields');
	strictEqual(typeof result[0].text, 'string', 'Text key exists in return fields');
	strictEqual(typeof result[0].index, 'number', 'Index key exists in return fields');

	base.dbDown();
});

QUnit.test('Collection.collateAdd() :: Add a few collections and test collation functionality', function () {
	base.dbUp();
	base.dataUp();

	var parent = db.collection('parent');

	parent.collateAdd(user, function (packet) {
		"use strict";
		strictEqual(packet.type, 'insert', 'Collation system received insert correctly');
	});

	user.insert(singleUserObject);

	base.dbDown();
});

QUnit.test('Collection.odm() :: Walk a document management object', function () {
	"use strict";
	base.dbUp();

	var coll = db.collection('test'),
		collOdm,
		result;

	coll.setData({
		_id: '3',
		name: 'Kat',
		age: 12,
		lookup: false,
		arr: [{
			_id: 'zke',
			val: 1
		}, {
			_id: 'zjs',
			val: 5,
			comments: [{
				_id: "1",
				msg: "hello"
			}, {
				_id: "2",
				msg: "goodbye"
			}]
		}],
		stringArr: [
			"goo",
			"joo"
		],
		log: {
			val: 1
		},
		orgId: "2",
		friends: ["2"]
	});

	collOdm = coll.odm();

	collOdm
		.$("_id", "3")
		.$("arr", {"_id": "zjs"})
		.$("comments", {"_id": "1"})
		//.$("comments")
		.prop("msg", "My comment has been updated");

	result = coll.find();

	strictEqual(result[0].arr[1].comments[0].msg, "My comment has been updated", 'Comment updated successfully via ODM');

	base.dbDown();
});

QUnit.test('Collection.update() :: Use $overwrite to set a property value', function () {
	"use strict";
	base.dbUp();

	var coll = db.collection('test'),
		result;

	coll.setData({
		_id: '3',
		name: 'Kat',
		age: 12,
		lookup: false,
		arr: [{
			_id: 'zke',
			val: 1
		}]
	});

	result = coll.find();

	strictEqual(result[0].arr[0].val, 1, 'Data exists as expected before update');

	coll.update({}, {$overwrite: {
		arr: {moo: 1}
	}});

	result = coll.find();

	strictEqual(result[0].arr.moo, 1, 'Data exists as expected after update');

	base.dbDown();
});
