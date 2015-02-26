test('Performance - Collection.sort()', function () {
	base.dbUp();
	
	var coll = db.collection('test'),
		count = 1000,
		index,
		st,
		et,
		result;
	
	st = new Date().getTime();
	for (index = 0; index < count; index++) {
		coll.insert({
			num: Math.round(Math.random() * 100000)
		});
	}
	et = new Date().getTime();
	ok(true, 'Generate records: ' + (et - st) + 'ms');
	
	// Now query the collection without a sort clause
	st = new Date().getTime();
	result = coll.find();
	et = new Date().getTime();
	
	ok(true, 'Query ' + result.length + ' records, no sort order: ' + (et - st) + 'ms');
	
	// Now query with a sort order
	st = new Date().getTime();
	result = coll.find({}, {
		$orderBy: {
			num: 1
		}
	});
	et = new Date().getTime();
	
	ok(true, 'Query ' + result.length + ' records, sort ascending: ' + (et - st) + 'ms');
	
	base.dbDown();
});

ForerunnerDB.moduleLoaded('View', function () {
	/*test("Bind - View() with query :: View order large number of items", function() {
		base.dbUp();
		base.domUp();

		var coll = db.collection('test'),
			i,
			count = 1000,
			arr = [];

		coll._deferThreshold.insert = 10000;
		coll._deferThreshold.update = 10000;
		coll._deferThreshold.remove = 10000;

		var view = db.view('test');

		view._privateData._deferThreshold.insert = 10000;
		view._privateData._deferThreshold.update = 10000;
		view._privateData._deferThreshold.remove = 10000;

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

		view.link('#testTarget', {
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
		ok(totalTime < 200, 'Time taken to insert and build DOM linked view from data is acceptable: ' + totalTime + 'ms');

		var timeStart = new Date().getTime();
		coll.insert({
			i: count / 2,
			active: true
		});
		var totalTime = new Date().getTime() - timeStart;

		ok(totalTime < 200, 'Time taken to insert new item into existing large DOM list is acceptable: ' + totalTime + 'ms');

		var elems = $('#testTarget').find('.item');
		strictEqual(elems.length, count, "Document count " + count + ": " + elems.length);

		base.domDown();
		base.dbDown();
	});

	test("Bind - View() with query :: View order large number of items before linking", function() {
		base.dbUp();
		base.domUp();

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

		view._privateData._deferThreshold.insert = 10000;
		view._privateData._deferThreshold.update = 10000;
		view._privateData._deferThreshold.remove = 10000;

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

		view.link('#testTarget', {
			template: '<li class="item" data-link="id{:_id}"><div><div><div><div><div><div><div>{^{:i}}</div></div></div></div></div></div></div></li>'
		});

		var totalTime = new Date().getTime() - timeStart;
		ok(totalTime < 200, 'Time taken to build DOM linked view from data is acceptable: ' + totalTime + 'ms');

		var timeStart = new Date().getTime();
		coll.insert({
			i: count / 2,
			active: true
		});
		var totalTime = new Date().getTime() - timeStart;

		ok(totalTime < 200, 'Time taken to insert new item into existing large DOM list is acceptable: ' + totalTime + 'ms');

		var elems = $('#testTarget').find('.item');
		strictEqual(elems.length, count, "Document count " + count + ": " + elems.length);

		base.domDown();
		base.dbDown();
	});*/
});