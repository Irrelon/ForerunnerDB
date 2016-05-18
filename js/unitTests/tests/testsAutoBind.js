QUnit.module('AutoBind');
ForerunnerDB.moduleLoaded('View, AutoBind', function () {
	QUnit.test('View.queryData() :: Set query and data and check that bound data matches expected result', function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.query({}, {
			$orderBy: {
				createdTs: -1
			}
		});

		user.setData([{
			_id: '1',
			name: "hello",
			createdTs: 1
		}, {
			_id: '2',
			name: "foo",
			createdTs: 3
		}, {
			_id: '3',
			name: "boo",
			createdTs: 2
		}]);

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		var elems = $('#' + targetId).find('li');

		strictEqual(elems.length, 3, "Document count is correct");
		strictEqual($(elems[0]).text(), 'foo', "Output is correct");
		strictEqual($(elems[1]).text(), 'boo', "Output is correct");
		strictEqual($(elems[2]).text(), 'hello', "Output is correct");

		userView.unlink('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("Collection.update() :: $unset operator inside sub-array propagates to bound data", function() {
		base.dbUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		var coll = db.collection('test');

		coll.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:slots[0].arr[0].count}}:{^{if slots[0].arr[0].remaining}}{^{:slots[0].arr[0].remaining.val}}{{/if}}, {^{:slots[0].arr[1].count}}:{^{:slots[0].arr[1].remaining.val}}</li>'
		});

		coll.setData([{
			_id: '1',
			slots: [{
				_id: 44,
				arr: [{
					_id: 22,
					remaining: {
						val: 20
					},
					count: 10
				}, {
					_id: 33,
					remaining: {
						val: 15
					},
					count: 7
				}]
			}]
		}]);

		var before = coll.find()[0];
		var beforeElem = $('#' + targetId).find('#1');

		strictEqual(before.slots[0].arr[0].remaining.val, 20, "Check initial numbers");
		strictEqual(before.slots[0].arr[1].remaining.val, 15, "Check initial numbers");
		strictEqual(beforeElem.text(), '10:20, 7:15', "Check initial link data");

		coll.update({
			_id: "1",
			slots: {
				_id: 44,
				arr: {
					_id: 22
				}
			}
		}, {
			"slots.$": {
				"arr.$": {
					$unset: {
						remaining: 1
					}
				}
			}
		});

		var after = coll.find()[0];
		var afterElem = $('#' + targetId).find('#1');

		strictEqual(after.slots[0].arr[0].remaining, undefined, "Check final properties");
		strictEqual(after.slots[0].arr[1].remaining.val, 15, "Check final properties");
		strictEqual(afterElem.text(), '10:, 7:15', "Check final link data");

		base.tmpDomDown(targetId);
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: setData from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.setData({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		userView.unlink('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Insert from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View() :: Target selector as a jQuery object instead of string with directed unlink", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link($('#' + targetId), {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		strictEqual(userView.isLinked(), true, "View reports it is linked");

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		// Now unlink the bind and check that we no longer get updates to the DOM
		userView.unlink($('#' + targetId), {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		strictEqual(userView.isLinked(), false, "View reports it is no longer linked");

		user.insert({
			_id: '3444423',
			name: "unbound"
		});

		elem = $('#' + targetId).find('#3444423');

		strictEqual(elem.length, 0, "Insert single document did not bind after unlink");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View() :: Target selector as a jQuery object instead of string with unlink all", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link($('#' + targetId), {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		strictEqual(userView.isLinked(), true, "View reports it is linked");

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		// Now unlink the bind and check that we no longer get updates to the DOM
		userView.unlink();

		strictEqual(userView.isLinked(), false, "View reports it is no longer linked");

		user.insert({
			_id: '3444423',
			name: "unbound"
		});

		elem = $('#' + targetId).find('#3444423');

		strictEqual(elem.length, 0, "Insert single document did not bind after unlink");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Update from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'hello', "Insert single document");

		user.update({
			_id: '2342'
		}, {
			name: "hello2"
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'hello2', "Update single document");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Upsert from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'hello', "Insert single document");

		user.upsert({
			_id: '2342',
			name: "hello2"
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'hello2', "Update single document");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Remove from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 1, "Insert single document");

		user.remove({
			_id: '2342'
		});

		elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 0, "Remove single document");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.asyncTest("View() :: View order is correct after insert", function() {
		base.dbUp();
		base.viewUp();
		base.dataUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		expect(8);

		userView
			.queryOptions({
				$orderBy: {
					name: 1
				}
			})
			.link('#' + targetId, {
				template: '<li class="item" data-link="id{:_id}">{^{:name}}</li>'
			});

		user.insert({
			_id: '2342',
			name: "adam"
		});

		user.insert({
			_id: '23432',
			name: "Zelda"
		});

		user.insert({
			_id: '2322',
			name: "beta"
		});
		$('body').scrollTop(10000);

		setTimeout(function () {
			var elems = $('#' + targetId).find('.item');

			strictEqual(elems.length, 7, "Insert documents");

			// Check sort order
			strictEqual($(elems[0]).attr('id'), '2342', "Alphabetical 1");
			strictEqual($(elems[1]).attr('id'), '2322', "Alphabetical 2");
			strictEqual($(elems[2]).attr('id'), '4', "Alphabetical 3");
			strictEqual($(elems[3]).attr('id'), '5', "Alphabetical 4");
			strictEqual($(elems[4]).attr('id'), '2', "Alphabetical 5");
			strictEqual($(elems[5]).attr('id'), '3', "Alphabetical 6");
			strictEqual($(elems[6]).attr('id'), '23432', "Alphabetical 7");

			base.tmpDomDown(targetId);
			base.viewDown();
			base.domDown();
			base.dbDown();

			start();
		}, 100);
	});

	QUnit.test("View() :: View order is correct after update", function() {
		base.dbUp();
		base.viewUp();
		base.dataUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView
			.queryOptions({
				$orderBy: {
					name: 1
				}
			})
			.link('#' + targetId, {
				template: '<li class="item" data-link="id{:_id}">{^{:name}}</li>'
			});

		var elems = $('#' + targetId).find('.item');

		strictEqual(elems.length, 4, "Document count");

		// Check sort order
		strictEqual($(elems[0]).attr('id'), '4', "Alphabetical 1");
		strictEqual($(elems[1]).attr('id'), '5', "Alphabetical 2");
		strictEqual($(elems[2]).attr('id'), '2', "Alphabetical 3");
		strictEqual($(elems[3]).attr('id'), '3', "Alphabetical 4");

		user.update({
			_id: '2'
		}, {
			name: 'Zelda'
		});

		elems = $('#' + targetId).find('.item');

		strictEqual(elems.length, 4, "Document count");

		// Check sort order
		strictEqual($(elems[0]).text(), 'Dean', "Alphabetical 1");
		strictEqual($(elems[1]).text(), 'Dean', "Alphabetical 2");
		strictEqual($(elems[2]).text(), 'Kat', "Alphabetical 3");
		strictEqual($(elems[3]).text(), 'Zelda', "Alphabetical 4");

		base.tmpDomUp(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	// Bind with queries
	QUnit.test("View.on() with query :: setData from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.query({
			name: 'hello'
		}).link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.setData({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		userView.unlink('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() with query :: Insert from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.query({
			name: 'hello'
		}).link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() with query :: Insert into collection with transform, check transformed data exists in bound view", function () {
		base.dbUp();
		base.dataUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			collResults,
			viewResults;

		view.from(coll);

		view.query({
			moo: true
		});

		view.transform({
			enabled: true,
			dataIn: function (data) {
				data.foo = 'works';
				return data;
			}
		});

		view.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:foo}}</li>'
		});

		viewResults = view.find();

		strictEqual(viewResults.length, 0, 'Results count before insert is correct');

		coll.upsert({
			_id: '2342',
			moo: true
		});

		collResults = coll.find();
		viewResults = view.find();

		strictEqual(collResults.length, 1, 'Results count after insert is correct');
		strictEqual(collResults[0].moo, true, 'Results data is correct');
		strictEqual(collResults[0].foo, undefined, 'Results data is correct');

		strictEqual(viewResults.length, 1, 'Results count after insert is correct');
		strictEqual(viewResults[0].moo, true, 'Results data is correct');
		strictEqual(viewResults[0].foo, 'works', 'Results data is correct');

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 1, "Data bound element count correct");
		strictEqual(elem.text(), 'works', 'Data bound element text is correct (transformed data exists in element)');

		base.tmpDomDown(targetId);
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() with query :: Insert from Collection With Item That Does Not Match View Query", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.query({
			name: 'hello'
		}).link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello333"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 0, "Didn't insert single document");
		
		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View() :: View order is correct after upsert on collection, with $limit and multi-key $orderBy on view", function() {
		base.dbUp();
		base.domUp();

		var targetId = base.tmpDomUp(),
			coll,
			view;

		coll = db.collection('testColl').truncate();
		view = db.view('testView')
			.from('testColl');

		coll.insert([{
			name: 'Test 1',
			age: 1,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 2',
			age: 2,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 3',
			age: 3,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 4',
			age: 4,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 5',
			age: 5,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 6',
			age: 6,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 7',
			age: 7,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 8',
			age: 8,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 9',
			age: 9,
			dateTs: db.make(new Date())
		}, {
			name: 'Test 10',
			age: 10,
			dateTs: db.make(new Date())
		}]);

		// NOTE THIS $LIMIT ONLY WORKS IF DECLARED AFTER THE COLLECTION INSERT!
		view.queryOptions({
				$orderBy: {
					age: -1,
					name: 1,
					dateTs: -1
				},
				$limit: 2
			})
			.link('#' + targetId, {
				template: '<li class="item" data-link="id{:_id} data-name{:name}">{^{:name}} {^{:age}} {^{:dateTs}}</li>'
			});

		var elems = $('#' + targetId).find('.item');

		strictEqual(elems.length, 2, "Document count");

		// Check sort order
		strictEqual($(elems[0]).attr('data-name'), 'Test 10', "Alphabetical 1");
		strictEqual($(elems[1]).attr('data-name'), 'Test 9', "Alphabetical 2");

		base.tmpDomDown(targetId);
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() with query :: Update from Collection to outside view query constraints", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();
		
		var targetId = base.tmpDomUp();

		userView.query({
			name: 'hello'
		}).link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'hello', "Insert single document");

		user.update({
			_id: '2342'
		}, {
			name: "hello2"
		});

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 0, "Document was removed because it does not match query");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() with query :: Update from Collection to inside view query constraints", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.query({
			name: 'hello'
		}).link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello2"
		});

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 0, "Doc not in view");

		user.update({
			_id: '2342'
		}, {
			name: "hello"
		});

		elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 1, "Document is now in view as updated data matches query");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() with query :: Upsert from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.query({
			name: 'hello'
		}).link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'hello', "Insert single document");

		user.upsert({
			_id: '2342',
			name: "hello2"
		});

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 0, "Document was removed because it does not match query");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() with query :: Remove from Collection", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.query({
			name: 'hello'
		}).link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 1, "Insert single document");

		user.remove({
			_id: '2342'
		});

		elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 0, "Remove single document");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View() with query :: View order is correct after insert", function() {
		base.dbUp();
		base.viewUp();
		base.dataUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView
			.queryOptions({
				$orderBy: {
					name: 1
				}
			})
			.link('#' + targetId, {
				template: '<li class="item" data-link="id{:_id}">{^{:name}}</li>'
			});

		user.insert({
			_id: '2342',
			name: "adam"
		});

		user.insert({
			_id: '23432',
			name: "Zelda"
		});

		user.insert({
			_id: '2322',
			name: "beta"
		});

		var elems = $('#' + targetId).find('.item');

		strictEqual(elems.length, 7, "Insert documents");

		// Check sort order
		strictEqual($(elems[0]).text(), 'adam', "Alphabetical 1");
		strictEqual($(elems[1]).text(), 'beta', "Alphabetical 2");
		strictEqual($(elems[2]).text(), 'Dean', "Alphabetical 3");
		strictEqual($(elems[3]).text(), 'Dean', "Alphabetical 4");
		strictEqual($(elems[4]).text(), 'Jim', "Alphabetical 5");
		strictEqual($(elems[5]).text(), 'Kat', "Alphabetical 6");
		strictEqual($(elems[6]).text(), 'Zelda', "Alphabetical 7");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View() with query :: View order is correct after update", function() {
		base.dbUp();
		base.viewUp();
		base.dataUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView
			.queryOptions({
				$orderBy: {
					name: 1
				}
			})
			.link('#' + targetId, {
				template: '<li class="item" data-link="id{:_id}">{^{:name}}</li>'
			});

		var elems = $('#' + targetId).find('.item');

		strictEqual(elems.length, 4, "Document count");

		/*for (var i = 0; i < elems.length; i++) {
			console.log(i, $(elems[i]).text());
		}
		debugger;*/
		// Check sort order
		strictEqual($(elems[0]).text(), 'Dean', "Alphabetical 1");
		strictEqual($(elems[1]).text(), 'Dean', "Alphabetical 2");
		strictEqual($(elems[2]).text(), 'Jim', "Alphabetical 3");
		strictEqual($(elems[3]).text(), 'Kat', "Alphabetical 4");

		user.update({
			_id: '2'
		}, {
			name: 'Zelda'
		});

		elems = $('#' + targetId).find('.item');

		strictEqual(elems.length, 4, "Document count");

		// Check sort order
		strictEqual($(elems[0]).text(), 'Dean', "Alphabetical 1");
		strictEqual($(elems[1]).text(), 'Dean', "Alphabetical 2");
		strictEqual($(elems[2]).text(), 'Kat', "Alphabetical 3");
		strictEqual($(elems[3]).text(), 'Zelda', "Alphabetical 4");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View() with query :: View order is correct after update with query constraint", function() {
		base.dbUp();
		base.viewUp();
		base.dataUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		// Add an active === false to all user records
		user.update({}, {active: false});

		userView
			.query({
				active: true
			})
			.queryOptions({
				$orderBy: {
					name: 1
				}
			})
			.link('#' + targetId, {
				template: '<li class="item" data-link="id{:_id}">{^{:name}}</li>'
			});

		var elems = $('#' + targetId).find('.item');

		strictEqual(elems.length, 0, "Document count is zero");

		// Update items one at a time and check for correct order
		user.update({
			_id: '2'
		}, {
			active: true
		});

		elems = $('#' + targetId).find('.item');
		strictEqual(elems.length, 1, "Document count is one");

		user.update({
			_id: '4'
		}, {
			active: true
		});

		elems = $('#' + targetId).find('.item');
		strictEqual(elems.length, 2, "Document count is two");

		strictEqual($(elems[0]).attr('id') === '4' && $(elems[0]).text(), 'Dean', "Alphabetical 1");
		strictEqual($(elems[1]).attr('id') === '2' && $(elems[1]).text(), 'Jim', "Alphabetical 2");

		user.update({
			_id: '3'
		}, {
			active: true
		});

		elems = $('#' + targetId).find('.item');
		strictEqual(elems.length, 3, "Document count is three");

		strictEqual($(elems[0]).attr('id') === '4' && $(elems[0]).text(), 'Dean', "Alphabetical 1");
		strictEqual($(elems[1]).attr('id') === '2' && $(elems[1]).text(), 'Jim', "Alphabetical 2");
		strictEqual($(elems[2]).attr('id') === '3' && $(elems[2]).text(), 'Kat', "Alphabetical 3");

		user.update({
			_id: '5'
		}, {
			active: true
		});

		elems = $('#' + targetId).find('.item');
		strictEqual(elems.length, 4, "Document count");

		// Check sort order
		strictEqual($(elems[0]).text(), 'Dean', "Alphabetical 1");
		strictEqual($(elems[1]).text(), 'Dean', "Alphabetical 2");
		strictEqual($(elems[2]).attr('id') === '2' && $(elems[2]).text(), 'Jim', "Alphabetical 3");
		strictEqual($(elems[3]).attr('id') === '3' && $(elems[3]).text(), 'Kat', "Alphabetical 4");

		user.update({
			_id: '2'
		}, {
			name: 'Zelda'
		});

		elems = $('#' + targetId).find('.item');
		strictEqual(elems.length, 4, "Document count");

		// Check sort order
		strictEqual($(elems[0]).text(), 'Dean', "Alphabetical 1");
		strictEqual($(elems[1]).text(), 'Dean', "Alphabetical 2");
		strictEqual($(elems[2]).attr('id') === '3' && $(elems[2]).text(), 'Kat', "Alphabetical 3");
		strictEqual($(elems[3]).attr('id') === '2' && $(elems[3]).text(), 'Zelda', "Alphabetical 4");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View() with query :: View order large number of items", function() {
		base.dbUp();
		var oldDebug = db.debug();
		db.debug(false);
		base.domUp();

		var targetId = base.tmpDomUp();

		var coll = db.collection('test'),
			i,
			count = 1000,
			arr = [];

		coll._deferThreshold.insert = 10000;
		coll._deferThreshold.update = 10000;
		coll._deferThreshold.remove = 10000;

		var view = db.view('test');

		view._data._deferThreshold.insert = 10000;
		view._data._deferThreshold.update = 10000;
		view._data._deferThreshold.remove = 10000;

		view
			.from(coll)
			.query({
				active: true
			})
			.queryOptions({
				$orderBy: {
					i: 1
				}
			});

		view.link('#' + targetId, {
			template: '<li class="item" data-link="id{:_id}"><div><div><div><div><div><div><div>{^{:i}}</div></div></div></div></div></div></div></li>'
		});

		var timeStart = new Date().getTime();
		for (i = 0; i < count; i++) {
			if (i !== count / 2) {
				coll.upsert({
					i: i,
					active: true
				});
			}
		}
		var totalTime = new Date().getTime() - timeStart;
		ok(totalTime < 3000, 'Time taken to insert and build DOM linked view from data is acceptable: ' + totalTime + 'ms');

		var timeStart = new Date().getTime();
		coll.insert({
			i: count / 2,
			active: true
		});
		var totalTime = new Date().getTime() - timeStart;

		ok(totalTime < 200, 'Time taken to insert new item into existing large DOM list is acceptable: ' + totalTime + 'ms');

		var elems = $('#' + targetId).find('.item');
		strictEqual(elems.length, count, "Document count " + count + ": " + elems.length);

		base.tmpDomDown(targetId);
		base.domDown();
		db.debug(oldDebug);
		base.dbDown();
	});

	QUnit.test("View() with query :: View order large number of items before linking", function() {
		base.dbUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		var coll = db.collection('test'),
			view = db.view('test'),
			i,
			count = 1000,
			arr = [];

		coll._deferThreshold.insert = 10000;
		coll._deferThreshold.update = 10000;
		coll._deferThreshold.remove = 10000;

		for (i = 0; i < count; i++) {
			if (i !== count / 2) {
				arr.push({
					i: i,
					active: true
				});
			}
		}

		coll.setData(arr);

		var timeStart = new Date().getTime();
		view = db.view('test');

		view._data._deferThreshold.insert = 10000;
		view._data._deferThreshold.update = 10000;
		view._data._deferThreshold.remove = 10000;

		view
			.from(coll)
			.query({
				active: true
			}, false)
			.queryOptions({
				$orderBy: {
					i: 1
				}
			});

		view.link('#' + targetId, {
			template: '<li class="item" data-link="id{:_id}"><div><div><div><div><div><div><div>{^{:i}}</div></div></div></div></div></div></div></li>'
		});

		var totalTime = new Date().getTime() - timeStart;
		ok(totalTime < 1000, 'Time taken to build DOM linked view from data is acceptable: ' + totalTime + 'ms');

		var timeStart = new Date().getTime();
		coll.insert({
			i: count / 2,
			active: true
		});
		var totalTime = new Date().getTime() - timeStart;

		ok(totalTime < 50, 'Time taken to insert new item into existing large DOM list is acceptable: ' + totalTime + 'ms');

		var elems = $('#' + targetId).find('.item');
		strictEqual(elems.length, count, "Document count " + count + ": " + elems.length);

		base.tmpDomDown(targetId);
		base.domDown();
		base.dbDown();
	});

	QUnit.asyncTest('View chain propagation :: Collection -> View -> View -> View', function () {
		"use strict";

		expect(6);
		base.dbUp();

		var coll = db.collection('test'),
			view1 = db.view('view1'),
			view2 = db.view('view2'),
			view3 = db.view('view3'),
			elems1,
			elems2,
			elems3;

		view1.from(coll);
		view2.from(view1);
		view3.from(view2);

		$('<div id="testViewProp1"></div>').appendTo('body');
		$('<div id="testViewProp2"></div>').appendTo('body');
		$('<div id="testViewProp3"></div>').appendTo('body');

		view1.link('#testViewProp1', {
			template: '<div class="item" data-link="id{:_id}">{^{:moo}}</div>'
		});

		view2.link('#testViewProp2', {
			template: '<div class="item" data-link="id{:_id}">{^{:moo}}</div>'
		});

		view3.link('#testViewProp3', {
			template: '<div class="item" data-link="id{:_id}">{^{:moo}}</div>'
		});

		coll.insert({
			moo: true
		});

		elems1 = $('#testViewProp1').find('.item');
		elems2 = $('#testViewProp2').find('.item');
		elems3 = $('#testViewProp3').find('.item');

		setTimeout(function () {
			strictEqual(elems1.text(), 'true', 'Value 1 correct');
			strictEqual(elems2.text(), 'true', 'Value 2 correct');
			strictEqual(elems3.text(), 'true', 'Value 3 correct');

			coll.update({}, {
				moo: false
			});

			setTimeout(function () {
				strictEqual(elems1.text(), 'false', 'Value 1 correct');
				strictEqual(elems2.text(), 'false', 'Value 2 correct');
				strictEqual(elems3.text(), 'false', 'Value 3 correct');

				$('#testViewProp1').remove();
				$('#testViewProp2').remove();
				$('#testViewProp3').remove();

				base.dbDown();

				start();
			}, 1);
		}, 1);
	});

	QUnit.asyncTest('View chain propagation to document :: Collection -> View -> View -> Document', function () {
		"use strict";

		expect(2);
		base.dbUp();

		var coll = db.collection(),
			view1 = db.view('view1'),
			view2 = db.view('view2'),
			view3 = db.view('view3'),
			doc1 = db.document('doc1'),
			elems1;

		view1.from(coll);
		view2.from(view1);
		view3.from(view2);

		$('<div id="testViewProp1"></div>').appendTo('body');

		view3.link('#testViewProp1', {
			template: '{{:~log(#data)}}{^{if items && items.length}}{^{for items}}<div class="item" data-link="id{:_id}">{^{:moo}}</div>{{/for}}{{else}}<div>No items</div>{{/if}}'
		}, {
			$wrap: 'items',
			$wrapIn: doc1
		});

		setTimeout(function () {
			coll.insert({
				moo: true
			});

			elems1 = $('#testViewProp1').find('.item');

			setTimeout(function () {
				strictEqual(elems1.text(), 'true', 'Value 1 correct');

				coll.update({}, {
					moo: false
				});

				setTimeout(function () {
					strictEqual(elems1.text(), 'false', 'Value 1 correct');

					$('#testViewProp1').remove();

					base.dbDown();

					start();
				}, 1000);
			}, 1000);
		}, 2000);
	});

	QUnit.asyncTest('View chain propagation to document with query and CRUDing document data :: Collection -> View -> Document', function () {
		"use strict";

		expect(53);
		base.dbUp();

		var coll = db.collection('test'),
			view1 = db.view('view1'),
			view2 = db.view('view2'),
			view3 = db.view('view3'),
			doc1 = db.document('doc1'),
			doc2 = db.document('doc2'),
			doc3 = db.document('doc3'),
			testViewStage,
			parentElem1,
			parentElem2,
			parentElem3,
			elems1,
			elems2,
			elems3;

		view1.from(coll);
		view2.from(view1);
		view3.from(view2);

		view1.query({
			flag1: true
		});

		view2.query({
			flag2: 'blue'
		});

		view3.query({
			flag3: 'circle'
		});

		$('<div id="testViewStage">0</div>').appendTo('body');
		$('<div id="testViewProp1"></div>').appendTo('body');
		$('<div id="testViewProp2"></div>').appendTo('body');
		$('<div id="testViewProp3"></div>').appendTo('body');

		testViewStage = $('#testViewStage');
		parentElem1 = $('#testViewProp1');
		parentElem2 = $('#testViewProp2');
		parentElem3 = $('#testViewProp3');

		view1.link('#testViewProp1', {
			template: '{{:~log(#data)}}<h4>View1 (true)</h4>{^{if items && items.length}}{^{for items}}<div class="item" data-link="id{:_id} data-flag1{:flag1} data-flag2{:flag2} data-flag3{:flag3}">{^{:_id}}: <strong>{^{:flag1}}</strong> {^{:flag2}} {^{:flag3}}</div>{{/for}}{{else}}<div>No items</div>{{/if}}'
		}, {
			$wrap: 'items',
			$wrapIn: doc1
		});

		view2.link('#testViewProp2', {
			template: '{{:~log(#data)}}<h4>View2 (blue)</h4>{^{if items && items.length}}{^{for items}}<div class="item" data-link="id{:_id} data-flag1{:flag1} data-flag2{:flag2} data-flag3{:flag3}">{^{:_id}}: <strong>{^{:flag1}} {^{:flag2}}</strong> {^{:flag3}}</div>{{/for}}{{else}}<div>No items</div>{{/if}}'
		}, {
			$wrap: 'items',
			$wrapIn: doc2
		});

		view3.link('#testViewProp3', {
			template: '{{:~log(#data)}}<h4>View3 (circle)</h4>{^{if items && items.length}}{^{for items}}<div class="item" data-link="id{:_id} data-flag1{:flag1} data-flag2{:flag2} data-flag3{:flag3}">{^{:_id}}: <strong>{^{:flag1}} {^{:flag2}} {^{:flag3}}</strong></div>{{/for}}{{else}}<div>No items</div>{{/if}}'
		}, {
			$wrap: 'items',
			$wrapIn: doc3
		});

		setTimeout(function () {
			coll.insert({
				_id: '1',
				flag1: false,
				flag2: 'green',
				flag3: 'circle'
			});

			coll.insert({
				_id: '2',
				flag1: false,
				flag2: 'blue',
				flag3: 'circle'
			});

			coll.insert({
				_id: '3',
				flag1: true,
				flag2: 'red',
				flag3: 'triangle'
			});

			setTimeout(function () {
				testViewStage.html('1');
				elems1 = parentElem1.find('.item');
				elems2 = parentElem2.find('.item');
				elems3 = parentElem3.find('.item');

				strictEqual(elems1.length, 1, 'View 1 has filtered correctly');
				strictEqual(elems2.length, 0, 'View 2 has filtered correctly');
				strictEqual(elems3.length, 0, 'View 3 has filtered correctly');

				strictEqual($(elems1[0]).attr('id'), '3', 'Elem id correct');

				coll.update({
					_id: '2'
				}, {
					flag1: true
				});

				setTimeout(function () {
					testViewStage.html('2');
					elems1 = parentElem1.find('.item');
					elems2 = parentElem2.find('.item');
					elems3 = parentElem3.find('.item');

					strictEqual(elems1.length, 2, 'View 1 has filtered correctly');
					strictEqual(elems2.length, 1, 'View 2 has filtered correctly');
					strictEqual(elems3.length, 1, 'View 3 has filtered correctly');

					strictEqual($(elems1[0]).attr('id'), '3', 'Elem id correct');
					strictEqual($(elems1[1]).attr('id'), '2', 'Elem id correct');

					strictEqual($(elems2[0]).attr('id'), '2', 'Elem id correct');

					strictEqual($(elems3[0]).attr('id'), '2', 'Elem id correct');

					coll.insert({
						_id: '4',
						flag1: true,
						flag2: 'blue',
						flag3: 'square'
					});

					coll.insert({
						_id: '5',
						flag1: true,
						flag2: 'red',
						flag3: 'triangle'
					});

					setTimeout(function () {
						testViewStage.html('3');
						elems1 = parentElem1.find('.item');
						elems2 = parentElem2.find('.item');
						elems3 = parentElem3.find('.item');

						strictEqual(elems1.length, 4, 'View 1 has filtered correctly');
						strictEqual(elems2.length, 2, 'View 2 has filtered correctly');
						strictEqual(elems3.length, 1, 'View 3 has filtered correctly');

						strictEqual($(elems1[0]).attr('id'), '3', 'Elem id correct');
						strictEqual($(elems1[1]).attr('id'), '2', 'Elem id correct');
						strictEqual($(elems1[2]).attr('id'), '4', 'Elem id correct');
						strictEqual($(elems1[3]).attr('id'), '5', 'Elem id correct');

						strictEqual($(elems2[0]).attr('id'), '2', 'Elem id correct');
						strictEqual($(elems2[1]).attr('id'), '4', 'Elem id correct');

						strictEqual($(elems3[0]).attr('id'), '2', 'Elem id correct');

						coll.update({
							_id: '5'
						}, {
							flag2: 'blue'
						});

						setTimeout(function () {
							testViewStage.html('4');
							elems1 = parentElem1.find('.item');
							elems2 = parentElem2.find('.item');
							elems3 = parentElem3.find('.item');

							strictEqual(elems1.length, 4, 'View 1 has filtered correctly');
							strictEqual(elems2.length, 3, 'View 2 has filtered correctly');
							strictEqual(elems3.length, 1, 'View 3 has filtered correctly');

							strictEqual($(elems1[0]).attr('id'), '3', 'Elem id correct');
							strictEqual($(elems1[1]).attr('id'), '2', 'Elem id correct');
							strictEqual($(elems1[2]).attr('id'), '4', 'Elem id correct');
							strictEqual($(elems1[3]).attr('id'), '5', 'Elem id correct');

							strictEqual($(elems2[0]).attr('id'), '2', 'Elem id correct');
							strictEqual($(elems2[1]).attr('id'), '4', 'Elem id correct');
							strictEqual($(elems2[2]).attr('id'), '5', 'Elem id correct');

							strictEqual($(elems3[0]).attr('id'), '2', 'Elem id correct');

							coll.update({
								_id: '5'
							}, {
								flag3: 'circle'
							});

							setTimeout(function () {
								testViewStage.html('5');
								elems1 = parentElem1.find('.item');
								elems2 = parentElem2.find('.item');
								elems3 = parentElem3.find('.item');

								strictEqual(elems1.length, 4, 'View 1 has filtered correctly');
								strictEqual(elems2.length, 3, 'View 2 has filtered correctly');
								strictEqual(elems3.length, 2, 'View 3 has filtered correctly');

								strictEqual($(elems1[0]).attr('id'), '3', 'Elem id correct');
								strictEqual($(elems1[1]).attr('id'), '2', 'Elem id correct');
								strictEqual($(elems1[2]).attr('id'), '4', 'Elem id correct');
								strictEqual($(elems1[3]).attr('id'), '5', 'Elem id correct');

								strictEqual($(elems2[0]).attr('id'), '2', 'Elem id correct');
								strictEqual($(elems2[1]).attr('id'), '4', 'Elem id correct');
								strictEqual($(elems2[2]).attr('id'), '5', 'Elem id correct');

								strictEqual($(elems3[0]).attr('id'), '2', 'Elem id correct');
								strictEqual($(elems3[1]).attr('id'), '5', 'Elem id correct');

								coll.update({
									_id: '2'
								}, {
									flag1: 'false'
								});

								setTimeout(function () {
									testViewStage.html('6');
									elems1 = parentElem1.find('.item');
									elems2 = parentElem2.find('.item');
									elems3 = parentElem3.find('.item');

									strictEqual(elems1.length, 3, 'View 1 has filtered correctly');
									strictEqual(elems2.length, 2, 'View 2 has filtered correctly');
									strictEqual(elems3.length, 1, 'View 3 has filtered correctly');

									strictEqual($(elems1[0]).attr('id'), '3', 'Elem id correct');
									strictEqual($(elems1[1]).attr('id'), '4', 'Elem id correct');
									strictEqual($(elems1[2]).attr('id'), '5', 'Elem id correct');

									strictEqual($(elems2[0]).attr('id'), '4', 'Elem id correct');
									strictEqual($(elems2[1]).attr('id'), '5', 'Elem id correct');

									strictEqual($(elems3[0]).attr('id'), '5', 'Elem id correct');

									testViewStage.remove();
									parentElem1.remove();
									parentElem2.remove();
									parentElem3.remove();

									base.dbDown();

									start();
								}, 200);
							}, 200);
						}, 200);
					}, 200);
				}, 200);
			}, 200);
		}, 100);
	});

	QUnit.asyncTest('View chain propagation to document with query and changing queries with static data :: Collection -> View -> Document', function () {
		"use strict";

		expect(20);
		base.dbUp();

		var coll = db.collection('test'),
			view1 = db.view('view1'),
			view2 = db.view('view2'),
			view3 = db.view('view3'),
			doc1 = db.document('doc1'),
			doc2 = db.document('doc2'),
			doc3 = db.document('doc3'),
			testViewStage,
			parentElem1,
			parentElem2,
			parentElem3,
			elems1,
			elems2,
			elems3;

		view1.from(coll);
		view2.from(view1);
		view3.from(view2);

		view1.query({
			flag1: true
		});

		view2.query({
			flag2: 'blue'
		});

		view3.query({
			flag3: 'circle'
		});

		$('<div id="testViewStage">0</div>').appendTo('body');
		$('<div id="testViewProp1"></div>').appendTo('body');
		$('<div id="testViewProp2"></div>').appendTo('body');
		$('<div id="testViewProp3"></div>').appendTo('body');

		testViewStage = $('#testViewStage');
		parentElem1 = $('#testViewProp1');
		parentElem2 = $('#testViewProp2');
		parentElem3 = $('#testViewProp3');

		view1.link('#testViewProp1', {
			template: '{{:~log(#data)}}<h4>View1 (true)</h4>{^{if items && items.length}}{^{for items}}<div class="item" data-link="id{:_id} data-flag1{:flag1} data-flag2{:flag2} data-flag3{:flag3}">{^{:_id}}: <strong>{^{:flag1}}</strong> {^{:flag2}} {^{:flag3}}</div>{{/for}}{{else}}<div>No items</div>{{/if}}'
		}, {
			$wrap: 'items',
			$wrapIn: doc1
		});

		view2.link('#testViewProp2', {
			template: '{{:~log(#data)}}<h4>View2 (blue)</h4>{^{if items && items.length}}{^{for items}}<div class="item" data-link="id{:_id} data-flag1{:flag1} data-flag2{:flag2} data-flag3{:flag3}">{^{:_id}}: <strong>{^{:flag1}} {^{:flag2}}</strong> {^{:flag3}}</div>{{/for}}{{else}}<div>No items</div>{{/if}}'
		}, {
			$wrap: 'items',
			$wrapIn: doc2
		});

		view3.link('#testViewProp3', {
			template: '{{:~log(#data)}}<h4>View3 (circle)</h4>{^{if items && items.length}}{^{for items}}<div class="item" data-link="id{:_id} data-flag1{:flag1} data-flag2{:flag2} data-flag3{:flag3}">{^{:_id}}: <strong>{^{:flag1}} {^{:flag2}} {^{:flag3}}</strong></div>{{/for}}{{else}}<div>No items</div>{{/if}}'
		}, {
			$wrap: 'items',
			$wrapIn: doc3
		});

		setTimeout(function () {
			coll.insert({
				_id: '1',
				flag1: false,
				flag2: 'red',
				flag3: 'square'
			});

			coll.insert({
				_id: '2',
				flag1: false,
				flag2: 'blue',
				flag3: 'circle'
			});

			coll.insert({
				_id: '3',
				flag1: true,
				flag2: 'red',
				flag3: 'triangle'
			});

			setTimeout(function () {
				testViewStage.html('1');
				elems1 = parentElem1.find('.item');
				elems2 = parentElem2.find('.item');
				elems3 = parentElem3.find('.item');

				strictEqual(elems1.length, 1, 'View 1 has filtered correctly');
				strictEqual(elems2.length, 0, 'View 2 has filtered correctly');
				strictEqual(elems3.length, 0, 'View 3 has filtered correctly');

				strictEqual($(elems1[0]).attr('id'), '3', 'Elem id correct');

				// Now change the view2's query to encompass one of the existing items
				view1.query({
					flag1: false
				});

				setTimeout(function () {
					testViewStage.html('2');
					elems1 = parentElem1.find('.item');
					elems2 = parentElem2.find('.item');
					elems3 = parentElem3.find('.item');

					strictEqual(elems1.length, 2, 'View 1 has filtered correctly');
					strictEqual(elems2.length, 1, 'View 2 has filtered correctly');
					strictEqual(elems3.length, 1, 'View 3 has filtered correctly');

					strictEqual($(elems1[0]).attr('id'), '1', 'Elem id correct');
					strictEqual($(elems1[1]).attr('id'), '2', 'Elem id correct');

					strictEqual($(elems2[0]).attr('id'), '2', 'Elem id correct');

					strictEqual($(elems3[0]).attr('id'), '2', 'Elem id correct');

					view2.query({
						flag2: 'red'
					});

					setTimeout(function () {
						testViewStage.html('3');
						elems1 = parentElem1.find('.item');
						elems2 = parentElem2.find('.item');
						elems3 = parentElem3.find('.item');

						strictEqual(elems1.length, 2, 'View 1 has filtered correctly');
						strictEqual(elems2.length, 1, 'View 2 has filtered correctly');
						strictEqual(elems3.length, 0, 'View 3 has filtered correctly');

						strictEqual($(elems1[0]).attr('id'), '1', 'Elem id correct');

						view3.query({
							flag3: 'square'
						});

						setTimeout(function () {
							testViewStage.html('4');
							elems1 = parentElem1.find('.item');
							elems2 = parentElem2.find('.item');
							elems3 = parentElem3.find('.item');

							strictEqual(elems1.length, 2, 'View 1 has filtered correctly');
							strictEqual(elems2.length, 1, 'View 2 has filtered correctly');
							strictEqual(elems3.length, 1, 'View 3 has filtered correctly');

							strictEqual($(elems1[0]).attr('id'), '1', 'Elem id correct');

							strictEqual($(elems2[0]).attr('id'), '1', 'Elem id correct');

							testViewStage.remove();
							parentElem1.remove();
							parentElem2.remove();
							parentElem3.remove();

							base.dbDown();

							start();
						}, 200);
					}, 200);
				}, 200);
			}, 200);
		}, 100);
	});
});

