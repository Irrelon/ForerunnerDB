require([
	'../ForerunnerDB',
	'../lib/ForerunnerDB.CollectionGroup',
	'../lib/ForerunnerDB.View',
	'../lib/ForerunnerDB.OldView',
	'../lib/ForerunnerDB.OldView.Bind',
	'./base'
], function (ForerunnerDB, CollectionGroup, OldView, OldViewBind, base) {
	require([
		'./tests/testsCore'
	], function (testsCore) {
		require([
			'./tests/testsEvents'
		], function (testsEvents) {
			require([
				'./tests/testsBind'
			], function (testsBind) {
				require([
					'./tests/testsPaging'
				], function (testsPaging) {
					require([
						'./tests/testsTransform'
					], function (testsTransform) {

					});
				});
			});
		});
	});
});