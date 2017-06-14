"use strict";

// Import external names locally
var Shared,
	Db,
	Collection,
	CollectionGroup,
	CollectionInit,
	DbInit,
	ReactorIO,
	ActiveBucket,
	Overload = require('./Overload'),
	Path,
	sharedPathSolver;

Shared = require('./Shared');

/**
 * Creates a new view instance.
 * @param {String} name The name of the view.
 * @param {Object=} query The view's query.
 * @param {Object=} options An options object.
 * @constructor
 */
var View = function (name, query, options) {
	this.init.apply(this, arguments);
};

Shared.addModule('View', View);
Shared.mixin(View.prototype, 'Mixin.Common');
Shared.mixin(View.prototype, 'Mixin.Matching');
Shared.mixin(View.prototype, 'Mixin.ChainReactor');
Shared.mixin(View.prototype, 'Mixin.Constants');
//Shared.mixin(View.prototype, 'Mixin.Triggers');
Shared.mixin(View.prototype, 'Mixin.Tags');

Collection = require('./Collection');
CollectionGroup = require('./CollectionGroup');
ActiveBucket = require('./ActiveBucket');
ReactorIO = require('./ReactorIO');
CollectionInit = Collection.prototype.init;
Db = Shared.modules.Db;
DbInit = Db.prototype.init;
Path = Shared.modules.Path;
sharedPathSolver = new Path();

View.prototype.init = function (name, query, options) {
	var self = this;

	this.sharedPathSolver = sharedPathSolver;
	this._name = name;
	this._listeners = {};
	this._querySettings = {};
	this._debug = {};

	this.query(query, options, false);

	this._collectionDroppedWrap = function () {
		self._collectionDropped.apply(self, arguments);
	};

	this._data = new Collection(this.name() + '_internal');
};

/**
 * This reactor IO node is given data changes from source data and
 * then acts as a firewall process between the source and view data.
 * Data needs to meet the requirements this IO node imposes before
 * the data is passed down the reactor chain (to the view). This
 * allows us to intercept data changes from the data source and act
 * on them such as applying transforms, checking the data matches
 * the view's query, applying joins to the data etc before sending it
 * down the reactor chain via the this.chainSend() calls.
 *
 * Update packets are especially complex to handle because an update
 * on the underlying source data could translate into an insert,
 * update or remove call on the view. Take a scenario where the view's
 * query limits the data seen from the source. If the source data is
 * updated and the data now falls inside the view's query limitations
 * the data is technically now an insert on the view, not an update.
 * The same is true in reverse where the update becomes a remove. If
 * the updated data already exists in the view and will still exist
 * after the update operation then the update can remain an update.
 * @param {Object} chainPacket The chain reactor packet representing the
 * data operation that has just been processed on the source data.
 * @param {View} self The reference to the view we are operating for.
 * @private
 */
