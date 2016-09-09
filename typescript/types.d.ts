/**
 * Creates an always-sorted multi-key bucket that allows ForerunnerDB to
 * know the index that a document will occupy in an array with minimal
 * processing, speeding up things like sorted views.
 * @param {Object} orderBy An order object.
 * @class
 */
declare class ActiveBucket {
   /**
    * Creates an always-sorted multi-key bucket that allows ForerunnerDB to
    * know the index that a document will occupy in an array with minimal
    * processing, speeding up things like sorted views.
    * @param {Object} orderBy An order object.
    * @class
    */
   constructor(orderBy: Object);

   /**
    * Quicksorts a single document into the passed array and
    * returns the index that the document should occupy.
    * @param {Object} obj The document to calculate index for.
    * @param {Array} arr The array the document index will be
    * calculated for.
    * @param {String} item The string key representation of the
    * document whose index is being calculated.
    * @param {Function} fn The comparison function that is used
    * to determine if a document is sorted below or above the
    * document we are calculating the index for.
    * @returns {Number} The index the document should occupy.
    */
   qs(obj: Object, arr: Array, item: String, fn: (() => any)): Number;

   /**
    * Calculates the sort position of an item against another item.
    * @param {Object} sorter An object or instance that contains
    * sortAsc and sortDesc methods.
    * @param {Object} obj The document to compare.
    * @param {String} a The first key to compare.
    * @param {String} b The second key to compare.
    * @returns {Number} Either 1 for sort a after b or -1 to sort
    * a before b.
    * @private
    */
   private _sortFunc(sorter: Object, obj: Object, a: String, b: String): Number;

   /**
    * Inserts a document into the active bucket.
    * @param {Object} obj The document to insert.
    * @returns {Number} The index the document now occupies.
    */
   insert(obj: Object): Number;

   /**
    * Removes a document from the active bucket.
    * @param {Object} obj The document to remove.
    * @returns {boolean} True if the document was removed
    * successfully or false if it wasn't found in the active
    * bucket.
    */
   remove(obj: Object): boolean;

   /**
    * Get the index that the passed document currently occupies
    * or the index it will occupy if added to the active bucket.
    * @param {Object} obj The document to get the index for.
    * @returns {Number} The index.
    */
   index(obj: Object): Number;

   /**
    * The key that represents the passed document.
    * @param {Object} obj The document to get the key for.
    * @returns {String} The document key.
    */
   documentKey(obj: Object): String;

   /**
    * Get the number of documents currently indexed in the active
    * bucket instance.
    * @returns {Number} The number of documents.
    */
   count(): Number;

}

/**
 * Provides angular scope updating functionality to ForerunnerDB. Allows
 * collections and views to provide data to angular and to automatically
 * update angular when data in ForerunnerDB changes.
 * @class Angular
 */
declare class Angular {
   /**
    * Provides angular scope updating functionality to ForerunnerDB. Allows
    * collections and views to provide data to angular and to automatically
    * update angular when data in ForerunnerDB changes.
    * @class Angular
    */
   constructor();

   /**
    * Extends the Collection class with new binding capabilities.
    * @extends Collection
    * @param {Collection} Module The Collection class module.
    * @private
    */
   private static extendCollection(Module: Collection): void;

   /**
    * Extends the View class with new binding capabilities.
    * @extends View
    * @param {View} Module The View class module.
    * @private
    */
   private static extendView(Module: View): void;

   /**
    * Extends the Overview class with new binding capabilities.
    * @extends Overview
    * @param {Overview} Module The Overview class module.
    * @private
    */
   private static extendOverview(Module: Overview): void;

}

/**
 * Provides data-binding functionality to ForerunnerDB. Allows collections
 * and views to link to selectors and automatically generate DOM elements
 * from jsViews (jsRender) templates.
 * @class AutoBind
 */
declare class AutoBind {
   /**
    * Provides data-binding functionality to ForerunnerDB. Allows collections
    * and views to link to selectors and automatically generate DOM elements
    * from jsViews (jsRender) templates.
    * @class AutoBind
    */
   constructor();

   /**
    * Extends the Collection class with new binding capabilities.
    * @extends Collection
    * @param {Collection} Module The Collection class module.
    * @private
    */
   private static extendCollection(Module: Collection): void;

   /**
    * Extends the View class with new binding capabilities.
    * @extends View
    * @param {View} Module The View class module.
    * @private
    */
   private static extendView(Module: View): void;

   /**
    * Extends the Overview class with new binding capabilities.
    * @extends Overview
    * @param {Overview} Module The Overview class module.
    * @private
    */
   private static extendOverview(Module: Overview): void;

   /**
    * Extends the Document class with new binding capabilities.
    * @extends Document
    * @param {Document} Module The Document class module.
    * @private
    */
   private static extendDocument(Module: Document): void;

}

/**
 * Creates a new collection. Collections store multiple documents and
 * handle CRUD against those documents.
 * @constructor
 * @class
 */
declare class Collection {
   /**
    * Creates a new collection. Collections store multiple documents and
    * handle CRUD against those documents.
    * @constructor
    * @class
    */
   constructor();

   /**
    * Creates a link to the DOM between the collection data and the elements
    * in the passed output selector. When new elements are needed or changes
    * occur the passed templateSelector is used to get the template that is
    * output to the DOM.
    * @func link
    * @memberof Collection
    * @param scope
    * @param varName
    * @param {Object=} options Optional extra options.
    * @see unlink
    */
   static link(scope: any, varName: any, options?: Object): void;

   /**
    * Checks if the instance is data-bound to any DOM elements.
    * @func isLinked
    * @memberof Collection
    * @returns {Boolean} True if linked, false if not.
    */
   static isLinked(): Boolean;

   /**
    * Removes a link to the DOM between the collection data and the elements
    * in the passed output selector that was created using the link() method.
    * @func unlink
    * @memberof Collection
    * @param outputTargetSelector
    * @param templateSelector
    */
   static unlink(outputTargetSelector: any, templateSelector: any): void;

   /**
    * Creates a new collection. Collections store multiple documents and
    * handle CRUD against those documents.
    */
   init(): void;

   /**
    * Adds a job id to the async queue to signal to other parts
    * of the application that some async work is currently being
    * done.
    * @param {String} key The id of the async job.
    * @private
    */
   private _asyncPending(key: String): void;

   /**
    * Removes a job id from the async queue to signal to other
    * parts of the application that some async work has been
    * completed. If no further async jobs exist on the queue then
    * the "ready" event is emitted from this collection instance.
    * @param {String} key The id of the async job.
    * @private
    */
   private _asyncComplete(key: String): void;

   /**
    * Get the data array that represents the collection's data.
    * This data is returned by reference and should not be altered outside
    * of the provided CRUD functionality of the collection as doing so
    * may cause unstable index behaviour within the collection.
    * @returns {Array}
    */
   data(): Array;

   /**
    * Drops a collection and all it's stored data from the database.
    * @param {Function=} callback A callback method to call once the
    * operation has completed.
    * @returns {boolean} True on success, false on failure.
    */
   drop(callback?: (() => any)): boolean;

   /**
    * Gets / sets the primary key for this collection.
    * @param {String=} keyName The name of the primary key.
    * @returns {*}
    */
   primaryKey(keyName?: String): any;

   /**
    * Handles insert events and routes changes to binds and views as required.
    * @param {Array} inserted An array of inserted documents.
    * @param {Array} failed An array of documents that failed to insert.
    * @private
    */
   private _onInsert(inserted: Array, failed: Array): void;

   /**
    * Handles update events and routes changes to binds and views as required.
    * @param {Array} items An array of updated documents.
    * @private
    */
   private _onUpdate(items: Array): void;

   /**
    * Handles remove events and routes changes to binds and views as required.
    * @param {Array} items An array of removed documents.
    * @private
    */
   private _onRemove(items: Array): void;

   /**
    * Handles any change to the collection by updating the
    * lastChange timestamp on the collection's metaData. This
    * only happens if the changeTimestamp option is enabled
    * on the collection (it is disabled by default).
    * @private
    */
   private _onChange(): void;

   /**
    * Sets the collection's data to the array / documents passed.  If any
    * data already exists in the collection it will be removed before the
    * new data is set via the remove() method, and the remove event will
    * fire as well.
    * @name setData
    * @method Collection.setData
    * @param {Array|Object} data The array of documents or a single document
    * that will be set as the collections data.
    */
   static setData(data: (Array|Object)): void;

   /**
    * Drops and rebuilds the primary key index for all documents
    * in the collection.
    * @param {Object=} options An optional options object.
    * @private
    */
   private rebuildPrimaryKeyIndex(options?: Object): void;

   /**
    * Checks for a primary key on the document and assigns one if none
    * currently exists.
    * @param {Object} obj The object to check a primary key against.
    * @private
    */
   private ensurePrimaryKey(obj: Object): void;

   /**
    * Clears all data from the collection.
    * @returns {Collection}
    */
   truncate(): Collection;

   /**
    * Inserts a new document or updates an existing document in a
    * collection depending on if a matching primary key exists in
    * the collection already or not.
    *
    * If the document contains a primary key field (based on the
    * collections's primary key) then the database will search for
    * an existing document with a matching id. If a matching
    * document is found, the document will be updated. Any keys that
    * match keys on the existing document will be overwritten with
    * new data. Any keys that do not currently exist on the document
    * will be added to the document.
    *
    * If the document does not contain an id or the id passed does
    * not match an existing document, an insert is performed instead.
    * If no id is present a new primary key id is provided for the
    * document and the document is inserted.
    *
    * @param {Object} obj The document object to upsert or an array
    * containing documents to upsert.
    * @param {Function=} callback Optional callback method.
    * @returns {Object} An object containing two keys, "op" contains
    * either "insert" or "update" depending on the type of operation
    * that was performed and "result" contains the return data from
    * the operation used.
    */
   upsert(obj: Object, callback?: (() => any)): Object;

   /**
    * Executes a method against each document that matches query and returns an
    * array of documents that may have been modified by the method.
    * @param {Object} query The query object.
    * @param {Function} func The method that each document is passed to. If this method
    * returns false for a particular document it is excluded from the results.
    * @param {Object=} options Optional options object.
    * @returns {Array}
    */
   filter(query: Object, func: (() => any), options?: Object): Array;

   /**
    * Executes a method against each document that matches query and then executes
    * an update based on the return data of the method.
    * @param {Object} query The query object.
    * @param {Function} func The method that each document is passed to. If this method
    * returns false for a particular document it is excluded from the update.
    * @param {Object=} options Optional options object passed to the initial find call.
    * @returns {Array}
    */
   filterUpdate(query: Object, func: (() => any), options?: Object): Array;

   /**
    * Modifies an existing document or documents in a collection.
    * This will update all matches for 'query' with the data held
    * in 'update'. It will not overwrite the matched documents
    * with the update document.
    *
    * @param {Object} query The query that must be matched for a
    * document to be operated on.
    * @param {Object} update The object containing updated
    * key/values. Any keys that match keys on the existing document
    * will be overwritten with this data. Any keys that do not
    * currently exist on the document will be added to the document.
    * @param {Object=} options An options object.
    * @param {Function=} callback The callback method to call when
    * the update is complete.
    * @returns {Array} The items that were updated.
    */
   update(query: Object, update: Object, options?: Object, callback?: (() => any)): Array;

   /**
    * Handles the update operation that was initiated by a call to update().
    * @param {Object} query The query that must be matched for a
    * document to be operated on.
    * @param {Object} update The object containing updated
    * key/values. Any keys that match keys on the existing document
    * will be overwritten with this data. Any keys that do not
    * currently exist on the document will be added to the document.
    * @param {Object=} options An options object.
    * @param {Function=} callback The callback method to call when
    * the update is complete.
    * @returns {Array} The items that were updated.
    * @private
    */
   private _handleUpdate(query: Object, update: Object, options?: Object, callback?: (() => any)): Array;

   /**
    * Replaces an existing object with data from the new object without
    * breaking data references. It does this by removing existing keys
    * from the base object and then adding the passed object's keys to
    * the existing base object, thereby maintaining any references to
    * the existing base object but effectively replacing the object with
    * the new one.
    * @param {Object} currentObj The base object to alter.
    * @param {Object} newObj The new object to overwrite the existing one
    * with.
    * @returns {*} Chain.
    * @private
    */
   private _replaceObj(currentObj: Object, newObj: Object): any;

   /**
    * Helper method to update a document via it's id.
    * @param {String} id The id of the document.
    * @param {Object} update The object containing the key/values to
    * update to.
    * @param {Object=} options An options object.
    * @param {Function=} callback The callback method to call when
    * the update is complete.
    * @returns {Object} The document that was updated or undefined
    * if no document was updated.
    */
   updateById(id: String, update: Object, options?: Object, callback?: (() => any)): Object;

   /**
    * Internal method for document updating.
    * @param {Object} doc The document to update.
    * @param {Object} update The object with key/value pairs to update
    * the document with.
    * @param {Object} query The query object that we need to match to
    * perform an update.
    * @param {Object} options An options object.
    * @param {String} path The current recursive path.
    * @param {String} opType The type of update operation to perform,
    * if none is specified default is to set new data against matching
    * fields.
    * @returns {Boolean} True if the document was updated with new /
    * changed data or false if it was not updated because the data was
    * the same.
    * @private
    */
   private updateObject(doc: Object, update: Object, query: Object, options: Object, path: String, opType: String): Boolean;

   /**
    * Determines if the passed key has an array positional mark
    * (a dollar at the end of its name).
    * @param {String} key The key to check.
    * @returns {Boolean} True if it is a positional or false if not.
    * @private
    */
   private _isPositionalKey(key: String): Boolean;

   /**
    * Removes any documents from the collection that match the search
    * query key/values.
    * @param {Object=} query The query identifying the documents to remove. If no
    * query object is passed, all documents will be removed from the collection.
    * @param {Object=} options An options object.
    * @param {Function=} callback A callback method.
    * @returns {Array} An array of the documents that were removed.
    */
   remove(query?: Object, options?: Object, callback?: (() => any)): Array;

   /**
    * Helper method that removes a document that matches the given id.
    * @param {String} id The id of the document to remove.
    * @returns {Object} The document that was removed or undefined if
    * nothing was removed.
    */
   removeById(id: String): Object;

   /**
    * Processes a deferred action queue.
    * @param {String} type The queue name to process.
    * @param {Function} callback A method to call when the queue has processed.
    * @param {Object=} resultObj A temp object to hold results in.
    */
   processQueue(type: String, callback: (() => any), resultObj?: Object): void;

   /**
    * Checks if any CRUD operations have been deferred and are still waiting to
    * be processed.
    * @returns {Boolean} True if there are still deferred CRUD operations to process
    * or false if all queues are clear.
    */
   isProcessingQueue(): Boolean;

   /**
    * Inserts a document or array of documents into the collection.
    * @param {Object|Array} data Either a document object or array of document
    * @param {Number=} index Optional index to insert the record at.
    * @param {Collection.insertCallback=} callback Optional callback called
    * once the insert is complete.
    */
   insert(data: (Object|Array), index?: Number, callback?: Collection.insertCallback): void;

