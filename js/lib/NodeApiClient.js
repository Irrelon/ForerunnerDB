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

NodeApiClient.prototype.sync = function (collectionInstance, path) {
	// Hook SSE from the server
	//noinspection JSUnresolvedFunction
	var self = this,
		source = new EventSource(this.server() + path);

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
};

Collection.prototype.sync = function (path, options) {
	if (this._db) {
		if (!path) {
			path = '/' + this._db.name() +  '/' + this.name();
		}

		path += '/_sync';

		this._db.api.sync(this, path);
	} else {
		throw(this.logIdentifier() + ' Cannot sync for an anonymous collection! (Collection must be attached to a database)');
	}
};

// Override the DB init to instantiate the plugin
Db.prototype.init = function () {
	DbInit.apply(this, arguments);
	this.api = new NodeApiClient(this);
};

Shared.finishModule('NodeApiClient');

module.exports = NodeApiClient;