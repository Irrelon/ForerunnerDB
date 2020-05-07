import OperationError from "./operations/OperationError";

class IndexViolationError extends OperationError {
	constructor (props) {
		super(props);
		
	}
}

export default IndexViolationError;