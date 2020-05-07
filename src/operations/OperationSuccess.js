import CoreClass from "../core/CoreClass";

class OperationSuccess extends CoreClass {
	static constants = {
		"UNDEFINED_SUCCESS": "UNDEFINED_SUCCESS",
		"INDEX_PREFLIGHT_SUCCESS": "INDEX_PREFLIGHT_SUCCESS"
	};
	
	constructor (data = {"type": OperationSuccess.constants.UNDEFINED_SUCCESS, meta: {}}) {
		super();
		
		this.type = data.type;
		this.meta = data.meta;
	}
}

export default OperationSuccess;