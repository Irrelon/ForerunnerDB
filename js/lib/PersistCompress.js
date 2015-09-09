"use strict";

var Shared = require('./Shared'),
	pako = require('pako');

var Plugin = function () {
	this.init.apply(this, arguments);
};

Plugin.prototype.init = function (options) {

};

Plugin.prototype.encode = function (val, meta, finished) {
	var wrapper = {
			data: val,
			type: 'fdbCompress',
			enabled: false
		},
		before,
		after,
		compressedVal;

	// Compress the data
	before = val.length;
	compressedVal = pako.deflate(val, {to: 'string'});
	after = compressedVal.length;

	// If the compressed version is smaller than the original, use it!
	if (after < before) {
		wrapper.data = compressedVal;
		wrapper.enabled = true;
	}

	meta.compression = {
		enabled: wrapper.enabled,
		compressedBytes: after,
		uncompressedBytes: before,
		effect: Math.round((100 / before) * after) + '%'
	};

	finished(false, JSON.stringify(wrapper), meta);
};

Plugin.prototype.decode = function (wrapper, meta, finished) {
	var compressionEnabled = false,
		data;

	if (wrapper) {
		wrapper = JSON.parse(wrapper);

		// Check if we need to decompress the string
		if (wrapper.enabled) {
			data = pako.inflate(wrapper.data, {to: 'string'});
			compressionEnabled = true;
		} else {
			data = wrapper.data;
			compressionEnabled = false;
		}

		meta.compression = {
			enabled: compressionEnabled
		};

		if (finished) {
			finished(false, data, meta);
		}
	} else {
		if (finished) {
			finished(false, data, meta);
		}
	}
};

// Register this plugin with the persistent storage class
Shared.plugins.FdbCompress = Plugin;

module.exports = Plugin;