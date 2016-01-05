angular.module('app.routes')
	.config(function ($stateProvider, $urlRouterProvider) {
		$stateProvider
			.state('index.items', {
				url: '/items',
				views: {
					'index': {
						templateUrl: 'js/app/item/itemList.html',
						controller: 'itemListCtrl'
					}
				}
			})

			.state('index.itemDetail', {
				url: '/items/:itemId',
				views: {
					'index': {
						templateUrl: 'js/app/item/detail.html',
						controller: 'itemDetailCtrl'
					}
				}
			});
	});