View.prototype._handleChainIO = function (chainPacket, self) {
	var type = chainPacket.type,
		hasActiveJoin,
		hasActiveQuery,
		hasTransformIn,
		sharedData;

	// NOTE: "self" in this context is the view instance.

	// NOTE: "this" in this context is the ReactorIO node sitting in
	// between the source (sender) and the destination (listener) and
	// in this case the source is the view's "from" data source and the
	// destination is the view's _data collection. This means
	// that "this.chainSend()" is asking the ReactorIO node to send the
	// packet on to the destination listener.

	// EARLY EXIT: Check that the packet is not a CRUD operation
	if (type !== 'setData' && type !== 'insert' && type !== 'update' && type !== 'remove') {
		// This packet is NOT a CRUD operation packet so exit early!

		// Returning false informs the chain reactor to continue propagation
		// of the chain packet down the graph tree
		return false;
	}

	// We only need to check packets under three conditions

	// 1) We have a limiting query on the view "active query",
	// 2) We have a query options with a $join clause on the view "active join"
	// 3) We have a transformIn operation registered on the view.

	// If none of these conditions exist we can just allow the chain
	// packet to proceed as normal
	hasActiveJoin = Boolean(self._querySettings.options && self._querySettings.options.$join);
	hasActiveQuery = Boolean(self._querySettings.query);
	hasTransformIn = self._data._transformIn !== undefined;

	// EARLY EXIT: Check for any complex operation flags and if none
	// exist, send the packet on and exit early
	if (!hasActiveJoin && !hasActiveQuery && !hasTransformIn) {
		// We don't have any complex operation flags so exit early!

		// Returning false informs the chain reactor to continue propagation
		// of the chain packet down the graph tree
		return false;
	}

	// We have either an active query, active join or a transformIn
	// function registered on the view

	// We create a shared data object here so that the disparate method
	// calls can share data with each other via this object whilst
	// still remaining separate methods to keep code relatively clean.
	sharedData = {
		dataArr: [],
		removeArr: []
	};

	// Check the packet type to get the data arrays to work on
	if (chainPacket.type === 'insert') {
		// Check if the insert data is an array
		if (chainPacket.data.dataSet instanceof Array) {
			// Use the insert data array
			sharedData.dataArr = chainPacket.data.dataSet;
		} else {
			// Generate an array from the single insert object
			sharedData.dataArr = [chainPacket.data.dataSet];
		}
	} else if (chainPacket.type === 'update') {
		// Use the dataSet array
		sharedData.dataArr = chainPacket.data.dataSet;
	} else if (chainPacket.type === 'remove') {
		if (chainPacket.data.dataSet instanceof Array) {
			// Use the remove data array
			sharedData.removeArr = chainPacket.data.dataSet;
		} else {
			// Generate an array from the single remove object
			sharedData.removeArr = [chainPacket.data.dataSet];
		}
	}

	// Safety check
	if (!(sharedData.dataArr instanceof Array)) {
		// This shouldn't happen, let's log it
		console.warn('WARNING: dataArr being processed by chain reactor in View class is inconsistent!');
		sharedData.dataArr = [];
	}

	if (!(sharedData.removeArr instanceof Array)) {
		// This shouldn't happen, let's log it
		console.warn('WARNING: removeArr being processed by chain reactor in View class is inconsistent!');
		sharedData.removeArr = [];
	}

	// We need to operate in this order:

	// 1) Check if there is an active join - active joins are operated
	// against the SOURCE data. The joined data can potentially be
	// utilised by any active query or transformIn so we do this step first.

	// 2) Check if there is an active query - this is a query that is run
	// against the SOURCE data after any active joins have been resolved
	// on the source data. This allows an active query to operate on data
	// that would only exist after an active join has been executed.
	// If the source data does not fall inside the limiting factors of the
	// active query then we add it to a removal array. If it does fall
	// inside the limiting factors when we add it to an upsert array. This
	// is because data that falls inside the query could end up being
	// either new data or updated data after a transformIn operation.

	// 3) Check if there is a transformIn function. If a transformIn function
	// exist we run it against the data after doing any active join and
	// active query.
	if (hasActiveJoin) {
		if (this.debug()) {
			console.time(this.logIdentifier() + ' :: _handleChainIO_ActiveJoin');
		}
		self._handleChainIO_ActiveJoin(chainPacket, sharedData);
		if (this.debug()) {
			console.timeEnd(this.logIdentifier() + ' :: _handleChainIO_ActiveJoin');
		}
	}

	if (hasActiveQuery) {
		if (this.debug()) {
			console.time(this.logIdentifier() + ' :: _handleChainIO_ActiveQuery');
		}
		self._handleChainIO_ActiveQuery(chainPacket, sharedData);
		if (this.debug()) {
			console.timeEnd(this.logIdentifier() + ' :: _handleChainIO_ActiveQuery');
		}
	}

	if (hasTransformIn) {
		if (this.debug()) {
			console.time(this.logIdentifier() + ' :: _handleChainIO_TransformIn');
		}
		self._handleChainIO_TransformIn(chainPacket, sharedData);
		if (this.debug()) {
			console.timeEnd(this.logIdentifier() + ' :: _handleChainIO_TransformIn');
		}
	}

	// Check if we still have data to operate on and exit
	// if there is none left
	if (!sharedData.dataArr.length && !sharedData.removeArr.length) {
		// There is no more data to operate on, exit without
		// sending any data down the chain reactor (return true
		// will tell reactor to exit without continuing)!
		return true;
	}

	// Grab the public data collection's primary key
	sharedData.pk = self._data.primaryKey();

	// We still have data left, let's work out how to handle it
	// first let's loop through the removals as these are easy
	if (sharedData.removeArr.length) {
		if (this.debug()) {
			console.time(this.logIdentifier() + ' :: _handleChainIO_RemovePackets');
		}
		self._handleChainIO_RemovePackets(this, chainPacket, sharedData);
		if (this.debug()) {
			console.timeEnd(this.logIdentifier() + ' :: _handleChainIO_RemovePackets');
		}
	}

	if (sharedData.dataArr.length) {
		if (this.debug()) {
			console.time(this.logIdentifier() + ' :: _handleChainIO_UpsertPackets');
		}
		self._handleChainIO_UpsertPackets(this, chainPacket, sharedData);
		if (this.debug()) {
			console.timeEnd(this.logIdentifier() + ' :: _handleChainIO_UpsertPackets');
		}
	}

	// Now return true to tell the chain reactor not to propagate
	// the data itself as we have done all that work here
	return true;
};

View.prototype._handleChainIO_ActiveJoin = function (chainPacket, sharedData) {
	var dataArr = sharedData.dataArr,
		removeArr;

	// Since we have an active join, all we need to do is operate
	// the join clause on each item in the packet's data array.
	removeArr = this.applyJoin(dataArr, this._querySettings.options.$join, {}, {});

	// Now that we've run our join keep in mind that joins can exclude data
	// if there is no matching joined data and the require: true clause in
	// the join options is enabled. This means we have to store a removal
	// array that tells us which items from the original data we sent to
	// join did not match the join data and were set with a require flag.

	// Now that we have our array of items to remove, let's run through the
	// original data and remove them from there.
	this.spliceArrayByIndexList(dataArr, removeArr);

	// Make sure we add any items we removed to the shared removeArr
	sharedData.removeArr = sharedData.removeArr.concat(removeArr);
};

View.prototype._handleChainIO_ActiveQuery = function (chainPacket, sharedData) {
	var self = this,
		dataArr = sharedData.dataArr,
		i;

	// Now we need to run the data against the active query to
	// see if the data should be in the final data list or not,
	// so we use the _match method.

	// Loop backwards so we can safely splice from the array
	// while we are looping
	for (i = dataArr.length - 1; i >= 0; i--) {
		if (!self._match(dataArr[i], self._querySettings.query, self._querySettings.options, 'and', {})) {
			// The data didn't match the active query, add it
			// to the shared removeArr
			sharedData.removeArr.push(dataArr[i]);

			// Now remove it from the shared dataArr
			dataArr.splice(i, 1);
		}
	}
};

