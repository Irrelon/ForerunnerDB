import {extendedType} from "../../utils/type";
import {get as pathGet} from "@irrelon/path";

export const gates = ["$and", "$or", "$not", "$nor"];

/*const ensureGate = (query) => {
	const hasGate = gates.some((gate) => {
		return query[gate];
	});
	
	if (!hasGate) {
		return {
			$and: [query]
		};
	}
	
	return query;
};

const queryToOperations = (query, parentPath, gate) => {
	return Object.entries(ensureGate(query)).reduce((opObj, [gateKey, gateQueryArray]) => {
		opObj[gateKey] = queryToOperationArray(gateQueryArray);
		
		return opObj;
	}, {});
};*/

const queryToOperationArray = (query, parentPath, gate) =>  {
	return Object.entries(query).reduce((opArr, [key, value]) => {
		const path = parentPath || key;
		const {type, isFlat, instance} = extendedType(value);
		let op = "$eeq";
		
		if (key.indexOf("$") === 0) {
			op = key;
		}
		
		// Determine operation type
		if (isFlat) {
			opArr.push({
				path,
				value,
				type,
				instance,
				op
			});
			
			return opArr;
		}
		
		// The value data is not flat, scan it
		return opArr.concat(queryToGatedOperations(value, path));
	}, []);
}

export const queryToGatedOperations = (query, parentPath) => {
	let foundLogicalOperator = false;
	
	const response = gates.reduce((result, gate) => {
		if (query[gate]) {
			result[gate] = query[gate].reduce((gateOpArr, queryItem) => {
				return gateOpArr.concat(queryToOperationArray(queryItem, parentPath, gate));
			}, []);
			
			foundLogicalOperator = true;
		}
		
		return result;
	}, {});
	
	// Find the logical operators
	if (!foundLogicalOperator) {
		// The query has no base logical gate, assume $and
		response.$and = queryToOperationArray(query, parentPath, "$and");
	}
	
	return response;
};

export const matchGatedQuery = (query, queryGates, dataArr) => {
	return Object.entries(queryGates).reduce((finalDataArr, [gateKey, opArr]) => {
		if (gateKey.indexOf("$") !==0) return finalDataArr;
		return finalDataArr.concat(
			dataArr.filter((dataItem) => {
				// Find any operation result that fails to match the dataItem
				// if no operation fails, this will return true, using the power
				// of confusing nested not gates
				const gateOpFunc = operationLookup[gateKey];
				
				if (!gateOpFunc) {
					throw new Error(`No known gate operation "${gateKey}" in ${JSON.stringify(query)}`);
				}
				
				const gateOpResult = gateOpFunc(dataItem, opArr, query);
				return gateOpResult;
			})
		);
	}, []);
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

export const $and = (dataItem, opArr, query) => {
	// Match true on ALL operations to pass, if any are
	// returned then we have found a NON MATCHING entity
	return opArr.every((opData) => {
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

export const $gt = (data, query) => {
	// Greater than
	return data > query;
};

export const $gte = (data, query) => {
	// Greater than or equal
	return data >= query;
};

export const $lt = (data, query) => {
	// Less than
	return data < query;
};

export const $lte = (data, query) => {
	// Less than or equal
	return data <= query;
};

export const $exists = (data, query) => {
	// Property exists
	return (data === undefined) !== query;
};

export const $eq = (data, query) => { // Equals
	return data == query; // jshint ignore:line
};

export const $eeq = (data, query) => { // Equals equals
	return data === query;
};

export const $ne = (data, query) => { // Not equals
	return data != query; // jshint ignore:line
};

export const $nee = (data, query) => { // Not equals equals
	return data !== query;
};

export const $in = (data, query) => { // In
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

export const $nin = (data, query) => { // Not in
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
	"$eq": $eq,
	"$eeq": $eeq,
	"$ne": $ne,
	"$nee": $nee,
	"$gt": $gt,
	"$gte": $gte,
	"$lt": $lt,
	"$lte": $lte,
	"$and": $and,
	"$or": $or
}