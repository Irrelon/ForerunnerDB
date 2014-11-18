ForerunnerDB.moduleLoaded('Highchart', function () {
	test('Highchart - Create chart', function () {
		base.dbUp();
		base.domUp();

		// Create the collection
		var coll = db.collection('chartData');

		// Set the collection data
		coll.setData([{
			type: 'Jam',
			date: String(new Date('2014-09-13')).substr(0, 15),
			val: 100
		}, {
			type: 'Jam',
			date: String(new Date('2014-09-14')).substr(0, 15),
			val: 33
		}, {
			type: 'Jam',
			date: String(new Date('2014-09-15')).substr(0, 15),
			val: 24
		}]);

		// Create a pie chart on the element with the id "demo-chart"
		coll.lineChart('#demo-chart', 'type', 'date', 'val', {
			chartOptions: {
				title: {
					text: 'Jam Stores Over Time'
				}
			}
		});

		/*coll.pieChart('#demo-chart', 'name', 'val', 'Food');*/
		//coll.lineChart('#demo-chart', 'type', 'date', 'val');
		/*coll.areaChart('#demo-chart', 'type', 'date', 'val');*/
		/*coll.columnChart('#demo-chart', 'type', 'date', 'val');*/
		/*coll.barChart('#demo-chart', 'type', 'date', 'val');*/
		/*coll.stackedBarChart('#demo-chart', 'type', 'date', 'val');*/

		ok(true, 'No errors');
		base.domDown();
		base.dbDown();
	});
});