View.prototype._handleChainIO_TransformIn = function (chainPacket, sharedData) {
	var self = this,
		dataArr = sharedData.dataArr,
		removeArr = sharedData.removeArr,
		dataIn = self._data._transformIn,
		i;

	// At this stage we take the remaining items still left in the data
	// array and run our transformIn method on each one, modifying it
	// from what it was to what it should be on the view. We also have
	// to run this on items we want to remove too because transforms can
	// affect primary keys and therefore stop us from identifying the
	// correct items to run removal operations on.

	// It is important that these are transformed BEFORE they are passed
	// to the CRUD methods because we use the CU data to check the position
	// of the item in the array and that can only happen if it is already
	// pre-transformed. The removal stuff also needs pre-transformed
	// because ids can be modified by a transform.
	for (i = 0; i < dataArr.length; i++) {
		// Assign the new value
		dataArr[i] = dataIn(dataArr[i]);
	}

	for (i = 0; i < removeArr.length; i++) {
		// Assign the new value
		removeArr[i] = dataIn(removeArr[i]);
	}
};

View.prototype._handleChainIO_RemovePackets = function (ioObj, chainPacket, sharedData) {
	var $or = [],
		pk = sharedData.pk,
		removeArr = sharedData.removeArr,
		packet = {
			dataSet: removeArr,
			query: {
				$or: $or
			}
		},
		orObj,
		i;

	for (i = 0; i < removeArr.length; i++) {
		orObj = {};
		orObj[pk] = removeArr[i][pk];

		$or.push(orObj);
	}

	ioObj.chainSend('remove', packet);
};

View.prototype._handleChainIO_UpsertPackets = function (ioObj, chainPacket, sharedData) {
	var data = this._data,
		primaryIndex = data._primaryIndex,
		primaryCrc = data._primaryCrc,
		pk = sharedData.pk,
		dataArr = sharedData.dataArr,
		arrItem,
		insertArr = [],
		updateArr = [],
		query,
		i;

	// Let's work out what type of operation this data should
	// generate between an insert or an update.
	for (i = 0; i < dataArr.length; i++) {
		arrItem = dataArr[i];

		// Check if the data already exists in the data
		if (primaryIndex.get(arrItem[pk])) {
			// Matching item exists, check if the data is the same
			if (primaryCrc.get(arrItem[pk]) !== this.hash(arrItem[pk])) {
				// The document exists in the data collection but data differs, update required
				updateArr.push(arrItem);
			}
		} else {
			// The document is missing from this collection, insert required
			insertArr.push(arrItem);
		}
	}

	if (insertArr.length) {
		ioObj.chainSend('insert', {
			dataSet: insertArr
		});
	}

	if (updateArr.length) {
		for (i = 0; i < updateArr.length; i++) {
			arrItem = updateArr[i];

			query = {};
			query[pk] = arrItem[pk];

			ioObj.chainSend('update', {
				query: query,
				update: arrItem,
				dataSet: [arrItem]
			});
		}
	}
};

/**
 * Executes an insert against the view's underlying data-source.
 * @see Collection::insert()
 */
View.prototype.insert = function () {
	this._from.insert.apply(this._from, arguments);
};

/**
 * Executes an update against the view's underlying data-source.
 * @see Collection::update()
 */
View.prototype.update = function (query, update, options, callback) {
	var finalQuery = {
		$and: [this.query(), query]
	};

	this._from.update.call(this._from, finalQuery, update, options, callback);
};

/**
 * Executes an updateById against the view's underlying data-source.
 * @see Collection::updateById()
 */
View.prototype.updateById = function () {
	this._from.updateById.apply(this._from, arguments);
};

/**
 * Executes a remove against the view's underlying data-source.
 * @see Collection::remove()
 */
View.prototype.remove = function () {
	this._from.remove.apply(this._from, arguments);
};

/**
 * Queries the view data.
 * @see Collection::find()
 * @returns {Array} The result of the find query.
 */
View.prototype.find = function (query, options) {
	return this._data.find(query, options);
};

/**
 * Queries the view data for a single document.
 * @see Collection::findOne()
 * @returns {Object} The result of the find query.
 */
View.prototype.findOne = function (query, options) {
	return this._data.findOne(query, options);
};

/**
 * Queries the view data by specific id.
 * @see Collection::findById()
 * @returns {Array} The result of the find query.
 */
View.prototype.findById = function (id, options) {
	return this._data.findById(id, options);
};

/**
 * Queries the view data in a sub-array.
 * @see Collection::findSub()
 * @returns {Array} The result of the find query.
 */
View.prototype.findSub = function (match, path, subDocQuery, subDocOptions) {
	return this._data.findSub(match, path, subDocQuery, subDocOptions);
};

View.prototype._findSub = function (docArr, path, subDocQuery, subDocOptions) {
	return this._data._findSub(docArr, path, subDocQuery, subDocOptions);
};

/**
 * Queries the view data in a sub-array and returns first match.
 * @see Collection::findSubOne()
 * @returns {Object} The result of the find query.
 */
View.prototype.findSubOne = function (match, path, subDocQuery, subDocOptions) {
	return this._data.findSubOne(match, path, subDocQuery, subDocOptions);
};

View.prototype._findSubOne = function (docArr, path, subDocQuery, subDocOptions) {
	return this._data._findSubOne(docArr, path, subDocQuery, subDocOptions);
};

/**
 * Gets the module's internal data collection.
 * @returns {Collection}
 */
