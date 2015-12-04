"use strict";

// Import external names locally
var Shared = require('./Shared'),
	NodeApiCollection = require('./NodeApiCollection'),
	Db,
	DbInit,
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
Overload = Shared.overload;

NodeApiClient.prototype.remote = function (collectionName, options) {
	options = options || {};
	options.$model = options.$model || 'PersistedModel';

	return new NodeApiCollection(this, collectionName, options);
};

// Override the DB init to instantiate the plugin
Db.prototype.init = function () {
	DbInit.apply(this, arguments);
	this.api = new NodeApiClient(this);
};

Shared.finishModule('NodeApiClient');

module.exports = NodeApiClient;