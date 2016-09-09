"use strict";

var Overload = require('./Overload');

/**
 * Provides trigger functionality methods.
 * @mixin
 */
var Triggers = {
	/**
	 * Add a trigger by id, type and phase.
	 * @name addTrigger
	 * @method Triggers.addTrigger
	 * @param {String} id The id of the trigger. This must be unique to the type and
	 * phase of the trigger. Only one trigger may be added with this id per type and
	 * phase.
	 * @param {Constants} type The type of operation to apply the trigger to. See
	 * Mixin.Constants for constants to use.
	 * @param {Constants} phase The phase of an operation to fire the trigger on. See
	 * Mixin.Constants for constants to use.
	 * @param {Triggers.addTriggerCallback} method The method to call when the trigger is fired.
	 * @returns {boolean} True if the trigger was added successfully, false if not.
	 */
	addTrigger: function (id, type, phase, method) {
		var self = this,
			triggerIndex;

		// Check if the trigger already exists
		triggerIndex = self._triggerIndexOf(id, type, phase);

		if (triggerIndex === -1) {
			self.triggerStack = {};

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
	 * Removes a trigger by id, type and phase.
	 * @name removeTrigger
	 * @method Triggers.removeTrigger
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

	/**
	 * Tells the current instance to fire or ignore all triggers whether they
	 * are enabled or not.
	 * @param {Boolean} val Set to true to ignore triggers or false to not
	 * ignore them.
	 * @returns {*}
	 */
	ignoreTriggers: function (val) {
		if (val !== undefined) {
			this._ignoreTriggers = val;
			return this;
		}

		return this._ignoreTriggers;
	},

	/**
	 * Generates triggers that fire in the after phase for all CRUD ops
	 * that automatically transform data back and forth and keep both
	 * import and export collections in sync with each other.
	 * @param {String} id The unique id for this link IO.
	 * @param {Object} ioData The settings for the link IO.
	 */
	addLinkIO: function (id, ioData) {
		var self = this,
			matchAll,
			exportData,
			importData,
			exportTriggerMethod,
			importTriggerMethod,
			exportTo,
			importFrom,
			allTypes,
			i;

		// Store the linkIO
		self._linkIO = self._linkIO || {};
		self._linkIO[id] = ioData;

		exportData = ioData['export'];
		importData = ioData['import'];

		if (exportData) {
			exportTo = self.db().collection(exportData.to);
		}

		if (importData) {
			importFrom = self.db().collection(importData.from);
		}

		allTypes = [
			self.TYPE_INSERT,
			self.TYPE_UPDATE,
			self.TYPE_REMOVE
		];

		matchAll = function (data, callback) {
			// Match all
			callback(false, true);
		};

		if (exportData) {
			// Check for export match method
			if (!exportData.match) {
				// No match method found, use the match all method
				exportData.match = matchAll;
			}

			// Check for export types
			if (!exportData.types) {
				exportData.types = allTypes;
			}

			exportTriggerMethod = function (operation, oldDoc, newDoc) {
				// Check if we should execute against this data
				exportData.match(newDoc, function (err, doExport) {
					if (!err && doExport) {
						// Get data to upsert (if any)
						exportData.data(newDoc, operation.type, function (err, data, callback) {
							if (!err && data) {
								// Disable all currently enabled triggers so that we
								// don't go into a trigger loop
								exportTo.ignoreTriggers(true);

								if (operation.type !== 'remove') {
									// Do upsert
									exportTo.upsert(data, callback);
								} else {
									// Do remove
									exportTo.remove(data, callback);
								}

								// Re-enable the previous triggers
								exportTo.ignoreTriggers(false);
							}
						});
					}
				});
			};
		}

		if (importData) {
			// Check for import match method
			if (!importData.match) {
				// No match method found, use the match all method
				importData.match = matchAll;
			}

			// Check for import types
			if (!importData.types) {
				importData.types = allTypes;
			}

			importTriggerMethod = function (operation, oldDoc, newDoc) {
				// Check if we should execute against this data
				importData.match(newDoc, function (err, doExport) {
					if (!err && doExport) {
						// Get data to upsert (if any)
						importData.data(newDoc, operation.type, function (err, data, callback) {
							if (!err && data) {
								// Disable all currently enabled triggers so that we
								// don't go into a trigger loop
								exportTo.ignoreTriggers(true);

								if (operation.type !== 'remove') {
									// Do upsert
									self.upsert(data, callback);
								} else {
									// Do remove
									self.remove(data, callback);
								}

								// Re-enable the previous triggers
								exportTo.ignoreTriggers(false);
							}
						});
					}
				});
			};
		}

		if (exportData) {
			for (i = 0; i < exportData.types.length; i++) {
				self.addTrigger(id + 'export' + exportData.types[i], exportData.types[i], self.PHASE_AFTER, exportTriggerMethod);
			}
		}

		if (importData) {
			for (i = 0; i < importData.types.length; i++) {
				importFrom.addTrigger(id + 'import' + importData.types[i], importData.types[i], self.PHASE_AFTER, importTriggerMethod);
			}
		}
	},

	/**
	 * Removes a previously added link IO via it's ID.
	 * @param {String} id The id of the link IO to remove.
	 * @returns {boolean} True if successful, false if the link IO
	 * was not found.
	 */
	removeLinkIO: function (id) {
		var self = this,
			linkIO = self._linkIO[id],
			exportData,
			importData,
			importFrom,
			i;

		if (linkIO) {
			exportData = linkIO['export'];
			importData = linkIO['import'];

			if (exportData) {
				for (i = 0; i < exportData.types.length; i++) {
					self.removeTrigger(id + 'export' + exportData.types[i], exportData.types[i], self.db.PHASE_AFTER);
				}
			}

			if (importData) {
				importFrom = self.db().collection(importData.from);

				for (i = 0; i < importData.types.length; i++) {
					importFrom.removeTrigger(id + 'import' + importData.types[i], importData.types[i], self.db.PHASE_AFTER);
				}
			}

			delete self._linkIO[id];
			return true;
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
		if (!this._ignoreTriggers && this._trigger && this._trigger[type] && this._trigger[type][phase] && this._trigger[type][phase].length) {
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
			response,
			typeName,
			phaseName;

		if (!self._ignoreTriggers && self._trigger && self._trigger[type] && self._trigger[type][phase]) {
			triggerArr = self._trigger[type][phase];
			triggerCount = triggerArr.length;

			for (triggerIndex = 0; triggerIndex < triggerCount; triggerIndex++) {
				triggerItem = triggerArr[triggerIndex];

				// Check if the trigger is enabled
				if (triggerItem.enabled) {
					if (self.debug()) {
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

						console.log('Triggers: Processing trigger "' + triggerItem.id + '" for ' + typeName + ' in phase "' + phaseName + '"');
					}

					// Check if the trigger is already in the stack, if it is,
					// don't fire it again (this is so we avoid infinite loops
					// where a trigger triggers another trigger which calls this
					// one and so on)
					if  (self.triggerStack && self.triggerStack[type] && self.triggerStack[type][phase] && self.triggerStack[type][phase][triggerItem.id]) {
						// The trigger is already in the stack, do not fire the trigger again
						if (self.debug()) {
							console.log('Triggers: Will not run trigger "' + triggerItem.id + '" for ' + typeName + ' in phase "' + phaseName + '" as it is already in the stack!');
						}

						continue;
					}

					// Add the trigger to the stack so we don't go down an endless
					// trigger loop
					self.triggerStack = self.triggerStack || {};
					self.triggerStack[type] = {};
					self.triggerStack[type][phase] = {};
					self.triggerStack[type][phase][triggerItem.id] = true;

					// Run the trigger's method and store the response
					response = triggerItem.method.call(self, operation, oldDoc, newDoc);

					// Remove the trigger from the stack
					self.triggerStack = self.triggerStack || {};
					self.triggerStack[type] = {};
					self.triggerStack[type][phase] = {};
					self.triggerStack[type][phase][triggerItem.id] = false;

					// Check the response for a non-expected result (anything other than
					// [undefined, true or false] is considered a throwable error)
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
	 * @returns {Number}
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

/**
 * When called in a before phase the newDoc object can be directly altered
 * to modify the data in it before the operation is carried out.
 * @callback Triggers.addTriggerCallback
 * @param {Object} operation The details about the operation.
 * @param {Object} oldDoc The document before the operation.
 * @param {Object} newDoc The document after the operation.
 */

module.exports = Triggers;