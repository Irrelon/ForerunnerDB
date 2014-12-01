var Triggers = {
	addTrigger: function (id, type, phase, method) {
		var self = this,
			triggerIndex;

		triggerIndex = self._triggerIndex(id, type, phase);

		if (triggerIndex === -1) {
			self._trigger = self._trigger || {};
			self._trigger[type] = self._trigger[type] || {};
			self._trigger[type][phase] = self._trigger[type][phase] || [];

			self._trigger[type][phase].push({
				id: id,
				method: method
			});

			return true;
		}

		return false;
	},

	removeTrigger: function (id, type, phase) {
		var self = this,
			triggerIndex;

		triggerIndex = self._triggerIndex(id, type, phase);

		if (triggerIndex > -1) {
			self._trigger[type][phase].splice(triggerIndex, 1);
		}

		return false;
	},

	processTrigger: function (type, phase, oldDoc, newDoc) {
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

					console.log('Triggers: Processing trigger "' + id + '" for ' + typeName + ' in phase "' + phaseName + '"');
				}

				// Run the trigger's method and store the response
				response = triggerItem.method.call(self, oldDoc, newDoc);

				// Check the response for a non-expected result (anything other than
				// undefined, true or false is considered a throwable error)
				if (response === false) {
					// The trigger wants us to cancel operations
					return false;
				}

				if (response !== undefined && response !== true && response !== false) {
					// Trigger responded with error, throw the error
					throw('Trigger error: ' + response);
				}
			}

			// Triggers all ran without issue, return a success (true)
			return true;
		}
	},

	_triggerIndex: function (id, type, phase) {
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