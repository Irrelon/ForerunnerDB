"use strict";

// Import external names locally
var Shared = require('./Shared'),
	async = require('async'),
	localforage = require('localforage'),
	FdbCompress = require('./PersistCompress'),// jshint ignore:line
	FdbCrypto = require('./PersistCrypto'),// jshint ignore:line
	Db,
	Collection,
	CollectionDrop,
	CollectionGroup,
	CollectionInit,
	DbInit,
	DbDrop,
	Persist,
	Overload;//,
	//DataVersion = '2.0';

/**
 * The persistent storage class handles loading and saving data to browser
 * storage.
 * @class
 * @constructor
 */
Persist = function () {
	this.init.apply(this, arguments);
};

/**
 * The local forage library.
 */
Persist.prototype.localforage = localforage;

/**
 * The init method that can be overridden or extended.
 * @param {Db} db The ForerunnerDB database instance.
 */
Persist.prototype.init = function (db) {
	var self = this;

	this._encodeSteps = [
		function () { return self._encode.apply(self, arguments); }
	];
	this._decodeSteps = [
		function () { return self._decode.apply(self, arguments); }
	];

	// Check environment
	if (db.isClient()) {
		if (window.Storage !== undefined) {
			this.mode('localforage');

			localforage.config({
				name: String(db.core().name()),
				storeName: 'FDB'
			});
		}
	}
};

Shared.addModule('Persist', Persist);
Shared.mixin(Persist.prototype, 'Mixin.ChainReactor');
Shared.mixin(Persist.prototype, 'Mixin.Common');

Db = Shared.modules.Db;
Collection = require('./Collection');
CollectionDrop = Collection.prototype.drop;
CollectionGroup = require('./CollectionGroup');
CollectionInit = Collection.prototype.init;
DbInit = Db.prototype.init;
DbDrop = Db.prototype.drop;
Overload = Shared.overload;

/**
 * Gets / sets the auto flag which determines if the persistence module
 * will automatically load data for collections the first time they are
 * accessed and save data whenever it changes. This is disabled by
 * default.
 * @param {Boolean} val Set to true to enable, false to disable
 * @returns {*}
 */
Shared.synthesize(Persist.prototype, 'auto', function (val) {
	var self = this;

	if (val !== undefined) {
		if (val) {
			// Hook db events
			this._db.on('create', function () { self._autoLoad.apply(self, arguments); });
			this._db.on('change', function () { self._autoSave.apply(self, arguments); });

			if (this._db.debug()) {
				console.log(this._db.logIdentifier() + ' Automatic load/save enabled');
			}
		} else {
			// Un-hook db events
			this._db.off('create', this._autoLoad);
			this._db.off('change', this._autoSave);

			if (this._db.debug()) {
				console.log(this._db.logIdentifier() + ' Automatic load/save disabled');
			}
		}
	}

	return this.$super.call(this, val);
});

Persist.prototype._autoLoad = function (obj, objType, name) {
	var self = this;

	if (typeof obj.load === 'function') {
		if (self._db.debug()) {
			console.log(self._db.logIdentifier() + ' Auto-loading data for ' + objType + ':', name);
		}

		obj.load(function (err, data) {
			if (err && self._db.debug()) {
				console.log(self._db.logIdentifier() + ' Automatic load failed:', err);
			}

			self.emit('load', err, data);
		});
	} else {
		if (self._db.debug()) {
			console.log(self._db.logIdentifier() + ' Auto-load for ' + objType + ':', name, 'no load method, skipping');
		}
	}
};

Persist.prototype._autoSave = function (obj, objType, name) {
	var self = this;

	if (typeof obj.save === 'function') {
		if (self._db.debug()) {
			console.log(self._db.logIdentifier() + ' Auto-saving data for ' + objType + ':', name);
		}

		obj.save(function (err, data) {
			if (err && self._db.debug()) {
				console.log(self._db.logIdentifier() + ' Automatic save failed:', err);
			}

			self.emit('save', err, data);
		});
	}
};

