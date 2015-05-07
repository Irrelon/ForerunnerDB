"use strict";

var Overload = require('./Overload');

var Triggers = {
	/**
	 * Add a trigger by id.
	 * @param {String} id The id of the trigger. This must be unique to the type and
	 * phase of the trigger. Only one trigger may be added with this id per type and
	 * phase.
	 * @param {Number} type The type of operation to apply the trigger to. See
	 * Mixin.Constants for constants to use.
	 * @param {Number} phase The phase of an operation to fire the trigger on. See
	 * Mixin.Constants for constants to use.
	 * @param {Function} method The method to call when the trigger is fired.
	 * @returns {boolean} True if the trigger was added successfully, false if not.
	 */
	addTrigger: function (id, type, phase, method) {
		var self = this,
			triggerIndex;

		// Check if the trigger already exists
		triggerIndex = self._triggerIndexOf(id, type, phase);

		if (triggerIndex === -1) {
			// The trigger does not exist, create it
			self._trigger = self._trigger || {};
			self._trigger[type] = self._trigger[type] || {};
			self._trigger[type][phase] = self._trigger[type][phase] || [];

			self._trigger[type][phase].push({
				id: id,
				method: method,
				enabled: true
			});

			return true;
		}

		return false;
	},

	/**
	 *
	 * @param {String} id The id of the trigger to remove.
	 * @param {Number} type The type of operation to remove the trigger from. See
	 * Mixin.Constants for constants to use.
	 * @param {Number} phase The phase of the operation to remove the trigger from.
	 * See Mixin.Constants for constants to use.
	 * @returns {boolean} True if removed successfully, false if not.
	 */
	removeTrigger: function (id, type, phase) {
		var self = this,
			triggerIndex;

		// Check if the trigger already exists
		triggerIndex = self._triggerIndexOf(id, type, phase);

		if (triggerIndex > -1) {
			// The trigger exists, remove it
			self._trigger[type][phase].splice(triggerIndex, 1);
		}

		return false;
	},

	enableTrigger: new Overload({
		'string': function (id) {
			// Alter all triggers of this type
			var self = this,
				types = self._trigger,
				phases,
				triggers,
				result = false,
				i, k, j;

			if (types) {
				for (j in types) {
					if (types.hasOwnProperty(j)) {
						phases = types[j];

						if (phases) {
							for (i in phases) {
								if (phases.hasOwnProperty(i)) {
									triggers = phases[i];

									// Loop triggers and set enabled flag
									for (k = 0; k < triggers.length; k++) {
										if (triggers[k].id === id) {
											triggers[k].enabled = true;
											result = true;
										}
									}
								}
							}
						}
					}
				}
			}

			return result;
		},

		'number': function (type) {
			// Alter all triggers of this type
			var self = this,
				phases = self._trigger[type],
				triggers,
				result = false,
				i, k;

			if (phases) {
				for (i in phases) {
					if (phases.hasOwnProperty(i)) {
						triggers = phases[i];

						// Loop triggers and set to enabled
						for (k = 0; k < triggers.length; k++) {
							triggers[k].enabled = true;
							result = true;
						}
					}
				}
			}

			return result;
		},

		'number, number': function (type, phase) {
			// Alter all triggers of this type and phase
			var self = this,
				phases = self._trigger[type],
				triggers,
				result = false,
				k;

			if (phases) {
				triggers = phases[phase];

				if (triggers) {
					// Loop triggers and set to enabled
					for (k = 0; k < triggers.length; k++) {
						triggers[k].enabled = true;
						result = true;
					}
				}
			}

			return result;
		},

		'string, number, number': function (id, type, phase) {
			// Check if the trigger already exists
			var self = this,
				triggerIndex = self._triggerIndexOf(id, type, phase);

			if (triggerIndex > -1) {
				// Update the trigger
				self._trigger[type][phase][triggerIndex].enabled = true;

				return true;
			}

			return false;
		}
	}),

	disableTrigger: new Overload({
		'string': function (id) {
			// Alter all triggers of this type
			var self = this,
				types = self._trigger,
				phases,
				triggers,
				result = false,
				i, k, j;

			if (types) {
				for (j in types) {
					if (types.hasOwnProperty(j)) {
						phases = types[j];

						if (phases) {
							for (i in phases) {
								if (phases.hasOwnProperty(i)) {
									triggers = phases[i];

									// Loop triggers and set enabled flag
									for (k = 0; k < triggers.length; k++) {
										if (triggers[k].id === id) {
											triggers[k].enabled = false;
											result = true;
										}
									}
								}
							}
						}
					}
				}
			}

			return result;
		},

		'number': function (type) {
			// Alter all triggers of this type
			var self = this,
				phases = self._trigger[type],
				triggers,
				result = false,
				i, k;

			if (phases) {
				for (i in phases) {
					if (phases.hasOwnProperty(i)) {
						triggers = phases[i];

						// Loop triggers and set to disabled
						for (k = 0; k < triggers.length; k++) {
							triggers[k].enabled = false;
							result = true;
						}
					}
				}
			}

			return result;
		},

		'number, number': function (type, phase) {
			// Alter all triggers of this type and phase
			var self = this,
				phases = self._trigger[type],
				triggers,
				result = false,
				k;

			if (phases) {
				triggers = phases[phase];

				if (triggers) {
					// Loop triggers and set to disabled
					for (k = 0; k < triggers.length; k++) {
						triggers[k].enabled = false;
						result = true;
					}
				}
			}

			return result;
		},

		'string, number, number': function (id, type, phase) {
			// Check if the trigger already exists
			var self = this,
				triggerIndex = self._triggerIndexOf(id, type, phase);

			if (triggerIndex > -1) {
				// Update the trigger
				self._trigger[type][phase][triggerIndex].enabled = false;

				return true;
			}

			return false;
		}
	}),

	/**
	 * Checks if a trigger will fire based on the type and phase provided.
	 * @param {Number} type The type of operation. See Mixin.Constants for
	 * constants to use.
	 * @param {Number} phase The phase of the operation. See Mixin.Constants
	 * for constants to use.
	 * @returns {Boolean} True if the trigger will fire, false otherwise.
	 */
	willTrigger: function (type, phase) {
		if (this._trigger && this._trigger[type] && this._trigger[type][phase] && this._trigger[type][phase].length) {
			// Check if a trigger in this array is enabled
			var arr = this._trigger[type][phase],
				i;

			for (i = 0; i < arr.length; i++) {
				if (arr[i].enabled) {
					return true;
				}
			}
		}

		return false;
	},

	/**
	 * Processes trigger actions based on the operation, type and phase.
	 * @param {Object} operation Operation data to pass to the trigger.
	 * @param {Number} type The type of operation. See Mixin.Constants for
	 * constants to use.
	 * @param {Number} phase The phase of the operation. See Mixin.Constants
	 * for constants to use.
	 * @param {Object} oldDoc The document snapshot before operations are
	 * carried out against the data.
	 * @param {Object} newDoc The document snapshot after operations are
	 * carried out against the data.
	 * @returns {boolean}
	 */
	processTrigger: function (operation, type, phase, oldDoc, newDoc) {
		var self = this,
			triggerArr,
			triggerIndex,
			triggerCount,
			triggerItem,
			response;

		if (self._trigger && self._trigger[type] && self._trigger[type][phase]) {
			triggerArr = self._trigger[type][phase];
			triggerCount = triggerArr.length;

			for (triggerIndex = 0; triggerIndex < triggerCount; triggerIndex++) {
				triggerItem = triggerArr[triggerIndex];

				// Check if the trigger is enabled
				if (triggerItem.enabled) {
					if (this.debug()) {
						var typeName,
							phaseName;

						switch (type) {
							case this.TYPE_INSERT:
								typeName = 'insert';
								break;

							case this.TYPE_UPDATE:
								typeName = 'update';
								break;

							case this.TYPE_REMOVE:
								typeName = 'remove';
								break;

							default:
								typeName = '';
								break;
						}

						switch (phase) {
							case this.PHASE_BEFORE:
								phaseName = 'before';
								break;

							case this.PHASE_AFTER:
								phaseName = 'after';
								break;

							default:
								phaseName = '';
								break;
						}

						//console.log('Triggers: Processing trigger "' + id + '" for ' + typeName + ' in phase "' + phaseName + '"');
					}

					// Run the trigger's method and store the response
					response = triggerItem.method.call(self, operation, oldDoc, newDoc);

					// Check the response for a non-expected result (anything other than
					// undefined, true or false is considered a throwable error)
					if (response === false) {
						// The trigger wants us to cancel operations
						return false;
					}

					if (response !== undefined && response !== true && response !== false) {
						// Trigger responded with error, throw the error
						throw('ForerunnerDB.Mixin.Triggers: Trigger error: ' + response);
					}
				}
			}

			// Triggers all ran without issue, return a success (true)
			return true;
		}
	},

	/**
	 * Returns the index of a trigger by id based on type and phase.
	 * @param {String} id The id of the trigger to find the index of.
	 * @param {Number} type The type of operation. See Mixin.Constants for
	 * constants to use.
	 * @param {Number} phase The phase of the operation. See Mixin.Constants
	 * for constants to use.
	 * @returns {number}
	 * @private
	 */
	_triggerIndexOf: function (id, type, phase) {
		var self = this,
			triggerArr,
			triggerCount,
			triggerIndex;

		if (self._trigger && self._trigger[type] && self._trigger[type][phase]) {
			triggerArr = self._trigger[type][phase];
			triggerCount = triggerArr.length;

			for (triggerIndex = 0; triggerIndex < triggerCount; triggerIndex++) {
				if (triggerArr[triggerIndex].id === id) {
					return triggerIndex;
				}
			}
		}

		return -1;
	}
};

module.exports = Triggers;