import CoreClass from "./CoreClass";

class Pipeline extends CoreClass {
	constructor (query) {
		super();
		this._steps = queryToPipeline(query);
	}
	
	addStep (stepData) {
		this._steps.push(stepData);
	}
}

export default Pipeline;