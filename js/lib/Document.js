var Shared,
	Collection,
	Core,
	CoreInit;

Shared = require('./Shared');

var Document = function () {
	this.init.apply(this, arguments);
};

Document.prototype.init = function (name) {
	this._name = name;
	this._data = {};
};

Shared.addModule('Document', Document);
Shared.mixin(Document.prototype, 'Mixin.Common');
Shared.mixin(Document.prototype, 'Mixin.Events');
Shared.mixin(Document.prototype, 'Mixin.ChainReactor');
Shared.mixin(Document.prototype, 'Mixin.Constants');
Shared.mixin(Document.prototype, 'Mixin.Triggers');

Collection = require('./Collection');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(Document.prototype, 'state');

/**
 * Gets / sets the db instance this class instance belongs to.
 * @param {Core=} db The db instance.
 * @returns {*}
 */
Shared.synthesize(Document.prototype, 'db');

/**
 * Gets / sets the document name.
 * @param {String=} val The name to assign
 * @returns {*}
 */
Shared.synthesize(Document.prototype, 'name');

Document.prototype.setData = function (data) {
	var i,
		$unset;

	if (data) {
		data = this.decouple(data);

		if (this._linked) {
			$unset = {};

			// Remove keys that don't exist in the new data from the current object
			for (i in this._data) {
				if (i.substr(0, 6) !== 'jQuery' && this._data.hasOwnProperty(i)) {
					// Check if existing data has key
					if (data[i] === undefined) {
						// Add property name to those to unset
						$unset[i] = 1;
					}
				}
			}

			data.$unset = $unset;

			// Now update the object with new data
			this.updateObject(this._data, data, {});
		} else {
			// Straight data assignment
			this._data = data;
		}
	}

	return this;
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
	this.updateObject(this._data, update, query, options);
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
Document.prototype.updateObject = Collection.prototype.updateObject;

/**
 * Determines if the passed key has an array positional mark (a dollar at the end
 * of its name).
 * @param {String} key The key to check.
 * @returns {Boolean} True if it is a positional or false if not.
 * @private
 */
Document.prototype._isPositionalKey = function (key) {
	return key.substr(key.length - 2, 2) === '.$';
};

/**
 * Updates a property on an object depending on if the collection is
 * currently running data-binding or not.
 * @param {Object} doc The object whose property is to be updated.
 * @param {String} prop The property to update.
 * @param {*} val The new value of the property.
 * @private
 */
Document.prototype._updateProperty = function (doc, prop, val) {
	if (this._linked) {
		jQuery.observable(doc).setProperty(prop, val);

		if (this.debug()) {
			console.log('ForerunnerDB.Document: Setting data-bound document property "' + prop + '" for collection "' + this.name() + '"');
		}
	} else {
		doc[prop] = val;

		if (this.debug()) {
			console.log('ForerunnerDB.Document: Setting non-data-bound document property "' + prop + '" for collection "' + this.name() + '"');
		}
	}
};

/**
 * Increments a value for a property on a document by the passed number.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to increment by.
 * @private
 */
Document.prototype._updateIncrement = function (doc, prop, val) {
	if (this._linked) {
		jQuery.observable(doc).setProperty(prop, doc[prop] + val);
	} else {
		doc[prop] += val;
	}
};

/**
 * Changes the index of an item in the passed array.
 * @param {Array} arr The array to modify.
 * @param {Number} indexFrom The index to move the item from.
 * @param {Number} indexTo The index to move the item to.
 * @private
 */
Document.prototype._updateSpliceMove = function (arr, indexFrom, indexTo) {
	if (this._linked) {
		jQuery.observable(arr).move(indexFrom, indexTo);

		if (this.debug()) {
			console.log('ForerunnerDB.Document: Moving data-bound document array index from "' + indexFrom + '" to "' + indexTo + '" for collection "' + this.name() + '"');
		}
	} else {
		arr.splice(indexTo, 0, arr.splice(indexFrom, 1)[0]);

		if (this.debug()) {
			console.log('ForerunnerDB.Document: Moving non-data-bound document array index from "' + indexFrom + '" to "' + indexTo + '" for collection "' + this.name() + '"');
		}
	}
};

/**
 * Inserts an item into the passed array at the specified index.
 * @param {Array} arr The array to insert into.
 * @param {Number} index The index to insert at.
 * @param {Object} doc The document to insert.
 * @private
 */
Document.prototype._updateSplicePush = function (arr, index, doc) {
	if (arr.length > index) {
		if (this._linked) {
			jQuery.observable(arr).insert(index, doc);
		} else {
			arr.splice(index, 0, doc);
		}
	} else {
		if (this._linked) {
			jQuery.observable(arr).insert(doc);
		} else {
			arr.push(doc);
		}
	}
};

/**
 * Inserts an item at the end of an array.
 * @param {Array} arr The array to insert the item into.
 * @param {Object} doc The document to insert.
 * @private
 */
Document.prototype._updatePush = function (arr, doc) {
	if (this._linked) {
		jQuery.observable(arr).insert(doc);
	} else {
		arr.push(doc);
	}
};

/**
 * Removes an item from the passed array.
 * @param {Array} arr The array to modify.
 * @param {Number} index The index of the item in the array to remove.
 * @private
 */
Document.prototype._updatePull = function (arr, index) {
	if (this._linked) {
		jQuery.observable(arr).remove(index);
	} else {
		arr.splice(index, 1);
	}
};

/**
 * Multiplies a value for a property on a document by the passed number.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to multiply by.
 * @private
 */
Document.prototype._updateMultiply = function (doc, prop, val) {
	if (this._linked) {
		jQuery.observable(doc).setProperty(prop, doc[prop] * val);
	} else {
		doc[prop] *= val;
	}
};

/**
 * Renames a property on a document to the passed property.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to rename.
 * @param {Number} val The new property name.
 * @private
 */
Document.prototype._updateRename = function (doc, prop, val) {
	var existingVal = doc[prop];
	if (this._linked) {
		jQuery.observable(doc).setProperty(val, existingVal);
		jQuery.observable(doc).removeProperty(prop);
	} else {
		doc[val] = existingVal;
		delete doc[prop];
	}
};

/**
 * Deletes a property on a document.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to delete.
 * @private
 */
Document.prototype._updateUnset = function (doc, prop) {
	if (this._linked) {
		jQuery.observable(doc).removeProperty(prop);
	} else {
		delete doc[prop];
	}
};

/**
 * Deletes a property on a document.
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to delete.
 * @return {Boolean}
 * @private
 */
Document.prototype._updatePop = function (doc, val) {
	var index,
		updated = false;

	if (doc.length > 0) {
		if (this._linked) {
			if (val === 1) {
				index = doc.length - 1;
			} else if (val === -1) {
				index = 0;
			}

			if (index > -1) {
				jQuery.observable(arr).remove(index);
				updated = true;
			}
		} else {
			if (val === 1) {
				doc.pop();
				updated = true;
			} else if (val === -1) {
				doc.shift();
				updated = true;
			}
		}
	}

	return updated;
};

Document.prototype.drop = function () {
	if (this._db && this._name) {
		if (this._db && this._db._document && this._db._document[this._name]) {
			this._state = 'dropped';

			delete this._db._document[this._name];
			delete this._data;
		}
	}
};

// Extend DB to include documents
Core.prototype.init = function () {
	CoreInit.apply(this, arguments);
};

Core.prototype.document = function (documentName) {
	if (documentName) {
		this._document = this._document || {};
		this._document[documentName] = this._document[documentName] || new Document(documentName).db(this);
		return this._document[documentName];
	} else {
		// Return an object of document data
		return this._document;
	}
};

Shared.finishModule('Document');
module.exports = Document;