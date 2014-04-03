/**
 * Extends ForerunnerDB views with bind functionality.
 */
(function () {
	// Grab the view class
	var View = ForerunnerDB.classes.View,
		ViewInit = ForerunnerDB.classes.View.prototype.init;

	View.prototype.init = function () {
		var self = this;

		this._binds = [];
		ViewInit.apply(this, arguments);

		// Hook view events to update binds
		this.on('insert', function (successArr, failArr) {
			self._bindEvent('insert', successArr, failArr);
		});

		this.on('update', function (successArr, failArr) {
			self._bindEvent('update', successArr, failArr);
		});

		this.on('remove', function (successArr, failArr) {
			self._bindEvent('remove', successArr, failArr);
		});

		this.on('change', self._bindChange);
	};

	/**
	 * Binds a selector to the insert, update and delete events of a particular
	 * view and keeps the selector in sync so that updates are reflected on the
	 * web page in real-time.
	 *
	 * @param {String} selector The jQuery selector string to get target elements.
	 * @param {Object} options The options object.
	 */
	View.prototype.bind = function (selector, options) {
		if (options && options.template) {
			this._binds[selector] = options;
		} else {
			throw('Cannot bind data to element, missing options information!');
		}

		return this;
	};

	/**
	 * Un-binds a selector from the view changes.
	 * @param {String} selector The jQuery selector string to identify the bind to remove.
	 * @returns {Collection}
	 */
	View.prototype.unBind = function (selector) {
		delete this._binds[selector];
		return this;
	};

	/**
	 * Sorts items in the DOM based on the bind settings and the passed item array.
	 * @param {String} selector The jQuery selector of the bind container.
	 * @param {Array} itemArr The array of items used to determine the order the DOM
	 * elements should be in based on the order they are in, in the array.
	 */
	View.prototype.bindSortDom = function (selector, itemArr) {
		var container = $(selector),
			arrIndex,
			arrItem,
			domItem;

		for (arrIndex = 0; arrIndex < itemArr.length; arrIndex++) {
			arrItem = itemArr[arrIndex];

			// Now we've done our inserts into the DOM, let's ensure they are still
			// ordered correctly
			domItem = container.find('#' + arrItem[this._primaryKey]);

			if (arrIndex === 0) {
				container.prepend(domItem);
			} else {
				domItem.insertAfter(container.children(':eq(' + (arrIndex - 1) + ')'));
			}
		}
	};

	View.prototype.bindRefresh = function (obj) {
		var binds = this._binds,
			bindKey,
			bind;

		for (bindKey in binds) {
			if (binds.hasOwnProperty(bindKey)) {
				bind = binds[bindKey];

				if (bind.sortDomItems) {
					this.bindSortDom(bindKey, obj.data);
				}

				if (bind.afterOperation) {
					bind.afterOperation();
				}
			}
		}
	};

	/**
	 * Renders a bind view data to the DOM.
	 * @param {String} bindSelector The jQuery selector string to use to identify
	 * the bind target. Must match the selector used when defining the original bind.
	 * @param {Function=} domHandler If specified, this handler method will be called
	 * with the final HTML for the view instead of the DB handling the DOM insertion.
	 */
	View.prototype.bindRender = function (bindSelector, domHandler) {
		// Check the bind exists
		var bind = this._binds[bindSelector],
			domTarget = $(bindSelector),
			allData,
			dataItem,
			itemHtml,
			finalHtml = $('<ul></ul>'),
			i;

		if (bind) {
			allData = this._data.find();

			// Loop all items and add them to the screen
			for (i = 0; i < allData.length; i++) {
				dataItem = allData[i];

				itemHtml = bind.template(dataItem, function (itemHtml) {
					finalHtml.append(itemHtml);
				});
			}

			if (!domHandler) {
				domTarget.append(finalHtml.html());
			} else {
				domHandler(bindSelector, finalHtml.html());
			}
		}
	};

	View.prototype._bindEvent = function (type, successArr, failArr) {
		var binds = this._binds,
			unfilteredDataSet = this.find({}),
			filteredDataSet,
			bindKey;

		for (bindKey in binds) {
			if (binds.hasOwnProperty(bindKey)) {
				if (binds[bindKey].reduce) {
					filteredDataSet = this.find(binds[bindKey].reduce.query, binds[bindKey].reduce.options);
				} else {
					filteredDataSet = unfilteredDataSet;
				}

				switch (type) {
					case 'insert':
						this._bindInsert(bindKey, binds[bindKey], successArr, failArr, filteredDataSet);
						break;

					case 'update':
						this._bindUpdate(bindKey, binds[bindKey], successArr, failArr, filteredDataSet);
						break;

					case 'remove':
						this._bindRemove(bindKey, binds[bindKey], successArr, failArr, filteredDataSet);
						break;
				}
			}
		}
	};

	View.prototype._bindChange = function (newDataArr) {
		this.bindRefresh(newDataArr);
	};

	View.prototype._bindInsert = function (selector, options, successArr, failArr, all) {
		var container = $(selector),
			itemElem,
			itemHtml,
			i;

		// Loop the inserted items
		for (i = 0; i < successArr.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + successArr[i][this._primaryKey]);

			if (!itemElem.length) {
				itemHtml = options.template(successArr[i], function (itemElem, insertedItem, failArr, all) { return function (itemHtml) {
					// Check if there is custom DOM insert method
					if (options.insert) {
						options.insert(itemHtml, insertedItem, failArr, all);
					} else {
						// Handle the insert automatically
						// Add the item to the container
						if (options.prependInsert) {
							container.prepend(itemHtml);
						} else {
							container.append(itemHtml);
						}
					}

					if (options.afterInsert) {
						options.afterInsert(itemHtml, insertedItem, failArr, all);
					}
				}}(itemElem, successArr[i], failArr, all));
			}
		}
	};

	View.prototype._bindUpdate = function (selector, options, successArr, failArr, all) {
		var container = $(selector),
			itemElem,
			i;

		// Loop the updated items
		for (i = 0; i < successArr.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + successArr[i][this._primaryKey]);

			options.template(successArr[i], function (itemElem, itemData) { return function (itemHtml) {
				// Check if there is custom DOM insert method
				if (options.update) {
					options.update(itemHtml, itemData, all, itemElem.length ? 'update' : 'append');
				} else {
					if (itemElem.length) {
						// An existing item is in the container, replace it with the
						// new rendered item from the updated data
						itemElem.replaceWith(itemHtml);
					} else {
						// The item element does not already exist, append it
						if (options.prependUpdate) {
							container.prepend(itemHtml);
						} else {
							container.append(itemHtml);
						}
					}
				}

				if (options.afterUpdate) {
					options.afterUpdate(itemHtml, itemData, all);
				}
			}}(itemElem, successArr[i]));
		}
	};

	View.prototype._bindRemove = function (selector, options, successArr, failArr, all) {
		var container = $(selector),
			itemElem,
			i;

		// Loop the removed items
		for (i = 0; i < successArr.length; i++) {
			// Check for existing item in the container
			itemElem = container.find('#' + successArr[i][this._primaryKey]);

			if (itemElem.length) {
				if (options.beforeRemove) {
					options.beforeRemove(itemElem, successArr[i], all, function (itemElem, data, all) { return function () {
						if (options.remove) {
							options.remove(itemElem, data, all);
						} else {
							itemElem.remove();

							if (options.afterRemove) {
								options.afterRemove(itemElem, data, all);
							}
						}
					}}(itemElem, successArr[i], all));
				} else {
					if (options.remove) {
						options.remove(itemElem, successArr[i], all);
					} else {
						itemElem.remove();

						if (options.afterRemove) {
							options.afterRemove(itemElem, successArr[i], all);
						}
					}
				}
			}
		}
	};
})();
