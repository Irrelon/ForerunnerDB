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

NodeApiClient.prototype.http = function (method, url, data, options, callback) {
	var self = this,
		finalUrl,
		sessionData,
		bodyData,
		xmlHttp = new XMLHttpRequest();

	method = method.toUpperCase();

	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState === 4) {
			if (xmlHttp.status === 200) {
				callback(false, self.jParse(xmlHttp.responseText));
			} else {
				callback(xmlHttp.status, xmlHttp.responseText);
			}
		}
	};

	switch (method) {
		case 'GET':
		case 'DELETE':
			// Check for global auth
			if (this._sessionData) {
				data = data !== undefined ? data : {};

				// Add the session data to the key specified
				data[this._sessionData.key] = this._sessionData.obj;
			}

			finalUrl = url + (data !== undefined ? '?' + self.jStringify(data) : '');
			bodyData = null;
			break;

		case 'POST':
		case 'PUT':
		case 'PATCH':
			// Check for global auth
			if (this._sessionData) {
				sessionData = {};

				// Add the session data to the key specified
				sessionData[this._sessionData.key] = this._sessionData.obj;
			}

			finalUrl = url + (sessionData !== undefined ? '?' + self.jStringify(sessionData) : '');
			bodyData = (data !== undefined ? self.jStringify(data) : null);
			break;

		default:
			return false;
	}


	xmlHttp.open(method, finalUrl, true);
	xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xmlHttp.send(bodyData);

	return this;
};

// Define HTTP helper methods
NodeApiClient.prototype.get = new Overload({
	'string, function': function (path, callback) {
		return this.$main.call(this, path, undefined, {}, callback);
	},

	'string, object, function': function (path, data, callback) {
		return this.$main.call(this, path, data, {}, callback);
	},

	'string, object, object, function': function (path, data, options, callback) {
		return this.$main.call(this, path, data, options, callback);
	},

	'$main': function (path, data, options, callback) {
		return this.http('GET', this.server() + path, data, options, callback);
	}
});

NodeApiClient.prototype.put = new Overload({
	'string, function': function (path, callback) {
		return this.$main.call(this, path, undefined, {}, callback);
	},

	'string, object, function': function (path, data, callback) {
		return this.$main.call(this, path, data, {}, callback);
	},

	'string, object, object, function': function (path, data, options, callback) {
		return this.$main.call(this, path, data, options, callback);
	},

	'$main': function (path, data, options, callback) {
		return this.http('PUT', this.server() + path, data, options, callback);
	}
});

NodeApiClient.prototype.post = new Overload({
	'string, function': function (path, callback) {
		return this.$main.call(this, path, undefined, {}, callback);
	},

	'string, object, function': function (path, data, callback) {
		return this.$main.call(this, path, data, {}, callback);
	},

	'string, object, object, function': function (path, data, options, callback) {
		return this.$main.call(this, path, data, options, callback);
	},

	'$main': function (path, data, options, callback) {
		return this.http('POST', this.server() + path, data, options, callback);
	}
});

NodeApiClient.prototype.patch = new Overload({
	'string, function': function (path, callback) {
		return this.$main.call(this, path, undefined, {}, callback);
	},

	'string, object, function': function (path, data, callback) {
		return this.$main.call(this, path, data, {}, callback);
	},

	'string, object, object, function': function (path, data, options, callback) {
		return this.$main.call(this, path, data, options, callback);
	},

	'$main': function (path, data, options, callback) {
		return this.http('PATCH', this.server() + path, data, options, callback);
	}
});

NodeApiClient.prototype.delete = new Overload({
	'string, function': function (path, callback) {
		return this.$main.call(this, path, undefined, {}, callback);
	},

	'string, object, function': function (path, data, callback) {
		return this.$main.call(this, path, data, {}, callback);
	},

	'string, object, object, function': function (path, data, options, callback) {
		return this.$main.call(this, path, data, options, callback);
	},

	'$main': function (path, data, options, callback) {
		return this.http('DELETE', this.server() + path, data, options, callback);
	}
});

