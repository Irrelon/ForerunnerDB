"use strict";

// Import external names locally
var Shared,
	Core,
	Collection,
	CollectionGroup,
	View,
	CollectionInit,
	CoreInit,
	ReactorIO;

//Shared = ForerunnerDB.shared;
Shared = require('./Shared');

/*
// As this is a separate module, use the external loader flow
if (typeof jQuery !== 'undefined') {
	// Define modules that we wish to work on (or wait for to load)
	var modules = ['Collection', 'View'],
		loaded = [],
		moduleIndex;

	// Extend modules that are finished loading
	for (moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
		Shared.moduleFinished(modules[moduleIndex], function (name, module) {
			switch (name) {
				case 'Collection':
					Collection = module;
					loaded.push(name);
					break;

				case 'View':
					View = module;
					loaded.push(name);
					break;

				default:
					break;
			}

			if (loaded.length === modules.length) {
				gridInit();
			}
		});
	}

	Shared.finishModule('AutoBind');
} else {
	throw('ForerunnerDB.AutoBind "' + this.name() + '": Cannot data-bind without jQuery. Please add jQuery to your page!');
}
*/

/**
 * The grid constructor.
 * @param {String} selector jQuery selector.
 * @param {Object=} options The options object to apply to the grid.
 * @constructor
 */
var Grid = function (selector, options) {
	this.init.apply(this, arguments);
};

Grid.prototype.init = function (selector, template, options) {
	var self = this;

	this._selector = selector;
	this._template = template;
	this._options = options;
	this._debug = {};
	this._id = this.objectId();

	this._collectionDroppedWrap = function () {
		self._collectionDropped.apply(self, arguments);
	};
};

Shared.addModule('Grid', Grid);
Shared.mixin(Grid.prototype, 'Mixin.Common');
Shared.mixin(Grid.prototype, 'Mixin.ChainReactor');
Shared.mixin(Grid.prototype, 'Mixin.Constants');
Shared.mixin(Grid.prototype, 'Mixin.Triggers');
Shared.mixin(Grid.prototype, 'Mixin.Events');

Collection = require('./Collection');
CollectionGroup = require('./CollectionGroup');
View = require('./View');
ReactorIO = require('./ReactorIO');
CollectionInit = Collection.prototype.init;
Core = Shared.modules.Core;
CoreInit = Core.prototype.init;

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(Grid.prototype, 'state');

Shared.synthesize(Grid.prototype, 'name');

/**
 * Executes an insert against the grid's underlying data-source.
 */
Grid.prototype.insert = function () {
	this._from.insert.apply(this._from, arguments);
};

/**
 * Executes an update against the grid's underlying data-source.
 */
Grid.prototype.update = function () {
	this._from.update.apply(this._from, arguments);
};

/**
 * Executes an updateById against the grid's underlying data-source.
 */
Grid.prototype.updateById = function () {
	this._from.updateById.apply(this._from, arguments);
};

/**
 * Executes a remove against the grid's underlying data-source.
 */
Grid.prototype.remove = function () {
	this._from.remove.apply(this._from, arguments);
};

/**
 * Sets the collection from which the grid will assemble its data.
 * @param {Collection} collection The collection to use to assemble grid data.
 * @returns {Grid}
 */
Grid.prototype.from = function (collection) {
	//var self = this;

	if (collection !== undefined) {
		// Check if we have an existing from
		if (this._from) {
			// Remove the listener to the drop event
			this._from.off('drop', this._collectionDroppedWrap);
			this._from._removeGrid(this);
		}

		if (typeof(collection) === 'string') {
			collection = this._db.collection(collection);
		}

		this._from = collection;
		this.refresh();
	}

	return this;
};

/**
 * Gets / sets the DB the grid is bound against.
 * @param db
 * @returns {*}
 */
Grid.prototype.db = function (db) {
	if (db !== undefined) {
		this._db = db;
		return this;
	}

	return this._db;
};

Grid.prototype._collectionDropped = function (collection) {
	if (collection) {
		// Collection was dropped, remove from grid
		delete this._from;
	}
};

/**
 * Drops a grid and all it's stored data from the database.
 * @returns {boolean} True on success, false on failure.
 */
