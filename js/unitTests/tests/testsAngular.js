QUnit.module('Angular');
ForerunnerDB.moduleLoaded(['View', 'Angular'], function () {
	QUnit.test('View.queryData() :: Set query and data and check that returned data matches expected result', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			$scope = {
				$apply: function () {},
				$on: function () {}
			};

		view
			.queryData({}, {
				$orderBy: {
					createdTs: -1
				}
			})
			.from(coll)
			.ng($scope, 'data');

		coll.insert({
			_id: 1,
			createdTs: 1
		});

		coll.insert({
			_id: 2,
			createdTs: 2
		});

		strictEqual($scope.data[0]._id, 2, 'OK');
		strictEqual($scope.data[1]._id, 1, 'OK');

		base.dbDown();
	});

	QUnit.test('View.find() :: Insert into an underlying collection and check view has record', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			$scope = {
				$apply: function () {},
				$on: function () {}
			};

		view.from(coll)
			.ng($scope, 'data');

		strictEqual($scope.data.length, 0, 'Result count before insert correct');

		coll.insert({
			moo: true
		});

		strictEqual($scope.data.length, 1, 'Result count after insert correct');

		base.dbDown();
	});

	QUnit.test('View.find() :: Update an underlying collection and check view is updated', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test').truncate(),
			view = db.view('test'),
			$scope = {
				$apply: function () {},
				$on: function () {}
			};

		view.from(coll)
			.ng($scope, 'data');

		strictEqual($scope.data.length, 0, 'Result count before insert correct');

		coll.insert({
			moo: true,
			moduleData: {
				listenList: [{
					_id: "1345",
					name: 'Old'
				}]
			}
		});

		strictEqual($scope.data.length, 1, 'Result count after insert correct');
		strictEqual($scope.data[0].moo, true, 'Result data before update correct');
		strictEqual($scope.data[0].moduleData.listenList[0].name, "Old", 'Result nested data before update correct');

		coll.update({
			_id: $scope.data[0]._id
		}, {
			moo: false
		});

		strictEqual($scope.data.length, 1, 'Result count after update correct');
		strictEqual($scope.data[0].moo, false, 'Result data after update correct');

		// Try an advanced update (into a sub-document)
		coll.update({
			_id: $scope.data[0]._id,
			moduleData: {
				listenList: {
					_id: "1345"
				}
			}
		}, {
			moduleData: {
				'listenList.$': {
					name: "New"
				}
			}
		});

		strictEqual($scope.data.length, 1, 'Result count after update correct');
		strictEqual($scope.data[0].moo, false, 'Result data after update correct');
		strictEqual($scope.data[0].moduleData.listenList[0].name, "New", 'Result nested data after update correct');

		base.dbDown();
	});

	QUnit.test("View $join :: Update joined collection and ensure view is properly updated", function () {
		base.dbUp();
		base.dataUp();

		var userView,
			$scope = {
				$apply: function () {},
				$on: function () {}
			};

		userView = db.view('userView')
			.from('user')
			.query({}, {
				"$join": [{
					"organisation": {
						"_id": "orgId",
						"$as": "org",
						"$require": true,
						"$multi": false
					}
				}]
			})
			.ng($scope, 'data');

		strictEqual($scope.data[0].orgId, $scope.data[0].org._id, "Complete");
		strictEqual($scope.data[1].orgId, $scope.data[1].org._id, "Complete");
		strictEqual($scope.data[2].orgId, $scope.data[2].org._id, "Complete");

		// Now update organisation collection and check that view has new updated data
		db.collection('organisation').update({}, {
			newDataInOrg: true
		});

		// Check view data (should have newDataInOrg in the org data)
		strictEqual($scope.data[0].org.newDataInOrg, true, "Complete");
		strictEqual($scope.data[1].org.newDataInOrg, true, "Complete");
		strictEqual($scope.data[2].org.newDataInOrg, true, "Complete");

		base.dbDown();
	});

	/*QUnit.asyncTest('View.on("change") :: Change event fired when underlying data source updates view content', function () {
		"use strict";
		base.dbUp();

		var coll = db.collection('test'),
			view = db.view('test'),
			result,
				count = 0;

		view
			.queryData({}, {
				$orderBy: {
					createdTs: -1
				}
			})
			.from(coll);

		view.on('change', function () {
			count++;
		});

		coll.insert({
			_id: 1,
			createdTs: 1
		});

		coll.insert({
			_id: 2,
			createdTs: 2
		});

		setTimeout(function () {
			result = view.find();

			strictEqual(result[0]._id, 2, 'OK');
			strictEqual(result[1]._id, 1, 'OK');
			strictEqual(count, 2, 'OK');

			base.dbDown();
			start();
		}, 1000);
	});*/
});