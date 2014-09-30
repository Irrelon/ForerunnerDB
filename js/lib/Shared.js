var idCounter = 0,
	/**
	 * Generates an array of all the different definition signatures that can be
	 * created from the passed string with a catch-all wildcard *. E.g. it will
	 * convert the signature: string,*,string to all potentials:
	 * string,string,string
	 * string,number,string
	 * string,object,string,
	 * string,function,string,
	 * string,undefined,string
	 *
	 * @param {String} str Signature string with a wildcard in it.
	 * @returns {Array} An array of signature strings that are generated.
	 */
	generateSignaturePermutations = function (str) {
		var signatures = [],
			newSignature,
			types = ['string', 'object', 'number', 'function', 'undefined'],
			index;

		if (str.indexOf('*') > -1) {
			// There is at least one "any" type, break out into multiple keys
			// We could do this at query time with regular expressions but
			// would be significantly slower
			for (index = 0; index < types.length; index++) {
				newSignature = str.replace('*', types[index]);
				signatures = signatures.concat(generateSignaturePermutations(newSignature));
			}
		} else {
			signatures.push(str);
		}

		return signatures;
	},
	/**
	 * Allows a method to accept overloaded calls with different parameters controlling
	 * which passed overload function is called.
	 * @param {Object} def
	 * @returns {Function}
	 * @constructor
	 */
	Overload = function (def) {
		if (def) {
			var index,
				count,
				tmpDef,
				defNewKey,
				sigIndex,
				signatures;

			if (!(def instanceof Array)) {
				tmpDef = {};

				// Def is an object, make sure all prop names are devoid of spaces
				for (index in def) {
					if (def.hasOwnProperty(index)) {
						defNewKey = index.replace(/ /g, '');

						if (defNewKey.indexOf('*') === -1) {
							tmpDef[defNewKey] = def[index];
						} else {
							signatures = generateSignaturePermutations(defNewKey);

							for (sigIndex = 0; sigIndex < signatures.length; sigIndex++) {
								if (!tmpDef[signatures[sigIndex]]) {
									tmpDef[signatures[sigIndex]] = def[index];
								}
							}
						}
					}
				}

				def = tmpDef;
			}

			return function () {
				if (def instanceof Array) {
					count = def.length;
					for (index = 0; index < count; index++) {
						if (def[index].length === arguments.length) {
							return def[index].apply(this, arguments);
						}
					}
				} else {
					// Generate lookup key from arguments
					var arr = [],
						lookup;

					// Copy arguments to an array
					for (index = 0; index < arguments.length; index++) {
						arr.push(typeof arguments[index]);
					}

					lookup = arr.join(',');

					// Check for an exact lookup match
					if (def[lookup]) {
						return def[lookup].apply(this, arguments);
					} else {
						for (index = arr.length; index >= 0; index--) {
							// Get the closest match
							lookup = arr.slice(0, index).join(',');

							if (def[lookup + ',...']) {
								// Matched against arguments + "any other"
								return def[lookup + ',...'].apply(this, arguments);
							}
						}
					}
				}

				throw('Overloaded method does not have a matching signature for the passed arguments!');
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

			/**
			 * Gets / sets debug flag that can enable debug message output to the
			 * console if required.
			 * @param {Boolean} val The value to set debug flag to.
			 * @return {Boolean} True if enabled, false otherwise.
			 */
			/**
			 * Sets debug flag for a particular type that can enable debug message
			 * output to the console if required.
			 * @param {String} type The name of the debug type to set flag for.
			 * @param {Boolean} val The value to set debug flag to.
			 * @return {Boolean} True if enabled, false otherwise.
			 */
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

			on: new Overload({
				/**
				 * Attach an event listener to the passed event.
				 * @param {String} event The name of the event to listen for.
				 * @param {Function} listener The method to call when the event is fired.
				 */
				'string, function': function (event, listener) {
					this._listeners = this._listeners || {};
					this._listeners[event] = this._listeners[event] || {};
					this._listeners[event]['*'] = this._listeners[event]['*'] || [];
					this._listeners[event]['*'].push(listener);

					return this;
				},

				/**
				 * Attach an event listener to the passed event only if the passed
				 * id matches the document id for the event being fired.
				 * @param {String} event The name of the event to listen for.
				 * @param {*} id The document id to match against.
				 * @param {Function} listener The method to call when the event is fired.
				 */
				'string, *, function': function (event, id, listener) {
					this._listeners = this._listeners || {};
					this._listeners[event] = this._listeners[event] || {};
					this._listeners[event][id] = this._listeners[event][id] || [];
					this._listeners[event][id].push(listener);

					return this;
				}
			}),

			off: new Overload({
				'string': function (event) {
					if (this._listeners && this._listeners[event] && event in this._listeners) {
						delete this._listeners[event];
					}

					return this;
				},

				'string, function': function (event, listener) {
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

				'string, *, function': function (event, id, listener) {
					if (this._listeners && event in this._listeners && id in this.listeners[event]) {
						var arr = this._listeners[event][id],
							index = arr.indexOf(listener);

						if (index > -1) {
							arr.splice(index, 1);
						}
					}
				},

				'string, *': function (event, id) {
					if (this._listeners && event in this._listeners && id in this._listeners[event]) {
						// Kill all listeners for this event id
						delete this._listeners[event][id];
					}
				}
			}),

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