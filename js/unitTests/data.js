// Shared globals for the purpose of testing
var db,
	user,
	organisation,
	userView,
	userGroup,
	userGroupView,
	organisationView,
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
		stringArr: [
			"hello",
			"goodbye"
		],
		log: {
			val: 6
		},
		orgId: "4",
		nested: {
			name: 'Sam',
			nested: {
				age: 19,
				order: 1
			}
		}
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
			_id: 'lsd',
			val: 4
		}],
		stringArr: [
			"moo",
			"foo"
		],
		log: {
			val: 7
		},
		orgId: "1",
		friends: ["3", "4"],
		nested: {
			name: 'Jim',
			nested: {
				age: 15,
				order: 2
			}
		}
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
		stringArr: [
			"goo",
			"joo"
		],
		log: {
			val: 1
		},
		orgId: "2",
		friends: ["2"],
		nested: {
			name: 'Kat',
			nested: {
				age: 12,
				order: 2
			}
		}
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
		stringArr: [
			"roo",
			"too"
		],
		log: {
			val: 2
		},
		orgId: "3",
		friends: ["2", "3"],
		nested: {
			name: 'Dean',
			nested: {
				age: 5,
				order: 4
			}
		}
	}, {
		_id: '5',
		name: 'Dean',
		age: 5,
		lookup: false,
		arr: [{
			_id: 'lse',
			val: 3
		}, {
			_id: 'loi',
			val: 5
		}],
		stringArr: [
			"ooo",
			"poo"
		],
		log: {
			val: 2
		},
		orgId: "3",
		friends: ["1", "3"],
		nested: {
			name: 'Dean',
			nested: {
				age: 5,
				order: 3
			}
		}
	}],
	organisationsData = [{
		"_id": "1",
		"name": "Organisation 1",
		"industry": "it",
		"profit": 200,
		"type": "alpha"
	}, {
		"_id": "2",
		"name": "Organisation 2",
		"industry": "it",
		"profit": 135,
		"type": "beta"
	}, {
		"_id": "3",
		"name": "Organisation 3",
		"industry": "it",
		"profit": 135,
		"type": "delta"
	}, {
		"_id": "4",
		"name": "Organisation 4",
		"industry": "it",
		"profit": 135,
		"type": "cappa"
	}, {
		"_id": "5",
		"name": "Organisation 5",
		"industry": "construction",
		"profit": 340
	}, {
		"_id": "6",
		"name": "Organisation 6",
		"industry": "construction",
		"profit": 980
	}, {
		"_id": "7",
		"name": "Organisation 7",
		"industry": "construction",
		"profit": 45
	}, {
		"_id": "8",
		"name": "Organisation 8",
		"industry": "construction",
		"profit": 27
	}, {
		"_id": "9",
		"name": "Organisation 9",
		"industry": "construction",
		"profit": 664
	}, {
		"_id": "10",
		"name": "Organisation 10",
		"industry": "it",
		"profit": 780,
		"type": "cappa"
	}, {
		"_id": "11",
		"name": "Organisation 11",
		"industry": "it",
		"profit": 1002,
		"type": "alpha"
	}, {
		"_id": "12",
		"name": "Organisation 12",
		"industry": "it",
		"profit": 1002,
		"type": "xray"
	}, {
		"_id": "13",
		"name": "Organisation 13",
		"industry": "it",
		"profit": 1002,
		"type": "gamma"
	}];