   /**
    * The insert operation's callback.
    * @name Collection.insertCallback
    * @callback Collection.insertCallback
    * @param {Object} result The result object will contain two arrays (inserted
    * and failed) which represent the documents that did get inserted and those
    * that didn't for some reason (usually index violation). Failed items also
    * contain a reason. Inspect the failed array for further information.
    *
    * A third field called "deferred" is a boolean value to indicate if the
    * insert operation was deferred across more than one CPU cycle (to avoid
    * blocking the main thread).
    */
   type insertCallback = (result: Object) => void;

   /**
    * Inserts a document or array of documents into the collection.
    * @param {Object|Array} data Either a document object or array of document
    * @param {Number=} index Optional index to insert the record at.
    * @param {Collection.insertCallback=} callback Optional callback called
    * once the insert is complete.
    */
   _insertHandle(data: (Object|Array), index?: Number, callback?: Collection.insertCallback): void;

   /**
    * Internal method to insert a document into the collection. Will
    * check for index violations before allowing the document to be inserted.
    * @param {Object} doc The document to insert after passing index violation
    * tests.
    * @param {Number=} index Optional index to insert the document at.
    * @returns {Boolean|Object} True on success, false if no document passed,
    * or an object containing details about an index violation if one occurred.
    * @private
    */
   private _insert(doc: Object, index?: Number): (Boolean|Object);

   /**
    * Inserts a document into the internal collection data array at
    * Inserts a document into the internal collection data array at
    * the specified index.
    * @param {Number} index The index to insert at.
    * @param {Object} doc The document to insert.
    * @private
    */
   private _dataInsertAtIndex(index: Number, doc: Object): void;

   /**
    * Removes a document from the internal collection data array at
    * the specified index.
    * @param {Number} index The index to remove from.
    * @private
    */
   private _dataRemoveAtIndex(index: Number): void;

   /**
    * Replaces all data in the collection's internal data array with
    * the passed array of data.
    * @param {Array} data The array of data to replace existing data with.
    * @private
    */
   private _dataReplace(data: Array): void;

   /**
    * Inserts a document into the collection indexes.
    * @param {Object} doc The document to insert.
    * @private
    */
   private _insertIntoIndexes(doc: Object): void;

   /**
    * Removes a document from the collection indexes.
    * @param {Object} doc The document to remove.
    * @private
    */
   private _removeFromIndexes(doc: Object): void;

   /**
    * Updates collection index data for the passed document.
    * @param {Object} oldDoc The old document as it was before the update (must be
    * actual reference to original document).
    * @param {Object} newDoc The document as it now is after the update.
    * @private
    */
   private _updateIndexes(oldDoc: Object, newDoc: Object): void;

   /**
    * Rebuild collection indexes.
    * @private
    */
   private _rebuildIndexes(): void;

   /**
    * Uses the passed query to generate a new collection with results
    * matching the query parameters.
    *
    * @param {Object} query The query object to generate the subset with.
    * @param {Object=} options An options object.
    * @returns {*}
    */
   subset(query: Object, options?: Object): any;

   /**
    * Checks if the collection is a subset of the passed collection.
    * @param {Collection} collection The collection to test against.
    * @returns {Boolean} True if the passed collection is the parent of
    * the current collection.
    */
   isSubsetOf(collection: Collection): Boolean;

   /**
    * Find the distinct values for a specified field across a single collection and
    * returns the results in an array.
    * @param {String} key The field path to return distinct values for e.g. "person.name".
    * @param {Object=} query The query to use to filter the documents used to return values from.
    * @param {Object=} options The query options to use when running the query.
    * @returns {Array}
    */
   distinct(key: String, query?: Object, options?: Object): Array;

   /**
    * Helper method to find a document by it's id.
    * @param {String} id The id of the document.
    * @param {Object=} options The options object, allowed keys are sort and limit.
    * @returns {Array} The items that were updated.
    */
   findById(id: String, options?: Object): Array;

   /**
    * Finds all documents that contain the passed string or search object
    * regardless of where the string might occur within the document. This
    * will match strings from the start, middle or end of the document's
    * string (partial match).
    * @param {String} search The string to search for. Case sensitive.
    * @param {Object=} options A standard find() options object.
    * @returns {Array} An array of documents that matched the search string.
    */
   peek(search: String, options?: Object): Array;

   /**
    * Provides a query plan / operations log for a query.
    * @param {Object} query The query to execute.
    * @param {Object=} options Optional options object.
    * @returns {Object} The query plan.
    */
   explain(query: Object, options?: Object): Object;

   /**
    * Generates an options object with default values or adds default
    * values to a passed object if those values are not currently set
    * to anything.
    * @param {Object=} obj Optional options object to modify.
    * @returns {Object} The options object.
    */
   options(obj?: Object): Object;

   /**
    * Queries the collection based on the query object passed.
    * @param {Object} query The query key/values that a document must match in
    * order for it to be returned in the result array.
    * @param {Object=} options An optional options object.
    * @param {Function=} callback !! DO NOT USE, THIS IS NON-OPERATIONAL !!
    * Optional callback. If specified the find process
    * will not return a value and will assume that you wish to operate under an
    * async mode. This will break up large find requests into smaller chunks and
    * process them in a non-blocking fashion allowing large datasets to be queried
    * without causing the browser UI to pause. Results from this type of operation
    * will be passed back to the callback once completed.
    *
    * @returns {Array} The results array from the find operation, containing all
    * documents that matched the query.
    */
   find(query: Object, options?: Object, callback?: (() => any)): Array;

   /**
    * Returns one document that satisfies the specified query criteria. If multiple
    * documents satisfy the query, this method returns the first document to match
    * the query.
    * @returns {*}
    */
   findOne(): any;

   /**
    * Gets the index in the collection data array of the first item matched by
    * the passed query object.
    * @param {Object} query The query to run to find the item to return the index of.
    * @param {Object=} options An options object.
    * @returns {Number}
    */
   indexOf(query: Object, options?: Object): Number;

   /**
    * Returns the index of the document identified by the passed item's primary key.
    * @param {*} itemLookup The document whose primary key should be used to lookup
    * or the id to lookup.
    * @param {Object=} options An options object.
    * @returns {Number} The index the item with the matching primary key is occupying.
    */
   indexOfDocById(itemLookup: any, options?: Object): Number;

   /**
    * Removes a document from the collection by it's index in the collection's
    * data array.
    * @param {Number} index The index of the document to remove.
    * @returns {Object} The document that has been removed or false if none was
    * removed.
    */
   removeByIndex(index: Number): Object;

   /**
    * Gets / sets the collection transform options.
    * @param {Object} obj A collection transform options object.
    * @returns {*}
    */
   transform(obj: Object): any;

   /**
    * Transforms data using the set transformIn method.
    * @param {Object} data The data to transform.
    * @returns {*}
    */
   transformIn(data: Object): any;

   /**
    * Transforms data using the set transformOut method.
    * @param {Object} data The data to transform.
    * @returns {*}
    */
   transformOut(data: Object): any;

   /**
    * Sorts an array of documents by the given sort path.
    * @param {*} sortObj The keys and orders the array objects should be sorted by.
    * @param {Array} arr The array of documents to sort.
    * @returns {Array}
    */
   sort(sortObj: any, arr: Array): Array;

   /**
    * Groups an array of documents into multiple array fields, named by the value
    * of the given group path.
    * @param {*} groupObj The key path the array objects should be grouped by.
    * @param {Array} arr The array of documents to group.
    * @returns {Object}
    */
   group(groupObj: any, arr: Array): Object;

   /**
    * Sorts array by individual sort path.
    * @param {String} key The path to sort by.
    * @param {Array} arr The array of objects to sort.
    * @returns {Array|*}
    * @private
    */
   private _sort(key: String, arr: Array): (Array|any);

   /**
    * Internal method that takes a search query and options and
    * returns an object containing details about the query which
    * can be used to optimise the search.
    *
    * @param {Object} query The search query to analyse.
    * @param {Object} options The query options object.
    * @param {Operation} op The instance of the Operation class that
    * this operation is using to track things like performance and steps
    * taken etc.
    * @returns {Object}
    * @private
    */
   private _analyseQuery(query: Object, options: Object, op: Operation): Object;

   /**
    * Checks if the passed query references a source object (such
    * as a collection) by name.
    * @param {Object} query The query object to scan.
    * @param {String} sourceName The source name to scan for in the query.
    * @param {String=} path The path to scan from.
    * @returns {*}
    * @private
    */
   private _queryReferencesSource(query: Object, sourceName: String, path?: String): any;

   /**
    * Returns the number of documents currently in the collection.
    * @returns {Number}
    */
   count(): Number;

   /**
    * Finds sub-documents from the collection's documents.
    * @param {Object} match The query object to use when matching
    * parent documents from which the sub-documents are queried.
    * @param {String} path The path string used to identify the
    * key in which sub-documents are stored in parent documents.
    * @param {Object=} subDocQuery The query to use when matching
    * which sub-documents to return.
    * @param {Object=} subDocOptions The options object to use
    * when querying for sub-documents.
    * @returns {*}
    */
   findSub(match: Object, path: String, subDocQuery?: Object, subDocOptions?: Object): any;

   /**
    * Finds the first sub-document from the collection's documents
    * that matches the subDocQuery parameter.
    * @param {Object} match The query object to use when matching
    * parent documents from which the sub-documents are queried.
    * @param {String} path The path string used to identify the
    * key in which sub-documents are stored in parent documents.
    * @param {Object=} subDocQuery The query to use when matching
    * which sub-documents to return.
    * @param {Object=} subDocOptions The options object to use
    * when querying for sub-documents.
    * @returns {Object}
    */
   findSubOne(match: Object, path: String, subDocQuery?: Object, subDocOptions?: Object): Object;

   /**
    * Checks that the passed document will not violate any index rules if
    * inserted into the collection.
    * @param {Object} doc The document to check indexes against.
    * @returns {Boolean} Either false (no violation occurred) or true if
    * a violation was detected.
    */
   insertIndexViolation(doc: Object): Boolean;

   /**
    * Creates an index on the specified keys.
    * @param {Object} keys The object containing keys to index.
    * @param {Object} options An options object.
    * @returns {*}
    */
   ensureIndex(keys: Object, options: Object): any;

   /**
    * Gets an index by it's name.
    * @param {String} name The name of the index to retreive.
    * @returns {*}
    */
   index(name: String): any;

   /**
    * Gets the last reporting operation's details such as run time.
    * @returns {Object}
    */
   lastOp(): Object;

   /**
    * Generates a difference object that contains insert, update and remove arrays
    * representing the operations to execute to make this collection have the same
    * data as the one passed.
    * @param {Collection} collection The collection to diff against.
    * @returns {{}}
    */
   diff(collection: Collection): Object;

   /**
    * Adds a data source to collate data from and specifies the
    * key name to collate data to.
    * @func collateAdd
    * @memberof Collection
    * @param {Collection} collection The collection to collate data from.
    * @param {String=} keyName Optional name of the key to collate data to.
    * If none is provided the record CRUD is operated on the root collection
    * data.
    */
   static collateAdd(collection: Collection, keyName?: String): void;

   /**
    * Creates a condition handler that will react to changes in data on the
    * collection.
    * @example Create a condition handler that reacts when data changes.
    * 	var coll = db.collection('test'),
    * 		condition = coll.when({_id: 'test1', val: 1})
    * 		.then(function () {
    * 			console.log('Condition met!');
    *	 	})
    *	 	.else(function () {
    *	 		console.log('Condition un-met');
    *	 	});
    *
    *	 	coll.insert({_id: 'test1', val: 1});
    *
    * @see Condition
    * @param {Object} query The query that will trigger the condition's then()
    * callback.
    * @returns {Condition}
    */
   when(query: Object): Condition;

   /**
    * Creates a grid and assigns the collection as its data source.
    * @func grid
    * @memberof Collection
    * @param {String} selector jQuery selector of grid output target.
    * @param {String} template The table template to use when rendering the grid.
    * @param {Object=} options The options object to apply to the grid.
    * @returns {*}
    */
   static grid(selector: String, template: String, options?: Object): any;

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
   static unGrid(selector: String, template: String, options?: Object): any;

   /**
    * Adds a grid to the internal grid lookup.
    * @func _addGrid
    * @memberof Collection
    * @param {Grid} grid The grid to add.
    * @returns {Collection}
    * @private
    */
   private static _addGrid(grid: Grid): Collection;

   /**
    * Removes a grid from the internal grid lookup.
    * @func _removeGrid
    * @memberof Collection
    * @param {Grid} grid The grid to remove.
    * @returns {Collection}
    * @private
    */
   private static _removeGrid(grid: Grid): Collection;

   /**
    * Creates a pie chart from the collection.
    * @type {Overload}
    */
   pieChart: Overload;

   /**
    * Creates a line chart from the collection.
    * @type {Overload}
    */
   lineChart: Overload;

   /**
    * Creates an area chart from the collection.
    * @type {Overload}
    */
   areaChart: Overload;

   /**
    * Creates a column chart from the collection.
    * @type {Overload}
    */
   columnChart: Overload;

   /**
    * Creates a bar chart from the collection.
    * @type {Overload}
    */
   barChart: Overload;

   /**
    * Creates a stacked bar chart from the collection.
    * @type {Overload}
    */
   stackedBarChart: Overload;

   /**
    * Removes a chart from the page by it's selector.
    * @memberof Collection
    * @param {String} selector The chart selector.
    */
   dropChart(selector: String): void;

   /**
    * Sync with this collection on the server-side.
    * @name sync
    * @method Collection.sync
    * @param {Function} callback The callback method to call once
    * the connection to the server has been established.
    */
   static sync(callback: (() => any)): void;

   /**
    * Disconnects an existing connection to a sync server.
    * @returns {boolean} True if a connection existed, false
    * if no connection existed.
    */
   unSync(): boolean;

   /**
    * Drop collection and persistent storage.
    * @name drop
    * @method Collection.drop
    */
   static drop(): void;

   /**
    * Saves an entire collection's data to persistent storage.
    * @param {Function=} callback The method to call when the save function
    * has completed.
    */
   save(callback?: (() => any)): void;

   /**
    * Loads an entire collection's data from persistent storage.
    * @param {Function=} callback The method to call when the load function
    * has completed.
    */
   load(callback?: (() => any)): void;

   /**
    * Get the ODM instance for this collection.
    * @returns {Odm}
    */
   odm(): Odm;

   /**
    * Adds a view to the internal view lookup.
    * @param {View} view The view to add.
    * @returns {Collection}
    * @private
    */
   private _addOldView(view: View): Collection;

   /**
    * Removes a view from the internal view lookup.
    * @param {View} view The view to remove.
    * @returns {Collection}
    * @private
    */
   private _removeOldView(view: View): Collection;

   /**
    * Gets the data that represents this collection for easy storage using
    * a third-party method / plugin instead of using the standard persistent
    * storage system.
    * @param {Function} callback The method to call with the data response.
    */
   saveCustom(callback: (() => any)): void;

   /**
    * Loads custom data loaded by a third-party plugin into the collection.
    * @param {Object} myData Data object previously saved by using saveCustom()
    * @param {Function} callback A callback method to receive notification when
    * data has loaded.
    */
   loadCustom(myData: Object, callback: (() => any)): void;

