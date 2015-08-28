"use strict";

var Shared = require('./Shared');//,
	//pako = require('pako');

var Plugin = function () {
	this.init.apply(this, arguments);
};

Plugin.prototype.init = function () {};

Plugin.prototype.encode = function (val, finished) {
	var wrapper = {
		data: val,
		type: 'fdbCompress'
	};

	finished(false, wrapper);
};

Plugin.prototype.decode = function (val, finished) {

	finished(false, val);
};

// Register this plugin with the persistent storage class
Shared.modules.Persist.prototype.plugins.fdbCompress = Plugin;

module.exports = Plugin;