import OperationSuccess from "../operations/OperationSuccess";

const assert = require("assert");
import Collection from "./Collection";
import OperationFailure from "../operations/OperationFailure";
import find from "./operation/find";

const data = [{
	"_id": 1,
	"bar": {
		"foo": true,
		"dt": new Date("2020-01-01T00:00:00Z"),
		"name": "Andy"
	}
}, {
	"_id": 2,
	"bar": {
		"foo": false,
		"dt": new Date("2020-02-01T00:00:00Z"),
		"name": "Jim"
	}
}, {
	"_id": 3,
	"bar": {
		"foo": true,
		"dt": new Date("2020-03-01T00:00:00Z"),
		"name": "Barbara"
	}
}, {
	"_id": 4,
	"bar": {
		"foo": true,
		"dt": new Date("2020-04-01T00:00:00Z"),
		"name": "Katie"
	}
}, {
	"_id": 5,
	"bar": {
		"foo": true,
		"dt": new Date("2020-05-01T00:00:00Z"),
		"name": "Amelia"
	}
}];

describe("Collection", () => {
	/*describe("operation()", () => {
		describe("Positive Path", () => {
			it("Can run an operation and provide the correct result", () => {
				const coll = new Collection();
				const result = coll.operation({
					"_id": "1"
				}, coll.indexViolationCheck);
				
				assert.strictEqual(result.success.length, 1, "Correct");
				assert.strictEqual(result.success[0].type, OperationSuccess.constants.INDEX_PREFLIGHT_SUCCESS, "Correct");
			});
			
			it("Can run multiple operations and provide the correct result", () => {
				const coll = new Collection();
				const result = coll.operation([{
					"_id": "1"
				}, {
					"_id": "2"
				}], coll.indexViolationCheck);
				
				assert.strictEqual(result.success.length, 2, "Correct");
				assert.strictEqual(result.success[0].type, OperationSuccess.constants.INDEX_PREFLIGHT_SUCCESS, "Correct");
				assert.strictEqual(result.success[1].type, OperationSuccess.constants.INDEX_PREFLIGHT_SUCCESS, "Correct");
			});
		})
		
		describe("Negative Path", () => {
			it("Can run an operation and provide the correct result", () => {
				const coll = new Collection();
				coll.insert({
					"_id": "1"
				});
				const result = coll.operation({
					"_id": "1"
				}, coll.indexViolationCheck);
				
				assert.strictEqual(result.success.length, 0, "Correct");
				assert.strictEqual(result.failure.length, 1, "Correct");
				assert.strictEqual(result.failure[0].type, OperationFailure.constants.INDEX_PREFLIGHT_VIOLATION, "Correct");
			});
			
			it("Can run multiple operations and provide the correct result", () => {
				const coll = new Collection();
				coll.insert({
					"_id": "1"
				});
				const result = coll.operation([{
					"_id": "1"
				}, {
					"_id": "2"
				}], coll.indexViolationCheck);
				
				assert.strictEqual(result.success.length, 1, "Correct");
				assert.strictEqual(result.failure.length, 1, "Correct");
				assert.strictEqual(result.failure[0].type, OperationFailure.constants.INDEX_PREFLIGHT_VIOLATION, "Correct");
				assert.strictEqual(result.success[0].type, OperationSuccess.constants.INDEX_PREFLIGHT_SUCCESS, "Correct");
			});
		});
	});
	
	describe("insert()", () => {
		it("Can insert a single data object", async () => {
			const coll = new Collection();
			const result = await coll.insert({
				"foo": true
			});
			
			assert.strictEqual(result.nInserted, 1, "Number of inserted documents is correct");
		});
		
		it("Can insert an array of data", async () => {
			const coll = new Collection();
			const result = await coll.insert([
				{_id: 20, item: "lamp", qty: 50, type: "desk"},
				{_id: 21, item: "lamp", qty: 20, type: "floor"},
				{_id: 22, item: "bulk", qty: 100}
			], {ordered: true});
			
			assert.strictEqual(result.nInserted, 3, "Number of inserted documents is correct");
		});
		
		it("Can insert an array of data unordered", async () => {
			const coll = new Collection();
			const result = await coll.insert([
				{_id: 20, item: "lamp", qty: 50, type: "desk"},
				{_id: 21, item: "lamp", qty: 20, type: "floor"},
				{_id: 22, item: "bulk", qty: 100}
			], {ordered: false});
			
			assert.strictEqual(result.nInserted, 3, "Number of inserted documents is correct");
		});
		
		it("Can insert an array of data and fail correctly", async () => {
			const coll = new Collection();
			const result = await coll.insert([
				{_id: 30, item: "lamp", qty: 50, type: "desk"},
				{_id: 30, item: "lamp", qty: 20, type: "floor"},
				{_id: 32, item: "bulk", qty: 100}
			], {ordered: true});
			console.log("Result", result);
			assert.strictEqual(result.nInserted, 1, "Number of inserted documents is correct");
			assert.strictEqual(result.writeError.code, 1, "Error code is correct");
			assert.strictEqual(result.writeError.errmsg, "Index violation", "Error msg is correct");
		});
		
		it("Can insert an array of data unordered and fail correctly", async () => {
			const coll = new Collection();
			const result = await coll.insert([
				{_id: 40, item: "lamp", qty: 50, type: "desk"},
				{_id: 40, item: "lamp", qty: 20, type: "floor"},
				{_id: 42, item: "bulk", qty: 100}
			], {ordered: false});
			console.log("Result", result);
			assert.strictEqual(result.nInserted, 2, "Number of inserted documents is correct");
			assert.strictEqual(result.writeError.code, 1, "Error code is correct");
			assert.strictEqual(result.writeError.errmsg, "Index violation", "Error msg is correct");
		});
	});*/
	
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
	
	describe("update()", () => {
	
	});
	
	describe("remove()", () => {
	
	});
});