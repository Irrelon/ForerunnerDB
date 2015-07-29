"use strict";

/**
 * Provides data-binding functionality to ForerunnerDB. Allows collections
 * and views to link to selectors and automatically generate DOM elements
 * from jsViews (jsRender) templates.
 * @class AutoBind
 */

var Shared = window.ForerunnerDB.shared,
	AutoBind = {},
	jsviews;

Shared.addModule('AutoBind', AutoBind);

/**
 * Extends the Collection class with new binding capabilities.
 * @extends Collection
 * @param {Collection} Module The Collection class module.
 * @private
 */
AutoBind.extendCollection = function (Module) {
	var superInit = Module.prototype.init,
		superDataReplace = Module.prototype._dataReplace,
		superDataInsertIndex = Module.prototype._dataInsertAtIndex,
		superDataRemoveIndex = Module.prototype._dataRemoveAtIndex,
		superUpdateProperty = Module.prototype._updateProperty,
		superUpdateIncrement = Module.prototype._updateIncrement,
		superUpdateSpliceMove = Module.prototype._updateSpliceMove,
		superUpdateSplicePush = Module.prototype._updateSplicePush,
		superUpdatePush = Module.prototype._updatePush,
		superUpdatePull = Module.prototype._updatePull,
		superUpdateMultiply = Module.prototype._updateMultiply,
		superUpdateRename = Module.prototype._updateRename,
		superUpdateOverwrite = Module.prototype._updateOverwrite,
		superUpdateUnset = Module.prototype._updateUnset,
		superUpdatePop = Module.prototype._updatePop,
		superDrop = Module.prototype.drop;

	Module.prototype.init = function () {
		this._linked = 0;
		superInit.apply(this, arguments);
	};

	/**
	 * Checks if the instance is data-bound to any DOM elements.
	 * @func isLinked
	 * @memberof Collection
	 * @returns {Boolean} True if linked, false if not.
	 */
	Module.prototype.isLinked = function () {
		return Boolean(this._linked);
	};

	/**
	 * Creates a link to the DOM between the collection data and the elements
	 * in the passed output selector. When new elements are needed or changes
	 * occur the passed templateSelector is used to get the template that is
	 * output to the DOM.
	 * @func link
	 * @memberof Collection
	 * @param outputTargetSelector
	 * @param templateSelector
	 * @param {Object=} options Optional extra options.
	 * @see unlink
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector, options) {
		if (window.jQuery) {
			// Make sure we have a data-binding store object to use
			this._links = this._links || {};

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
				if (window.jQuery(outputTargetSelector).length) {
					// Ensure the template is in memory and if not, try to get it
					if (!window.jQuery.templates[templateId]) {
						if (!templateHtml) {
							// Grab the template
							var template = window.jQuery(templateSelector);
							if (template.length) {
								templateHtml = window.jQuery(template[0]).html();
							} else {
								throw('ForerunnerDB.AutoBind "' + this.name() + '": Unable to bind collection to target because template "' + templateSelector + '" does not exist');
							}
						}

						window.jQuery.views.templates(templateId, templateHtml);
					}

					if (options && options.$wrap) {
						var wrapper,
							tmpObj,
							doc;

						if (!options.$wrapIn) {
							// Create the data binding wrapped in an object
							wrapper = {};
							wrapper[options.$wrap] = this._data;
						} else if (options.$wrapIn instanceof window.ForerunnerDB.shared.modules.Document) {
							// Document-based wrapper
							// Grab the document instance
							doc = options.$wrapIn;

							// Get the current data by reference
							tmpObj = doc._data;

							// Set the wrapper property to the referenced data
							// of this collection / view
							tmpObj[options.$wrap] = this._data;

							// Set the data back into the document by reference
							doc.setData(tmpObj, {$decouple: false});

							// Set it to data-bound mode
							doc._linked = 1;

							// Provide the document data as wrapper data
							wrapper = doc._data;
						} else if (typeof options.$wrapIn === 'object') {
							wrapper = options.$wrapIn;
							wrapper[options.$wrap] = this._data;
						} else {
							throw('ForerunnerDB.AutoBind: Unable to use passed $wrapIn option, should be either a ForerunnerDB Document instance or a JavaScript object!');
						}

						if (this.debug()) {
							console.log('ForerunnerDB.AutoBind: Binding with data wrapper "' + options.$wrap + '" for collection "' + this.name() + '" to output target: ' + outputTargetSelector);
						}

						window.jQuery.templates[templateId].link(outputTargetSelector, wrapper);
					} else {
						// Create the data binding
						window.jQuery.templates[templateId].link(outputTargetSelector, this._data);
					}

					// Add link to flags
					this._links[templateId] = outputTargetSelector;

					// Set the linked flag
					this._linked++;

					if (this.debug()) {
						console.log('ForerunnerDB.AutoBind: Added binding collection "' + this.name() + '" to output target: ' + outputTargetSelector);
					}

					return this;
				} else {
					throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot bind collection to target selector "' + outputTargetSelector + '" because it does not exist in the DOM!');
				}
			}

			throw('ForerunnerDB.AutoBind "' + this.name() + '": Attempt to bind a duplicate link from collection to the target: ' + outputTargetSelector + ' with the template: ' + templateId);
		} else {
			throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot data-bind without jQuery. Please add jQuery to your page!');
		}
	};

	/**
	 * Removes a link to the DOM between the collection data and the elements
	 * in the passed output selector that was created using the link() method.
	 * @func unlink
	 * @memberof Collection
	 * @param outputTargetSelector
	 * @param templateSelector
	 */
	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
		if (window.jQuery) {
			var templateId,
				i;

			// Check for binding
			this._links = this._links || {};

			if (outputTargetSelector && templateSelector) {
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
					window.jQuery.templates[templateId].unlink(outputTargetSelector);

					// Remove link from flags
					delete this._links[templateId];

					// Set the linked flag
					this._linked--;

					if (this.debug()) {
						console.log('ForerunnerDB.AutoBind: Removed binding collection "' + this.name() + '" to output target: ' + outputTargetSelector);
					}

					return this;
				}

				if (this.debug()) {
					console.log('ForerunnerDB.AutoBind "' + this.name() + '": Cannot remove link from collection, one does not exist to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
				}
			} else {
				// No parameters passed, unlink all from this module
				for (i in this._links) {
					if (this._links.hasOwnProperty(i)) {
						window.jQuery.templates[i].unlink(this._links[i]);

						if (this.debug()) {
							console.log('ForerunnerDB.AutoBind: Removed binding collection "' + this.name() + '" to output target: ' + this._links[i]);
						}
					}
				}

				this._links = {};
				this._linked = 0;
			}
		} else {
			throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot data-bind without jQuery. Please add jQuery to your page!');
		}

		return this;
	};

	/**
	 * Get the data-bound links this module is using.
	 * @returns {*}
	 */
	Module.prototype.links = function () {
		return this._links;
	};

	Module.prototype._dataReplace = function (data) {
		if (this._linked) {
			// Remove all items
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Replacing some data in document for collection "' + this.name() + '"');
			}
			window.jQuery.observable(this._data).refresh(data);
		} else {
			superDataReplace.apply(this, arguments);
		}
	};

	Module.prototype._dataInsertAtIndex = function (index, doc) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Inserting some data for collection "' + this.name() + '"');
			}
			window.jQuery.observable(this._data).insert(index, doc);
		} else {
			superDataInsertIndex.apply(this, arguments);
		}
	};

	Module.prototype._dataRemoveAtIndex = function (index) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Removing some data for collection "' + this.name() + '"');
			}
			window.jQuery.observable(this._data).remove(index);
		} else {
			superDataRemoveIndex.apply(this, arguments);
		}
	};

	/**
	 * Updates a property on an object depending on if the collection is
	 * currently running data-binding or not.
	 * @param {Object} doc The object whose property is to be updated.
	 * @param {String} prop The property to update.
	 * @param {*} val The new value of the property.
	 * @private
	 */
	Module.prototype._updateProperty = function (doc, prop, val) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Setting document property "' + prop + '" for collection "' + this.name() + '"');
			}
			window.jQuery.observable(doc).setProperty(prop, val);
		} else {
			superUpdateProperty.apply(this, arguments);
		}
	};

	/**
	 * Increments a value for a property on a document by the passed number.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to modify.
	 * @param {Number} val The amount to increment by.
	 * @private
	 */
	Module.prototype._updateIncrement = function (doc, prop, val) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Incrementing document property "' + prop + '" for collection "' + this.name() + '"');
			}
			window.jQuery.observable(doc).setProperty(prop, doc[prop] + val);
		} else {
			superUpdateIncrement.apply(this, arguments);
		}
	};

	/**
	 * Changes the index of an item in the passed array.
	 * @param {Array} arr The array to modify.
	 * @param {Number} indexFrom The index to move the item from.
	 * @param {Number} indexTo The index to move the item to.
	 * @private
	 */
	Module.prototype._updateSpliceMove = function (arr, indexFrom, indexTo) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Moving document array index from "' + indexFrom + '" to "' + indexTo + '" for collection "' + this.name() + '"');
			}
			window.jQuery.observable(arr).move(indexFrom, indexTo);
		} else {
			superUpdateSpliceMove.apply(this, arguments);
		}
	};

	/**
	 * Inserts an item into the passed array at the specified index.
	 * @param {Array} arr The array to insert into.
	 * @param {Number} index The index to insert at.
	 * @param {Object} doc The document to insert.
	 * @private
	 */
	Module.prototype._updateSplicePush = function (arr, index, doc) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Pushing item into document sub-array for collection "' + this.name() + '"');
			}
			if (arr.length > index) {
				window.jQuery.observable(arr).insert(index, doc);
			} else {
				window.jQuery.observable(arr).insert(doc);
			}
		} else {
			superUpdateSplicePush.apply(this, arguments);
		}
	};

	/**
	 * Inserts an item at the end of an array.
	 * @param {Array} arr The array to insert the item into.
	 * @param {Object} doc The document to insert.
	 * @private
	 */
	Module.prototype._updatePush = function (arr, doc) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Pushing item into document sub-array for collection "' + this.name() + '"');
			}
			window.jQuery.observable(arr).insert(doc);
		} else {
			superUpdatePush.apply(this, arguments);
		}
	};

	/**
	 * Removes an item from the passed array.
	 * @param {Array} arr The array to modify.
	 * @param {Number} index The index of the item in the array to remove.
	 * @private
	 */
	Module.prototype._updatePull = function (arr, index) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Pulling item from document sub-array for collection "' + this.name() + '"');
			}
			window.jQuery.observable(arr).remove(index);
		} else {
			superUpdatePull.apply(this, arguments);
		}
	};

	/**
	 * Multiplies a value for a property on a document by the passed number.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to modify.
	 * @param {Number} val The amount to multiply by.
	 * @private
	 */
	Module.prototype._updateMultiply = function (doc, prop, val) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Multiplying value for collection "' + this.name() + '"');
			}
			window.jQuery.observable(doc).setProperty(prop, doc[prop] * val);
		} else {
			superUpdateMultiply.apply(this, arguments);
		}
	};

	/**
	 * Renames a property on a document to the passed property.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to rename.
	 * @param {Number} val The new property name.
	 * @private
	 */
	Module.prototype._updateRename = function (doc, prop, val) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Renaming property "' + prop + '" to "' + val + '" on document for collection "' + this.name() + '"');
			}
			window.jQuery.observable(doc).setProperty(val, doc[prop]);
			window.jQuery.observable(doc).removeProperty(prop);
		} else {
			superUpdateRename.apply(this, arguments);
		}
	};

	/**
	 * Overwrites a property on a document to the passed value.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to delete.
	 * @param {*} val The new value to set the property to.
	 * @private
	 */
	Module.prototype._updateOverwrite = function (doc, prop, val) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Setting document property "' + prop + '" for collection "' + this.name() + '"');
			}
			window.jQuery.observable(doc).setProperty(prop, val);
		} else {
			superUpdateOverwrite.apply(this, arguments);
		}
	};

	/**
	 * Deletes a property on a document.
	 * @param {Object} doc The document to modify.
	 * @param {String} prop The property to delete.
	 * @private
	 */
	Module.prototype._updateUnset = function (doc, prop) {
		if (this._linked) {
			if (this.debug()) {
				console.log('ForerunnerDB.AutoBind: Removing property "' + prop + '" from document for collection "' + this.name() + '"');
			}
			window.jQuery.observable(doc).removeProperty(prop);
		} else {
			superUpdateUnset.apply(this, arguments);
		}
	};

	/**
	 * Pops an item from the array stack.
	 * @param {Object} doc The document to modify.
	 * @param {Number=} val Optional, if set to 1 will pop, if set to -1 will shift.
	 * @return {Boolean}
	 * @private
	 */
	Module.prototype._updatePop = function (doc, val) {
		var index,
			updated = false;

		if (this._linked) {
			if (doc.length > 0) {
				if (this.debug()) {
					console.log('ForerunnerDB.AutoBind: Popping item from sub-array in document for collection "' + this.name() + '"');
				}

				if (val === 1) {
					index = doc.length - 1;
				} else if (val === -1) {
					index = 0;
				}

				if (index > -1) {
					window.jQuery.observable(doc).remove(index);
					updated = true;
				}
			}
		} else {
			updated = superUpdatePop.apply(this, arguments);
		}

		return updated;
	};

	Module.prototype.drop = function () {
		// Unlink all linked data
		var i;

		if (this._linked) {
			for (i in this._links) {
				if (this._links.hasOwnProperty(i)) {
					this.unlink(this._links[i], i);
				}
			}
		}

		return superDrop.apply(this, arguments);
	};
};

