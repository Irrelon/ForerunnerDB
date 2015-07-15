(function () {
	var fdb = new ForerunnerDB(),
		db = fdb.db(),
		coll = db.collection('testList'),
		view = db.view('testList'),
		i;

	console.time('Create');
	for (i = 0; i < 50000; i++) {
		coll.insert({
			_id: i,
			name: 'Item ' + i
		});
	}

	console.timeEnd('Create');

	console.time('View Data From');
	view.from(coll);
	console.timeEnd('View Data From');

	console.time('Infinilist');
	console.profile('Infinilist');
	view.infinilist('#testContainer', '#listItem');
	console.profileEnd('Infinilist');
	console.timeEnd('Infinilist');
})();