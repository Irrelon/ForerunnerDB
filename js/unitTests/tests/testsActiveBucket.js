test('ActiveBucket - Create instance', function () {
	var ab = new ForerunnerDB.shared.modules.ActiveBucket({});
	ok(ab instanceof ForerunnerDB.shared.modules.ActiveBucket, 'Instance created');
});

test('ActiveBucket - Add document', function () {
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

	ok(ab.count() === total, 'Correct number of items (' + total + '): ' + ab.count());
});

test('ActiveBucket - Add documents, check correct indexes', function () {
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

	ok(testArr[31].name === 'Rob' && testArr[31].age === 15, 'Items at correct index');
});

test('ActiveBucket - Time Performance', function () {
	var arr = [],
		alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j','k','l','m','n','o','p'],
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
