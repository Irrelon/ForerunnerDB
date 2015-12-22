"use strict";

QUnit.module('AiApi');
ForerunnerDB.moduleLoaded('AiApi', function () {
	QUnit.asyncTest('Set api url', function () {
		base.dbUp();

		db.api.url('http://localhost:9010');

		strictEqual(db.api.url(), 'http://localhost:9010', 'Url is set correctly');

		base.dbDown();
	});

	QUnit.asyncTest('Create user', function () {
		base.dbUp();

		db.api.url('http://localhost:9010');

		// Create user
		db.api.remote('user').create({
			username: 'foo@foo.com',
			password: 'bar',
			firstName: 'Jim',
			lastName: 'Jones'
		}, function (err, user) {
			if (!err && user) {

			}
		});

		base.dbDown();
	});

	QUnit.asyncTest('Authenticate user', function () {
		base.dbUp();

		db.api.url('http://localhost:9010');

		// Create user
		db.api.remote('user').create({
			username: 'foo@foo.com',
			password: 'bar',
			firstName: 'Jim',
			lastName: 'Jones'
		}, function (err, user) {
			if (!err && user) {
				// Authenticate
				db.api.remote('user').login({username: 'foo@foo.com', password: 'bar'}, function (err, tokenData) {
					if (!err && tokenData) {

					}
				});
			}
		});

		base.dbDown();
	});

	QUnit.asyncTest('Create record', function () {
		base.dbUp();

		db.api.url('http://localhost:9010');

		// Create user
		db.api.remote('user').create({
			username: 'foo@foo.com',
			password: 'bar',
			firstName: 'Jim',
			lastName: 'Jones'
		}, function (err, user) {
			if (!err && user) {
				// Authenticate
				db.api.remote('user').login({username: 'foo@foo.com', password: 'bar'}, function (err, tokenData) {
					var sessionId,
						ttl,
						created,
						userId,
						product;

					if (!err && tokenData) {
						sessionId = tokenData.id;
						ttl = tokenData.ttl;
						created = tokenData.created;
						userId = tokenData.userId;

						// Create a school record the "forerunner" way
						db.api.remote('school').insert({
							name: 'St. Anne\'s Primary',
							account: '14812932'
						}, function (err, productInstance) {

						});

						// Get user details
						db.api.remote('user').findById(userId, {}, function (err, userInstance) {
							if (!err) {

								// Logout
								db.api.remote('user').logout(sessionId, function (err) {
									if (!err) {
										// Logged out!
									}
								});
							}
						});
					}
				});
			}
		});

		base.dbDown();
	});

	QUnit.asyncTest('Add access control on global level for collection (*)', function () {
		base.dbUp();

		db.api.access('school', '*', function (schoolInstance, userInstance, callback) {
			if (userInstance && userInstance.type === '$authenticated') {
				// Allow user access because they are authenticated
				callback(false, true);
			} else {
				// Deny access because they are not authenticated
				callback(false, false);
			}
		});

		// Test non-auth request
		db.api.remote('school').find({}, function (err, data) {
			if (err) {
				// This request failed which is the expected behaviour
			}
		});

		// Create user
		db.api.remote('user', {$model: 'User'}).create({
			username: 'foo@foo.com',
			password: 'bar',
			firstName: 'Jim',
			lastName: 'Jones'
		}, function (err, user) {
			if (!err && user) {
				// Authenticate
				db.api.remote('user').login({username: 'foo@foo.com', password: 'bar'}, function (err, tokenData) {
					if (!err) {
						// Test auth request
						db.api.remote('school').find({}, function (err, data) {
							if (err) {
								// This request failed which is the expected behaviour
							}
						});
					}
				});
			}
		});

		base.dbDown();
	});
});