   /**
    * Creates a view and assigns the collection as its data source.
    * @param {String} name The name of the new view.
    * @param {Object} query The query to apply to the new view.
    * @param {Object} options The options object to apply to the view.
    * @returns {*}
    */
   view(name: String, query: Object, options: Object): any;

   /**
    * Adds a view to the internal view lookup.
    * @param {View} view The view to add.
    * @returns {Collection}
    * @private
    */
   private _addView: any;

   /**
    * Removes a view from the internal view lookup.
    * @param {View} view The view to remove.
    * @returns {Collection}
    * @private
    */
   private _removeView: any;

}

/**
 * Creates a new collection group. Collection groups allow single operations to be
 * propagated to multiple collections at once. CRUD operations against a collection
 * group are in fed to the group's collections. Useful when separating out slightly
 * different data into multiple collections but querying as one collection.
 * @constructor
 */
declare class CollectionGroup {
   /**
    * Creates a new collection group. Collection groups allow single operations to be
    * propagated to multiple collections at once. CRUD operations against a collection
    * group are in fed to the group's collections. Useful when separating out slightly
    * different data into multiple collections but querying as one collection.
    * @constructor
    */
   constructor();

   /**
    * Gets / sets the primary key for this collection group.
    * @param {String=} keyName The name of the primary key.
    * @returns {*}
    */
   primaryKey(keyName?: String): any;

   /**
    * Helper method that removes a document that matches the given id.
    * @param {String} id The id of the document to remove.
    */
   removeById(id: String): void;

   /**
    * Uses the passed query to generate a new collection with results
    * matching the query parameters.
    *
    * @param query
    * @param options
    * @returns {*}
    */
   subset(query: any, options: any): any;

   /**
    * Drops a collection group from the database.
    * @returns {boolean} True on success, false on failure.
    */
   drop(): boolean;

   /**
    * Adds a view to the internal view lookup.
    * @param {View} view The view to add.
    * @returns {Collection}
    * @private
    */
   private _addOldView(view: View): Collection;

   /**
    * Removes a view from the internal view lookup.
    * @param {View} view The view to remove.
    * @returns {Collection}
    * @private
    */
   private _removeOldView(view: View): Collection;

}

/**
 * The condition class monitors a data source and updates it's internal
 * state depending on clauses that it has been given. When all clauses
 * are satisfied the then() callback is fired. If conditions were met
 * but data changed that made them un-met, the else() callback is fired.
 * @class
 * @constructor
 */
declare class Condition {
   /**
    * The condition class monitors a data source and updates it's internal
    * state depending on clauses that it has been given. When all clauses
    * are satisfied the then() callback is fired. If conditions were met
    * but data changed that made them un-met, the else() callback is fired.
    * @class
    * @constructor
    */
   constructor();

   /**
    * Class constructor calls this init method.
    * This allows the constructor to be overridden by other modules because
    * they can override the init method with their own.
    * @param {Collection|View} dataSource The condition's data source.
    * @param {String} id The id to assign to the new Condition.
    * @param {Object} clause The query clause.
    */
   init(dataSource: (Collection|View), id: String, clause: Object): void;

   /**
    * Adds a new clause to the condition.
    * @param {Object} clause The query clause to add to the condition.
    * @returns {Condition}
    */
   and(clause: Object): Condition;

   /**
    * Starts the condition so that changes to data will call callback
    * methods according to clauses being met.
    * @param {*} initialState Initial state of condition.
    * @returns {Condition}
    */
   start(initialState: any): Condition;

   /**
    * Updates the internal status of all the clauses against the underlying
    * data source.
    * @private
    */
   private _updateStates(): void;

   /**
    * Stops the condition so that callbacks will no longer fire.
    * @returns {Condition}
    */
   stop(): Condition;

   /**
    * Drops the condition and removes it from memory.
    * @returns {Condition}
    */
   drop(): Condition;

}

/**
 * Creates a new ForerunnerDB instance. Core instances handle the lifecycle of
 * multiple database instances.
 * @constructor
 */
declare class Core {
   /**
    * Creates a new ForerunnerDB instance. Core instances handle the lifecycle of
    * multiple database instances.
    * @constructor
    */
   constructor();

   /**
    * Returns the number of instantiated ForerunnerDB objects.
    * @returns {Number} The number of instantiated instances.
    */
   instantiatedCount(): Number;

   /**
    * Get all instances as an array or a single ForerunnerDB instance
    * by it's array index.
    * @param {Number=} index Optional index of instance to get.
    * @returns {Array|Object} Array of instances or a single instance.
    */
   instances(index?: Number): (Array|Object);

   /**
    * Get all instances as an array of instance names or a single ForerunnerDB
    * instance by it's name.
    * @param {String=} name Optional name of instance to get.
    * @returns {Array|Object} Array of instance names or a single instance.
    */
   namedInstances(name?: String): (Array|Object);

   /**
    * Checks if a module has been loaded into the database.
    * @func moduleLoaded
    * @memberof Core
    * @param {String} moduleName The name of the module to check for.
    * @returns {Boolean} True if the module is loaded, false if not.
    */
   static moduleLoaded(moduleName: String): Boolean;

   /**
    * Checks version against the string passed and if it matches (or partially matches)
    * then the callback is called.
    * @param {String} val The version to check against.
    * @param {Function} callback The callback to call if match is true.
    * @returns {Boolean}
    */
   version(val: String, callback: (() => any)): Boolean;

   /**
    * Checks if the database is running on a client (browser) or
    * a server (node.js).
    * @returns {Boolean} Returns true if running on a browser.
    */
   isClient(): Boolean;

   /**
    * Checks if the database is running on a client (browser) or
    * a server (node.js).
    * @returns {Boolean} Returns true if running on a server.
    */
   isServer(): Boolean;

   /**
    * Added to provide an error message for users who have not seen
    * the new instantiation breaking change warning and try to get
    * a collection directly from the core instance.
    */
   collection(): void;

   /**
    * Gets a database instance by name.
    * @memberof Core
    * @param {String=} name Optional name of the database. If none is provided
    * a random name is assigned.
    * @returns {Db}
    */
   db(name?: String): Db;

   /**
    * Returns an array of databases that ForerunnerDB currently has.
    * @memberof Core
    * @param {String|RegExp=} search The optional search string or regular expression to use
    * to match collection names against.
    * @returns {Array} An array of objects containing details of each database
    * that ForerunnerDB is currently managing and it's child entities.
    */
   databases(search: (String|RegExp)): Array;

   /**
    * Override the Core init to instantiate the plugin.
    * @returns {*}
    */
   init(): any;

}

/**
 * Creates a new ForerunnerDB database instance.
 * @constructor
 */
declare class Db {
   /**
    * Creates a new ForerunnerDB database instance.
    * @constructor
    */
   constructor();

   /**
    * Get a collection with no name (generates a random name). If the
    * collection does not already exist then one is created for that
    * name automatically.
    * @name collection
    * @method Db.collection
    * @func collection
    * @memberof Db
    * @returns {Collection}
    */
   static collection(): Collection;

   /**
    * Determine if a collection with the passed name already exists.
    * @memberof Db
    * @param {String} viewName The name of the collection to check for.
    * @returns {boolean}
    */
   collectionExists(viewName: String): boolean;

   /**
    * Returns an array of collections the DB currently has.
    * @memberof Db
    * @param {String|RegExp=} search The optional search string or
    * regular expression to use to match collection names against.
    * @returns {Array} An array of objects containing details of each
    * collection the database is currently managing.
    */
   collections(search: (String|RegExp)): Array;

   /**
    * Creates a new collectionGroup instance or returns an existing
    * instance if one already exists with the passed name.
    * @func collectionGroup
    * @memberOf Db
    * @param {String} name The name of the instance.
    * @returns {*}
    */
   static collectionGroup(name: String): any;

   /**
    * Returns an array of collection groups the DB currently has.
    * @returns {Array} An array of objects containing details of each collection group
    * the database is currently managing.
    */
   collectionGroups(): Array;

   /**
    * Checks if a module has been loaded into the database.
    * @func moduleLoaded
    * @memberof Db
    * @param {String} moduleName The name of the module to check for.
    * @returns {Boolean} True if the module is loaded, false if not.
    */
   static moduleLoaded(moduleName: String): Boolean;

   /**
    * Checks version against the string passed and if it matches (or partially matches)
    * then the callback is called.
    * @param {String} val The version to check against.
    * @param {Function} callback The callback to call if match is true.
    * @returns {Boolean}
    */
   version(val: String, callback: (() => any)): Boolean;

   /**
    * Returns true if ForerunnerDB is running on a client browser.
    * @returns {boolean}
    */
   isClient(): boolean;

   /**
    * Returns true if ForerunnerDB is running on a server.
    * @returns {boolean}
    */
   isServer(): boolean;

   /**
    * Converts a normal javascript array of objects into a DB collection.
    * @param {Array} arr An array of objects.
    * @returns {Collection} A new collection instance with the data set to the
    * array passed.
    */
   arrayToCollection(arr: Array): Collection;

   /**
    * Emits an event by name with the given data.
    * @param {String} event The name of the event to emit.
    * @param {*=} data The data to emit with the event.
    * @returns {*}
    */
   peek(event: String, data?: any): any;

   /**
    * Find all documents across all collections in the database that match the passed
    * string or search object and return them in an object where each key is the name
    * of the collection that the document was matched in.
    * @param search String or search object.
    * @returns {Object}
    */
   peekCat(search: any): Object;

   /**
    * Drops the database.
    * @func drop
    * @memberof Db
    */
   static drop(): void;

   /**
    * Creates a new document instance or returns an existing
    * instance if one already exists with the passed name.
    * @func document
    * @memberOf Db
    * @param {String} name The name of the instance.
    * @returns {*}
    */
   static document(name: String): any;

   /**
    * Returns an array of documents the DB currently has.
    * @func documents
    * @memberof Db
    * @returns {Array} An array of objects containing details of each document
    * the database is currently managing.
    */
   static documents(): Array;

   /**
    * Determine if a grid with the passed name already exists.
    * @func gridExists
    * @memberof Db
    * @param {String} selector The jQuery selector to bind the grid to.
    * @returns {boolean}
    */
   static gridExists(selector: String): boolean;

   /**
    * Creates a grid based on the passed arguments.
    * @func grid
    * @memberof Db
    * @param {String} selector The jQuery selector of the grid to retrieve.
    * @param {String} template The table template to use when rendering the grid.
    * @param {Object=} options The options object to apply to the grid.
    * @returns {*}
    */
   static grid(selector: String, template: String, options?: Object): any;

   /**
    * Removes a grid based on the passed arguments.
    * @func unGrid
    * @memberof Db
    * @param {String} selector The jQuery selector of the grid to retrieve.
    * @param {String} template The table template to use when rendering the grid.
    * @param {Object=} options The options object to apply to the grid.
    * @returns {*}
    */
   static unGrid(selector: String, template: String, options?: Object): any;

   /**
    * Returns an array of grids the DB currently has.
    * @func grids
    * @memberof Db
    * @returns {Array} An array of objects containing details of each grid
    * the database is currently managing.
    */
   static grids(): Array;

   /**
    * Loads an entire database's data from persistent storage.
    * @param {Function=} callback The method to call when the load function
    * has completed.
    */
   load(callback?: (() => any)): void;

   /**
    * Saves an entire database's data to persistent storage.
    * @param {Function=} callback The method to call when the save function
    * has completed.
    */
   save(callback?: (() => any)): void;

   /**
    * Gets a view by it's name.
    * @param {String} viewName The name of the view to retrieve.
    * @returns {*}
    */
   oldView(viewName: String): any;

   /**
    * Determine if a view with the passed name already exists.
    * @param {String} viewName The name of the view to check for.
    * @returns {boolean}
    */
   oldViewExists(viewName: String): boolean;

   /**
    * Returns an array of views the DB currently has.
    * @returns {Array} An array of objects containing details of each view
    * the database is currently managing.
    */
   oldViews(): Array;

   /**
    * Create an overview instance from a Db instance.
    * @param {String} name The name of the overview.
    * @returns {*}
    */
   overview(name: String): any;

   /**
    * Returns an array of overviews the DB currently has.
    * @returns {Array} An array of objects containing details of each overview
    * the database is currently managing.
    */
   overviews(): Array;

   /**
    * Loads an entire database's data from persistent storage.
    * @name load
    * @method Db.load
    * @param {Function=} callback The method to call when the load function
    * has completed.
    */
   static load(callback?: (() => any)): void;

   /**
    * Saves an entire database's data to persistent storage.
    * @name save
    * @method Db.save
    * @param {Function=} callback The method to call when the save function
    * has completed.
    */
   static save(callback?: (() => any)): void;

   /**
    * Create or retrieve a procedure by name.
    * @param {String} name The name of the procedure.
    * @param {Function=} method If specified, creates a new procedure
    * with the provided name and method.
    * @returns {*}
    */
   procedure(name: String, method?: (() => any)): any;

   /**
    * Denotes a section has been entered. All instances created
    * after this call will be assigned to this "section".
    */
   sectionEnter(): void;

   /**
    * Denotes a section has been left. All instances that were
    * created during the section lifespan will be automatically
    * dropped.
    */
   sectionLeave(): void;

   /**
    * Assigns a newly created instance to the active section. This method
    * is called by the database from the create event.
    * @param {*} instance The item instance.
    * @param {String} type The type of instance.
    * @param {String} name The name of the instance.
    * @private
    */
   private _assignSection(instance: any, type: String, name: String): void;

   /**
    * Gets a view by it's name.
    * @param {String} name The name of the view to retrieve.
    * @returns {*}
    */
   view(name: String): any;

   /**
    * Determine if a view with the passed name already exists.
    * @param {String} name The name of the view to check for.
    * @returns {boolean}
    */
   viewExists(name: String): boolean;

   /**
    * Returns an array of views the DB currently has.
    * @returns {Array} An array of objects containing details of each view
    * the database is currently managing.
    */
   views(): Array;

}

/**
 * Creates a new Document instance. Documents allow you to create individual
 * objects that can have standard ForerunnerDB CRUD operations run against
 * them, as well as data-binding if the AutoBind module is included in your
 * project.
 * @name Document
 * @class Document
 * @constructor
 */
declare class Document {
   /**
    * Creates a new Document instance. Documents allow you to create individual
    * objects that can have standard ForerunnerDB CRUD operations run against
    * them, as well as data-binding if the AutoBind module is included in your
    * project.
    * @name Document
    * @class Document
    * @constructor
    */
   constructor();

   /**
    * Checks if the instance is data-bound to any DOM elements.
    * @func isLinked
    * @memberof Document
    * @returns {Boolean} True if linked, false if not.
    */
   static isLinked(): Boolean;

   /**
    * Creates a link to the DOM between the document data and the elements
    * in the passed output selector. When new elements are needed or changes
    * occur the passed templateSelector is used to get the template that is
    * output to the DOM.
    * @func link
    * @memberof Document
    * @param outputTargetSelector
    * @param templateSelector
    * @param {Object=} options An options object.
    * @see unlink
    */
   static link(outputTargetSelector: any, templateSelector: any, options?: Object): void;

