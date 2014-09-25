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
Shared.inherit(Document.prototype, Shared.chainSystem);

Collection = require('./Collection');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

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
			this._updateObject(this._data, data, {});
		} else {
			// Straight data assignment
			this._data = data;
		}
	}

	return this;
};

/**
 * Returns a non-referenced version of the passed object / array.
 * @param {Object} data The object or array to return as a non-referenced version.
 * @returns {*}
 */
Document.prototype.decouple = Shared.common.decouple;

/**
 * Generates a new 16-character hexadecimal unique ID or
 * generates a new 16-character hexadecimal ID based on
 * the passed string. Will always generate the same ID
 * for the same string.
 * @param {String=} str A string to generate the ID from.
 * @return {String}
 */
Document.prototype.objectId = Shared.common.objectId;

Document.prototype.on = Shared.common.on;
Document.prototype.off = Shared.common.off;
Document.prototype.emit = Shared.common.emit;
Document.prototype.debug = Shared.common.debug;

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

/**
 * Creates a link to the DOM between the document data and the elements
 * in the passed output selector. When new elements are needed or changes
 * occur the passed templateSelector is used to get the template that is
 * output to the DOM.
 * @param outputTargetSelector
 * @param templateSelector
 */
Document.prototype.link = function (outputTargetSelector, templateSelector) {
	if (window.jQuery) {
		// Make sure we have a data-binding store object to use
		this._links = this._links || {};
		if (!this._linked) { this._linked = 0; }

		var templateId,
			templateHtml;

		if (templateSelector && typeof templateSelector === 'object') {
			// Our second argument is an object, let's inspect
			if (templateSelector.template && typeof templateSelector.template === 'string') {
				// The template has been given to us as a string
				templateId = this.objectId(templateSelector.template);
				templateHtml = templateSelector.template;
			}
		} else {
			templateId = templateSelector;
		}

		if (!this._links[templateId]) {
			if (jQuery(outputTargetSelector).length) {
				// Ensure the template is in memory and if not, try to get it
				if (!jQuery.templates[templateId]) {
					if (!templateHtml) {
						// Grab the template
						var template = jQuery(templateSelector);
						if (template.length) {
							templateHtml = jQuery(template[0]).html();
						} else {
							throw('Unable to bind document to target because template does not exist: ' + templateSelector);
						}
					}

					jQuery.views.templates(templateId, templateHtml);
				}

				// Create the data binding
				jQuery.templates[templateId].link(outputTargetSelector, this._data);

				// Add link to flags
				this._links[templateId] = outputTargetSelector;

				// Set the linked flag
				this._linked++;

				if (this.debug()) {
					console.log('ForerunnerDB.Document: Added binding document "' + this.name() + '" to output target: ' + outputTargetSelector);
				}

				return this;
			} else {
				throw('Cannot bind view data to output target selector "' + outputTargetSelector + '" because it does not exist in the DOM!');
			}
		}

		throw('Cannot create a duplicate link to the target: ' + outputTargetSelector + ' with the template: ' + templateId);
	} else {
		throw('Cannot data-bind without jQuery, please add jQuery to your page!');
	}
};

/**
 * Removes a link to the DOM between the document data and the elements
 * in the passed output selector that was created using the link() method.
 * @param outputTargetSelector
 * @param templateSelector
 */
Document.prototype.unlink = function (outputTargetSelector, templateSelector) {
	if (window.jQuery) {
		// Check for binding
		this._links = this._links || {};

		var templateId;

		if (templateSelector && typeof templateSelector === 'object') {
			// Our second argument is an object, let's inspect
			if (templateSelector.template && typeof templateSelector.template === 'string') {
				// The template has been given to us as a string
				templateId = this.objectId(templateSelector.template);
			}
		} else {
			templateId = templateSelector;
		}

		if (this._links[templateId]) {
			// Remove the data binding
			jQuery.templates[templateId].unlink(outputTargetSelector);

			// Remove link from flags
			delete this._links[templateId];

			// Set the linked flag
			this._linked--;

			if (this.debug()) {
				console.log('ForerunnerDB.Document: Removed binding document "' + this.name() + '" to output target: ' + outputTargetSelector);
			}

			return this;
		}

		console.log('Cannot remove link, one does not exist to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
	} else {
		throw('Cannot data-bind without jQuery, please add jQuery to your page!');
	}
};

Document.prototype.drop = function () {
	if (this._db && this._name) {
		if (this._db && this._db._document && this._db._document[this._name]) {
			delete this._db._document[this._name];
			this._data = {};
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

module.exports = Document;