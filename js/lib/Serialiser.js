"use strict";

/**
 * Provides functionality to encode and decode JavaScript objects to strings
 * and back again. This differs from JSON.stringify and JSON.parse in that
 * special objects such as dates can be encoded to strings and back again
 * so that the reconstituted version of the string still contains a JavaScript
 * date object.
 * @constructor
 */
var Serialiser = function () {
	this.init.apply(this, arguments);
};

Serialiser.prototype.init = function () {
	this._encoder = [];
	this._decoder = {};

	// Register our handlers
	this.registerEncoder('$date', function (data) {
		if (data instanceof Date) {
			return data.toISOString();
		}
	});

	this.registerDecoder('$date', function (data) {
		return new Date(data);
	});
};

/**
 * Register a decoder that can handle decoding for a particular
 * object type.
 * @param {String} handles The name of the handler e.g. $date. When an object
 * has a field matching this handler name then this decode will be invoked
 * to provide a decoded version of the data that was previously encoded by
 * it's counterpart encoder method.
 * @param {Function} method The decoder method.
 */
Serialiser.prototype.registerDecoder = function (handles, method) {
	this._decoder[handles] = method;
};

/**
 * Register an encoder that can handle encoding for a particular
 * object type.
 * @param {String} handles The name of the handler e.g. $date.
 * @param {Function} method The encoder method.
 */
Serialiser.prototype.registerEncoder = function (handles, method) {
	this._encoder.push(function (data) {
		var methodVal = method(data),
			returnObj;

		if (methodVal !== undefined) {
			returnObj = {};
			returnObj[handles] = methodVal;
		}

		return returnObj;
	});
};

/**
 * Loops the encoders and asks each one if it wants to handle encoding for
 * the passed data object. If no value is returned (undefined) then the data
 * will be passed to the next encoder and so on. If a value is returned the
 * loop will break and the encoded data will be used.
 * @param {Object} data The data object to handle.
 * @returns {*} The encoded data.
 * @private
 */
Serialiser.prototype._encode = function (data) {
	// Loop the encoders and if a return value is given by an encoder
	// the loop will exit and return that value.
	var count = this._encoder.length,
		retVal;

	while (count-- && !retVal) {
		retVal = this._encoder[count](data);
	}

	return retVal;
};


/**
 * Converts a previously encoded string back into an object.
 * @param {String} data The string to convert to an object.
 * @returns {Object} The reconstituted object.
 */
Serialiser.prototype.parse = function (data) {
	return this._parse(JSON.parse(data));
};

/**
 * Handles restoring an object with special data markers back into
 * it's original format.
 * @param {Object} data The object to recurse.
 * @param {Object=} target The target object to restore data to.
 * @returns {Object} The final restored object.
 * @private
 */
Serialiser.prototype._parse = function (data, target) {
	var i;

	if (typeof data === 'object') {
		if (data instanceof Array) {
			target = target || [];
		} else {
			target = target || {};
		}

		// Iterate through the object's keys and handle
		// special object types and restore them
		for (i in data) {
			if (data.hasOwnProperty(i)) {
				if (i.substr(0, 1) === '$' && this._decoder[i]) {
					// This is a special object type and a handler
					// exists, restore it
					return this._decoder[i](data[i]);
				}

				// Not a special object or no handler, recurse as normal
				target[i] = this._parse(data[i], target[i]);
			}
		}
	} else {
		target = data;
	}

	// The data is a basic type
	return target;
};

/**
 * Converts an object to a encoded string representation.
 * @param {Object} data The object to encode.
 */
Serialiser.prototype.stringify = function (data) {
	return JSON.stringify(this._stringify(data));
};

/**
 * Recurse down an object and encode special objects so they can be
 * stringified and later restored.
 * @param {Object} data The object to parse.
 * @param {Object=} target The target object to store converted data to.
 * @returns {Object} The converted object.
 * @private
 */
Serialiser.prototype._stringify = function (data, target) {
	var handledData,
		i;

	if (typeof data === 'object') {
		// Handle special object types so they can be encoded with
		// a special marker and later restored by a decoder counterpart
		handledData = this._encode(data);
		if (handledData) {
			// An encoder handled this object type so return it now
			return handledData;
		}

		if (data instanceof Array) {
			target = target || [];
		} else {
			target = target || {};
		}

		// Iterate through the object's keys and serialise
		for (i in data) {
			if (data.hasOwnProperty(i)) {
				target[i] = this._stringify(data[i], target[i]);
			}
		}
	} else {
		target = data;
	}

	// The data is a basic type
	return target;
};

module.exports = Serialiser;