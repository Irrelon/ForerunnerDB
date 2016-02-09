"use strict";

var crcTable,
	checksum;

crcTable = (function () {
	var crcTable = [],
		c, n, k;

	for (n = 0; n < 256; n++) {
		c = n;

		for (k = 0; k < 8; k++) {
			c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)); // jshint ignore:line
		}

		crcTable[n] = c;
	}

	return crcTable;
}());

/**
 * Returns a checksum of a string.
 * @param {String} str The string to checksum.
 * @return {Number} The checksum generated.
 */
checksum = function(str) {
	var crc = 0 ^ (-1), // jshint ignore:line
		i;

	for (i = 0; i < str.length; i++) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF]; // jshint ignore:line
	}

	return (crc ^ (-1)) >>> 0; // jshint ignore:line
};

module.exports = checksum;