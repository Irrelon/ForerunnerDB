var Shared,
	Collection;

Shared = require('./Shared');

var Document = function () {
	this.init.apply(this, arguments);
};

Document.prototype.init = function () {
	this._data = {};
};

Shared.addModule('Document', Document);
Shared.inherit(Document.prototype, Shared.chainSystem);

Collection = require('./Collection');

Document.prototype.setData = function (data) {
	var i;

	if (data) {
		if (this._linked) {
			// Remove keys that don't exist in the new data from the current object
			for (i in this._data) {
				if (this._data.hasOwnProperty(i)) {
					// Check if existing data has key
					if (data[i] === undefined) {
						// Remove the property
						delete this._data;
					}
				}
			}

			// Now update the object with new data
			this._updateObject(this._data, data, {});
		} else {
			// Straight data assignment
			this._data = this.decouple(data);
		}
	}
};

/**
 * Modifies the document. This will update the document with the data held in 'update'.
 *
 * @param {Object} query The query that must be matched for a document to be
 * operated on.
 * @param {Object} update The object containing updated key/values. Any keys that
 * match keys on the existing document will be overwritten with this data. Any
 * keys that do not currently exist on the document will be added to the document.
 * @param {Object=} options An options object.
 * @returns {Array} The items that were updated.
 */
Document.prototype.update = function (query, update, options) {
	this._updateObject(this._data, update, query, options);
};

/**
 * Internal method for document updating.
 * @param {Object} doc The document to update.
 * @param {Object} update The object with key/value pairs to update the document with.
 * @param {Object} query The query object that we need to match to perform an update.
 * @param {Object} options An options object.
 * @param {String} path The current recursive path.
 * @param {String} opType The type of update operation to perform, if none is specified
 * default is to set new data against matching fields.
 * @returns {Boolean} True if the document was updated with new / changed data or
 * false if it was not updated because the data was the same.
 * @private
 */
Document.prototype._updateObject = Collection.prototype._updateObject;

module.exports = Document;