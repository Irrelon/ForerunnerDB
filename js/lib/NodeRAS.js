"use strict";

/*
 * NodeRAS is a random access storage engine that allows us to load and save
 * data at high speed whilst maintaining the ability to only read sections
 * of data from the storage. It also supports middleware to allow for
 * functionality like encryption and data compression.
 */

/*
 * Data files saved by this storage engine are composed of an initial header
 * section which contains meta-data used to identify data entry boundaries
 * and then a body section which contains the data proper.
 *
 * You can think of the data file being composed of many JSON objects. The
 * header is one object and the body is an array of multiple other objects.
 * At the binary level we always start with a data length followed by a
 * marker that denotes the length end, after which the data will follow.
 *
 * e.g. 20:{"hello": "thgbfsw"}20:{"hello": "thgbfsw"}
 *
 * The first entry will always be the header or "meta-data". The meta-data
 * includes all the information we need to locate entries in the body randomly
 * so you can think of it as the body's index. It can also contain arbitrary
 * data apart from the index that may include flags denoting middleware usage
 * etc.
 */
var NodeRAS,
	fs = require('fs');

/**
 * Create a constructor method that calls the instance's init method.
 * This allows the constructor to be overridden by other modules because
 * they can override the init method with their own.
 * @class
 * @constructor
 */
NodeRAS = function () {
	this.init.apply(this, arguments);
};

NodeRAS.prototype.init = function () {
	var self = this;

	self.opCodes = {
		"insert": "00",
		"delete": "03",
		"pointer": "99"
	};

	/*
	opcode(2)bytesize(*):data:pointer:

	0 0020:{"hello": "thgbfsw",:99223:
	...
	8834 0310:{"a":"12"}::
	...
	99223 9913:"foo": "bar"}::

	Line 8834 has opcode 03 (deleted) so that space is now empty

	Read line 0.
	Opcode: 00 (insert)
	Data byte length: 20
	Data is: {"hello": "thgbfsw",
	Pointer shows more data at position 99223

	Skip to 99223

	Read line 99223
	Opcode: 99 (continued data)
	Data byte length: 13
	Data is: "foo": "bar"}
	Pointer hold no data, end of data

	Reconstituted data is: {"hello": "thgbfsw","foo": "bar"}
	*/
};

/**
 * Appends new data to the end of the file.
 * @param filePath The file to operate on.
 * @param primaryKey The data entry's primary key.
 * @param data The data to write.
 * @param callback A callback after the operation has finished.
 */
NodeRAS.prototype.post = function (filePath, primaryKey, data, callback) {
	var self = this;

	fs.open(filePath, 'a', function(status, fd) {
		var dataLine = self.encodeDataLine('insert', data, "");

		fs.write(fd, dataLine, function(err) {
			fs.close(fd);
			callback(err);
		});
	});
};

/**
 *
 * @param filePath The file to operate on.
 * @param primaryKey The data entry's primary key.
 * @param data The data to write.
 * @param callback
 */
NodeRAS.prototype.put = function (filePath, primaryKey, data, callback) {
	var self = this;

	fs.open(filePath, 'a', function(status, fd) {
		var dataLine = self.encodeDataLine('insert', data, "");

		fs.write(fd, dataLine, function(err) {
			fs.close(fd);
			callback(err);
		});
	});
};

NodeRAS.prototype.encodeDataLine = function (opType, data, pointer) {
	pointer = pointer !== undefined ? pointer : "";
	return this.opCodes[opType] + Buffer.byteLength(data, 'utf8') + ':' + data + ":" + pointer + ":";
};

/**
 * Scans the data file specified and removes entries marked for deletion,
 * de-fragments entries that span multiple points and then re-writes the
 * file.
 *
 * @returns {Number} The number of bytes saved by the compact process.
 * This is the file size in bytes before the operation minus the file size
 * in bytes after the operation.
 */
NodeRAS.prototype.compact = function () {
	var delta = 0;

	return delta;
};

module.exports = NodeRAS;