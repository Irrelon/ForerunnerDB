(function () {
	var fdb = new ForerunnerDB(),
		db = fdb.db(),
		coll = db.collection('testList'),
		view = db.view('testList'),
		data = [],
		i;

	console.time('Create');
	for (i = 0; i < 1213; i++) {
		data.push({
			_id: i,
			name: 'Item ' + i
		});
	}

	coll.insert(data, function () {
		console.timeEnd('Create');

		console.time('View Data From');
		view.from(coll);
		console.timeEnd('View Data From');

		console.time('Infinilist');
		console.profile('Infinilist');
		view.infinilist('#testContainer', '#listItem', {
			infinilist: {
				itemHeight: 24,
				countQuery: {}
			}
		});
		console.profileEnd('Infinilist');
		console.timeEnd('Infinilist');
	});
})();