/**
 * Extends the View class with new binding capabilities.
 * @extends View
 * @param {View} Module The View class module.
 * @private
 */
AutoBind.extendView = function (Module) {
	var superInit = Module.prototype.init;

	Module.prototype.init = function () {
		this._linked = 0;
		superInit.apply(this, arguments);
	};

	/**
	 * Checks if the instance is data-bound to any DOM elements.
	 * @func isLinked
	 * @memberof View
	 * @returns {Boolean} True if linked, false if not.
	 */
	Module.prototype.isLinked = function () {
		return this.publicData().isLinked();
	};

	/**
	 * Data-binds the view data to the elements matched by the passed selector.
	 * @func link
	 * @memberof View
	 * @param {String} outputTargetSelector The jQuery element selector to select the element
	 * into which the data-bound rendered items will be placed. All existing HTML will be
	 * removed from this element.
	 * @param {String|Object} templateSelector This can either be a jQuery selector identifying
	 * which template element to get the template HTML from that each item in the view's data
	 * will use when rendering to the screen, or you can pass an object with a template key
	 * containing a string that represents the HTML template such as:
	 *     { template: '<div>{{:name}}</div>' }
	 * @param {Object=} options An options object.wd
	 * @returns {View}
	 * @see unlink
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector, options) {
		var publicData = this.publicData();
		if (this.debug()) {
			console.log('ForerunnerDB.AutoBind: Setting up data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
		}

		publicData.link(outputTargetSelector, templateSelector, options);

		return this;
	};

	/**
	 * Removes a previously set-up data-binding via the link() method.
	 * @func unlink
	 * @memberof View
	 * @param {Selector} outputTargetSelector The jQuery target selector.
	 * @param {Selector} templateSelector The jQuery template selector.
	 * @see link
	 * @returns {View}
	 */
	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
		var publicData = this.publicData();
		if (this.debug()) {
			console.log('ForerunnerDB.AutoBind: Removing data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
		}

		publicData.unlink(outputTargetSelector, templateSelector);

		return this;
	};

	/**
	 * Get the data-bound links this module is using.
	 * @returns {*}
	 */
	Module.prototype.links = function () {
		return this.publicData().links();
	};
};

