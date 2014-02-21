ForerunnerDB.prototype.Plugin.Remote = (function () {
	var Collection = function (name) {
		this._name = name;
	};

	Collection.prototype.db = function (db) {
		this._db = db;
		return this;
	};

	Collection.prototype.find = function (query, options, callback) {
		var self = this;

		self._db._socket.emit('find', {
			collection: self._name,
			query: query,
			options: options
		}, function (data) {
			callback(data.err, data.results);
		});
	};

	var Remote = function (db) {
		this._db = db;
		this._collection = {};
	};

	Remote.prototype.connect = function (url) {
		var self = this;
		self._socket = io.connect(url);
	};

	Remote.prototype.collection = function (collectionName, primaryKey) {
		if (collectionName) {
			this._collection[collectionName] = this._collection[collectionName] || new Collection(collectionName).db(this);

			if (primaryKey !== undefined) {
				this._collection[collectionName].primaryKey(primaryKey);
			}

			return this._collection[collectionName];
		} else {
			// Return an object of collection data
			return this._collection;
		}
	};

	return Remote;
})();