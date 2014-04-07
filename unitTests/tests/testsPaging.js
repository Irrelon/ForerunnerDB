(function () {
	var init = (function (ForerunnerDB, base) {
		test("Paging - View.page :: Limit view page", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.domUp();

			userView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			user.setData({
				_id: '2342',
				name: "hello"
			});

			var elem = $('#testTarget').find('#2342');

			ok(elem.length === 1, "Insert single document");

			base.viewDown();
			base.domDown();
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