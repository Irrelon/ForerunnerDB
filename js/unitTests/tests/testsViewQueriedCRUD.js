QUnit.module('Views Queried CRUD');
ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test('View Queried :: CRUD :: Insert is matched by query', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.query({
			moo: true
		});

		view.from(coll);

		results = view.find();

		strictEqual(results.length, 0, 'Results count before insert is correct');

		coll.insert({
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, true, 'Results data is correct');

		base.dbDown();
	});

	QUnit.test('View Queried :: CRUD :: Insert is not matched by query', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.query({
			moo: false
		});

		view.from(coll);

		results = view.find();

		strictEqual(results.length, 0, 'Results count before insert is correct');

		coll.insert({
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 0, 'Results count after insert is correct');
		strictEqual(results[0], undefined, 'Results data is correct');

		base.dbDown();
	});

	QUnit.test('View Queried :: CRUD :: Insert not matched by query, Update is matched by query', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.from(coll);

		view.query({
			moo: false
		});

		results = view.find();

		strictEqual(results.length, 0, 'Results count before insert is correct');

		coll.insert({
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 0, 'Results count after insert is correct');
		strictEqual(results[0], undefined, 'Results data is correct');

		// Now update the collection and see if the view is similarly updated
		coll.update({}, {moo: false});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, false, 'Results data is correct');

		base.dbDown();
	});

	QUnit.test('View Queried :: CRUD :: Insert is matched by query, Update not matched by query', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.from(coll);

		view.query({
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 0, 'Results count before insert is correct');

		coll.insert({
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, true, 'Results data is correct');

		// Now update the collection and see if the view is similarly updated
		coll.update({}, {moo: false});

		results = view.find();

		strictEqual(results.length, 0, 'Results count after insert is correct');
		strictEqual(results[0], undefined, 'Results data is correct');

		base.dbDown();
	});
});