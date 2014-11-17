ForerunnerDB.moduleLoaded('Highchart', function () {
	test('Highchart - Create chart', function () {
		base.dbUp();
		base.domUp();

		var coll = db.collection('test');

		coll.setData([{
			name: 'Jam',
			val: 100
		}, {
			name: 'Pie',
			val: 33
		}]);

		coll.chart({
			selector: '#demo-chart',
			type: 'pie',
			keyField: 'name',
			valField: 'val',
			seriesName: 'Food'
		});

		ok(true, 'Moo');
		//base.domDown();
		//base.dbDown();
	});
});