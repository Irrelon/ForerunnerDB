var Shared = {
	idCounter: 0,
	modules: {},
	prototypes: {},
	addModule: function (name, module) {
		this.modules[name] = module;
	},

	inherit: function (obj, system) {
		for (var i in system) {
			if (system.hasOwnProperty(i)) {
				obj[i] = system[i];
			}
		}
	},

	// Inheritable systems
	chainSystem: {
		chain: function (obj) {
			this._chain = this._chain || [];
			var index = this._chain.indexOf(obj);

			if (index === -1) {
				this._chain.push(obj);
			}
		},
		unChain: function (obj) {
			if (this._chain) {
				var index = this._chain.indexOf(obj);

				if (index > -1) {
					this._chain.splice(index, 1);
				}
			}
		},
		chainSend: function (type, data, options) {
			if (this._chain) {
				var arr = this._chain,
					count = arr.length,
					index;

				for (index = 0; index < count; index++) {
					arr[index].chainReceive(type, data, options);
				}
			}
		},
		chainReceive: function (type, data, options) {
			// Fire our internal handler
			if (!this._chainHandler(type, data, options)) {
				// Propagate the message down the chain
				this.chainSend(type, data, options);
			}
		}
	}
};

module.exports = Shared;