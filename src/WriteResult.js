/**
 * A wrapper that contains the result status of write methods.
 * @name WriteResult
 * @type {object}
 * @property {string|undefined} [_id] The _id of the document inserted by an upsert. Returned only if an upsert results in an insert.
 * @property {number} [nInserted=0] The number of documents inserted, excluding upserted documents.
 * @property {number} [nMatched=0] The number of documents selected for update. If the update operation results in no change to the document, e.g. `$set` expression updates the value to the current value, `nMatched` can be greater than
 *     `nModified`.
 * @property {number} [nModified=0] The number of existing documents updated. If the update/replacement operation results in no change to the document, such as setting the value of the field to its current value, `nModified` can be less
 *     than `nMatched`.
 * @property {number} [nUpserted=0] The number of documents inserted by an upsert.
 * @property {number} [nRemoved=0] The number of documents removed.
 * @property {number} [nFailed=0] The number of documents that failed in the operation.
 * @property {WriteError|undefined} [writeError=undefined] A document that contains information regarding any error, excluding write concern errors, encountered during the write operation.
 */

/**
 * A wrapper that contains the result status of write methods.
 * @param {WriteResult} data
 * @constructor
 */
class WriteResult {
	constructor ({nInserted = 0, nMatched = 0, nModified = 0, nUpserted = 0, nRemoved = 0, nFailed = 0, _id = undefined, writeError = undefined}) {
		this._id = _id;
		this._writeError = [];
		this.nInserted = nInserted;
		this.nMatched = nMatched;
		this.nModified = nModified;
		this.nUpserted = nUpserted;
		this.nRemoved = nRemoved;
		this.nFailed = nFailed;
		this._data = [];
		this.isBulk = false;
		
		if (writeError) {
			this._writeError.push(writeError);
		}
	}
	
	/**
	 * Adds the values from the passed write result to this
	 * write result.
	 * @param {WriteResult} writeResult The write result to add to
	 * this write result.
	 */
	add (writeResult) {
		console.log("writeResult.add()");
		// We are adding a write result to this one, it is
		// a bulk result
		this.isBulk = true;
		
		const writeErrors = writeResult.getWriteErrors();
		writeErrors.forEach((writeError) => {
			this.addError(writeError);
		});
		
		if (writeErrors.length) {
			this.nFailed = this._writeError.length;
			return;
		}
		
		this.nInserted += writeResult.nInserted;
		this.nMatched += writeResult.nMatched;
		this.nModified += writeResult.nModified;
		this.nUpserted += writeResult.nUpserted;
		this.nRemoved += writeResult.nRemoved;
		this._data.push(writeResult._data);
	}
	
	addError (writeError) {
		this._writeError.push(writeError);
		this.nFailed = this._writeError.length;
	}
	
	getWriteErrors () {
		return this._writeError;
	}
	
	data () {
		return this.isBulk ? this._data : this._data[0];
	}
}

export default WriteResult;