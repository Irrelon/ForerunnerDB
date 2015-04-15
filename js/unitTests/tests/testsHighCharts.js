QUnit.module('HighChart');
ForerunnerDB.moduleLoaded('Highchart', function () {
	QUnit.test('Create chart', function () {
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
		}, {
			type: 'Tea',
			date: String(new Date('2014-09-13')).substr(0, 15),
			val: 28
		}, {
			type: 'Tea',
			date: String(new Date('2014-09-14')).substr(0, 15),
			val: 49
		}, {
			type: 'Tea',
			date: String(new Date('2014-09-15')).substr(0, 15),
			val: 12
		}]);

		// Create a pie chart on the element with the id "demo-chart"
		/*coll.lineChart('#demo-chart', 'type', 'date', 'val', {
			chartOptions: {
				title: {
					text: 'Jam Stores Over Time'
				}
			}
		});*/

		/*coll.pieChart('#demo-chart', 'name', 'val', 'Food');*/
		coll.lineChart('#demo-chart', 'type', 'date', 'val');
		/*coll.areaChart('#demo-chart', 'type', 'date', 'val');*/
		/*coll.columnChart('#demo-chart', 'type', 'date', 'val');*/
		/*coll.barChart('#demo-chart', 'type', 'date', 'val');*/
		/*coll.stackedBarChart('#demo-chart', 'type', 'date', 'val');*/

		ok(true, 'Creating ok');

		// Attempt to insert data
		coll.insert({
			type: 'Jam',
			date: String(new Date('2014-09-13')).substr(0, 15),
			val: 100
		});

		coll.insert({
			type: 'Jam',
			date: String(new Date('2014-09-14')).substr(0, 15),
			val: 120
		});

		coll.insert({
			type: 'Jam',
			date: String(new Date('2014-09-15')).substr(0, 15),
			val: 80
		});

		coll.insert({
			type: 'Tea',
			date: String(new Date('2014-09-15')).substr(0, 15),
			val: 66
		});

		ok(true, 'Inserting ok');

		// Attempt to update data
		coll.update({
			type: 'Jam',
			date: String(new Date('2014-09-14')).substr(0, 15)
		}, {
			val: 60
		});

		ok(true, 'Updating ok');

		// Attempt to remove data
		coll.remove({
			type: 'Jam',
			date: String(new Date('2014-09-13')).substr(0, 15)
		});

		ok(true, 'Removing ok');

		base.domDown();
		base.dbDown();
	});
});