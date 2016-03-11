angular.module('app.controllers')
	.controller('settingsCtrl', function ($scope, $http, $ionicLoading) {
		//console.log('settingsCtrl');
		$scope.settings = db.collection('settings').findOne() || {};

		$scope.testConnection = function () {
			if ($scope.settings) {
				if ($scope.settings.host && $scope.settings.port) {
					$ionicLoading.show({
						template: 'Loading...'
					});

					$http.get($scope.settings.host + ':' + $scope.settings.port + '/fdb/ForerunnerDB_Ionic_App/collection/item').then(function (resp) {
						$ionicLoading.hide();

						if (resp.data && !resp.data.err) {
							// Success
							$scope.settings.success = true;
							$scope.settingsMsg = 'Connected successfully!';
						}
					}, function (err) {
						$ionicLoading.hide();
						console.log('login call error', arguments);
						$scope.settingsMsg = 'Error: ' + err;
					});
				}
			} else {
				$scope.settingsMsg = 'Missing settings!';
				console.log('Missing settings!');
			}
		};

		$scope.$on('$ionicView.enter', function(e) {
			//console.log('enter');
		});

		$scope.$on('$ionicView.beforeLeave', function() {
			// Get settings
			delete $scope.settings.success;
			delete $scope.settingsMsg;

			db.collection('settings').update({}, $scope.settings);
			db.collection('settings').save();
		});
	});