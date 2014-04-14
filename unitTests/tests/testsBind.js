(function () {
	var init = (function (ForerunnerDB, base) {
		test("Bind - View.on() :: Remove + Insert via setData from Collection", function() {
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

		test("Bind - View.on() :: Insert from Collection", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.domUp();

			userView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var elem = $('#testTarget').find('#2342');

			ok(elem.length === 1, "Insert single document");

			base.viewDown();
			base.domDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Update from Collection", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.domUp();

			userView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var currentName = $('#testTarget').find('#2342').text();
			ok(currentName === 'hello', "Insert single document");

			user.update({
				_id: '2342'
			}, {
				name: "hello2"
			});

			var newName = $('#testTarget').find('#2342').text();
			ok(newName === 'hello2', "Update single document");

			base.viewDown();
			base.domDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Remove from Collection", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.domUp();

			userView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var elem = $('#testTarget').find('#2342');
			ok(elem.length === 1, "Insert single document");

			user.remove({
				_id: '2342'
			});

			elem = $('#testTarget').find('#2342');
			ok(elem.length === 0, "Remove single document");

			base.viewDown();
			base.domDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Insert from CollectionGroup via Collection Interface", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.viewGroupUp();
			base.domUp();

			/*expect(1);
			 start();*/

			user.on('insert', function () {
				ok(true, 'Collection insert');
			});

			userView.on('insert', function () {
				ok(true, 'View insert');
			});

			userGroup.on('insert', function () {
				ok(true, 'Group insert');
			});

			userGroupView.on('insert', function () {
				ok(true, 'View from group insert');
			});

			userGroupView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var elem = $('#testTarget').find('#2342');

			ok(elem.length === 1, "Insert single document");

			base.domDown();
			base.viewGroupDown();
			base.viewDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Update from CollectionGroup via Collection Interface", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.viewGroupUp();
			base.domUp();

			user.on('update', function () {
				ok(true, 'Collection update');
			});

			userView.on('update', function () {
				ok(true, 'View update');
			});

			userGroup.on('update', function () {
				ok(true, 'Group update');
			});

			userGroupView.on('update', function () {
				ok(true, 'View from group update');
			});

			userGroupView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var currentName = $('#testTarget').find('#2342').text();
			ok(currentName === 'hello', "Insert single document");

			user.update({
				_id: '2342'
			}, {
				name: "hello2"
			});

			var newName = $('#testTarget').find('#2342').text();
			ok(newName === 'hello2', "Update single document");

			//base.domDown();
			base.viewGroupDown();
			base.viewDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Remove from CollectionGroup via Collection Interface", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.viewGroupUp();
			base.domUp();

			user.on('remove', function () {
				ok(true, 'Collection remove');
			});

			userView.on('remove', function () {
				ok(true, 'View remove');
			});

			userGroup.on('remove', function () {
				ok(true, 'Group remove');
			});

			userGroupView.on('remove', function () {
				ok(true, 'View from group remove');
			});

			userGroupView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			user.insert({
				_id: '2342',
				name: "hello"
			});

			var elem = $('#testTarget').find('#2342');
			ok(elem.length === 1, "Insert single document");

			user.remove({
				_id: '2342'
			});

			elem = $('#testTarget').find('#2342');
			ok(elem.length === 0, "Remove single document");

			base.domDown();
			base.viewGroupDown();
			base.viewDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Insert from CollectionGroup via CollectionGroup Interface", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.viewGroupUp();
			base.domUp();

			/*expect(1);
			 start();*/

			user.on('insert', function () {
				ok(true, 'Collection insert');
			});

			userView.on('insert', function () {
				ok(true, 'View insert');
			});

			userGroup.on('insert', function () {
				ok(true, 'Group insert');
			});

			userGroupView.on('insert', function () {
				ok(true, 'View from group insert');
			});

			userGroupView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			userGroup.insert({
				_id: '2342',
				name: "hello"
			});

			var elem = $('#testTarget').find('#2342');

			ok(elem.length === 1, "Insert single document");

			base.domDown();
			base.viewGroupDown();
			base.viewDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Update from CollectionGroup via CollectionGroup Interface", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.viewGroupUp();
			base.domUp();

			user.on('update', function () {
				ok(true, 'Collection update');
			});

			userView.on('update', function () {
				ok(true, 'View update');
			});

			userGroup.on('update', function () {
				ok(true, 'Group update');
			});

			userGroupView.on('update', function () {
				ok(true, 'View from group update');
			});

			userGroupView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			userGroup.insert({
				_id: '2342',
				name: "hello"
			});

			var currentName = $('#testTarget').find('#2342').text();
			ok(currentName === 'hello', "Insert single document");

			userGroup.update({
				_id: '2342'
			}, {
				name: "hello2"
			});

			var newName = $('#testTarget').find('#2342').text();
			ok(newName === 'hello2', "Update single document");

			//base.domDown();
			base.viewGroupDown();
			base.viewDown();
			base.dbDown();
		});

		test("Bind - View.on() :: Remove from CollectionGroup via CollectionGroup Interface", function() {
			base.dbUp();
			base.dataUp();
			base.viewUp();
			base.viewGroupUp();
			base.domUp();

			user.on('remove', function () {
				ok(true, 'Collection remove');
			});

			userView.on('remove', function () {
				ok(true, 'View remove');
			});

			userGroup.on('remove', function () {
				ok(true, 'Group remove');
			});

			userGroupView.on('remove', function () {
				ok(true, 'View from group remove');
			});

			userGroupView.bind('#testTarget', {
				template: function (data, callback) {
					callback('<li id="' + data._id + '">' + data.name + '</li>');
				}
			});

			userGroup.insert({
				_id: '2342',
				name: "hello"
			});

			var elem = $('#testTarget').find('#2342');
			ok(elem.length === 1, "Insert single document");

			userGroup.remove({
				_id: '2342'
			});

			elem = $('#testTarget').find('#2342');
			ok(elem.length === 0, "Remove single document");

			base.domDown();
			base.viewGroupDown();
			base.viewDown();
			base.dbDown();
		});

		test("Bind - View() :: View sort", function() {
			base.dbUp();
			base.viewUp();
			base.dataUp();
			base.domUp();

			//userView._debug = true;
			userView
				.queryOptions({
					sort: {
						name: 1
					}
				}, false)
				.bind('#testTarget', {
					template: function (data, callback) {
						callback('<li class="item" id="' + data._id + '">' + data.name + '</li>');
					}
				});

			user.insert({
				_id: '2342',
				name: "adam"
			});

			user.insert({
				_id: '23432',
				name: "zelda"
			});

			user.insert({
				_id: '2322',
				name: "beta"
			});

			//userView.refresh(true);

			var viewData = userView.find(),
				elems = $('#testTarget').find('.item');

			ok(elems.length === 6, "Insert documents");

			// Check sort order
			//console.log($(elems[0]).html(), $(elems[1]).html(), $(elems[2]).html(), $(elems[3]).html(), $(elems[4]).html(), $(elems[5]).html());
			ok($(elems[0]).html() === 'adam', "Alphabetical 1");
			ok($(elems[1]).html() === 'beta', "Alphabetical 2");
			ok($(elems[2]).html() === 'Dean', "Alphabetical 3");
			ok($(elems[3]).html() === 'Jim', "Alphabetical 4");
			ok($(elems[4]).html() === 'Kat', "Alphabetical 5");
			ok($(elems[5]).html() === 'zelda', "Alphabetical 6");

			//userView._debug = false;

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