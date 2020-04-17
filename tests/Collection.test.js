const assert = require("assert");
import Collection from "../src/Collection";

describe("Collection", () => {
	describe("insert()", () => {
		it("Can insert data", async () => {
			const coll = new Collection();
			const result = await coll.insert({
				foo: true
			});
			
			assert.strictEqual(result.nInserted, 1, "Number of inserted documents is correct");
		});
	});
	
	describe("find()", () => {
	
	});
	
	describe("update()", () => {
	
	});
	
	describe("remove()", () => {
	
	});
});