View.prototype.data = function () {
	return this._data;
};

/**
 * Sets the source from which the view will assemble its data.
 * @param {Collection|View} source The source to use to assemble view data.
 * @param {Function=} callback A callback method.
 * @returns {*} If no argument is passed, returns the current value of from,
 * otherwise returns itself for chaining.
 */
View.prototype.from = function (source, callback) {
	var self = this;

	if (source !== undefined) {
		// Check if we have an existing from
		if (this._from) {
			// Remove the listener to the drop event
			this._from.off('drop', this._collectionDroppedWrap);

			// Remove the current reference to the _from since we
			// are about to replace it with a new one
			delete this._from;
		}

		// Check if we have an existing reactor io that links the
		// previous _from source to the view's internal data
		if (this._io) {
			// Drop the io and remove it
			this._io.drop();
			delete this._io;
		}

		// Check if we were passed a source name rather than a
		// reference to a source object
		if (typeof(source) === 'string') {
			// We were passed a name, assume it is a collection and
			// get the reference to the collection of that name
			source = this._db.collection(source);
		}

		// Check if we were passed a reference to a view rather than
		// a collection. Views need to be handled slightly differently
		// since their data is stored in an internal data collection
		// rather than actually being a direct data source themselves.
		if (source.className === 'View') {
			// The source is a view so IO to the internal data collection
			// instead of the view proper
			source = source._data;

			if (this.debug()) {
				console.log(this.logIdentifier() + ' Using internal data "' + source.instanceIdentifier() + '" for IO graph linking');
			}
		}

		// Assign the new data source as the view's _from
		this._from = source;

		// Hook the new data source's drop event so we can unhook
		// it as a data source if it gets dropped. This is important
		// so that we don't run into problems using a dropped source
		// for active data.
		this._from.on('drop', this._collectionDroppedWrap);

		// Create a new reactor IO graph node that intercepts chain packets from the
		// view's _from source and determines how they should be interpreted by
		// this view. See the _handleChainIO() method which does all the chain packet
		// processing for the view.
		this._io = new ReactorIO(this._from, this, function (chainPacket) { return self._handleChainIO.call(this, chainPacket, self); });

		// Set the view's internal data primary key to the same as the
		// current active _from data source
		this._data.primaryKey(source.primaryKey());

		// Do the initial data lookup and populate the view's internal data
		// since at this point we don't actually have any data in the view
		// yet.
		var collData = source.find(this._querySettings.query, this._querySettings.options);
		this._data.setData(collData, {}, callback);

		// If we have an active query and that query has an $orderBy clause,
		// update our active bucket which allows us to keep track of where
		// data should be placed in our internal data array. This is about
		// ordering of data and making sure that we maintain an ordered array
		// so that if we have data-binding we can place an item in the data-
		// bound view at the correct location. Active buckets use quick-sort
		// algorithms to quickly determine the position of an item inside an
		// existing array based on a sort protocol.
		if (this._querySettings.options && this._querySettings.options.$orderBy) {
			this.rebuildActiveBucket(this._querySettings.options.$orderBy);
		} else {
			this.rebuildActiveBucket();
		}

		return this;
	}

	return this._from;
};

/**
 * The chain reaction handler method for the view.
 * @param {Object} chainPacket The chain reaction packet to handle.
 * @private
 */
View.prototype._chainHandler = function (chainPacket) {
	var //self = this,
		arr,
		count,
		index,
		insertIndex,
		updates,
		primaryKey,
		item,
		currentIndex;

	if (this.debug()) {
		console.log(this.logIdentifier() + ' Received chain reactor data: ' + chainPacket.type);
	}

	switch (chainPacket.type) {
		case 'setData':
			if (this.debug()) {
				console.log(this.logIdentifier() + ' Setting data in underlying (internal) view collection "' + this._data.name() + '"');
			}

			// Get the new data from our underlying data source sorted as we want
			var collData = this._from.find(this._querySettings.query, this._querySettings.options);
			this._data.setData(collData);

			// Rebuild active bucket as well
			this.rebuildActiveBucket(this._querySettings.options);
			break;

		case 'insert':
			if (this.debug()) {
				console.log(this.logIdentifier() + ' Inserting some data into underlying (internal) view collection "' + this._data.name() + '"');
			}

			// Decouple the data to ensure we are working with our own copy
			chainPacket.data.dataSet = this.decouple(chainPacket.data.dataSet);

			// Make sure we are working with an array
			if (!(chainPacket.data.dataSet instanceof Array)) {
				chainPacket.data.dataSet = [chainPacket.data.dataSet];
			}

			if (this._querySettings.options && this._querySettings.options.$orderBy) {
				// Loop the insert data and find each item's index
				arr = chainPacket.data.dataSet;
				count = arr.length;

				for (index = 0; index < count; index++) {
					insertIndex = this._activeBucket.insert(arr[index]);
					this._data._insertHandle(arr[index], insertIndex);
				}
			} else {
				// Set the insert index to the passed index, or if none, the end of the view data array
				insertIndex = this._data._data.length;
				this._data._insertHandle(chainPacket.data.dataSet, insertIndex);
			}
			break;

		case 'update':
			if (this.debug()) {
				console.log(this.logIdentifier() + ' Updating some data in underlying (internal) view collection "' + this._data.name() + '"');
			}

			primaryKey = this._data.primaryKey();

			// Do the update
			updates = this._data._handleUpdate(
				chainPacket.data.query,
				chainPacket.data.update,
				chainPacket.data.options
			);

			if (this._querySettings.options && this._querySettings.options.$orderBy) {
				// TODO: This would be a good place to improve performance by somehow
				// TODO: inspecting the change that occurred when update was performed
				// TODO: above and determining if it affected the order clause keys
				// TODO: and if not, skipping the active bucket updates here

				// Loop the updated items and work out their new sort locations
				count = updates.length;
				for (index = 0; index < count; index++) {
					item = updates[index];

					// Remove the item from the active bucket (via it's id)
					currentIndex = this._activeBucket.remove(item);

					// Get the current location of the item
					//currentIndex = this._data._data.indexOf(item);

					// Add the item back in to the active bucket
					insertIndex = this._activeBucket.insert(item);

					if (currentIndex !== insertIndex) {
						// Move the updated item to the new index
						this._data._updateSpliceMove(this._data._data, currentIndex, insertIndex);
					}
				}
			}
			break;

		case 'remove':
			if (this.debug()) {
				console.log(this.logIdentifier() + ' Removing some data from underlying (internal) view collection "' + this._data.name() + '"');
			}

			this._data.remove(chainPacket.data.query, chainPacket.options);

			if (this._querySettings.options && this._querySettings.options.$orderBy) {
				// Loop the dataSet and remove the objects from the ActiveBucket
				arr = chainPacket.data.dataSet;
				count = arr.length;

				for (index = 0; index < count; index++) {
					this._activeBucket.remove(arr[index]);
				}
			}
			break;

		default:
			break;
	}
};

