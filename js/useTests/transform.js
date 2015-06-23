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