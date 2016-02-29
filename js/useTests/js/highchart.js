var fdb = new ForerunnerDB(),
	db = fdb.db('test');

// Create some chart data
db.collection('parentsBooked').setData([{
	key: 'Un-booked',
	val: 23
}, {
	key: 'Booked',
	val: 77
}]);

// Create a pie chart
db.collection('parentsBooked').pieChart('#bookedParentChart', 'key', 'val', '', {
	'chartOptions': {
		chart: {
			plotBackgroundColor: null,
			plotBorderWidth: null,
			plotShadow: false
		},
		title: {
			text: 'Parents Booked'
		},
		tooltip: {
			pointFormat: '{point.percentage:.0f}%'
		}
	},
	seriesOptions: {
		dataLabels: {
			enabled: true,
			format: '{point.percentage:.1f} %',
			style: {
				color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
			}
		}
	}
});