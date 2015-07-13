window.fdba = new ForerunnerDB();
window.db = window.fdba.db('gridTest');

var coll = window.db.collection('gridData'),
	view = window.db.view('gridData');

coll.setData([{
	firstName: 'Jim',
	lastName: 'Jones',
	age: 12
}, {
	firstName: 'Jim',
	lastName: 'Jones',
	age: 9
}, {
	firstName: 'Jill',
	lastName: 'Jones',
	age: 14
}, {
	firstName: 'Jane',
	lastName: 'Frogsbottom',
	age: 34
}, {
	firstName: 'Giles',
	lastName: 'Frogsbottom',
	age: 45
}, {
	firstName: 'Jane',
	lastName: 'Frogsbottom',
	age: 12
}, {
	firstName: 'Hans',
	lastName: 'Frogsbottom',
	age: 9
}]);

view.from(coll);
view.queryData({}, {
	$page: 0,
	$limit: 3
});
view.grid('#gridContainer', '#gridTable');