   /**
    * Removes a link to the DOM between the document data and the elements
    * in the passed output selector that was created using the link() method.
    * @func unlink
    * @memberof Document
    * @param outputTargetSelector
    * @param templateSelector
    * @see link
    */
   static unlink(outputTargetSelector: any, templateSelector: any): void;

   /**
    * Gets / sets the current state.
    * @func state
    * @memberof Document
    * @param {String=} val The name of the state to set.
    * @returns {*}
    */
   static state(val?: String): any;

   /**
    * Gets / sets the db instance this class instance belongs to.
    * @func db
    * @memberof Document
    * @param {Db=} db The db instance.
    * @returns {*}
    */
   static db(db?: Db): any;

   /**
    * Gets / sets the document name.
    * @func name
    * @memberof Document
    * @param {String=} val The name to assign
    * @returns {*}
    */
   static name(val?: String): any;

   /**
    * Sets the data for the document.
    * @func setData
    * @memberof Document
    * @param data
    * @param options
    * @returns {Document}
    */
   static setData(data: any, options: any): Document;

   /**
    * Gets the document's data returned as a single object.
    * @func find
    * @memberof Document
    * @param {Object} query The query object - currently unused, just
    * provide a blank object e.g. {}
    * @param {Object=} options An options object.
    * @returns {Object} The document's data object.
    */
   static find(query: Object, options?: Object): Object;

   /**
    * Modifies the document. This will update the document with the data held in 'update'.
    * @func update
    * @memberof Document
    * @param {Object} query The query that must be matched for a document to be
    * operated on.
    * @param {Object} update The object containing updated key/values. Any keys that
    * match keys on the existing document will be overwritten with this data. Any
    * keys that do not currently exist on the document will be added to the document.
    * @param {Object=} options An options object.
    * @returns {Array} The items that were updated.
    */
   static update(query: Object, update: Object, options?: Object): Array;

   /**
    * Internal method for document updating.
    * @func updateObject
    * @memberof Document
    * @param {Object} doc The document to update.
    * @param {Object} update The object with key/value pairs to update the document with.
    * @param {Object} query The query object that we need to match to perform an update.
    * @param {Object} options An options object.
    * @param {String} path The current recursive path.
    * @param {String} opType The type of update operation to perform, if none is specified
    * default is to set new data against matching fields.
    * @returns {Boolean} True if the document was updated with new / changed data or
    * false if it was not updated because the data was the same.
    * @private
    */
   private static updateObject(doc: Object, update: Object, query: Object, options: Object, path: String, opType: String): Boolean;

   /**
    * Determines if the passed key has an array positional mark (a dollar at the end
    * of its name).
    * @func _isPositionalKey
    * @memberof Document
    * @param {String} key The key to check.
    * @returns {Boolean} True if it is a positional or false if not.
    * @private
    */
   private static _isPositionalKey(key: String): Boolean;

   /**
    * Updates a property on an object depending on if the collection is
    * currently running data-binding or not.
    * @func _updateProperty
    * @memberof Document
    * @param {Object} doc The object whose property is to be updated.
    * @param {String} prop The property to update.
    * @param {*} val The new value of the property.
    * @private
    */
   private static _updateProperty(doc: Object, prop: String, val: any): void;

   /**
    * Increments a value for a property on a document by the passed number.
    * @func _updateIncrement
    * @memberof Document
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to modify.
    * @param {Number} val The amount to increment by.
    * @private
    */
   private static _updateIncrement(doc: Object, prop: String, val: Number): void;

   /**
    * Changes the index of an item in the passed array.
    * @func _updateSpliceMove
    * @memberof Document
    * @param {Array} arr The array to modify.
    * @param {Number} indexFrom The index to move the item from.
    * @param {Number} indexTo The index to move the item to.
    * @private
    */
   private static _updateSpliceMove(arr: Array, indexFrom: Number, indexTo: Number): void;

   /**
    * Inserts an item into the passed array at the specified index.
    * @func _updateSplicePush
    * @memberof Document
    * @param {Array} arr The array to insert into.
    * @param {Number} index The index to insert at.
    * @param {Object} doc The document to insert.
    * @private
    */
   private static _updateSplicePush(arr: Array, index: Number, doc: Object): void;

   /**
    * Inserts an item at the end of an array.
    * @func _updatePush
    * @memberof Document
    * @param {Array} arr The array to insert the item into.
    * @param {Object} doc The document to insert.
    * @private
    */
   private static _updatePush(arr: Array, doc: Object): void;

   /**
    * Removes an item from the passed array.
    * @func _updatePull
    * @memberof Document
    * @param {Array} arr The array to modify.
    * @param {Number} index The index of the item in the array to remove.
    * @private
    */
   private static _updatePull(arr: Array, index: Number): void;

   /**
    * Multiplies a value for a property on a document by the passed number.
    * @func _updateMultiply
    * @memberof Document
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to modify.
    * @param {Number} val The amount to multiply by.
    * @private
    */
   private static _updateMultiply(doc: Object, prop: String, val: Number): void;

   /**
    * Renames a property on a document to the passed property.
    * @func _updateRename
    * @memberof Document
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to rename.
    * @param {Number} val The new property name.
    * @private
    */
   private static _updateRename(doc: Object, prop: String, val: Number): void;

   /**
    * Deletes a property on a document.
    * @func _updateUnset
    * @memberof Document
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to delete.
    * @private
    */
   private static _updateUnset(doc: Object, prop: String): void;

   /**
    * Drops the document.
    * @func drop
    * @memberof Document
    * @returns {boolean} True if successful, false if not.
    */
   static drop(): boolean;

}

/**
 * Creates a new grid instance.
 * @name Grid
 * @class Grid
 * @param {String} selector jQuery selector.
 * @param {String} template The template selector.
 * @param {Object=} options The options object to apply to the grid.
 * @constructor
 */
declare class Grid {
   /**
    * Creates a new grid instance.
    * @name Grid
    * @class Grid
    * @param {String} selector jQuery selector.
    * @param {String} template The template selector.
    * @param {Object=} options The options object to apply to the grid.
    * @constructor
    */
   constructor(selector: String, template: String, options?: Object);

   /**
    * Gets / sets the current state.
    * @func state
    * @memberof Grid
    * @param {String=} val The name of the state to set.
    * @returns {Grid}
    */
   static state(val?: String): Grid;

   /**
    * Gets / sets the current name.
    * @func name
    * @memberof Grid
    * @param {String=} val The name to set.
    * @returns {Grid}
    */
   static name(val?: String): Grid;

   /**
    * Executes an insert against the grid's underlying data-source.
    * @func insert
    * @memberof Grid
    */
   static insert(): void;

   /**
    * Executes an update against the grid's underlying data-source.
    * @func update
    * @memberof Grid
    */
   static update(): void;

   /**
    * Executes an updateById against the grid's underlying data-source.
    * @func updateById
    * @memberof Grid
    */
   static updateById(): void;

   /**
    * Executes a remove against the grid's underlying data-source.
    * @func remove
    * @memberof Grid
    */
   static remove(): void;

   /**
    * Sets the data source from which the grid will assemble its data.
    * @func from
    * @memberof Grid
    * @param {View} dataSource The data source to use to assemble grid data.
    * @returns {Grid}
    */
   static from(dataSource: View): Grid;

   /**
    * Gets / sets the db instance this class instance belongs to.
    * @func db
    * @memberof Grid
    * @param {Db=} db The db instance.
    * @returns {*}
    */
   static db(db?: Db): any;

   /**
    * Drops a grid and all it's stored data from the database.
    * @func drop
    * @memberof Grid
    * @returns {boolean} True on success, false on failure.
    */
   static drop(): boolean;

   /**
    * Gets / sets the grid's HTML template to use when rendering.
    * @func template
    * @memberof Grid
    * @param {String} template The template's jQuery selector.
    * @returns {*}
    */
   static template(template: String): any;

   /**
    * Refreshes the grid data such as ordering etc.
    * @func refresh
    * @memberof Grid
    */
   static refresh(): void;

   /**
    * Returns the number of documents currently in the grid.
    * @func count
    * @memberof Grid
    * @returns {Number}
    */
   static count(): Number;

}

/**
 * The constructor.
 *
 * @constructor
 */
declare class Highchart {
   /**
    * The constructor.
    *
    * @constructor
    */
   constructor();

   /**
    * Generate pie-chart series data from the given collection data array.
    * @param data
    * @param keyField
    * @param valField
    * @returns {Array}
    */
   pieDataFromCollectionData(data: any, keyField: any, valField: any): Array;

   /**
    * Generate line-chart series data from the given collection data array.
    * @param seriesField
    * @param keyField
    * @param valField
    * @param orderBy
    */
   seriesDataFromCollectionData(seriesField: any, keyField: any, valField: any, orderBy: any): void;

   /**
    * Hook the events the chart needs to know about from the internal collection.
    * @private
    */
   private _hookEvents(): void;

   /**
    * Handles changes to the collection data that the chart is reading from and then
    * updates the data in the chart display.
    * @private
    */
   private _changeListener(): void;

   /**
    * Destroys the chart and all internal references.
    * @returns {Boolean}
    */
   drop(): Boolean;

   /**
    * Chart via options object.
    * @func pieChart
    * @memberof Highchart
    * @param {Object} options The options object.
    * @returns {*}
    */
   static pieChart(options: Object): any;

   /**
    * Chart via selector.
    * @func lineChart
    * @memberof Highchart
    * @param {String} selector The chart selector.
    * @returns {*}
    */
   static lineChart(selector: String): any;

   /**
    * Chart via options object.
    * @func areaChart
    * @memberof Highchart
    * @param {Object} options The options object.
    * @returns {*}
    */
   static areaChart(options: Object): any;

   /**
    * Chart via options object.
    * @func columnChart
    * @memberof Highchart
    * @param {Object} options The options object.
    * @returns {*}
    */
   static columnChart(options: Object): any;

   /**
    * Chart via options object.
    * @func barChart
    * @memberof Highchart
    * @param {Object} options The options object.
    * @returns {*}
    */
   static barChart(options: Object): any;

   /**
    * Chart via options object.
    * @func stackedBarChart
    * @memberof Highchart
    * @param {Object} options The options object.
    * @returns {*}
    */
   static stackedBarChart(options: Object): any;

}

/**
 * The index class used to instantiate 2d indexes that the database can
 * use to handle high-performance geospatial queries.
 * @constructor
 */
declare class Index2d {
   /**
    * The index class used to instantiate 2d indexes that the database can
    * use to handle high-performance geospatial queries.
    * @constructor
    */
   constructor();

   /**
    * Create the index.
    * @param {Object} keys The object with the keys that the user wishes the index
    * to operate on.
    * @param {Object} options Can be undefined, if passed is an object with arbitrary
    * options keys and values.
    * @param {Collection} collection The collection the index should be created for.
    */
   init(keys: Object, options: Object, collection: Collection): void;

   /**
    * Looks up records that match the passed query and options.
    * @param query The query to execute.
    * @param options A query options object.
    * @param {Operation=} op Optional operation instance that allows
    * us to provide operation diagnostics and analytics back to the
    * main calling instance as the process is running.
    * @returns {*}
    */
   lookup(query: any, options: any, op?: Operation): any;

}

/**
 * The index class used to instantiate btree indexes that the database can
 * use to speed up queries on collections and views.
 * @constructor
 */
declare class IndexBinaryTree {
   /**
    * The index class used to instantiate btree indexes that the database can
    * use to speed up queries on collections and views.
    * @constructor
    */
   constructor();

}

/**
 * The index class used to instantiate hash map indexes that the database can
 * use to speed up queries on collections and views.
 * @constructor
 */
declare class IndexHashMap {
   /**
    * The index class used to instantiate hash map indexes that the database can
    * use to speed up queries on collections and views.
    * @constructor
    */
   constructor();

}

/**
 * Provides scrolling lists with large data sets that behave in a very
 * performance-optimised fashion by controlling the DOM elements currently
 * on screen to ensure that only the visible elements are rendered and
 * all other elements are simulated by variable height divs at the top
 * and bottom of the scrolling list.
 *
 * This module requires that the AutoBind module is loaded before it
 * will work.
 *
 * Infinilists work from views and those views cannot have an $orderBy
 * clause in them because that would slow down rendering. Instead if you
 * wish to have your data ordered you have to create a temporary collection
 * from which your view feeds from and pre-order the data before inserting
 * it into the temporary collection.
 * @class Infinilist
 * @requires AutoBind
 */
declare class Infinilist {
   /**
    * Provides scrolling lists with large data sets that behave in a very
    * performance-optimised fashion by controlling the DOM elements currently
    * on screen to ensure that only the visible elements are rendered and
    * all other elements are simulated by variable height divs at the top
    * and bottom of the scrolling list.
    *
    * This module requires that the AutoBind module is loaded before it
    * will work.
    *
    * Infinilists work from views and those views cannot have an $orderBy
    * clause in them because that would slow down rendering. Instead if you
    * wish to have your data ordered you have to create a temporary collection
    * from which your view feeds from and pre-order the data before inserting
    * it into the temporary collection.
    * @class Infinilist
    * @requires AutoBind
    */
   constructor();

   /**
    * Handle screen resizing.
    */
   resize(): void;

}

/**
 * The key value store class used when storing basic in-memory KV data,
 * and can be queried for quick retrieval. Mostly used for collection
 * primary key indexes and lookups.
 * @param {String=} name Optional KV store name.
 * @constructor
 */
declare class KeyValueStore {
   /**
    * The key value store class used when storing basic in-memory KV data,
    * and can be queried for quick retrieval. Mostly used for collection
    * primary key indexes and lookups.
    * @param {String=} name Optional KV store name.
    * @constructor
    */
   constructor(name?: String);

   /**
    * Get / set the primary key.
    * @param {String} key The key to set.
    * @returns {*}
    */
   primaryKey(key: String): any;

   /**
    * Removes all data from the store.
    * @returns {*}
    */
   truncate(): any;

   /**
    * Sets data against a key in the store.
    * @param {String} key The key to set data for.
    * @param {*} value The value to assign to the key.
    * @returns {*}
    */
   set(key: String, value: any): any;

   /**
    * Gets data stored for the passed key.
    * @param {String} key The key to get data for.
    * @returns {*}
    */
   get(key: String): any;

   /**
    * Get / set the primary key.
    * @param {*} val A lookup query.
    * @returns {*}
    */
   lookup(val: any): any;

   /**
    * Removes data for the given key from the store.
    * @param {String} key The key to un-set.
    * @returns {*}
    */
   unSet(key: String): any;

   /**
    * Sets data for the give key in the store only where the given key
    * does not already have a value in the store.
    * @param {String} key The key to set data for.
    * @param {*} value The value to assign to the key.
    * @returns {Boolean} True if data was set or false if data already
    * exists for the key.
    */
   uniqueSet(key: String, value: any): Boolean;

}

/**
 * The metrics class used to store details about operations.
 * @constructor
 */
declare class Metrics {
   /**
    * The metrics class used to store details about operations.
    * @constructor
    */
   constructor();

