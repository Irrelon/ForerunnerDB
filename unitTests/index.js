require([
	'./base'
], function (base) {
	require([
		'./tests/testsCore'
	], function (testsCore) {
		require([
			'./tests/testsIndex'
		], function (testsIndex) {
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
});