/**
 * Handles when an underlying collection the view is using as a data
 * source is dropped.
 * @param {Collection} collection The collection that has been dropped.
 * @private
 */
View.prototype._collectionDropped = function (collection) {
	if (collection) {
		// Collection was dropped, remove from view
		delete this._from;
	}
};

/**
 * Creates an index on the view.
 * @see Collection::ensureIndex()
 * @returns {*}
 */
View.prototype.ensureIndex = function () {
	return this._data.ensureIndex.apply(this._data, arguments);
};

/**

 /**
 * Listens for an event.
 * @see Mixin.Events::on()
 */
View.prototype.on = function () {
	return this._data.on.apply(this._data, arguments);
};

/**
 * Cancels an event listener.
 * @see Mixin.Events::off()
 */
View.prototype.off = function () {
	return this._data.off.apply(this._data, arguments);
};

/**
 * Emits an event.
 * @see Mixin.Events::emit()
 */
View.prototype.emit = function () {
	return this._data.emit.apply(this._data, arguments);
};

/**
 * Emits an event.
 * @see Mixin.Events::deferEmit()
 */
View.prototype.deferEmit = function () {
	return this._data.deferEmit.apply(this._data, arguments);
};

/**
 * Find the distinct values for a specified field across a single collection and
 * returns the results in an array.
 * @param {String} key The field path to return distinct values for e.g. "person.name".
 * @param {Object=} query The query to use to filter the documents used to return values from.
 * @param {Object=} options The query options to use when running the query.
 * @returns {Array}
 */
View.prototype.distinct = function (key, query, options) {
	return this._data.distinct(key, query, options);
};

/**
 * Gets the primary key for this view from the assigned collection.
 * @see Collection::primaryKey()
 * @returns {String}
 */
View.prototype.primaryKey = function () {
	return this._data.primaryKey();
};

/**
 * @see Mixin.Triggers::addTrigger()
 */
View.prototype.addTrigger = function () {
	return this._data.addTrigger.apply(this._data, arguments);
};

/**
 * @see Mixin.Triggers::removeTrigger()
 */
View.prototype.removeTrigger = function () {
	return this._data.removeTrigger.apply(this._data, arguments);
};

/**
 * @see Mixin.Triggers::ignoreTriggers()
 */
View.prototype.ignoreTriggers = function () {
	return this._data.ignoreTriggers.apply(this._data, arguments);
};

/**
 * @see Mixin.Triggers::addLinkIO()
 */
View.prototype.addLinkIO = function () {
	return this._data.addLinkIO.apply(this._data, arguments);
};

/**
 * @see Mixin.Triggers::removeLinkIO()
 */
View.prototype.removeLinkIO = function () {
	return this._data.removeLinkIO.apply(this._data, arguments);
};

/**
 * @see Mixin.Triggers::willTrigger()
 */
View.prototype.willTrigger = function () {
	return this._data.willTrigger.apply(this._data, arguments);
};

/**
 * @see Mixin.Triggers::processTrigger()
 */
View.prototype.processTrigger = function () {
	return this._data.processTrigger.apply(this._data, arguments);
};

/**
 * @see Mixin.Triggers::_triggerIndexOf()
 */
View.prototype._triggerIndexOf = function () {
	return this._data._triggerIndexOf.apply(this._data, arguments);
};

/**
 * Drops a view and all it's stored data from the database.
 * @returns {boolean} True on success, false on failure.
 */
View.prototype.drop = function (callback) {
	if (!this.isDropped()) {
		if (this._from) {
			this._from.off('drop', this._collectionDroppedWrap);
			this._from._removeView(this);
		}

		if (this.debug() || (this._db && this._db.debug())) {
			console.log(this.logIdentifier() + ' Dropping');
		}

		this._state = 'dropped';

		// Clear io and chains
		if (this._io) {
			this._io.drop();
		}

		// Drop the view's internal collection
		if (this._data) {
			this._data.drop();
		}

		if (this._db && this._name) {
			delete this._db._view[this._name];
		}

		this.emit('drop', this);

		if (callback) { callback(false, true); }

		delete this._chain;
		delete this._from;
		delete this._data;
		delete this._io;
		delete this._listeners;
		delete this._querySettings;
		delete this._db;

		return true;
	}

	return false;
};

