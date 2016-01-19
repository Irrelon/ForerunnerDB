"use strict";

var ForerunnerDB = require('../builds/nodecore'),
	fdb = new ForerunnerDB(),
	db = fdb.db('testApi');

db.view('booksView')
	.queryData({
		enabled: true
	})
	.from('books');

// Enable database debug logging to the console
db.debug(true);

// Set the persist plugin's data folder
db.persist.dataDir('./data');

// Tell the database to load and save data for collections automatically
db.persist.auto(true);

// Set access control to allow all HTTP verbs (*) on the "books" collection in the "testApi" database
// db.api.access(<database name>, <object type>, <object name>, <http verb>, <your control method>);
fdb.api.access('testApi', 'collection', 'books', '*', function (collectionName, methodName, req, callback) {
	callback(false, collectionName, methodName, req);
});

fdb.api.access('testApi', 'view', '*', '*', function (viewName, methodName, req, callback) {
	callback(false, viewName, methodName, req);
});

// Ask the API server to start listening
fdb.api.start('0.0.0.0', '9010', {cors: true}, function () {
	console.log('Server started!');
});

// Stop API server with stop() call
//fdb.api.stop();