/**
 * Extends the Overview class with new binding capabilities.
 * @extends Overview
 * @param {Overview} Module The Overview class module.
 * @private
 */
AutoBind.extendOverview = function (Module) {
	/**
	 * Checks if the instance is data-bound to any DOM elements.
	 * @func isLinked
	 * @memberof Overview
	 * @returns {Boolean} True if linked, false if not.
	 */
	Module.prototype.isLinked = function () {
		return this.data().isLinked();
	};

	/**
	 * Creates a link to the DOM between the overview data and the elements
	 * in the passed output selector. When new elements are needed or changes
	 * occur the passed templateSelector is used to get the template that is
	 * output to the DOM.
	 * @func link
	 * @memberof Overview
	 * @param outputTargetSelector
	 * @param templateSelector
	 * @param {Object=} options An options object.
	 * @see unlink
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector, options) {
		this._data.link.apply(this._data, arguments);
		this._refresh();
	};

	/**
	 * Removes a link to the DOM between the overview data and the elements
	 * in the passed output selector that was created using the link() method.
	 * @func unlink
	 * @memberof Overview
	 * @param outputTargetSelector
	 * @param templateSelector
	 * @see link
	 */
	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
		this._data.unlink.apply(this._data, arguments);
		this._refresh();
	};

	/**
	 * Get the data-bound links this module is using.
	 * @returns {*}
	 */
	Module.prototype.links = function () {
		return this._data.links();
	};
};

