"use strict";

var ForerunnerDB = require('../js/builds/nodecore'),
	fdb = new ForerunnerDB(),
	db = fdb.db('ForerunnerDB_Ionic_App');

// Enable database debug logging to the console
db.debug(true);
fdb.api.debug(true);

// Set the persist plugin's data folder
db.persist.dataDir('./data');

// Tell the database to load and save data for collections automatically
db.persist.auto(true);

// Set access control to allow all HTTP verbs on the "item" collection
// in the "ForerunnerDB_Ionic_App" database to all clients
fdb.api.access('ForerunnerDB_Ionic_App', 'collection', 'item', '*', function (dbName, objType, modelName, methodName, req, callback) {
	// You can customise this method to only callback false when you are happy
	// that the client connecting is allowed to connect. Calling back with true
	// or an error string as the first argument will cause the client connection
	// to be rejected.

	// The req.query.auth object will contain the data that you set on the
	// client with the call: fdb.api.auth(<my data>). This allows you to check
	// a client session etc to determine if they are allowed to access this
	// collection and allowed to sync with it in realtime
	//console.log(req.query.auth);

	// In this case here we are simply allowing all clients to connect
	callback(false, dbName, objType, modelName, methodName, req);
});

// Ask the API server to start listening
fdb.api.start('0.0.0.0', '9010', {
	cors: true
}, function () {
	console.log('Server started!');
});