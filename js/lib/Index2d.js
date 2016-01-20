"use strict";

/*
name(string)
id(string)
rebuild(null)
state ?? needed?
match(query, options)
lookup(query, options)
insert(doc)
remove(doc)
primaryKey(string)
collection(collection)
*/

var Shared = require('./Shared'),
	Path = require('./Path'),
	BinaryTree = require('./BinaryTree'),
	GeoHash = require('./GeoHash'),
	sharedPathSolver = new Path(),
	sharedGeoHashSolver = new GeoHash(),
	// GeoHash Distances in Kilometers
	geoHashDistance = [
		5000,
		1250,
		156,
		39.1,
		4.89,
		1.22,
		0.153,
		0.0382,
		0.00477,
		0.00119,
		0.000149,
		0.0000372
	];

/**
 * The index class used to instantiate 2d indexes that the database can
 * use to handle high-performance geospatial queries.
 * @constructor
 */
var Index2d = function () {
	this.init.apply(this, arguments);
};

Index2d.prototype.init = function (keys, options, collection) {
	this._btree = new BinaryTree();
	this._btree.index(keys);
	this._size = 0;
	this._id = this._itemKeyHash(keys, keys);
	this._debug = options && options.debug ? options.debug : false;

	this.unique(options && options.unique ? options.unique : false);

	if (keys !== undefined) {
		this.keys(keys);
	}

	if (collection !== undefined) {
		this.collection(collection);
		this._btree.primaryKey(collection.primaryKey());
	}

	this.name(options && options.name ? options.name : this._id);
	this._btree.debug(this._debug);
};

Shared.addModule('Index2d', Index2d);
Shared.mixin(Index2d.prototype, 'Mixin.Common');
Shared.mixin(Index2d.prototype, 'Mixin.ChainReactor');
Shared.mixin(Index2d.prototype, 'Mixin.Sorting');

Index2d.prototype.id = function () {
	return this._id;
};

Index2d.prototype.state = function () {
	return this._state;
};

Index2d.prototype.size = function () {
	return this._size;
};

Shared.synthesize(Index2d.prototype, 'data');
Shared.synthesize(Index2d.prototype, 'name');
Shared.synthesize(Index2d.prototype, 'collection');
Shared.synthesize(Index2d.prototype, 'type');
Shared.synthesize(Index2d.prototype, 'unique');

Index2d.prototype.keys = function (val) {
	if (val !== undefined) {
		this._keys = val;

		// Count the keys
		this._keyCount = sharedPathSolver.parse(this._keys).length;
		return this;
	}

	return this._keys;
};

Index2d.prototype.rebuild = function () {
	// Do we have a collection?
	if (this._collection) {
		// Get sorted data
		var collection = this._collection.subset({}, {
				$decouple: false,
				$orderBy: this._keys
			}),
			collectionData = collection.find(),
			dataIndex,
			dataCount = collectionData.length;

		// Clear the index data for the index
		this._btree.clear();
		this._size = 0;

		if (this._unique) {
			this._uniqueLookup = {};
		}

		// Loop the collection data
		for (dataIndex = 0; dataIndex < dataCount; dataIndex++) {
			this.insert(collectionData[dataIndex]);
		}
	}

	this._state = {
		name: this._name,
		keys: this._keys,
		indexSize: this._size,
		built: new Date(),
		updated: new Date(),
		ok: true
	};
};

Index2d.prototype.insert = function (dataItem, options) {
	var uniqueFlag = this._unique,
		uniqueHash;

	dataItem = this.decouple(dataItem);

	if (uniqueFlag) {
		uniqueHash = this._itemHash(dataItem, this._keys);
		this._uniqueLookup[uniqueHash] = dataItem;
	}

	// Convert 2d indexed values to geohashes
	var keys = this._btree.keys(),
		pathVal,
		geoHash,
		lng,
		lat,
		i;

	for (i = 0; i < keys.length; i++) {
		pathVal = sharedPathSolver.get(dataItem, keys[i].path);

		if (pathVal instanceof Array) {
			lng = pathVal[0];
			lat = pathVal[1];

			geoHash = sharedGeoHashSolver.encode(lng, lat);

			sharedPathSolver.set(dataItem, keys[i].path, geoHash);
		}
	}

	if (this._btree.insert(dataItem)) {
		this._size++;

		return true;
	}

	return false;
};

Index2d.prototype.remove = function (dataItem, options) {
	var uniqueFlag = this._unique,
		uniqueHash;

	if (uniqueFlag) {
		uniqueHash = this._itemHash(dataItem, this._keys);
		delete this._uniqueLookup[uniqueHash];
	}

	if (this._btree.remove(dataItem)) {
		this._size--;

		return true;
	}

	return false;
};

Index2d.prototype.violation = function (dataItem) {
	// Generate item hash
	var uniqueHash = this._itemHash(dataItem, this._keys);

	// Check if the item breaks the unique constraint
	return Boolean(this._uniqueLookup[uniqueHash]);
};

Index2d.prototype.hashViolation = function (uniqueHash) {
	// Check if the item breaks the unique constraint
	return Boolean(this._uniqueLookup[uniqueHash]);
};

Index2d.prototype.lookup = function (query, options) {
	// Loop the indexed keys and determine if the query has any operators
	// that we want to handle differently from a standard lookup
	var keys = this._btree.keys(),
		pathStr,
		pathVal,
		results,
		i;

	for (i = 0; i < keys.length; i++) {
		pathStr = keys[i].path;
		pathVal = sharedPathSolver.get(query, pathStr);

		if (typeof pathVal === 'object') {
			if (pathVal.$near) {
				results = [];

				// Do a near point lookup
				results = results.concat(this.near(pathStr, pathVal.$near, options));
			}

			if (pathVal.$geoWithin) {
				results = [];

				// Do a geoWithin shape lookup
				results = results.concat(this.geoWithin(pathStr, pathVal.$geoWithin, options));
			}

			return results;
		}
	}

	return this._btree.lookup(query, options);
};

