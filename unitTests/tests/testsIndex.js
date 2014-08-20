(function () {
	var init = (function (ForerunnerDB, base) {
		test("Index - Collection.ensureIndex() :: Assign an index to a collection", function() {
			base.dbUp();
			base.dataUp();

			ok(result.length === 1, "Insert");
			ok(result[0].moo === 1 && result[0].goo === 2, "Insert transformed");

			base.dbDown();
		});
	});

	if (typeof(define) === 'function' && define.amd) {
		// Use AMD
		require([
			'../ForerunnerDB',
			'./base'
		], function (ForerunnerDB, base) {
			init(ForerunnerDB, base);
		});
	} else {
		// Use global
		init(ForerunnerDB, base);
	}
})();