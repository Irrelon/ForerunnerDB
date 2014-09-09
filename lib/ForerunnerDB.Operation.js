/**
 * The operation class, used to store details about an operation being
 * performed by the database.
 * @param {String} name The name of the operation.
 * @constructor
 */
var Operation = function (name) {
	this.init.apply(this, arguments);
};

Operation.prototype.init = function (name) {
	this._name = name;
	this._time = {
		process: {}
	};
	this._flag = {};
	this._log = [];
};

/**
 * Starts the operation timer.
 */
Operation.prototype.start = function () {
	this._time.start = new Date().getTime();
};

/**
 * Adds an item to the operation log.
 * @param {String} event The item to log.
 * @returns {*}
 */
Operation.prototype.log = function (event) {
	if (event) {
		var lastLogTime = this._log.length > 0 ? this._log[this._log.length - 1].time : 0,
			logObj = {
				event: event,
				time: new Date().getTime(),
				delta: 0
			};

		this._log.push(logObj);

		if (lastLogTime) {
			logObj.delta = logObj.time - lastLogTime;
		}

		return this;
	}

	return this._log;
};

/**
 * Called when starting and ending a timed operation, used to time
 * internal calls within an operation's execution.
 * @param {String} section An operation name.
 * @returns {*}
 */
Operation.prototype.time = function (section) {
	if (section !== undefined) {
		var process = this._time.process,
			processObj = process[section] = process[section] || {};

		if (!processObj.start) {
			// Timer started
			processObj.start = new Date().getTime();
		} else {
			processObj.end = new Date().getTime();
			processObj.totalMs = processObj.end - processObj.start;
		}

		return this;
	}

	return this._time;
};

/**
 * Used to set key/value flags during operation execution.
 * @param {String} key
 * @param {String} val
 * @returns {*}
 */
Operation.prototype.flag = function (key, val) {
	if (key !== undefined && val !== undefined) {
		this._flag[key] = val;
	} else if (key !== undefined) {
		return this._flag[key];
	} else {
		return this._flag;
	}
};

/**
 * Stops the operation timer.
 */
Operation.prototype.stop = function () {
	this._time.stop = new Date().getTime();
	this._time.totalMs = this._time.stop - this._time.start;
};

module.exports = Operation;