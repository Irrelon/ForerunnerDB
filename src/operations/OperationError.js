import CoreClass from "../core/CoreClass";

class OperationError extends CoreClass {
	static constants = {
		"UNDEFINED_ERROR": "UNDEFINED_ERROR",
		"INDEX_PREFLIGHT_VIOLATION": "INDEX_PREFLIGHT_VIOLATION"
	};
	
	constructor (data = {"type": OperationError.constants.UNDEFINED_ERROR, meta: {}}) {
		super();
		
		this.type = data.type;
		this.meta = data.meta;
	}
}

export default OperationError;