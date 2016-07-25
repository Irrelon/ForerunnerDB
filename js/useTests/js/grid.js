window.fdba = new ForerunnerDB();
window.db = window.fdba.db('gridTest');

var coll = window.db.collection('gridData'),
	view = window.db.view('gridData'),
	grid;

view.from(coll);

view.queryData({
	firstName: /A./
}, {
	$page: 0,
	$limit: 3
});

grid = view.grid('#gridContainer', '#gridTable', {
	$orderBy: {
		_id: 1
	}
});

coll.setData([{
	_id: 'AAABBB4',
	firstName: 'Anne',
	lastName: 'Jones',
	age: 12
}, {
	_id: 'AAABBB3',
	firstName: 'Anne',
	lastName: 'Jones',
	age: 9
}, {
	_id: 'AAABBB2',
	firstName: 'Jill',
	lastName: 'Jones',
	age: 14
}, {
	_id: 'AAABBB1',
	firstName: 'Anne',
	lastName: 'Frogsbottom',
	age: 34
}, {
	_id: 'AAABBB5',
	firstName: 'Giles',
	lastName: 'Frogsbottom',
	age: 45
}, {
	_id: 'AAABBB6',
	firstName: 'Jane',
	lastName: 'Frogsbottom',
	age: 12
}, {
	_id: 'AAABBB7',
	firstName: 'Hans',
	lastName: 'Frogsbottom',
	age: 9
}]);

// Hook events
grid.on('beforeChange', function () {
	console.log('beforeChange');
});

grid.on('beforeSort', function () {
	console.log('beforeSort');
});

grid.on('beforeFilter', function () {
	console.log('beforeFilter');
});