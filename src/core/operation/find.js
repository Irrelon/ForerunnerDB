import {extendedType} from "../../utils/type";
import {queryToGatedOperations, matchGatedQuery} from "./match";

const find = (data, query) => {
	const dataType = extendedType(data);
	const queryType = extendedType(query);
	
	let matchedAll = true;
	
	// Break query into operations
	const queryGates = queryToGatedOperations(query);
	
	let dataArr = data;
	
	// TODO: Loop each operation and check if an index (or multiple indexes) matches the path
	// and then order indexes that do match by how much they match. Take the most-matching
	// index and pull the data lookup from it rather than using the whole data array to do
	// effectively a table scan
	/*if (false) {
		dataArr = index.find();
	}*/
	
	// Loop through each gate and resolve the result to an item array
	return matchGatedQuery(query, queryGates, dataArr)
};

// TODO support calling explain that returns a query plan

export default find;