   /**
    * Creates an operation within the metrics instance and if metrics
    * are currently enabled (by calling the start() method) the operation
    * is also stored in the metrics log.
    * @param {String} name The name of the operation.
    * @returns {Operation}
    */
   create(name: String): Operation;

   /**
    * Starts logging operations.
    * @returns {Metrics}
    */
   start(): Metrics;

   /**
    * Stops logging operations.
    * @returns {Metrics}
    */
   stop(): Metrics;

   /**
    * Clears all logged operations.
    * @returns {Metrics}
    */
   clear(): Metrics;

   /**
    * Returns an array of all logged operations.
    * @returns {Array}
    */
   list(): Array;

}

/**
 * The chain reactor mixin, provides methods to the target object that allow chain
 * reaction events to propagate to the target and be handled, processed and passed
 * on down the chain.
 * @mixin
 */
declare class ChainReactor {
   /**
    * The chain reactor mixin, provides methods to the target object that allow chain
    * reaction events to propagate to the target and be handled, processed and passed
    * on down the chain.
    * @mixin
    */
   constructor();

   /**
    * Creates a chain link between the current reactor node and the passed
    * reactor node. Chain packets that are send by this reactor node will
    * then be propagated to the passed node for subsequent packets.
    * @param {*} obj The chain reactor node to link to.
    */
   static chain(obj: any): void;

   /**
    * Removes a chain link between the current reactor node and the passed
    * reactor node. Chain packets sent from this reactor node will no longer
    * be received by the passed node.
    * @param {*} obj The chain reactor node to unlink from.
    */
   static unChain(obj: any): void;

   /**
    * Gets / sets the flag that will enable / disable chain reactor sending
    * from this instance. Chain reactor sending is enabled by default on all
    * instances.
    * @param {Boolean} val True or false to enable or disable chain sending.
    * @returns {*}
    */
   static chainEnabled(val: Boolean): any;

   /**
    * Determines if this chain reactor node has any listeners downstream.
    * @returns {Boolean} True if there are nodes downstream of this node.
    */
   static chainWillSend(): Boolean;

   /**
    * Sends a chain reactor packet downstream from this node to any of its
    * chained targets that were linked to this node via a call to chain().
    * @param {String} type The type of chain reactor packet to send. This
    * can be any string but the receiving reactor nodes will not react to
    * it unless they recognise the string. Built-in strings include: "insert",
    * "update", "remove", "setData" and "debug".
    * @param {Object} data A data object that usually contains a key called
    * "dataSet" which is an array of items to work on, and can contain other
    * custom keys that help describe the operation.
    * @param {Object=} options An options object. Can also contain custom
    * key/value pairs that your custom chain reactor code can operate on.
    */
   static chainSend(type: String, data: Object, options?: Object): void;

   /**
    * Handles receiving a chain reactor message that was sent via the chainSend()
    * method. Creates the chain packet object and then allows it to be processed.
    * @param {Object} sender The node that is sending the packet.
    * @param {String} type The type of packet.
    * @param {Object} data The data related to the packet.
    * @param {Object=} options An options object.
    */
   static chainReceive(sender: Object, type: String, data: Object, options?: Object): void;

}

/**
 * Provides commonly used methods to most classes in ForerunnerDB.
 * @mixin
 */
declare class Common {
   /**
    * Provides commonly used methods to most classes in ForerunnerDB.
    * @mixin
    */
   constructor();

   /**
    * Generates a JSON serialisation-compatible object instance. After the
    * instance has been passed through this method, it will be able to survive
    * a JSON.stringify() and JSON.parse() cycle and still end up as an
    * instance at the end. Further information about this process can be found
    * in the ForerunnerDB wiki at: https://github.com/Irrelon/ForerunnerDB/wiki/Serialiser-&-Performance-Benchmarks
    * @param {*} val The object instance such as "new Date()" or "new RegExp()".
    */
   static make(val: any): void;

   /**
    * Gets / sets data in the item store. The store can be used to set and
    * retrieve data against a key. Useful for adding arbitrary key/value data
    * to a collection / view etc and retrieving it later.
    * @param {String|*} key The key under which to store the passed value or
    * retrieve the existing stored value.
    * @param {*=} val Optional value. If passed will overwrite the existing value
    * stored against the specified key if one currently exists.
    * @returns {*}
    */
   static store(key: (String|any), val?: any): any;

   /**
    * Removes a previously stored key/value pair from the item store, set previously
    * by using the store() method.
    * @param {String|*} key The key of the key/value pair to remove;
    * @returns {Common} Returns this for chaining.
    */
   static unStore(key: (String|any)): Common;

   /**
    * Returns a non-referenced version of the passed object / array.
    * @param {Object} data The object or array to return as a non-referenced version.
    * @param {Number=} copies Optional number of copies to produce. If specified, the return
    * value will be an array of decoupled objects, each distinct from the other.
    * @returns {*}
    */
   static decouple(data: Object, copies?: Number): any;

   /**
    * Parses and returns data from stringified version.
    * @param {String} data The stringified version of data to parse.
    * @returns {Object} The parsed JSON object from the data.
    */
   static jParse(data: String): Object;

   /**
    * Converts a JSON object into a stringified version.
    * @param {Object} data The data to stringify.
    * @returns {String} The stringified data.
    */
   static jStringify(data: Object): String;

   /**
    * Generates a new 16-character hexadecimal unique ID or
    * generates a new 16-character hexadecimal ID based on
    * the passed string. Will always generate the same ID
    * for the same string.
    * @param {String=} str A string to generate the ID from.
    * @return {String}
    */
   static objectId(str?: String): String;

   /**
    * Generates a unique hash for the passed object.
    * @param {Object} obj The object to generate a hash for.
    * @returns {String}
    */
   static hash(obj: Object): String;

   /**
    * Sets debug flag for a particular type that can enable debug message
    * output to the console if required.
    * @param {String} type The name of the debug type to set flag for.
    * @param {Boolean} val The value to set debug flag to.
    * @return {Boolean} True if enabled, false otherwise.
    */
   static debug: any;

   /**
    * Returns a string describing the class this instance is derived from.
    * @returns {String}
    */
   static classIdentifier(): String;

   /**
    * Returns a string describing the instance by it's class name and instance
    * object name.
    * @returns {String} The instance identifier.
    */
   static instanceIdentifier(): String;

   /**
    * Returns a string used to denote a console log against this instance,
    * consisting of the class identifier and instance identifier.
    * @returns {String} The log identifier.
    */
   static logIdentifier(): String;

   /**
    * Converts a query object with MongoDB dot notation syntax
    * to Forerunner's object notation syntax.
    * @param {Object} obj The object to convert.
    */
   static convertToFdb(obj: Object): void;

   /**
    * Checks if the state is dropped.
    * @returns {boolean} True when dropped, false otherwise.
    */
   static isDropped(): boolean;

   /**
    * Registers a timed callback that will overwrite itself if
    * the same id is used within the timeout period. Useful
    * for de-bouncing fast-calls.
    * @param {String} id An ID for the call (use the same one
    * to debounce the same calls).
    * @param {Function} callback The callback method to call on
    * timeout.
    * @param {Number} timeout The timeout in milliseconds before
    * the callback is called.
    */
   static debounce(id: String, callback: (() => any), timeout: Number): void;

   /**
    * Returns a checksum of a string.
    * @param {String} str The string to checksum.
    * @return {Number} The checksum generated.
    */
   static checksum(str: String): Number;

}

/**
 * Provides some database constants.
 * @mixin
 */
declare class Constants {
   /**
    * Provides some database constants.
    * @mixin
    */
   constructor();

}

/**
 * Provides event emitter functionality including the methods: on, off, once, emit, deferEmit.
 * @mixin
 * @name Events
 */
declare class Events {
   /**
    * Provides event emitter functionality including the methods: on, off, once, emit, deferEmit.
    * @mixin
    * @name Events
    */
   constructor();

   /**
    * Attach an event listener to the passed event.
    * @name on
    * @method Events.on
    * @param {String} event The name of the event to listen for.
    * @param {Function} listener The method to call when the event is fired.
    * @returns {*}
    */
   static on(event: String, listener: (() => any)): any;

   /**
    * Attach an event listener to the passed event that will be called only once.
    * @name once
    * @method Events.once
    * @param {String} event The name of the event to listen for.
    * @param {Function} listener The method to call when the event is fired.
    * @returns {*}
    */
   static once(event: String, listener: (() => any)): any;

   /**
    * Cancels all event listeners for the passed event.
    * @name off
    * @method Events.off
    * @param {String} event The name of the event.
    * @returns {*}
    */
   static off(event: String): any;

   /**
    * Emit an event with data.
    * @name emit
    * @method Events.emit
    * @param {String} event The event to emit.
    * @param {*} data Data to emit with the event.
    * @returns {*}
    */
   static emit(event: String, data: any): any;

   /**
    * If events are cleared with the off() method while the event emitter is
    * actively processing any events then the off() calls get added to a
    * queue to be executed after the event emitter is finished. This stops
    * errors that might occur by potentially modifying the event queue while
    * the emitter is running through them. This method is called after the
    * event emitter is finished processing.
    * @name _processRemovalQueue
    * @method Events._processRemovalQueue
    * @private
    */
   private static _processRemovalQueue(): void;

   /**
    * Queues an event to be fired. This has automatic de-bouncing so that any
    * events of the same type that occur within 100 milliseconds of a previous
    * one will all be wrapped into a single emit rather than emitting tons of
    * events for lots of chained inserts etc. Only the data from the last
    * de-bounced event will be emitted.
    * @name deferEmit
    * @method Events.deferEmit
    * @param {String} eventName The name of the event to emit.
    * @param {*=} data Optional data to emit with the event.
    */
   static deferEmit(eventName: String, data?: any): void;

}

/**
 * Provides object matching algorithm methods.
 * @mixin
 */
declare class Matching {
   /**
    * Provides object matching algorithm methods.
    * @mixin
    */
   constructor();

   /**
    * Internal method that checks a document against a test object.
    * @param {*} source The source object or value to test against.
    * @param {*} test The test object or value to test with.
    * @param {Object} queryOptions The options the query was passed with.
    * @param {String=} opToApply The special operation to apply to the test such
    * as 'and' or an 'or' operator.
    * @param {Object=} options An object containing options to apply to the
    * operation such as limiting the fields returned etc.
    * @returns {Boolean} True if the test was positive, false on negative.
    * @private
    */
   private static _match(source: any, test: any, queryOptions: Object, opToApply?: String, options?: Object): Boolean;

   /**
    * Internal method, performs a matching process against a query operator such as $gt or $nin.
    * @param {String} key The property name in the test that matches the operator to perform
    * matching against.
    * @param {*} source The source data to match the query against.
    * @param {*} test The query to match the source against.
    * @param {Object} queryOptions The options the query was passed with.
    * @param {Object=} options An options object.
    * @returns {*}
    * @private
    */
   private static _matchOp(key: String, source: any, test: any, queryOptions: Object, options?: Object): any;

   /**
    *
    * @param {Array | Object} docArr An array of objects to run the join
    * operation against or a single object.
    * @param {Array} joinClause The join clause object array (the array in
    * the $join key of a normal join options object).
    * @param {Object} joinSource An object containing join source reference
    * data or a blank object if you are doing a bespoke join operation.
    * @param {Object} options An options object or blank object if no options.
    * @returns {Array}
    * @private
    */
   private static applyJoin(docArr: (Array|Object), joinClause: Array, joinSource: Object, options: Object): Array;

   /**
    * Takes a query object with dynamic references and converts the references
    * into actual values from the references source.
    * @param {Object} query The query object with dynamic references.
    * @param {Object} item The document to apply the references to.
    * @returns {*}
    * @private
    */
   private static resolveDynamicQuery(query: Object, item: Object): any;

}

/**
 * Provides sorting methods.
 * @mixin
 */
declare class Sorting {
   /**
    * Provides sorting methods.
    * @mixin
    */
   constructor();

   /**
    * Sorts the passed value a against the passed value b ascending.
    * @param {*} a The first value to compare.
    * @param {*} b The second value to compare.
    * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
    */
   static sortAsc(a: any, b: any): any;

   /**
    * Sorts the passed value a against the passed value b descending.
    * @param {*} a The first value to compare.
    * @param {*} b The second value to compare.
    * @returns {*} 1 if a is sorted after b, -1 if a is sorted before b.
    */
   static sortDesc(a: any, b: any): any;

}

/**
 * Provides class instance tagging and tag operation methods.
 * @mixin
 */
declare class Tags {
   /**
    * Provides class instance tagging and tag operation methods.
    * @mixin
    */
   constructor();

   /**
    * Tags a class instance for later lookup.
    * @param {String} name The tag to add.
    * @returns {boolean}
    */
   static tagAdd(name: String): boolean;

   /**
    * Removes a tag from a class instance.
    * @param {String} name The tag to remove.
    * @returns {boolean}
    */
   static tagRemove(name: String): boolean;

   /**
    * Gets an array of all instances tagged with the passed tag name.
    * @param {String} name The tag to lookup.
    * @returns {Array} The array of instances that have the passed tag.
    */
   static tagLookup(name: String): Array;

   /**
    * Drops all instances that are tagged with the passed tag name.
    * @param {String} name The tag to lookup.
    * @param {Function} callback Callback once dropping has completed
    * for all instances that match the passed tag name.
    * @returns {boolean}
    */
   static tagDrop(name: String, callback: (() => any)): boolean;

}

/**
 * Provides trigger functionality methods.
 * @mixin
 */
declare class Triggers {
   /**
    * Provides trigger functionality methods.
    * @mixin
    */
   constructor();

   /**
    * Add a trigger by id, type and phase.
    * @name addTrigger
    * @method Triggers.addTrigger
    * @param {String} id The id of the trigger. This must be unique to the type and
    * phase of the trigger. Only one trigger may be added with this id per type and
    * phase.
    * @param {Constants} type The type of operation to apply the trigger to. See
    * Mixin.Constants for constants to use.
    * @param {Constants} phase The phase of an operation to fire the trigger on. See
    * Mixin.Constants for constants to use.
    * @param {Triggers.addTriggerCallback} method The method to call when the trigger is fired.
    * @returns {boolean} True if the trigger was added successfully, false if not.
    */
   static addTrigger(id: String, type: Constants, phase: Constants, method: Triggers.addTriggerCallback): boolean;

   /**
    * Removes a trigger by id, type and phase.
    * @name removeTrigger
    * @method Triggers.removeTrigger
    * @param {String} id The id of the trigger to remove.
    * @param {Number} type The type of operation to remove the trigger from. See
    * Mixin.Constants for constants to use.
    * @param {Number} phase The phase of the operation to remove the trigger from.
    * See Mixin.Constants for constants to use.
    * @returns {boolean} True if removed successfully, false if not.
    */
   static removeTrigger(id: String, type: Number, phase: Number): boolean;

   /**
    * Tells the current instance to fire or ignore all triggers whether they
    * are enabled or not.
    * @param {Boolean} val Set to true to ignore triggers or false to not
    * ignore them.
    * @returns {*}
    */
   static ignoreTriggers(val: Boolean): any;

