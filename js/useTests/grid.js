window.fdb = new ForerunnerDB();
window.db = window.fdb.db('gridTest');

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
view.grid('#gridContainer', '#gridTable');

var testC = db.collection('testC').setData({moo: true});
var testV = db.view('testV');

testV.from(testC);

testV.transform({
	enabled: true,
	dataIn: function (data) {
		"use strict";

		return {
			_id: data._id,
			foo: data.moo
		};
	}
});

testV.link('#testContainer', {
	template: 'Foo: {^{:foo === true ? \'true\' : \'false\'}}'
});

testC.update({moo: true}, {moo: false});