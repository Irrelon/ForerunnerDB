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

/**
 * Create the index.
 * @param {Object} keys The object with the keys that the user wishes the index
 * to operate on.
 * @param {Object} options Can be undefined, if passed is an object with arbitrary
 * options keys and values.
 * @param {Collection} collection The collection the index should be created for.
 */
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

/**
 * Looks up records that match the passed query and options.
 * @param query The query to execute.
 * @param options A query options object.
 * @param {Operation=} op Optional operation instance that allows
 * us to provide operation diagnostics and analytics back to the
 * main calling instance as the process is running.
 * @returns {*}
 */
Index2d.prototype.lookup = function (query, options, op) {
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
				results = results.concat(this.near(pathStr, pathVal.$near, options, op));
			}

			if (pathVal.$geoWithin) {
				results = [];

				// Do a geoWithin shape lookup
				results = results.concat(this.geoWithin(pathStr, pathVal.$geoWithin, options, op));
			}

			return results;
		}
	}

	return this._btree.lookup(query, options);
};

Index2d.prototype.near = function (pathStr, query, options, op) {
	var self = this,
		neighbours,
		visitedCount,
		visitedNodes,
		visitedData,
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
				precision = i + 1;
				break;
			}
		}
	} else if (query.$distanceUnits === 'miles') {
		maxDistanceKm = query.$maxDistance * 1.60934;

		for (i = 0; i < geoHashDistance.length; i++) {
			if (maxDistanceKm > geoHashDistance[i]) {
				precision = i + 1;
				break;
			}
		}
	}

	if (precision === 0) {
		precision = 1;
	}

	// Calculate 9 box geohashes
	if (op) { op.time('index2d.calculateHashArea'); }
	neighbours = sharedGeoHashSolver.calculateHashArrayByRadius(query.$point, maxDistanceKm, precision);
	if (op) { op.time('index2d.calculateHashArea'); }

	if (op) {
		op.data('index2d.near.precision', precision);
		op.data('index2d.near.hashArea', neighbours);
		op.data('index2d.near.maxDistanceKm', maxDistanceKm);
		op.data('index2d.near.centerPointCoords', [query.$point[0], query.$point[1]]);
	}

	// Lookup all matching co-ordinates from the btree
	results = [];
	visitedCount = 0;
	visitedData = {};
	visitedNodes = [];

	if (op) { op.time('index2d.near.getDocsInsideHashArea'); }
	for (i = 0; i < neighbours.length; i++) {
		search = this._btree.startsWith(pathStr, neighbours[i]);
		visitedData[neighbours[i]] = search;
		visitedCount += search._visitedCount;
		visitedNodes = visitedNodes.concat(search._visitedNodes);
		results = results.concat(search);
	}
	if (op) {
		op.time('index2d.near.getDocsInsideHashArea');
		op.data('index2d.near.startsWith', visitedData);
		op.data('index2d.near.visitedTreeNodes', visitedNodes);
	}

	// Work with original data
	if (op) { op.time('index2d.near.lookupDocsById'); }
	results = this._collection._primaryIndex.lookup(results);
	if (op) { op.time('index2d.near.lookupDocsById'); }

	if (query.$distanceField) {
		// Decouple the results before we modify them
		results = this.decouple(results);
	}

	if (results.length) {
		distance = {};

		if (op) { op.time('index2d.near.calculateDistanceFromCenter'); }
		// Loop the results and calculate distance
		for (i = 0; i < results.length; i++) {
			latLng = sharedPathSolver.get(results[i], pathStr);
			distCache = distance[results[i][pk]] = this.distanceBetweenPoints(query.$point[0], query.$point[1], latLng[0], latLng[1]);

			if (distCache <= maxDistanceKm) {
				if (query.$distanceField) {
					// Options specify a field to add the distance data to
					// so add it now
					sharedPathSolver.set(results[i], query.$distanceField, query.$distanceUnits === 'km' ? distCache : Math.round(distCache * 0.621371));
				}

				if (query.$geoHashField) {
					// Options specify a field to add the distance data to
					// so add it now
					sharedPathSolver.set(results[i], query.$geoHashField, sharedGeoHashSolver.encode(latLng[0], latLng[1], precision));
				}

				// Add item as it is inside radius distance
				finalResults.push(results[i]);
			}
		}
		if (op) { op.time('index2d.near.calculateDistanceFromCenter'); }

		// Sort by distance from center
		if (op) { op.time('index2d.near.sortResultsByDistance'); }
		finalResults.sort(function (a, b) {
			return self.sortAsc(distance[a[pk]], distance[b[pk]]);
		});
		if (op) { op.time('index2d.near.sortResultsByDistance'); }
	}

	// Return data
	return finalResults;
};

Index2d.prototype.geoWithin = function (pathStr, query, options) {
	console.log('geoWithin() is currently a prototype method with no actual implementation... it just returns a blank array.');
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

// Register this index on the shared object
Shared.index['2d'] = Index2d;

Shared.finishModule('Index2d');
module.exports = Index2d;