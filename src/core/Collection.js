import {setImmutable} from "@irrelon/path";
import CoreClass from "./CoreClass";
import WriteResult from "../WriteResult";
import ViolationCheckResult from "../ViolationCheckResult";
import objectId from "../utils/objectId";
import IndexHashMap from "../indexes/IndexHashMap";
import OperationResult from "../operations/OperationResult";
import OperationError from "../operations/OperationError";
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
		console.log("_indexInsert", data._id);
		Object.entries(this._index).forEach(([indexName, index]) => {
			index.insert(data);
		});
	}
	
	async insert (data, options = {}) {
		const isArray = Array.isArray(data);
		
		if (isArray) {
			if (options.ordered === false) {
				return this._insertUnordered(data, options);
			} else {
				return this._insertOrdered(data, options);
			}
		}
		
		const doc = this.ensurePrimaryKey(data);
		console.log("Start insert", data._id)
		const preInsertResult = this._preInsert(doc, options);
		const writeResult = new WriteResult({});
		
		if (preInsertResult.violationCheckResult.error) {
			console.log("preInsertResult", preInsertResult.violationCheckResult.error)
			writeResult.addError(preInsertResult.violationCheckResult.error);
			return writeResult;
		}
		
		this._indexInsert(preInsertResult.data);
		this._data.push(preInsertResult.data);
		
		// Check capped collection status and remove first record
		// if we are over the threshold
		if (this._cap && this._data.length > this._cap) {
			// Remove the first item in the data array
			this.removeById(this._data[0][this._primaryKey]);
		}
		
		writeResult.nInserted++;
		writeResult._data = preInsertResult.data;
		
		return writeResult;
	}
	
	indexViolationCheck = (doc) => {
		// Loop each index and ask it to check if this
		// document violates any index constraints
		return this._index.map((indexObj) => {
			const hash = indexObj.index.documentHash(doc);
			const wouldBeViolated = indexObj.index.willViolateByHash(hash);
			
			if (wouldBeViolated) {
				return new OperationError({
					type: OperationError.constants.INDEX_PREFLIGHT_VIOLATION,
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
	
	operation (docOrArr, func) {
		const opResult = new OperationResult();
		const isArray = Array.isArray(docOrArr);
		
		let data = docOrArr;
		
		if (!isArray) {
			data = [docOrArr];
		}
		
		data.forEach((doc) => {
			const result = func(doc);
			opResult.addResult(result);
		});
		
		return opResult;
	}
	
	insert2 (data, options = {}) {
		// 1 Check index violations on all data
		const isArray = Array.isArray(data);
		const isAtomic = options.atomic === true;
		const isOrdered = options.ordered === true;
		
		// 2 We also need to check that the data won't violate itself,
		// not just the existing records - we need a virtual operation
		// of some sort like index.transaction().insert() then if any operation
		// violates as it progresses the whole transaction is dumped. If no
		// errors occur the transaction can be committed.
		
		// Need to think about a generic transaction system, rather than
		// only for indexes. As we go, we should build up an array of
		// transactions that if one fails, we roll back the entire array
		// or something like that. Or maybe one transaction that has a
		// bunch of pending operations that can be cancelled?
		const opResult = this.operation(data, this.indexViolationCheck);
		
		if (isArray) {
			if (isAtomic && result.error.length > 0) {
				// Atomic operation and we failed at least one op, fail the whole op
				return new OperationResult({
					"error": result.error
				});
			}
		}
		
		// 2 If anything will fail, check if we are running atomic and if so, exit with error
		
		// 3 If not atomic, run through only allowed operations and complete them
		
		// 4 Return result
	}
	
	removeById (id) {
	
	}
}

export default Collection;