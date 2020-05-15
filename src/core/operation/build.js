import { extendedType } from "../../utils/type";
import { gates } from "./match";
import {flattenValues} from "@irrelon/path";

export const queryFromObject = (obj) => {
	return flattenValues(obj, undefined, "", {
		transformKey: (key, info) => info.isArrayIndex ? "$" : key,
		leavesOnly: true
	});
}

const genericOperation = (op = "") => (path, value, typeData) => {
	return {
		op,
		"type": typeData.type,
		"instance": typeData.instance,
		path,
		value
	};
};

export const $eeq = genericOperation("$eeq");
export const $eq = genericOperation("$eq");
export const $lt = genericOperation("$lt");
export const $lte = genericOperation("$lte");
export const $gt = genericOperation("$gt");
export const $gte = genericOperation("$gte");
export const $in = genericOperation("$in");
export const $ne = genericOperation("$ne");

export const objectToArray = (obj) => {
	return Object.entries(obj).map(([key, val]) => {
		return {
			[key]: val
		};
	});
};

const reduceArray = (arr) => {
	if (!Array.isArray(arr)) return arr;
	return arr.reduce((finalArr, item) => {
		if (Array.isArray(item)) {
			return finalArr.concat(reduceArray(item));
		}

		finalArr.push(item);
		return finalArr;
	}, []);
};

const gateOperation = (op) => (path, value) => {
	const finalValue = (() => {
		return value.reduce((itemArr, item) => {
			if (!Array.isArray(item) && Object.keys(item).length > 1) {
				// The `value` is an object with multiple keys / paths
				// so split the object into an array of objects, each
				// object containing one of the key/val pairs of the
				// original `value` object
				return itemArr.concat(reduceArray(objectToArray(item).map((item) => queryToPipeline(item, op, path))));
			}
			
			return itemArr.concat(reduceArray(queryToPipeline(item, op, path)));
		}, []);
	})();
	
	return {
		op,
		"type": "array",
		"instance": "",
		"path": "",
		"value": finalValue
	}
};

export const $and = gateOperation("$and");
export const $or = gateOperation("$or");

export const queryToPipeline = (query, currentGate = "", parentPath = "") => {
	if (!currentGate) {
		const queryKeyArr = Object.keys(query);
		
		// Check if we already have gate operations
		const gateKey = gates.find((key) => {
			return queryKeyArr.indexOf(key) > -1;
		});

		if (gateKey && queryKeyArr.length > 1) {
			// This is an error. A query can either be fully gated
			// or fully un-gated (implicit $and) but not both
			throw new Error("A query cannot contain both gated and un-gated field properties!");
		}

		if (gateKey) {
			return operationLookup[gateKey](parentPath, query[gateKey]);
		} else {
			// Implicit $and
			return $and(parentPath, objectToArray(query));
		}
	}
	// ROB: When we call a gate operation we pass an empty path but it needs
	// to be the path to the data - do a step through with the tests to see
	// what's breaking... we're bringing match.js back up to speed after
	// doing a fantastic job rationalising the queryToPipeline() call but it
	// needs to handle paths correctly AND it needs to handle $in correctly...
	// which I suspect means we need a new type of genericOperation() like
	// genericArrayOperation() or whatever. X
	return Object.entries(query).map(([path, value]) => {
		const valTypeData = extendedType(value);
		
		if (path.indexOf("$") === 0) {
			// This is an operation
			if (!operationLookup[path]) {
				throw new Error(`Operation "${path}" not recognised`);
			}
			
			return operationLookup[path](parentPath, value, extendedType(value));
		}
		
		// The path is not an operation so check if it is holding a recursive
		// value or not
		if (!valTypeData.isFlat) {
			// Wrap this in an $and
			if (currentGate !== "$and") {
				return $and(path, objectToArray(value));
			} else {
				// Merge our current data with the parent data
				return objectToArray(value).map((item) => queryToPipeline(item, currentGate, path));
			}
		}

		// The path is not an operation, the value is not recursive so
		// we have an implicit $eeq
		return $eeq(path, value, extendedType(value));
	})[0];
};

export const operationLookup = {
	$eeq,
	$eq,
	$and,
	$or,
	$gt,
	$gte,
	$lt,
	$lte,
	$in,
	$ne
};