var Shared = ForerunnerDB.shared,
	AutoBind = {},
	jsviews;

AutoBind.extendCollection = function (Module) {
	var superInit = Module.prototype.init;

	Module.prototype.init = function () {
		this._linked = 0;
		superInit.apply(this, arguments);
	};

	Module.prototype.isLinked = function () {
		return Boolean(this._linked);
	};

	/**
	 * Creates a link to the DOM between the collection data and the elements
	 * in the passed output selector. When new elements are needed or changes
	 * occur the passed templateSelector is used to get the template that is
	 * output to the DOM.
	 * @param outputTargetSelector
	 * @param templateSelector
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector) {
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
								throw('Unable to bind collection to target because template does not exist: ' + templateSelector);
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
						console.log('ForerunnerDB.Collection: Added binding collection "' + this.name() + '" to output target: ' + outputTargetSelector);
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

		return this;
	};

	/**
	 * Removes a link to the DOM between the collection data and the elements
	 * in the passed output selector that was created using the link() method.
	 * @param outputTargetSelector
	 * @param templateSelector
	 */
	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
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
					console.log('ForerunnerDB.Collection: Removed binding collection "' + this.name() + '" to output target: ' + outputTargetSelector);
				}

				return this;
			}

			console.log('Cannot remove link, one does not exist to the target: ' + outputTargetSelector + ' with the template: ' + templateSelector);
		} else {
			throw('Cannot data-bind without jQuery, please add jQuery to your page!');
		}

		return this;
	};
};

AutoBind.extendView = function (Module) {
	var superInit = Module.prototype.init;

	Module.prototype.init = function () {
		this._linked = 0;
		superInit.apply(this, arguments);
	};

	Module.prototype.isLinked = function () {
		return this.data().isLinked();
	};

	/**
	 * Data-binds the view data to the elements matched by the passed selector.
	 * @param {String} outputTargetSelector The jQuery element selector to select the element
	 * into which the data-bound rendered items will be placed. All existing HTML will be
	 * removed from this element.
	 * @param {String|Object} templateSelector This can either be a jQuery selector identifying
	 * which template element to get the template HTML from that each item in the view's data
	 * will use when rendering to the screen, or you can pass an object with a template key
	 * containing a string that represents the HTML template such as:
	 *     { template: '<div>{{:name}}</div>' }
	 * @returns {*}
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector) {
		var publicData = this.publicData();
		if (this.debug()) {
			console.log('ForerunnerDB.View: Setting up data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
		}

		publicData.link(outputTargetSelector, templateSelector);

		return this;
	};

	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
		var publicData = this.publicData();
		if (this.debug()) {
			console.log('ForerunnerDB.View: Removing data binding on view "' + this.name() + '" in underlying (internal) view collection "' + publicData.name() + '" for output target: ' + outputTargetSelector);
		}

		publicData.unlink(outputTargetSelector, templateSelector);

		return this;
	};
};

AutoBind.extendOverview = function (Module) {
	Module.prototype.isLinked = function () {
		return this.data().isLinked();
	};

	/**
	 * Creates a link to the DOM between the overview data and the elements
	 * in the passed output selector. When new elements are needed or changes
	 * occur the passed templateSelector is used to get the template that is
	 * output to the DOM.
	 * @param outputTargetSelector
	 * @param templateSelector
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector) {
		this._data.link.apply(this._data, arguments);
		this._refresh();
	};

	/**
	 * Removes a link to the DOM between the overview data and the elements
	 * in the passed output selector that was created using the link() method.
	 * @param outputTargetSelector
	 * @param templateSelector
	 */
	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
		this._data.unlink.apply(this._data, arguments);
		this._refresh();
	};
};

AutoBind.extendDocument = function (Module) {
	Module.prototype.isLinked = function () {
		return Boolean(this._linked);
	};

	/**
	 * Creates a link to the DOM between the document data and the elements
	 * in the passed output selector. When new elements are needed or changes
	 * occur the passed templateSelector is used to get the template that is
	 * output to the DOM.
	 * @param outputTargetSelector
	 * @param templateSelector
	 */
	Module.prototype.link = function (outputTargetSelector, templateSelector) {
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
	Module.prototype.unlink = function (outputTargetSelector, templateSelector) {
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
};

// Check that jQuery exists before doing anything else
if (typeof jQuery !== 'undefined') {
	// Load jsViews
	jsviews = require('../lib/vendor/jsviews');

	// Ensure jsviews is registered
	if (typeof jQuery.views !== 'undefined') {
		// Define modules that we wish to work on
		var modules = ['Collection', 'View', 'Overview', 'Document'],
			moduleIndex;

		// Extend modules that are finished loading
		for (moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
			Shared.moduleFinished(modules[moduleIndex], function (name, module) {
				if (AutoBind['extend' + name]) {
					AutoBind['extend' + name](module);
				}
			});
		}
	} else {
		throw('AutoBind plugin cannot continue because jsViews is not loaded - check your error log for url errors.');
	}
} else {
	throw('Cannot use AutoBind plugin without jQuery - please ensure jQuery is loaded first!');
}

module.exports = AutoBind;