   /**
    * Generates triggers that fire in the after phase for all CRUD ops
    * that automatically transform data back and forth and keep both
    * import and export collections in sync with each other.
    * @param {String} id The unique id for this link IO.
    * @param {Object} ioData The settings for the link IO.
    */
   static addLinkIO(id: String, ioData: Object): void;

   /**
    * Removes a previously added link IO via it's ID.
    * @param {String} id The id of the link IO to remove.
    * @returns {boolean} True if successful, false if the link IO
    * was not found.
    */
   static removeLinkIO(id: String): boolean;

   /**
    * Checks if a trigger will fire based on the type and phase provided.
    * @param {Number} type The type of operation. See Mixin.Constants for
    * constants to use.
    * @param {Number} phase The phase of the operation. See Mixin.Constants
    * for constants to use.
    * @returns {Boolean} True if the trigger will fire, false otherwise.
    */
   static willTrigger(type: Number, phase: Number): Boolean;

   /**
    * Processes trigger actions based on the operation, type and phase.
    * @param {Object} operation Operation data to pass to the trigger.
    * @param {Number} type The type of operation. See Mixin.Constants for
    * constants to use.
    * @param {Number} phase The phase of the operation. See Mixin.Constants
    * for constants to use.
    * @param {Object} oldDoc The document snapshot before operations are
    * carried out against the data.
    * @param {Object} newDoc The document snapshot after operations are
    * carried out against the data.
    * @returns {boolean}
    */
   static processTrigger(operation: Object, type: Number, phase: Number, oldDoc: Object, newDoc: Object): boolean;

   /**
    * Returns the index of a trigger by id based on type and phase.
    * @param {String} id The id of the trigger to find the index of.
    * @param {Number} type The type of operation. See Mixin.Constants for
    * constants to use.
    * @param {Number} phase The phase of the operation. See Mixin.Constants
    * for constants to use.
    * @returns {Number}
    * @private
    */
   private static _triggerIndexOf(id: String, type: Number, phase: Number): Number;

   /**
    * When called in a before phase the newDoc object can be directly altered
    * to modify the data in it before the operation is carried out.
    * @callback Triggers.addTriggerCallback
    * @param {Object} operation The details about the operation.
    * @param {Object} oldDoc The document before the operation.
    * @param {Object} newDoc The document after the operation.
    */
   type addTriggerCallback = (operation: Object, oldDoc: Object, newDoc: Object) => void;

}

/**
 * Provides methods to handle object update operations.
 * @mixin
 */
declare class Updating {
   /**
    * Provides methods to handle object update operations.
    * @mixin
    */
   constructor();

   /**
    * Updates a property on an object.
    * @param {Object} doc The object whose property is to be updated.
    * @param {String} prop The property to update.
    * @param {*} val The new value of the property.
    * @private
    */
   private static _updateProperty(doc: Object, prop: String, val: any): void;

   /**
    * Increments a value for a property on a document by the passed number.
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to modify.
    * @param {Number} val The amount to increment by.
    * @private
    */
   private static _updateIncrement(doc: Object, prop: String, val: Number): void;

   /**
    * Changes the index of an item in the passed array.
    * @param {Array} arr The array to modify.
    * @param {Number} indexFrom The index to move the item from.
    * @param {Number} indexTo The index to move the item to.
    * @private
    */
   private static _updateSpliceMove(arr: Array, indexFrom: Number, indexTo: Number): void;

   /**
    * Inserts an item into the passed array at the specified index.
    * @param {Array} arr The array to insert into.
    * @param {Number} index The index to insert at.
    * @param {Object} doc The document to insert.
    * @private
    */
   private static _updateSplicePush(arr: Array, index: Number, doc: Object): void;

   /**
    * Removes an item from the passed array at the specified index.
    * @param {Array} arr The array to remove from.
    * @param {Number} index The index of the item to remove.
    * @param {Number} count The number of items to remove.
    * @private
    */
   private static _updateSplicePull(arr: Array, index: Number, count: Number): void;

   /**
    * Inserts an item at the end of an array.
    * @param {Array} arr The array to insert the item into.
    * @param {Object} doc The document to insert.
    * @private
    */
   private static _updatePush(arr: Array, doc: Object): void;

   /**
    * Removes an item from the passed array.
    * @param {Array} arr The array to modify.
    * @param {Number} index The index of the item in the array to remove.
    * @private
    */
   private static _updatePull(arr: Array, index: Number): void;

   /**
    * Multiplies a value for a property on a document by the passed number.
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to modify.
    * @param {Number} val The amount to multiply by.
    * @private
    */
   private static _updateMultiply(doc: Object, prop: String, val: Number): void;

   /**
    * Renames a property on a document to the passed property.
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to rename.
    * @param {Number} val The new property name.
    * @private
    */
   private static _updateRename(doc: Object, prop: String, val: Number): void;

   /**
    * Sets a property on a document to the passed value.
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to set.
    * @param {*} val The new property value.
    * @private
    */
   private static _updateOverwrite(doc: Object, prop: String, val: any): void;

   /**
    * Deletes a property on a document.
    * @param {Object} doc The document to modify.
    * @param {String} prop The property to delete.
    * @private
    */
   private static _updateUnset(doc: Object, prop: String): void;

   /**
    * Removes all properties from an object without destroying
    * the object instance, thereby maintaining data-bound linking.
    * @param {Object} doc The parent object to modify.
    * @param {String} prop The name of the child object to clear.
    * @private
    */
   private static _updateClear(doc: Object, prop: String): void;

   /**
    * Pops an item or items from the array stack.
    * @param {Object} doc The document to modify.
    * @param {Number} val If set to a positive integer, will pop the number specified
    * from the stack, if set to a negative integer will shift the number specified
    * from the stack.
    * @return {Boolean}
    * @private
    */
   private static _updatePop(doc: Object, val: Number): Boolean;

}

/**
 * The NodeApiClient class.
 * @class
 * @constructor
 */
declare class NodeApiClient {
   /**
    * The NodeApiClient class.
    * @class
    * @constructor
    */
   constructor();

   /**
    * The init method that can be overridden or extended.
    * @param {Core} core The ForerunnerDB core instance.
    */
   init(core: Core): void;

   /**
    * Gets / sets the rootPath for the client to use in each API call.
    * @name rootPath
    * @method NodeApiClient.rootPath
    * @param {String=} val The path to set.
    * @returns {*}
    */
   static rootPath(val?: String): any;

   /**
    * Set the url of the server to use for API.
    * @param {String} host The server host name including protocol. E.g.
    * "https://0.0.0.0".
    * @param {String} port The server port number e.g. "8080".
    */
   server(host: String, port: String): void;

   /**
    * Gets/ sets a global object that will be sent up with client
    * requests to the API or REST server.
    * @param {String} key The key to send the session object up inside.
    * @param {*} obj The object / value to send up with all requests. If
    * a request has its own data to send up, this session data will be
    * mixed in to the request data under the specified key.
    */
   session(key: String, obj: any): void;

   /**
    * Initiates a client connection to the API server.
    * @param collectionInstance
    * @param path
    * @param query
    * @param options
    * @param callback
    */
   sync(collectionInstance: any, path: any, query: any, options: any, callback: any): void;

}

/**
 * The NodeApiServer class.
 * @class
 * @constructor
 */
declare class NodeApiServer {
   /**
    * The NodeApiServer class.
    * @class
    * @constructor
    */
   constructor();

   /**
    * The init method that can be overridden or extended.
    * @param {Core} core The ForerunnerDB core instance.
    */
   init(core: Core): void;

   /**
    * Starts the rest server listening for requests against the ip and
    * port number specified.
    * @param {String} host The IP address to listen on, set to 0.0.0.0 to
    * listen on all interfaces.
    * @param {String} port The port to listen on.
    * @param {Object} options An options object.
    * @param {Function=} callback The method to call when the server has
    * started (or failed to start).
    * @returns {NodeApiServer}
    */
   start(host: String, port: String, options: Object, callback?: (() => any)): NodeApiServer;

   /**
    * Gets the express app (router).
    * @returns {*}
    */
   serverApp(): any;

   /**
    * Gets the express library.
    * @returns {*|exports|module.exports}
    */
   express(): (any|exports|module.exports);

   /**
    * Creates the http(s) server instance.
    * @param options
    * @param callback
    * @private
    */
   private _createHttpServer(options: any, callback: any): void;

   /**
    * Uses PEM module to generate a self-signed SSL certificate and creates
    * an https server from it, returning it in the callback.
    * @param callback
    * @private
    */
   private _generateSelfCertHttpsServer(callback: any): void;

   /**
    * Stops the server listener.
    */
   stop(): void;

   /**
    * Handles requests from clients to the endpoints the database exposes.
    * @param req
    * @param res
    */
   handleRequest(req: any, res: any): void;

   /**
    * Handles client requests to open an EventSource connection to our
    * server-sent events server.
    * @param req
    * @param res
    */
   handleSyncRequest(req: any, res: any): void;

   /**
    * Sends server-sent-events message to all connected clients that are listening
    * to the changes in the IO that is passed.
    * @param io
    * @param eventName
    * @param data
    */
   sendToAll(io: any, eventName: any, data: any): void;

   /**
    * Sends data to individual client.
    * @param res
    * @param messageId
    * @param eventName
    * @param stringifiedData Data to send in already-stringified format.
    */
   sendToClient(res: any, messageId: any, eventName: any, stringifiedData: any): void;

   /**
    * Checks for permission to access the specified object.
    * @param {String} dbName
    * @param {String} objType
    * @param {String} objName
    * @param {String} methodName
    * @param {Object} req
    * @param {Function} callback
    * @returns {*}
    */
   hasPermission(dbName: String, objType: String, objName: String, methodName: String, req: Object, callback: (() => any)): any;

   /**
    * Defines an access rule for an object and HTTP method combination. When
    * access is requested via a REST call, the function provided will be
    * executed and the callback from that method will determine if the
    * access will be allowed or denied. Multiple access functions can
    * be provided for a single model and method allowing authentication
    * checks to be stacked.
    *
    * This call also allows you to pass a wildcard "*" instead of the objType,
    * objName and methodName parameters which will match all items. This
    * allows you to set permissions globally.
    *
    * If no access permissions are present ForerunnerDB will automatically
    * deny any request to the resource by default.
    * @name access
    * @method NodeApiServer.access
    * @param {String} dbName The name of the database to set access rules for.
    * @param {String} objType The type of object that the name refers to
    * e.g. "collection", "view" etc. This effectively maps to a method name on
    * the Db class instance. If you can do db.collection() then you can use the
    * string "collection" since it maps to the db.collection() method. This means
    * you can also use this to map to custom classes as long as you register
    * an accessor method on the Db class.
    * @param {String} objName The object name to apply the access rule to.
    * @param {String} methodName The name of the HTTP method to apply the access
    * function to e.g. "GET", "POST", "PUT", "PATCH" etc.
    * @param {Function|String} checkFunction The function to call when an access
    * attempt is made against the collection. A callback method is passed to this
    * function which should be called after the function has finished
    * processing. If you do not need custom logic to allow or deny access you
    * can simply pass the string "allow" or "deny" instead of a function and
    * ForerunnerDB will handle the logic automatically.
    * @returns {*}
    */
   static access(dbName: String, objType: String, objName: String, methodName: String, checkFunction: ((() => any)|String)): any;

   /**
    * Creates the routes that express will expose to clients.
    * @private
    */
   private _defineRoutes(): void;

}

/**
 * Create a constructor method that calls the instance's init method.
 * This allows the constructor to be overridden by other modules because
 * they can override the init method with their own.
 * @class
 * @constructor
 */
declare class NodeRAS {
   /**
    * Create a constructor method that calls the instance's init method.
    * This allows the constructor to be overridden by other modules because
    * they can override the init method with their own.
    * @class
    * @constructor
    */
   constructor();

   /**
    * Appends new data to the end of the file.
    * @param filePath The file to operate on.
    * @param primaryKey The data entry's primary key.
    * @param data The data to write.
    * @param callback A callback after the operation has finished.
    */
   post(filePath: any, primaryKey: any, data: any, callback: any): void;

   /**
    *
    * @param filePath The file to operate on.
    * @param primaryKey The data entry's primary key.
    * @param data The data to write.
    * @param callback
    */
   put(filePath: any, primaryKey: any, data: any, callback: any): void;

   /**
    * Scans the data file specified and removes entries marked for deletion,
    * de-fragments entries that span multiple points and then re-writes the
    * file.
    *
    * @returns {Number} The number of bytes saved by the compact process.
    * This is the file size in bytes before the operation minus the file size
    * in bytes after the operation.
    */
   compact(): Number;

}

/**
 * The ODM class provides some experimental interfaces for accessing collection data.
 * This is considered alpha code and should not be used in production.
 * @experimental
 * @class
 * @constructor
 */
declare class Odm {
   /**
    * The ODM class provides some experimental interfaces for accessing collection data.
    * This is considered alpha code and should not be used in production.
    * @experimental
    * @class
    * @constructor
    */
   constructor();

   /**
    * Queries the current object and returns a result that can
    * also be queried in the same way.
    * @param {String} prop The property to delve into.
    * @param {Object=} query Optional query that limits the returned documents.
    * @returns {Odm}
    */
   $(prop: String, query?: Object): Odm;

   /**
    * Gets / sets a property on the current ODM document.
    * @param {String} prop The name of the property.
    * @param {*} val Optional value to set.
    * @returns {*}
    */
   prop(prop: String, val: any): any;

}

/**
 * The view constructor.
 * @param viewName
 * @constructor
 */
declare class OldView {
   /**
    * The view constructor.
    * @param viewName
    * @constructor
    */
   constructor(viewName: any);

   /**
    * Binds a selector to the insert, update and delete events of a particular
    * view and keeps the selector in sync so that updates are reflected on the
    * web page in real-time.
    *
    * @param {String} selector The jQuery selector string to get target elements.
    * @param {Object} options The options object.
    */
   bind(selector: String, options: Object): void;

   /**
    * Un-binds a selector from the view changes.
    * @param {String} selector The jQuery selector string to identify the bind to remove.
    * @returns {Collection}
    */
   unBind(selector: String): Collection;

   /**
    * Returns true if the selector is bound to the view.
    * @param {String} selector The jQuery selector string to identify the bind to check for.
    * @returns {boolean}
    */
   isBound(selector: String): boolean;

   /**
    * Sorts items in the DOM based on the bind settings and the passed item array.
    * @param {String} selector The jQuery selector of the bind container.
    * @param {Array} itemArr The array of items used to determine the order the DOM
    * elements should be in based on the order they are in, in the array.
    */
   bindSortDom(selector: String, itemArr: Array): void;

   /**
    * Renders a bind view data to the DOM.
    * @param {String} bindSelector The jQuery selector string to use to identify
    * the bind target. Must match the selector used when defining the original bind.
    * @param {Function=} domHandler If specified, this handler method will be called
    * with the final HTML for the view instead of the DB handling the DOM insertion.
    */
   bindRender(bindSelector: String, domHandler?: (() => any)): void;

   /**
    * Drops a view and all it's stored data from the database.
    * @returns {boolean} True on success, false on failure.
    */
   drop(): boolean;

