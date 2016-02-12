QUnit.module('Transform');
QUnit.test("Collection.transform() :: Assign a transform-in method to a collection", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate();

	coll.transform({
		enabled: true,
		dataIn: function (data) {
			return {
				_id: data._id,
				moo: data.foo,
				goo: data.foo + 1
			};
		}
	});

	coll.insert({
		_id: 'test1',
		foo: 1
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].moo === 1 && result[0].goo, 2, "Insert transformed");

	base.dbDown();
});

QUnit.test("Collection.transform() :: Assign a transform-out method to a collection", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate();

	coll.transform({
		enabled: true,
		dataOut: function (data) {
			return {
				_id: data._id,
				moo: data.foo,
				goo: data.foo + 1
			};
		}
	});

	coll.insert({
		_id: 'test1',
		foo: 1,
		doo: 1
	});

	var collData = coll._data,
		result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(collData[0].doo, 1, "Insert not transformed");
	strictEqual(result[0].moo === 1 && result[0].goo === 2 && result[0].doo, undefined, "Find transformed");

	base.dbDown();
});

QUnit.test("Collection.find() $transform :: Query data with a $transform operator", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate();

	coll.insert({
		_id: 'test1',
		foo: 1
	});

	var result = coll.find({}, {
		$transform: function (data) {
			return {
				_id: data._id,
				moo: data.foo,
				goo: data.foo + 1
			};
		}
	});

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].moo === 1 && result[0].goo, 2, "Insert transformed");

	base.dbDown();
});

ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test("View.transform() :: Assign a transform-in method to a View and them call from(), passing a collection", function () {
		base.dbUp();

		var coll = db.collection('transformColl').truncate();
		coll.transform(false);

		coll.insert({
			_id: 'test1',
			foo: 1
		});

		var result = coll.find();

		strictEqual(result.length, 1, "Collection insert");
		strictEqual(result[0].foo, 1, "Collection insert not transformed");

		var view = db.view('transformView').from(coll);

		// Set a transform on the view
		view.transform({
			enabled: true,
			dataIn: function (data) {
				return {
					_id: data._id,
					moo: data.foo,
					goo: data.foo + 1
				};
			}
		});

		// This tests that a view's data is correctly refreshed after a transform has been
		// enabled with a dataIn method. If this fails then the view's transform() method
		// should be inspected to see why the data was not refreshed after the transform
		// was modified to include an enabled flag and a dataIn method.
		result = view.find();
		strictEqual(result[0].moo === 1 && result[0].goo, 2, "View insert 1 transformed");

		// Now insert another record
		coll.insert({
			_id: 'test2',
			foo: 4
		});

		// This tests that a view's internal data collection is correctly transforming inserted
		// data. If it is not, follow the flow of data through the chain reactor until the data
		// is inserted and see why the data did not get correctly modified.
		result = view.find();
		strictEqual(result[1] && result[1].moo === 4 && result[1].goo, 5, "View insert 2 transformed");

		// Now test collection updates
		coll.update({
			_id: 'test2'
		}, {
			foo: 2
		});

		// This checks that a view's data is correctly transformed when an update operation is
		// executed against it.
		result = view.find();
		strictEqual(result[1] && result[1].moo === 2 && result[1].goo, 3, "View update 2 transformed");

		// Now remove a record
		coll.remove({
			_id: 'test1'
		});

		result = view.find();
		strictEqual(result[0] && result[0].moo === 2 && result[0].goo, 3, "Collection remove 'test1' replicate to transformed view");

		base.dbDown();
	});

	QUnit.test("View.transform() :: Assign a transform-in method to the view that changes the IDs of items, then check updates still map correctly", function () {
		base.dbUp();

		var coll = db.collection('transformColl').truncate();
		coll.transform(false);

		coll.insert({
			_id: 'test1',
			foo: 1
		});

		var result = coll.find();

		strictEqual(result.length, 1, "Collection insert");
		strictEqual(result[0].foo, 1, "Collection insert not transformed");

		var view = db.view('transformView').from(coll);

		// Set a transform on the view
		view.transform({
			enabled: true,
			dataIn: function (data) {
				data._id = data._id + "_viewId";
				return data;
			}
		});

		// This tests that a view's data is correctly refreshed after a transform has been
		// enabled with a dataIn method. If this fails then the view's transform() method
		// should be inspected to see why the data was not refreshed after the transform
		// was modified to include an enabled flag and a dataIn method.
		result = view.find();
		strictEqual(result[0]._id, 'test1_viewId', "View insert 1 transformed");

		// Now insert another record
		coll.insert({
			_id: 'test2',
			foo: 4
		});

		// This tests that a view's internal data collection is correctly transforming inserted
		// data. If it is not, follow the flow of data through the chain reactor until the data
		// is inserted and see why the data did not get correctly modified.
		result = view.find();
		strictEqual(result[1]._id, 'test2_viewId', "View insert 2 transformed");

		// Now test collection updates
		coll.update({
			_id: 'test2'
		}, {
			foo: 2
		});

		// This checks that a view's data is correctly transformed when an update operation is
		// executed against it.
		result = view.find();
		strictEqual(result[1].foo, 2, "View update 2 transformed");

		// Now remove a record
		coll.remove({
			_id: 'test1'
		});

		result = view.find();
		strictEqual(result[0]._id, 'test2_viewId', "Collection remove 'test1' replicate to transformed view");

		base.dbDown();
	});
});