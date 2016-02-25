QUnit.module('Views Basic CRUD');
ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test('View Basics :: CRUD :: Insert into underlying collection is reflected in view', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

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

	QUnit.test('View Basics :: CRUD :: Upsert (insert) into underlying collection is reflected in view', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.from(coll);

		results = view.find();

		strictEqual(results.length, 0, 'Results count before insert is correct');

		coll.upsert({
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, true, 'Results data is correct');

		base.dbDown();
	});

	QUnit.test('View Basics :: CRUD :: Upsert (update) into underlying collection is reflected in view', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.from(coll);

		results = view.find();

		strictEqual(results.length, 0, 'Results count before insert is correct');

		coll.upsert({
			_id: 1,
			moo: false
		});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after upsert is correct');
		strictEqual(results[0].moo, false, 'Results data is correct');

		coll.upsert({
			_id: 1,
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, true, 'Results data is correct');

		base.dbDown();
	});

	QUnit.test('View Basics :: CRUD :: Update into underlying collection is reflected in view', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.from(coll);

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

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, false, 'Results data is correct');

		base.dbDown();
	});

	QUnit.test('View Basics :: CRUD :: Remove into underlying collection is reflected in view', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			results;

		view.from(coll);

		results = view.find();

		strictEqual(results.length, 0, 'Results count before insert is correct');

		coll.insert({
			moo: true
		});

		results = view.find();

		strictEqual(results.length, 1, 'Results count after insert is correct');
		strictEqual(results[0].moo, true, 'Results data is correct');

		// Now remove the item and see if the view is similarly removed
		coll.remove({});

		results = view.find();

		strictEqual(results.length, 0, 'Results count after insert is correct');
		strictEqual(results[0], undefined, 'Results data is correct');

		base.dbDown();
	});
});