/**
 * Gets / sets the query object and query options that the view uses
 * to build it's data set. This call modifies both the query and
 * query options at the same time.
 * @param {Object=} query The query to set.
 * @param {Boolean=} options The query options object.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 * @deprecated Use query(<query>, <options>, <refresh>) instead. Query
 * now supports being presented with multiple different variations of
 * arguments.
 */
View.prototype.queryData = function (query, options, refresh) {
	if (query !== undefined) {
		this._querySettings.query = query;

		if (query.$findSub && !query.$findSub.$from) {
			query.$findSub.$from = this._data.name();
		}

		if (query.$findSubOne && !query.$findSubOne.$from) {
			query.$findSubOne.$from = this._data.name();
		}
	}

	if (options !== undefined) {
		this._querySettings.options = options;
	}

	if (query !== undefined || options !== undefined) {
		if (refresh === undefined || refresh === true) {
			this.refresh();
		}
	}

	if (query !== undefined) {
		this.emit('queryChange', query);
	}

	if (options !== undefined) {
		this.emit('queryOptionsChange', options);
	}

	if (query !== undefined || options !== undefined) {
		return this;
	}

	return this.decouple(this._querySettings);
};

/**
 * Add data to the existing query.
 * @param {Object} obj The data whose keys will be added to the existing
 * query object.
 * @param {Boolean} overwrite Whether or not to overwrite data that already
 * exists in the query object. Defaults to true.
 * @param {Boolean=} refresh Whether or not to refresh the view data set
 * once the operation is complete. Defaults to true.
 */
View.prototype.queryAdd = function (obj, overwrite, refresh) {
	this._querySettings.query = this._querySettings.query || {};

	var query = this._querySettings.query,
		i;

	if (obj !== undefined) {
		// Loop object properties and add to existing query
		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				if (query[i] === undefined || (query[i] !== undefined && overwrite !== false)) {
					query[i] = obj[i];
				}
			}
		}
	}

	if (refresh === undefined || refresh === true) {
		this.refresh();
	}

	if (query !== undefined) {
		this.emit('queryChange', query);
	}
};

/**
 * Remove data from the existing query.
 * @param {Object} obj The data whose keys will be removed from the existing
 * query object.
 * @param {Boolean=} refresh Whether or not to refresh the view data set
 * once the operation is complete. Defaults to true.
 */
View.prototype.queryRemove = function (obj, refresh) {
	var query = this._querySettings.query,
		i;

	if (query) {
		if (obj !== undefined) {
			// Loop object properties and add to existing query
			for (i in obj) {
				if (obj.hasOwnProperty(i)) {
					delete query[i];
				}
			}
		}

		if (refresh === undefined || refresh === true) {
			this.refresh();
		}

		if (query !== undefined) {
			this.emit('queryChange', query);
		}
	}
};

/**
 * Gets / sets the query being used to generate the view data. It
 * does not change or modify the view's query options.
 * @param {Object=} query The query to set.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 */
View.prototype.query = new Overload({
	'': function () {
		return this.decouple(this._querySettings.query);
	},

	'object': function (query) {
		return this.$main.call(this, query, undefined, true);
	},

	'*, boolean': function (query, refresh) {
		return this.$main.call(this, query, undefined, refresh);
	},

	'object, object': function (query, options) {
		return this.$main.call(this, query, options, true);
	},

	'*, *, boolean': function (query, options, refresh) {
		return this.$main.call(this, query, options, refresh);
	},

	'$main': function (query, options, refresh) {
		if (query !== undefined) {
			this._querySettings.query = query;

			if (query.$findSub && !query.$findSub.$from) {
				query.$findSub.$from = this._data.name();
			}

			if (query.$findSubOne && !query.$findSubOne.$from) {
				query.$findSubOne.$from = this._data.name();
			}
		}

		if (options !== undefined) {
			this._querySettings.options = options;
		}

		if (query !== undefined || options !== undefined) {
			if (refresh === undefined || refresh === true) {
				this.refresh();
			}
		}

		if (query !== undefined) {
			this.emit('queryChange', query);
		}

		if (options !== undefined) {
			this.emit('queryOptionsChange', options);
		}

		if (query !== undefined || options !== undefined) {
			return this;
		}

		return this.decouple(this._querySettings);
	}
});

/**
 * Gets / sets the orderBy clause in the query options for the view.
 * @param {Object=} val The order object.
 * @returns {*}
 */
View.prototype.orderBy = function (val) {
	if (val !== undefined) {
		var queryOptions = this.queryOptions() || {};
		queryOptions.$orderBy = val;

		this.queryOptions(queryOptions);
		return this;
	}

	return (this.queryOptions() || {}).$orderBy;
};

/**
 * Gets / sets the page clause in the query options for the view.
 * @param {Number=} val The page number to change to (zero index).
 * @returns {*}
 */
View.prototype.page = function (val) {
	if (val !== undefined) {
		var queryOptions = this.queryOptions() || {};

		// Only execute a query options update if page has changed
		if (val !== queryOptions.$page) {
			queryOptions.$page = val;
			this.queryOptions(queryOptions);
		}

		return this;
	}

	return (this.queryOptions() || {}).$page;
};