/**
 * Gets / sets the persistent storage mode (the library used
 * to persist data to the browser - defaults to localForage).
 * @param {String} type The library to use for storage. Defaults
 * to localForage.
 * @returns {*}
 */
Persist.prototype.mode = function (type) {
	if (type !== undefined) {
		this._mode = type;
		return this;
	}

	return this._mode;
};

/**
 * Gets / sets the driver used when persisting data.
 * @param {String} val Specify the driver type (LOCALSTORAGE,
 * WEBSQL or INDEXEDDB)
 * @returns {*}
 */
Persist.prototype.driver = function (val) {
	if (val !== undefined) {
		switch (val.toUpperCase()) {
			case 'LOCALSTORAGE':
				localforage.setDriver(localforage.LOCALSTORAGE);
				break;

			case 'WEBSQL':
				localforage.setDriver(localforage.WEBSQL);
				break;

			case 'INDEXEDDB':
				localforage.setDriver(localforage.INDEXEDDB);
				break;

			default:
				throw('ForerunnerDB.Persist: The persistence driver you have specified is not found. Please use either IndexedDB, WebSQL or LocalStorage!');
		}

		return this;
	}

	return localforage.driver();
};

/**
 * Starts a decode waterfall process.
 * @param {*} val The data to be decoded.
 * @param {Function} finished The callback to pass final data to.
 */
Persist.prototype.decode = function (val, finished) {
	async.waterfall([function (callback) {
		if (callback) { callback(false, val, {}); }
	}].concat(this._decodeSteps), finished);
};

/**
 * Starts an encode waterfall process.
 * @param {*} val The data to be encoded.
 * @param {Function} finished The callback to pass final data to.
 */
Persist.prototype.encode = function (val, finished) {
	async.waterfall([function (callback) {
		if (callback) { callback(false, val, {}); }
	}].concat(this._encodeSteps), finished);
};

Shared.synthesize(Persist.prototype, 'encodeSteps');
Shared.synthesize(Persist.prototype, 'decodeSteps');

Persist.prototype.addStep = new Overload({
	/**
	 * Adds an encode/decode step to the persistent storage system so
	 * that you can add custom functionality.
	 * @name addStep
	 * @method Persist.addStep
	 * @param {Function} obj The object to encode / decode.
	 */
	'object': function (obj) {
		return this.$main.call(this, function objEncode () { obj.encode.apply(obj, arguments); }, function objDecode () { obj.decode.apply(obj, arguments); }, 0);
	},

	/**
	 * Adds an encode/decode step to the persistent storage system so
	 * that you can add custom functionality.
	 * @name addStep
	 * @method Persist.addStep
	 * @param {Function} encode The encode method called with the data from the
	 * previous encode step. When your method is complete it MUST call the
	 * callback method. If you provide anything other than false to the err
	 * parameter the encoder will fail and throw an error.
	 * @param {Function} decode The decode method called with the data from the
	 * previous decode step. When your method is complete it MUST call the
	 * callback method. If you provide anything other than false to the err
	 * parameter the decoder will fail and throw an error.
	 */
	'function, function': function (encode, decode) {
		return this.$main.call(this, encode, decode, 0);
	},

	/**
	 * Adds an encode/decode step to the persistent storage system so
	 * that you can add custom functionality.
	 * @name addStep
	 * @method Persist.addStep
	 * @param {Function} encode The encode method called with the data from the
	 * previous encode step. When your method is complete it MUST call the
	 * callback method. If you provide anything other than false to the err
	 * parameter the encoder will fail and throw an error.
	 * @param {Function} decode The decode method called with the data from the
	 * previous decode step. When your method is complete it MUST call the
	 * callback method. If you provide anything other than false to the err
	 * parameter the decoder will fail and throw an error.
	 * @param {Number=} index Optional index to add the encoder step to. This
	 * allows you to place a step before or after other existing steps. If not
	 * provided your step is placed last in the list of steps. For instance if
	 * you are providing an encryption step it makes sense to place this last
	 * since all previous steps will then have their data encrypted by your
	 * final step.
	 */
	'function, function, number': function (encode, decode, index) {
		return this.$main.call(this, encode, decode, index);
	},

	$main: function (encode, decode, index) {
		if (index === 0 || index === undefined) {
			this._encodeSteps.push(encode);
			this._decodeSteps.unshift(decode);
		} else {
			// Place encoder step at index then work out correct
			// index to place decoder step
			this._encodeSteps.splice(index, 0, encode);
			this._decodeSteps.splice(this._decodeSteps.length - index, 0, decode);
		}
	}
});

