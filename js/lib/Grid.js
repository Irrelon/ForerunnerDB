"use strict";

// Import external names locally
var Shared,
	Db,
	Collection,
	CollectionGroup,
	View,
	CollectionInit,
	DbInit,
	ReactorIO;

//Shared = ForerunnerDB.shared;
Shared = require('./Shared');

/**
 * Creates a new grid instance.
 * @name Grid
 * @class Grid
 * @param {String} selector jQuery selector.
 * @param {String} template The template selector.
 * @param {Object=} options The options object to apply to the grid.
 * @constructor
 */
var Grid = function (selector, template, options) {
	this.init.apply(this, arguments);
};

Grid.prototype.init = function (selector, template, options) {
	var self = this;

	this._selector = selector;
	this._template = template;
	this._options = options || {};
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
Db = Shared.modules.Db;
DbInit = Db.prototype.init;

/**
 * Gets / sets the current state.
 * @func state
 * @memberof Grid
 * @param {String=} val The name of the state to set.
 * @returns {Grid}
 */
Shared.synthesize(Grid.prototype, 'state');

/**
 * Gets / sets the current name.
 * @func name
 * @memberof Grid
 * @param {String=} val The name to set.
 * @returns {Grid}
 */
Shared.synthesize(Grid.prototype, 'name');

/**
 * Executes an insert against the grid's underlying data-source.
 * @func insert
 * @memberof Grid
 */
Grid.prototype.insert = function () {
	this._from.insert.apply(this._from, arguments);
};

/**
 * Executes an update against the grid's underlying data-source.
 * @func update
 * @memberof Grid
 */
Grid.prototype.update = function () {
	this._from.update.apply(this._from, arguments);
};

/**
 * Executes an updateById against the grid's underlying data-source.
 * @func updateById
 * @memberof Grid
 */
Grid.prototype.updateById = function () {
	this._from.updateById.apply(this._from, arguments);
};

/**
 * Executes a remove against the grid's underlying data-source.
 * @func remove
 * @memberof Grid
 */
Grid.prototype.remove = function () {
	this._from.remove.apply(this._from, arguments);
};

/**
 * Sets the collection from which the grid will assemble its data.
 * @func from
 * @memberof Grid
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
		this._from.on('drop', this._collectionDroppedWrap);
		this.refresh();
	}

	return this;
};

/**
 * Gets / sets the DB the grid is bound against.
 * @func db
 * @memberof Grid
 * @param {Db} db
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
 * @func drop
 * @memberof Grid
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

/**
 * Gets / sets the grid's HTML template to use when rendering.
 * @func template
 * @memberof Grid
 * @param {Selector} template The template's jQuery selector.
 * @returns {*}
 */
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
 * @func refresh
 * @memberof Grid
 */
Grid.prototype.refresh = function () {
	if (this._from) {
		if (this._from.link) {
			var self = this,
				elem = window.jQuery(this._selector),
				sortClickListener = function () {
					self._sortGridClick.apply(self, arguments);
				};

			// Clear the container
			elem.html('');

			if (self._from.orderBy) {
				// Remove listeners
				elem.off('click', '[data-grid-sort]', sortClickListener);
			}

			if (self._from.query) {
				// Remove listeners
				elem.off('click', '[data-grid-filter]', sortClickListener );
			}

			// Set wrap name if none is provided
			self._options.$wrap = self._options.$wrap || 'gridRow';

			// Auto-bind the data to the grid template
			self._from.link(self._selector, self.template(), self._options);

			// Check if the data source (collection or view) has an
			// orderBy method (usually only views) and if so activate
			// the sorting system
			if (self._from.orderBy) {
				// Listen for sort requests
				elem.on('click', '[data-grid-sort]', sortClickListener);
			}

			if (self._from.query) {
				// Listen for filter requests
				var queryObj = {};

				elem.find('[data-grid-filter]').each(function (index, filterElem) {
					filterElem = window.jQuery(filterElem);

					var filterField = filterElem.attr('data-grid-filter'),
						filterVarType = filterElem.attr('data-grid-vartype'),
						filterObj = {},
						title = filterElem.html(),
						dropDownButton,
						dropDownMenu,
						template,
						filterQuery,
						filterView = self._db.view('tmpGridFilter_' + self._id + '_' + filterField);

					filterObj[filterField] = 1;

					filterQuery = {
						$distinct: filterObj
					};

					filterView
						.query(filterQuery)
						.orderBy(filterObj)
						.from(self._from._from);

					template = [
						'<div class="dropdown" id="' + self._id + '_' + filterField + '">',
							'<button class="btn btn-default dropdown-toggle" type="button" id="' + self._id + '_' + filterField + '_dropdownButton" data-toggle="dropdown" aria-expanded="true">',
								title + ' <span class="caret"></span>',
							'</button>',
						'</div>'
					];

					dropDownButton = window.jQuery(template.join(''));
					dropDownMenu = window.jQuery('<ul class="dropdown-menu" role="menu" id="' + self._id + '_' + filterField + '_dropdownMenu"></ul>');

					dropDownButton.append(dropDownMenu);

					filterElem.html(dropDownButton);

					// Data-link the underlying data to the grid filter drop-down
					filterView.link(dropDownMenu, {
						template: [
							'<li role="presentation" class="input-group" style="width: 240px; padding-left: 10px; padding-right: 10px; padding-top: 5px;">',
								'<input type="search" class="form-control gridFilterSearch" placeholder="Search...">',
								'<span class="input-group-btn">',
									'<button class="btn btn-default gridFilterClearSearch" type="button"><span class="glyphicon glyphicon-remove-circle glyphicons glyphicons-remove"></span></button>',
								'</span>',
							'</li>',
							'<li role="presentation" class="divider"></li>',
							'<li role="presentation" data-val="$all">',
								'<a role="menuitem" tabindex="-1">',
									'<input type="checkbox" checked>&nbsp;All',
								'</a>',
							'</li>',
							'<li role="presentation" class="divider"></li>',
							'{^{for options}}',
								'<li role="presentation" data-link="data-val{:' + filterField + '}">',
									'<a role="menuitem" tabindex="-1">',
										'<input type="checkbox">&nbsp;{^{:' + filterField + '}}',
									'</a>',
								'</li>',
							'{{/for}}'
						].join('')
					}, {
						$wrap: 'options'
					});

					elem.on('keyup', '#' + self._id + '_' + filterField + '_dropdownMenu .gridFilterSearch', function (e) {
						var elem = window.jQuery(this),
							query = filterView.query(),
							search = elem.val();

						if (search) {
							query[filterField] = new RegExp(search, 'gi');
						} else {
							delete query[filterField];
						}

						filterView.query(query);
					});

					elem.on('click', '#' + self._id + '_' + filterField + '_dropdownMenu .gridFilterClearSearch', function (e) {
						// Clear search text box
						window.jQuery(this).parents('li').find('.gridFilterSearch').val('');

						// Clear view query
						var query = filterView.query();
						delete query[filterField];
						filterView.query(query);
					});

					elem.on('click', '#' + self._id + '_' + filterField + '_dropdownMenu li', function (e) {
						e.stopPropagation();

						var fieldValue,
							elem = $(this),
							checkbox = elem.find('input[type="checkbox"]'),
							checked,
							addMode = true,
							fieldInArr,
							liElem,
							i;

						// If the checkbox is not the one clicked on
						if (!window.jQuery(e.target).is('input')) {
							// Set checkbox to opposite of current value
							checkbox.prop('checked', !checkbox.prop('checked'));
							checked = checkbox.is(':checked');
						} else {
							checkbox.prop('checked', checkbox.prop('checked'));
							checked = checkbox.is(':checked');
						}

						liElem = window.jQuery(this);
						fieldValue = liElem.attr('data-val');

						// Check if the selection is the "all" option
						if (fieldValue === '$all') {
							// Remove the field from the query
							delete queryObj[filterField];

							// Clear all other checkboxes
							liElem.parent().find('li[data-val!="$all"]').find('input[type="checkbox"]').prop('checked', false);
						} else {
							// Clear the "all" checkbox
							liElem.parent().find('[data-val="$all"]').find('input[type="checkbox"]').prop('checked', false);

							// Check if the type needs casting
							switch (filterVarType) {
								case 'integer':
									fieldValue = parseInt(fieldValue, 10);
									break;

								case 'float':
									fieldValue = parseFloat(fieldValue);
									break;

								default:
							}

							// Check if the item exists already
							queryObj[filterField] = queryObj[filterField] || {
								$in: []
							};

							fieldInArr = queryObj[filterField].$in;

							for (i = 0; i < fieldInArr.length; i++) {
								if (fieldInArr[i] === fieldValue) {
									// Item already exists
									if (checked === false) {
										// Remove the item
										fieldInArr.splice(i, 1);
									}
									addMode = false;
									break;
								}
							}

							if (addMode && checked) {
								fieldInArr.push(fieldValue);
							}

							if (!fieldInArr.length) {
								// Remove the field from the query
								delete queryObj[filterField];
							}
						}

						// Set the view query
						self._from.queryData(queryObj);
						if (self._from.pageFirst) {
							self._from.pageFirst();
						}
					});
				});
			}

			self.emit('refresh');
		} else {
			throw('Grid requires the AutoBind module in order to operate!');
		}
	}

	return this;
};

/**
 * Returns the number of documents currently in the grid.
 * @func count
 * @memberof Grid
 * @returns {Number}
 */
Grid.prototype.count = function () {
	return this._from.count();
};

/**
 * Creates a grid and assigns the collection as its data source.
 * @func grid
 * @memberof Collection
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
 * @func unGrid
 * @memberof Collection
 * @param {String} selector jQuery selector of grid output target.
 * @param {String} template The table template to use when rendering the grid.
 * @param {Object=} options The options object to apply to the grid.
 * @returns {*}
 */
Collection.prototype.unGrid = View.prototype.unGrid = function (selector, template, options) {
	var i,
		grid;

	if (this._db && this._db._grid ) {
		if (selector && template) {
			if (this._db._grid[selector]) {
				grid = this._db._grid[selector];
				delete this._db._grid[selector];

				return grid.drop();
			} else {
				throw('ForerunnerDB.Collection/View "' + this.name() + '": Cannot remove a grid using this collection/view because a grid with this name does not exist: ' + name);
			}
		} else {
			// No parameters passed, remove all grids from this module
			for (i in this._db._grid) {
				if (this._db._grid.hasOwnProperty(i)) {
					grid = this._db._grid[i];
					delete this._db._grid[i];

					grid.drop();

					if (this.debug()) {
						console.log('ForerunnerDB.Collection/View "' + this.name() + '": Removed grid binding "' + i + '"');
					}
				}
			}

			this._db._grid = {};
		}
	}
};

/**
 * Adds a grid to the internal grid lookup.
 * @func _addGrid
 * @memberof Collection
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
 * @func _removeGrid
 * @memberof Collection
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
Db.prototype.init = function () {
	this._grid = {};
	DbInit.apply(this, arguments);
};

/**
 * Determine if a grid with the passed name already exists.
 * @func gridExists
 * @memberof Db
 * @param {String} selector The jQuery selector to bind the grid to.
 * @returns {boolean}
 */
Db.prototype.gridExists = function (selector) {
	return Boolean(this._grid[selector]);
};

/**
 * Creates a grid based on the passed arguments.
 * @func grid
 * @memberof Db
 * @param {String} selector The jQuery selector of the grid to retrieve.
 * @param {String} template The table template to use when rendering the grid.
 * @param {Object=} options The options object to apply to the grid.
 * @returns {*}
 */
Db.prototype.grid = function (selector, template, options) {
	if (!this._grid[selector]) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('Db.Grid: Creating grid ' + selector);
		}
	}

	this._grid[selector] = this._grid[selector] || new Grid(selector, template, options).db(this);
	return this._grid[selector];
};

/**
 * Removes a grid based on the passed arguments.
 * @func unGrid
 * @memberof Db
 * @param {String} selector The jQuery selector of the grid to retrieve.
 * @param {String} template The table template to use when rendering the grid.
 * @param {Object=} options The options object to apply to the grid.
 * @returns {*}
 */
Db.prototype.unGrid = function (selector, template, options) {
	if (!this._grid[selector]) {
		if (this.debug() || (this._db && this._db.debug())) {
			console.log('Db.Grid: Creating grid ' + selector);
		}
	}

	this._grid[selector] = this._grid[selector] || new Grid(selector, template, options).db(this);
	return this._grid[selector];
};

/**
 * Returns an array of grids the DB currently has.
 * @func grids
 * @memberof Db
 * @returns {Array} An array of objects containing details of each grid
 * the database is currently managing.
 */
Db.prototype.grids = function () {
	var arr = [],
		item,
		i;

	for (i in this._grid) {
		if (this._grid.hasOwnProperty(i)) {
			item = this._grid[i];

			arr.push({
				name: i,
				count: item.count(),
				linked: item.isLinked !== undefined ? item.isLinked() : false
			});
		}
	}

	return arr;
};

Shared.finishModule('Grid');
module.exports = Grid;