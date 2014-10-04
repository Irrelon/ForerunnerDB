var Shared = {
		modules: {},
		_synth: {},

		addModule: function (name, module) {
			this.modules[name] = module;
			this.emit('moduleLoad', [name, module]);
		},

		finishModule: function (name) {
			if (this.modules[name]) {
				this.modules[name]._fdbFinished = true;
				this.emit('moduleFinished', [name, this.modules[name]]);
			} else {
				throw('finishModule called on a module that has not been registered with addModule(): ' + name);
			}
		},

		moduleFinished: function (name, callback) {
			if (this.modules[name] && this.modules[name]._fdbFinished) {
				callback(name, this.modules[name]);
			} else {
				this.on('moduleFinished', callback);
			}
		},

		mixin: function (obj, mixinName) {
			var system = this.mixins[mixinName];
			
			if (system) {
				for (var i in system) {
					if (system.hasOwnProperty(i)) {
						obj[i] = system[i];
					}
				}
			} else {
				throw('Cannot find mixin named: ' + mixinName);
			}
		},

		synthesize: function (obj, name, extend) {
			this._synth[name] = this._synth[name] || function (val) {
				if (val !== undefined) {
					this['_' + name] = val;
					return this;
				}

				return this['_' + name];
			};

			if (extend) {
				var self = this;

				obj[name] = function () {
					var tmp = this.$super,
						ret;

					this.$super = self._synth[name];
					ret = extend.apply(this, arguments);
					this.$super = tmp;

					return ret;
				}
			} else {
				obj[name] = this._synth[name];
			}
		},

		/**
		 * Allows a method to be overloaded.
		 * @param arr
		 * @returns {Function}
		 * @constructor
		 */
		overload: require('./Overload'),

		/**
		 * Define the mixins that other modules can use as required.
		 */
		mixins: {
			'Mixin.Common': require('./Mixin.Common'),
			'Mixin.Events': require('./Mixin.Events'),
			'Mixin.ChainReactor': require('./Mixin.ChainReactor'),
			'Mixin.CRUD': require('./Mixin.CRUD')
		}
	};

// Add event handling to shared
Shared.mixin(Shared, 'Mixin.Events');

module.exports = Shared;