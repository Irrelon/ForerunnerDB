"use strict";

/**
 * Provides object matching algorithm methods.
 * @mixin
 */
var Matching = {
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
	_match: function (source, test, queryOptions, opToApply, options) {
		// TODO: This method is quite long, break into smaller pieces
		var operation,
			applyOp = opToApply,
			recurseVal,
			tmpIndex,
			sourceType = typeof source,
			testType = typeof test,
			matchedAll = true,
			opResult,
			substringCache,
			i;

		if (sourceType === 'object' && source === null) {
			sourceType = 'null';
		}

		if (testType === 'object' && test === null) {
			testType = 'null';
		}

		options = options || {};
		queryOptions = queryOptions || {};

		// Check if options currently holds a root query object
		if (!options.$rootQuery) {
			// Root query not assigned, hold the root query
			options.$rootQuery = test;
		}

		// Check if options currently holds a root source object
		if (!options.$rootSource) {
			// Root query not assigned, hold the root query
			options.$rootSource = source;
		}

		// Assign current query data
		options.$currentQuery = test;

		options.$rootData = options.$rootData || {};

		// Check if the comparison data are both strings or numbers
		if ((sourceType === 'string' || sourceType === 'number' || sourceType === 'null') && (testType === 'string' || testType === 'number' || testType === 'null')) {
			// The source and test data are flat types that do not require recursive searches,
			// so just compare them and return the result
			if (sourceType === 'number' || sourceType === 'null' || testType === 'null') {
				// Number or null comparison
				if (source !== test) {
					matchedAll = false;
				}
			} else {
				// String comparison
				// TODO: We can probably use a queryOptions.$locale as a second parameter here
				// TODO: to satisfy https://github.com/Irrelon/ForerunnerDB/issues/35
				if (source.localeCompare(test)) {
					matchedAll = false;
				}
			}
		} else if ((sourceType === 'string' || sourceType === 'number') && (testType === 'object' && test instanceof RegExp)) {
			if (!test.test(source)) {
				matchedAll = false;
			}
		} else {
			for (i in test) {
				if (test.hasOwnProperty(i)) {
					// Assign previous query data
					options.$previousQuery = options.$parent;

					// Assign parent query data
					options.$parent = {
						query: test[i],
						key: i,
						parent: options.$previousQuery
					};

					// Reset operation flag
					operation = false;

					// Grab first two chars of the key name to check for $
					substringCache = i.substr(0, 2);

					// Check if the property is a comment (ignorable)
					if (substringCache === '//') {
						// Skip this property
						continue;
					}

					// Check if the property starts with a dollar (function)
					if (substringCache.indexOf('$') === 0) {
						// Ask the _matchOp method to handle the operation
						opResult = this._matchOp(i, source, test[i], queryOptions, options);

						// Check the result of the matchOp operation
						// If the result is -1 then no operation took place, otherwise the result
						// will be a boolean denoting a match (true) or no match (false)
						if (opResult > -1) {
							if (opResult) {
								if (opToApply === 'or') {
									return true;
								}
							} else {
								// Set the matchedAll flag to the result of the operation
								// because the operation did not return true
								matchedAll = opResult;
							}

							// Record that an operation was handled
							operation = true;
						}
					}

					// Check for regex
					if (!operation && test[i] instanceof RegExp) {
						operation = true;

						if (sourceType === 'object' && source[i] !== undefined && test[i].test(source[i])) {
							if (opToApply === 'or') {
								return true;
							}
						} else {
							matchedAll = false;
						}
					}

					if (!operation) {
						// Check if our query is an object
						if (typeof(test[i]) === 'object') {
							// Because test[i] is an object, source must also be an object

							// Check if our source data we are checking the test query against
							// is an object or an array
							if (source[i] !== undefined) {
								if (source[i] instanceof Array && !(test[i] instanceof Array)) {
									// The source data is an array, so check each item until a
									// match is found
									recurseVal = false;
									for (tmpIndex = 0; tmpIndex < source[i].length; tmpIndex++) {
										recurseVal = this._match(source[i][tmpIndex], test[i], queryOptions, applyOp, options);

										if (recurseVal) {
											// One of the array items matched the query so we can
											// include this item in the results, so break now
											break;
										}
									}

									if (recurseVal) {
										if (opToApply === 'or') {
											return true;
										}
									} else {
										matchedAll = false;
									}
								} else if (!(source[i] instanceof Array) && test[i] instanceof Array) {
									// The test key data is an array and the source key data is not so check
									// each item in the test key data to see if the source item matches one
									// of them. This is effectively an $in search.
									recurseVal = false;

									for (tmpIndex = 0; tmpIndex < test[i].length; tmpIndex++) {
										recurseVal = this._match(source[i], test[i][tmpIndex], queryOptions, applyOp, options);

										if (recurseVal) {
											// One of the array items matched the query so we can
											// include this item in the results, so break now
											break;
										}
									}

									if (recurseVal) {
										if (opToApply === 'or') {
											return true;
										}
									} else {
										matchedAll = false;
									}
								} else if (typeof(source) === 'object') {
									// Recurse down the object tree
									recurseVal = this._match(source[i], test[i], queryOptions, applyOp, options);

									if (recurseVal) {
										if (opToApply === 'or') {
											return true;
										}
									} else {
										matchedAll = false;
									}
								} else {
									recurseVal = this._match(undefined, test[i], queryOptions, applyOp, options);

									if (recurseVal) {
										if (opToApply === 'or') {
											return true;
										}
									} else {
										matchedAll = false;
									}
								}
							} else {
								// First check if the test match is an $exists
								if (test[i] && test[i].$exists !== undefined) {
									// Push the item through another match recurse
									recurseVal = this._match(undefined, test[i], queryOptions, applyOp, options);

									if (recurseVal) {
										if (opToApply === 'or') {
											return true;
										}
									} else {
										matchedAll = false;
									}
								} else {
									matchedAll = false;
								}
							}
						} else {
							// Check if the prop matches our test value
							if (source && source[i] === test[i]) {
								if (opToApply === 'or') {
									return true;
								}
							} else if (source && source[i] && source[i] instanceof Array && test[i] && typeof(test[i]) !== "object") {
								// We are looking for a value inside an array

								// The source data is an array, so check each item until a
								// match is found
								recurseVal = false;
								for (tmpIndex = 0; tmpIndex < source[i].length; tmpIndex++) {
									recurseVal = this._match(source[i][tmpIndex], test[i], queryOptions, applyOp, options);

									if (recurseVal) {
										// One of the array items matched the query so we can
										// include this item in the results, so break now
										break;
									}
								}

								if (recurseVal) {
									if (opToApply === 'or') {
										return true;
									}
								} else {
									matchedAll = false;
								}
							} else {
								matchedAll = false;
							}
						}
					}

					if (opToApply === 'and' && !matchedAll) {
						return false;
					}
				}
			}
		}

		return matchedAll;
	},

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
	_matchOp: function (key, source, test, queryOptions, options) {
		// Check for commands
		switch (key) {
			case '$gt':
				// Greater than
				return source > test;

			case '$gte':
				// Greater than or equal
				return source >= test;

			case '$lt':
				// Less than
				return source < test;

			case '$lte':
				// Less than or equal
				return source <= test;

			case '$exists':
				// Property exists
				return (source === undefined) !== test;

			case '$eq': // Equals
				return source == test; // jshint ignore:line

			case '$eeq': // Equals equals
				return source === test;

			case '$ne': // Not equals
				return source != test; // jshint ignore:line

			case '$nee': // Not equals equals
				return source !== test;
				
			case '$not': // Not operator
				return !this._match(source, test, queryOptions, 'and', options);

			case '$or':
				// Match true on ANY check to pass
				for (var orIndex = 0; orIndex < test.length; orIndex++) {
					if (this._match(source, test[orIndex], queryOptions, 'and', options)) {
						return true;
					}
				}

				return false;

			case '$and':
				// Match true on ALL checks to pass
				for (var andIndex = 0; andIndex < test.length; andIndex++) {
					if (!this._match(source, test[andIndex], queryOptions, 'and', options)) {
						return false;
					}
				}

				return true;

			case '$in': // In
				// Check that the in test is an array
				if (test instanceof Array) {
					var inArr = test,
						inArrCount = inArr.length,
						inArrIndex;

					for (inArrIndex = 0; inArrIndex < inArrCount; inArrIndex++) {
						if (this._match(source, inArr[inArrIndex], queryOptions, 'and', options)) {
							return true;
						}
					}

					return false;
				} else if (typeof test === 'object') {
					return this._match(source, test, queryOptions, 'and', options);
				} else {
					console.log(this.logIdentifier() + ' Cannot use an $in operator on a non-array key: ' + key, options.$rootQuery);
					return false;
				}
				break;

			case '$nin': // Not in
				// Check that the not-in test is an array
				if (test instanceof Array) {
					var notInArr = test,
						notInArrCount = notInArr.length,
						notInArrIndex;

					for (notInArrIndex = 0; notInArrIndex < notInArrCount; notInArrIndex++) {
						if (this._match(source, notInArr[notInArrIndex], queryOptions, 'and', options)) {
							return false;
						}
					}

					return true;
				} else if (typeof test === 'object') {
					return this._match(source, test, queryOptions, 'and', options);
				} else {
					console.log(this.logIdentifier() + ' Cannot use a $nin operator on a non-array key: ' + key, options.$rootQuery);
					return false;
				}
				break;

			case '$fastIn':
				if (test instanceof Array) {
					// Source is a string or number, use indexOf to identify match in array
					return test.indexOf(source) !== -1;
				} else {
					console.log(this.logIdentifier() + ' Cannot use an $fastIn operator on a non-array key: ' + key, options.$rootQuery);
					return false;
				}
				break;

			case '$distinct':
				var lookupPath,
					value,
					finalDistinctProp;
				
				// Ensure options holds a distinct lookup
				options.$rootData['//distinctLookup'] = options.$rootData['//distinctLookup'] || {};
				
				for (var distinctProp in test) {
					if (test.hasOwnProperty(distinctProp)) {
						if (typeof test[distinctProp] === 'object') {
							// Get the path string from the object
							lookupPath = this.sharedPathSolver.parse(test)[0].path;
							
							// Use the path string to find the lookup value from the source data
							value = this.sharedPathSolver.get(source, lookupPath);
							finalDistinctProp = lookupPath;
						} else {
							value = source[distinctProp];
							finalDistinctProp = distinctProp;
						}
						
						options.$rootData['//distinctLookup'][finalDistinctProp] = options.$rootData['//distinctLookup'][finalDistinctProp] || {};
						
						// Check if the options distinct lookup has this field's value
						if (options.$rootData['//distinctLookup'][finalDistinctProp][value]) {
							// Value is already in use
							return false;
						} else {
							// Set the value in the lookup
							options.$rootData['//distinctLookup'][finalDistinctProp][value] = true;

							// Allow the item in the results
							return true;
						}
					}
				}
				break;

			case '$count':
				var countKey,
					countArr,
					countVal;

				// Iterate the count object's keys
				for (countKey in test) {
					if (test.hasOwnProperty(countKey)) {
						// Check the property exists and is an array. If the property being counted is not
						// an array (or doesn't exist) then use a value of zero in any further count logic
						countArr = source[countKey];
						if (typeof countArr === 'object' && countArr instanceof Array) {
							countVal = countArr.length;
						} else {
							countVal = 0;
						}

						// Now recurse down the query chain further to satisfy the query for this key (countKey)
						if (!this._match(countVal, test[countKey], queryOptions, 'and', options)) {
							return false;
						}
					}
				}

				// Allow the item in the results
				return true;

			case '$find':
			case '$findOne':
			case '$findSub':
				var fromType = 'collection',
					findQuery,
					findOptions,
					subQuery,
					subOptions,
					subPath,
					result,
					operation = {};

				// Check all parts of the $find operation exist
				if (!test.$from) {
					throw(key + ' missing $from property!');
				}

				if (test.$fromType) {
					fromType = test.$fromType;

					// Check the fromType exists as a method
					if (!this.db()[fromType] || typeof this.db()[fromType] !== 'function') {
						throw(key + ' cannot operate against $fromType "' + fromType + '" because the database does not recognise this type of object!');
					}
				}

				// Perform the find operation
				findQuery = test.$query || {};
				findOptions = test.$options || {};

				if (key === '$findSub') {
					if (!test.$path) {
						throw(key + ' missing $path property!');
					}

					subPath = test.$path;
					subQuery = test.$subQuery || {};
					subOptions = test.$subOptions || {};

					if (options.$parent && options.$parent.parent && options.$parent.parent.key) {
						result = this.db()[fromType](test.$from).findSub(findQuery, subPath, subQuery, subOptions);
					} else {
						// This is a root $find* query
						// Test the source against the main findQuery
						if (this._match(source, findQuery, {}, 'and', options)) {
							result = this._findSub([source], subPath, subQuery, subOptions);
						}

						return result && result.length > 0;
					}
				} else {
					result = this.db()[fromType](test.$from)[key.substr(1)](findQuery, findOptions);
				}

				operation[options.$parent.parent.key] = result;
				return this._match(source, operation, queryOptions, 'and', options);
		}

		return -1;
	},

	/**
	 * Performs a join operation and returns the final joined data.
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
	applyJoin: function (docArr, joinClause, joinSource, options) {
		var self = this,
			joinSourceIndex,
			joinSourceKey,
			joinMatch,
			joinSourceType,
			joinSourceIdentifier,
			resultKeyName,
			joinSourceInstance,
			resultIndex,
			joinSearchQuery,
			joinMulti,
			joinRequire,
			joinPrefix,
			joinMatchIndex,
			joinMatchData,
			joinSearchOptions,
			joinFindResults,
			joinFindResult,
			joinItem,
			resultRemove = [],
			l;

		if (!(docArr instanceof Array)) {
			// Turn the document into an array
			docArr = [docArr];
		}

		for (joinSourceIndex = 0; joinSourceIndex < joinClause.length; joinSourceIndex++) {
			for (joinSourceKey in joinClause[joinSourceIndex]) {
				if (joinClause[joinSourceIndex].hasOwnProperty(joinSourceKey)) {
					// Get the match data for the join
					joinMatch = joinClause[joinSourceIndex][joinSourceKey];

					// Check if the join is to a collection (default) or a specified source type
					// e.g 'view' or 'collection'
					joinSourceType = joinMatch.$sourceType || 'collection';
					joinSourceIdentifier = '$' + joinSourceType + '.' + joinSourceKey;

					// Set the key to store the join result in to the collection name by default
					// can be overridden by the '$as' clause in the join object
					resultKeyName = joinSourceKey;

					// Get the join collection instance from the DB
					if (joinSource[joinSourceIdentifier]) {
						// We have a joinSource for this identifier already (given to us by
						// an index when we analysed the query earlier on) and we can use
						// that source instead.
						joinSourceInstance = joinSource[joinSourceIdentifier];
					} else {
						// We do not already have a joinSource so grab the instance from the db
						if (this._db[joinSourceType] && typeof this._db[joinSourceType] === 'function') {
							joinSourceInstance = this._db[joinSourceType](joinSourceKey);
						}
					}

					// Loop our result data array
					for (resultIndex = 0; resultIndex < docArr.length; resultIndex++) {
						// Loop the join conditions and build a search object from them
						joinSearchQuery = {};
						joinMulti = false;
						joinRequire = false;
						joinPrefix = '';

						for (joinMatchIndex in joinMatch) {
							if (joinMatch.hasOwnProperty(joinMatchIndex)) {
								joinMatchData = joinMatch[joinMatchIndex];

								// Check the join condition name for a special command operator
								if (joinMatchIndex.substr(0, 1) === '$') {
									// Special command
									switch (joinMatchIndex) {
										case '$where':
											if (joinMatchData.$query || joinMatchData.$options) {
												if (joinMatchData.$query) {
													// Commented old code here, new one does dynamic reverse lookups
													//joinSearchQuery = joinMatchData.query;
													joinSearchQuery = self.resolveDynamicQuery(joinMatchData.$query, docArr[resultIndex]);
												}
												if (joinMatchData.$options) {
													joinSearchOptions = joinMatchData.$options;
												}
											} else {
												throw('$join $where clause requires "$query" and / or "$options" keys to work!');
											}
											break;

										case '$as':
											// Rename the collection when stored in the result document
											resultKeyName = joinMatchData;
											break;

										case '$multi':
											// Return an array of documents instead of a single matching document
											joinMulti = joinMatchData;
											break;

										case '$require':
											// Remove the result item if no matching join data is found
											joinRequire = joinMatchData;
											break;

										case '$prefix':
											// Add a prefix to properties mixed in
											joinPrefix = joinMatchData;
											break;

										default:
											break;
									}
								} else {
									// Get the data to match against and store in the search object
									// Resolve complex referenced query
									joinSearchQuery[joinMatchIndex] = self.resolveDynamicQuery(joinMatchData, docArr[resultIndex]);
								}
							}
						}

						// Do a find on the target collection against the match data
						joinFindResults = joinSourceInstance.find(joinSearchQuery, joinSearchOptions);

						// Check if we require a joined row to allow the result item
						if (!joinRequire || (joinRequire && joinFindResults[0])) {
							// Join is not required or condition is met
							if (resultKeyName === '$root') {
								// The property name to store the join results in is $root
								// which means we need to mixin the results but this only
								// works if joinMulti is disabled
								if (joinMulti !== false) {
									// Throw an exception here as this join is not physically possible!
									throw(this.logIdentifier() + ' Cannot combine [$as: "$root"] with [$multi: true] in $join clause!');
								}

								// Mixin the result
								joinFindResult = joinFindResults[0];
								joinItem = docArr[resultIndex];

								for (l in joinFindResult) {
									if (joinFindResult.hasOwnProperty(l) && joinItem[joinPrefix + l] === undefined) {
										// Properties are only mixed in if they do not already exist
										// in the target item (are undefined). Using a prefix denoted via
										// $prefix is a good way to prevent property name conflicts
										joinItem[joinPrefix + l] = joinFindResult[l];
									}
								}
							} else {
								docArr[resultIndex][resultKeyName] = joinMulti === false ? joinFindResults[0] : joinFindResults;
							}
						} else {
							// Join required but condition not met, add item to removal queue
							resultRemove.push(resultIndex);
						}
					}
				}
			}
		}

		return resultRemove;
	},

	/**
	 * Takes a query object with dynamic references and converts the references
	 * into actual values from the references source.
	 * @param {Object} query The query object with dynamic references.
	 * @param {Object} item The document to apply the references to.
	 * @returns {*}
	 * @private
	 */
	resolveDynamicQuery: function (query, item) {
		var self = this,
			newQuery,
			propType,
			propVal,
			pathResult,
			i;

		// Check for early exit conditions
		if (typeof query === 'string') {
			// Check if the property name starts with a back-reference
			if (query.substr(0, 3) === '$$.') {
				// Fill the query with a back-referenced value
				pathResult = this.sharedPathSolver.value(item, query.substr(3, query.length - 3));
			} else {
				pathResult = this.sharedPathSolver.value(item, query);
			}

			if (pathResult.length > 1) {
				return {$in: pathResult};
			} else {
				return pathResult[0];
			}
		}

		newQuery = {};

		for (i in query) {
			if (query.hasOwnProperty(i)) {
				propType = typeof query[i];
				propVal = query[i];

				switch (propType) {
					case 'string':
						// Check if the property name starts with a back-reference
						if (propVal.substr(0, 3) === '$$.') {
							// Fill the query with a back-referenced value
							newQuery[i] = this.sharedPathSolver.value(item, propVal.substr(3, propVal.length - 3))[0];
						} else {
							newQuery[i] = propVal;
						}
						break;

					case 'object':
						newQuery[i] = self.resolveDynamicQuery(propVal, item);
						break;

					default:
						newQuery[i] = propVal;
						break;
				}
			}
		}

		return newQuery;
	},

	spliceArrayByIndexList: function (arr, list) {
		var i;

		for (i = list.length - 1; i >= 0; i--) {
			arr.splice(list[i], 1);
		}
	}
};

module.exports = Matching;