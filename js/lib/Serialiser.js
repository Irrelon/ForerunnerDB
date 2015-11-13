"use strict";

var Serialiser = function () {

};

Serialiser.prototype.parse = function (data) {
	return this._parse(JSON.parse(data));
};

Serialiser.prototype._parse = function (data) {
	var i;

	if (typeof data === 'object') {
		// Handle special object types and restore them


		// Iterate through the object's keys and parse
		for (i in data) {
			if (data.hasOwnProperty(i)) {
				if (i.substr(0, 1) === '$') {
					// This is a special object type, restore it
					switch (i) {
						case '$date':
							return new Date(data[i]);
					}
				} else {
					data[i] = this._parse(data[i]);
				}
			}
		}
	}

	// The data is a basic type
	return data;
};

Serialiser.prototype.stringify = function (data) {
	return JSON.stringify(this._stringify(data));
};

Serialiser.prototype._stringify = function (data) {
	var i;

	if (typeof data === 'object') {
		// Handle special object types so they can be restored
		if (data instanceof Date) {
			return { $date: data.toISOString() };
		}

		// Iterate through the object's keys and serialise
		for (i in data) {
			if (data.hasOwnProperty(i)) {
				data[i] = this._stringify(data[i]);
			}
		}
	}

	// The data is a basic type
	return data;
};

module.exports = new Serialiser();