Persist.prototype.unwrap = function (dataStr) {
	var parts = dataStr.split('::fdb::'),
		data;

	switch (parts[0]) {
		case 'json':
			data = this.jParse(parts[1]);
			break;

		case 'raw':
			data = parts[1];
			break;

		default:
			break;
	}
};

/**
 * Takes encoded data and decodes it for use as JS native objects and arrays.
 * @param {String} val The currently encoded string data.
 * @param {Object} meta Meta data object that can be used to pass back useful
 * supplementary data.
 * @param {Function} finished The callback method to call when decoding is
 * completed.
 * @private
 */
Persist.prototype._decode = function (val, meta, finished) {
	var parts,
		data;

	if (val) {
		parts = val.split('::fdb::');

		switch (parts[0]) {
			case 'json':
				data = this.jParse(parts[1]);
				break;

			case 'raw':
				data = parts[1];
				break;

			default:
				break;
		}

		if (data) {
			meta.foundData = true;
			meta.rowCount = data.length || 0;
		} else {
			meta.foundData = false;
			meta.rowCount = 0;
		}

		if (finished) {
			finished(false, data, meta);
		}
	} else {
		meta.foundData = false;
		meta.rowCount = 0;

		if (finished) {
			finished(false, val, meta);
		}
	}
};

/**
 * Takes native JS data and encodes it for for storage as a string.
 * @param {Object} val The current un-encoded data.
 * @param {Object} meta Meta data object that can be used to pass back useful
 * supplementary data.
 * @param {Function} finished The callback method to call when encoding is
 * completed.
 * @private
 */
Persist.prototype._encode = function (val, meta, finished) {
	var data = val;

	if (typeof val === 'object') {
		val = 'json::fdb::' + this.jStringify(val);
	} else {
		val = 'raw::fdb::' + val;
	}

	if (data) {
		meta.foundData = true;
		meta.rowCount = data.length || 0;
	} else {
		meta.foundData = false;
		meta.rowCount = 0;
	}

	if (finished) {
		finished(false, val, meta);
	}
};

/**
 * Encodes passed data and then stores it in the browser's persistent
 * storage layer.
 * @param {String} key The key to store the data under in the persistent
 * storage.
 * @param {Object} data The data to store under the key.
 * @param {Function=} callback The method to call when the save process
 * has completed.
 */
Persist.prototype.save = function (key, data, callback) {
	switch (this.mode()) {
		case 'localforage':
			this.encode(data, function (err, data, tableStats) {
				if (err) {
					return callback(err);
				}

				localforage.setItem(key, data, function (err) {
					if (callback) {
						if (err) {
							callback(err);
							return;
						}

						callback(false, data, tableStats);
					}
				});
			});
			break;

		default:
			if (callback) { callback('No data handler.'); }
			break;
	}
};

/**
 * Loads and decodes data from the passed key.
 * @param {String} key The key to retrieve data from in the persistent
 * storage.
 * @param {Function=} callback The method to call when the load process
 * has completed.
 */
Persist.prototype.load = function (key, callback) {
	var self = this;

	switch (this.mode()) {
		case 'localforage':
			localforage.getItem(key, function (err, val) {
				if (err) {
					if (callback) { callback(err); }

					return;
				}

				self.decode(val, callback);
			});
			break;

		default:
			if (callback) { callback('No data handler or unrecognised data type.');	}
			break;
	}
};

/**
 * Deletes data in persistent storage stored under the passed key.
 * @param {String} key The key to drop data for in the storage.
 * @param {Function=} callback The method to call when the data is dropped.
 */
