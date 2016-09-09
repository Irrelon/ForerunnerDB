"use strict";

/*
 * This is a skeleton module definition that you can use as a springboard to
 * develop new modules easily. It includes registering the module with
 * ForerunnerDB and shows how to use common helper methods such as mixins
 * and method synthesis, as well as providing a pattern to allow the constructor
 * method to be overridden by other modules.
 */

var Shared,
	Collection,
	MyModule;

Shared = require('./Shared');

/**
 * Create a constructor method that calls the instance's init method.
 * This allows the constructor to be overridden by other modules because
 * they can override the init method with their own.
 * @class
 * @constructor
 */
MyModule = function () {
	this.init.apply(this, arguments);
};

MyModule.prototype.init = function () {
	//var self = this;
};

// Tell ForerunnerDB about our new module
Shared.addModule('MyModule', MyModule);

// Mixin some commonly used methods
Shared.mixin(MyModule.prototype, 'Mixin.Common');
Shared.mixin(MyModule.prototype, 'Mixin.ChainReactor');
Shared.mixin(MyModule.prototype, 'Mixin.Constants');
Shared.mixin(MyModule.prototype, 'Mixin.Events');

// Grab the collection module for use later
Collection = Shared.modules.Collection;

// Synthesize the getter/setter method "name()"
Shared.synthesize(MyModule.prototype, 'name');

// Add a new method to the Collection module
Collection.prototype.myNewCollectionMethod = function () {

};

// Tell ForerunnerDB that our module has finished loading
Shared.finishModule('MyModule');
module.exports = MyModule;