import CoreClass from "../core/CoreClass";
import OperationError from "./OperationError";
import OperationSuccess from "./OperationSuccess";

class OperationResult extends CoreClass {
	constructor (data = {}) {
		super();
		
		this.error = [];
		this.success = [];
		
		if (data.error) {
			this.addError(data.error);
		}
		
		if (data.success) {
			this.addError(data.success);
		}
	}
	
	addResult (op) {
		if (Array.isArray(op)) {
			op.forEach((item) => {
				this.addResult(item);
			});
			
			return;
		}
		
		if (op instanceof OperationError) {
			return this.addError(op);
		}
		
		if (op instanceof OperationSuccess) {
			return this.addSuccess(op);
		}
		
		throw new Error("Operation being added is not an instance of OperationSuccess or OperationError!");
	}
	
	/**
	 * Add an error to the operation result.
	 * @param {OperationError|Array<OperationError>} error The error or array of errors.
	 */
	addError (error) {
		if (Array.isArray(error)) {
			error.forEach((item) => {
				this.addError(item);
			});
			
			return;
		}
		
		this.error.push(error);
	}
	
	/**
	 * Add a success to the operation result.
	 * @param {OperationSuccess|Array<OperationSuccess>} success The success or array of successes.
	 */
	addSuccess (success) {
		if (Array.isArray(success)) {
			success.forEach((item) => {
				this.addSuccess(item);
			});
			
			return;
		}
		
		this.success.push(success);
	}
}

export default OperationResult;