"use strict";

// Import external names locally
var Shared,
	Db,
	Collection,
	DbDocument;

Shared = require('./Shared');

/**
 * The Overview class provides a queryable interface for data aggregation in realtime.
 * @class
 */
var Overview = function () {
	this.init.apply(this, arguments);
};

/**
 * Initialises the overview, called by the class as it is instantiated.
 * @constructor
 */
Overview.prototype.init = function (name) {
	var self = this;

	this._name = name;
	this._data = new DbDocument('__FDB__dc_data_' + this._name);
	this._collData = new Collection();
	this._sources = [];

	this._sourceDroppedWrap = function () {
		self._sourceDropped.apply(self, arguments);
	};
};

Shared.addModule('Overview', Overview);
Shared.mixin(Overview.prototype, 'Mixin.Common');
Shared.mixin(Overview.prototype, 'Mixin.ChainReactor');
Shared.mixin(Overview.prototype, 'Mixin.Constants');
Shared.mixin(Overview.prototype, 'Mixin.Triggers');
Shared.mixin(Overview.prototype, 'Mixin.Events');
Shared.mixin(Overview.prototype, 'Mixin.Tags');

Collection = require('./Collection');
DbDocument = require('./Document');
Db = Shared.modules.Db;

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(Overview.prototype, 'state');

/**
 * Gets / sets the db.
 * @param {Db=} val The db to set.
 * @returns {*}
 */
Shared.synthesize(Overview.prototype, 'db');

/**
 * Gets / sets the name.
 * @param {String=} val The name to set.
 * @returns {*}
 */
Shared.synthesize(Overview.prototype, 'name');

/**
 * Gets / sets the query.
 * @param {Object=} val The query to set.
 * @returns {*}
 */
Shared.synthesize(Overview.prototype, 'query', function (val) {
	var ret = this.$super(val);

	if (val !== undefined) {
		this._refresh();
	}

	return ret;
});

/**
 * Gets / sets the query options.
 * @param {Object=} val The query options to set.
 * @returns {*}
 */
Shared.synthesize(Overview.prototype, 'queryOptions', function (val) {
	var ret = this.$super(val);

	if (val !== undefined) {
		this._refresh();
	}

	return ret;
});

/**
 * Gets / sets the reduce object.
 * @param {Object=} val The reduce object to set.
 * @returns {*}
 */
Shared.synthesize(Overview.prototype, 'reduce', function (val) {
	var ret = this.$super(val);

	if (val !== undefined) {
		this._refresh();
	}

	return ret;
});

/**
 * Gets / sets the data source the overview uses for underlying data.
 * @param {Collection|View=} source The data source to set.
 * @returns {*}
 */
Overview.prototype.from = function (source) {
	if (source !== undefined) {
		if (typeof(source) === 'string') {
			source = this._db.collection(source);
		}

		this._setFrom(source);
		return this;
	}

	return this._sources;
};

/**
 * Returns the data in the overview.
 * @param {Object=} query The query object.
 * @param {Object=} options An options object.
 * @param {Function=} callback A callback method.
 * @returns {*}
 * @see Collection.find()
 */
Overview.prototype.find = function (query, options, callback) {
	return this._collData.find.apply(this._collData, arguments);
};

/**
 * Executes and returns the response from the current reduce method
 * assigned to the overview.
 * @returns {*}
 */
Overview.prototype.exec = function () {
	var reduceFunc = this.reduce();

	return reduceFunc ? reduceFunc.apply(this) : undefined;
};

/**
 * Returns a count of the documents in the overview data set.
 * @returns {*}
 */
Overview.prototype.count = function () {
	return this._collData.count.apply(this._collData, arguments);
};

Overview.prototype._setFrom = function (source) {
	// Remove all source references
	while (this._sources.length) {
		this._removeSource(this._sources[0]);
	}

	this._addSource(source);

	return this;
};

