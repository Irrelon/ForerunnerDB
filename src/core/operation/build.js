import { extendedType } from "../../utils/type";
import { gates } from "./match";

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
	return {
		op,
		"type": "array",
		"instance": "",
		"path": "",
		"value": value.reduce((itemArr, item) => {
			const result = queryToPipeline(item, op, path);

			return itemArr.concat(reduceArray(result));
		}, [])
	}
};

export const $and = gateOperation("$and");
export const $or = gateOperation("$or");

export const queryToPipeline = (query, currentGate = "", parentPath = "") => {
	if (!currentGate) {
		// Check if we already have gate operations
		const queryKeyArr = Object.keys(query);
		
		const gateKey = gates.find((key) => {
			return queryKeyArr.indexOf(key) > -1;
		});

		if (gateKey && queryKeyArr.length > 1) {
			// This is an error. A query can either be fully gated
			// or fully un-gated (implicit $and) but not both
			throw new Error("A query cannot contain both gated and un-gated field properties!");
		}

		if (gateKey) {
			return operationLookup[gateKey]("", query[gateKey]);
		} else {
			// Implicit $and
			return $and("", objectToArray(query));
		}
	}

	return Object.entries(query).map(([path, value]) => {
		const valTypeData = extendedType(value);
		
		if (!valTypeData.isFlat) {
			// Wrap this in an $and
			if (currentGate !== "$and") {
				return $and(path, objectToArray(value));
			} else {
				// Merge our current data with the parent data	
				return objectToArray(value).map((item) => queryToPipeline(item, currentGate, parentPath));
			}
		}

		if (path.indexOf("$") === 0) {
			// This is an operation
			return operationLookup[path](parentPath, value, extendedType(value));
		} else {
			// Implicit $eeq
			return $eeq(path, value, extendedType(value));
		}
	})[0];
};

export const operationLookup = {
	$eeq,
	$eq,
	$and,
	$or,
	$gt,
	$lte,
	$in
};