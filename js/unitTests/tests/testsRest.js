QUnit.module('Rest');
ForerunnerDB.moduleLoaded('Rest', function () {
	QUnit.asyncTest("Get items for collection", function () {
		base.dbUp();

		var coll,
			results;

		// Get the login credentials for the user first
		db.rest.post('http://localhost:3000/api/Users/login', {
			email: 'rob@irrelon.com',
			password: 'fakepassword123'
		}, function (err, result) {
			if (!err) {
				expect(1);
				console.log('Result in REST: ', result);

				// Get collection
				coll = db.collection('site');

				// Assign API endpoint for collection
				coll.rest.endPoint('http://localhost:3000/api/sites');

				// Set API session data
				coll.rest.sessionData({
					id: result.id
				});

				// Check for empty collection
				results = coll.find();

				strictEqual(results.length, 0, "Collection is empty");

				coll.transform({
					enabled: true,
					dataIn: function (data) {
						data._id = data.id;
						delete data.id;

						return data;
					}
				});

				// Get rest data from API
				coll.rest.get('', {}, function () {
					console.log(coll.find());

					start();
					base.dbDown();
				});
			} else {
				expect(0);
				console.error('Error in REST call:', err);
				start();
			}
		});
	});
});