Overview.prototype._addSource = function (source) {
	if (source && source.className === 'View') {
		// The source is a view so IO to the internal data collection
		// instead of the view proper
		source = source.data();
		if (this.debug()) {
			console.log(this.logIdentifier() + ' Using internal private data "' + source.instanceIdentifier() + '" for IO graph linking');
		}
	}

	if (this._sources.indexOf(source) === -1) {
		this._sources.push(source);
		source.chain(this);

		source.on('drop', this._sourceDroppedWrap);

		this._refresh();
	}
	return this;
};

Overview.prototype._removeSource = function (source) {
	if (source && source.className === 'View') {
		// The source is a view so IO to the internal data collection
		// instead of the view proper
		source = source.data();
		if (this.debug()) {
			console.log(this.logIdentifier() + ' Using internal private data "' + source.instanceIdentifier() + '" for IO graph linking');
		}
	}

	var sourceIndex = this._sources.indexOf(source);

	if (sourceIndex > -1) {
		this._sources.splice(source, 1);
		source.unChain(this);

		source.off('drop', this._sourceDroppedWrap);

		this._refresh();
	}

	return this;
};

Overview.prototype._sourceDropped = function (source) {
	if (source) {
		// Source was dropped, remove from overview
		this._removeSource(source);
	}
};

Overview.prototype._refresh = function () {
	if (!this.isDropped()) {
		if (this._sources && this._sources[0]) {
			this._collData.primaryKey(this._sources[0].primaryKey());
			var tempArr = [],
				i;

			for (i = 0; i < this._sources.length; i++) {
				tempArr = tempArr.concat(this._sources[i].find(this._query, this._queryOptions));
			}

			this._collData.setData(tempArr);
		}

		// Now execute the reduce method
		if (this._reduce) {
			var reducedData = this._reduce.apply(this);

			// Update the document with the newly returned data
			this._data.setData(reducedData);
		}
	}
};

Overview.prototype._chainHandler = function (chainPacket) {
	switch (chainPacket.type) {
		case 'setData':
		case 'insert':
		case 'update':
		case 'remove':
			this._refresh();
			break;

		default:
			break;
	}
};

/**
 * Gets the module's internal data collection.
 * @returns {Collection}
 */
Overview.prototype.data = function () {
	return this._data;
};

/**
 * Drops the overview.
 * @param {Function=} callback A callback function.
 * @returns {Boolean}
 */
Overview.prototype.drop = function (callback) {
	if (!this.isDropped()) {
		this._state = 'dropped';

		delete this._data;
		delete this._collData;

		// Remove all source references
		while (this._sources.length) {
			this._removeSource(this._sources[0]);
		}

		delete this._sources;

		if (this._db && this._name) {
			delete this._db._overview[this._name];
		}

		this.emit('drop', this);

		if (callback) { callback(false, true); }

		delete this._listeners;
	}

	return true;
};

/**
 * Create an overview instance from a Db instance.
 * @param {String} name The name of the overview.
 * @returns {*}
 */
Db.prototype.overview = function (name) {
	var self = this;

	if (name) {
		// Handle being passed an instance
		if (name instanceof Overview) {
			return name;
		}

		if (this._overview && this._overview[name]) {
			return this._overview[name];
		}

		this._overview = this._overview || {};
		this._overview[name] = new Overview(name).db(this);

		self.deferEmit('create', self._overview[name], 'overview', name);

		return this._overview[name];
	} else {
		// Return an object of collection data
		return this._overview || {};
	}
};

/**
 * Returns an array of overviews the DB currently has.
 * @returns {Array} An array of objects containing details of each overview
 * the database is currently managing.
 */
Db.prototype.overviews = function () {
	var arr = [],
		item,
		i;

	for (i in this._overview) {
		if (this._overview.hasOwnProperty(i)) {
			item = this._overview[i];

			arr.push({
				name: i,
				count: item.count(),
				linked: item.isLinked !== undefined ? item.isLinked() : false
			});
		}
	}

	return arr;
};

Shared.finishModule('Overview');
module.exports = Overview;