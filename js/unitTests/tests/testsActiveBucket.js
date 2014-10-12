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
		ab.add({
			name: names[Math.floor(Math.random() * names.length)],
			age: ages[Math.floor(Math.random() * ages.length)]
		});
	}

	ok(ab.count() === total, 'Correct number of items: ' + ab.count());
});

test('ActiveBucket - Add documents, check correct indexes', function () {
	var ab = new ForerunnerDB.shared.modules.ActiveBucket({
			name: 1,
			age: -1
		}),
		names = ['Rob', 'Jim', 'Alice', 'Sam', 'Bob'],
		ages = [15, 18, 22, 27, 33, 41, 47, 52],
		i, k,
		testIndex;

	for (i = 0; i < names.length; i++) {
		for (k = 0; k < ages.length; k++) {
			ab.add({
				name: names[i],
				age: ages[k]
			});
		}
	}

	ok(ab.count() === 40, 'Correct number of items: ' + ab.count());

	testIndex = ab.index({
		name: 'Rob',
		age: 15
	});

	ok(testIndex[0] === 3 && testIndex[1] === 7, 'Items at correct index 3.7: ' + testIndex.join('.'));
});