/**
 * Jump to the first page in the data set.
 * @returns {*}
 */
View.prototype.pageFirst = function () {
	return this.page(0);
};

/**
 * Jump to the last page in the data set.
 * @returns {*}
 */
View.prototype.pageLast = function () {
	var pages = this.cursor().pages,
		lastPage = pages !== undefined ? pages : 0;

	return this.page(lastPage - 1);
};

/**
 * Move forward or backwards in the data set pages by passing a positive
 * or negative integer of the number of pages to move.
 * @param {Number} val The number of pages to move.
 * @returns {*}
 */
View.prototype.pageScan = function (val) {
	if (val !== undefined) {
		var pages = this.cursor().pages,
			queryOptions = this.queryOptions() || {},
			currentPage = queryOptions.$page !== undefined ? queryOptions.$page : 0;

		currentPage += val;

		if (currentPage < 0) {
			currentPage = 0;
		}

		if (currentPage >= pages) {
			currentPage = pages - 1;
		}

		return this.page(currentPage);
	}
};

/**
 * Gets / sets the query options used when applying sorting etc to the
 * view data set.
 * @param {Object=} options An options object.
 * @param {Boolean=} refresh Whether to refresh the view data after
 * this operation. Defaults to true.
 * @returns {*}
 */
View.prototype.queryOptions = function (options, refresh) {
	if (options !== undefined) {
		this._querySettings.options = options;
		if (options.$decouple === undefined) { options.$decouple = true; }

		if (refresh === undefined || refresh === true) {
			this.refresh();
		} else {
			// TODO: This could be wasteful if the previous options $orderBy was identical, do a hash and check first!
			this.rebuildActiveBucket(options.$orderBy);
		}

		if (options !== undefined) {
			this.emit('queryOptionsChange', options);
		}

		return this;
	}

	return this._querySettings.options;
};

/**
 * Clears the existing active bucket and builds a new one based
 * on the passed orderBy object (if one is passed).
 * @param {Object=} orderBy The orderBy object describing how to
 * order any data.
 */
View.prototype.rebuildActiveBucket = function (orderBy) {
	if (orderBy) {
		var arr = this._data._data,
			arrCount = arr.length;

		// Build a new active bucket
		this._activeBucket = new ActiveBucket(orderBy);
		this._activeBucket.primaryKey(this._data.primaryKey());

		// Loop the current view data and add each item
		for (var i = 0; i < arrCount; i++) {
			this._activeBucket.insert(arr[i]);
		}
	} else {
		// Remove any existing active bucket
		delete this._activeBucket;
	}
};

/**
 * Refreshes the view data such as ordering etc.
 */
View.prototype.refresh = function () {
	var self = this,
		refreshResults,
		joinArr,
		i, k;

	if (this._from) {
		// Clear the private data collection which will propagate to the public data
		// collection automatically via the chain reactor node between them
		this._data.remove();

		// Grab all the data from the underlying data source
		refreshResults = this._from.find(this._querySettings.query, this._querySettings.options);
		this.cursor(refreshResults.$cursor);

		// Insert the underlying data into the private data collection
		this._data.insert(refreshResults);

		// Store the current cursor data
		this._data._data.$cursor = refreshResults.$cursor;
	}

	if (this._querySettings && this._querySettings.options && this._querySettings.options.$join && this._querySettings.options.$join.length) {
		// Define the change handler method
		self.__joinChange = self.__joinChange || function () {
			self._joinChange();
		};

		// Check for existing join collections
		if (this._joinCollections && this._joinCollections.length) {
			// Loop the join collections and remove change listeners
			// Loop the collections and hook change events
			for (i = 0; i < this._joinCollections.length; i++) {
				this._db.collection(this._joinCollections[i]).off('immediateChange', self.__joinChange);
			}
		}

		// Now start hooking any new / existing joins
		joinArr = this._querySettings.options.$join;
		this._joinCollections = [];

		// Loop the joined collections and hook change events
		for (i = 0; i < joinArr.length; i++) {
			for (k in joinArr[i]) {
				if (joinArr[i].hasOwnProperty(k)) {
					this._joinCollections.push(k);
				}
			}
		}

		if (this._joinCollections.length) {
			// Loop the collections and hook change events
			for (i = 0; i < this._joinCollections.length; i++) {
				this._db.collection(this._joinCollections[i]).on('immediateChange', self.__joinChange);
			}
		}
	}

	if (this._querySettings.options && this._querySettings.options.$orderBy) {
		this.rebuildActiveBucket(this._querySettings.options.$orderBy);
	} else {
		this.rebuildActiveBucket();
	}

	return this;
};

/**
 * Handles when a change has occurred on a collection that is joined
 * by query to this view.
 * @param objName
 * @param objType
 * @private
 */
View.prototype._joinChange = function (objName, objType) {
	this.emit('joinChange');

	// TODO: This is a really dirty solution because it will require a complete
	// TODO: rebuild of the view data. We need to implement an IO handler to
	// TODO: selectively update the data of the view based on the joined
	// TODO: collection data operation.
	// FIXME: This isnt working, major performance killer, invest in some IO from chain reactor to make this a targeted call
	this.refresh();
};

/**
 * Returns the number of documents currently in the view.
 * @returns {Number}
 */
View.prototype.count = function () {
	return this._data.count.apply(this._data, arguments);
};

// Call underlying
View.prototype.subset = function () {
	return this._data.subset.apply(this._data, arguments);
};

