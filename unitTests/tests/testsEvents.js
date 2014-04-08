(function () {
	var init = (function (ForerunnerDB, base) {
		asyncTest("Events - Collection.on() :: Insert with Success", function() {
			base.dbUp();
			base.dataUp();

			expect(1);

			user.on('insert', function (successArr, failed) {
				ok(successArr.length === 1, "Insert single document");
				start();
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			base.dbDown();
		});

		asyncTest("Events - Collection.on() :: Insert with Failed", function() {
			base.dbUp();
			base.dataUp();

			expect(1);

			user.insert({
				_id: '2342',
				name: "hello"
			});

			user.on('insert', function (successArr, failed) {
				ok(failed.length === 1, "Insert single document with index violation");
				start();
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			base.dbDown();
		});

		asyncTest("Events - Collection.on() :: Update with Success", function() {
			base.dbUp();
			base.dataUp();

			expect(1);

			user.insert({
				_id: '2342',
				name: "hello"
			});

			user.on('update', function (updated, failed) {
				console.log('Updated');
				ok(updated.length === 1, "Update single document");
				start();
			});

			console.log('Calling update');
			user.update({
				_id: '2342'
			}, {
				name: "hello2"
			});

			base.dbDown();
		});

		asyncTest("Events - Collection.on() :: Remove with Success", function() {
			base.dbUp();
			base.dataUp();

			expect(1);

			user.insert({
				_id: '2342',
				name: "hello"
			});

			user.on('remove', function (removed, failed) {
				ok(removed.length === 1, "Remove single document");
				start();
			});

			user.remove({
				_id: '2342'
			});

			base.dbDown();
		});

		asyncTest("Events - View.on() :: Insert", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();

			expect(1);

			db.view('userView').on('insert', function (successArr, failed) {
				console.log('insert');
				ok(successArr.length === 1, "Insert single document");
				start();
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			base.viewDown();
			base.dbDown();
		});

		asyncTest("Events - CollectionGroup.on() :: Insert :: Event fired from collection", function() {
			base.dbUp();
			base.dataUp();

			expect(1);

			var group = db.collectionGroup('testGroup')
				.addCollection(user);

			group.on('insert', function (successArr, failed) {
				ok(successArr.length === 1, "Insert single document");
				start();
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			base.dbDown();
		});

		asyncTest("Events - CollectionGroup.on() :: Update :: Event fired from collection", function() {
			base.dbUp();
			base.dataUp();

			expect(1);

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var group = db.collectionGroup('testGroup')
				.addCollection(user);

			group.on('update', function (successArr, failArr) {
				ok(successArr.length === 1, "Update single document");
				start();
			});

			user.update({
				_id: '2342'
			}, {
				name: "hello2"
			});

			base.dbDown();
		});

		asyncTest("Events - CollectionGroup.on() :: Remove :: Event fired from collection", function() {
			base.dbUp();
			base.dataUp();

			expect(1);

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var group = db.collectionGroup('testGroup')
				.addCollection(user);

			group.on('remove', function (successArr, failArr) {
				ok(successArr.length === 1, "Remove single document");
				start();
			});

			user.remove({
				_id: '2342'
			});

			base.dbDown();
		});

		asyncTest("Events - CollectionGroup.on() :: Insert :: Event fired from view", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();

			expect(1);

			var group = db.collectionGroup('testGroup')
				.addCollection(userView);

			group.on('insert', function (successArr, failed) {
				ok(successArr.length === 1, "Insert single document");
				start();
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			base.viewDown();
			base.dbDown();
		});

		asyncTest("Events - CollectionGroup.on() :: Update :: Event fired from view", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();

			expect(1);

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var group = db.collectionGroup('testGroup')
				.addCollection(userView);

			group.on('update', function (successArr, failArr) {
				ok(successArr.length === 1, "Update single document");
				start();
			});

			user.update({
				_id: '2342'
			}, {
				name: "hello2"
			});

			base.viewDown();
			base.dbDown();
		});

		asyncTest("Events - CollectionGroup.on() :: Remove :: Event fired from view", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();

			expect(1);

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var group = db.collectionGroup('testGroup')
				.addCollection(userView);

			group.on('remove', function (successArr, failArr) {
				ok(successArr.length === 1, "Remove single document");
				start();
			});

			user.remove({
				_id: '2342'
			});

			base.viewDown();
			base.dbDown();
		});
	});

	if (typeof(define) === 'function' && define.amd) {
		// Use AMD
		require([
			'../ForerunnerDB',
			'./base'
		], function (ForerunnerDB, base) {
			init(ForerunnerDB, base);
		});
	} else {
		// Use global
		init(ForerunnerDB, base);
	}
})();