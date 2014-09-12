var Server = (function () {
	// Require FDB
	var ForerunnerDB = require('../lib/ForerunnerDB.Core'),
		Server = require('../lib/ForerunnerDB.Server.js');

	// Instantiate FDB
	var db = new ForerunnerDB();

	// Set permissions
	db.server.addAuth({
		user: 'test',
		pass: 'test',
		globalActions: {
			'find': true
		},
		collectionActions: {
			'stream': {
				'setData': true,
				'find': true,
				'insert': true,
				'update': true,
				'remove': true
			}
		}
	});

	// Start the FDB server module
	db.server.start();
})();