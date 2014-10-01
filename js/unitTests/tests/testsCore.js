test("Core - Init DB", function() {
	base.dbUp();

	ok(db instanceof ForerunnerDB, "Complete");

	base.dbDown();
});

test("Core - DB.collection() :: Create Collection", function() {
	base.dbUp();

	user = db.collection('user');
	organisation = db.collection('organisation');
	ok(user !== undefined, "Complete");

	base.dbDown();
});

test("Core - Collection.setData() :: Single Document Object", function() {
	base.dbUp();

	user.setData(singleUserObject);
	ok(user.find({_id: '1'})[0], "Complete");
	ok(user.find({_id: '1'})[0].name === 'Sam', "Complete");

	base.dbDown();
});

test("Core - Collection.remove() :: Remove Single Document via Find", function() {
	base.dbUp();

	user.setData(singleUserObject);
	ok(user.find({_id: '1'})[0], "Complete");

	var result = user.remove({_id: '1'});
	ok(!user.find({moo: true})[0], "Complete");
	ok(result.length === 1, "Complete");

	base.dbDown();
});

test("Core - Collection.setData() :: Multiple Documents via Array", function() {
	base.dbUp();
	base.dataUp();

	count = user.count();
	ok(count === usersData.length, "Complete");
	ok(user.find({_id: '2'})[0], "Complete");
	ok(user.find({_id: '2'})[0].name === 'Jim', "Complete");

	base.dbDown();
});

test("Core - Collection.remove() :: Remove Multiple Documents via Find Boolean", function() {
	base.dbUp();
	base.dataUp();

	var result = user.remove({lookup: true});
	ok(!user.find({_id: '2'})[0], "Complete");
	ok(!user.find({_id: '4'})[0], "Complete");
	ok(result.length === 2, "Complete");
	base.dbDown();
});

test("Core - Collection.insert() :: Check Primary Key Violation is Working", function() {
	base.dbUp();
	base.dataUp();

	var count = user.count({lookup: true});

	user.remove({lookup: true});
	var result = user.insert(usersData);

	ok(result.inserted.length === 2, "Complete");
	ok(result.failed.length === count, "Complete");

	base.dbDown();
});

test("Core - Collection.setData() :: Multiple Records Re-Insert Data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.setData(usersData);
	count = user.count();
	ok(count === usersData.length, "Complete");
	ok(user.find({_id: '2'})[0], "Complete");
	ok(user.find({_id: '2'})[0].name === 'Jim', "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $exists clause true on field that does exist", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({name: {
		$exists: true
	}});

	ok(result.length === 4, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $exists clause true on field that does not exist", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({doesNotExist: {
		$exists: true
	}});

	ok(result.length === 0, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $exists clause true on field that does exist", function() {
	base.dbUp();
	base.dataUp();

	user._debug = false;
	var result = user.find({onlyOne: {
		$exists: true
	}});
	user._debug = false;

	ok(result.length === 1, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $exists clause false", function() {
	base.dbUp();
	base.dataUp();

	user._debug = false;
	var result = user.find({doesNotExist: {
		$exists: false
	}});
	user._debug = false;

	ok(result.length === 4, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $gt clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$gt: 11
	}});

	ok(result.length === 2, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $gte clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$gte: 12
	}});

	ok(result.length === 2, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $lt clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lt: 12
	}});

	ok(result.length === 2, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $lte clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lte: 12
	}});

	ok(result.length === 3, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $gt $lt clause combined", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lt: 13,
		$gt: 5
	}});

	ok(result.length === 1, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $gte $lte clause combined", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$lte: 13,
		$gte: 5
	}});

	ok(result.length === 3, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $ne clause basic string", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({age: {
		$ne: 12
	}});

	ok(result.length === 3, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Primary key string lookup", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: "2"
	});

	ok(result.length === 1, "Check result count is as expected");

	base.dbDown();
});

test("Core - Collection.find() :: Regex lookup", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		name: /a/i
	});

	ok(result.length === 3, "Check result count is as expected");

	base.dbDown();
});

test("Core - Collection.find() :: Primary key regex lookup", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: new RegExp('4', 'i')
	});

	ok(result.length === 1, "Check result count is as expected");

	base.dbDown();
});

