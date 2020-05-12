import assert from "assert";
import {$and, $eeq, $eq, $in, queryToPipeline, objectToArray} from "./build";
import {extendedType} from "../../utils/type";

describe("build", () => {
	it("$eeq", () => {
		const data = {
			op: "$eeq",
			path: "bar.name",
			value: "Foo"
		};
		
		data.typeData = extendedType(data.value);
		
		const expected = {
			"op": data.op,
			"path": data.path,
			"value": data.value,
			"type": data.typeData.type,
			"instance": data.typeData.instance
		};
		
		const result = $eeq(data.path, data.value, data.typeData);
		
		assert.deepStrictEqual(result, expected, "Correct");
	});
	
	it("$eq", () => {
		const data = {
			op: "$eq",
			path: "bar.name",
			value: ["Foo", "Bar"]
		};
		
		data.typeData = extendedType(data.value);
		
		const expected = {
			"op": data.op,
			"path": data.path,
			"value": data.value,
			"type": data.typeData.type,
			"instance": data.typeData.instance
		};
		
		const result = $eq(data.path, data.value, data.typeData);
		
		assert.deepStrictEqual(result, expected, "Correct");
	});
	
	it("$in", () => {
		const data = {
			op: "$in",
			path: "bar.name",
			value: ["Foo", "Bar"]
		};
		
		data.typeData = extendedType(data.value);
		
		const expected = {
			"op": data.op,
			"path": data.path,
			"value": data.value,
			"type": data.typeData.type,
			"instance": data.typeData.instance
		};
		
		const result = $in(data.path, data.value, data.typeData);
		
		assert.deepStrictEqual(result, expected, "Correct");
	});
	
	describe("$and", () => {
		it("Explicit, Non-Recursive", () => {
			const query = {
				"$and": [{
					"bar.name": "Foo",
					"bar.age": 22
				}]
			};
			
			const expected = {
				"op": "$and",
				"path": "",
				"value": [{
					"op": "$eeq",
					"path": "bar.name",
					"value": "Foo",
					"type": "string",
					"instance": ""
				}, {
					"op": "$eeq",
					"path": "bar.age",
					"value": 22,
					"type": "number",
					"instance": ""
				}],
				"type": "array",
				"instance": ""
			};
			
			const result = $and("", objectToArray(query));
			
			assert.deepStrictEqual(result, expected, "Correct");
		});
		
	// 	it("Implicit, Non-Recursive", () => {
	// 		const query = {
	// 			"bar.foo": true,
	// 			"bar.dt": {
	// 				"$gt": new Date("2020-02-01T00:00:00Z"),
	// 				"$lte": new Date("2020-04-01T00:00:00Z")
	// 			}
	// 		};
			
	// 		const data = {
	// 			op: "$and",
	// 			path: "",
	// 			value: [{
	// 				"bar.foo": true
	// 			}, {
	// 				"bar.dt": {
	// 					"$gt": new Date("2020-02-01T00:00:00Z"),
	// 					"$lte": new Date("2020-04-01T00:00:00Z")
	// 				}
	// 			}]
	// 		};
			
	// 		data.typeData = extendedType(data.value);
			
	// 		const expected = {
	// 			"op": "$and",
	// 			"path": "",
	// 			"value": [{
	// 				"op": "$eeq",
	// 				"path": "bar.foo",
	// 				"value": true,
	// 				"type": "boolean",
	// 				"instance": ""
	// 			}, {
	// 				"op": "$and",
	// 				"path": "",
	// 				"value": [{
	// 					"op": "$gt",
	// 					"value": new Date("2020-02-01T00:00:00Z"),
	// 					"path": "bar.dt",
	// 					"type": "object",
	// 					"instance": "Date"
	// 				}, {
	// 					"op": "$lte",
	// 					"value": new Date("2020-04-01T00:00:00Z"),
	// 					"path": "bar.dt",
	// 					"type": "object",
	// 					"instance": "Date"
	// 				}],
	// 				"type": "array"
	// 			}],
	// 			"type": data.typeData.type,
	// 			"instance": data.typeData.instance
	// 		};
			
	// 		const result = $and(data.path, data.value, data.typeData);
			
	// 		assert.deepStrictEqual(result, expected, "Correct");
	// 	});
	});
});

describe("queryToPipeline()", () => {
	it("Implicit $and single tier", () => {
		const query = {
			"bar.name": "Foo"
		};
		
		const expected = {
			"op": "$and",
			"path": "",
			"type": "array",
			"instance": "",
			"value": [{
				"op": "$eeq",
				"path": "bar.name",
				"value": "Foo",
				"type": "string",
				"instance": ""
			}]
		};
		
		const result = queryToPipeline(query);
		
		assert.deepStrictEqual(result, expected, "Correct");
	});

	it("Implicit $and nested", () => {
		const query = {
			"$or": [{
				"bar.name": "Foo",
			}, {
				"bar.dt": {
					"$gt": new Date("2020-01-01T00:00:00Z"),
					"$lte": new Date("2020-12-31T00:00:00Z")
				}
			}]
		};

		const expected = {
			"op":"$or",
			"path": "",
			"type": "array",
			"instance": "",
			"value": [{
				"op": "$eeq",
				"path": "bar.name",
				"value": "Foo",
				"type": "string",
				"instance": ""
			}, {
				"op": "$and",
				"type": "array",
				"path": "",
				"instance": "",
				"value": [{
					"op": "$gt",
					"path": "bar.dt",
					"type": "object",
					"instance": "Date",
					"value": new Date("2020-01-01T00:00:00Z")
				}, {
					"op": "$lte",
					"path": "bar.dt",
					"type": "object",
					"instance": "Date",
					"value": new Date("2020-12-31T00:00:00Z")
				}]
			}]
		};

		const result = queryToPipeline(query);

		assert.deepStrictEqual(result, expected, "Correct");
	});
});