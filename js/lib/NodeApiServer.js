"use strict";

// NOTE: This class instantiates individually but shares a single
// http server after listen() is called on any instance

// Import external names locally
var Shared = require('./Shared'),
	express = require('express'),
	bodyParser = require('body-parser'),
	cors = require('cors'),
	async = require('async'),
	app = express(),
	server,
	Db,
	DbInit,
	NodeApiServer,
	ReactorIO,
	Overload;

app.use(cors({origin: true}));
app.use(bodyParser.json());

// Allow preflight cors
app.options('*', cors({origin: true}));

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
	this.name('ApiServer');
};

Shared.addModule('NodeApiServer', NodeApiServer);
Shared.mixin(NodeApiServer.prototype, 'Mixin.Common');
Shared.mixin(NodeApiServer.prototype, 'Mixin.ChainReactor');

Db = Shared.modules.Db;
DbInit = Db.prototype.init;
ReactorIO = Shared.modules.ReactorIO;
Overload = Shared.overload;

Shared.synthesize(NodeApiServer.prototype, 'name');

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

	// Define the default routes (catchall that resolves to collections etc)
	self._defineRoutes();

	// Start listener
	if (!server) {
		server = app.listen(port, host, function (err) {
			if (!err) {
				console.log('ForerunnerDB REST API listening at http://%s:%s', host, port);
				if (callback) {
					callback(false, server);
				}
			} else {
				console.log('Listen error', err);
				callback(err);
			}
		});
	} else {
		// Server already running
		if (callback) {
			callback(false, server);
		}
	}

	return this;
};

NodeApiServer.prototype._defineRoutes = function () {
	var self = this,
		dbName = this._db.name();

	app.get('/', function (req, res) {
		res.send({
			server: 'ForerunnerDB',
			version: self._db.version()
		});
	});

	// Handle sync routes
	app.get('/' +  dbName + '/:collection/_sync', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			collection,
			sendMessage,
			io,
			messageId = 0;

		self.hasPermission(modelName, 'sync', req, function (err) {
			if (!err) {
				collection = self._db.collection(modelName);

				sendMessage = function(eventName, data) {
					messageId++;

					res.write('event: ' + eventName + '\n');
					res.write('id: ' + messageId + '\n');
					res.write("data: " + self.jStringify(data) + '\n\n');
				};

				// Let request last as long as possible
				req.socket.setTimeout(0x7FFFFFFF);

				// TODO: Make multiple connections share a single IO instance
				// TODO: it will use less memory
				// Setup a chain reactor IO node to intercept CRUD packets
				// coming from the collection, and then pass them to the
				// client socket
				io = new ReactorIO(collection, self, function (chainPacket) {
					switch (chainPacket.type) {
						case 'insert':
							sendMessage(chainPacket.type, chainPacket.data);
							break;

						case 'remove':
							sendMessage(chainPacket.type, {query: chainPacket.data.query});
							break;

						case 'update':
							sendMessage(chainPacket.type, {query: chainPacket.data.query, update: chainPacket.data.update});
							break;

						default:
							break;
					}


					// Returning false informs the chain reactor to continue propagation
					// of the chain packet down the graph tree
					return false;
				});

				// Send headers for event-stream connection
				res.writeHead(200, {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive'
				});

				res.write('\n');

				sendMessage('connected', {});

				req.on("close", function() {
					io.drop();
				});
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.get('/' +  dbName + '/:collection', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			query = req.query && req.query.query ? req.query.query : undefined,
			options = req.query && req.query.options ? req.query.options : undefined,
			collection;

		if (query) {
			try {
				query = JSON.parse(query);
				query = self.decouple(query);
			} catch (e) {
				res.status(500).send('Error parsing query parameter: ' + e.message);
				return;
			}
		}

		if (options) {
			try {
				options = JSON.parse(options);
				options = self.decouple(options);
			} catch (e) {
				res.status(500).send('Error parsing options parameter: ' + e.message);
				return;
			}
		}

		self.hasPermission(modelName, 'get', req, function (err, results) {
			if (!err) {
				collection = self._db.collection(modelName);

				// Return all data in the collection
				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}
						res.send(self._db.collection(req.params.collection).find(query, options));
					});
				} else {
					res.send(self._db.collection(req.params.collection).find(query, options));
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.post('/' +  dbName + '/:collection', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			collection;

		self.hasPermission(modelName, 'post', req, function (err, results) {
			if (!err) {
				collection = self._db.collection(modelName);

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

	app.get('/' +  dbName + '/:collection/:id', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			modelId = req.params.id,
			query = req.query && req.query.query ? req.query.query : undefined,
			options = req.query && req.query.options ? req.query.options : undefined,
			collection;

		if (query) {
			try {
				query = JSON.parse(query);
				query = self.decouple(query);
			} catch (e) {
				res.status(500).send('Error parsing query parameter: ' + e.message);
				return;
			}
		}

		if (options) {
			try {
				options = JSON.parse(options);
				options = self.decouple(options);
			} catch (e) {
				res.status(500).send('Error parsing options parameter: ' + e.message);
				return;
			}
		}

		self.hasPermission(modelName, 'get', req, function (err) {
			if (!err) {
				collection = self._db.collection(modelName);

				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}

						res.send(self._db.collection(req.params.collection).findById(modelId, options));
					});
				} else {
					res.send(self._db.collection(req.params.collection).findById(modelId, options));
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.put('/' +  dbName + '/:collection/:id', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			modelId = req.params.id,
			collection;

		self.hasPermission(modelName, 'put', req, function (err) {
			if (!err) {
				collection = self._db.collection(modelName);

				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}

						res.send(self._db.collection(req.params.collection).updateById(modelId, {$replace: req.body}));
					});
				} else {
					res.send(self._db.collection(req.params.collection).updateById(modelId, {$replace: req.body}));
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.patch('/' +  dbName + '/:collection/:id', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			modelId = req.params.id,
			collection;

		self.hasPermission(modelName, 'put', req, function (err) {
			if (!err) {
				collection = self._db.collection(modelName);

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

	app.delete('/' +  dbName + '/:collection', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			query = req.query && req.query.query ? req.query.query : undefined,
			options = req.query && req.query.options ? req.query.options : undefined,
			collection;

		if (query) {
			try {
				query = JSON.parse(query);
				query = self.decouple(query);
			} catch (e) {
				res.status(500).send('Error parsing query parameter: ' + e.message);
				return;
			}
		}

		if (options) {
			try {
				options = JSON.parse(options);
				options = self.decouple(options);
			} catch (e) {
				res.status(500).send('Error parsing options parameter: ' + e.message);
				return;
			}
		}

		self.hasPermission(modelName, 'delete', req, function (err) {
			if (!err) {
				collection = self._db.collection(modelName);

				if (collection.isProcessingQueue()) {
					if (self._db.debug()) {
						console.log(self._db.logIdentifier() + ' Waiting for async queue: ' + modelName);
					}

					collection.once('ready', function () {
						if (self._db.debug()) {
							console.log(self._db.logIdentifier() + ' Async queue complete: ' + modelName);
						}

						res.send(self._db.collection(req.params.collection).remove(query, options));
					});
				} else {
					res.send(self._db.collection(req.params.collection).remove(query, options));
				}
			} else {
				res.status(403).send(err);
			}
		});
	});

	app.delete('/' +  dbName + '/:collection/:id', function (req, res) {
		// Check permissions
		var modelName = req.params.collection,
			modelId = req.params.id,
			collection;

		self.hasPermission(modelName, 'delete', req, function (err) {
			if (!err) {
				collection = self._db.collection(modelName);

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