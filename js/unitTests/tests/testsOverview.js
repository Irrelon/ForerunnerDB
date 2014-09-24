test('Overview - Overview.reduce() :: Correct data reduced for overview', function () {
	base.dbUp();

	var coll = db.collection('moo');

	db.overview('mooOverview')
		.from('moo')
		.reduce(function () {
			var arr = this.find({
					'new': true
				}),
				item = {
					count: arr.length
				};

			item.className = arr.length > 0 ? 'view' : 'hidden';

			return item;
		})
		.link('#overMoo', {
			template: '<div data-link="class{:className}">There are {^{:count}} new items to view, click to view.</div>'
		});

	base.dbDown();
});