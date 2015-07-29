"use strict";

var Shared,
	Collection,
	Db;

Shared = require('./Shared');

/**
 * Creates a new Document instance. Documents allow you to create individual
 * objects that can have standard ForerunnerDB CRUD operations run against
 * them, as well as data-binding if the AutoBind module is included in your
 * project.
 * @name Document
 * @class Document
 * @constructor
 */
var FdbDocument = function () {
	this.init.apply(this, arguments);
};

FdbDocument.prototype.init = function (name) {
	this._name = name;
	this._data = {};
};

Shared.addModule('Document', FdbDocument);
Shared.mixin(FdbDocument.prototype, 'Mixin.Common');
Shared.mixin(FdbDocument.prototype, 'Mixin.Events');
Shared.mixin(FdbDocument.prototype, 'Mixin.ChainReactor');
Shared.mixin(FdbDocument.prototype, 'Mixin.Constants');
Shared.mixin(FdbDocument.prototype, 'Mixin.Triggers');
//Shared.mixin(FdbDocument.prototype, 'Mixin.Updating');

Collection = require('./Collection');
Db = Shared.modules.Db;

/**
 * Gets / sets the current state.
 * @func state
 * @memberof Document
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(FdbDocument.prototype, 'state');

/**
 * Gets / sets the db instance this class instance belongs to.
 * @func db
 * @memberof Document
 * @param {Db=} db The db instance.
 * @returns {*}
 */
Shared.synthesize(FdbDocument.prototype, 'db');

/**
 * Gets / sets the document name.
 * @func name
 * @memberof Document
 * @param {String=} val The name to assign
 * @returns {*}
 */
Shared.synthesize(FdbDocument.prototype, 'name');

/**
 * Sets the data for the document.
 * @func setData
 * @memberof Document
 * @param data
 * @param options
 * @returns {Document}
 */
