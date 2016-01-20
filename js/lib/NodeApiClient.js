"use strict";

// Tell JSHint about EventSource
/*global
	EventSource
*/

// Import external names locally
var Shared = require('./Shared'),
	Core,
	CoreInit,
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
Collection = Shared.modules.Collection;
Overload = Shared.overload;

/**
 * Set the url of the server to use for API.
 * @name server
 */
Shared.synthesize(NodeApiClient.prototype, 'server', function (val) {
	if (val !== undefined) {
		if (val.substr(val.length - 1, 1) === '/') {
			// Strip trailing /
			val = val.substr(0, val.length - 1);
		}
	}

	return this.$super.call(this, val);
});

NodeApiClient.prototype.get = new Overload({
	'string, function': function (theUrl, callback) {
		this.$main.call(this, theUrl, {}, callback);
	},

	'string, object, function': function (theUrl, data, callback) {
		this.$main.call(this, theUrl, data, callback);
	},

	'$main': function (theUrl, data, callback) {
		var self = this,
			finalUrl,
			xmlHttp = new XMLHttpRequest();

		xmlHttp.onreadystatechange = function () {
			if (xmlHttp.readyState === 4) {
				if (xmlHttp.status === 200) {
					callback(false, self.jParse(xmlHttp.responseText));
				} else {
					callback(xmlHttp.status, xmlHttp.responseText);
				}
			}
		};

		finalUrl = theUrl + (data !== undefined ? '?' + self.jStringify(data) : '');

		xmlHttp.open("GET", finalUrl, true);
		xmlHttp.send(null);
	}
});

/**
 * Sets a global auth object that will be sent up with client connections
 * to the API server.
 * @name auth
 */
Shared.synthesize(NodeApiClient.prototype, 'auth');

/**
 * Initiates a client connection to the API server.
 * @param collectionInstance
 * @param path
 * @param query
 * @param options
 * @param callback
 */
NodeApiClient.prototype.sync = function (collectionInstance, path, query, options, callback) {
	var self = this,
		source,
		finalPath,
		queryParams = {},
		queryString;

	if (this.debug()) {
		console.log(this.logIdentifier() + ' Connecting to API server ' + this.server() + path);
	}

	finalPath = this.server() + path + '/_sync';

	// Check for global auth
	if (this._auth) {
		queryParams.$auth = this._auth;
	}

	if (query) {
		queryParams.query = query;
	}

	if (options) {
		if (options.$initialData === undefined) {
			options.$initialData = true;
		}

		queryParams.options = options;
	}

	queryString = this.jStringify(queryParams);
	finalPath += '?' + queryString;

	source = new EventSource(finalPath);
	collectionInstance.__apiConnection = source;

	source.addEventListener('open', function (e) {
		if (!options || (options && options.$initialData)) {
			// The connection is open, grab the initial data
			self.get(self.server() + path + '?' + queryString, function (err, data) {
				if (!err) {
					collectionInstance.upsert(data);
				}
			});
		}
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
		this.$main.call(this, '/' + this._db.name() + '/collection/' + this.name(), null, null, callback);
	},

	/**
	 * Sync with this collection on the server-side.
	 * @param {String} collectionName The collection to sync from.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, function': function (collectionName, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + collectionName, null, null, callback);
	},

	/**
	 * Sync with this collection on the server-side.
	 * @param {Object} query A query object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'object, function': function (query, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + this.name(), query, null, callback);
	},

	/**
	 * Sync with this collection on the server-side.
	 * @param {String} collectionName The collection to sync from.
	 * @param {Object} query A query object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, object, function': function (collectionName, query, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + collectionName, query, null, callback);
	},

	/**
	 * Sync with this collection on the server-side.
	 * @param {Object} query A query object.
	 * @param {Object} options An options object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'object, object, function': function (query, options, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + this.name(), query, options, callback);
	},

	/**
	 * Sync with this collection on the server-side.
	 * @param {String} collectionName The collection to sync from.
	 * @param {Object} query A query object.
	 * @param {Object} options An options object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, object, object, function': function (collectionName, query, options, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + collectionName, query, options, callback);
	},

	'$main': function (path, query, options, callback) {
		if (this._db && this._db._core) {
			// Kill any existing sync connection
			this.unSync();

			// Create new sync connection
			this._db._core.api.sync(this, path, query, options, callback);
		} else {
			throw(this.logIdentifier() + ' Cannot sync for an anonymous collection! (Collection must be attached to a database)');
		}
	}
});

/**
 * Disconnects an existing connection to a sync server.
 * @returns {boolean} True if a connection existed, false
 * if no connection existed.
 */
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

// Override the Core init to instantiate the plugin
Core.prototype.init = function () {
	CoreInit.apply(this, arguments);
	this.api = new NodeApiClient(this);
};

Shared.finishModule('NodeApiClient');

module.exports = NodeApiClient;