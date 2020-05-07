/**
 * A document that contains information regarding any error, excluding
 * write concern errors, encountered during the write operation.
 * @type {object}
 * @property {number} code An integer value identifying the error.
 * @property {string} errmsg A description of the error.
 */
class WriteError {
	constructor ({code = 0, errmsg = ""}) {
		this.code = code;
		this.errmsg = errmsg;
	}
}

export default WriteError;