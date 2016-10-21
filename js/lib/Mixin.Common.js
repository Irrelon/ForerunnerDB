"use strict";

var idCounter = 0,
	Overload = require('./Overload'),
	Serialiser = require('./Serialiser'),
	Common,
	serialiser = new Serialiser(),
	crcTable;

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
 * Provides commonly used methods to most classes in ForerunnerDB.
 * @mixin
 */
Common = {
	// Expose the serialiser object so it can be extended with new data handlers.
	serialiser: serialiser,

	/**
	 * Generates a JSON serialisation-compatible object instance. After the
	 * instance has been passed through this method, it will be able to survive
	 * a JSON.stringify() and JSON.parse() cycle and still end up as an
	 * instance at the end. Further information about this process can be found
	 * in the ForerunnerDB wiki at: https://github.com/Irrelon/ForerunnerDB/wiki/Serialiser-&-Performance-Benchmarks
	 * @param {*} val The object instance such as "new Date()" or "new RegExp()".
	 */
	make: function (val) {
		// This is a conversion request, hand over to serialiser
		return serialiser.convert(val);
	},

	/**
	 * Gets / sets data in the item store. The store can be used to set and
	 * retrieve data against a key. Useful for adding arbitrary key/value data
	 * to a collection / view etc and retrieving it later.
	 * @param {String|*} key The key under which to store the passed value or
	 * retrieve the existing stored value.
	 * @param {*=} val Optional value. If passed will overwrite the existing value
	 * stored against the specified key if one currently exists.
	 * @returns {*}
	 */
	store: function (key, val) {
		if (key !== undefined) {
			if (val !== undefined) {
				// Store the data
				this._store = this._store || {};
				this._store[key] = val;

				return this;
			}

			if (this._store) {
				return this._store[key];
			}
		}

		return undefined;
	},

	/**
	 * Removes a previously stored key/value pair from the item store, set previously
	 * by using the store() method.
	 * @param {String|*} key The key of the key/value pair to remove;
	 * @returns {Common} Returns this for chaining.
	 */
	unStore: function (key) {
		if (key !== undefined) {
			delete this._store[key];
		}

		return this;
	},

	/**
	 * Returns a non-referenced version of the passed object / array.
	 * @param {Object} data The object or array to return as a non-referenced version.
	 * @param {Number=} copies Optional number of copies to produce. If specified, the return
	 * value will be an array of decoupled objects, each distinct from the other.
	 * @returns {*}
	 */	
	decouple: function (data, copies) {
		if (data !== undefined && data !== "") {
			if (!copies) {
				return this.jParse(this.jStringify(data));
			} else {
				var i,
					json = this.jStringify(data),
					copyArr = [];

				for (i = 0; i < copies; i++) {
					copyArr.push(this.jParse(json));
				}

				return copyArr;
			}
		}

		return undefined;
	},

	/**
	 * Parses and returns data from stringified version.
	 * @param {String} data The stringified version of data to parse.
	 * @returns {Object} The parsed JSON object from the data.
	 */
	jParse: function (data) {
		return JSON.parse(data, serialiser.reviver());
	},

	/**
	 * Converts a JSON object into a stringified version.
	 * @param {Object} data The data to stringify.
	 * @returns {String} The stringified data.
	 */
	jStringify: JSON.stringify,
	
	/**
	 * Generates a new 16-character hexadecimal unique ID or
	 * generates a new 16-character hexadecimal ID based on
	 * the passed string. Will always generate the same ID
	 * for the same string.
	 * @param {String=} str A string to generate the ID from.
	 * @return {String}
	 */
	objectId: function (str) {
		var id,
			pow = Math.pow(10, 17);

		if (!str) {
			idCounter++;

			id = (idCounter + (
				Math.random() * pow +
				Math.random() * pow +
				Math.random() * pow +
				Math.random() * pow
			)).toString(16);
		} else {
			var val = 0,
				count = str.length,
				i;

			for (i = 0; i < count; i++) {
				val += str.charCodeAt(i) * pow;
			}

			id = val.toString(16);
		}

		return id;
	},

	/**
	 * Generates a unique hash for the passed object.
	 * @param {Object} obj The object to generate a hash for.
	 * @returns {String}
	 */
	hash: function (obj) {
		return JSON.stringify(obj);
	},

	/**
	 * Gets / sets debug flag that can enable debug message output to the
	 * console if required.
	 * @param {Boolean} val The value to set debug flag to.
	 * @return {Boolean} True if enabled, false otherwise.
	 */
	/**
	 * Sets debug flag for a particular type that can enable debug message
	 * output to the console if required.
	 * @param {String} type The name of the debug type to set flag for.
	 * @param {Boolean} val The value to set debug flag to.
	 * @return {Boolean} True if enabled, false otherwise.
	 */
	debug: new Overload([
		function () {
			return this._debug && this._debug.all;
		},

		function (val) {
			if (val !== undefined) {
				if (typeof val === 'boolean') {
					this._debug = this._debug || {};
					this._debug.all = val;
					this.chainSend('debug', this._debug);
					return this;
				} else {
					return (this._debug && this._debug[val]) || (this._db && this._db._debug && this._db._debug[val]) || (this._debug && this._debug.all);
				}
			}

			return this._debug && this._debug.all;
		},

		function (type, val) {
			if (type !== undefined) {
				if (val !== undefined) {
					this._debug = this._debug || {};
					this._debug[type] = val;
					this.chainSend('debug', this._debug);
					return this;
				}

				return (this._debug && this._debug[val]) || (this._db && this._db._debug && this._db._debug[type]);
			}

			return this._debug && this._debug.all;
		}
	]),

	/**
	 * Returns a string describing the class this instance is derived from.
	 * @returns {String}
	 */
	classIdentifier: function () {
		return 'ForerunnerDB.' + this.className;
	},

	/**
	 * Returns a string describing the instance by it's class name and instance
	 * object name.
	 * @returns {String} The instance identifier.
	 */
	instanceIdentifier: function () {
		return '[' + this.className + ']' + this.name();
	},

	/**
	 * Returns a string used to denote a console log against this instance,
	 * consisting of the class identifier and instance identifier.
	 * @returns {String} The log identifier.
	 */
	logIdentifier: function () {
		return 'ForerunnerDB ' + this.instanceIdentifier();
	},

	/**
	 * Converts a query object with MongoDB dot notation syntax
	 * to Forerunner's object notation syntax.
	 * @param {Object} obj The object to convert.
	 */
	convertToFdb: function (obj) {
		var varName,
			splitArr,
			objCopy,
			i;

		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				objCopy = obj;

				if (i.indexOf('.') > -1) {
					// Replace .$ with a placeholder before splitting by . char
					i = i.replace('.$', '[|$|]');
					splitArr = i.split('.');

					while ((varName = splitArr.shift())) {
						// Replace placeholder back to original .$
						varName = varName.replace('[|$|]', '.$');

						if (splitArr.length) {
							objCopy[varName] = {};
						} else {
							objCopy[varName] = obj[i];
						}

						objCopy = objCopy[varName];
					}

					delete obj[i];
				}
			}
		}
	},

	/**
	 * Checks if the state is dropped.
	 * @returns {boolean} True when dropped, false otherwise.
	 */
	isDropped: function () {
		return this._state === 'dropped';
	},

	/**
	 * Registers a timed callback that will overwrite itself if
	 * the same id is used within the timeout period. Useful
	 * for de-bouncing fast-calls.
	 * @param {String} id An ID for the call (use the same one
	 * to debounce the same calls).
	 * @param {Function} callback The callback method to call on
	 * timeout.
	 * @param {Number} timeout The timeout in milliseconds before
	 * the callback is called.
	 */
	debounce: function (id, callback, timeout) {
		var self = this,
			newData;

		self._debounce = self._debounce || {};

		if (self._debounce[id]) {
			// Clear timeout for this item
			clearTimeout(self._debounce[id].timeout);
		}

		newData = {
			callback: callback,
			timeout: setTimeout(function () {
				// Delete existing reference
				delete self._debounce[id];

				// Call the callback
				callback();
			}, timeout)
		};

		// Save current data
		self._debounce[id] = newData;
	},
	
	/**
	 * Returns a checksum of a string.
	 * @param {String} str The string to checksum.
	 * @return {Number} The checksum generated.
	 */
	checksum: function (str) {
		var crc = 0 ^ (-1), // jshint ignore:line
			i;
		
		for (i = 0; i < str.length; i++) {
			crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF]; // jshint ignore:line
		}
		
		return (crc ^ (-1)) >>> 0; // jshint ignore:line
	}
};

module.exports = Common;