(function () {
	var init = (function (ForerunnerDB, base) {
		test("Paging - View.page :: Limit view page", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.domUp();

			var elem,
				i;

			userView._debug = false;
			userView.bind('#testTarget', {
				pageLimit: 20,
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			// Generate some data
			user.truncate();
			i = 200;
			while (i--) {
				user.insert({
					_id: '1' + i,
					name: 'Test_1' + i
				});
			}

			userView.refresh(true);

			elem = $('#testTarget').find('#2342');
			console.log(elem.length);
			ok(elem.length === 200, "View binding");
			userView._debug = false;
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