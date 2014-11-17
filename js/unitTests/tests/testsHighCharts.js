ForerunnerDB.moduleLoaded('Highchart', function () {
	test('Highchart - Create chart', function () {
		base.dbUp();
		base.domUp();

		var coll = db.collection('test');

		coll.setData([{
			name: 'Jam',
			date: String(new Date('2014-09-13')).substr(0, 15),
			type: 'Food',
			val: 100
		}, {
			name: 'Pie',
			date: String(new Date('2014-09-14')).substr(0, 15),
			type: 'Food',
			val: 33
		}, {
			name: 'Jam',
			date: String(new Date('2014-09-13')).substr(0, 15),
			type: 'Money',
			val: 24
		}, {
			name: 'Pie',
			date: String(new Date('2014-09-14')).substr(0, 15),
			type: 'Money',
			val: 53
		}]);

		/*coll.pieChart({
			selector: '#demo-chart',
			keyField: 'name',
			valField: 'val',
			seriesName: 'Food'
		});*/

		/*coll.lineChart({
			selector: '#demo-chart',
			seriesField: 'type',
			keyField: 'date',
			valField: 'val',
			seriesName: 'Food'
		});*/

		/*coll.areaChart({
			selector: '#demo-chart',
			seriesField: 'type',
			keyField: 'date',
			valField: 'val',
			seriesName: 'Food'
		});*/

		/*coll.columnChart({
			selector: '#demo-chart',
			seriesField: 'type',
			keyField: 'date',
			valField: 'val',
			seriesName: 'Food'
		});*/

		/*coll.barChart({
			selector: '#demo-chart',
			seriesField: 'type',
			keyField: 'date',
			valField: 'val',
			seriesName: 'Food'
		});*/

		/*coll.stackedBarChart({
			selector: '#demo-chart',
			seriesField: 'type',
			keyField: 'date',
			valField: 'val',
			seriesName: 'Food'
		});*/

		ok(true, 'Moo');
		//base.domDown();
		//base.dbDown();
	});
});