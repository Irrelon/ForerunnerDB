import CoreClass from "./core/CoreClass";
import {parse} from "@irrelon/path";

/**
 * The index class used to instantiate hash map indexes that the database can
 * use to speed up queries on collections and views.
 * @constructor
 */
class IndexHashMap extends CoreClass {
	constructor (keys, options, collection) {
		super();
		
		this._name = undefined;
		this._collection = undefined;
		this._unique = false;
		this._crossRef = {};
		this._size = 0;
		this._id = this._itemKeyHash(keys, keys);
		
		this.data({});
		this.unique(options && options.unique ? options.unique : false);
		
		if (keys !== undefined) {
			this.keys(keys);
		}
		
		if (collection !== undefined) {
			this.collection(collection);
		}
		
		this.name(options && options.name ? options.name : this._id);
	}
	
	id () {
		return this._id;
	}
	
	state () {
		return this._state;
	}
	
	size () {
		return this._size;
	}
	
	keys (val) {
		if (val !== undefined) {
			this._keys = val;
			
			// Count the keys
			this._keyCount = Object.keys(this._keys).length;
			return this;
		}
		
		return this._keys;
	}
	
	rebuild () {
		// Do we have a collection?
		if (this._collection) {
			// Get sorted data
			const collection = this._collection.subset({}, {
					$decouple: false,
					$orderBy: this._keys
				}),
				collectionData = collection.find(),
				dataCount = collectionData.length;
			
			let dataIndex;
			
			// Clear the index data for the index
			this._data = {};
			this._size = 0;
			
			if (this._unique) {
				this._uniqueLookup = {};
			}
			
			// Loop the collection data
			for (dataIndex = 0; dataIndex < dataCount; dataIndex++) {
				this.insert(collectionData[dataIndex]);
			}
		}
		
		this._state = {
			name: this._name,
			keys: this._keys,
			indexSize: this._size,
			built: new Date(),
			updated: new Date(),
			ok: true
		};
	}
	
	insert (dataItem, options) {
		const uniqueFlag = this._unique;
		let uniqueHash, itemHashArr, hashIndex;
		
		if (uniqueFlag) {
			uniqueHash = this._itemHash(dataItem, this._keys);
			this._uniqueLookup[uniqueHash] = dataItem;
		}
		
		// Generate item hash
		itemHashArr = this._itemHashArr(dataItem, this._keys);
		
		// Get the path search results and store them
		for (hashIndex = 0; hashIndex < itemHashArr.length; hashIndex++) {
			this.pushToPathValue(itemHashArr[hashIndex], dataItem);
		}
	}
	
	update (dataItem, options) {
		// TODO: Write updates to work
		// 1: Get uniqueHash for the dataItem primary key value (may need to generate a store for this)
		// 2: Remove the uniqueHash as it currently stands
		// 3: Generate a new uniqueHash for dataItem
		// 4: Insert the new uniqueHash
	}
	
	remove (dataItem, options) {
		const uniqueFlag = this._unique;
		let	uniqueHash, itemHashArr, hashIndex;
		
		if (uniqueFlag) {
			uniqueHash = this._itemHash(dataItem, this._keys);
			delete this._uniqueLookup[uniqueHash];
		}
		
		// Generate item hash
		itemHashArr = this._itemHashArr(dataItem, this._keys);
		
		// Get the path search results and store them
		for (hashIndex = 0; hashIndex < itemHashArr.length; hashIndex++) {
			this.pullFromPathValue(itemHashArr[hashIndex], dataItem);
		}
	}
	
	violation (dataItem) {
		// Generate item hash
		const uniqueHash = this._itemHash(dataItem, this._keys);
		
		// Check if the item breaks the unique constraint
		return Boolean(this._uniqueLookup[uniqueHash]);
	}
	
	hashViolation (uniqueHash) {
		// Check if the item breaks the unique constraint
		return Boolean(this._uniqueLookup[uniqueHash]);
	};
	
	pushToPathValue (hash, obj) {
		var pathValArr = this._data[hash] = this._data[hash] || [];
		
		// Make sure we have not already indexed this object at this path/value
		if (pathValArr.indexOf(obj) === -1) {
			// Index the object
			pathValArr.push(obj);
			
			// Record the reference to this object in our index size
			this._size++;
			
			// Cross-reference this association for later lookup
			this.pushToCrossRef(obj, pathValArr);
		}
	}
	
