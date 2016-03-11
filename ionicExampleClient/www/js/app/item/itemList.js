angular.module('app.controllers')
	.controller('itemListCtrl', function ($scope, $api, $ionicPopup) {
		//console.log('itemListCtrl');

		$scope.refreshView = function () {
			db.collection('item').sync(function () {
				$scope.$broadcast('scroll.refreshComplete');
			});
		};

		$scope.addItem = function () {
			var inputVal = '';

			$scope.inputValChange = function ($childScope, val) {
				inputVal = val;
			};

			$ionicPopup.show({
				template: '<input type="text" name="inputVal" ng-model="inputVal" ng-change="inputValChange(this, inputVal);" placeholder="e.g. My Item" />',
				title: 'Enter Item Name',
				subTitle: 'Enter the name you want to give your new item.',
				scope: $scope,
				buttons: [
					{ text: 'Cancel' },
					{
						text: '<b>OK</b>',
						type: 'button-positive',
						onTap: function(e) {
							$api.post('/fdb/ForerunnerDB_Ionic_App/collection/item', {
								"name": inputVal
							}, function (err, data) {
								if (!err) {
									// Post successful
								}
							});
						}
					}
				]
			});
		};

		$scope.editItem = function (id) {
			var inputVal = db.collection('item').findOne({_id: id}).name;

			$scope.inputVal = inputVal;
			$scope.inputValChange = function ($childScope, val) {
				inputVal = val;
			};

			$ionicPopup.show({
				template: '<input type="text" name="inputVal" ng-model="inputVal" ng-change="inputValChange(this, inputVal);" placeholder="e.g. My Item" />',
				title: 'Edit Item Name',
				subTitle: 'Enter the new name you want to give your item.',
				scope: $scope,
				buttons: [
					{ text: 'Cancel' },
					{
						text: '<b>OK</b>',
						type: 'button-positive',
						onTap: function(e) {
							$api.put('/fdb/ForerunnerDB_Ionic_App/collection/item/' + id, {
								"name": inputVal
							}, function (err, data) {
								if (!err) {
									// Post successful
								}
							});
						}
					}
				]
			});
		};

		$scope.removeItem = function (id) {
			var confirmPopup = $ionicPopup.confirm({
				title: 'Delete Item',
				template: 'Are you sure you want to delete this item (' + db.collection('item').findOne({_id: id}).name + ')?'
			});

			confirmPopup.then(function(res) {
				if(res) {
					$api.delete('/fdb/ForerunnerDB_Ionic_App/collection/item/' + id, function (err, data) {
						if (!err) {
							// Delete successful
						}
					});
				}
			});
		};

		db.collection('item')
			.ng($scope, 'items');

		$scope.refreshView();

		$scope.$on('$destroy', function() {
			db.collection('item').unSync();
		});
	});