test("Core - Collection.find() :: $ne clause primary key object", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: {
			$ne: "2"
		}
	});

	ok(result.length === 3, "Check result count is as expected");

	base.dbDown();
});

test("Core - Collection.find() :: $nin clause primary key object", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: {
			$nin: ["2", "3"]
		}
	});

	ok(result.length === 2, "Check result count is as expected");

	base.dbDown();
});

test("Core - Collection.find() :: $in clause primary key object", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		_id: {
			$in: ["2", "3", "5"]
		}
	});

	ok(result.length === 3, "Check result count is as expected");

	base.dbDown();
});

test("Core - Collection.find() :: $or clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		$or: [{
			age: 15
		}, {
			name: 'Dean'
		}]
	});

	ok(result.length === 3, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $and clause", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		$and: [{
			age: 15
		}, {
			name: 'Jim'
		}]
	});

	ok(result.length === 1, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Nested $or clause", function() {
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

	ok(result.length === 3, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: $in clause against root key data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		age: {
			$in: [
				5, 12
			]
		}
	});

	ok(result.length === 3, "In returned correct number of results");
	ok(result[0].name === 'Kat', "In returned expected result data");

	base.dbDown();
});

test("Core - Collection.find() :: $in clause against multi-level key data", function() {
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

	ok(result.length === 1, "In returned correct number of results");
	ok(result[0].name === 'Jim', "In returned expected result data");

	base.dbDown();
});

test("Core - Collection.peek() :: Search collection for string", function() {
	base.dbUp();
	base.dataUp();

	var result = user.peek('anf');

	ok(result.length === 1, "Got correct number of results");
	ok(result[0].name === 'Jim', "Got expected result data");
	ok(result[0]._id === '2', "Got expected result id");

	base.dbDown();
});

test("Core - DB.peek() :: Search all database collections for string", function() {
	base.dbUp();
	base.dataUp();

	var result = db.peek('an');

	ok(result.length === 16, "Got correct number of results");
	ok(result[0]._id === '2', "Got expected result id");
	ok(result[1]._id === '4', "Got expected result id");
	ok(result[2]._id === '5', "Got expected result id");

	base.dbDown();
});

test("Core - DB.peekCat() :: Search all database collections for string", function() {
	base.dbUp();
	base.dataUp();

	var result = db.peekCat('an');

	ok(result.organisation && result.organisation.length === 13, "Got correct number of organisation results");
	ok(result.user && result.user.length === 3, "Got correct number of user results");

	base.dbDown();
});

test("Core - Collection.find() :: $nin clause against root key data", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({
		age: {
			$nin: [
				5, 12
			]
		}
	});

	ok(result.length === 1, "Not in returned correct number of results");
	ok(result[0].name === 'Jim', "Not in returned expected result data");

	base.dbDown();
});

test("Core - Collection.find() :: $nin clause against multi-level key data", function() {
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

	ok(result.length === 3, "Not in returned correct number of results");
	ok(result[0].name === 'Kat', "Not in returned expected result data");

	base.dbDown();
});

test("Core - Collection.update() :: arrayKey.$ Positional array selector", function() {
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

	ok(before.length === 1, "Failed in finding document to update!");

	var beforeValue,
		beforeNonChangingValue;

	for (var i = 0; i < before[0].arr.length; i++) {
		if (before[0].arr[i]._id === 'lsd') {
			beforeValue = before[0].arr[i].val;
		} else {
			beforeNonChangingValue = before[0].arr[i].val;
		}
	}

	ok(beforeValue === 1 && beforeNonChangingValue == 5, "Failed in finding document to update!");

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

	ok(result.length === 1, "Failed to update document with positional data!");

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

	ok(afterValue === 2, "Failed in finding document to update!");
	ok(beforeNonChangingValue === afterNonChangingValue, "Update changed documents it should not have!");
	ok(beforeComparison === afterComparison, "Update changed documents it should not have!");

	base.dbDown();
});

