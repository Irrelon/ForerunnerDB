"use strict";

// Import external names locally
var Shared = require('./Shared'),
	Overload = Shared.overload,
	NodeApiModel;

NodeApiModel = function () {
	this.init.apply(this, arguments);
};

/**
 * The init method that can be overridden or extended.
 * @param {NodeApi} api The API instance.
 * @param {String} modelName The name of the model to use.
 */
NodeApiModel.prototype.init = function (api, modelName, base) {
	var self = this;
	self._api = api;
	self._name = modelName;
	self._properties = {};
	self._base = base;
};

Shared.addModule('NodeApiModel', NodeApiModel);

NodeApiModel.prototype.prop = function (propertyName, propertyValue) {
	if (propertyName !== undefined) {
		if (propertyValue !== undefined) {
			this._properties[propertyName] = propertyValue;
			return this;
		}

		return this._properties[propertyName];
	}

	return undefined;
};

NodeApiModel.prototype.create = new Overload({
	'function': function (callback) {
		return this.$main.call(this, this._properties, callback);
	},

	'object, function': function (obj, callback) {
		return this.$main.call(this, obj, callback);
	},

	'$main': function (obj, callback) {

	}
});

Shared.finishModule('NodeApiModel');

module.exports = NodeApiModel;