Persist.prototype.drop = function (key, callback) {
	switch (this.mode()) {
		case 'localforage':
			localforage.removeItem(key, function (err) {
				if (callback) { callback(err); }
			});
			break;

		default:
			if (callback) { callback('No data handler or unrecognised data type.'); }
			break;
	}

};

/**
 * Determines the byte size of a String, also taking special chars into account.
 * Inspired by http://codereview.stackexchange.com/questions/37512/count-byte-length-of-string
 * @param {String} string String to get bytes size of
 * @return {Number} Size in bytes of the input string
 * @private
 */
Persist.prototype._calcSize = function (string) {
	var iCount = 0,
		stringPrep = String(string || ""),
		stringLength = stringPrep.length,
		iPartCount,
		i;
	
	for (i = 0; i < stringLength; i++) {
		iPartCount = encodeURI(stringPrep[i]).split("%").length;
		iCount += iPartCount === 1 ? 1 : iPartCount - 1;
	}
	
	return iCount;
};

/**
 * Argument to the persistedSize callback function
 * @typedef {Object} persistedSizeCallbackArg
 * @property {number} total The total size of either the collection or the DB in byte
 * @property {Array[]} collections per Array item: collection name and size as an Array tupel: collectionName, size
 */
/**
 * Callback for persisted size functions
 *
 * @callback persistedSizeCallback
 * @param {persistedSizeCallbackArg}
 */
/**
 * determine byte size of a persisted object,
 * either entire DB or specific collection
 * @param {string|object} target either a string (collection name) or an object (DB)
 * @param {persistedSizeCallback} callback method to call when size determination is done - mandatory for obtaining a result!
 */
Persist.prototype.persistedSize = function (target, callback) {
	var self = this,
		resultMap;
	
	// mapping: {
	// total: $totalsize
	// collections: [
	// 	[collection, bytesize]
	//   ....
	//  ]
	// }
	resultMap = {
		total: 0,
		collections: []
	};
	
	/**
	 * named helper function to map-reduce the total byte size of a persisted object
	 * and to log each collections individual size
	 * @param {String} value
	 * @param {String} key
	 * @private
	 */
	function _mapSizeCb (value, key) {
		// cont only if collection contains content
		if (value !== null) {
			// Both key and value of the persisted storage obj count toward total size
			var atomicTotal = self._calcSize(value) + self._calcSize(key);
			
			// Make an entry: collection (key) is $total bytes
			resultMap.collections.push([key, atomicTotal]);
			
			// Count towards total size only if value != null
			resultMap.total += atomicTotal;
		}
	}
	
	switch (this.mode()) {
		case 'localforage':
			// In general: don't do any decoding (enc, compression),
			// b/c only the "raw" size of the storage object is of interest
			switch ((typeof target).toLowerCase()) {
				case 'string':
					// Collection name was provided
					// Utilize localforages built-in Promise functionality (includes
					// shim for IE) get collection + collection meta data for size
					// determination
					localforage.getItem(target).then(function (value) {
						_mapSizeCb(value, target);
					}).then(function () {
						return localforage.getItem(target + "-metaData");
					}).then(function (value) {
						_mapSizeCb(value, target + "-metaData");
					}).then(function () {
						// done - report back
						if (callback) {
							callback(null, resultMap);
						}
					}).catch(function (err) {
						console.error(JSON.stringify(err));
						if (callback) {
							callback(err);
						}
					});
					
					break;
				
				case 'object':
					// DB object was provided
					// determine size of DB
					// by iterating over all key/value pairs
					// filtering for this DB
					
					// we want to measure all persisted collections of a DB
					// independent of whether they're attached to the DB
					// at runtime via db.collection(name)
					localforage.iterate(function (value, key) {
						if ((key.lastIndexOf(target.name(), 0) === 0) && value !== null) {
							_mapSizeCb(value, key);
						}
					}).then(function () {
						// done - report back
						callback(null, resultMap);
					}).catch(function (err) {
						console.error(JSON.stringify(err));
						if (callback) {
							callback(err);
						}
					});
					break;
				
				default:
					if (callback) {
						callback("Couldn't determine target for size calculation - must be either a collection name (string) or a db reference (object)");
					}
			}
			break;
		
		default:
			if (callback) {
				callback('No data handler or unrecognised data type.');
			}
			break;
	}
};

