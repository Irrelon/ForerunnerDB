// geohash.js
// Geohash library for Javascript
// (c) 2008 David Troy
// Distributed under the MIT License
// Original at: https://github.com/davetroy/geohash-js

// Modified by Irrelon Software Limited (http://www.irrelon.com)
// to clean up and modularise the code using Node.js-style exports
// and add a few helper methods.
// @by Rob Evans - rob@irrelon.com
"use strict";

/*
Define some shared constants that will be used by all instances
of the module.
 */
var bits,
	base32,
	neighbors,
	borders;

bits = [16, 8, 4, 2, 1];

base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
neighbors = {
	right: {even: "bc01fg45238967deuvhjyznpkmstqrwx"},
	left: {even: "238967debc01fg45kmstqrwxuvhjyznp"},
	top: {even: "p0r21436x8zb9dcf5h7kjnmqesgutwvy"},
	bottom: {even: "14365h7k9dcfesgujnmqp0r2twvyx8zb"}
};

borders = {
	right: {even: "bcfguvyz"},
	left: {even: "0145hjnp"},
	top: {even: "prxz"},
	bottom: {even: "028b"}
};

neighbors.bottom.odd = neighbors.left.even;
neighbors.top.odd = neighbors.right.even;
neighbors.left.odd = neighbors.bottom.even;
neighbors.right.odd = neighbors.top.even;

borders.bottom.odd = borders.left.even;
borders.top.odd = borders.right.even;
borders.left.odd = borders.bottom.even;
borders.right.odd = borders.top.even;

var GeoHash = function () {};

GeoHash.prototype.refineInterval = function (interval, cd, mask) {
	if (cd & mask) { //jshint ignore: line
		interval[0] = (interval[0] + interval[1]) / 2;
	} else {
		interval[1] = (interval[0] + interval[1]) / 2;
	}
};

/**
 * Calculates all surrounding neighbours of a hash and returns them.
 * @param {String} centerHash The hash at the center of the grid.
 * @param options
 * @returns {*}
 */
GeoHash.prototype.calculateNeighbours = function (centerHash, options) {
	var response;

	if (!options || options.type === 'object') {
		response = {
			center: centerHash,
			left: this.calculateAdjacent(centerHash, 'left'),
			right: this.calculateAdjacent(centerHash, 'right'),
			top: this.calculateAdjacent(centerHash, 'top'),
			bottom: this.calculateAdjacent(centerHash, 'bottom')
		};

		response.topLeft = this.calculateAdjacent(response.left, 'top');
		response.topRight = this.calculateAdjacent(response.right, 'top');
		response.bottomLeft = this.calculateAdjacent(response.left, 'bottom');
		response.bottomRight = this.calculateAdjacent(response.right, 'bottom');
	} else {
		response = [];

		response[4] = centerHash;
		response[3] = this.calculateAdjacent(centerHash, 'left');
		response[5] = this.calculateAdjacent(centerHash, 'right');
		response[1] = this.calculateAdjacent(centerHash, 'top');
		response[7] = this.calculateAdjacent(centerHash, 'bottom');

		response[0] = this.calculateAdjacent(response[3], 'top');
		response[2] = this.calculateAdjacent(response[5], 'top');
		response[6] = this.calculateAdjacent(response[3], 'bottom');
		response[8] = this.calculateAdjacent(response[5], 'bottom');
	}

	return response;
};

/**
 * Calculates an adjacent hash to the hash passed, in the direction
 * specified.
 * @param {String} srcHash The hash to calculate adjacent to.
 * @param {String} dir Either "top", "left", "bottom" or "right".
 * @returns {String} The resulting geohash.
 */
GeoHash.prototype.calculateAdjacent = function (srcHash, dir) {
	srcHash = srcHash.toLowerCase();

	var lastChr = srcHash.charAt(srcHash.length - 1),
		type = (srcHash.length % 2) ? 'odd' : 'even',
		base = srcHash.substring(0, srcHash.length - 1);

	if (borders[dir][type].indexOf(lastChr) !== -1) {
		base = this.calculateAdjacent(base, dir);
	}

	return base + base32[neighbors[dir][type].indexOf(lastChr)];
};

/**
 * Decodes a string geohash back to longitude/latitude.
 * @param {String} geohash The hash to decode.
 * @returns {Object}
 */
GeoHash.prototype.decode = function (geohash) {
	var isEven = 1,
		lat = [],
		lon = [],
		i, c, cd, j, mask,
		latErr,
		lonErr;

	lat[0] = -90.0;
	lat[1] = 90.0;
	lon[0] = -180.0;
	lon[1] = 180.0;

	latErr = 90.0;
	lonErr = 180.0;

	for (i = 0; i < geohash.length; i++) {
		c = geohash[i];
		cd = base32.indexOf(c);

		for (j = 0; j < 5; j++) {
			mask = bits[j];

			if (isEven) {
				lonErr /= 2;
				this.refineInterval(lon, cd, mask);
			} else {
				latErr /= 2;
				this.refineInterval(lat, cd, mask);
			}

			isEven = !isEven;
		}
	}

	lat[2] = (lat[0] + lat[1]) / 2;
	lon[2] = (lon[0] + lon[1]) / 2;

	return {
		latitude: lat,
		longitude: lon
	};
};

/**
 * Encodes a longitude/latitude to geohash string.
 * @param latitude
 * @param longitude
 * @param {Number=} precision Length of the geohash string. Defaults to 12.
 * @returns {String}
 */
GeoHash.prototype.encode = function (latitude, longitude, precision) {
	var isEven = 1,
		mid,
		lat = [],
		lon = [],
		bit = 0,
		ch = 0,
		geoHash = "";

	if (!precision) { precision = 12; }

	lat[0] = -90.0;
	lat[1] = 90.0;
	lon[0] = -180.0;
	lon[1] = 180.0;

	while (geoHash.length < precision) {
		if (isEven) {
			mid = (lon[0] + lon[1]) / 2;

			if (longitude > mid) {
				ch |= bits[bit]; //jshint ignore: line
				lon[0] = mid;
			} else {
				lon[1] = mid;
			}
		} else {
			mid = (lat[0] + lat[1]) / 2;

			if (latitude > mid) {
				ch |= bits[bit]; //jshint ignore: line
				lat[0] = mid;
			} else {
				lat[1] = mid;
			}
		}

		isEven = !isEven;

		if (bit < 4) {
			bit++;
		} else {
			geoHash += base32[ch];
			bit = 0;
			ch = 0;
		}
	}

	return geoHash;
};

module.exports = GeoHash;