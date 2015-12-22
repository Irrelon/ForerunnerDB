"use strict";

var ForerunnerDB = require('../builds/nodecore'),
	fdb = new ForerunnerDB(),
	db = fdb.db('testApi');

db.api.listen('0.0.0.0', '9010', function () {

});