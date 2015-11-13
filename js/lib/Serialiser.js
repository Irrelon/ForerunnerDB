"use strict";

var Serialiser = function () {

};

Serialiser.prototype.parse = function (data) {
	return this._parse(JSON.parse(data));
};

Serialiser.prototype._parse = function (data, target) {
	var i;

	if (typeof data === 'object') {
		if (data instanceof Array) {
			target = target || [];
		} else {
			target = target || {};
		}

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
					target[i] = this._parse(data[i], target[i]);
				}
			}
		}
	} else {
		target = data;
	}

	// The data is a basic type
	return target;
};

Serialiser.prototype.stringify = function (data) {
	return JSON.stringify(this._stringify(data));
};

Serialiser.prototype._stringify = function (data, target) {
	var i;

	if (typeof data === 'object') {
		// Handle special object types so they can be restored
		if (data instanceof Date) {
			return { $date: data.toISOString() };
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

module.exports = new Serialiser();