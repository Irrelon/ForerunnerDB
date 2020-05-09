import CoreClass from "../core/CoreClass";
import OperationFailure from "./OperationFailure";
import OperationSuccess from "./OperationSuccess";

class OperationResult extends CoreClass {
	constructor (data = {}) {
		super();
		
		this.failure = [];
		this.success = [];
		
		if (data.failure) {
			this.addFailure(data.failure);
		}
		
		if (data.success) {
			this.addSuccess(data.success);
		}
	}
	
	addResult (op) {
		if (Array.isArray(op)) {
			op.forEach((item) => {
				this.addResult(item);
			});
			
			return;
		}
		
		if (op instanceof OperationFailure) {
			return this.addFailure(op);
		}
		
		if (op instanceof OperationSuccess) {
			return this.addSuccess(op);
		}
		
		throw new Error("Operation being added is not an instance of OperationSuccess or OperationFailure!");
	}
	
	/**
	 * Add an failure to the operation result.
	 * @param {OperationFailure|Array<OperationFailure>} failure The failure or array of failures.
	 */
	addFailure (failure) {
		if (Array.isArray(failure)) {
			failure.forEach((item) => {
				this.addFailure(item);
			});
			
			return;
		}
		
		this.failure.push(failure);
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