"use strict";

// Import external names locally
var Shared = require('./Shared'),
	NodeApiCollection = require('./NodeApiCollection'),
	Db,
	DbInit,
	NodeApi,
	Overload;

NodeApi = function () {
	this.init.apply(this, arguments);
};

/**
 * The init method that can be overridden or extended.
 * @param {Db} db The ForerunnerDB database instance.
 */
NodeApi.prototype.init = function (db) {
	var self = this;
	self._db = db;
	self._access = {};
};

Shared.addModule('NodeApi', NodeApi);
Shared.mixin(NodeApi.prototype, 'Mixin.Common');
Shared.mixin(NodeApi.prototype, 'Mixin.ChainReactor');

Db = Shared.modules.Db;
DbInit = Db.prototype.init;
Overload = Shared.overload;

NodeApi.prototype.remote = function (collectionName, options) {
	options = options || {};
	options.$model = options.$model || 'PersistedModel';

	return new NodeApiCollection(this, collectionName, options);
};

NodeApi.prototype.access = new Overload({
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
					return this._access[modelName][methodName];
				}

				return [];
			}

			if (this._access[modelName]) {
				return this._access[modelName];
			}

			return {};
		}

		return this._access;
	}
});

// Override the DB init to instantiate the plugin
Db.prototype.init = function () {
	DbInit.apply(this, arguments);
	this.api = new NodeApi(this);
};

Shared.finishModule('NodeApi');

module.exports = NodeApi;