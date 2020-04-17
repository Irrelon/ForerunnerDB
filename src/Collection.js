import CoreClass from "./CoreClass";
import WriteResult from "./WriteResult";

class Collection extends CoreClass {
	constructor () {
		super();
	}
	
	insert () {
		return new WriteResult({nInserted: 1});
	}
}

export default Collection;