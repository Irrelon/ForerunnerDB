var Shared = require('./Shared'),
	Operation = require('./Operation');

/**
 * The metrics class used to store details about operations.
 * @constructor
 */
var Metrics = function () {
	this.init.apply(this, arguments);
};

Metrics.prototype.init = function () {
	this._data = [];
};

Shared.addModule('Metrics', Metrics);
Shared.mixin(Metrics.prototype, 'Mixin.ChainReactor');

/**
 * Creates an operation within the metrics instance and if metrics
 * are currently enabled (by calling the start() method) the operation
 * is also stored in the metrics log.
 * @param {String} name The name of the operation.
 * @returns {Operation}
 */
Metrics.prototype.create = function (name) {
	var op = new Operation(name);

	if (this._enabled) {
		this._data.push(op);
	}

	return op;
};

/**
 * Starts logging operations.
 * @returns {Metrics}
 */
Metrics.prototype.start = function () {
	this._enabled = true;
	return this;
};

/**
 * Stops logging operations.
 * @returns {Metrics}
 */
Metrics.prototype.stop = function () {
	this._enabled = false;
	return this;
};

/**
 * Clears all logged operations.
 * @returns {Metrics}
 */
Metrics.prototype.clear = function () {
	this._data = [];
	return this;
};

/**
 * Returns an array of all logged operations.
 * @returns {Array}
 */
Metrics.prototype.list = function () {
	return this._data;
};

Shared.finishModule('Metrics');
module.exports = Metrics;