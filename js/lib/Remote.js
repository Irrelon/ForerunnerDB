// Extend the Collection class to handle remote calls
var Shared = require('./Shared'),
	Collection = require('./Collection'),
	CollectionFind = Collection.prototype.find,
	CollectionInsert = Collection.prototype.insert,
	CollectionUpdate = Collection.prototype.update,
	CollectionRemove = Collection.prototype.remove,
	CollectionSetData = Collection.prototype.setData;

Collection.prototype.find = function (query, options, callback) {
	if (options && options.remote) {
		var self = this,
			selfArgs = arguments;

		if (self._db.remote.connected()) {
			self._db.remote.send('find', {
				collection: self._name,
				query: query,
				options: options
			}, function (data) {
				callback(data.err, data.result);
			});
		} else {
			// Set a timer to try and re-execute this call
			setTimeout(function () {
				self.find.apply(self, selfArgs);
			}, 200);
		}
	} else {
		return CollectionFind.apply(this, arguments);
	}
};

Collection.prototype.insert = function (query, options, callback) {
	if (options && options.remote) {
		var self = this,
			selfArgs = arguments;

		if (self._db.remote.connected()) {
			self._db.remote.send('insert', {
				collection: self._name,
				query: query,
				options: options
			}, function (data) {
				callback(data.err, data.result);
			});
		} else {
			// Set a timer to try and re-execute this call
			setTimeout(function () {
				self.insert.apply(self, selfArgs);
			}, 200);
		}
	} else {
		return CollectionInsert.apply(this, arguments);
	}
};

Collection.prototype.update = function (query, update, options, callback) {
	if (options && options.remote) {
		var self = this,
			selfArgs = arguments;

		if (self._db.remote.connected()) {
			self._db.remote.send('update', {
				collection: self._name,
				query: query,
				update: update,
				options: options
			}, function (data) {
				callback(data.err, data.result);
			});
		} else {
			// Set a timer to try and re-execute this call
			setTimeout(function () {
				self.update.apply(self, selfArgs);
			}, 200);
		}
	} else {
		return CollectionUpdate.apply(this, arguments);
	}
};

Collection.prototype.remove = function (query, options, callback) {
	if (options && options.remote) {
		var self = this,
			selfArgs = arguments;

		if (self._db.remote.connected()) {
			self._db.remote.send('remove', {
				collection: self._name,
				query: query,
				options: options
			}, function (data) {
				callback(data.err, data.result);
			});
		} else {
			// Set a timer to try and re-execute this call
			setTimeout(function () {
				self.remove.apply(self, selfArgs);
			}, 200);
		}
	} else {
		return CollectionRemove.apply(this, arguments);
	}
};

Collection.prototype.setData = function (query, options, callback) {
	if (options && options.remote) {
		var self = this,
			selfArgs = arguments;

		if (self._db.remote.connected()) {
			self._db.remote.send('setData', {
				collection: self._name,
				query: query,
				options: options
			}, function (data) {
				callback(data.err, data.result);
			});
		} else {
			// Set a timer to try and re-execute this call
			setTimeout(function () {
				self.setData.apply(self, selfArgs);
			}, 200);
		}
	} else {
		return CollectionSetData.apply(this, arguments);
	}
};

var Remote = function (db) {
	this._db = db;
	this._collection = {};
};

Remote.prototype.connect = function (url, callback) {
	var self = this;

	self._socket = io.connect(url);
	self._socket.on('connect', function () {
		self.connected(true);
	});
};

Remote.prototype.connected = function (val) {
	if (val !== undefined) {
		this._connected = val;
		return this;
	}

	return this._connected;
};

Remote.prototype.authenticated = function (val) {
	if (val !== undefined) {
		this._authenticated = val;
		return this;
	}

	return this._authenticated;
};

Remote.prototype.send = function (command, data, callback) {
	this._socket.emit(command, data, callback);
};

Remote.prototype.auth = function (auth, callback) {
	var self = this,
		selfArgs = arguments;

	if (self.connected()) {
		self.send('auth', auth, function (data) {
			if (data.result) {
				self.authenticated(true);
			}
			if (callback) { callback(data.err, data.result); }
		});
	} else {
		setTimeout(function () {
			self.auth.apply(self, selfArgs);
		}, 200);
	}
};

module.exports = Remote;