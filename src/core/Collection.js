import {setImmutable} from "@irrelon/path";
import CoreClass from "./CoreClass";
import objectId from "../utils/objectId";
import IndexHashMap from "../indexes/IndexHashMap";
import OperationResult from "../operations/OperationResult";
import OperationFailure from "../operations/OperationFailure";
import OperationSuccess from "../operations/OperationSuccess";

class Collection extends CoreClass {
	constructor (name) {
		super();
		
		this._name = name;
		this._cap = 0;
		this._primaryKey = "_id";
		this._data = [];
		this._index = [{
			"name": "primaryKey",
			"index": new IndexHashMap({[this._primaryKey]: 1}, {unique: true})
		}];
	}
	
	/**
	 * Checks for a primary key on the document and assigns one if none
	 * currently exists.
	 * @param {Object} obj The object to check a primary key against.
	 * @private
	 */
	ensurePrimaryKey = function (obj) {
		if (obj[this._primaryKey] === undefined) {
			// Assign a primary key automatically
			return setImmutable(obj, this._primaryKey, objectId());
		}
		
		return obj;
	};
	
	async _insertUnordered (data, options = {}) {
		console.log("_insertOrdered", data._id);
		const writeResult = new WriteResult({});
		
		const promiseArr = data.map((item) => {
			return this.insert(item, options);
		});
		
		await Promise.all(promiseArr).then((resultArr) => {
			resultArr.forEach((resultItem) => {
				writeResult.add(resultItem);
			});
		});
		
		return writeResult;
	}
	
	async _insertOrdered (data, options = {}) {
		console.log("_insertOrdered", data._id);
		const writeResult = new WriteResult({});
		
		for (let i = 0; i < data.length; i++) {
			const insertResult = await this.insert(data[i], options);
			writeResult.add(insertResult);
			
			if (writeResult.getWriteErrors().length) {
				return writeResult;
			}
		}
		
		return writeResult;
	}
	
	_preInsert (data, options) {
		console.log("_preInsert", data._id);
		const violationCheckResult = this.indexViolationCheck(data);
		return {
			data,
			violationCheckResult
		};
	};
	
	_indexInsert (data) {
		this._index.forEach((indexObj) => {
			indexObj.index.insert(data);
		});
	}
	
	indexViolationCheck = (doc) => {
		// Loop each index and ask it to check if this
		// document violates any index constraints
		return this._index.map((indexObj) => {
			const hash = indexObj.index.hash(doc);
			const wouldBeViolated = indexObj.index.willViolateByHash(hash);
			
			if (wouldBeViolated) {
				return new OperationFailure({
					type: OperationFailure.constants.INDEX_PREFLIGHT_VIOLATION,
					meta: {
						indexName: indexObj.name,
						hash,
						doc
					}
				});
			} else {
				return new OperationSuccess({
					type: OperationSuccess.constants.INDEX_PREFLIGHT_SUCCESS,
					meta: {
						indexName: indexObj.name,
						hash,
						doc
					}
				});
			}
		});
	};
	
	/**
	 * Run a single operation on a single or multiple data items.
	 * @param {object|Array<object>} docOrArr An array of data items or
	 * a single data item object.
	 * @param {function} func The operation to run on each data item.
	 * @returns {OperationResult} The result of the operation(s).
	 */
	operation (docOrArr, func) {
		const opResult = new OperationResult();
		const isArray = Array.isArray(docOrArr);
		
		let data = docOrArr;
		
		if (!isArray) {
			data = [docOrArr];
		}
		
		data.forEach((doc, currentIndex) => {
			const result = func(doc);
			
			result.atIndex = currentIndex;
			opResult.addResult(result);
		});
		
		return opResult;
	}
	
	insert (data, options = {atomic: false, ordered: false}) {
		// 1 Check index violations against existing data
		const isArray = Array.isArray(data);
		const isAtomic = options.atomic === true;
		const isOrdered = options.ordered === true;
		
		const insertResult = {
			"operation": {
				isArray,
				isAtomic,
				isOrdered,
				data
			},
			"stage": {
				"preflight": null,
				"postflight": null,
				"execute": null
			},
			"nInserted": 0,
			"nFailed": 0
		};
		
		insertResult.stage.preflight = this.operation(data, this.indexViolationCheck);
		
		// 2 Check for index violations against itself when inserted
		// TODO
		
		if (isArray) {
			// 3 If anything will fail, check if we are running atomic and if so, exit with error
			if (isAtomic && insertResult.stage.preflight.failure.length > 0) {
				// Atomic operation and we failed at least one op, fail the whole op
				insertResult.nFailed = insertResult.stage.preflight.failure.length;
				return insertResult;
			}
			
			
		}
		
		// 4 If not atomic, run through only allowed operations and complete them
		const result = this._indexInsert(data);
		this._data.push(data);
		
		// Check capped collection status and remove first record
		// if we are over the threshold
		if (this._cap && this._data.length > this._cap) {
			// Remove the first item in the data array
			this.removeById(this._data[0][this._primaryKey]);
		}
		
		// 5 Return result
		return insertResult;
	}
	
	removeById (id) {
	
	}
}

export default Collection;