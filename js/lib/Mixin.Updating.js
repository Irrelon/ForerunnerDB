"use strict";

/**
 * Provides methods to handle object update operations.
 * @mixin
 */
var Updating = {
	/**
	 * Updates a property on an object.
	 * @param {Object} doc The object whose property is to be updated.
	 * @param {String} prop The property to update.
	 * @param {*} val The new value of the property.
	 * @private
	 */
	_updateProperty: function (doc, prop, val) {
		doc[prop] = val;

		if (this.debug()) {
			console.log(this.logIdentifier() + ' Setting non-data-bound document property "' + prop + '" to val "' + val + '"');
		}
	},

	/**
	 * Increments a value for a property on a document by the passed number.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to modify.
	 * @param {Number} val The amount to increment by.
	 * @private
	 */
	_updateIncrement: function (doc, prop, val) {
		doc[prop] += val;
	},

	/**
	 * Changes the index of an item in the passed array.
	 * @param {Array} arr The array to modify.
	 * @param {Number} indexFrom The index to move the item from.
	 * @param {Number} indexTo The index to move the item to.
	 * @private
	 */
	_updateSpliceMove: function (arr, indexFrom, indexTo) {
		arr.splice(indexTo, 0, arr.splice(indexFrom, 1)[0]);

		if (this.debug()) {
			console.log(this.logIdentifier() + ' Moving non-data-bound document array index from "' + indexFrom + '" to "' + indexTo + '"');
		}
	},

	/**
	 * Inserts an item into the passed array at the specified index.
	 * @param {Array} arr The array to insert into.
	 * @param {Number} index The index to insert at.
	 * @param {Object} doc The document to insert.
	 * @private
	 */
	_updateSplicePush: function (arr, index, doc) {
		if (arr.length > index) {
			arr.splice(index, 0, doc);
		} else {
			arr.push(doc);
		}
	},

	/**
	 * Removes an item from the passed array at the specified index.
	 * @param {Array} arr The array to remove from.
	 * @param {Number} index The index of the item to remove.
	 * @param {Number} count The number of items to remove.
	 * @private
	 */
	_updateSplicePull: function (arr, index, count) {
		if (!count) { count = 1; }
		arr.splice(index, count);
	},

	/**
	 * Inserts an item at the end of an array.
	 * @param {Array} arr The array to insert the item into.
	 * @param {Object} doc The document to insert.
	 * @private
	 */
	_updatePush: function (arr, doc) {
		arr.push(doc);
	},

	/**
	 * Removes an item from the passed array.
	 * @param {Array} arr The array to modify.
	 * @param {Number} index The index of the item in the array to remove.
	 * @private
	 */
	_updatePull: function (arr, index) {
		arr.splice(index, 1);
	},

	/**
	 * Multiplies a value for a property on a document by the passed number.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to modify.
	 * @param {Number} val The amount to multiply by.
	 * @private
	 */
	_updateMultiply: function (doc, prop, val) {
		doc[prop] *= val;
	},

	/**
	 * Renames a property on a document to the passed property.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to rename.
	 * @param {Number} val The new property name.
	 * @private
	 */
	_updateRename: function (doc, prop, val) {
		doc[val] = doc[prop];
		delete doc[prop];
	},

	/**
	 * Sets a property on a document to the passed value.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to set.
	 * @param {*} val The new property value.
	 * @private
	 */
	_updateOverwrite: function (doc, prop, val) {
		doc[prop] = val;
	},

	/**
	 * Deletes a property on a document.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to delete.
	 * @private
	 */
	_updateUnset: function (doc, prop) {
		delete doc[prop];
	},

	/**
	 * Removes all properties from an object without destroying
	 * the object instance, thereby maintaining data-bound linking.
	 * @param {Object} doc The parent object to modify.
	 * @param {String} prop The name of the child object to clear.
	 * @private
	 */
	_updateClear: function (doc, prop) {
		var obj = doc[prop],
			i;

		if (obj && typeof obj === 'object') {
			for (i in obj) {
				if (obj.hasOwnProperty(i)) {
					this._updateUnset(obj, i);
				}
			}
		}
	},

	/**
	 * Pops an item or items from the array stack.
	 * @param {Object} doc The document to modify.
	 * @param {Number} val If set to a positive integer, will pop the number specified
	 * from the stack, if set to a negative integer will shift the number specified
	 * from the stack.
	 * @return {Boolean}
	 * @private
	 */
	_updatePop: function (doc, val) {
		var updated = false,
			i;

		if (doc.length > 0) {
			if (val > 0) {
				for (i = 0; i < val; i++) {
					doc.pop();
				}
				updated = true;
			} else if (val < 0) {
				for (i = 0; i > val; i--) {
					doc.shift();
				}
				updated = true;
			}
		}

		return updated;
	}
};

module.exports = Updating;