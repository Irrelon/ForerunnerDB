"use strict";

// jshint ignore: start

// Import external names locally
var Shared = require('./Shared'),
	NodeApiCollection = require('./NodeApiCollection'),
	express = require('express'),
	bodyParser = require('body-parser'),
	async = require('async'),
	app = express(),
	Db,
	DbInit,
	NodeApiServer,
	Overload;

NodeApiServer = function () {
	this.init.apply(this, arguments);
};

/**
 * The init method that can be overridden or extended.
 * @param {Db} db The ForerunnerDB database instance.
 */
NodeApiServer.prototype.init = function (db) {
	var self = this;
	self._db = db;
	self._access = {};
};

Shared.addModule('NodeApiServer', NodeApiServer);
Shared.mixin(NodeApiServer.prototype, 'Mixin.Common');
Shared.mixin(NodeApiServer.prototype, 'Mixin.ChainReactor');

Db = Shared.modules.Db;
DbInit = Db.prototype.init;
Overload = Shared.overload;

/**
 * Starts the rest server listening for requests against the ip and
 * port number specified.
 * @param {String} host The IP address to listen on, set to 0.0.0.0 to
 * listen on all interfaces.
 * @param {String} port The port to listen on.
 * @param {Function=} callback The method to call when the server has
 * started (or failed to start).
 * @returns {NodeApiServer}
 */
NodeApiServer.prototype.listen = function (host, port, callback) {
	var self = this;

	app.use(bodyParser.json());

	// Define the default routes (catchall that resolves to collections etc)
	self._defineRoutes();

	// Start listener
	self._server = app.listen(port, host, function () {
		console.log('ForerunnerDB REST API listening at http://%s:%s', host, port);
		if (callback) { callback(false, self._server); }
	});

	return this;
};

NodeApiServer.prototype._defineRoutes = function () {
	var self = this;

	app.get('/:collection', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			collection;

		self.hasPermission(modelName, 'get', req, function (err, results) {
			if (!err) {
				collection = self._db.collection(req.params.collection);

				// Return all data in the collection
				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}
						res.send(self._db.collection(req.params.collection).find());
					});
				} else {
					res.send(self._db.collection(req.params.collection).find());
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.post('/:collection', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			collection;

		self.hasPermission(modelName, 'post', req, function (err, results) {
			if (!err) {
				collection = self._db.collection(req.params.collection);

				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}

						self._db.collection(req.params.collection).insert(req.body, function (result) {
							res.send(result);
						});
					});
				} else {
					self._db.collection(req.params.collection).insert(req.body, function (result) {
						res.send(result);
					});
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.get('/:collection/:id', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			modelId = req.params.id,
			collection;

		self.hasPermission(modelName, 'get', req, function (err) {
			if (!err) {
				collection = self._db.collection(req.params.collection);

				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}

						res.send(self._db.collection(req.params.collection).findById(modelId));
					});
				} else {
					res.send(self._db.collection(req.params.collection).findById(modelId));
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.put('/:collection/:id', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			modelId = req.params.id,
			collection;

		self.hasPermission(modelName, 'put', req, function (err) {
			if (!err) {
				collection = self._db.collection(req.params.collection);

				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}

						res.send(self._db.collection(req.params.collection).updateById(modelId, req.body));
					});
				} else {
					res.send(self._db.collection(req.params.collection).updateById(modelId, req.body));
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.delete('/:collection/:id', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			modelId = req.params.id,
			collection;

		self.hasPermission(modelName, 'delete', req, function (err) {
			if (!err) {
				collection = self._db.collection(req.params.collection);

				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}

						res.send(self._db.collection(req.params.collection).removeById(modelId));
					});
				} else {
					res.send(self._db.collection(req.params.collection).removeById(modelId));
				}
			} else {
				res.status(403).send(err);
			}
		});
	});
};

NodeApiServer.prototype.hasPermission = function (modelName, methodName, req, callback) {
	var permissionMethods = this.access(modelName, methodName);

	if (!permissionMethods || !permissionMethods.length) {
		// No permissions set, deny access by default
		return callback('403 Access Forbidden');
	}

	permissionMethods.splice(0, 0, function (cb) {
		cb(null, modelName, methodName, req);
	});

	// Loop the access methods and call each one in turn until a false
	// response is found, then callback a failure
	async.waterfall(permissionMethods, callback);
};

NodeApiServer.prototype.access = new Overload({
	'': function () {
		return this.$main.call(this);
	},

	'string': function (modelName) {
		return this.$main.call(this, modelName);
	},

	'string, function': function (modelName, method) {
		return this.$main.call(this, modelName, '*', method);
	},

	'string, string': function (modelName, methodName) {
		return this.$main.call(this, modelName, methodName);
	},

	'string, string, function': function (modelName, methodName, method) {
		return this.$main.call(this, modelName, methodName, method);
	},

	/**
	 * Defines an access rule for a model and method combination. When
	 * access is requested via a REST call, the function provided will be
	 * executed and the callback from that method will determine if the
	 * access will be allowed or denied. Multiple access functions can
	 * be provided for a single model and method allowing authentication
	 * checks to be stacked.
	 * @name access
	 * @param {String} modelName The model name (collection) to apply the
	 * access function to.
	 * @param {String} methodName The name of the method to apply the access
	 * function to e.g. "insert".
	 * @param {Function} method The function to call when an access attempt
	 * is made against the collection. A callback method is passed to this
	 * function which should be called after the function has finished
	 * processing.
	 * @returns {*}
	 */
	'$main': function (modelName, methodName, method) {
		var self = this;

		if (modelName !== undefined) {
			if (methodName !== undefined) {
				if (method !== undefined) {
					this._access[modelName] = this._access[modelName] || {};
					this._access[modelName][methodName] = this._access[modelName][methodName] || [];
					this._access[modelName][methodName].push(method);

					return this;
				}

				if (this._access[modelName] && this._access[modelName][methodName]) {
					return [].concat(this._access[modelName][methodName]);
				} else if (this._access[modelName] && this._access[modelName]['*']) {
					return [].concat(this._access[modelName]['*']);
				} else if (this._access['*'] && this._access['*'][methodName]) {
					return [].concat(this._access['*'][methodName]);
				} else if (this._access['*'] && this._access['*']['*']) {
					return [].concat(this._access['*']['*']);
				}
			}
		}

		return [];
	}
});

// Override the DB init to instantiate the plugin
Db.prototype.init = function () {
	DbInit.apply(this, arguments);
	this.api = new NodeApiServer(this);
};

Shared.finishModule('NodeApiServer');

module.exports = NodeApiServer;