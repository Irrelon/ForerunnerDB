import {extendedType} from "../../utils/type";
import {get as pathGet} from "@irrelon/path";

export const gates = ["$and", "$or", "$not", "$nor"];

export const matchPipeline = (pipeline, data) => {
	const opFunc = operationLookup[pipeline.op];
	
	if (!opFunc) {
		throw new Error(`Unknown operation "${pipeline.op}"`);
	}
	
	return opFunc(data, pipeline.value);
};

export const $and = (dataItem, opArr) => {
	// Match true on ALL operations to pass, if any are
	// returned then we have found a NON MATCHING entity
	return opArr.every((opData) => {
		let dataValue;
		let opValue;
		let opFunc;
		
		if (gates.indexOf(opData.op) > -1) {
			// The operation is a gate
			return operationLookup[opData.op](dataItem, opData.value);
		}
		
		dataValue = pathGet(dataItem, opData.path);
		opFunc = operationLookup[opData.op];
		opValue = opData.value;
		
		if (!opFunc) {
			throw new Error(`Unknown operation "${opData.op}"`);
		}
		
		return opFunc(dataValue, opValue);
	});
};

export const $not = (data, query) => { // Not operator
	return !$and(data, query);
};

export const $or = (dataItem, opArr, query) => {
	// Match true on ANY operations to pass, if any are
	// returned then we have found a NON MATCHING entity
	return opArr.some((opData) => {
		let dataValue;
		let opValue;
		let opFunc;
		
		if (gates.some((gate) => opData[gate])) {
			dataValue = dataItem;
			opValue = opData.$and;
			opFunc = operationLookup["$and"];
		} else {
			dataValue = pathGet(dataItem, opData.path);
			opFunc = operationLookup[opData.op];
			opValue = opData.value;
		}
		
		if (!opFunc) {
			throw new Error(`No known operation "${opData.op}" in ${JSON.stringify(query)}`);
		}
		
		return opFunc(dataValue, opValue, query);
	});
};

const normalise = (data) => {
	if (data instanceof Date) {
		return data.toISOString();
	}
	
	return data;
}

export const $gt = (data, query) => {
	// Greater than
	return normalise(data) > normalise(query);
};

export const $gte = (data, query) => {
	// Greater than or equal
	return normalise(data) >= normalise(query);
};

export const $lt = (data, query) => {
	// Less than
	return normalise(data) < normalise(query);
};

export const $lte = (data, query) => {
	// Less than or equal
	return normalise(data) <= normalise(query);
};

export const $exists = (data, query) => {
	// Property exists
	return (data === undefined) !== normalise(query);
};

export const $eq = (data, query) => { // Equals
	return normalise(data) == normalise(query); // jshint ignore:line
};

export const $eeq = (data, query) => { // Equals equals
	return normalise(data) === normalise(query);
};

export const $ne = (data, query) => { // Not equals
	return normalise(data) != normalise(query); // eslint ignore:line
};
// Not equals equals
export const $nee = (data, query) => {
	return normalise(data) !== normalise(query);
};

export const $in = (data, query) => {
	// Check that the in query is an array
	if (Array.isArray(query)) {
		let inArr = query,
			inArrCount = inArr.length,
			inArrIndex;
		
		for (inArrIndex = 0; inArrIndex < inArrCount; inArrIndex++) {
			if ($eeq(data, inArr[inArrIndex])) {
				return true;
			}
		}
		
		return false;
	} else {
		console.log(`Cannot use an $in operator on non-array data in query ${JSON.stringify(query)}`);
		return false;
	}
};
// Not in
export const $nin = (data, query) => {
	// Check that the not-in query is an array
	if (query instanceof Array) {
		let notInArr = query,
			notInArrCount = notInArr.length,
			notInArrIndex;
		
		for (notInArrIndex = 0; notInArrIndex < notInArrCount; notInArrIndex++) {
			if (this._match(data, notInArr[notInArrIndex], queryOptions, 'and', options)) {
				return false;
			}
		}
		
		return true;
	} else if (typeof query === 'object') {
		return this._match(data, query, queryOptions, 'and', options);
	} else {
		console.log(this.logIdentifier() + ' Cannot use a $nin operator on a non-array key: ' + key, options.$rootQuery);
		return false;
	}
};

export const $fastIn = (data, query) => {
	if (query instanceof Array) {
		// Data is a string or number, use indexOf to identify match in array
		return query.indexOf(data) !== -1;
	} else {
		console.log(this.logIdentifier() + ' Cannot use an $fastIn operator on a non-array key: ' + key, options.$rootQuery);
		return false;
	}
};

export const $distinct = (data, query) => {
	let lookupPath,
		value,
		finalDistinctProp;
	
	// Ensure options holds a distinct lookup
	options.$rootData['//distinctLookup'] = options.$rootData['//distinctLookup'] || {};
	
	for (let distinctProp in query) {
		if (query.hasOwnProperty(distinctProp)) {
			if (typeof query[distinctProp] === 'object') {
				// Get the path string from the object
				lookupPath = this.sharedPathSolver.parse(query)[0].path;
				
				// Use the path string to find the lookup value from the data data
				value = this.sharedPathSolver.get(data, lookupPath);
				finalDistinctProp = lookupPath;
			} else {
				value = data[distinctProp];
				finalDistinctProp = distinctProp;
			}
			
			options.$rootData['//distinctLookup'][finalDistinctProp] = options.$rootData['//distinctLookup'][finalDistinctProp] || {};
			
			// Check if the options distinct lookup has this field's value
			if (options.$rootData['//distinctLookup'][finalDistinctProp][value]) {
				// Value is already in use
				return false;
			} else {
				// Set the value in the lookup
				options.$rootData['//distinctLookup'][finalDistinctProp][value] = true;
				
				// Allow the item in the results
				return true;
			}
		}
	}
};

export const $count = (data, query) => {
	let countKey,
		countArr,
		countVal;
	
	// Iterate the count object's keys
	for (countKey in query) {
		if (query.hasOwnProperty(countKey)) {
			// Check the property exists and is an array. If the property being counted is not
			// an array (or doesn't exist) then use a value of zero in any further count logic
			countArr = data[countKey];
			if (typeof countArr === 'object' && countArr instanceof Array) {
				countVal = countArr.length;
			} else {
				countVal = 0;
			}
			
			// Now recurse down the query chain further to satisfy the query for this key (countKey)
			if (!this._match(countVal, query[countKey], queryOptions, 'and', options)) {
				return false;
			}
		}
	}
	
	// Allow the item in the results
	return true;
};

export const operationLookup = {
	$eq,
	$eeq,
	$ne,
	$nee,
	$gt,
	$gte,
	$lt,
	$lte,
	$and,
	$or
};