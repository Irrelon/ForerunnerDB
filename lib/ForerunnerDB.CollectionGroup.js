// Import external names locally
var Shared,
	Core,
	CoreInit,
	Collection,
	Overload;

Shared = require('./ForerunnerDB.Shared');

var CollectionGroup = function () {
	this.init.apply(this, arguments);
};

Collection = require('./ForerunnerDB.Collection');
Overload = require('./ForerunnerDB.Overload');
Core = Shared.modules.Core;
CoreInit = Shared.modules.Core.prototype.init;

CollectionGroup.prototype.init = function (name) {
	var self = this;

	this._name = name;
	this._collectionArr = [];
	this._views = [];

	// Register listeners for the CRUD events
	this._onCollectionInsert = function () {
		self._onInsert.apply(self, arguments);
	};

	this._onCollectionUpdate = function () {
		self._onUpdate.apply(self, arguments);
	};

	this._onCollectionRemove = function () {
		self._onRemove.apply(self, arguments);
	};

	this._onCollectionChange = function () {
		self._onChange.apply(self, arguments);
	};
};

/*CollectionGroup.prototype.on = function(event, listener) {
 this._listeners = this._listeners || {};
 this._listeners[event] = this._listeners[event] || [];
 this._listeners[event].push(listener);

 return this;
 };

 CollectionGroup.prototype.off = function(event, listener) {
 if (event in this._listeners) {
 var arr = this._listeners[event],
 index = arr.indexOf(listener);

 if (index > -1) {
 arr.splice(index, 1);
 }
 }

 return this;
 };

 CollectionGroup.prototype.emit = function(event, data) {
 this._listeners = this._listeners || {};

 if (event in this._listeners) {
 var arr = this._listeners[event],
 arrCount = arr.length,
 arrIndex;

 for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
 arr[arrIndex].apply(this, Array.prototype.slice.call(arguments, 1));
 }
 }

 return this;
 };*/

CollectionGroup.prototype.on = new Overload([
	function(event, listener) {
		this._listeners = this._listeners || {};
		this._listeners[event] = this._listeners[event] || {};
		this._listeners[event]['*'] = this._listeners[event]['*'] || [];
		this._listeners[event]['*'].push(listener);

		return this;
	},

	function(event, id, listener) {
		this._listeners = this._listeners || {};
		this._listeners[event] = this._listeners[event] || {};
		this._listeners[event][id] = this._listeners[event][id] || [];
		this._listeners[event][id].push(listener);

		return this;
	}
]);

CollectionGroup.prototype.off = new Overload([
	function (event) {
		if (this._listeners && this._listeners[event] && event in this._listeners) {
			delete this._listeners[event];
		}

		return this;
	},

	function(event, listener) {
		var arr,
			index;

		if (typeof(listener) === 'string') {
			if (this._listeners && this._listeners[event] && this._listeners[event][listener]) {
				delete this._listeners[event][listener];
			}
		} else {
			if (event in this._listeners) {
				arr = this._listeners[event]['*'];
				index = arr.indexOf(listener);

				if (index > -1) {
					arr.splice(index, 1);
				}
			}
		}

		return this;
	},

	function (event, id, listener) {
		if (this._listeners && event in this._listeners) {
			var arr = this._listeners[event][id],
				index = arr.indexOf(listener);

			if (index > -1) {
				arr.splice(index, 1);
			}
		}
	}
]);

CollectionGroup.prototype.emit = function(event, data) {
	this._listeners = this._listeners || {};

	if (event in this._listeners) {
		// Handle global emit
		if (this._listeners[event]['*']) {
			var arr = this._listeners[event]['*'],
				arrCount = arr.length,
				arrIndex;

			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				arr[arrIndex].apply(this, Array.prototype.slice.call(arguments, 1));
			}
		}

		// Handle individual emit
		if (data instanceof Array) {
			// Check if the array is an array of objects in the collection
			if (data[0] && data[0][this._primaryKey]) {
				// Loop the array and check for listeners against the primary key
				var listenerIdArr = this._listeners[event],
					listenerIdCount,
					listenerIdIndex,
					arrCount = data.length,
					arrIndex;

				for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
					if (listenerIdArr[data[arrIndex][this._primaryKey]]) {
						// Emit for this id
						listenerIdCount = listenerIdArr[data[arrIndex][this._primaryKey]].length;
						for (listenerIdIndex = 0; listenerIdIndex < listenerIdCount; listenerIdIndex++) {
							listenerIdArr[data[arrIndex][this._primaryKey]][listenerIdIndex].apply(this, Array.prototype.slice.call(arguments, 1));
						}
					}
				}
			}
		}
	}

	return this;
};

/**
 * Gets / sets the db instance the collection group belongs to.
 * @param {DB} db The db instance.
 * @returns {*}
 */
