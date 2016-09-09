"use strict";

var Shared,
	Db,
	DbInit,
	Section;

Shared = require('./Shared');

/**
 * The section class.
 * @class
 * @constructor
 */
Section = function () {
	this.init.apply(this, arguments);
};

/**
 * Create a constructor method that is called by the instance on instantiation.
 * This allows the constructor to be overridden by other modules because
 * they can override the init method with their own.
 */
Section.prototype.init = function () {
	//var self = this;
};

// Tell ForerunnerDB about our new module
Shared.addModule('Section', Section);

// Mixin some commonly used methods
Shared.mixin(Section.prototype, 'Mixin.Common');
Shared.mixin(Section.prototype, 'Mixin.ChainReactor');
Shared.mixin(Section.prototype, 'Mixin.Constants');
Shared.mixin(Section.prototype, 'Mixin.Events');

// Grab the collection module for use later
Db = Shared.modules.Db;
DbInit = Db.prototype.init;

Db.prototype.init = function () {
	var self = this;

	self.on('create', function (instance, type, name) {
		self._assignSection.call(self, instance, type, name);
	});

	DbInit.apply(self, arguments);
};

/**
 * Denotes a section has been entered. All instances created
 * after this call will be assigned to this "section".
 */
Db.prototype.sectionEnter = function () {
	this._sectionsEnabled = true;
	this._sectionItems = this._sectionItems || [];
	this._sectionItems.push([]);
};

/**
 * Denotes a section has been left. All instances that were
 * created during the section lifespan will be automatically
 * dropped.
 */
Db.prototype.sectionLeave = function () {
	// Drop all items on the current section
	var itemsArr = this._sectionItems[this._sectionId],
		i;

	if (itemsArr && itemsArr.length) {
		for (i = 0; i < itemsArr.length; i++) {
			if (itemsArr[i].drop) {
				itemsArr[i].drop();
			}
		}
	}

	// Remove the items array from the section items array
	this._sectionItems.pop();

	// Check if there are any section items left and if not,
	// disable sectioning5
	if (!this._sectionItems.length) {
		this._sectionsEnabled = false;
	}
};

/**
 * Assigns a newly created instance to the active section. This method
 * is called by the database from the create event.
 * @param {*} instance The item instance.
 * @param {String} type The type of instance.
 * @param {String} name The name of the instance.
 * @private
 */
Db.prototype._assignSection = function (instance, type, name) {
	var sectionId = this._sectionItems.length - 1;

	instance._sectionId = sectionId;
	this._sectionItems[sectionId].push(instance);
};

// Tell ForerunnerDB that our module has finished loading
Shared.finishModule('Section');
module.exports = Section;