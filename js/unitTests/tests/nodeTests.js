"use strict";

var TB = require('testbear'),
	ForerunnerDB = require('../../builds/nodecore'),
	Base = require('./base'),
	base = new Base();

require('./activeBucket')(TB, ForerunnerDB, base);
/*require('./core')(TB, ForerunnerDB, base);
require('./collection')(TB, ForerunnerDB, base);
require('./condition')(TB, ForerunnerDB, base);
require('./joins')(TB, ForerunnerDB, base);
require('./persist')(TB, ForerunnerDB, base);*/

TB.start();