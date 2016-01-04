"use strict";

var ForerunnerDB = require('../builds/nodecore'),
	fdb = new ForerunnerDB(),
	db = fdb.db('testApi');

db.api.access('books', '*', function (modelName, methodName, req, callback) {
	callback(false, modelName, methodName, req);
});

db.api.listen('0.0.0.0', '9010', function () {
	console.log('Server started!');
});