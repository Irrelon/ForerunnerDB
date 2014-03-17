var db,
	user,
	organisation,
	count,
	singleUserObject = {
		_id: '1',
		name: 'Sam',
		age: 19,
		lookup: true,
		arr: [{
			val: 1
		}, {
			val: 3
		}],
		log: {
			val: 6
		},
		orgId: "4"
	},
	usersData = [{
		_id: '2',
		name: 'Jim',
		age: 15,
		lookup: true,
		onlyOne: true,
		arr: [{
			_id: 'anf',
			val: 2
		}, {
			_id: 'eet',
			val: 4
		}],
		log: {
			val: 7
		},
		orgId: "1"
	}, {
		_id: '3',
		name: 'Kat',
		age: 12,
		lookup: false,
		arr: [{
			_id: 'zke',
			val: 1
		}, {
			_id: 'zjs',
			val: 5
		}],
		log: {
			val: 1
		},
		orgId: "2"
	}, {
		_id: '4',
		name: 'Dean',
		age: 5,
		lookup: true,
		arr: [{
			_id: 'lsd',
			val: 1
		}, {
			_id: 'lop',
			val: 5
		}],
		log: {
			val: 2
		},
		orgId: "3"
	}],
	organisationsData = [{
		"_id": "1",
		"name": "Organisation 1"
	}, {
		"_id": "2",
		"name": "Organisation 1"
	}, {
		"_id": "3",
		"name": "Organisation 1"
	}, {
		"_id": "4",
		"name": "Organisation 1"
	}, {
		"_id": "5",
		"name": "Organisation 1"
	}];

var buildUp = function () {
	db = new ForerunnerDB();
	user = db.collection('user');
	organisation = db.collection('organisation');
};

var pullDown = function () {
	organisation = undefined;
	user = undefined;
	db = undefined;
};

var buildData = function () {
	user.setData(usersData);
	organisation.setData(organisationsData);
};