test("Core - Collection.update() :: $addToSet operator for unique push operation", function() {
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

	ok(before.length === 1 && before[0].arr.length === 0, "Check existing document count is correct");

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

	ok(before.length === 1 && before[0].arr.length === 1, "Check updated document count is correct");
	ok(updated.length === 1, "Check that the update operation returned correct count");

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

	ok(before.length === 1 && before[0].arr.length === 1, "Check updated document count is correct");
	ok(updated.length === 0, "Check that the update operation returned correct count");

	base.dbDown();
});

test("Core - Collection.update() :: $addToSet operator for unique push operation against a specific key path", function() {
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

	ok(before.length === 1 && before[0].arr.length === 0, "Check existing document count is correct");

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

	ok(before.length === 1 && before[0].arr.length === 1, "Check updated document count is correct");
	ok(updated.length === 1, "Check that the update operation returned correct count");

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

	ok(before.length === 1 && before[0].arr.length === 2, "Check updated document count is correct");
	ok(updated.length === 1, "Check that the update operation returned correct count");
	ok(updated && updated[0] && updated[0].arr.length === 2, "Check that the update operation returned correct count");

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

	ok(before.length === 1 && before[0].arr.length === 2, "Check updated document count is correct");
	ok(updated.length === 0, "Check that the update operation returned correct count");

	base.dbDown();
});

test("Core - Collection.find() :: Value in array of strings", function() {
	base.dbUp();
	base.dataUp();

	//db._debug = true;
	var record = user.find({
		stringArr: 'moo'
	});
	db._debug = false;
	ok(record.length === 1, "Failed in finding document to by string array value!");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Single join", function() {
	base.dbUp();
	base.dataUp();

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

	ok(result[0].orgId === result[0].org._id, "Complete");
	ok(result[1].orgId === result[1].org._id, "Complete");
	ok(result[2].orgId === result[2].org._id, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Single join, array of ids", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"join": [{
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

	ok(result[0].orgId === result[0].org._id, "Complete");
	ok(result[1].orgId === result[1].org._id, "Complete");
	ok(result[2].orgId === result[2].org._id, "Complete");

	ok(result[0].friends[0] === result[0].friendData[0]._id, "Complete");
	ok(result[1].friends[0] === result[1].friendData[0]._id, "Complete");
	ok(result[2].friends[0] === result[2].friendData[0]._id, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Multi join", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"join": [{
			"user": {
				"_id": "friends",
				"$as": "friendData",
				"$require": true,
				"$multi": true
			}
		}]
	});

	ok(result[0].friends[0] === result[0].friendData[0]._id, "Complete");
	ok(result[1].friends[0] === result[1].friendData[0]._id, "Complete");
	ok(result[2].friends[0] === result[2].friendData[0]._id, "Complete");

	base.dbDown();
});

test("Core - Collection.update() :: $inc operator", function() {
	base.dbUp();
	
	var coll = db.collection('test');
	
	coll.setData([{
		_id: '1',
		remaining: 20
	}]);
	
	var before = coll.find()[0];
	
	ok(before.remaining === 20, "Check initial numbers");
	
	coll.update({
		_id: "1"
	}, {
		$inc: {
			remaining: -1
		} 
	});

	var after = coll.find()[0];
	
	ok(after.remaining === 19, "Check final numbers");

	base.dbDown();
});

test("Core - Collection.update() :: $inc operator advanced", function() {
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
	
	ok(before.remaining === 20, "Check initial numbers");
	ok(before.purchased === 0, "Check initial numbers");
	ok(before.likes[0].likeCount === 0, "Check initial numbers");
	ok(before.likes[0].unLikeCount === 10, "Check initial numbers");
	
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
	
	ok(after.remaining === 19, "Check final numbers");
	ok(after.purchased === 1, "Check final numbers");
	ok(after.likes[0].likeCount === 1, "Check final numbers");
	ok(after.likes[0].unLikeCount === 7, "Check final numbers");

	base.dbDown();
});

test("Core - Collection.updateById() :: $push array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	ok(before.arr.length === 2, "Complete");

	var result = user.updateById("2", {
		"$push": {
			"arr": {
				_id: 'ahh',
				val: 8
			}
		}
	});

	var after = user.findById("2");

	ok(after.arr.length === 3, "Complete");

	base.dbDown();
});