CollectionGroup.prototype.db = function (db) {
	if (db !== undefined) {
		this._db = db;
		return this;
	}

	return this._db;
};

CollectionGroup.prototype.addCollection = function (collection) {
	if (collection) {
		if (this._collectionArr.indexOf(collection) === -1) {
			var self = this;

			// Check for compatible primary keys
			if (this._collectionArr.length) {
				if (this._primaryKey !== collection.primaryKey()) {
					throw("All collections in a collection group must have the same primary key!");
				}
			} else {
				// Set the primary key to the first collection added
				this._primaryKey = collection.primaryKey();
			}

			// Add the collection
			this._collectionArr.push(collection);
			collection._groups.push(this);

			// Listen to events from the collection
			collection.on('insert', this._onCollectionInsert);
			collection.on('update', this._onCollectionUpdate);
			collection.on('remove', this._onCollectionRemove);
			collection.on('change', this._onCollectionChange);
		}
	}

	return this;
};

CollectionGroup.prototype.removeCollection = function (collection) {
	if (collection) {
		var collectionIndex = this._collectionArr.indexOf(collection),
			groupIndex;

		if (collectionIndex !== -1) {
			// Remove event listeners from this collection
			collection.off('insert', this._onCollectionInsert);
			collection.off('update', this._onCollectionUpdate);
			collection.off('remove', this._onCollectionRemove);
			collection.off('change', this._onCollectionChange);

			this._collectionArr.splice(collectionIndex, 1);

			groupIndex = collection._groups.indexOf(this);

			if (groupIndex !== -1) {
				collection._groups.splice(groupIndex, 1);
			}
		}

		if (this._collectionArr.length === 0) {
			// Wipe the primary key
			delete this._primaryKey;
		}
	}

	return this;
};

CollectionGroup.prototype.find = function (query, options) {
	// Loop the collections in this group and find first matching item response
	var data = new Collection().primaryKey(this._collectionArr[0].primaryKey()),
		i;

	for (i = 0; i < this._collectionArr.length; i++) {
		data.insert(this._collectionArr[i].find(query));
	}

	return data.find(query, options);
};

CollectionGroup.prototype.insert = function (query, options) {
	// Loop the collections in this group and apply the insert
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].insert(query, options);
	}
};

CollectionGroup.prototype.update = function (query, update) {
	// Loop the collections in this group and apply the update
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].update(query, update);
	}
};

CollectionGroup.prototype.updateById = function (id, update) {
	// Loop the collections in this group and apply the update
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].updateById(id, update);
	}
};

CollectionGroup.prototype.remove = function (query) {
	// Loop the collections in this group and apply the remove
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].remove(query);
	}
};

/**
 * Helper method that removes a document that matches the given id.
 * @param {String} id The id of the document to remove.
 */
CollectionGroup.prototype.removeById = function (id) {
	// Loop the collections in this group and apply the remove
	for (var i = 0; i < this._collectionArr.length; i++) {
		this._collectionArr[i].removeById(id);
	}
};

CollectionGroup.prototype._onInsert = function (successArr, failArr) {
	this.emit('insert', successArr, failArr);
};

CollectionGroup.prototype._onUpdate = function (successArr, failArr) {
	this.emit('update', successArr, failArr);
};

CollectionGroup.prototype._onRemove = function (successArr, failArr) {
	this.emit('remove', successArr, failArr);
};

CollectionGroup.prototype._onChange = function () {
	this.emit('change');
};

/**
 * Uses the passed query to generate a new collection with results
 * matching the query parameters.
 *
 * @param query
 * @param options
 * @returns {*}
 */
CollectionGroup.prototype.subset = function (query, options) {
	var result = this.find(query, options);

	return new Collection()
		._subsetOf(this)
		.primaryKey(this._primaryKey)
		.setData(result);
};

/**
 * Drops a collection group from the database.
 * @returns {boolean} True on success, false on failure.
 */
CollectionGroup.prototype.drop = function () {
	var i,
		collArr = [].concat(this._collectionArr),
		viewArr = [].concat(this._views);

	if (this._debug) {
		console.log('Dropping collection group ' + this._name);
	}

	for (i = 0; i < collArr.length; i++) {
		this.removeCollection(collArr[i]);
	}

	for (i = 0; i < viewArr.length; i++) {
		this._removeView(viewArr[i]);
	}

	this.emit('drop');

	return true;
};

// Extend DB to include collection groups
Core.prototype.init = function () {
	this._collectionGroup = {};
	CoreInit.apply(this, arguments);
};

Core.prototype.collectionGroup = function (collectionGroupName) {
	if (collectionGroupName) {
		this._collectionGroup[collectionGroupName] = this._collectionGroup[collectionGroupName] || new CollectionGroup(collectionGroupName).db(this);
		return this._collectionGroup[collectionGroupName];
	} else {
		// Return an object of collection data
		return this._collectionGroup;
	}
};

module.exports = CollectionGroup;