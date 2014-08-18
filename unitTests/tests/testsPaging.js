(function () {
	var init = (function (ForerunnerDB, base) {
		asyncTest("Paging - View.page :: Limit view page", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.domUp();

			expect(1);

			var arr = [],
				elem,
				i = 200;

			userView.bind('#testTarget', {
				pageLimit: 20,
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				},
				refresh: function () {
					//console.log('REFRESH', $('#testTarget').find('li').length);
				}
			});

			// Generate some data
			user.truncate();

			while (i--) {
				arr.push({
					_id: '1' + i,
					name: 'Test_1' + i
				});
			}

			userView._debug = false;

			user.insert(arr, function () {
				//console.log('Insert of ' + arr.length + ' records complete');

				elem = $('#testTarget').find('li');
				//console.log(elem.length);

				userView._debug = false;
					start();

				base.viewDown();
				base.domDown();
				base.dbDown();

				ok(elem.length === 200, "View binding");

				//userView.refresh(true);
			});
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