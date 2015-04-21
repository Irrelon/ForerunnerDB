"use strict";

// Grab the view class
var Shared,
	Core,
	OldView,
	OldViewInit;

Shared = require('./Shared');
Core = Shared.modules.Core;
OldView = Shared.modules.OldView;
OldViewInit = OldView.prototype.init;

OldView.prototype.init = function () {
	var self = this;

	this._binds = [];
	this._renderStart = 0;
	this._renderEnd = 0;

	this._deferQueue = {
		insert: [],
		update: [],
		remove: [],
		upsert: [],
		_bindInsert: [],
		_bindUpdate: [],
		_bindRemove: [],
		_bindUpsert: []
	};

	this._deferThreshold = {
		insert: 100,
		update: 100,
		remove: 100,
		upsert: 100,
		_bindInsert: 100,
		_bindUpdate: 100,
		_bindRemove: 100,
		_bindUpsert: 100
	};

	this._deferTime = {
		insert: 100,
		update: 1,
		remove: 1,
		upsert: 1,
		_bindInsert: 100,
		_bindUpdate: 1,
		_bindRemove: 1,
		_bindUpsert: 1
	};

	OldViewInit.apply(this, arguments);

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
OldView.prototype.bind = function (selector, options) {
	if (options && options.template) {
		this._binds[selector] = options;
	} else {
		throw('ForerunnerDB.OldView "' + this.name() + '": Cannot bind data to element, missing options information!');
	}

	return this;
};

/**
 * Un-binds a selector from the view changes.
 * @param {String} selector The jQuery selector string to identify the bind to remove.
 * @returns {Collection}
 */
OldView.prototype.unBind = function (selector) {
	delete this._binds[selector];
	return this;
};

/**
 * Returns true if the selector is bound to the view.
 * @param {String} selector The jQuery selector string to identify the bind to check for.
 * @returns {boolean}
 */
OldView.prototype.isBound = function (selector) {
	return Boolean(this._binds[selector]);
};

/**
 * Sorts items in the DOM based on the bind settings and the passed item array.
 * @param {String} selector The jQuery selector of the bind container.
 * @param {Array} itemArr The array of items used to determine the order the DOM
 * elements should be in based on the order they are in, in the array.
 */
OldView.prototype.bindSortDom = function (selector, itemArr) {
	var container = window.jQuery(selector),
		arrIndex,
		arrItem,
		domItem;

	if (this.debug()) {
		console.log('ForerunnerDB.OldView.Bind: Sorting data in DOM...', itemArr);
	}

	for (arrIndex = 0; arrIndex < itemArr.length; arrIndex++) {
		arrItem = itemArr[arrIndex];

		// Now we've done our inserts into the DOM, let's ensure
		// they are still ordered correctly
		domItem = container.find('#' + arrItem[this._primaryKey]);

		if (domItem.length) {
			if (arrIndex === 0) {
				if (this.debug()) {
					console.log('ForerunnerDB.OldView.Bind: Sort, moving to index 0...', domItem);
				}
				container.prepend(domItem);
			} else {
				if (this.debug()) {
					console.log('ForerunnerDB.OldView.Bind: Sort, moving to index ' + arrIndex + '...', domItem);
				}
				domItem.insertAfter(container.children(':eq(' + (arrIndex - 1) + ')'));
			}
		} else {
			if (this.debug()) {
				console.log('ForerunnerDB.OldView.Bind: Warning, element for array item not found!', arrItem);
			}
		}
	}
};

OldView.prototype.bindRefresh = function (obj) {
	var binds = this._binds,
		bindKey,
		bind;

	if (!obj) {
		// Grab current data
		obj = {
			data: this.find()
		};
	}

	for (bindKey in binds) {
		if (binds.hasOwnProperty(bindKey)) {
			bind = binds[bindKey];

			if (this.debug()) { console.log('ForerunnerDB.OldView.Bind: Sorting DOM...'); }
			this.bindSortDom(bindKey, obj.data);

			if (bind.afterOperation) {
				bind.afterOperation();
			}

			if (bind.refresh) {
				bind.refresh();
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
OldView.prototype.bindRender = function (bindSelector, domHandler) {
	// Check the bind exists
	var bind = this._binds[bindSelector],
		domTarget = window.jQuery(bindSelector),
		allData,
		dataItem,
		itemHtml,
		finalHtml = window.jQuery('<ul></ul>'),
		bindCallback,
		i;

	if (bind) {
		allData = this._data.find();

		bindCallback = function (itemHtml) {
			finalHtml.append(itemHtml);
		};

		// Loop all items and add them to the screen
		for (i = 0; i < allData.length; i++) {
			dataItem = allData[i];

			itemHtml = bind.template(dataItem, bindCallback);
		}

		if (!domHandler) {
			domTarget.append(finalHtml.html());
		} else {
			domHandler(bindSelector, finalHtml.html());
		}
	}
};

OldView.prototype.processQueue = function (type, callback) {
	var queue = this._deferQueue[type],
		deferThreshold = this._deferThreshold[type],
		deferTime = this._deferTime[type];

	if (queue.length) {
		var self = this,
			dataArr;

		// Process items up to the threshold
		if (queue.length) {
			if (queue.length > deferThreshold) {
				// Grab items up to the threshold value
				dataArr = queue.splice(0, deferThreshold);
			} else {
				// Grab all the remaining items
				dataArr = queue.splice(0, queue.length);
			}

			this._bindEvent(type, dataArr, []);
		}

		// Queue another process
		setTimeout(function () {
			self.processQueue(type, callback);
		}, deferTime);
	} else {
		if (callback) { callback(); }
		this.emit('bindQueueComplete');
	}
};

OldView.prototype._bindEvent = function (type, successArr, failArr) {
	/*var queue = this._deferQueue[type],
		deferThreshold = this._deferThreshold[type],
		deferTime = this._deferTime[type];*/

	var binds = this._binds,
		unfilteredDataSet = this.find({}),
		filteredDataSet,
		bindKey;

	// Check if the number of inserts is greater than the defer threshold
	/*if (successArr && successArr.length > deferThreshold) {
	 // Break up upsert into blocks
	 this._deferQueue[type] = queue.concat(successArr);

	 // Fire off the insert queue handler
	 this.processQueue(type);

	 return;
	 } else {*/
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
	//}
};

OldView.prototype._bindChange = function (newDataArr) {
	if (this.debug()) {
		console.log('ForerunnerDB.OldView.Bind: Bind data change, refreshing bind...', newDataArr);
	}

	this.bindRefresh(newDataArr);
};

OldView.prototype._bindInsert = function (selector, options, successArr, failArr, all) {
	var container = window.jQuery(selector),
		itemElem,
		itemHtml,
		makeCallback,
		i;

	makeCallback = function (itemElem, insertedItem, failArr, all) {
		return function (itemHtml) {
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
		};
	};

	// Loop the inserted items
	for (i = 0; i < successArr.length; i++) {
		// Check for existing item in the container
		itemElem = container.find('#' + successArr[i][this._primaryKey]);

		if (!itemElem.length) {
			itemHtml = options.template(successArr[i], makeCallback(itemElem, successArr[i], failArr, all));
		}
	}
};

OldView.prototype._bindUpdate = function (selector, options, successArr, failArr, all) {
	var container = window.jQuery(selector),
		itemElem,
		makeCallback,
		i;

	makeCallback = function (itemElem, itemData) {
		return function (itemHtml) {
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
		};
	};

	// Loop the updated items
	for (i = 0; i < successArr.length; i++) {
		// Check for existing item in the container
		itemElem = container.find('#' + successArr[i][this._primaryKey]);

		options.template(successArr[i], makeCallback(itemElem, successArr[i]));
	}
};

OldView.prototype._bindRemove = function (selector, options, successArr, failArr, all) {
	var container = window.jQuery(selector),
		itemElem,
		makeCallback,
		i;

	makeCallback = function (itemElem, data, all) {
		return function () {
			if (options.remove) {
				options.remove(itemElem, data, all);
			} else {
				itemElem.remove();

				if (options.afterRemove) {
					options.afterRemove(itemElem, data, all);
				}
			}
		};
	};

	// Loop the removed items
	for (i = 0; i < successArr.length; i++) {
		// Check for existing item in the container
		itemElem = container.find('#' + successArr[i][this._primaryKey]);

		if (itemElem.length) {
			if (options.beforeRemove) {
				options.beforeRemove(itemElem, successArr[i], all, makeCallback(itemElem, successArr[i], all));
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