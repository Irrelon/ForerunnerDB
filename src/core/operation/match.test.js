import {queryToGatedOperations} from "./match";
import assert from "assert";

describe("match", () => {
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
	});
});