   /**
    * Gets / sets the DB the view is bound against. Automatically set
    * when the db.oldView(viewName) method is called.
    * @param db
    * @returns {*}
    */
   db(db: any): any;

   /**
    * Gets / sets the collection that the view derives it's data from.
    * @param {*} collection A collection instance or the name of a collection
    * to use as the data set to derive view data from.
    * @returns {*}
    */
   from(collection: any): any;

   /**
    * Gets the primary key for this view from the assigned collection.
    * @returns {String}
    */
   primaryKey(): String;

   /**
    * Gets / sets the query that the view uses to build it's data set.
    * @param {Object=} query
    * @param {Boolean=} options An options object.
    * @param {Boolean=} refresh Whether to refresh the view data after
    * this operation. Defaults to true.
    * @returns {*}
    */
   queryData(query?: Object, options?: Boolean, refresh?: Boolean): any;

   /**
    * Add data to the existing query.
    * @param {Object} obj The data whose keys will be added to the existing
    * query object.
    * @param {Boolean} overwrite Whether or not to overwrite data that already
    * exists in the query object. Defaults to true.
    * @param {Boolean=} refresh Whether or not to refresh the view data set
    * once the operation is complete. Defaults to true.
    */
   queryAdd(obj: Object, overwrite: Boolean, refresh?: Boolean): void;

   /**
    * Remove data from the existing query.
    * @param {Object} obj The data whose keys will be removed from the existing
    * query object.
    * @param {Boolean=} refresh Whether or not to refresh the view data set
    * once the operation is complete. Defaults to true.
    */
   queryRemove(obj: Object, refresh?: Boolean): void;

   /**
    * Gets / sets the query being used to generate the view data.
    * @param {Object=} query The query to set.
    * @param {Boolean=} refresh Whether to refresh the view data after
    * this operation. Defaults to true.
    * @returns {*}
    */
   query(query?: Object, refresh?: Boolean): any;

   /**
    * Gets / sets the query options used when applying sorting etc to the
    * view data set.
    * @param {Object=} options An options object.
    * @param {Boolean=} refresh Whether to refresh the view data after
    * this operation. Defaults to true.
    * @returns {*}
    */
   queryOptions(options?: Object, refresh?: Boolean): any;

   /**
    * Refreshes the view data and diffs between previous and new data to
    * determine if any events need to be triggered or DOM binds updated.
    */
   refresh(): void;

   /**
    * Returns the number of documents currently in the view.
    * @returns {Number}
    */
   count(): Number;

   /**
    * Queries the view data. See Collection.find() for more information.
    * @returns {*}
    */
   find(): any;

   /**
    * Inserts into view data via the view collection. See Collection.insert() for more information.
    * @returns {*}
    */
   insert(): any;

   /**
    * Updates into view data via the view collection. See Collection.update() for more information.
    * @returns {*}
    */
   update(): any;

   /**
    * Removed from view data via the view collection. See Collection.remove() for more information.
    * @returns {*}
    */
   remove(): any;

}

/**
 * The operation class, used to store details about an operation being
 * performed by the database.
 * @param {String} name The name of the operation.
 * @constructor
 */
declare class Operation {
   /**
    * The operation class, used to store details about an operation being
    * performed by the database.
    * @param {String} name The name of the operation.
    * @constructor
    */
   constructor(name: String);

   /**
    * Starts the operation timer.
    */
   start(): void;

   /**
    * Adds an item to the operation log.
    * @param {String} event The item to log.
    * @returns {*}
    */
   log(event: String): any;

   /**
    * Called when starting and ending a timed operation, used to time
    * internal calls within an operation's execution.
    * @param {String} section An operation name.
    * @returns {*}
    */
   time(section: String): any;

   /**
    * Used to set key/value flags during operation execution.
    * @param {String} key
    * @param {String} val
    * @returns {*}
    */
   flag(key: String, val: String): any;

   /**
    * Stops the operation timer.
    */
   stop(): void;

}

/**
 * Allows a method to accept overloaded calls with different parameters controlling
 * which passed overload function is called.
 * @param {String=} name A name to provide this overload to help identify
 * it if any errors occur during the resolving phase of the overload. This
 * is purely for debug purposes and serves no functional purpose.
 * @param {Object} def The overload definition.
 * @returns {Function}
 * @constructor
 */
declare class Overload {
   /**
    * Allows a method to accept overloaded calls with different parameters controlling
    * which passed overload function is called.
    * @param {String=} name A name to provide this overload to help identify
    * it if any errors occur during the resolving phase of the overload. This
    * is purely for debug purposes and serves no functional purpose.
    * @param {Object} def The overload definition.
    * @returns {Function}
    * @constructor
    */
   constructor(name?: String, def: Object);

   /**
    * Generates an array of all the different definition signatures that can be
    * created from the passed string with a catch-all wildcard *. E.g. it will
    * convert the signature: string,*,string to all potentials:
    * string,string,string
    * string,number,string
    * string,object,string,
    * string,function,string,
    * string,undefined,string
    *
    * @param {String} str Signature string with a wildcard in it.
    * @returns {Array} An array of signature strings that are generated.
    */
   generateSignaturePermutations(str: String): Array;

}

/**
 * The Overview class provides a queryable interface for data aggregation in realtime.
 * @class
 */
declare class Overview {
   /**
    * The Overview class provides a queryable interface for data aggregation in realtime.
    * @class
    */
   constructor();

   /**
    * Checks if the instance is data-bound to any DOM elements.
    * @func isLinked
    * @memberof Overview
    * @returns {Boolean} True if linked, false if not.
    */
   static isLinked(): Boolean;

   /**
    * Creates a link to the DOM between the overview data and the elements
    * in the passed output selector. When new elements are needed or changes
    * occur the passed templateSelector is used to get the template that is
    * output to the DOM.
    * @func link
    * @memberof Overview
    * @param outputTargetSelector
    * @param templateSelector
    * @param {Object=} options An options object.
    * @see unlink
    */
   static link(outputTargetSelector: any, templateSelector: any, options?: Object): void;

   /**
    * Removes a link to the DOM between the overview data and the elements
    * in the passed output selector that was created using the link() method.
    * @func unlink
    * @memberof Overview
    * @param outputTargetSelector
    * @param templateSelector
    * @see link
    */
   static unlink(outputTargetSelector: any, templateSelector: any): void;

   /**
    * Initialises the overview, called by the class as it is instantiated.
    * @constructor
    */
   class init {
       /**
        * Initialises the overview, called by the class as it is instantiated.
        * @constructor
        */
       constructor();

   }

   /**
    * Gets / sets the data source the overview uses for underlying data.
    * @param {Collection|View=} source The data source to set.
    * @returns {*}
    */
   from(source: (Collection|View)): any;

   /**
    * Returns the data in the overview.
    * @param {Object=} query The query object.
    * @param {Object=} options An options object.
    * @param {Function=} callback A callback method.
    * @returns {*}
    * @see Collection.find()
    */
   find(query?: Object, options?: Object, callback?: (() => any)): any;

   /**
    * Executes and returns the response from the current reduce method
    * assigned to the overview.
    * @returns {*}
    */
   exec(): any;

   /**
    * Returns a count of the documents in the overview data set.
    * @returns {*}
    */
   count(): any;

   /**
    * Gets the module's internal data collection.
    * @returns {Collection}
    */
   data(): Collection;

   /**
    * Drops the overview.
    * @param {Function=} callback A callback function.
    * @returns {Boolean}
    */
   drop(callback?: (() => any)): Boolean;

}

/**
 * Path object used to resolve object paths and retrieve data from
 * objects by using paths.
 * @param {String=} path The path to assign.
 * @constructor
 */
declare class Path {
   /**
    * Path object used to resolve object paths and retrieve data from
    * objects by using paths.
    * @param {String=} path The path to assign.
    * @constructor
    */
   constructor(path?: String);

   /**
    * Gets / sets the given path for the Path instance.
    * @param {String=} path The path to assign.
    */
   path(path?: String): void;

   /**
    * Tests if the passed object has the paths that are specified and that
    * a value exists in those paths.
    * @param {Object} testKeys The object describing the paths to test for.
    * @param {Object} testObj The object to test paths against.
    * @returns {Boolean} True if the object paths exist.
    */
   hasObjectPaths(testKeys: Object, testObj: Object): Boolean;

   /**
    * Counts the total number of key endpoints in the passed object.
    * @param {Object} testObj The object to count key endpoints for.
    * @returns {Number} The number of endpoints.
    */
   countKeys(testObj: Object): Number;

   /**
    * Tests if the passed object has the paths that are specified and that
    * a value exists in those paths and if so returns the number matched.
    * @param {Object} testKeys The object describing the paths to test for.
    * @param {Object} testObj The object to test paths against.
    * @returns {Object} Stats on the matched keys
    */
   countObjectPaths(testKeys: Object, testObj: Object): Object;

   /**
    * Takes a non-recursive object and converts the object hierarchy into
    * a path string.
    * @param {Object} obj The object to parse.
    * @param {Boolean=} withValue If true will include a 'value' key in the returned
    * object that represents the value the object path points to.
    * @returns {Object}
    */
   parse(obj: Object, withValue?: Boolean): Object;

   /**
    * Takes a non-recursive object and converts the object hierarchy into
    * an array of path strings that allow you to target all possible paths
    * in an object.
    *
    * The options object accepts an "ignore" field with a regular expression
    * as the value. If any key matches the expression it is not included in
    * the results.
    *
    * The options object accepts a boolean "verbose" field. If set to true
    * the results will include all paths leading up to endpoints as well as
    * they endpoints themselves.
    *
    * @returns {Array}
    */
   parseArr(): Array;

   /**
    * Sets a value on an object for the specified path.
    * @param {Object} obj The object to update.
    * @param {String} path The path to update.
    * @param {*} val The value to set the object path to.
    * @returns {*}
    */
   set(obj: Object, path: String, val: any): any;

   /**
    * Gets a single value from the passed object and given path.
    * @param {Object} obj The object to inspect.
    * @param {String} path The path to retrieve data from.
    * @returns {*}
    */
   get(obj: Object, path: String): any;

   /**
    * Gets the value(s) that the object contains for the currently assigned path string.
    * @param {Object} obj The object to evaluate the path against.
    * @param {String=} path A path to use instead of the existing one passed in path().
    * @param {Object=} options An optional options object.
    * @returns {Array} An array of values for the given path.
    */
   value(obj: Object, path?: String, options?: Object): Array;

   /**
    * Push a value to an array on an object for the specified path.
    * @param {Object} obj The object to update.
    * @param {String} path The path to the array to push to.
    * @param {*} val The value to push to the array at the object path.
    * @returns {*}
    */
   push(obj: Object, path: String, val: any): any;

   /**
    * Gets the value(s) that the object contains for the currently assigned path string
    * with their associated keys.
    * @param {Object} obj The object to evaluate the path against.
    * @param {String=} path A path to use instead of the existing one passed in path().
    * @returns {Array} An array of values for the given path with the associated key.
    */
   keyValue(obj: Object, path?: String): Array;

   /**
    * Removes leading period (.) from string and returns it.
    * @param {String} str The string to clean.
    * @returns {*}
    */
   clean(str: String): any;

}

/**
 * The persistent storage class handles loading and saving data to browser
 * storage.
 * @class
 * @constructor
 */
declare class Persist {
   /**
    * The persistent storage class handles loading and saving data to browser
    * storage.
    * @class
    * @constructor
    */
   constructor();

   /**
    * The local forage library.
    */
   localforage: any;

   /**
    * The init method that can be overridden or extended.
    * @param {Db} db The ForerunnerDB database instance.
    */
   init(db: Db): void;

   /**
    * Gets / sets the persistent storage mode (the library used
    * to persist data to the browser - defaults to localForage).
    * @param {String} type The library to use for storage. Defaults
    * to localForage.
    * @returns {*}
    */
   mode(type: String): any;

   /**
    * Gets / sets the driver used when persisting data.
    * @param {String} val Specify the driver type (LOCALSTORAGE,
    * WEBSQL or INDEXEDDB)
    * @returns {*}
    */
   driver(val: String): any;

   /**
    * Starts a decode waterfall process.
    * @param {*} val The data to be decoded.
    * @param {Function} finished The callback to pass final data to.
    */
   decode(val: any, finished: (() => any)): void;

   /**
    * Starts an encode waterfall process.
    * @param {*} val The data to be encoded.
    * @param {Function} finished The callback to pass final data to.
    */
   encode(val: any, finished: (() => any)): void;

   /**
    * Adds an encode/decode step to the persistent storage system so
    * that you can add custom functionality.
    * @name addStep
    * @method Persist.addStep
    * @param {Function} obj The object to encode / decode.
    */
   static addStep(obj: (() => any)): void;

   /**
    * Takes encoded data and decodes it for use as JS native objects and arrays.
    * @param {String} val The currently encoded string data.
    * @param {Object} meta Meta data object that can be used to pass back useful
    * supplementary data.
    * @param {Function} finished The callback method to call when decoding is
    * completed.
    * @private
    */
   private _decode(val: String, meta: Object, finished: (() => any)): void;

   /**
    * Takes native JS data and encodes it for for storage as a string.
    * @param {Object} val The current un-encoded data.
    * @param {Object} meta Meta data object that can be used to pass back useful
    * supplementary data.
    * @param {Function} finished The callback method to call when encoding is
    * completed.
    * @private
    */
   private _encode(val: Object, meta: Object, finished: (() => any)): void;

   /**
    * Encodes passed data and then stores it in the browser's persistent
    * storage layer.
    * @param {String} key The key to store the data under in the persistent
    * storage.
    * @param {Object} data The data to store under the key.
    * @param {Function=} callback The method to call when the save process
    * has completed.
    */
   save(key: String, data: Object, callback?: (() => any)): void;

   /**
    * Loads and decodes data from the passed key.
    * @param {String} key The key to retrieve data from in the persistent
    * storage.
    * @param {Function=} callback The method to call when the load process
    * has completed.
    */
   load(key: String, callback?: (() => any)): void;

   /**
    * Deletes data in persistent storage stored under the passed key.
    * @param {String} key The key to drop data for in the storage.
    * @param {Function=} callback The method to call when the data is dropped.
    */
   drop(key: String, callback?: (() => any)): void;

}

/**
 * This class handles remote procedure call generation. It is an
 * extension of the NodeApiServer class and is primarily used there.
 * It allows procedures to be created that are exposed to remote
 * clients via the REST interface. Procedures handle their own server
 * code including responding to clients directly.
 * @param {String} name The name of the procedure.
 * @param {Function} method The handler method.
 * @class
 * @constructor
 */
declare class Procedure {
   /**
    * This class handles remote procedure call generation. It is an
    * extension of the NodeApiServer class and is primarily used there.
    * It allows procedures to be created that are exposed to remote
    * clients via the REST interface. Procedures handle their own server
    * code including responding to clients directly.
    * @param {String} name The name of the procedure.
    * @param {Function} method The handler method.
    * @class
    * @constructor
    */
   constructor(name: String, method: (() => any));

   /**
    * Create a remote procedure call.
    * @param {String} name The name of the procedure.
    * @param {Function} method The procedure handler.
    */
   init(name: String, method: (() => any)): void;