Index2d.prototype.near = function (pathStr, query, options) {
	var self = this,
		geoHash,
		neighbours,
		visited,
		search,
		results,
		finalResults = [],
		precision,
		maxDistanceKm,
		distance,
		distCache,
		latLng,
		pk = this._collection.primaryKey(),
		i;

	// Calculate the required precision to encapsulate the distance
	// TODO: Instead of opting for the "one size larger" than the distance boxes,
	// TODO: we should calculate closest divisible box size as a multiple and then
	// TODO: scan neighbours until we have covered the area otherwise we risk
	// TODO: opening the results up to vastly more information as the box size
	// TODO: increases dramatically between the geohash precisions
	if (query.$distanceUnits === 'km') {
		maxDistanceKm = query.$maxDistance;

		for (i = 0; i < geoHashDistance.length; i++) {
			if (maxDistanceKm > geoHashDistance[i]) {
				precision = i;
				break;
			}
		}

		if (precision === 0) {
			precision = 1;
		}
	} else if (query.$distanceUnits === 'miles') {
		maxDistanceKm = query.$maxDistance * 1.60934;

		for (i = 0; i < geoHashDistance.length; i++) {
			if (maxDistanceKm > geoHashDistance[i]) {
				precision = i;
				break;
			}
		}

		if (precision === 0) {
			precision = 1;
		}
	}

	// Get the lngLat geohash from the query
	geoHash = sharedGeoHashSolver.encode(query.$point[0], query.$point[1], precision);

	// Calculate 9 box geohashes
	neighbours = sharedGeoHashSolver.calculateNeighbours(geoHash, {type: 'array'});

	// Lookup all matching co-ordinates from the btree
	results = [];
	visited = 0;

	for (i = 0; i < 9; i++) {
		search = this._btree.startsWith(pathStr, neighbours[i]);
		visited += search._visited;
		results = results.concat(search);
	}

	// Work with original data
	results = this._collection._primaryIndex.lookup(results);

	if (results.length) {
		distance = {};

		// Loop the results and calculate distance
		for (i = 0; i < results.length; i++) {
			latLng = sharedPathSolver.get(results[i], pathStr);
			distCache = distance[results[i][pk]] = this.distanceBetweenPoints(query.$point[0], query.$point[1], latLng[0], latLng[1]);

			if (distCache <= maxDistanceKm) {
				// Add item inside radius distance
				finalResults.push(results[i]);
			}
		}

		// Sort by distance from center
		finalResults.sort(function (a, b) {
			return self.sortAsc(distance[a[pk]], distance[b[pk]]);
		});
	}

	// Return data
	return finalResults;
};

Index2d.prototype.geoWithin = function (pathStr, query, options) {
	return [];
};

Index2d.prototype.distanceBetweenPoints = function (lat1, lng1, lat2, lng2) {
	var R = 6371; // kilometres
	var lat1Rad = this.toRadians(lat1);
	var lat2Rad = this.toRadians(lat2);
	var lat2MinusLat1Rad = this.toRadians(lat2-lat1);
	var lng2MinusLng1Rad = this.toRadians(lng2-lng1);

	var a = Math.sin(lat2MinusLat1Rad/2) * Math.sin(lat2MinusLat1Rad/2) +
			Math.cos(lat1Rad) * Math.cos(lat2Rad) *
			Math.sin(lng2MinusLng1Rad/2) * Math.sin(lng2MinusLng1Rad/2);

	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	return R * c;
};

Index2d.prototype.toRadians = function (degrees) {
	return degrees * 0.01747722222222;
};

Index2d.prototype.match = function (query, options) {
	// TODO: work out how to represent that this is a better match if the query has $near than
	// TODO: a basic btree index which will not be able to resolve a $near operator
	return this._btree.match(query, options);
};

Index2d.prototype._itemHash = function (item, keys) {
	var path = new Path(),
		pathData,
		hash = '',
		k;

	pathData = path.parse(keys);

	for (k = 0; k < pathData.length; k++) {
		if (hash) { hash += '_'; }
		hash += path.value(item, pathData[k].path).join(':');
	}

	return hash;
};

Index2d.prototype._itemKeyHash = function (item, keys) {
	var path = new Path(),
		pathData,
		hash = '',
		k;

	pathData = path.parse(keys);

	for (k = 0; k < pathData.length; k++) {
		if (hash) { hash += '_'; }
		hash += path.keyValue(item, pathData[k].path);
	}

	return hash;
};

Index2d.prototype._itemHashArr = function (item, keys) {
	var path = new Path(),
		pathData,
		//hash = '',
		hashArr = [],
		valArr,
		i, k, j;

	pathData = path.parse(keys);

	for (k = 0; k < pathData.length; k++) {
		valArr = path.value(item, pathData[k].path);

		for (i = 0; i < valArr.length; i++) {
			if (k === 0) {
				// Setup the initial hash array
				hashArr.push(valArr[i]);
			} else {
				// Loop the hash array and concat the value to it
				for (j = 0; j < hashArr.length; j++) {
					hashArr[j] = hashArr[j] + '_' + valArr[i];
				}
			}
		}
	}

	return hashArr;
};

Shared.finishModule('Index2d');
module.exports = Index2d;