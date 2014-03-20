var Server = (function () {
	// Require FDB
	var ForerunnerDB = require('../ForerunnerDB.js');

	// Load the server plugin module before instantiating FDB
	ForerunnerDB.prototype.Plugin.Server = require('../lib/ForerunnerDB.Server.js');

	// Instantiate FDB
	var db = new ForerunnerDB();

	// Start the FDB server module
	db.server.start();
})();