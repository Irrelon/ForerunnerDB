import CoreClass from "../core/CoreClass";

class OperationFailure extends CoreClass {
	static constants = {
		"UNDEFINED_FAILURE": "UNDEFINED_FAILURE",
		"INDEX_PREFLIGHT_VIOLATION": "INDEX_PREFLIGHT_VIOLATION"
	};
	
	constructor (data = {"type": OperationFailure.constants.UNDEFINED_FAILURE, meta: {}}) {
		super();
		
		this.type = data.type;
		this.meta = data.meta;
	}
}

export default OperationFailure;