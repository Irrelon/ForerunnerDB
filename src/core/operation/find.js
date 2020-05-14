import {matchPipeline} from "./match";
import {queryToPipeline} from "./build";

const find = (data, query) => {
	// Break query into operations
	const pipeline = queryToPipeline(query);
	
	// TODO: Loop each operation and check if an index (or multiple indexes) matches the path
	//  and then order indexes that do match by how much they match. Take the most-matching
	//  index and pull the data lookup from it rather than using the whole data array to do
	//  effectively a table scan
	/*if (false) {
		data = index.find();
	}*/
	
	// Loop through each gate and resolve the result to an item array
	return matchPipeline(pipeline, data);
};

// TODO support calling explain that returns a query plan

export default find;