import find from "./find";
import assert from "assert";
import {data} from "../../test/data";

describe("find()", () => {
	describe("Number", () => {
		it("$eeq", () => {
			const query = {
				"_id": 1
			};
			
			const result = find(data, query);
			
			assert.strictEqual(result.length, 1, "Number of results is correct");
			assert.strictEqual(result[0]._id, 1, "ID is correct");
		});
	});
	
	describe("String", () => {
		it("$eeq", () => {
			const query = {
				"bar.name": "Amelia"
			};
			
			const result = find(data, query);
			
			assert.strictEqual(result.length, 1, "Number of results is correct");
			assert.strictEqual(result[0]._id, 5, "ID is correct");
		});
		
		it("$in", () => {
			const query = {
				"bar.name": {
					"$in": ["Amelia", "Andy"]
				}
			};
			
			const result = find(data, query);
			
			assert.strictEqual(result.length, 2, "Number of results is correct");
			assert.strictEqual(result[0]._id, 1, "ID is correct");
			assert.strictEqual(result[1]._id, 5, "ID is correct");
		});
	});
	
	describe("Boolean", () => {
		it("$eeq", () => {
			const query = {
				"bar.foo": false
			};
			
			const result = find(data, query);
			
			assert.strictEqual(result.length, 1, "Number of results is correct");
			assert.strictEqual(result[0]._id, 2, "ID is correct");
		});
	});
	
	describe("Boolean, Date", () => {
		it("$gt, $lte, $eeq", () => {
			const query = {
				"bar.foo": true,
				"bar.dt": {
					"$gt": new Date("2020-02-01T00:00:00Z"),
					"$lte": new Date("2020-04-01T00:00:00Z")
				}
			};
			
			const result = find(data, query);
			
			assert.strictEqual(result.length, 2, "Number of results is correct");
			assert.strictEqual(result[0]._id, 3, "ID is correct");
			assert.strictEqual(result[1]._id, 4, "ID is correct");
		});
	});
	
	describe("Gates", () => {
		it("$and", () => {
			const query = {
				"$and": [{
					"bar.foo": true,
					"bar.dt": {
						"$gt": new Date("2020-02-01T00:00:00Z"),
						"$lte": new Date("2020-04-01T00:00:00Z")
					}
				}]
			};
			
			const result = find(data, query);
			
			assert.strictEqual(result.length, 2, "Number of results is correct");
			assert.strictEqual(result[0]._id, 3, "ID is correct");
			assert.strictEqual(result[1]._id, 4, "ID is correct");
		});
		
		it("$or", () => {
			const query = {
				"$or": [{
					"bar.foo": true,
					"bar.dt": {
						"$gt": new Date("2020-02-01T00:00:00Z"),
						"$lte": new Date("2020-04-01T00:00:00Z")
					}
				}]
			};
			
			const result = find(data, query);
			
			assert.strictEqual(result.length, 4, "Number of results is correct");
			assert.strictEqual(result[0]._id, 1, "ID is correct");
			assert.strictEqual(result[1]._id, 3, "ID is correct");
			assert.strictEqual(result[2]._id, 4, "ID is correct");
			assert.strictEqual(result[3]._id, 5, "ID is correct");
			
		});
	});
});