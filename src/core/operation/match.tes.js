import {$eeq, $eq, $in, queryToGatedOperations} from "./match";
import assert from "assert";

describe("match", () => {
	describe("$eeq", () => {
		describe("Positive", () => {
			it("Boolean", () => {
				const result = $eeq(true, true);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("String", () => {
				const result = $eeq("true", "true");
				assert.strictEqual(result, true, "Correct");
			});
			
			it("Number", () => {
				const result = $eeq(12, 12);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("Null", () => {
				const result = $eeq(null, null);
				assert.strictEqual(result, true, "Correct");
			});
		});
		
		describe("Negative", () => {
			it("Boolean", () => {
				const result = $eeq(true, false);
				assert.strictEqual(result, false, "Correct");
			});
			
			it("String", () => {
				const result = $eeq("true", "false");
				assert.strictEqual(result, false, "Correct");
			});
			
			it("Number", () => {
				const result = $eeq(12, 13);
				assert.strictEqual(result, false, "Correct");
			});
			
			it("Null", () => {
				const result = $eeq(null, "foo");
				assert.strictEqual(result, false, "Correct");
			});
		});
	});
	
	describe("$eq", () => {
		describe("Positive", () => {
			it("Boolean", () => {
				const result = $eq(true, 1);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("String", () => {
				const result = $eq("1", 1);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("Number", () => {
				const result = $eq("12", 12);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("Null", () => {
				const result = $eq(null, null);
				assert.strictEqual(result, true, "Correct");
			});
		});
		
		describe("Negative", () => {
			it("Boolean", () => {
				const result = $eq(false, 1);
				assert.strictEqual(result, false, "Correct");
			});
			
			it("String", () => {
				const result = $eq("1", 2);
				assert.strictEqual(result, false, "Correct");
			});
			
			it("Number", () => {
				const result = $eq("12", 13);
				assert.strictEqual(result, false, "Correct");
			});
			
			it("Null", () => {
				const result = $eq(null, "null");
				assert.strictEqual(result, false, "Correct");
			});
		});
	});
	
	describe("$in", () => {
		describe("Positive", () => {
			it("Boolean", () => {
				const result = $in(true, [false, true]);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("String", () => {
				const result = $in("true", ["foo", "true"]);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("Number", () => {
				const result = $in(12, [5, 8, 12]);
				assert.strictEqual(result, true, "Correct");
			});
			
			it("Null", () => {
				const result = $in(null, ["foo", null]);
				assert.strictEqual(result, true, "Correct");
			});
		});
		
		describe("Negative", () => {
			it("Boolean", () => {
				const result = $in(true, false);
				assert.strictEqual(result, false, "Correct");
			});
			
			it("String", () => {
				const result = $in("true", "false");
				assert.strictEqual(result, false, "Correct");
			});
			
			it("Number", () => {
				const result = $in(12, 13);
				assert.strictEqual(result, false, "Correct");
			});
			
			it("Null", () => {
				const result = $in(null, "foo");
				assert.strictEqual(result, false, "Correct");
			});
		});
	});
	
	describe("queryToGatedOperations()", () => {
		it("Can output the correct array of operations from basic input query", () => {
			// This is an assumed "$and" operation
			const query = {
				"bar.foo": true,
				"bar.dt": {
					"$gt": new Date("2020-02-01T00:00:00Z"),
					"$lte": new Date("2020-04-01T00:00:00Z")
				}
			};
			
			const expected = {
				$and: [{
					path: "bar.foo",
					value: true,
					type: "boolean",
					instance: "",
					op: "$eeq"
				}, {
					$and: [{
						path: "bar.dt",
						value: new Date("2020-02-01T00:00:00Z"),
						type: "object",
						instance: "Date",
						op: "$gt"
					}, {
						path: "bar.dt",
						value: new Date("2020-04-01T00:00:00Z"),
						type: "object",
						instance: "Date",
						op: "$lte"
					}]
				}]
			}
			
			const result = queryToGatedOperations(query);
			
			assert.deepStrictEqual(result, expected, "Correct data");
		});
		
		it("Can output the correct array of operations from $and input query", () => {
			const query = {
				$and: [{
					"bar.foo": true
				}, {
					"bar.dt": {
						"$gt": new Date("2020-02-01T00:00:00Z"),
						"$lte": new Date("2020-04-01T00:00:00Z")
					}
				}]
			};
			
			const expected = {
				$and: [{
					path: "bar.foo",
					value: true,
					type: "boolean",
					instance: "",
					op: "$eeq"
				}, {
					$and: [{
						path: "bar.dt",
						value: new Date("2020-02-01T00:00:00Z"),
						type: "object",
						instance: "Date",
						op: "$gt"
					}, {
						path: "bar.dt",
						value: new Date("2020-04-01T00:00:00Z"),
						type: "object",
						instance: "Date",
						op: "$lte"
					}]
				}]
			}
			
			const result = queryToGatedOperations(query);
			
			assert.deepStrictEqual(result, expected, "Correct data");
		});
		
		it("Can output the correct array of operations from a query with a single sub-operation object", () => {
			const query = {
				"bar.name": {
					"$in": ["Amelia", "Andy"]
				}
			};
			
			const expected = {
				op: "$and",
				path: "",
				type: "array",
				value: [{
					path: "bar.name",
					value: ["Amelia", "Andy"],
					type: "array",
					instance: "",
					op: "$in"
				}]
			}
			
			const result = queryToGatedOperations(query);
			
			assert.deepStrictEqual(result, expected, "Correct data");
		});
		
		it("Can output the correct array of operations from a query with multiple sub-operation objects", () => {
			const query = {
				"bar.dt": new Date("2020-03-01T00:00:00Z"),
				"bar.name": {
					"$in": ["Amelia", "Andy"],
					"$ne": "Andy"
				}
			};
			
			const expected = {
				op: "$and",
				path: "",
				type: "array",
				value: [{
					op: "$eeq",
					path: "bar.dt",
					value: new Date("2020-03-01T00:00:00Z"),
					type: "object",
					instance: "Date"
				}, {
					op: "$and",
					path: "bar.name",
					type: "array",
					value: [{
						path: "bar.name",
						value: ["Amelia", "Andy"],
						type: "array",
						instance: "",
						op: "$in"
					}, {
						path: "bar.name",
						value: "Andy",
						type: "string",
						instance: "",
						op: "$ne"
					}]
				}]
			}
			
			const result = queryToGatedOperations(query);
			
			assert.deepStrictEqual(result, expected, "Correct data");
		});
	});
});