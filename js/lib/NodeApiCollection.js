"use strict";

// Import external names locally
var Shared = require('./Shared'),
	Overload = Shared.overload,
	NodeApiModel = require('./NodeApiModel'),
	NodeApiCollection;

NodeApiCollection = function () {
	this.init.apply(this, arguments);
};

/**
 * The init method that can be overridden or extended.
 * @param {NodeApi} api The API instance.
 * @param {String} collectionName The name of the collection.
 * @param {Object} options The options object.
 */
NodeApiCollection.prototype.init = function (api, collectionName, options) {
	var self = this;
	self._api = api;
	self._name = collectionName;
	self._options = options;
	self._model = new NodeApiModel();
};

Shared.addModule('NodeApiCollection', NodeApiCollection);

NodeApiCollection.prototype.insert = new Overload({
	'object, function': function (obj, callback) {
		this.$main.call(this, obj, {}, callback);
	},

	'object, object, function': function (obj, options, callback) {
		this.$main.call(this, obj, options, callback);
	},

	'$main': function (obj, options, callback) {

	}
});

Shared.finishModule('NodeApiCollection');

module.exports = NodeApiCollection;