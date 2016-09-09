"use strict";

var Shared,
	Db,
	Procedure;

Shared = require('./Shared');

/**
 * This class handles remote procedure call generation. It is an
 * extension of the NodeApiServer class and is primarily used there.
 * It allows procedures to be created that are exposed to remote
 * clients via the REST interface. Procedures handle their own server
 * code including responding to clients directly.
 * @param {String} name The name of the procedure.
 * @param {Function} method The handler method.
 * @class
 * @constructor
 */
Procedure = function (name, method) {
	this.init.apply(this, arguments);
};

/**
 * Create a remote procedure call.
 * @param {String} name The name of the procedure.
 * @param {Function} method The procedure handler.
 */
Procedure.prototype.init = function (name, method) {
	this._name = name;
	this._method = method;
};

// Tell ForerunnerDB about our new module
Shared.addModule('Procedure', Procedure);

// Mixin some commonly used methods
Shared.mixin(Procedure.prototype, 'Mixin.Common');
Shared.mixin(Procedure.prototype, 'Mixin.Events');

/**
 * Get / set the procedure name.
 * @name name
 * @method Procedure.name
 * @param {String=} name The name to set.
 */
Shared.synthesize(Procedure.prototype, 'name');

/**
 * Execute the procedure, passing in the request and response
 * (req and res) arguments from the server. Procedure methods
 * are responsible for correctly communicating with the client
 * and handling response properly.
 * @param req
 * @param res
 * @returns {*}
 */
Procedure.prototype.exec = function (req, res) {
	return this._method.call(this, req, res);
};

// Grab the collection module for use later
Db = Shared.modules.Db;

/**
 * Create or retrieve a procedure by name.
 * @param {String} name The name of the procedure.
 * @param {Function=} method If specified, creates a new procedure
 * with the provided name and method.
 * @returns {*}
 */
Db.prototype.procedure = function (name, method) {
	var self = this;

	if (name !== undefined) {
		self._procedure = self._procedure || {};

		if (method !== undefined) {
			if (self.debug()) {
				console.log(self.logIdentifier() + ' Creating procedure ' + name);
			}

			self._procedure[name] = new Procedure(name, method);

			self.deferEmit('create', self._procedure[name], 'procedure', name);
		}

		return self._procedure[name];
	}
};

// Tell ForerunnerDB that our module has finished loading
Shared.finishModule('Procedure');
module.exports = Procedure;