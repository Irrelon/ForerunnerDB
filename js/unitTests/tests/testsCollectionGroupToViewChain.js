ForerunnerDB.moduleLoaded('View, CollectionGroup', function () {
	test("CollectionGroup -> View - Chains CRUD - setData", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testGroup'),
			view = db.view('testGroupView');

		group.addCollection(coll);
		view.from(group);

		coll.setData({
			name: 'Fred'
		});

		var result = view.find();

		ok(result.length === 1, "Correct number of results in group find");
		ok(result.length && result[0].name === 'Fred', "Correct entry data");

		base.dbDown();
	});

	test("CollectionGroup -> View - Chains CRUD - insert", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testViewGroup'),
			view = db.view('testGroupView');

		group.addCollection(coll);
		view.from(group);

		coll.insert({
			name: 'Fred'
		});

		var result = view.find();

		ok(result.length === 1, "Correct number of results in group find: " + result.length);
		ok(result.length && result[0].name === 'Fred', "Correct entry data");

		base.dbDown();
	});

	test("CollectionGroup -> View - Chains CRUD - updated", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testViewGroup'),
			view = db.view('testGroupView');

		group.addCollection(coll);
		view.from(group);

		coll.insert({
			name: 'Fred'
		});

		coll.insert({
			name: 'Joe'
		});

		coll.update({name: 'Fred'}, {name: 'Jim'});

		var result = view.find();

		ok(result.length === 2, "Correct number of results in group find: " + result.length);
		ok(result.length && result[0].name === 'Jim', "Correct entry data");

		base.dbDown();
	});

	test("CollectionGroup -> View - Chains CRUD - remove", function () {
		base.dbUp();

		var coll = db.collection('test'),
			group = db.collectionGroup('testViewGroup'),
			view = db.view('testGroupView');

		group.addCollection(coll);
		view.from(group);

		coll.insert({
			name: 'Fred'
		});

		coll.insert({
			name: 'Joe'
		});

		coll.remove({name: 'Fred'});

		var result = view.find();

		ok(result.length === 1, "Correct number of results in group find: " + result.length);
		ok(result.length && result[0].name === 'Joe', "Correct entry data");

		base.dbDown();
	});
});