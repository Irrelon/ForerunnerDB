var Server = (function () {
	// Require FDB
	var ForerunnerDB = require('../ForerunnerDB.js');

	// Load the server plugin module before instantiating FDB
	ForerunnerDB.prototype.Plugin.Server = require('../lib/ForerunnerDB.Server.js');

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