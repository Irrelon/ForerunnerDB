/**
 * A wrapper that contains the result of a violation check.
 * @param {ViolationCheckResult} data
 * @property {WriteError} error
 * @constructor
 */
import WriteError from "./WriteError";

class ViolationCheckResult {
	constructor ({indexName = "", hash = "", error = undefined}) {
		this.indexName = index;
		this.hash = hash;
		this.error = error;
	}
}

export default ViolationCheckResult;