   /**
    * Get / set the procedure name.
    * @name name
    * @method Procedure.name
    * @param {String=} name The name to set.
    */
   static name(name?: String): void;

   /**
    * Execute the procedure, passing in the request and response
    * (req and res) arguments from the server. Procedure methods
    * are responsible for correctly communicating with the client
    * and handling response properly.
    * @param req
    * @param res
    * @returns {*}
    */
   exec(req: any, res: any): any;

}

/**
 * Provides chain reactor node linking so that a chain reaction can propagate
 * down a node tree. Effectively creates a chain link between the reactorIn and
 * reactorOut objects where a chain reaction from the reactorIn is passed through
 * the reactorProcess before being passed to the reactorOut object. Reactor
 * packets are only passed through to the reactorOut if the reactor IO method
 * chainSend is used.
 * @param {*} reactorIn An object that has the Mixin.ChainReactor methods mixed
 * in to it. Chain reactions that occur inside this object will be passed through
 * to the reactorOut object.
 * @param {*} reactorOut An object that has the Mixin.ChainReactor methods mixed
 * in to it. Chain reactions that occur in the reactorIn object will be passed
 * through to this object.
 * @param {Function} reactorProcess The processing method to use when chain
 * reactions occur.
 * @constructor
 */
declare class ReactorIO {
   /**
    * Provides chain reactor node linking so that a chain reaction can propagate
    * down a node tree. Effectively creates a chain link between the reactorIn and
    * reactorOut objects where a chain reaction from the reactorIn is passed through
    * the reactorProcess before being passed to the reactorOut object. Reactor
    * packets are only passed through to the reactorOut if the reactor IO method
    * chainSend is used.
    * @param {*} reactorIn An object that has the Mixin.ChainReactor methods mixed
    * in to it. Chain reactions that occur inside this object will be passed through
    * to the reactorOut object.
    * @param {*} reactorOut An object that has the Mixin.ChainReactor methods mixed
    * in to it. Chain reactions that occur in the reactorIn object will be passed
    * through to this object.
    * @param {Function} reactorProcess The processing method to use when chain
    * reactions occur.
    * @constructor
    */
   constructor(reactorIn: any, reactorOut: any, reactorProcess: (() => any));

   /**
    * Drop a reactor IO object, breaking the reactor link between the in and out
    * reactor nodes.
    * @returns {boolean}
    */
   drop(): boolean;

}

/**
 * The section class.
 * @class
 * @constructor
 */
declare class Section {
   /**
    * The section class.
    * @class
    * @constructor
    */
   constructor();

   /**
    * Create a constructor method that is called by the instance on instantiation.
    * This allows the constructor to be overridden by other modules because
    * they can override the init method with their own.
    */
   init(): void;

}

/**
 * Provides functionality to encode and decode JavaScript objects to strings
 * and back again. This differs from JSON.stringify and JSON.parse in that
 * special objects such as dates can be encoded to strings and back again
 * so that the reconstituted version of the string still contains a JavaScript
 * date object.
 * @constructor
 */
declare class Serialiser {
   /**
    * Provides functionality to encode and decode JavaScript objects to strings
    * and back again. This differs from JSON.stringify and JSON.parse in that
    * special objects such as dates can be encoded to strings and back again
    * so that the reconstituted version of the string still contains a JavaScript
    * date object.
    * @constructor
    */
   constructor();

}

/**
 * A shared object that can be used to store arbitrary data between class
 * instances, and access helper methods.
 * @mixin
 */
declare class Shared {
   /**
    * A shared object that can be used to store arbitrary data between class
    * instances, and access helper methods.
    * @mixin
    */
   constructor();

   /**
    * Adds a module to ForerunnerDB.
    * @memberof Shared
    * @param {String} name The name of the module.
    * @param {Function} module The module class.
    */
   static addModule(name: String, module: (() => any)): void;

   /**
    * Called by the module once all processing has been completed. Used to determine
    * if the module is ready for use by other modules.
    * @memberof Shared
    * @param {String} name The name of the module.
    */
   static finishModule(name: String): void;

   /**
    * Will call your callback method when the specified module has loaded. If the module
    * is already loaded the callback is called immediately.
    * @memberof Shared
    * @param {String} name The name of the module.
    * @param {Function} callback The callback method to call when the module is loaded.
    */
   static moduleFinished(name: String, callback: (() => any)): void;

   /**
    * Determines if a module has been added to ForerunnerDB or not.
    * @memberof Shared
    * @param {String} name The name of the module.
    * @returns {Boolean} True if the module exists or false if not.
    */
   static moduleExists(name: String): Boolean;

   /**
    * Adds the properties and methods defined in the mixin to the passed
    * object.
    * @memberof Shared
    * @name mixin
    * @param {Object} obj The target object to add mixin key/values to.
    * @param {String} mixinName The name of the mixin to add to the object.
    */
   static mixin: any;

   /**
    * Generates a generic getter/setter method for the passed method name.
    * @memberof Shared
    * @param {Object} obj The object to add the getter/setter to.
    * @param {String} name The name of the getter/setter to generate.
    * @param {Function=} extend A method to call before executing the getter/setter.
    * The existing getter/setter can be accessed from the extend method via the
    * $super e.g. this.$super();
    */
   static synthesize(obj: Object, name: String, extend?: (() => any)): void;

   /**
    * Allows a method to be overloaded.
    * @memberof Shared
    * @param arr
    * @returns {Function}
    * @constructor
    */
   class overload {
       /**
        * Allows a method to be overloaded.
        * @memberof Shared
        * @param arr
        * @returns {Function}
        * @constructor
        */
       constructor(arr: any);

   }

   /**
    * Define the mixins that other modules can use as required.
    * @memberof Shared
    */
   static mixins: any;

}

/**
 * Create a constructor method that calls the instance's init method.
 * This allows the constructor to be overridden by other modules because
 * they can override the init method with their own.
 * @class
 * @constructor
 */
declare class MyModule {
   /**
    * Create a constructor method that calls the instance's init method.
    * This allows the constructor to be overridden by other modules because
    * they can override the init method with their own.
    * @class
    * @constructor
    */
   constructor();

}

/**
 * Creates a new view instance.
 * @param {String} name The name of the view.
 * @param {Object=} query The view's query.
 * @param {Object=} options An options object.
 * @constructor
 */
declare class View {
   /**
    * Creates a new view instance.
    * @param {String} name The name of the view.
    * @param {Object=} query The view's query.
    * @param {Object=} options An options object.
    * @constructor
    */
   constructor(name: String, query?: Object, options?: Object);

   /**
    * Checks if the instance is data-bound to any DOM elements.
    * @func isLinked
    * @memberof View
    * @returns {Boolean} True if linked, false if not.
    */
   static isLinked(): Boolean;

   /**
    * Data-binds the view data to the elements matched by the passed selector.
    * @func link
    * @memberof View
    * @param {String} outputTargetSelector The jQuery element selector to select the element
    * into which the data-bound rendered items will be placed. All existing HTML will be
    * removed from this element.
    * @param {String|Object} templateSelector This can either be a jQuery selector identifying
    * which template element to get the template HTML from that each item in the view's data
    * will use when rendering to the screen, or you can pass an object with a template key
    * containing a string that represents the HTML template such as:
    *     { template: '<div>{{:name}}</div>' }
    * @param {Object=} options An options object.wd
    * @returns {View}
    * @see unlink
    */
   static link(outputTargetSelector: String, templateSelector: (String|Object), options?: Object): View;

   /**
    * Removes a previously set-up data-binding via the link() method.
    * @func unlink
    * @memberof View
    * @param {String} outputTargetSelector The jQuery target selector.
    * @param {String} templateSelector The jQuery template selector.
    * @see link
    * @returns {View}
    */
   static unlink(outputTargetSelector: String, templateSelector: String): View;

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
   private _handleChainIO(chainPacket: Object, self: View): void;

   /**
    * Executes an insert against the view's underlying data-source.
    * @see Collection::insert()
    */
   insert(): void;

   /**
    * Executes an update against the view's underlying data-source.
    * @see Collection::update()
    */
   update(): void;

   /**
    * Executes an updateById against the view's underlying data-source.
    * @see Collection::updateById()
    */
   updateById(): void;

   /**
    * Executes a remove against the view's underlying data-source.
    * @see Collection::remove()
    */
   remove(): void;

   /**
    * Queries the view data.
    * @see Collection::find()
    * @returns {Array} The result of the find query.
    */
   find(): Array;

   /**
    * Queries the view data for a single document.
    * @see Collection::findOne()
    * @returns {Object} The result of the find query.
    */
   findOne(): Object;

   /**
    * Queries the view data by specific id.
    * @see Collection::findById()
    * @returns {Array} The result of the find query.
    */
   findById(): Array;

   /**
    * Queries the view data in a sub-array.
    * @see Collection::findSub()
    * @returns {Array} The result of the find query.
    */
   findSub(): Array;

   /**
    * Queries the view data in a sub-array and returns first match.
    * @see Collection::findSubOne()
    * @returns {Object} The result of the find query.
    */
   findSubOne(): Object;

   /**
    * Gets the module's internal data collection.
    * @returns {Collection}
    */
   data(): Collection;

   /**
    * Sets the source from which the view will assemble its data.
    * @param {Collection|View} source The source to use to assemble view data.
    * @param {Function=} callback A callback method.
    * @returns {*} If no argument is passed, returns the current value of from,
    * otherwise returns itself for chaining.
    */
   from(source: (Collection|View), callback?: (() => any)): any;

   /**
    * The chain reaction handler method for the view.
    * @param {Object} chainPacket The chain reaction packet to handle.
    * @private
    */
   private _chainHandler(chainPacket: Object): void;

   /**
    * Handles when an underlying collection the view is using as a data
    * source is dropped.
    * @param {Collection} collection The collection that has been dropped.
    * @private
    */
   private _collectionDropped(collection: Collection): void;

   /**
    * Creates an index on the view.
    * @see Collection::ensureIndex()
    * @returns {*}
    */
   ensureIndex(): any;

   /**
   /**
    * Listens for an event.
    * @see Mixin.Events::on()
    */
   on(): void;

   /**
    * Cancels an event listener.
    * @see Mixin.Events::off()
    */
   off(): void;

   /**
    * Emits an event.
    * @see Mixin.Events::emit()
    */
   emit(): void;

   /**
    * Emits an event.
    * @see Mixin.Events::deferEmit()
    */
   deferEmit(): void;

   /**
    * Find the distinct values for a specified field across a single collection and
    * returns the results in an array.
    * @param {String} key The field path to return distinct values for e.g. "person.name".
    * @param {Object=} query The query to use to filter the documents used to return values from.
    * @param {Object=} options The query options to use when running the query.
    * @returns {Array}
    */
   distinct(key: String, query?: Object, options?: Object): Array;

   /**
    * Gets the primary key for this view from the assigned collection.
    * @see Collection::primaryKey()
    * @returns {String}
    */
   primaryKey(): String;

   /**
    * @see Mixin.Triggers::addTrigger()
    */
   addTrigger(): void;

   /**
    * @see Mixin.Triggers::removeTrigger()
    */
   removeTrigger(): void;

   /**
    * @see Mixin.Triggers::ignoreTriggers()
    */
   ignoreTriggers(): void;

   /**
    * @see Mixin.Triggers::addLinkIO()
    */
   addLinkIO(): void;

   /**
    * @see Mixin.Triggers::removeLinkIO()
    */
   removeLinkIO(): void;

   /**
    * @see Mixin.Triggers::willTrigger()
    */
   willTrigger(): void;

   /**
    * @see Mixin.Triggers::processTrigger()
    */
   processTrigger(): void;

   /**
    * @see Mixin.Triggers::_triggerIndexOf()
    */
   _triggerIndexOf(): void;

   /**
    * Drops a view and all it's stored data from the database.
    * @returns {boolean} True on success, false on failure.
    */
   drop(): boolean;

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
   queryData(query?: Object, options?: Boolean, refresh?: Boolean): any;

   /**
    * Add data to the existing query.
    * @param {Object} obj The data whose keys will be added to the existing
    * query object.
    * @param {Boolean} overwrite Whether or not to overwrite data that already
    * exists in the query object. Defaults to true.
    * @param {Boolean=} refresh Whether or not to refresh the view data set
    * once the operation is complete. Defaults to true.
    */
   queryAdd(obj: Object, overwrite: Boolean, refresh?: Boolean): void;

   /**
    * Remove data from the existing query.
    * @param {Object} obj The data whose keys will be removed from the existing
    * query object.
    * @param {Boolean=} refresh Whether or not to refresh the view data set
    * once the operation is complete. Defaults to true.
    */
   queryRemove(obj: Object, refresh?: Boolean): void;

   /**
    * Gets / sets the query being used to generate the view data. It
    * does not change or modify the view's query options.
    * @param {Object=} query The query to set.
    * @param {Boolean=} refresh Whether to refresh the view data after
    * this operation. Defaults to true.
    * @returns {*}
    */
   query: any;

   /**
    * Gets / sets the orderBy clause in the query options for the view.
    * @param {Object=} val The order object.
    * @returns {*}
    */
   orderBy(val?: Object): any;

   /**
    * Gets / sets the page clause in the query options for the view.
    * @param {Number=} val The page number to change to (zero index).
    * @returns {*}
    */
   page(val?: Number): any;

   /**
    * Jump to the first page in the data set.
    * @returns {*}
    */
   pageFirst(): any;

   /**
    * Jump to the last page in the data set.
    * @returns {*}
    */
   pageLast(): any;

   /**
    * Move forward or backwards in the data set pages by passing a positive
    * or negative integer of the number of pages to move.
    * @param {Number} val The number of pages to move.
    * @returns {*}
    */
   pageScan(val: Number): any;

   /**
    * Gets / sets the query options used when applying sorting etc to the
    * view data set.
    * @param {Object=} options An options object.
    * @param {Boolean=} refresh Whether to refresh the view data after
    * this operation. Defaults to true.
    * @returns {*}
    */
   queryOptions(options?: Object, refresh?: Boolean): any;

   /**
    * Clears the existing active bucket and builds a new one based
    * on the passed orderBy object (if one is passed).
    * @param {Object=} orderBy The orderBy object describing how to
    * order any data.
    */
   rebuildActiveBucket(orderBy?: Object): void;

   /**
    * Refreshes the view data such as ordering etc.
    */
   refresh(): void;

   /**
    * Handles when a change has occurred on a collection that is joined
    * by query to this view.
    * @param objName
    * @param objType
    * @private
    */
   private _joinChange(objName: any, objType: any): void;

   /**
    * Returns the number of documents currently in the view.
    * @returns {Number}
    */
   count(): Number;

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
   transform(obj: Object): any;

   /**
    * Executes a method against each document that matches query and returns an
    * array of documents that may have been modified by the method.
    * @param {Object} query The query object.
    * @param {Function} func The method that each document is passed to. If this method
    * returns false for a particular document it is excluded from the results.
    * @param {Object=} options Optional options object.
    * @returns {Array}
    */
   filter(query: Object, func: (() => any), options?: Object): Array;

   /**
    * @see Collection.indexOf
    * @returns {*}
    */
   indexOf(): any;

}