/**
 * Takes the passed data and uses it to set transform methods and globally
 * enable or disable the transform system for the view.
 * @param {Object} obj The new transform system settings "enabled", "dataIn"
 * and "dataOut":
 * {
 * 	"enabled": true,
 * 	"dataIn": function (data) { return data; },
 * 	"dataOut": function (data) { return data; }
 * }
 * @returns {*}
 */
View.prototype.transform = function (obj) {
	var currentSettings,
		newSettings;

	currentSettings = this._data.transform();
	this._data.transform(obj);
	newSettings = this._data.transform();

	// Check if transforms are enabled, a dataIn method is set and these
	// settings did not match the previous transform settings
	if (newSettings.enabled && newSettings.dataIn && (currentSettings.enabled !== newSettings.enabled || currentSettings.dataIn !== newSettings.dataIn)) {
		// The data in the view is now stale, refresh it
		this.refresh();
	}

	return newSettings;
};

/**
 * Executes a method against each document that matches query and returns an
 * array of documents that may have been modified by the method.
 * @param {Object} query The query object.
 * @param {Function} func The method that each document is passed to. If this method
 * returns false for a particular document it is excluded from the results.
 * @param {Object=} options Optional options object.
 * @returns {Array}
 */
View.prototype.filter = function (query, func, options) {
	return this._data.filter(query, func, options);
};

/**
 * Returns the non-transformed data the view holds as a collection
 * reference.
 * @return {Collection} The non-transformed collection reference.
 */
View.prototype.data = function () {
	return this._data;
};

/**
 * @see Collection.indexOf
 * @returns {*}
 */
View.prototype.indexOf = function () {
	return this._data.indexOf.apply(this._data, arguments);
};

/**
 * Gets / sets the db instance this class instance belongs to.
 * @param {Db=} db The db instance.
 * @memberof View
 * @returns {*}
 */
Shared.synthesize(View.prototype, 'db', function (db) {
	if (db) {
		this._data.db(db);

		// Apply the same debug settings
		this.debug(db.debug());
		this._data.debug(db.debug());
	}

	return this.$super.apply(this, arguments);
});

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(View.prototype, 'state');

/**
 * Gets / sets the current name.
 * @param {String=} val The new name to set.
 * @returns {*}
 */
Shared.synthesize(View.prototype, 'name');

/**
 * Gets / sets the current cursor.
 * @param {String=} val The new cursor to set.
 * @returns {*}
 */
Shared.synthesize(View.prototype, 'cursor', function (val) {
	if (val === undefined) {
		return this._cursor || {};
	}

	this.$super.apply(this, arguments);
});

// Extend collection with view init
Collection.prototype.init = function () {
	this._view = [];
	CollectionInit.apply(this, arguments);
};

/**
 * Creates a view and assigns the collection as its data source.
 * @param {String} name The name of the new view.
 * @param {Object} query The query to apply to the new view.
 * @param {Object} options The options object to apply to the view.
 * @returns {*}
 */
Collection.prototype.view = function (name, query, options) {
	if (this._db && this._db._view ) {
		if (!this._db._view[name]) {
			var view = new View(name, query, options)
				.db(this._db)
				.from(this);

			this._view = this._view || [];
			this._view.push(view);

			return view;
		} else {
			throw(this.logIdentifier() + ' Cannot create a view using this collection because a view with this name already exists: ' + name);
		}
	}
};

/**
 * Adds a view to the internal view lookup.
 * @param {View} view The view to add.
 * @returns {Collection}
 * @private
 */
Collection.prototype._addView = CollectionGroup.prototype._addView = function (view) {
	if (view !== undefined) {
		this._view.push(view);
	}

	return this;
};

/**
 * Removes a view from the internal view lookup.
 * @param {View} view The view to remove.
 * @returns {Collection}
 * @private
 */
Collection.prototype._removeView = CollectionGroup.prototype._removeView = function (view) {
	if (view !== undefined) {
		var index = this._view.indexOf(view);
		if (index > -1) {
			this._view.splice(index, 1);
		}
	}

	return this;
};

// Extend DB with views init
Db.prototype.init = function () {
	this._view = {};
	DbInit.apply(this, arguments);
};

/**
 * Gets a view by it's name.
 * @param {String} name The name of the view to retrieve.
 * @returns {*}
 */
Db.prototype.view = function (name) {
	var self = this;

	// Handle being passed an instance
	if (name instanceof View) {
		return name;
	}

	if (this._view[name]) {
		return this._view[name];
	}

	if (this.debug() || (this._db && this._db.debug())) {
		console.log(this.logIdentifier() + ' Creating view ' + name);
	}

	this._view[name] = new View(name).db(this);

	self.deferEmit('create', self._view[name], 'view', name);

	return this._view[name];
};

/**
 * Determine if a view with the passed name already exists.
 * @param {String} name The name of the view to check for.
 * @returns {boolean}
 */
Db.prototype.viewExists = function (name) {
	return Boolean(this._view[name]);
};

/**
 * Returns an array of views the DB currently has.
 * @returns {Array} An array of objects containing details of each view
 * the database is currently managing.
 */
Db.prototype.views = function () {
	var arr = [],
		view,
		i;

	for (i in this._view) {
		if (this._view.hasOwnProperty(i)) {
			view = this._view[i];

			arr.push({
				name: i,
				count: view.count(),
				linked: view.isLinked !== undefined ? view.isLinked() : false
			});
		}
	}

	return arr;
};

Shared.finishModule('View');
module.exports = View;