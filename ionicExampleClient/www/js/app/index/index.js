angular.module('app.controllers')
	.controller('indexCtrl', function ($scope, $location, $api) {
		//console.log('indexCtrl');

		db.collection('settings').load(function (err, data) {
			var tmpSettings;

			// Check if data was found... if not route to settings
			if (!err) {
				if (data.foundData) {
					// Check for required data
					tmpSettings = db.collection('settings').findOne();

					if (!tmpSettings || (tmpSettings && !tmpSettings.host) || (tmpSettings && !tmpSettings.port)) {
						data.foundData = false;
					}
				}

				if (!data.foundData) {
					// Insert a blank settings object
					db.collection('settings').insert({
						_id: '1'
					});

					// Route to settings
					$location.url('/index/settings');
				} else {
					// Route to alarms
					//$location.url('/index/alarms');
				}
			}
		});
	});