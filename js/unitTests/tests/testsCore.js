QUnit.module('Core');
QUnit.test("Init DB", function() {
	base.dbUp();

	ok(db !== undefined && typeof db.version === 'function', "Complete");

	base.dbDown();
});