// Extend the Collection prototype with persist methods
Collection.prototype.drop = new Overload({
	/**
	 * Drop collection and persistent storage.
	 * @name drop
	 * @method Collection.drop
	 */
	'': function () {
		if (!this.isDropped()) {
			this.drop(true);
		}
	},

	/**
	 * Drop collection and persistent storage with callback.
	 * @name drop
	 * @method Collection.drop
	 * @param {Function} callback Callback method.
	 */
	'function': function (callback) {
		if (!this.isDropped()) {
			this.drop(true, callback);
		}
	},

	/**
	 * Drop collection and optionally drop persistent storage.
	 * @name drop
	 * @method Collection.drop
	 * @param {Boolean} removePersistent True to drop persistent storage, false to keep it.
	 */
	'boolean': function (removePersistent) {
		if (!this.isDropped()) {
			// Remove persistent storage
			if (removePersistent) {
				if (this._name) {
					if (this._db) {
						// Drop the collection data from storage
						this._db.persist.drop(this._db._name + '-' + this._name);
						this._db.persist.drop(this._db._name + '-' + this._name + '-metaData');
					}
				} else {
					throw('ForerunnerDB.Persist: Cannot drop a collection\'s persistent storage when no name assigned to collection!');
				}
			}

			// Call the original method
			CollectionDrop.call(this);
		}
	},

	/**
	 * Drop collections and optionally drop persistent storage with callback.
	 * @name drop
	 * @method Collection.drop
	 * @param {Boolean} removePersistent True to drop persistent storage, false to keep it.
	 * @param {Function} callback Callback method.
	 */
	'boolean, function': function (removePersistent, callback) {
		var self = this;

		if (!this.isDropped()) {
			// Remove persistent storage
			if (removePersistent) {
				if (this._name) {
					if (this._db) {
						// Drop the collection data from storage
						this._db.persist.drop(this._db._name + '-' + this._name, function () {
							self._db.persist.drop(self._db._name + '-' + self._name + '-metaData', callback);
						});

						return CollectionDrop.call(this);
					} else {
						if (callback) { callback('Cannot drop a collection\'s persistent storage when the collection is not attached to a database!'); }
					}
				} else {
					if (callback) { callback('Cannot drop a collection\'s persistent storage when no name assigned to collection!'); }
				}
			} else {
				// Call the original method
				return CollectionDrop.call(this, callback);
			}
		}
	}
});

/**
 * Saves an entire collection's data to persistent storage.
 * @param {Function=} callback The method to call when the save function
 * has completed.
 */
Collection.prototype.save = function (callback) {
	var self = this,
		processSave;

	if (self._name) {
		if (self._db) {
			processSave = function () {
				// Save the collection data
				self._db.persist.save(self._db._name + '-' + self._name, self._data, function (err, tableData, tableStats) {
					if (err) {
						if (callback) { callback(err); }
						return;
					}

					self._db.persist.save(self._db._name + '-' + self._name + '-metaData', self.metaData(), function (err, metaData, metaStats) {
						self.deferEmit('save', tableStats, metaStats, {
							tableData: tableData,
							metaData: metaData,
							tableDataName: self._db._name + '-' + self._name,
							metaDataName: self._db._name + '-' + self._name + '-metaData'
						});

						if (callback) {
							// Defer till the next VM tick to give the VM some breathing room
							// around the persistent data getting into storage.
							setTimeout(function () {
								callback(err, tableStats, metaStats, {
									tableData: tableData,
									metaData: metaData,
									tableDataName: self._db._name + '-' + self._name,
									metaDataName: self._db._name + '-' + self._name + '-metaData'
								});
							}, 1);
						}
					});
				});
			};

			// Check for processing queues
			if (self.isProcessingQueue()) {
				// Hook queue complete to process save
				self.on('queuesComplete', function () {
					processSave();
				});
			} else {
				// Process save immediately
				processSave();
			}
		} else {
			if (callback) { callback('Cannot save a collection that is not attached to a database!'); }
		}
	} else {
		if (callback) { callback('Cannot save a collection with no assigned name!'); }
	}
};