/**
 * Extends the Document class with new binding capabilities.
 * @extends Document
 * @param {Document} Module The Document class module.
 * @private
 */
AutoBind.extendDocument = function (Module) {
	/**
	 * Checks if the instance is data-bound to any DOM elements.
	 * @func isLinked
	 * @memberof Document
	 * @returns {Boolean} True if linked, false if not.
	 */
	Module.prototype.isLinked = function () {
		return Boolean(this._linked);
	};

	/**
	 * Creates a link to the DOM between the document data and the elements
	 * in the passed output selector. When new elements are needed or changes
	 * occur the passed templateSelector is used to get the template that is
	 * output to the DOM.
	 * @func link
	 * @memberof Document
	 * @param outputTargetSelector
	 * @param templateSelector
	 * @param {Object=} options An options object.
	 * @see unlink
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector, options) {
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
				if (window.jQuery(outputTargetSelector).length) {
					// Ensure the template is in memory and if not, try to get it
					if (!window.jQuery.templates[templateId]) {
						if (!templateHtml) {
							// Grab the template
							var template = window.jQuery(templateSelector);
							if (template.length) {
								templateHtml = window.jQuery(template[0]).html();
							} else {
								throw('ForerunnerDB.AutoBind "' + this.name() + '": Unable to bind document to target because template does not exist: ' + templateSelector);
							}
						}

						window.jQuery.views.templates(templateId, templateHtml);
					}

					if (options && options.$wrap) {
						// Create the data binding wrapped in an object
						var wrapper,
							tmpObj,
							doc;

						if (!options.$wrapIn) {
							// Create the data binding wrapped in an object
							wrapper = {};
							wrapper[options.$wrap] = this._data;
						} else if (options.$wrapIn instanceof Document) {
							// Document-based wrapper
							// Grab the document instance
							doc = options.$wrapIn;

							// Get the current data by reference
							tmpObj = doc._data;

							// Set the wrapper property to the referenced data
							// of this collection / view
							tmpObj[options.$wrap] = this._data;

							// Set the data back into the document by reference
							doc.setData(tmpObj, {$decouple: false});

							// Set it to data-bound mode
							doc._linked = 1;

							// Provide the document data as wrapper data
							wrapper = options.$wrap._data;
						}

						window.jQuery.templates[templateId].link(outputTargetSelector, wrapper);
					} else {
						// Create the data binding
						window.jQuery.templates[templateId].link(outputTargetSelector, this._data);
					}

					// Add link to flags
					this._links[templateId] = outputTargetSelector;

					// Set the linked flag
					this._linked++;

					if (this.debug()) {
						console.log('ForerunnerDB.AutoBind: Added binding document "' + this.name() + '" to target: ' + outputTargetSelector);
					}

					return this;
				} else {
					throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot bind document to target "' + outputTargetSelector + '" because it does not exist in the DOM!');
				}
			}

			throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot create a duplicate link from document to the target: ' + outputTargetSelector + ' with the template: ' + templateId);
		} else {
			throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot data-bind without jQuery. Please add jQuery to your page!');
		}
	};

	/**
	 * Removes a link to the DOM between the document data and the elements
	 * in the passed output selector that was created using the link() method.
	 * @func unlink
	 * @memberof Document
	 * @param outputTargetSelector
	 * @param templateSelector
	 * @see link
	 */
	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
		if (window.jQuery) {
			// Check for binding
			this._links = this._links || {};

			var templateId,
				i;

			if (outputTargetSelector && templateSelector) {
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
					window.jQuery.templates[templateId].unlink(outputTargetSelector);

					// Remove link from flags
					delete this._links[templateId];

					// Set the linked flag
					this._linked--;

					if (this.debug()) {
						console.log('ForerunnerDB.AutoBind "' + this.name() + '": Removed binding document to target: ' + outputTargetSelector);
					}

					return this;
				}

				if (this.debug()) {
					console.log('ForerunnerDB.AutoBind "' + this.name() + '": Cannot remove link from document, one does not exist to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
				}
			} else {
				// No parameters passed, unlink all from this module
				for (i in this._links) {
					if (this._links.hasOwnProperty(i)) {
						window.jQuery.templates[i].unlink(this._links[i]);

						if (this.debug()) {
							console.log('ForerunnerDB.AutoBind: Removed binding document "' + this.name() + '" to output target: ' + this._links[i]);
						}
					}
				}

				this._links = {};
				this._linked = 0;
			}
		} else {
			throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot data-bind without jQuery. Please add jQuery to your page!');
		}
	};

	/**
	 * Get the data-bound links this module is using.
	 * @returns {*}
	 */
	Module.prototype.links = function () {
		return this._links;
	};
};

// Check that jQuery exists before doing anything else
if (typeof window.jQuery !== 'undefined') {
	// Load jsViews
	jsviews = require('../lib/vendor/jsviews');

	// Ensure jsviews is registered
	if (typeof window.jQuery.views !== 'undefined') {
		// Define modules that we wish to work on
		var modules = ['Collection', 'View', 'Overview', 'Document'],
			moduleIndex,
			moduleFinished = function (name, module) {
				if (AutoBind['extend' + name]) {
					AutoBind['extend' + name](module);
				}
			};

		// Extend modules that are finished loading
		for (moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
			Shared.moduleFinished(modules[moduleIndex], moduleFinished);
		}

		Shared.finishModule('AutoBind');
	} else {
		throw('ForerunnerDB.AutoBind : Plugin cannot continue because jsViews is not loaded. Check your error log for url errors; it should have automatically loaded with this plugin.');
	}
} else {
	throw('ForerunnerDB.AutoBind : Cannot data-bind without jQuery. Please add jQuery to your page!');
}

Shared.finishModule('AutoBind');
module.exports = AutoBind;