test("Core - Collection.update() :: $push array operator with $each modifier", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	ok(before.friends.length === 2, "Check for correct initial array length");
	ok(before.friends[0] === "3" && before.friends[1] === "4", "Check for correct initial values");

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

	ok(after.friends.length === 4, "Check for correct new array length");
	ok(after.friends[0] === "3" && after.friends[1] === "4" && after.friends[2] === "6" && after.friends[3] === "8", "Check for correct new values");

	base.dbDown();
});

test("Core - Collection.update() :: $push array operator with $each and $position modifier", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	ok(before.friends.length === 2, "Check for correct initial array length");
	ok(before.friends[0] === "3" && before.friends[1] === "4", "Check for correct initial values");

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

	ok(after.friends.length === 4, "Check for correct new array length");
	ok(after.friends[0] === "3" && after.friends[1] === "6" && after.friends[2] === "8" && after.friends[3] === "4", "Check for correct new values");

	base.dbDown();
});

test("Core - Collection.update() :: $push array operator to undefined field (should assign new array to field)", function() {
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

	ok(after.arr instanceof Array && after.arr.length === 1, "Complete");

	base.dbDown();
});

test("Core - Collection.update() :: $splicePush array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	ok(before.friends.length === 2, "Check for correct initial array length");
	ok(before.friends[0] === "3" && before.friends[1] === "4", "Check for correct initial values");

	var result = user.updateById("2", {
		"$splicePush": {
			"friends": "6",
			"$index": 1
		}
	});

	var after = user.findById("2");
	
	ok(after.friends.length === 3, "Check for correct new array length");
	ok(after.friends[0] === "3" && after.friends[1] === "6" && after.friends[2] === "4", "Check for correct new values");

	base.dbDown();
});

test("Core - Collection.update() :: $move array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	ok(before.friends.length === 2, "Check for correct initial array length");
	ok(before.friends[0] === "3" && before.friends[1] === "4", "Check for correct initial values");

	var result = user.updateById("2", {
		"$move": {
			"friends": "3",
			"$index": 1
		}
	});

	var after = user.findById("2");

	ok(after.friends.length === 2, "Check for correct new array length");
	ok(after.friends[0] === "4" && after.friends[1] === "3", "Check for correct new values");

	base.dbDown();
});

/*test("Core - Collection.update() :: $splicePush into empty array with incorrect index", function() {
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

	ok(after.arr.length === 1, "Check for correct new array length");
	ok(after.arr[0].name === "testObj", "Check for correct new values");

	base.dbDown();
});*/

test("Core - Collection.updateById() :: $pull array operator", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("2");

	ok(before.arr.length === 2, "Complete");

	var result = user.updateById("2", {
		"$pull": {
			"arr": {
				_id: 'lsd'
			}
		}
	});

	var after = user.findById("2");

	ok(after.arr.length === 1, "Complete");

	base.dbDown();
});

test("Core - Collection.updateById() :: $pullAll array operator", function() {
	base.dbUp();

	var coll = db.collection('test');
	coll.setData({
		_id: "1",
		arr: [0, 1, 2, 3, 0, 1, 2, 3, 5, 4, 3, 2, 1]
	});

	var before = coll.findById("1");

	ok(before.arr.length === 13, "Complete");

	var result = coll.updateById("1", {
		"$pullAll": {
			"arr": [0, 4, 3]
		}
	});

	var after = coll.findById("1");

	ok(after.arr.length === 8, "Complete");

	base.dbDown();
});

test("Core - Collection.update() :: $mul operator", function() {
	base.dbUp();
	
	var coll = db.collection('test');
	
	coll.setData([{
		_id: '1',
		remaining: 20
	}]);
	
	var before = coll.find()[0];
	
	ok(before.remaining === 20, "Check initial numbers");
	
	coll.update({
		_id: "1"
	}, {
		$mul: {
			remaining: 1.5
		} 
	});

	var after = coll.find()[0];
	
	ok(after.remaining === 30, "Check final numbers");

	base.dbDown();
});

