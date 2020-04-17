/**
 * A document that contains information regarding any error, excluding write concern errors, encountered during the write operation.
 * @typedef {Object} WriteError
 * @property {string} code An integer value identifying the error.
 * @property {number} errmsg A description of the error.
 */

/**
 * A wrapper that contains the result status of write methods.
 * @name WriteResult
 * @type {object}
 * @property {string} [_id] The _id of the document inserted by an upsert. Returned only if an upsert results in an insert.
 * @property {number} [nInserted=0] The number of documents inserted, excluding upserted documents.
 * @property {number} [nMatched=0] The number of documents selected for update. If the update operation results in no change to the document, e.g. `$set` expression updates the value to the current value, `nMatched` can be greater than `nModified`.
 * @property {number} [nModified=0] The number of existing documents updated. If the update/replacement operation results in no change to the document, such as setting the value of the field to its current value, `nModified` can be less than `nMatched`.
 * @property {number} [nUpserted=0] The number of documents inserted by an upsert.
 * @property {number} [nRemoved=0] The number of documents removed.
 * @property {WriteError} [writeError] A document that contains information regarding any error, excluding write concern errors, encountered during the write operation.
 */

/**
 * A wrapper that contains the result status of write methods.
 * @param {WriteResult} data
 * @constructor
 */
class WriteResult {
	constructor ({nInserted = 0, nMatched = 0, nModified = 0, nUpserted = 0, nRemoved = 0, _id = undefined, writeError = undefined}) {
		this._id = _id;
		this.nInserted = nInserted;
		this.nMatched = nMatched;
		this.nModified = nModified;
		this.nUpserted = nUpserted;
		this.nRemoved = nRemoved;
		this.writeError = writeError;
	}
}

export default WriteResult;