Grid.prototype.drop = function () {
	if (this._state !== 'dropped') {
		if (this._from) {
			// Remove data-binding
			this._from.unlink(this._selector, this.template());

			// Kill listeners and references
			this._from.off('drop', this._collectionDroppedWrap);
			this._from._removeGrid(this);

			if (this.debug() || (this._db && this._db.debug())) {
				console.log('ForerunnerDB.Grid: Dropping grid ' + this._selector);
			}

			this._state = 'dropped';

			if (this._db && this._selector) {
				delete this._db._grid[this._selector];
			}

			this.emit('drop', this);

			delete this._selector;
			delete this._template;
			delete this._from;
			delete this._db;

			return true;
		}
	} else {
		return true;
	}

	return false;
};

Grid.prototype.template = function (template) {
	if (template !== undefined) {
		this._template = template;
		return this;
	}

	return this._template;
};

Grid.prototype._sortGridClick = function (e) {
	var sortColText = window.jQuery(e.currentTarget).attr('data-grid-sort') || '',
		sortCols = sortColText.split(','),
		sortObj = {},
		i;

	for (i = 0; i < sortCols.length; i++) {
		sortObj[sortCols] = 1;
	}

	this._from.orderBy(sortObj);
	this.emit('sort', sortObj);
};

/**
 * Refreshes the grid data such as ordering etc.
 */
Grid.prototype.refresh = function () {
	if (this._from) {
		if (this._from.link) {
			var self = this,
				elem = window.jQuery(this._selector),
				clickListener = function () {
					self._sortGridClick.apply(self, arguments);
				};

			// Clear the container
			elem.html('');

			if (self._from.orderBy) {
				// Remove listeners
				elem.off('click', '[data-grid-sort]', clickListener);
			}

			if (self._from.query) {
				// Remove listeners
				elem.off('click', '[data-grid-filter]', clickListener);
			}

			// Auto-bind the data to the grid template
			self._from.link(self._selector, self.template(), {
				wrap: 'gridRow'
			});

			// Check if the data source (collection or view) has an
			// orderBy method (usually only views) and if so activate
			// the sorting system
			if (self._from.orderBy) {
				// Listen for sort requests
				elem.on('click', '[data-grid-sort]', clickListener);
			}

			if (self._from.query) {
				// Listen for filter requests
				elem.find('[data-grid-filter]').each(function (index, filterElem) {
					filterElem = window.jQuery(filterElem);

					var filterField = filterElem.attr('data-grid-filter'),
						filterObj = {},
						title = filterElem.html(),
						dropDown,
						template,
						filterView = self._db.view('tmpGridFilter_' + self._id + '_' + filterField);

					filterObj[filterField] = 1;

					filterView
						.query({
							$distinct: filterObj
						})
						.orderBy(filterObj)
						.from(self._from);

					template = [
						'<div class="dropdown" id="' + self._id + '_' + filterField + '">',
						'<button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">',
						title + ' <span class="caret"></span>',
						'</button>',
						'<ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">',
						'</ul>',
						'</div>'
					];

					dropDown = window.jQuery(template.join(''));
					filterElem.html(dropDown);

					// Data-link the underlying data to the grid filter drop-down
					filterView.link(dropDown.find('ul'), {
						template: '{^{for options}}<li role="presentation"><a role="menuitem" tabindex="-1" href="#" data-val="{{:' + filterField + '}}">{^{if active}}<span class="glyphicons glyphicons-tick"></span> {{/if}}{{:' + filterField + '}}</a></li>{{/for}}'
					}, {
						wrap: 'options'
					});

					elem.on('click', '#' + self._id + '_' + filterField + ' ul.dropdown-menu li>a', function (e) {
						e.preventDefault();
						var queryObj = {};

						queryObj[filterField] = window.jQuery(this).attr('data-val');
						//filterView.update(queryObj, {active: 1});

						self._from.queryAdd(queryObj);
					});
				});
			}
		} else {
			throw('Grid requires the AutoBind module in order to operate!');
		}
	}

	return this;
};

/**
 * Creates a grid and assigns the collection as its data source.
 * @param {String} selector jQuery selector of grid output target.
 * @param {String} template The table template to use when rendering the grid.
 * @param {Object=} options The options object to apply to the grid.
 * @returns {*}
 */