test("Core - Collection.update() :: $rename operator", function() {
	base.dbUp();

	var coll = db.collection('test');

	coll.setData([{
		_id: '1',
		remaining: 20
	}]);

	var before = coll.find()[0];

	ok(before.remaining === 20, "Check initial numbers");

	coll.update({
		_id: "1"
	}, {
		$rename: {
			remaining: 'upstarted'
		}
	});

	var after = coll.find()[0];

	ok(after.remaining === undefined, "Check final properties");
	ok(after.upstarted === 20, "Check final properties");

	base.dbDown();
});

test("Core - Collection.update() :: $unset operator", function() {
	base.dbUp();

	var coll = db.collection('test');

	coll.setData([{
		_id: '1',
		remaining: 20
	}]);

	var before = coll.find()[0];

	ok(before.remaining === 20, "Check initial numbers");

	coll.update({
		_id: "1"
	}, {
		$unset: {
			remaining: 1
		}
	});

	var after = coll.find()[0];

	ok(after.remaining === undefined, "Check final properties");

	base.dbDown();
});

test("Core - Collection.upsert() :: Insert on upsert call", function() {
	base.dbUp();
	base.dataUp();

	var before = user.findById("1");

	ok(!before, "Complete");

	var result = user.upsert(singleUserObject);

	ok(result.op === 'insert', "Complete");

	var after = user.findById("1");

	ok(after, "Complete");

	base.dbDown();
});

