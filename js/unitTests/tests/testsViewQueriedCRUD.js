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

	QUnit.test('View Queried :: CRUD :: Upsert with a view query', function () {
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

		coll.upsert({
			_id: 1,
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, true, 'Results data is correct');

		// Now update the collection and see if the view is similarly updated
		coll.upsert({
			_id: 1,
			moo: false
		});

		results = view.find();

		strictEqual(results.length, 0, 'Results count after upsert is correct');
		strictEqual(results[0], undefined, 'Results data is correct');

		base.dbDown();
	});

	QUnit.test('View Queried :: CRUD :: Collection with multiple views each with different query, check chain packets are not polluted on multiple chain targets', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view1 = db.view('test1'),
			view2 = db.view('test2'),
			results1,
			results2;

		view1.from(coll);
		view2.from(coll);

		view1.query({
			moo: true
		});

		view2.query({
			moo: false
		});

		results1 = view1.find();
		results2 = view2.find();

		strictEqual(results1.length, 0, 'Results1 count before upsert is correct');
		strictEqual(results2.length, 0, 'Results1 count before upsert is correct');

		coll.upsert({
			_id: 1,
			moo: true
		});

		results1 = view1.find();
		results2 = view2.find();

		strictEqual(results1.length, 1, 'Results1 count after upsert is correct');
		strictEqual(results1[0].moo, true, 'Results1 data is correct');

		strictEqual(results2.length, 0, 'Results2 count after upsert is correct');
		strictEqual(results2[0], undefined, 'Results2 data is correct');

		// Now update the collection and see if the view is similarly updated
		coll.upsert({
			_id: 1,
			moo: false
		});

		results1 = view1.find();
		results2 = view2.find();

		strictEqual(results1.length, 0, 'Results1 count after upsert is correct');
		strictEqual(results1[0], undefined, 'Results1 data is correct');

		strictEqual(results2.length, 1, 'Results2 count after upsert is correct');
		strictEqual(results2[0].moo, false, 'Results2 data is correct');

		base.dbDown();
	});

	/*QUnit.test('View Queried :: CRUD :: $groupBy in view and collection post-view-insert', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.from(coll)
			.query({}, {
				$groupBy: {
					category: 1
				}
			});

		results = view.findOne();

		strictEqual(Object.keys(results).length, 0, 'Object key count before insert is correct');

		coll.insert([{
			moo: true,
			category: 'Cows'
		}, {
			moo: false,
			category: 'Cows'
		}, {
			baa: true,
			category: 'Sheep'
		}]);

		results = view.findOne();

		debugger;

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, true, 'Results data is correct');

		base.dbDown();
	});*/
});