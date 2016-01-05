"use strict";

// Tell JSHint about EventSource
/*global
	EventSource
*/

// Import external names locally
var Shared = require('./Shared'),
	Db,
	DbInit,
	Collection,
	NodeApiClient,
	Overload;

NodeApiClient = function () {
	this.init.apply(this, arguments);
};

/**
 * The init method that can be overridden or extended.
 * @param {Db} db The ForerunnerDB database instance.
 */
NodeApiClient.prototype.init = function (db) {
	var self = this;
	self._db = db;
	self._access = {};
};

Shared.addModule('NodeApiClient', NodeApiClient);
Shared.mixin(NodeApiClient.prototype, 'Mixin.Common');
Shared.mixin(NodeApiClient.prototype, 'Mixin.ChainReactor');

Db = Shared.modules.Db;
DbInit = Db.prototype.init;
Collection = Shared.modules.Collection;
Overload = Shared.overload;

Shared.synthesize(NodeApiClient.prototype, 'server', function (val) {
	if (val !== undefined) {
		if (val.substr(val.length - 1, 1) === '/') {
			// Strip trailing /
			val = val.substr(0, val.length - 1);
		}
	}

	return this.$super.call(this, val);
});

NodeApiClient.prototype.get = function (theUrl, callback) {
	var self = this,
		xmlHttp = new XMLHttpRequest();

	xmlHttp.onreadystatechange = function() {
		if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
			callback(false, self.jParse(xmlHttp.responseText));
		}
	};

	xmlHttp.open("GET", theUrl, true); // true for asynchronous
	xmlHttp.send(null);
};

NodeApiClient.prototype.sync = function (collectionInstance, path, options, callback) {
	var self = this,
		source = new EventSource(this.server() + path + '/_sync');

	if (this._db.debug()) {
		console.log(this._db.logIdentifier() + ' Connecting to API server ' + this.server() + path);
	}

	collectionInstance.__apiConnection = source;

	source.addEventListener('open', function (e) {
		// The connection is open, grab the initial data
		self.get(self.server() + path, function (err, data) {
			collectionInstance.insert(data);
		});
	}, false);

	source.addEventListener('insert', function(e) {
		var data = self.jParse(e.data);
		collectionInstance.insert(data);
	}, false);

	source.addEventListener('update', function(e) {
		var data = self.jParse(e.data);
		collectionInstance.update(data.query, data.update);
	}, false);

	source.addEventListener('remove', function(e) {
		var data = self.jParse(e.data);
		collectionInstance.remove(data.query);
	}, false);

	if (callback) {
		source.addEventListener('connected', function (e) {
			callback(false);
		}, false);
	}
};

Collection.prototype.sync = new Overload({
	'function': function (callback) {
		this.$main.call(this, null, null, callback);
	},

	'$main': function (path, options, callback) {
		if (this._db) {
			if (!this.__apiConnection) {
				if (!path) {
					path = '/' + this._db.name() + '/' + this.name();
				}

				this._db.api.sync(this, path, options, callback);
			} else {
				if (callback) {
					callback(false);
				}
			}
		} else {
			throw(this.logIdentifier() + ' Cannot sync for an anonymous collection! (Collection must be attached to a database)');
		}
	}
});

Collection.prototype.unSync = function () {
	if (this.__apiConnection) {
		this.__apiConnection.close();

		delete this.__apiConnection;

		return true;
	}

	return false;
};

// Override the DB init to instantiate the plugin
Db.prototype.init = function () {
	DbInit.apply(this, arguments);
	this.api = new NodeApiClient(this);
};

Shared.finishModule('NodeApiClient');

module.exports = NodeApiClient;