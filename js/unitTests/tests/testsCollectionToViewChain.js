QUnit.module('Collection -> View');
ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test("Chains CRUD - setData", function () {
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('testView');

		view.from(coll);

		coll.setData({
			name: 'Fred'
		});

		var result = view.find();

		strictEqual(result.length, 1, "Correct number of results in view find");
		strictEqual(result.length && result[0].name, 'Fred', "Correct entry data");

		base.dbDown();
	});

	QUnit.test("Chains CRUD - insert", function () {
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('testView');

		view.from(coll);

		coll.insert({
			name: 'Fred'
		});

		var result = view.find();

		strictEqual(result.length, 1, "Correct number of results in view find: " + result.length);
		strictEqual(result.length && result[0].name, 'Fred', "Correct entry data");

		base.dbDown();
	});

	QUnit.test("Chains CRUD - updated", function () {
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('testView');

		view.from(coll);

		coll.insert({
			name: 'Fred'
		});

		coll.insert({
			name: 'Joe'
		});

		coll.update({name: 'Fred'}, {name: 'Jim'});

		var result = view.find();

		strictEqual(result.length, 2, "Correct number of results in view find: " + result.length);
		strictEqual(result.length && result[0].name, 'Jim', "Correct entry data");

		base.dbDown();
	});

	QUnit.test("Chains CRUD - remove", function () {
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('testView');

		view.from(coll);

		coll.insert({
			name: 'Fred'
		});

		coll.insert({
			name: 'Joe'
		});

		coll.remove({name: 'Fred'});

		var result = view.find();

		strictEqual(result.length, 1, "Correct number of results in view find: " + result.length);
		strictEqual(result.length && result[0].name, 'Joe', "Correct entry data");

		base.dbDown();
	});
});