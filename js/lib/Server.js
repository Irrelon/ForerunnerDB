"use strict";

var Shared = require('./Shared'),
	Db,
	DbInit;

var Server = function (db) {
	this.init.apply(this, arguments);
};

Server.prototype.init = function (db) {
	this._db = db;
	this._app = require('http').createServer(function handler (req, res) {
		res.writeHead(200);
		res.end();
	});

	this._io = require('socket.io').listen(this._app);
	this._fs = require('fs');

	console.log('Init ');
};

Shared.modules.Server = Server;
Db = Shared.modules.Db;
DbInit = Shared.modules.Db.prototype.init;

Server.prototype.addAuth = function (data) {
	if (data.user && data.pass) {
		this._db.collection('_fdbAuth').insert(data);
		return true;
	}

	return false;
};

Server.prototype.start = function () {
	console.log('Starting listener...');
	var self = this;
	this._app.listen(9000);

	this._io.sockets.on('connection', function (socket) {
		var user = null,
			authSuccess;

		socket.on('auth', function (data, callback) {
			var results = self._db.collection('_fdbAuth').find({
				user: data.user,
				pass: data.pass
			});

			user = results[0];
			authSuccess = Boolean(results[0]);

			if (callback) { callback({err: false, result: authSuccess}); }
		});

		socket.on('setData', function (data, callback) {
			if (self.isAllowed('setData', user, data, {}, callback)) {
				self._db.collection(data.collection).setData(data.query, data.options);
				if (callback) { callback({err: false, result: true}); }
			}
		});

		socket.on('insert', function (data, callback) {
			if (self.isAllowed('insert', user, data, {}, callback)) {
				var results = self._db.collection(data.collection).insert(data.query, data.options);
				if (callback) { callback({err: false, result: results}); }
			}
		});

		socket.on('find', function (data, callback) {
			if (self.isAllowed('find', user, data, {}, callback)) {
				var results = self._db.collection(data.collection).find(data.query, data.options);
				if (callback) { callback({err: false, result: results}); }
			}
		});

		socket.on('update', function (data, callback) {
			if (self.isAllowed('update', user, data, {}, callback)) {
				var results = self._db.collection(data.collection).update(data.query, data.update, data.options);
				if (callback) { callback({err: false, result: results}); }
			}
		});

		socket.on('remove', function (data, callback) {
			if (self.isAllowed('remove', user, data, {}, callback)) {
				var results = self._db.collection(data.collection).remove(data.query, data.options);
				if (callback) { callback({err: false, result: results}); }
			}
		});
	});
};

Server.prototype.hasPermission = function (user, collection, action) {
	if (user) {
		if (!collection) {
			// Return global setting
			return user.globalActions && user.globalActions[action];
		} else {
			// Check if there is collection-specific permissions
			if (user.collectionActions && user.collectionActions[collection]) {
				if (user.collectionActions[collection][action] !== undefined) {
					// Return collection-specific setting
					return user.collectionActions[collection][action];
				}
			}

			// Return global setting
			return user.globalActions && user.globalActions[action];
		}
	} else {
		return false;
	}
};

Server.prototype.isAllowed = function (action, user, data, options, callback) {
	// Check for direct private collection interaction
	if (data.collection.substr(0, 1) === "_") {
		if (!this.hasPermission(user, null, 'root')) {
			if (callback) { callback({err: 'Cannot remotely interact with private collection: ' + data.collection, result: null}); }
			return false;
		}
	}

	// Check if the user has permissions for the action against the collection
	if (!this.hasPermission(user, data.collection, action)) {
		if (callback) { callback({err: 'No permission to "' + action + '" on collection "' + data.collection + '"', result: null}); }
		return false;
	}

	// Check for join collection permissions
	if (data.options && data.options.$join) {
		for (var i = 0; i < data.options.$join.length; i++) {
			for (var collName in data.options.$join[i]) {
				if (data.options.$join[i].hasOwnProperty(collName)) {
					if (collName.substr(0, 1) === "_") {
						// Check if the user is a root
						if (!this.hasPermission(user, collName, 'root')) {
							if (callback) { callback({err: 'Cannot remotely interact with private collection "' + collName + '" via join', result: null}); }
							return false;
						}
					} else {
						// Check they have permission
						if (!this.hasPermission(user, collName, action)) {
							if (callback) { callback({err: 'Cannot "' + action + '" on collection "' + collName + '" via join', result: null}); }
							return false;
						}
					}
				}
			}
		}
	}

	return true;
};

// Extend the functionality of db
Db.prototype.init = function () {
	// Create the server instance
	this.server = new Server(this);
	DbInit.apply(this, arguments);
};

module.exports = Server;