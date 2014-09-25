var idCounter = 0,
	Overload = function (arr) {
		if (arr) {
			var arrIndex,
				arrCount = arr.length;

			return function () {
				for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
					if (arr[arrIndex].length === arguments.length) {
						return arr[arrIndex].apply(this, arguments);
					}
				}

				return null;
			};
		}

		return function () {};
	},
	Shared = {
		modules: {},
		common: {
			decouple: function (data) {
				return JSON.parse(JSON.stringify(data));
			},
			objectId: function (str) {
				var id,
					pow = Math.pow(10, 17);

				if (!str) {
					idCounter++;

					id = (idCounter + (
						Math.random() * pow +
						Math.random() * pow +
						Math.random() * pow +
						Math.random() * pow
					)).toString(16);
				} else {
					var val = 0,
						count = str.length,
						i;

					for (i = 0; i < count; i++) {
						val += str.charCodeAt(i) * pow;
					}

					id = val.toString(16);
				}

				return id;
			},
			debug: new Overload([
				function () {
					return this._debug && this._debug.all;
				},

				function (val) {
					if (val !== undefined) {
						if (typeof val === 'boolean') {
							this._debug = this._debug || {};
							this._debug.all = val;
							this.chainSend('debug', this._debug);
							return this;
						} else {
							return (this._debug && this._debug[val]) || (this._db && this._db._debug && this._db._debug[val]) || (this._debug && this._debug.all);
						}
					}

					return this._debug && this._debug.all;
				},

				function (type, val) {
					if (type !== undefined) {
						if (val !== undefined) {
							this._debug = this._debug || {};
							this._debug[type] = val;
							this.chainSend('debug', this._debug);
							return this;
						}

						return (this._debug && this._debug[val]) || (this._db && this._db._debug && this._db._debug[type]);
					}

					return this._debug && this._debug.all;
				}
			]),

			on: new Overload([
				function(event, listener) {
					this._listeners = this._listeners || {};
					this._listeners[event] = this._listeners[event] || {};
					this._listeners[event]['*'] = this._listeners[event]['*'] || [];
					this._listeners[event]['*'].push(listener);

					return this;
				},

				function(event, id, listener) {
					this._listeners = this._listeners || {};
					this._listeners[event] = this._listeners[event] || {};
					this._listeners[event][id] = this._listeners[event][id] || [];
					this._listeners[event][id].push(listener);

					return this;
				}
			]),

			off: new Overload([
				function (event) {
					if (this._listeners && this._listeners[event] && event in this._listeners) {
						delete this._listeners[event];
					}

					return this;
				},

				function(event, listener) {
					var arr,
						index;

					if (typeof(listener) === 'string') {
						if (this._listeners && this._listeners[event] && this._listeners[event][listener]) {
							delete this._listeners[event][listener];
						}
					} else {
						if (event in this._listeners) {
							arr = this._listeners[event]['*'];
							index = arr.indexOf(listener);

							if (index > -1) {
								arr.splice(index, 1);
							}
						}
					}

					return this;
				},

				function (event, id, listener) {
					if (this._listeners && event in this._listeners) {
						var arr = this._listeners[event][id],
							index = arr.indexOf(listener);

						if (index > -1) {
							arr.splice(index, 1);
						}
					}
				}
			]),

			emit: function (event, data) {
				this._listeners = this._listeners || {};

				if (event in this._listeners) {
					// Handle global emit
					if (this._listeners[event]['*']) {
						var arr = this._listeners[event]['*'],
							arrCount = arr.length,
							arrIndex;

						for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
							arr[arrIndex].apply(this, Array.prototype.slice.call(arguments, 1));
						}
					}

					// Handle individual emit
					if (data instanceof Array) {
						// Check if the array is an array of objects in the collection
						if (data[0] && data[0][this._primaryKey]) {
							// Loop the array and check for listeners against the primary key
							var listenerIdArr = this._listeners[event],
								listenerIdCount,
								listenerIdIndex;

							arrCount = data.length;

							for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
								if (listenerIdArr[data[arrIndex][this._primaryKey]]) {
									// Emit for this id
									listenerIdCount = listenerIdArr[data[arrIndex][this._primaryKey]].length;
									for (listenerIdIndex = 0; listenerIdIndex < listenerIdCount; listenerIdIndex++) {
										listenerIdArr[data[arrIndex][this._primaryKey]][listenerIdIndex].apply(this, Array.prototype.slice.call(arguments, 1));
									}
								}
							}
						}
					}
				}

				return this;
			}
		},
		_synth: {},

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

		synthesize: function (obj, name) {
			this._synth[name] = this._synth[name] || function (val) {
				if (val !== undefined) {
					this['_' + name] = val;
					return this;
				}

				return this['_' + name];
			};

			obj[name] = this._synth[name];
		},

		/**
		 * Allows a method to be overloaded.
		 * @param arr
		 * @returns {Function}
		 * @constructor
		 */
		overload: Overload,

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
						arr[index].chainReceive(this, type, data, options);
					}
				}
			},
			chainReceive: function (sender, type, data, options) {
				// Fire our internal handler
				if (!this._chainHandler || (this._chainHandler && !this._chainHandler(sender, type, data, options))) {
					// Propagate the message down the chain
					this.chainSend(type, data, options);
				}
			}
		}
	};

module.exports = Shared;