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
	var self = this;

	this._encoder = [];
	this._decoder = [];

	// Handler for Date() objects
	this.registerHandler('$date', function (objInstance) {
		if (objInstance instanceof Date) {
			// Augment this date object with a new toJSON method
			objInstance.toJSON = function () {
				return "$date:" + this.toISOString();
			};

			// Tell the converter we have matched this object
			return true;
		}

		// Tell converter to keep looking, we didn't match this object
		return false;
	}, function (data) {
		if (typeof data === 'string' && data.indexOf('$date:') === 0) {
			return self.convert(new Date(data.substr(6)));
		}

		return undefined;
	});

	// Handler for RegExp() objects
	this.registerHandler('$regexp', function (objInstance) {
		if (objInstance instanceof RegExp) {
			objInstance.toJSON = function () {
				return "$regexp:" + this.source.length + ":" + this.source + ":" + (this.global ? 'g' : '') + (this.ignoreCase ? 'i' : '');
				/*return {
					source: this.source,
					params: '' + (this.global ? 'g' : '') + (this.ignoreCase ? 'i' : '')
				};*/
			};

			// Tell the converter we have matched this object
			return true;
		}

		// Tell converter to keep looking, we didn't match this object
		return false;
	}, function (data) {
		if (typeof data === 'string' && data.indexOf('$regexp:') === 0) {
			var dataStr = data.substr(8),//±
				lengthEnd = dataStr.indexOf(':'),
				sourceLength = Number(dataStr.substr(0, lengthEnd)),
				source = dataStr.substr(lengthEnd + 1, sourceLength),
				params = dataStr.substr(lengthEnd + sourceLength + 2);

			return self.convert(new RegExp(source, params));
		}

		return undefined;
	});
};

Serialiser.prototype.registerHandler = function (handles, encoder, decoder) {
	if (handles !== undefined) {
		// Register encoder
		this._encoder.push(encoder);

		// Register decoder
		this._decoder.push(decoder);
	}
};

Serialiser.prototype.convert = function (data) {
	// Run through converters and check for match
	var arr = this._encoder,
		i;

	for (i = 0; i < arr.length; i++) {
		if (arr[i](data)) {
			// The converter we called matched the object and converted it
			// so let's return it now.
			return data;
		}
	}

	// No converter matched the object, return the unaltered one
	return data;
};

Serialiser.prototype.reviver = function () {
	var arr = this._decoder;

	return function (key, value) {
		// Check if we have a decoder method for this key
		var decodedData,
			i;

		for (i = 0; i < arr.length; i++) {
			decodedData = arr[i](value);

			if (decodedData !== undefined) {
				// The decoder we called matched the object and decoded it
				// so let's return it now.
				return decodedData;
			}
		}

		// No decoder, return basic value
		return value;
	};
};

module.exports = Serialiser;