/**
 * Determines the byte size of a persisted collection
 * @param {persistedSizeCallback} callback The method to call when the size check is complete
 */
Collection.prototype.persistedSize = function (callback) {
    var self = this;

    if (self._name) {
        if (self._db) {
        	self._db.persist.persistedSize(self._db._name + '-' + self._name, callback);
        } else {
            if (callback) {
                callback('Cannot determine persisted size of a collection that is not attached to a database!');
            }
        }
    } else {
        if (callback) { callback('Cannot determine persisted size of a collection with no assigned name!'); }
    }

};

/**
 * Loads an entire collection's data from persistent storage.
 * @param {Function=} callback The method to call when the load function
 * has completed.
 */
Collection.prototype.load = function (callback) {
	var self = this;

	if (self._name) {
		if (self._db) {
			// Load the collection data
			self._db.persist.load(self._db._name + '-' + self._name, function (err, data, tableStats) {
				if (!err) {
					// Remove all previous data
					self.remove({}, function () {
						// Now insert the new data
						data = data || [];
						self.insert(data, function () {
							// Now load the collection's metadata
							self._db.persist.load(self._db._name + '-' + self._name + '-metaData', function (err, data, metaStats) {
								if (!err) {
									if (data) {
										self.metaData(data);
									}
								}

								self.deferEmit('load', tableStats, metaStats);
								if (callback) { callback(err, tableStats, metaStats); }
							});
						});
						//self.setData(data);
					});
				} else {
					self.deferEmit('load', tableStats);
					if (callback) { callback(err); }
				}
			});
		} else {
			if (callback) { callback('Cannot load a collection that is not attached to a database!'); }
		}
	} else {
		if (callback) { callback('Cannot load a collection with no assigned name!'); }
	}
};

/**
 * Gets the data that represents this collection for easy storage using
 * a third-party method / plugin instead of using the standard persistent
 * storage system.
 * @param {Function} callback The method to call with the data response.
 */
Collection.prototype.saveCustom = function (callback) {
	var self = this,
		myData = {},
		processSave;

	if (self._name) {
		if (self._db) {
			processSave = function () {
				self.encode(self._data, function (err, data, tableStats) {
					if (!err) {
						myData.data = {
							name: self._db._name + '-' + self._name,
							store: data,
							tableStats: tableStats
						};

						self.encode(self._data, function (err, data, tableStats) {
							if (!err) {
								myData.metaData = {
									name: self._db._name + '-' + self._name + '-metaData',
									store: data,
									tableStats: tableStats
								};

								callback(false, myData);
							} else {
								callback(err);
							}
						});
					} else {
						callback(err);
					}
				});
			};

			// Check for processing queues
			if (self.isProcessingQueue()) {
				// Hook queue complete to process save
				self.on('queuesComplete', function () {
					processSave();
				});
			} else {
				// Process save immediately
				processSave();
			}
		} else {
			if (callback) { callback('Cannot save a collection that is not attached to a database!'); }
		}
	} else {
		if (callback) { callback('Cannot save a collection with no assigned name!'); }
	}
};

/**
 * Loads custom data loaded by a third-party plugin into the collection.
 * @param {Object} myData Data object previously saved by using saveCustom()
 * @param {Function} callback A callback method to receive notification when
 * data has loaded.
 */
