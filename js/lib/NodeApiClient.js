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
 * @param options
 * @param callback
 */
NodeApiClient.prototype.sync = function (collectionInstance, path, options, callback) {
	var self = this,
		source,
		finalPath;

	if (this.debug()) {
		console.log(this.logIdentifier() + ' Connecting to API server ' + this.server() + path);
	}

	finalPath = this.server() + path + '/_sync';

	// Check for global auth
	if (this._auth) {
		finalPath += '?auth=' + JSON.stringify(this._auth);
	}

	if (options) {
		if (options.initialData === undefined) {
			options.initialData = true;
		}

		if (options.auth) {
			// Add auth data to end of call
			finalPath += '?auth=' + JSON.stringify(options.auth);
		}
	}

	source = new EventSource(finalPath);
	collectionInstance.__apiConnection = source;

	source.addEventListener('open', function (e) {
		if (!options || (options && options.initialData)) {
			// The connection is open, grab the initial data
			self.get(self.server() + path, function (err, data) {
				collectionInstance.upsert(data);
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
		this.$main.call(this, '/' + this._db.name() + '/collection/' + this.name(), null, callback);
	},

	/**
	 * Sync with this collection on the server-side.
	 * @param {Object} options An options object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'object, function': function (options, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + this.name(), options, callback);
	},

	/**
	 * Sync with collection of a different name on the server-side.
	 * @param {String} collectionName The name of the server-side
	 * collection to sync data with.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, function': function (collectionName, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + collectionName, null, callback);
	},

	/**
	 * Sync with collection of a different name on the server-side.
	 * @param {String} collectionName The name of the server-side
	 * collection to sync data with.
	 * @param {Object} options An options object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, object, function': function (collectionName, options, callback) {
		this.$main.call(this, '/' + this._db.name() + '/collection/' + collectionName, options, callback);
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

	/**
	 * Sync with an object on the server-side based on the type and
	 * name provided.
	 * @param {String} objType The type of the server-side object
	 * to sync with e.g. "collection", "view" etc
	 * @param {String} objName The name of the server-side object
	 * to sync data with.
	 * @param {Object} options An options object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, string, object, function': function (objType, objName, options, callback) {
		this.$main.call(this, '/' + this._db.name() + '/' + objType + '/' + objName, options, callback);
	},

	'$main': function (path, options, callback) {
		if (this._db && this._db._core) {
			// Kill any existing sync connection
			this.unSync();

			// Create new sync connection
			this._db._core.api.sync(this, path, options, callback);
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