// Import external names locally
var Shared,
	Core,
	CoreInit,
	Collection,
	Overload;

Shared = require('./Shared');

var Overview = function () {
	this.init.apply(this, arguments);
};

Overview.prototype.init = function (name) {
	var self = this;

	this._name = name;
	this._data = new Collection();
	this._reducedData = {};
	this._collections = [];
};

Shared.addModule('Overview', Overview);
Shared.inherit(Overview.prototype, Shared.chainSystem);

Collection = require('./Collection');
Overload = require('./Overload');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

Overview.prototype.from = function (collection) {
	if (collection !== undefined) {
		if (typeof(collection) === 'string') {
			collection = this._db.collection(collection);
		}

		this._addCollection(collection);
	}

	return this;
};

Overview.prototype.find = function () {
	for (var i = 0; i < this._collections.length; i++) {
		this._collections[i][type].apply(this._collections[i], args);
	}
};

Overview.prototype._addCollection = function (collection) {
	if (this._collections.indexOf(collection) === -1) {
		this._collections.push(collection);
		collection.chain(this);

		this._refresh();
	}
	return this;
};

Overview.prototype._removeCollection = function (collection) {
	var collectionIndex = this._collections.indexOf(collection);
	if (collectionIndex > -1) {
		this._collections.splice(collection, 1);
		collection.unChain(this);
		this._refresh();
	}

	return this;
};

Overview.prototype._refresh = function () {
	var collData = this.find(this._querySettings.query, this._querySettings.options);
};

Overview.prototype._chainHandler = function (sender, type, data, options) {
	switch (type) {
		case 'setData':
		case 'insert':
		case 'update':
		case 'remove':
			this._data.remove(data.query, options);
			break;

		default:
			break;
	}
};

/**
 * Creates a link to the DOM between the overview data and the elements
 * in the passed output selector. When new elements are needed or changes
 * occur the passed templateSelector is used to get the template that is
 * output to the DOM.
 * @param outputTargetSelector
 * @param templateSelector
 */
Overview.prototype.link = function (outputTargetSelector, templateSelector) {
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
			if (jQuery(outputTargetSelector).length) {
				// Ensure the template is in memory and if not, try to get it
				if (!jQuery.templates[templateId]) {
					if (!templateHtml) {
						// Grab the template
						var template = jQuery(templateSelector);
						if (template.length) {
							templateHtml = jQuery(template[0]).html();
						} else {
							throw('Unable to bind overview to target because template does not exist: ' + templateSelector);
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
					console.log('ForerunnerDB.Overview: Added binding overview "' + this.name() + '" to output target: ' + outputTargetSelector);
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
 * Removes a link to the DOM between the overview data and the elements
 * in the passed output selector that was created using the link() method.
 * @param outputTargetSelector
 * @param templateSelector
 */
Overview.prototype.unlink = function (outputTargetSelector, templateSelector) {
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
				console.log('ForerunnerDB.Overview: Removed binding overview "' + this.name() + '" to output target: ' + outputTargetSelector);
			}

			return this;
		}

		console.log('Cannot remove link, one does not exist to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
	} else {
		throw('Cannot data-bind without jQuery, please add jQuery to your page!');
	}
};

// Extend DB to include collection groups
Core.prototype.init = function () {
	this._overview = {};
	CoreInit.apply(this, arguments);
};

Core.prototype.overview = function (overviewName) {
	if (overviewName) {
		this._overview[overviewName] = this._overview[overviewName] || new Overview(overviewName).db(this);
		return this._overview[overviewName];
	} else {
		// Return an object of collection data
		return this._overview;
	}
};

module.exports = Overview;