Collection.prototype.loadCustom = function (myData, callback) {
	var self = this;

	if (self._name) {
		if (self._db) {
			if (myData.data && myData.data.store) {
				if (myData.metaData && myData.metaData.store) {
					self.decode(myData.data.store, function (err, data, tableStats) {
						if (!err) {
							if (data) {
								// Remove all previous data
								self.remove({});
								self.insert(data);

								self.decode(myData.metaData.store, function (err, data, metaStats) {
									if (!err) {
										if (data) {
											self.metaData(data);

											if (callback) { callback(err, tableStats, metaStats); }
										}
									} else {
										callback(err);
									}
								});
							}
						} else {
							callback(err);
						}
					});
				} else {
					callback('No "metaData" key found in passed object!');
				}
			} else {
				callback('No "data" key found in passed object!');
			}
		} else {
			if (callback) { callback('Cannot load a collection that is not attached to a database!'); }
		}
	} else {
		if (callback) { callback('Cannot load a collection with no assigned name!'); }
	}
};

// Override the DB init to instantiate the plugin
Db.prototype.init = function () {
	DbInit.apply(this, arguments);
	this.persist = new Persist(this);
};

Db.prototype.load = new Overload({
	/**
	 * Loads an entire database's data from persistent storage.
	 * @name load
	 * @method Db.load
	 * @param {Function=} callback The method to call when the load function
	 * has completed.
	 */
	'function': function (callback) {
		this.$main.call(this, undefined, callback);
	},

	/**
	 * Loads an entire database's data from persistent storage.
	 * @name load
	 * @method Db.load
	 * @param {Object} myData Custom data to load into the collection.
	 * @param {Function} callback The method to call when the load function
	 * has completed.
	 */
	'object, function': function (myData, callback) {
		this.$main.call(this, myData, callback);
	},

	'$main': function (myData, callback) {
		// Loop the collections in the database
		var self = this,
			obj,
			keys,
			keyCount,
			loadCallback,
			index;

		obj = this._collection;
		keys = Object.keys(obj);
		keyCount = keys.length;

		if (keyCount <= 0) {
			return callback(false);
		}

		loadCallback = function (err) {
			if (!err) {
				keyCount--;

				if (keyCount <= 0) {
					self.deferEmit('load');
					if (callback) { callback(false); }
				}
			} else {
				if (callback) { callback(err); }
			}
		};

		for (index in obj) {
			if (obj.hasOwnProperty(index)) {
				// Call the collection load method
				if (!myData) {
					obj[index].load(loadCallback);
				} else {
					obj[index].loadCustom(myData, loadCallback);
				}
			}
		}
	}
});

Db.prototype.save = new Overload({
	/**
	 * Saves an entire database's data to persistent storage.
	 * @name save
	 * @method Db.save
	 * @param {Function=} callback The method to call when the save function
	 * has completed.
	 */
	'function': function (callback) {
		this.$main.call(this, {}, callback);
	},

	/**
	 * Saves an entire database's data to persistent storage.
	 * @name save
	 * @method Db.save
	 * @param {Object} options The options object.
	 * @param {Function} callback The method to call when the save function
	 * has completed.
	 */
	'object, function': function (options, callback) {
		this.$main.call(this, options, callback);
	},

	'$main': function (options, callback) {
		// Loop the collections in the database
		var self = this,
			obj,
			keys,
			keyCount,
			saveCallback,
			index;

		obj = this._collection;
		keys = Object.keys(obj);
		keyCount = keys.length;

		if (keyCount <= 0) {
			return callback(false);
		}

		saveCallback = function (err) {
			if (!err) {
				keyCount--;

				if (keyCount <= 0) {
					self.deferEmit('save');
					if (callback) {
						callback(false);
					}
				}
			} else {
				if (callback) {
					callback(err);
				}
			}
		};

		for (index in obj) {
			if (obj.hasOwnProperty(index)) {
				// Call the collection save method
				if (!options.custom) {
					obj[index].save(saveCallback);
				} else {
					obj[index].saveCustom(saveCallback);
				}
			}
		}
	}
});

/**
 * Determines the byte size of a persisted DB
 * @param {persistedSizeCallback} callback The method to call when the size check is complete
 */
Db.prototype.persistedSize = function(callback) {
    this.persist.persistedSize(this, callback);
};

Shared.finishModule('Persist');
module.exports = Persist;