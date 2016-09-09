QUnit.module('ActiveBucket');
ForerunnerDB.moduleLoaded('ActiveBucket', function () {
	QUnit.test('Create instance', function () {
		var ab = new ForerunnerDB.shared.modules.ActiveBucket({});
		ok(ab instanceof ForerunnerDB.shared.modules.ActiveBucket, 'Instance created');
	});

	QUnit.test('Add document', function () {
		var ab = new ForerunnerDB.shared.modules.ActiveBucket({
				name: 1,
				age: -1
			}),
			names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
			ages = [15, 18, 22, 27, 33, 41, 47, 52],
			total = 1000,
			count = total;

		while (count--) {
			ab.insert({
				name: names[Math.floor(Math.random() * names.length)],
				age: ages[Math.floor(Math.random() * ages.length)]
			});
		}

		strictEqual(ab.count(), total, 'Correct number of items (' + total + '): ' + ab.count());
	});
	
	ForerunnerDB.moduleLoaded('AutoBind', function () {
		QUnit.test('Update Document', function () {
			base.dbUp();
			base.domUp();
			
			var names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
				ages = [15, 18, 22, 27, 33],
				total = 5,
				count = total,
				coll,
				view,
				obj;
			
			coll = db.collection('test').truncate();
			view = db.view('test')
				.queryOptions({
					$orderBy: {
						name: 1,
						age: -1
					}
				})
				.from(coll)
				.link('#testTarget', {
					template: '<li class="item" data-link="id{:_id}">{^{:name}} : {^{:age}}</li>'
				});
			
			count = total;
			while (count--) {
				obj = {
					name: names[count],
					age: ages[count]
				};
				
				coll.insert(obj);
			}
			
			count = total;
			while (count--) {
				obj = {
					name: names[count],
					age: ages[count]
				};
				
				coll.insert(obj);
			}
			
			count = total;
			while (count--) {
				obj = {
					name: names[count],
					age: ages[count]
				};
				
				coll.insert(obj);
			}
			
			// Check items
			var elems = $('#testTarget').find('.item');
			
			strictEqual(elems.length, 15, "Insert documents");
			if (elems.length > 15) {
				debugger
			}
			;
			
			// Check sort order
			strictEqual($(elems[0]).text(), 'Alice : 22', "Alphabetical 1");
			strictEqual($(elems[1]).text(), 'Alice : 22', "Alphabetical 2");
			strictEqual($(elems[2]).text(), 'Alice : 22', "Alphabetical 3");
			strictEqual($(elems[3]).text(), 'Bob : 33', "Alphabetical 4");
			strictEqual($(elems[4]).text(), 'Bob : 33', "Alphabetical 5");
			strictEqual($(elems[5]).text(), 'Bob : 33', "Alphabetical 6");
			strictEqual($(elems[6]).text(), 'Jim : 18', "Alphabetical 7");
			strictEqual($(elems[7]).text(), 'Jim : 18', "Alphabetical 8");
			strictEqual($(elems[8]).text(), 'Jim : 18', "Alphabetical 9");
			strictEqual($(elems[9]).text(), 'Rob : 15', "Alphabetical 10");
			strictEqual($(elems[10]).text(), 'Rob : 15', "Alphabetical 11");
			strictEqual($(elems[11]).text(), 'Rob : 15', "Alphabetical 12");
			strictEqual($(elems[12]).text(), 'Sam : 27', "Alphabetical 13");
			strictEqual($(elems[13]).text(), 'Sam : 27', "Alphabetical 14");
			strictEqual($(elems[14]).text(), 'Sam : 27', "Alphabetical 15");
			
			// Remove an item from the collection
			var items = coll.find(),
				item = items[14];
			
			coll.remove({_id: item._id});
			
			// Check items
			var elems = $('#testTarget').find('.item');
			
			strictEqual(elems.length, 14, "Insert documents");
			
			// Check sort order
			strictEqual($(elems[0]).text(), 'Alice : 22', "Alphabetical 1");
			strictEqual($(elems[1]).text(), 'Alice : 22', "Alphabetical 2");
			strictEqual($(elems[2]).text(), 'Alice : 22', "Alphabetical 3");
			strictEqual($(elems[3]).text(), 'Bob : 33', "Alphabetical 4");
			strictEqual($(elems[4]).text(), 'Bob : 33', "Alphabetical 5");
			strictEqual($(elems[5]).text(), 'Bob : 33', "Alphabetical 6");
			strictEqual($(elems[6]).text(), 'Jim : 18', "Alphabetical 7");
			strictEqual($(elems[7]).text(), 'Jim : 18', "Alphabetical 8");
			strictEqual($(elems[8]).text(), 'Jim : 18', "Alphabetical 9");
			strictEqual($(elems[9]).text(), 'Rob : 15', "Alphabetical 10");
			strictEqual($(elems[10]).text(), 'Rob : 15', "Alphabetical 11");
			strictEqual($(elems[11]).text(), 'Sam : 27', "Alphabetical 12");
			strictEqual($(elems[12]).text(), 'Sam : 27', "Alphabetical 13");
			strictEqual($(elems[13]).text(), 'Sam : 27', "Alphabetical 14");
			
			items = view.find();
			item = items[1];
			
			coll.update(item, {name: 'Alice', age: 21});
			
			// Check items
			var elems = $('#testTarget').find('.item');
			
			// Check sort order
			strictEqual($(elems[0]).text(), 'Alice : 22', "Alphabetical 1");
			strictEqual($(elems[1]).text(), 'Alice : 22', "Alphabetical 2");
			strictEqual($(elems[2]).text(), 'Alice : 21', "Alphabetical 3");
			strictEqual($(elems[3]).text(), 'Bob : 33', "Alphabetical 4");
			strictEqual($(elems[4]).text(), 'Bob : 33', "Alphabetical 5");
			strictEqual($(elems[5]).text(), 'Bob : 33', "Alphabetical 6");
			strictEqual($(elems[6]).text(), 'Jim : 18', "Alphabetical 7");
			strictEqual($(elems[7]).text(), 'Jim : 18', "Alphabetical 8");
			strictEqual($(elems[8]).text(), 'Jim : 18', "Alphabetical 9");
			strictEqual($(elems[9]).text(), 'Rob : 15', "Alphabetical 10");
			strictEqual($(elems[10]).text(), 'Rob : 15', "Alphabetical 11");
			strictEqual($(elems[11]).text(), 'Sam : 27', "Alphabetical 12");
			strictEqual($(elems[12]).text(), 'Sam : 27', "Alphabetical 13");
			strictEqual($(elems[13]).text(), 'Sam : 27', "Alphabetical 14");
			
			base.domDown();
			base.dbDown();
		});
	});

	QUnit.test('Add documents, check correct indexes with string and number based sorting', function () {
		var ab = new ForerunnerDB.shared.modules.ActiveBucket({
				name: 1,
				age: -1
			}),
			names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
			ages = [15, 18, 22, 27, 33, 41, 47, 52],
			i, k,
			testIndex,
			testArr = [],
			obj,
			objs = [],
			index;

		for (i = 0; i < names.length; i++) {
			for (k = 0; k < ages.length; k++) {
				obj = {
					name: names[i],
					age: ages[k]
				};

				objs.push(obj);
				ab.insert(obj);
			}
		}

		strictEqual(ab.count(), 40, 'Correct number of items: ' + ab.count());

		for (i = 0; i < objs.length; i++) {
			obj = objs[i];

			index = ab.index(obj);

			if (testArr[index]) {
				testArr.splice(index, 0, obj);
			} else {
				testArr[index] = obj;
			}
		}

		strictEqual(testArr[31].name === 'Rob' && testArr[31].age, 15, 'Items at correct index');
	});

	QUnit.test('Add documents, check correct indexes with string-based sorting', function () {
		var ab = new ForerunnerDB.shared.modules.ActiveBucket({
				name: -1,
				_id: 1
			}),
			names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
			_ids = ['15', '18', '22', '27', '33', '41', '47', '52'],
			i, k,
			testIndex,
			testArr = [],
			obj,
			objs = [],
			index;

		for (i = 0; i < names.length; i++) {
			for (k = 0; k < _ids.length; k++) {
				obj = {
					name: names[i],
					_id: _ids[k]
				};

				objs.push(obj);
				ab.insert(obj);
			}
		}

		strictEqual(ab.count(), 40, 'Correct number of items: ' + ab.count());

		for (i = 0; i < objs.length; i++) {
			obj = objs[i];

			index = ab.index(obj);

			if (testArr[index]) {
				testArr.splice(index, 0, obj);
			} else {
				testArr[index] = obj;
			}
		}

		strictEqual(testArr[0].name === 'Sam' && testArr[0]._id, '15', 'Items at correct index');
	});

	QUnit.test('Time Performance', function () {
		var arr = [],
			alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'],
			names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
			ages = [15, 18, 22, 27, 33, 41, 47, 52],
			total = 3000,
			count = total,
			obj,
			index,
			tmpData;
		//buildArr = [{"name":"Sam","age":47},{"name":"Rob","age":41},{"name":"Bob","age":47},{"name":"Alice","age":18},{"name":"Jim","age":33},{"name":"Sam","age":41},{"name":"Jim","age":27}],
		//count = buildArr.length;

		// Generate names and ages
		names = [];
		ages = [];

		var sd2 = new Date().getTime();
		for (var i = 0; i < 10000; i++) {
			tmpData = '';

			for (var ii = 0; ii < 6; ii++) {
				tmpData += alpha[Math.floor(Math.random() * alpha.length)];
			}

			names.push(tmpData);

			tmpData = Math.floor(Math.random() * 60);

			ages.push(tmpData);
		}
		ok(true, 'Generate random data time: ' + (new Date().getTime() - sd2));

		var ab = new ForerunnerDB.shared.modules.ActiveBucket({
			name: 1,
			age: -1
		});

		var sd2 = new Date().getTime();
		while (count--) {
			obj = {
				name: names[Math.floor(Math.random() * names.length)],
				age: ages[Math.floor(Math.random() * ages.length)]
			};

			index = ab.insert(obj);
		}
		var tt = (new Date().getTime() - sd2);
		ok(Math.ceil(tt / total) < 30, 'Insert ' + total + ' Items Time: ' + tt + 'ms (' + Math.ceil(tt / total) + 'ms per item)');

		var sd2 = new Date().getTime();
		obj = {
			name: names[Math.floor(Math.random() * names.length)],
			age: ages[Math.floor(Math.random() * ages.length)]
		};

		ab.insert(obj);
		var tt = (new Date().getTime() - sd2);
		ok(tt < 20, 'Individual Item Insert Time: ' + tt + 'ms');

		var sd2 = new Date().getTime();
		obj = {
			name: 'Fred',
			age: 19
		};

		ab.insert(obj);
		var tt = (new Date().getTime() - sd2);
		ok(tt < 30, 'Non-Normal Item Insert Time: ' + tt + 'ms');

		/*for (var i = 0; i < arr.length; i++) {
		 console.log(arr[i].name + ' ' + arr[i].age);
		 }*/

		/*for (var i = 0; i < ab._data.length; i++) {
		 console.log(ab._data[i]);
		 }*/
	});

	test('ActiveBucket - Add documents, check correct indexes with string-based sorting', function () {
		var ab = new ForerunnerDB.shared.modules.ActiveBucket({
					name: -1,
					_id: 1
				}),
				names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
				_ids = ['15', '18', '22', '27', '33', '41', '47', '52'],
				i, k,
				testIndex,
				testArr = [],
				obj,
				objs = [],
				index;

		for (i = 0; i < names.length; i++) {
			for (k = 0; k < _ids.length; k++) {
				obj = {
					name: names[i],
					_id: _ids[k]
				};

				objs.push(obj);
				ab.insert(obj);
			}
		}

		ok(ab.count() === 40, 'Correct number of items: ' + ab.count());

		for (i = 0; i < objs.length; i++) {
			obj = objs[i];

			index = ab.index(obj);

			if (testArr[index]) {
				testArr.splice(index, 0, obj);
			} else {
				testArr[index] = obj;
			}
		}

		ok(testArr[0].name === 'Sam' && testArr[0]._id === '15', 'Items at correct index');
	});
});