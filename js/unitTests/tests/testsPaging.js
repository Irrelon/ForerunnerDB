asyncTest("Paging - View.page :: Limit view page", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.domUp();

	expect(1);

	var arr = [],
		elem,
		i = 200;

	userView.link('#testTarget', {
		pageLimit: 20,
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
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

	user.insert(arr, 0, function () {
		console.log('Insert of ' + arr.length + ' records complete');

		elem = $('#testTarget').find('li');
		//console.log(elem.length);

		userView._debug = false;
			start();

		base.viewDown();
		base.domDown();
		base.dbDown();

		strictEqual(elem.length, 20, "View binding");

		//userView.refresh(true);
	});
});