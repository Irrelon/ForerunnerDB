require([
	'../ForerunnerDB',
	'../lib/ForerunnerDB.CollectionGroup',
	'../lib/ForerunnerDB.View',
	'../lib/ForerunnerDB.View.Bind',
	'./base'
], function (ForerunnerDB, CollectionGroup, View, ViewBind, base) {
	require([
		'./tests/testsCore'
	], function (testsCore) {
		require([
			'./tests/testsEvents'
		], function (testsEvents) {
			require([
				'./tests/testsBind'
			], function (testsBind) {

			});
		});
	});
});