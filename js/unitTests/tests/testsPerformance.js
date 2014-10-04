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