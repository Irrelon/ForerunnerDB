(function () {
	var init = (function (ForerunnerDB, base) {
		test("Index - Collection.ensureIndex() :: Assign an index to a collection", function() {
			base.dbUp();
			base.dataUp();

			var indexResult = user.ensureIndex({
				arr: {
					val: 1
				},
				name: 1
			}, {
				unique: true
			});

			var lookup = indexResult.index.lookup({
				arr: {
					val: 5
				},
				name: 'Dean'
			});

			ok(lookup.length === 2, "Lookup returned correct number of results");
			ok(lookup[0]._id === '4' && lookup[0].arr[1].val === '5', "Lookup returned correct result 1");
			ok(lookup[1]._id === '5' && lookup[1].arr[1].val === '5', "Lookup returned correct result 2");

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