"use strict";

/**
 * The condition class monitors a data source and updates it's internal
 * state depending on clauses that it has been given. When all clauses
 * are satisfied the then() callback is fired. If conditions were met
 * but data changed that made them un-met, the else() callback is fired.
 */

var Shared,
	Condition;

Shared = require('./Shared');

/**
 * Create a constructor method that calls the instance's init method.
 * This allows the constructor to be overridden by other modules because
 * they can override the init method with their own.
 */
Condition = function () {
	this.init.apply(this, arguments);
};

Condition.prototype.init = function (dataSource, clause) {
	this._dataSource = dataSource;
	this._query = [clause];
	this._started = false;
	this._state = [false];

	this._satisfied = false;

	// Set this to true by default for faster performance
	this.earlyExit(true);
};

// Tell ForerunnerDB about our new module
Shared.addModule('Condition', Condition);

// Mixin some commonly used methods
Shared.mixin(Condition.prototype, 'Mixin.Common');
Shared.mixin(Condition.prototype, 'Mixin.ChainReactor');

Shared.synthesize(Condition.prototype, 'then');
Shared.synthesize(Condition.prototype, 'else');
Shared.synthesize(Condition.prototype, 'earlyExit');

/**
 * Adds a new clause to the condition.
 * @param {Object} clause The query clause to add to the condition.
 * @returns {Condition}
 */
Condition.prototype.and = function (clause) {
	this._query.push(clause);
	this._state.push(false);

	return this;
};

/**
 * Starts the condition so that changes to data will call callback
 * methods according to clauses being met.
 * @returns {Condition}
 */
Condition.prototype.start = function () {
	if (!this._started) {
		var self = this;

		// Resolve the current state
		this._updateStates();

		self._onChange = function () {
			self._updateStates();
		};

		// Create a chain reactor link to the data source so we start receiving CRUD ops from it
		this._dataSource.on('change', self._onChange);

		this._started = true;
	}

	return this;
};

/**
 * Updates the internal status of all the clauses against the underlying
 * data source.
 * @private
 */
Condition.prototype._updateStates = function () {
	var satisfied = true,
		i;

	for (i = 0; i < this._query.length; i++) {
		this._state[i] = this._dataSource.count(this._query[i]) > 0;

		if (!this._state[i]) {
			satisfied = false;

			// Early exit since we have found a state that is not true
			if (this._earlyExit) {
				break;
			}
		}
	}

	if (this._satisfied !== satisfied) {
		// Our state has changed, fire the relevant operation
		if (satisfied) {
			// Fire the "then" operation
			if (this._then) {
				this._then();
			}
		} else {
			// Fire the "else" operation
			if (this._else) {
				this._else();
			}
		}

		this._satisfied = satisfied;
	}
};

/**
 * Stops the condition so that callbacks will no longer fire.
 * @returns {Condition}
 */
Condition.prototype.stop = function () {
	if (this._started) {
		this._dataSource.off('change', this._onChange);
		delete this._onChange;

		this._started = false;
	}

	return this;
};

// Tell ForerunnerDB that our module has finished loading
Shared.finishModule('Condition');
module.exports = Condition;