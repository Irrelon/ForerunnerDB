// Define our app and require forerunnerdb
angular.module('app', ['ionic', 'app.controllers', 'app.routes', 'app.services', 'app.directives', 'forerunnerdb'])
	// Run the app and tell angular we need the $fdb service
	.run(function ($ionicPlatform, $rootScope, $fdb) {
		// Define a ForerunnerDB database on the root scope and also
		// in the window object so we can access our db really easily
		// (note you don't NEED to have window.db if you don't want it)
		$rootScope.$db = window.db = $fdb.db('ForerunnerDB_Ionic_App');

		// Tell forerunner about our API server
		$fdb.api.server('http://0.0.0.0', '9010');

		// Tell forerunner to send up our session data when connecting
		$fdb.api.session('sessionId', 'mySessionId');

		$ionicPlatform.ready(function () {
			// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
			// for form inputs)
			if (window.cordova && window.cordova.plugins.Keyboard) {
				cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
			}
			if (window.StatusBar) {
				// org.apache.cordova.statusbar required
				StatusBar.styleDefault();
			}
		});
	});