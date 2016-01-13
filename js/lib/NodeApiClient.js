"use strict";

// Tell JSHint about EventSource
/*global
	EventSource
*/

// Import external names locally
var Shared = require('./Shared'),
	Core,
	CoreInit,
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
 * @param {Core} core The ForerunnerDB core instance.
 */
NodeApiClient.prototype.init = function (core) {
	var self = this;
	self._core = core;
};

Shared.addModule('NodeApiClient', NodeApiClient);
Shared.mixin(NodeApiClient.prototype, 'Mixin.Common');
Shared.mixin(NodeApiClient.prototype, 'Mixin.ChainReactor');

Core = Shared.modules.Core;
CoreInit = Core.prototype.init;
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

	if (this.debug()) {
		console.log(this.logIdentifier() + ' Connecting to API server ' + this.server() + path);
	}

	collectionInstance.__apiConnection = source;

	source.addEventListener('open', function (e) {
		// The connection is open, grab the initial data
		self.get(self.server() + path, function (err, data) {
			collectionInstance.upsert(data);
		});
	}, false);

	source.addEventListener('error', function (e) {
		if (source.readyState === 2) {
			// The connection is dead, remove the connection
			collectionInstance.unSync();
		}
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
	/**
	 * Sync with this collection on the server-side.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'function': function (callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + this.name(), null, callback);
	},

	/**
	 * Sync with collection of a different name on the server-side.
	 * @param {String} collectionName The name of the server-side
	 * collection to sync data with.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, function': function (collectionName, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + objName, null, callback);
	},

	/**
	 * Sync with an object on the server-side based on the type and
	 * name provided.
	 * @param {String} objType The type of the server-side object
	 * to sync with e.g. "collection", "view" etc
	 * @param {String} objName The name of the server-side object
	 * to sync data with.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, string, function': function (objType, objName, callback) {
		this.$main.call(this, '/' + this._db.name() + '/' + objType + '/' + objName, null, callback);
	},

	'$main': function (path, options, callback) {
		if (this._db && this._db._core) {
			if (!this.__apiConnection) {
				this._db._core.api.sync(this, path, options, callback);
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
		if (this.__apiConnection.readyState !== 2) {
			this.__apiConnection.close();
		}

		delete this.__apiConnection;

		return true;
	}

	return false;
};

// Override the DB init to instantiate the plugin
Core.prototype.init = function () {
	CoreInit.apply(this, arguments);
	this.api = new NodeApiClient(this);
};

Shared.finishModule('NodeApiClient');

module.exports = NodeApiClient;