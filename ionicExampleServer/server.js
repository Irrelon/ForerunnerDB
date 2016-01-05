"use strict";

var ForerunnerDB = require('../js/builds/nodecore'),
	fdb = new ForerunnerDB(),
	db = fdb.db('ForerunnerDB_Ionic_App');

// Enable database debug logging to the console
db.debug(true);

// Set the persist plugin's data folder
db.persist.dataDir('./data');

// Tell the database to load and save data for collections automatically
db.persist.auto(true);

// Set access control to allow all HTTP verbs on the "item" collection
// to all clients
db.api.access('item', '*', function (modelName, methodName, req, callback) {
	callback(false, modelName, methodName, req);
});

// Ask the API server to start listening
db.api.listen('0.0.0.0', '9010', function () {
	console.log('Server started!');
});