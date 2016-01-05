angular.module('app.controllers')
	.controller('itemDetailCtrl', function ($scope, $api, $stateParams, $ionicPopup) {
		//console.log('itemDetailCtrl');

		$scope.refreshView = function () {
			db.collection('item').sync(function () {
				$scope.$broadcast('scroll.refreshComplete');
			});
			/*$api.getInto('/item', 'items', function (err) {
				if (err) {
					$ionicPopup.alert({
						title: 'Ooops...',
						template: 'There was a problem refreshing the data, please try again!'
					});
				}

				$scope.$broadcast('scroll.refreshComplete');
			});*/
		};

		db.view('itemDetail')
			.from('item')
			.query({
				_id: $stateParams.itemId
			})
			.ng($scope, 'item', {
				$single: true
			});

		$scope.refreshView();

		/*$scope.$on('$destroy', function () {
			db.collection('item').unSync();
		});*/
	});