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
			triggerItem;

		if (self._trigger && self._trigger[type] && self._trigger[type][phase]) {
			triggerArr = self._trigger[type][phase];
			triggerCount = triggerArr.length;

			for (triggerIndex = 0; triggerIndex < triggerCount; triggerIndex++) {
				triggerItem = triggerArr[triggerIndex];

				if (this.debug()) {
					console.log('Triggers: Processing trigger ""')
				}
				triggerItem.method.apply(self, [oldDoc, newDoc]);
			}
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