FdbDocument.prototype.setData = function (data, options) {
	var i,
		$unset;

	if (data) {
		options = options || {
			$decouple: true
		};

		if (options && options.$decouple === true) {
			data = this.decouple(data);
		}

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
 * Gets the document's data returned as a single object.
 * @func find
 * @memberof Document
 * @param {Object} query The query object - currently unused, just
 * provide a blank object e.g. {}
 * @param {Object=} options An options object.
 * @returns {Object} The document's data object.
 */
FdbDocument.prototype.find = function (query, options) {
	var result;

	if (options && options.$decouple === false) {
		result = this._data;
	} else {
		result = this.decouple(this._data);
	}

	return result;
};

/**
 * Modifies the document. This will update the document with the data held in 'update'.
 * @func update
 * @memberof Document
 * @param {Object} query The query that must be matched for a document to be
 * operated on.
 * @param {Object} update The object containing updated key/values. Any keys that
 * match keys on the existing document will be overwritten with this data. Any
 * keys that do not currently exist on the document will be added to the document.
 * @param {Object=} options An options object.
 * @returns {Array} The items that were updated.
 */
FdbDocument.prototype.update = function (query, update, options) {
	this.updateObject(this._data, update, query, options);
};

/**
 * Internal method for document updating.
 * @func updateObject
 * @memberof Document
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
FdbDocument.prototype.updateObject = Collection.prototype.updateObject;

/**
 * Determines if the passed key has an array positional mark (a dollar at the end
 * of its name).
 * @func _isPositionalKey
 * @memberof Document
 * @param {String} key The key to check.
 * @returns {Boolean} True if it is a positional or false if not.
 * @private
 */
FdbDocument.prototype._isPositionalKey = function (key) {
	return key.substr(key.length - 2, 2) === '.$';
};

/**
 * Updates a property on an object depending on if the collection is
 * currently running data-binding or not.
 * @func _updateProperty
 * @memberof Document
 * @param {Object} doc The object whose property is to be updated.
 * @param {String} prop The property to update.
 * @param {*} val The new value of the property.
 * @private
 */
FdbDocument.prototype._updateProperty = function (doc, prop, val) {
	if (this._linked) {
		window.jQuery.observable(doc).setProperty(prop, val);

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
 * @func _updateIncrement
 * @memberof Document
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to increment by.
 * @private
 */
FdbDocument.prototype._updateIncrement = function (doc, prop, val) {
	if (this._linked) {
		window.jQuery.observable(doc).setProperty(prop, doc[prop] + val);
	} else {
		doc[prop] += val;
	}
};

/**
 * Changes the index of an item in the passed array.
 * @func _updateSpliceMove
 * @memberof Document
 * @param {Array} arr The array to modify.
 * @param {Number} indexFrom The index to move the item from.
 * @param {Number} indexTo The index to move the item to.
 * @private
 */
FdbDocument.prototype._updateSpliceMove = function (arr, indexFrom, indexTo) {
	if (this._linked) {
		window.jQuery.observable(arr).move(indexFrom, indexTo);

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
 * @func _updateSplicePush
 * @memberof Document
 * @param {Array} arr The array to insert into.
 * @param {Number} index The index to insert at.
 * @param {Object} doc The document to insert.
 * @private
 */
FdbDocument.prototype._updateSplicePush = function (arr, index, doc) {
	if (arr.length > index) {
		if (this._linked) {
			window.jQuery.observable(arr).insert(index, doc);
		} else {
			arr.splice(index, 0, doc);
		}
	} else {
		if (this._linked) {
			window.jQuery.observable(arr).insert(doc);
		} else {
			arr.push(doc);
		}
	}
};

/**
 * Inserts an item at the end of an array.
 * @func _updatePush
 * @memberof Document
 * @param {Array} arr The array to insert the item into.
 * @param {Object} doc The document to insert.
 * @private
 */
FdbDocument.prototype._updatePush = function (arr, doc) {
	if (this._linked) {
		window.jQuery.observable(arr).insert(doc);
	} else {
		arr.push(doc);
	}
};

/**
 * Removes an item from the passed array.
 * @func _updatePull
 * @memberof Document
 * @param {Array} arr The array to modify.
 * @param {Number} index The index of the item in the array to remove.
 * @private
 */
FdbDocument.prototype._updatePull = function (arr, index) {
	if (this._linked) {
		window.jQuery.observable(arr).remove(index);
	} else {
		arr.splice(index, 1);
	}
};

/**
 * Multiplies a value for a property on a document by the passed number.
 * @func _updateMultiply
 * @memberof Document
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to modify.
 * @param {Number} val The amount to multiply by.
 * @private
 */
FdbDocument.prototype._updateMultiply = function (doc, prop, val) {
	if (this._linked) {
		window.jQuery.observable(doc).setProperty(prop, doc[prop] * val);
	} else {
		doc[prop] *= val;
	}
};

/**
 * Renames a property on a document to the passed property.
 * @func _updateRename
 * @memberof Document
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to rename.
 * @param {Number} val The new property name.
 * @private
 */
FdbDocument.prototype._updateRename = function (doc, prop, val) {
	var existingVal = doc[prop];
	if (this._linked) {
		window.jQuery.observable(doc).setProperty(val, existingVal);
		window.jQuery.observable(doc).removeProperty(prop);
	} else {
		doc[val] = existingVal;
		delete doc[prop];
	}
};

/**
 * Deletes a property on a document.
 * @func _updateUnset
 * @memberof Document
 * @param {Object} doc The document to modify.
 * @param {String} prop The property to delete.
 * @private
 */
FdbDocument.prototype._updateUnset = function (doc, prop) {
	if (this._linked) {
		window.jQuery.observable(doc).removeProperty(prop);
	} else {
		delete doc[prop];
	}
};

/**
 * Deletes a property on a document.
 * @func _updatePop
 * @memberof Document
 * @param {Object} doc The document to modify.
 * @param {*} val The property to delete.
 * @return {Boolean}
 * @private
 */
FdbDocument.prototype._updatePop = function (doc, val) {
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
				window.jQuery.observable(doc).remove(index);
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

/**
 * Drops the document.
 * @func drop
 * @memberof Document
 * @returns {boolean} True if successful, false if not.
 */
FdbDocument.prototype.drop = function () {
	if (this._state !== 'dropped') {
		if (this._db && this._name) {
			if (this._db && this._db._document && this._db._document[this._name]) {
				this._state = 'dropped';

				delete this._db._document[this._name];
				delete this._data;

				this.emit('drop', this);

				return true;
			}
		}
	} else {
		return true;
	}

	return false;
};

/**
 * Creates a new document instance.
 * @func document
 * @memberof Db
 * @param {String} documentName The name of the document to create.
 * @returns {*}
 */
Db.prototype.document = function (documentName) {
	if (documentName) {
		// Handle being passed an instance
		if (documentName instanceof FdbDocument) {
			if (documentName.state() !== 'droppped') {
				return documentName;
			} else {
				documentName = documentName.name();
			}
		}

		this._document = this._document || {};
		this._document[documentName] = this._document[documentName] || new FdbDocument(documentName).db(this);
		return this._document[documentName];
	} else {
		// Return an object of document data
		return this._document;
	}
};

/**
 * Returns an array of documents the DB currently has.
 * @func documents
 * @memberof Db
 * @returns {Array} An array of objects containing details of each document
 * the database is currently managing.
 */
Db.prototype.documents = function () {
	var arr = [],
		item,
		i;

	for (i in this._document) {
		if (this._document.hasOwnProperty(i)) {
			item = this._document[i];

			arr.push({
				name: i,
				linked: item.isLinked !== undefined ? item.isLinked() : false
			});
		}
	}

	return arr;
};

Shared.finishModule('Document');
module.exports = FdbDocument;