	pullFromPathValue (hash, obj) {
		var pathValArr = this._data[hash],
			indexOfObject;
		
		// Make sure we have already indexed this object at this path/value
		indexOfObject = pathValArr.indexOf(obj);
		
		if (indexOfObject > -1) {
			// Un-index the object
			pathValArr.splice(indexOfObject, 1);
			
			// Record the reference to this object in our index size
			this._size--;
			
			// Remove object cross-reference
			this.pullFromCrossRef(obj, pathValArr);
		}
		
		// Check if we should remove the path value array
		if (!pathValArr.length) {
			// Remove the array
			delete this._data[hash];
		}
	}
	
	pull (obj) {
		// Get all places the object has been used and remove them
		var id = obj[this._collection.primaryKey()],
			crossRefArr = this._crossRef[id],
			arrIndex,
			arrCount = crossRefArr.length,
			arrItem;
		
		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			arrItem = crossRefArr[arrIndex];
			
			// Remove item from this index lookup array
			this._pullFromArray(arrItem, obj);
		}
		
		// Record the reference to this object in our index size
		this._size--;
		
		// Now remove the cross-reference entry for this object
		delete this._crossRef[id];
	}
	
	_pullFromArray (arr, obj) {
		var arrCount = arr.length;
		
		while (arrCount--) {
			if (arr[arrCount] === obj) {
				arr.splice(arrCount, 1);
			}
		}
	}
	
	pushToCrossRef (obj, pathValArr) {
		var id = obj[this._collection.primaryKey()],
			crObj;
		
		this._crossRef[id] = this._crossRef[id] || [];
		
		// Check if the cross-reference to the pathVal array already exists
		crObj = this._crossRef[id];
		
		if (crObj.indexOf(pathValArr) === -1) {
			// Add the cross-reference
			crObj.push(pathValArr);
		}
	}
	
	pullFromCrossRef (obj, pathValArr) {
		var id = obj[this._collection.primaryKey()];
		
		delete this._crossRef[id];
	}
	
	lookup (query) {
		return this._data[this._itemHash(query, this._keys)] || [];
	}
	
	match (query, options) {
		// Check if the passed query has data in the keys our index
		// operates on and if so, is the query sort matching our order
		var pathSolver = new Path();
		var indexKeyArr = pathSolver.parseArr(this._keys),
			queryArr = pathSolver.parseArr(query),
			matchedKeys = [],
			matchedKeyCount = 0,
			i;
		
		// Loop the query array and check the order of keys against the
		// index key array to see if this index can be used
		for (i = 0; i < indexKeyArr.length; i++) {
			if (queryArr[i] === indexKeyArr[i]) {
				matchedKeyCount++;
				matchedKeys.push(queryArr[i]);
			} else {
				// Query match failed - this is a hash map index so partial key match won't work
				return {
					matchedKeys: [],
					totalKeyCount: queryArr.length,
					score: 0
				};
			}
		}
		
		return {
			matchedKeys: matchedKeys,
			totalKeyCount: queryArr.length,
			score: matchedKeyCount
		};
		
		//return pathSolver.countObjectPaths(this._keys, query);
	}
	
	_itemHash (item, keys) {
		var path = new Path(),
			pathData,
			hash = '',
			k;
		
		pathData = path.parse(keys);
		
		for (k = 0; k < pathData.length; k++) {
			if (hash) { hash += '_'; }
			hash += path.value(item, pathData[k].path).join(':');
		}
		
		return hash;
	}
	
	_itemKeyHash (item, keys) {
		var path = new Path(),
			pathData,
			hash = '',
			k;
		
		pathData = path.parse(keys);
		
		for (k = 0; k < pathData.length; k++) {
			if (hash) { hash += '_'; }
			hash += path.keyValue(item, pathData[k].path);
		}
		
		return hash;
	}
	
	_itemHashArr (item, keys) {
		var path = new Path(),
			pathData,
			//hash = '',
			hashArr = [],
			valArr,
			i, k, j;
		
		pathData = path.parse(keys);
		
		for (k = 0; k < pathData.length; k++) {
			valArr = path.value(item, pathData[k].path);
			
			for (i = 0; i < valArr.length; i++) {
				if (k === 0) {
					// Setup the initial hash array
					hashArr.push(valArr[i]);
				} else {
					// Loop the hash array and concat the value to it
					for (j = 0; j < hashArr.length; j++) {
						hashArr[j] = hashArr[j] + '_' + valArr[i];
					}
				}
			}
		}
		
		return hashArr;
	}
}

IndexHashMap.prototype.data = this.synthesize('data');
IndexHashMap.prototype.name = this.synthesize('name');
IndexHashMap.prototype.collection = this.synthesize('collection');
IndexHashMap.prototype.type = this.synthesize('type');
IndexHashMap.prototype.unique = this.synthesize('unique');

export default IndexHashMap;