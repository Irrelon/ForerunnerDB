(function () {
	var init = (function (ForerunnerDB) {
		var Base = function () {};

		Base.prototype.dbUp = function () {
			db = new ForerunnerDB();
			user = db.collection('user');
			organisation = db.collection('organisation');
		};

		Base.prototype.dataUp = function () {
			user.setData(usersData);
			organisation.setData(organisationsData);
		};

		Base.prototype.dbDown = function () {
			organisation = undefined;
			user = undefined;
			db = undefined;
		};

		Base.prototype.viewUp = function () {
			userView = db.view('userView')
				.from(db.collection('user'));
		};

		Base.prototype.viewDown = function () {
			db.view('userView').drop();
			userView = undefined;
		};

		Base.prototype.viewGroupUp = function () {
			userGroup = db.collectionGroup('userGroup')
				.addCollection(userView);

			userGroupView = db.view('userGroupView')
				.from(userGroup);
		};

		Base.prototype.viewGroupDown = function () {
			db.collectionGroup('userGroup').drop();
			db.view('userGroupView').drop();
			userGroup = undefined;
			userGroupView = undefined;
		};

		Base.prototype.domUp = function () {
			$('<ul id="testTarget"></ul>').appendTo('body');
		};

		Base.prototype.domDown = function () {
			$('#testTarget').remove();
		};

		return new Base();
	});

	if (typeof(define) === 'function' && define.amd) {
		// Use AMD
		define([
			'../ForerunnerDB'
		], function (ForerunnerDB) {
			return init(ForerunnerDB);
		});
	} else {
		// Use global
		window.base = init(ForerunnerDB);
	}
})();