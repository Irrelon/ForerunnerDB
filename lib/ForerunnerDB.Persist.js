(function () {
	var init = (function (ForerunnerDB) {
		ForerunnerDB.prototype.Plugin.Persist = (function () {
			var Persist = function () {
				this.init.apply(this, arguments);
			};

			Persist.prototype.init = function (db) {
				// Check environment
				if (db.isClient()) {
					if (typeof(Storage) !== "undefined") {
						this.mode('localStorage');
					}
				}
			};

			Persist.prototype.mode = function (type) {
				if (type !== undefined) {
					this._mode = type;
					return this;
				}

				return this._mode;
			};

			Persist.prototype.save = function (key, data, callback) {
				var val;

				switch (this.mode()) {
					case 'localStorage':
						if (typeof(data) === 'object') {
							val = 'json::fdb::' + JSON.stringify(data);
						} else {
							val = 'raw::fdb::' + data;
						}

						localStorage.setItem(key, val);

						if (callback) { callback(false); }
						break;
				}

				if (callback) { callback('No data handler.'); }
			};

			Persist.prototype.load = function (key, callback) {
				var val,
					parts,
					data;

				switch (this.mode()) {
					case 'localStorage':
						val = localStorage.getItem(key);
						parts = val.split('::fdb::');

						switch (parts[0]) {
							case 'json':
								data = JSON.parse(parts[1]);
								break;

							case 'raw':
								data = parts[1];
								break;
						}

						if (callback) { callback(false, data); }
						break;
				}

				if (callback) { callback('No data handler or unrecognised data type.'); }
			};

			// Extend the Collection prototype with persist methods
			var Collection = ForerunnerDB.classes.Collection;

			Collection.prototype.save = function (callback) {
				if (this._name) {
					if (this._db) {
						// Save the collection data
						this._db.persist.save(this._name, this._data);
					} else {
						if (callback) { callback('Cannot save a collection that is not attached to a database!'); }
						return 'Cannot save a collection that is not attached to a database!';
					}
				} else {
					if (callback) { callback('Cannot save a collection with no assigned name!'); }
					return 'Cannot save a collection with no assigned name!';
				}
			};

			Collection.prototype.load = function (callback) {
				var self = this;

				if (this._name) {
					if (this._db) {
						// Load the collection data
						this._db.persist.load(this._name, function (err, data) {
							if (!err) {
								self.setData(data);
								if (callback) { callback(false); }
							} else {
								if (callback) { callback(err); }
								return err;
							}
						});
					} else {
						if (callback) { callback('Cannot load a collection that is not attached to a database!'); }
						return 'Cannot load a collection that is not attached to a database!';
					}
				} else {
					if (callback) { callback('Cannot load a collection with no assigned name!'); }
					return 'Cannot load a collection with no assigned name!';
				}
			};

			return Persist;
		})();
	});

	if (typeof(define) === 'function' && define.amd) {
		// Use AMD
		define(['require', '../ForerunnerDB'], function (require, ForerunnerDB) {
			return init(ForerunnerDB);
		});
	} else {
		// Use global
		init(ForerunnerDB);
	}
})();