NodeApiClient.prototype.session = new Overload({
	/**
	 * Gets the global object that is sent up with client requests to
	 * the API or REST server.
	 * @name session
	 */
	'': function () {
		return this._sessionData;
	},

	/**
	 * Sets a global object that will be sent up with client
	 * requests to the API or REST server.
	 * @name session
	 * @param {Object=} obj The object to send up with all requests. If
	 * a request has its own data to send up, this session data will be
	 * mixed in to the request data. This means you cannot have clashing
	 * keys in your global object and local call data as they will
	 * overwrite each other.
	 */
	'object': function (obj) {
		this.$main.call(this, '', obj);
	},

	/**
	 * Sets a global object that will be sent up with client
	 * requests to the API or REST server.
	 * @name session
	 * @param {String} key The key to send the session object up inside.
	 * @param {*} obj The object / value to send up with all requests. If
	 * a request has its own data to send up, this session data will be
	 * mixed in to the request data under the specified key.
	 */
	'string, *': function (key, obj) {
		this.$main.call(this, key, obj);
	},

	'$main': function (key, obj) {
		this._sessionData = {
			key: key,
			obj: obj
		};
	}
});

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
		queryParams,
		queryString = '';

	if (this.debug()) {
		console.log(this.logIdentifier() + ' Connecting to API server ' + this.server() + path);
	}

	finalPath = this.server() + path + '/_sync';

	// Check for global auth
	if (this._sessionData) {
		queryParams = queryParams || {};

		if (this._sessionData.key) {
			// Add the session data to the key specified
			queryParams[this._sessionData.key] = this._sessionData.obj;
		} else {
			// Add the session data to the root query object
			Shared.mixin(queryParams, this._sessionData.obj);
		}
	}

	if (query) {
		queryParams = queryParams || {};
		queryParams.query = query;
	}

	if (options) {
		queryParams = queryParams || {};
		if (options.$initialData === undefined) {
			options.$initialData = true;
		}

		queryParams.options = options;
	}

	if (queryParams) {
		queryString = this.jStringify(queryParams);
		finalPath += '?' + queryString;
	}

	source = new EventSource(finalPath);
	collectionInstance.__apiConnection = source;

	source.addEventListener('open', function (e) {
		if (!options || (options && options.$initialData)) {
			// The connection is open, grab the initial data
			self.get(path, queryParams, function (err, data) {
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
	 * @param {String} objectType The type of object to sync to e.g.
	 * "collection" or "view".
	 * @param {String} objectName The name of the object to sync from.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, string, function': function (objectType, objectName, callback) {
		this.$main.call(this, '/' + this._db.name() + '/' + objectType + '/' + objectName, null, null, callback);
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
	 * @param {String} objectType The type of object to sync to e.g.
	 * "collection" or "view".
	 * @param {String} objectName The name of the object to sync from.
	 * @param {Object} query A query object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, string, object, function': function (objectType, objectName, query, callback) {
		this.$main.call(this, '/' + this._db.name() + '/' + objectType + '/' + objectName, query, null, callback);
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

	/**
	 * Sync with this collection on the server-side.
	 * @param {String} objectType The type of object to sync to e.g.
	 * "collection" or "view".
	 * @param {String} objectName The name of the object to sync from.
	 * @param {Object} query A query object.
	 * @param {Object} options An options object.
	 * @param {Function} callback The callback method to call once
	 * the connection to the server has been established.
	 */
	'string, string, object, object, function': function (objectType, objectName, query, options, callback) {
		this.$main.call(this, '/' + this._db.name() + '/' + objectType + '/' + objectName, query, options, callback);
	},

	'$main': function (path, query, options, callback) {
		var self = this;

		if (this._db && this._db._core) {
			// Kill any existing sync connection
			this.unSync();

			// Create new sync connection
			this._db._core.api.sync(this, path, query, options, callback);

			// Hook on drop to call unsync
			this.on('drop', function () {
				self.unSync();
			});
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