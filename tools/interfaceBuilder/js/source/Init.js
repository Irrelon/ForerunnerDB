var mod = {
	synthesize: function (obj, methodName, override) {
		var privateProp = '_' + methodName,
			synthMethod = function (val) {
				if (val !== undefined) {
					this[privateProp] = val;
					return this;
				}

				return this[privateProp];
			};

		obj[methodName] = function (val) {
			if (override) {
				return override.apply(this, [val, synthMethod]);
			} else {
				return synthMethod.apply(this, [val]);
			}
		};
	},

	appClass: function () {
		var func = function () {
			this.init.apply(this, arguments);
		};

		func.prototype.init = function () {};

		return func;
	}
};

module.exports = mod;