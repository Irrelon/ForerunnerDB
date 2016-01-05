angular.module('app.routes')
	.config(function ($stateProvider, $urlRouterProvider) {
		// Ionic uses AngularUI Router which uses the concept of states
		// Learn more here: https://github.com/angular-ui/ui-router
		// Set up the various states which the app can be in.
		// Each state's controller can be found in controllers.js
		$stateProvider
			.state('index', {
				url: '/index',
				abstract: true,
				templateUrl: 'js/app/index/menu.html',
				controller: 'indexCtrl'
			})

			.state('index.settings', {
				url: '/settings',
				views: {
					'index': {
						templateUrl: 'js/app/index/settings.html',
						controller: 'settingsCtrl'
					}
				}
			});
	});