Collection.prototype.grid = View.prototype.grid = function (selector, template, options) {
	if (this._db && this._db._grid ) {
		if (!this._db._grid[selector]) {
			var grid = new Grid(selector, template, options)
				.db(this._db)
				.from(this);

			this._grid = this._grid || [];
			this._grid.push(grid);

			this._db._grid[selector] = grid;

			return grid;
		} else {
			throw('ForerunnerDB.Collection/View "' + this.name() + '": Cannot create a grid using this collection/view because a grid with this name already exists: ' + name);
		}
	}
};

/**
 * Removes a grid safely from the DOM. Must be called when grid is
 * no longer required / is being removed from DOM otherwise references
 * will stick around and cause memory leaks.
 * @param {String} selector jQuery selector of grid output target.
 * @param {String} template The table template to use when rendering the grid.
 * @param {Object=} options The options object to apply to the grid.
 * @returns {*}
 */
Collection.prototype.unGrid = View.prototype.unGrid = function (selector, template, options) {
	if (this._db && this._db._grid ) {
		if (this._db._grid[selector]) {
			var grid = this._db._grid[selector];
			delete this._db._grid[selector];

			return grid.drop();
		} else {
			throw('ForerunnerDB.Collection/View "' + this.name() + '": Cannot remove a grid using this collection/view because a grid with this name does not exist: ' + name);
		}
	}
};

/**
 * Adds a grid to the internal grid lookup.
 * @param {Grid} grid The grid to add.
 * @returns {Collection}
 * @private
 */
Collection.prototype._addGrid = CollectionGroup.prototype._addGrid = View.prototype._addGrid = function (grid) {
	if (grid !== undefined) {
		this._grid = this._grid || [];
		this._grid.push(grid);
	}

	return this;
};

/**
 * Removes a grid from the internal grid lookup.
 * @param {Grid} grid The grid to remove.
 * @returns {Collection}
 * @private
 */
Collection.prototype._removeGrid = CollectionGroup.prototype._removeGrid = View.prototype._removeGrid = function (grid) {
	if (grid !== undefined && this._grid) {
		var index = this._grid.indexOf(grid);
		if (index > -1) {
			this._grid.splice(index, 1);
		}
	}

	return this;
};

// Extend DB with grids init
Core.prototype.init = function () {
	this._grid = {};
	CoreInit.apply(this, arguments);
};

/**
 * Gets a grid by it's name.
 * @param {String} selector The jQuery selector of the grid to retrieve.
 * @param {String} template The table template to use when rendering the grid.
 * @param {Object=} options The options object to apply to the grid.
 * @returns {*}
 */
Core.prototype.grid = function (selector, template, options) {
	if (!this._grid[selector]) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('Core.Grid: Creating grid ' + selector);
		}
	}

	this._grid[selector] = this._grid[selector] || new Grid(selector, template, options).db(this);
	return this._grid[selector];
};

/**
 * Gets a grid by it's name.
 * @param {String} selector The jQuery selector of the grid to retrieve.
 * @param {String} template The table template to use when rendering the grid.
 * @param {Object=} options The options object to apply to the grid.
 * @returns {*}
 */
Core.prototype.unGrid = function (selector, template, options) {
	if (!this._grid[selector]) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('Core.Grid: Creating grid ' + selector);
		}
	}

	this._grid[selector] = this._grid[selector] || new Grid(selector, template, options).db(this);
	return this._grid[selector];
};

/**
 * Determine if a grid with the passed name already exists.
 * @param {String} selector The jQuery selector to bind the grid to.
 * @returns {boolean}
 */
Core.prototype.gridExists = function (selector) {
	return Boolean(this._grid[selector]);
};

/**
 * Returns an array of grids the DB currently has.
 * @returns {Array} An array of objects containing details of each grid
 * the database is currently managing.
 */
Core.prototype.grids = function () {
	var arr = [],
		i;

	for (i in this._grid) {
		if (this._grid.hasOwnProperty(i)) {
			arr.push({
				name: i,
				count: this._grid[i].count()
			});
		}
	}

	return arr;
};

Shared.finishModule('Grid');
module.exports = Grid;