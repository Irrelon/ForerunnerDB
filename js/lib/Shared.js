"use strict";

var Overload = require('./Overload');

/**
 * A shared object that can be used to store arbitrary data between class
 * instances, and access helper methods.
 * @mixin
 */
var Shared = {
	version: '2.0.22',
	modules: {},
	plugins: {},
	index: {},

	_synth: {},

	/**
	 * Adds a module to ForerunnerDB.
	 * @memberof Shared
	 * @param {String} name The name of the module.
	 * @param {Function} module The module class.
	 */
	addModule: function (name, module) {
		// Store the module in the module registry
		this.modules[name] = module;

		// Tell the universe we are loading this module
		this.emit('moduleLoad', [name, module]);
	},

	/**
	 * Called by the module once all processing has been completed. Used to determine
	 * if the module is ready for use by other modules.
	 * @memberof Shared
	 * @param {String} name The name of the module.
	 */
	finishModule: function (name) {
		if (this.modules[name]) {
			// Set the finished loading flag to true
			this.modules[name]._fdbFinished = true;

			// Assign the module name to itself so it knows what it
			// is called
			if (this.modules[name].prototype) {
				this.modules[name].prototype.className = name;
			} else {
				this.modules[name].className = name;
			}

			this.emit('moduleFinished', [name, this.modules[name]]);
		} else {
			throw('ForerunnerDB.Shared: finishModule called on a module that has not been registered with addModule(): ' + name);
		}
	},

	/**
	 * Will call your callback method when the specified module has loaded. If the module
	 * is already loaded the callback is called immediately.
	 * @memberof Shared
	 * @param {String} name The name of the module.
	 * @param {Function} callback The callback method to call when the module is loaded.
	 */
	moduleFinished: function (name, callback) {
		if (this.modules[name] && this.modules[name]._fdbFinished) {
			if (callback) { callback(name, this.modules[name]); }
		} else {
			this.on('moduleFinished', callback);
		}
	},

	/**
	 * Determines if a module has been added to ForerunnerDB or not.
	 * @memberof Shared
	 * @param {String} name The name of the module.
	 * @returns {Boolean} True if the module exists or false if not.
	 */
	moduleExists: function (name) {
		return Boolean(this.modules[name]);
	},

	mixin: new Overload({
		/**
		 * Adds the properties and methods defined in the mixin to the passed
		 * object.
		 * @memberof Shared
		 * @name mixin
		 * @param {Object} obj The target object to add mixin key/values to.
		 * @param {String} mixinName The name of the mixin to add to the object.
		 */
		'object, string': function (obj, mixinName) {
			var mixinObj;

			if (typeof mixinName === 'string') {
				mixinObj = this.mixins[mixinName];

				if (!mixinObj) {
					throw('ForerunnerDB.Shared: Cannot find mixin named: ' + mixinName);
				}
			}

			return this.$main.call(this, obj, mixinObj);
		},

		/**
		 * Adds the properties and methods defined in the mixin to the passed
		 * object.
		 * @memberof Shared
		 * @name mixin
		 * @param {Object} obj The target object to add mixin key/values to.
		 * @param {Object} mixinObj The object containing the keys to mix into
		 * the target object.
		 */
		'object, *': function (obj, mixinObj) {
			return this.$main.call(this, obj, mixinObj);
		},

		'$main': function (obj, mixinObj) {
			if (mixinObj && typeof mixinObj === 'object') {
				for (var i in mixinObj) {
					if (mixinObj.hasOwnProperty(i)) {
						obj[i] = mixinObj[i];
					}
				}
			}

			return obj;
		}
	}),

	/**
	 * Generates a generic getter/setter method for the passed method name.
	 * @memberof Shared
	 * @param {Object} obj The object to add the getter/setter to.
	 * @param {String} name The name of the getter/setter to generate.
	 * @param {Function=} extend A method to call before executing the getter/setter.
	 * The existing getter/setter can be accessed from the extend method via the
	 * $super e.g. this.$super();
	 */
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
			};
		} else {
			obj[name] = this._synth[name];
		}
	},

	/**
	 * Allows a method to be overloaded.
	 * @memberof Shared
	 * @param arr
	 * @returns {Function}
	 * @constructor
	 */
	overload: Overload,

	/**
	 * Define the mixins that other modules can use as required.
	 * @memberof Shared
	 */
	mixins: {
		'Mixin.Common': require('./Mixin.Common'),
		'Mixin.Events': require('./Mixin.Events'),
		'Mixin.ChainReactor': require('./Mixin.ChainReactor'),
		'Mixin.CRUD': require('./Mixin.CRUD'),
		'Mixin.Constants': require('./Mixin.Constants'),
		'Mixin.Triggers': require('./Mixin.Triggers'),
		'Mixin.Sorting': require('./Mixin.Sorting'),
		'Mixin.Matching': require('./Mixin.Matching'),
		'Mixin.Updating': require('./Mixin.Updating'),
		'Mixin.Tags': require('./Mixin.Tags')
	}
};

// Add event handling to shared
Shared.mixin(Shared, 'Mixin.Events');

module.exports = Shared;