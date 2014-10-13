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
		total = 100000,
		count = total;

	while (count--) {
		ab.add({
			name: names[Math.floor(Math.random() * names.length)],
			age: ages[Math.floor(Math.random() * ages.length)]
		});
	}

	ok(ab.count() === total, 'Correct number of items (100 thousand items): ' + ab.count());
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
			ab.add(obj);
		}
	}

	obj = {
		name: 'Rob',
		age: 15
	};
	objs.push(obj);
	ab.add(obj);

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

	ok(testArr === 'Rob' && testArr === 15, 'Items at correct index');
});

test('New sort', function () {
	var arr = [],
		alpha = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j','k','l','m','n','o','p'],
		names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
		ages = [15, 18, 22, 27, 33, 41, 47, 52],
		total = 30000,
		count = total,
		keyArr = [],
		namesArr = [],
		agesArr = [],
		nameIndex,
		ageIndex,
		obj,
		key,
		keyIndex,
		index,
		keyCache = {
			sort: 0,
			splice: 0
		},
		tmpData,
		currentIndex;
		//buildArr = [{"name":"Sam","age":47},{"name":"Rob","age":41},{"name":"Bob","age":47},{"name":"Alice","age":18},{"name":"Jim","age":33},{"name":"Sam","age":41},{"name":"Jim","age":27}],
		//count = buildArr.length;

	// Generate names and ages
	names = [];
	ages = [];

	var sd2 = new Date().getTime();
	for (var i = 0; i < 1000; i++) {
		tmpData = '';

		for (var ii = 0; ii < 6; ii++) {
			tmpData += alpha[Math.floor(Math.random() * alpha.length)];
		}

		names.push(tmpData);

		tmpData = Math.floor(Math.random() * 60);

		ages.push(tmpData);
	}
	ok(true, 'Generate random data time: ' + (new Date().getTime() - sd2));

	var sortAsc = function (a, b) {
		if (typeof(a) === 'string' && typeof(b) === 'string') {
			return a.localeCompare(b);
		} else {
			if (a > b) {
				return 1;
			} else if (a < b) {
				return -1;
			}
		}

		return 0;
	};

	var sortDesc = function (a, b) {
		if (typeof(a) === 'string' && typeof(b) === 'string') {
			return a.localeCompare(b);
		} else {
			if (a > b) {
				return -1;
			} else if (a < b) {
				return 1;
			}
		}

		return 0;
	};

	var qs = function (arr, item, fn) {
		if (!arr.length) {
			return 0;
		}

		var midwayIndex,
			lookupItem,
			result,
			start = 0,
			end = arr.length - 1,
			count = 0;

		while (count < 100 && end >= start) {
			midwayIndex = Math.floor((start + end) / 2);
			lookupItem = arr[midwayIndex];
			result = fn(item, lookupItem);

			if (result > 0) {
				start = midwayIndex + 1;
			}

			if (result < 0) {
				end = midwayIndex - 1;
			}
			count++;
		}

		if (result > 0) {
			return midwayIndex + 1;
		} else {
			return midwayIndex;
		}

	};

	var addItem = function (obj) {
		key = obj.name + '.:.'  + obj.age;
		keyIndex = keyArr.indexOf(key);

		if (keyIndex === -1) {
			// Insert key
			var sd = new Date().getTime();
			keyIndex = qs(keyArr, key, function (a, b) {
				var aVals = a.split('.:.'),
					bVals = b.split('.:.');

				if (aVals[0] === bVals[0]) {
					return sortDesc(Number(aVals[1]), Number(bVals[1]));
				}

				return sortAsc(aVals[0], bVals[0]);
			});
			keyCache.sort += (new Date().getTime() - sd);

			var sd = new Date().getTime();
			keyArr.splice(keyIndex, 0, key);
			keyCache.splice += (new Date().getTime() - sd);
		} else {
			var sd = new Date().getTime();
			keyArr.splice(keyIndex, 0, key);
			keyCache.splice += (new Date().getTime() - sd);
		}

		return keyIndex;
	};

	var sd2 = new Date().getTime();
	while (count--) {
		obj = {
			name: names[Math.floor(Math.random() * names.length)],
			age: ages[Math.floor(Math.random() * ages.length)]
		};

		index = addItem(obj);
		arr.splice(index, 0, obj);
	}
	var tt = (new Date().getTime() - sd2);
	ok(Math.ceil(tt / total) < 30, 'Insert ' + total + ' Items Time: ' + tt + 'ms (' + Math.ceil(tt / total) + 'ms per item)');

	var sd2 = new Date().getTime();
	obj = {
		name: names[Math.floor(Math.random() * names.length)],
		age: ages[Math.floor(Math.random() * ages.length)]
	};

	index = addItem(obj);
	arr.splice(index, 0, obj);
	var tt = (new Date().getTime() - sd2);
	ok(tt < 20, 'Individual Item Insert Time: ' + tt + 'ms');

	var sd2 = new Date().getTime();
	obj = {
		name: 'Fred',
		age: 19
	};

	index = addItem(obj);
	arr.splice(index, 0, obj);
	var tt = (new Date().getTime() - sd2);
	ok(tt < 30, 'Non-Normal Item Insert Time: ' + tt + 'ms');

	/*for (var i = 0; i < arr.length; i++) {
		console.log(arr[i].name + ' ' + arr[i].age);
	}

	for (var i = 0; i < keyArr.length; i++) {
		console.log(keyArr[i]);
	}*/

	console.log(keyCache);
});
