"use strict";

/**
 * Provides sorting methods.
 * @mixin
 */
var Sorting = {
	/**
	 * Sorts the passed value a against the passed value b ascending.
	 * @param {*} a The first value to compare.
	 * @param {*} b The second value to compare.
	 * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
	 */
	sortAsc: function mixinSortingSortAsc (a, b) {
		if (typeof(a) === 'string' && typeof(b) === 'string') {
			return a.localeCompare(b);
		} else {
			if (a > b) {
				return 1;
			} else if (a < b) {
				return -1;
			}
		}
		
		if (a === undefined && b !== undefined) {
			return -1;
		}
		
		if (b === undefined && a !== undefined) {
			return 1;
		}

		return 0;
	},

	/**
	 * Sorts the passed value a against the passed value b descending.
	 * @param {*} a The first value to compare.
	 * @param {*} b The second value to compare.
	 * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
	 */
	sortDesc: function mixinSortingSortDesc (a, b) {
		if (typeof(a) === 'string' && typeof(b) === 'string') {
			return b.localeCompare(a);
		} else {
			if (a > b) {
				return -1;
			} else if (a < b) {
				return 1;
			}
		}
		
		if (a === undefined && b !== undefined) {
			return 1;
		}
		
		if (b === undefined && a !== undefined) {
			return -1;
		}

		return 0;
	},
	
	/**
	 * Sorts the passed value a against the passed value b ascending. This variant
	 * of the sortAsc method will not consider undefined values as lower than any
	 * other value.
	 * @param {*} a The first value to compare.
	 * @param {*} b The second value to compare.
	 * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
	 */
	sortAscIgnoreUndefined: function (a, b) {
		if (typeof(a) === 'string' && typeof(b) === 'string') {
			return a.localeCompare(b);
		} else {
			if (a > b) {
				return 1;
			} else if (a < b) {
				return -1;
			}
		}
		
		return 0;
	},
	
	/**
	 * Sorts the passed value a against the passed value b descending. This variant
	 * of the sortDesc method will not consider undefined values as lower than any
	 * other value.
	 * @param {*} a The first value to compare.
	 * @param {*} b The second value to compare.
	 * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
	 */
	sortDescIgnoreUndefined: function (a, b) {
		if (typeof(a) === 'string' && typeof(b) === 'string') {
			return b.localeCompare(a);
		} else {
			if (a > b) {
				return -1;
			} else if (a < b) {
				return 1;
			}
		}
		
		return 0;
	}
};

module.exports = Sorting;