test("Core - Collection.upsert() :: Update on upsert call", function() {
	base.dbUp();
	base.dataUp();

	user.upsert(singleUserObject);
	var before = user.findById("1");

	ok(before, "Complete");

	var copy = JSON.parse(JSON.stringify(singleUserObject));
	copy.updated = true;

	var result = user.upsert(copy);

	ok(result && result.op === 'update', "Complete");

	var after = user.findById("1");

	ok(after && after.updated === true, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Single Sort Argument, Ascending", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"$orderBy": {
			"name": 1
		}
	});

	ok(result[0].name === 'Dean', "Complete");
	ok(result[1].name === 'Dean', "Complete");
	ok(result[2].name === 'Jim', "Complete");
	ok(result[3].name === 'Kat', "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Single Sort Argument, Descending", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({}, {
		"$orderBy": {
			"name": -1
		}
	});

	ok(result[0].name === 'Kat', "Complete");
	ok(result[1].name === 'Jim', "Complete");
	ok(result[2].name === 'Dean', "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Multi Sort Arguments (2 arguments), Ascending, Ascending", function() {
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

	ok(result[0].industry === 'construction' && result[0].profit === 27, "Complete");
	ok(result[1].industry === 'construction' && result[1].profit === 45, "Complete");
	ok(result[2].industry === 'construction' && result[2].profit === 340, "Complete");
	ok(result[3].industry === 'construction' && result[3].profit === 664, "Complete");
	ok(result[4].industry === 'construction' && result[4].profit === 980, "Complete");

	ok(result[5].industry === 'it' && result[5].profit === 135, "Complete");
	ok(result[6].industry === 'it' && result[6].profit === 135, "Complete");
	ok(result[7].industry === 'it' && result[7].profit === 135, "Complete");

	ok(result[8].industry === 'it' && result[8].profit === 200, "Complete");
	ok(result[9].industry === 'it' && result[9].profit === 780, "Complete");

	ok(result[10].industry === 'it' && result[10].profit === 1002, "Complete");
	ok(result[11].industry === 'it' && result[11].profit === 1002, "Complete");
	ok(result[12].industry === 'it' && result[12].profit === 1002, "Complete");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Multi Sort Arguments (3 arguments), Ascending, Ascending, Ascending", function() {
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

	ok(result[0].industry === 'construction' && result[0].profit === 27, "Profit");
	ok(result[1].industry === 'construction' && result[1].profit === 45, "Profit");
	ok(result[2].industry === 'construction' && result[2].profit === 340, "Profit");
	ok(result[3].industry === 'construction' && result[3].profit === 664, "Profit");
	ok(result[4].industry === 'construction' && result[4].profit === 980, "Profit");

	ok(result[5].industry === 'it' && result[5].profit === 135 && result[5].type === 'beta', "Profit and Type");
	ok(result[6].industry === 'it' && result[6].profit === 135 && result[6].type === 'cappa', "Profit and Type");
	ok(result[7].industry === 'it' && result[7].profit === 135 && result[7].type === 'delta', "Profit and Type");

	ok(result[8].industry === 'it' && result[8].profit === 200 && result[8].type === 'alpha', "Profit and Type");
	ok(result[9].industry === 'it' && result[9].profit === 780 && result[9].type === 'cappa', "Profit and Type");

	ok(result[10].industry === 'it' && result[10].profit === 1002 && result[10].type === 'alpha', "Profit and Type");
	ok(result[11].industry === 'it' && result[11].profit === 1002 && result[11].type === 'gamma', "Profit and Type");
	ok(result[12].industry === 'it' && result[12].profit === 1002 && result[12].type === 'xray', "Profit and Type");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Multi Sort Arguments (3 arguments), Ascending, Ascending, Descending", function() {
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

	ok(result[0].industry === 'construction' && result[0].profit === 27, "Profit");
	ok(result[1].industry === 'construction' && result[1].profit === 45, "Profit");
	ok(result[2].industry === 'construction' && result[2].profit === 340, "Profit");
	ok(result[3].industry === 'construction' && result[3].profit === 664, "Profit");
	ok(result[4].industry === 'construction' && result[4].profit === 980, "Profit");

	ok(result[5].industry === 'it' && result[5].profit === 135 && result[5].type === 'delta', "Profit and Type");
	ok(result[6].industry === 'it' && result[6].profit === 135 && result[6].type === 'cappa', "Profit and Type");
	ok(result[7].industry === 'it' && result[7].profit === 135 && result[7].type === 'beta', "Profit and Type");

	ok(result[8].industry === 'it' && result[8].profit === 200 && result[8].type === 'alpha', "Profit and Type");
	ok(result[9].industry === 'it' && result[9].profit === 780 && result[9].type === 'cappa', "Profit and Type");

	ok(result[10].industry === 'it' && result[10].profit === 1002 && result[10].type === 'xray', "Profit and Type");
	ok(result[11].industry === 'it' && result[11].profit === 1002 && result[11].type === 'gamma', "Profit and Type");
	ok(result[12].industry === 'it' && result[12].profit === 1002 && result[12].type === 'alpha', "Profit and Type");

	base.dbDown();
});

test("Core - Collection.find() :: Options :: Multi Sort Arguments (2 arguments), Descending, Descending with Numbers and Booleans", function() {
	base.dbUp();
	base.dataUp();

	var result = user.find({

	}, {
		"$orderBy": {
			"lookup": 1,
			"age": 1
		}
	});

	ok(result[0].name === 'Dean' && result[0].lookup === false, "Name and Lookup");
	ok(result[1].name === 'Kat' && result[1].lookup === false, "Name and Lookup");
	ok(result[2].name === 'Dean' && result[1].lookup === false, "Name and Lookup");
	ok(result[3].name === 'Jim' && result[2].lookup === true, "Name and Lookup");

	base.dbDown();
});

test("Core - CollectionGroup.find() :: Single collection", function() {
	base.dbUp();
	base.dataUp();

	var group = db.collectionGroup('testGroup')
		.addCollection(user);

	var result = group.find({}, {
		"$orderBy": {
			"age": 1
		}
	});

	ok(result[0].name === 'Dean' && result[0].age === 5, "Name and Lookup");
	ok(result[1].name === 'Dean' && result[1].age === 5, "Name and Lookup");
	ok(result[2].name === 'Kat' && result[2].age === 12, "Name and Lookup");
	ok(result[3].name === 'Jim' && result[3].age === 15, "Name and Lookup");

	base.dbDown();
});

test("Core - CollectionGroup.find() :: Single collection, descending sort", function() {
	base.dbUp();
	base.dataUp();

	var group = db.collectionGroup('testGroup')
		.addCollection(user);

	var result = group.find({}, {
		"$orderBy": {
			"age": -1
		}
	});

	ok(result[0].name === 'Jim' && result[0].age === 15, "Name and Lookup");
	ok(result[1].name === 'Kat' && result[1].age === 12, "Name and Lookup");
	ok(result[2].name === 'Dean' && result[2].age === 5, "Name and Lookup");

	base.dbDown();
});