ForerunnerDB.moduleLoaded('View, AutoBind, CollectionGroup', function () {
	QUnit.test("View.on() :: Insert from CollectionGroup via Collection Interface", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.viewGroupUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		/*expect(1);
		 start();*/

		user.on('insert', function () {
			ok(true, 'Collection insert');
		});

		userView.on('insert', function () {
			ok(true, 'View insert');
		});

		userGroup.on('insert', function () {
			ok(true, 'Group insert');
		});

		userGroupView.on('insert', function () {
			ok(true, 'View from group insert');
		});

		userGroupView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		base.tmpDomDown(targetId);
		base.domDown();
		base.viewGroupDown();
		base.viewDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Update from CollectionGroup via Collection Interface", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.viewGroupUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		user.on('update', function () {
			ok(true, 'Collection update');
		});

		userView.on('update', function () {
			ok(true, 'View update');
		});

		userGroup.on('update', function () {
			ok(true, 'Group update');
		});

		userGroupView.on('update', function () {
			ok(true, 'View from group update');
		});

		userGroupView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'hello', "Insert single document");

		user.update({
			_id: '2342'
		}, {
			name: "hello2"
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'hello2', "Update single document");

		base.tmpDomDown(targetId);
		base.domDown();
		base.viewGroupDown();
		base.viewDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Remove from CollectionGroup via Collection Interface", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.viewGroupUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		user.on('remove', function () {
			ok(true, 'Collection remove');
		});

		userView.on('remove', function () {
			ok(true, 'View remove');
		});

		userGroup.on('remove', function () {
			ok(true, 'Group remove');
		});

		userGroupView.on('remove', function () {
			ok(true, 'View from group remove');
		});

		userGroupView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 1, "Insert single document");

		user.remove({
			_id: '2342'
		});

		elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 0, "Remove single document");

		base.tmpDomDown(targetId);
		base.domDown();
		base.viewGroupDown();
		base.viewDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Insert from CollectionGroup via CollectionGroup Interface", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.viewGroupUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		/*expect(1);
		 start();*/

		user.on('insert', function () {
			ok(true, 'Collection insert');
		});

		userView.on('insert', function () {
			ok(true, 'View insert');
		});

		userGroup.on('insert', function () {
			ok(true, 'Group insert');
		});

		userGroupView.on('insert', function () {
			ok(true, 'View from group insert');
		});

		userGroupView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		userGroup.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');

		strictEqual(elem.length, 1, "Insert single document");

		base.tmpDomDown(targetId);
		base.domDown();
		base.viewGroupDown();
		base.viewDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Update from CollectionGroup via CollectionGroup Interface", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.viewGroupUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		user.on('update', function () {
			ok(true, 'Collection update');
		});

		userView.on('update', function () {
			ok(true, 'View update');
		});

		userGroup.on('update', function () {
			ok(true, 'Group update');
		});

		userGroupView.on('update', function () {
			ok(true, 'View from group update');
		});

		userGroupView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		userGroup.insert({
			_id: '2342',
			name: "hello"
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'hello', "Insert single document");

		userGroup.update({
			_id: '2342'
		}, {
			name: "hello2"
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'hello2', "Update single document");

		base.tmpDomDown(targetId);
		base.domDown();
		base.viewGroupDown();
		base.viewDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Remove from CollectionGroup via CollectionGroup Interface", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.viewGroupUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		user.on('remove', function () {
			ok(true, 'Collection remove');
		});

		userView.on('remove', function () {
			ok(true, 'View remove');
		});

		userGroup.on('remove', function () {
			ok(true, 'Group remove');
		});

		userGroupView.on('remove', function () {
			ok(true, 'View from group remove');
		});

		userGroupView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		userGroup.insert({
			_id: '2342',
			name: "hello"
		});

		var elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 1, "Insert single document");

		userGroup.remove({
			_id: '2342'
		});

		elem = $('#' + targetId).find('#2342');
		strictEqual(elem.length, 0, "Remove single document");

		base.tmpDomDown(targetId);
		base.domDown();
		base.viewGroupDown();
		base.viewDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Update with binding library logic check", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{for arr}}{^{if show}}{^{for subjects}}{^{:name}}:{^{:available}},{{/for}}{{/if}}{{/for}}</li>'
		});

		user.setData({
			_id: '2342',
			arr: [{
				show: false,
				subjects: [{
					_id: 1,
					name: "hello1",
					available: 0
				}, {
					_id: 2,
					name: "hello2",
					available: 0
				}, {
					_id: 3,
					name: "hello3",
					available: 0
				}]
			}]
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, '', "Bind is currently blank");

		user.update({
			_id: '2342'
		}, {
			arr: {
				show: true
			}
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'hello1:0,hello2:0,hello3:0,', "Update single document");

		user.update({
			_id: '2342',
			arr: {
				subjects: {
					_id: 2
				}
			}
		}, {
			arr: {
				'subjects.$': {
					available: 1
				}
			}
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'hello1:0,hello2:1,hello3:0,', "Update single document");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("Collection.on() :: Bind then modify then unbind then modify check unbind is working", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		user.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.setData({
			_id: '2342',
			name: 'moo1'
		});

		var currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'moo1', "Bind is currently moo1");

		user.update({
			_id: '2342'
		}, {
			name: 'moo2'
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'moo2', "Update name is now moo2");

		// Unlink
		user.unlink('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.update({
			_id: '2342'
		}, {
			name: 'moo3'
		});

		var newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'moo2', "After unlink, name updated in data but HTML should still be moo2");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Bind then modify then unbind then modify check unbind is working", function () {
		base.dbUp();
		base.dataUp();
		base.viewUp();
		base.domUp();

		var targetId = base.tmpDomUp();

		var currentName, newName;

		userView.link('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.setData({
			_id: '2342',
			name: 'moo1'
		});

		currentName = $('#' + targetId).find('#2342').text();
		strictEqual(currentName, 'moo1', "Bind is currently moo1");

		user.update({
			_id: '2342'
		}, {
			name: 'moo2'
		});

		newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'moo2', "Update name is now moo2");

		// Unlink
		userView.unlink('#' + targetId, {
			template: '<li data-link="id{:_id}">{^{:name}}</li>'
		});

		user.update({
			_id: '2342'
		}, {
			name: 'moo3'
		});

		newName = $('#' + targetId).find('#2342').text();
		strictEqual(newName, 'moo2', "After unlink, name updated in data but HTML should still be moo2");

		base.tmpDomDown(targetId);
		base.viewDown();
		base.domDown();
		base.dbDown();
	});

	QUnit.test("View.on() :: Bind to an object without the property the template wants, then upsert with the property", function () {
		base.dbUp();

		$('<div id="inboxTotalBadge"></div>').appendTo('body');

		// Create the unreadCounts collection
		var elem,
			coll = db.collection('unreadCounts');

		coll.upsert({
			"_id": "total"
		});

		db
			.view('unreadTotalCounts')
			.query({ _id: "total" })
			.from('unreadCounts')
			.link('#inboxTotalBadge', {
				template: '<div class="count" data-link="id{:_id}">{^{:count}}</div>'
			});

		elem = $('#inboxTotalBadge').find('#total');
		strictEqual(elem.text(), "", "Text output is blank");

		coll.upsert({
			"_id": "total",
			"count": 20
		});

		elem = $('#inboxTotalBadge').find('#total');
		strictEqual(elem.text(), "20", "Text output is 20");

		$('#inboxTotalBadge').remove();

		base.dbDown();
	});
});