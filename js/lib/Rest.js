"use strict";

var Shared = require('./Shared'),
	RestClient = require('rest'),
	mime = require('rest/interceptor/mime'),
	Db,
	Collection,
	CollectionDrop,
	CollectionGroup,
	CollectionInit,
	DbInit,
	Overload;

var Rest = function () {
	this.init.apply(this, arguments);
};

Rest.prototype.init = function (db) {
	this._endPoint = '';
	this._client = RestClient.wrap(mime);
};

/**
 * Convert a JSON object to url query parameter format.
 * @param {Object} obj The object to convert.
 * @returns {String}
 * @private
 */
Rest.prototype._params = function (obj) {
	var parts = [];

	for (var key in obj) {
		if (obj.hasOwnProperty(key)) {
			parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
		}
	}

	return parts.join('&');
};

Rest.prototype.get = function (path, data, callback) {
	var self= this,
		coll;

	path = path !== undefined ? path : "";

	//console.log('Getting: ', this.endPoint() + path + '?' + this._params(data));
	this._client({
		method: 'get',
		path: this.endPoint() + path,
		params: data
	}).then(function (response) {
		if (response.entity && response.entity.error) {
			if (callback) { callback(response.entity.error, response.entity, response); }
		} else {
			// Check if we have a collection
			coll = self.collection();

			if (coll) {
				// Upsert the records into the collection
				coll.upsert(response.entity);
			}

			if (callback) { callback(false, response.entity, response); }
		}
	}, function(response) {
		if (callback) { callback(true, response.entity, response); }
	});
};

Rest.prototype.post = function (path, data, callback) {
	this._client({
		method: 'post',
		path: this.endPoint() + path,
		entity: data,
		headers: {
			'Content-Type': 'application/json'
		}
	}).then(function (response) {
		if (response.entity && response.entity.error) {
			if (callback) { callback(response.entity.error, response.entity, response); }
		} else {
			if (callback) { callback(false, response.entity, response); }
		}
	}, function(response) {
		if (callback) { callback(true, response); }
	});
};

Shared.synthesize(Rest.prototype, 'sessionData');
Shared.synthesize(Rest.prototype, 'endPoint');
Shared.synthesize(Rest.prototype, 'collection');

Shared.addModule('Rest', Rest);
Shared.mixin(Rest.prototype, 'Mixin.ChainReactor');

Db = Shared.modules.Db;
Collection = require('./Collection');
CollectionDrop = Collection.prototype.drop;
CollectionGroup = require('./CollectionGroup');
CollectionInit = Collection.prototype.init;
DbInit = Db.prototype.init;
Overload = Shared.overload;

Collection.prototype.init = function () {
	this.rest = new Rest();
	this.rest.collection(this);
	CollectionInit.apply(this, arguments);
};

Db.prototype.init = function () {
	this.rest = new Rest();
	DbInit.apply(this, arguments);
};

Shared.finishModule('Rest');
module.exports = Rest;