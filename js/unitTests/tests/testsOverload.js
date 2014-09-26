test('Overload :: Type-based overloading', function () {
	base.dbUp();

	var func = new db.shared.overload({
		'string': function (val) {
			return 1;
		},
		'string, function': function (val, callback) {
			return 2;
		},
		'string, number': function (val, num) {
			return 3;
		},
		'string, string': function (val1, val2) {
			return 4;
		},
		'string, string, ...': function (val1, val2) {
			return 5;
		},
		'string, string, number, ...': function (val1, val2) {
			return 6;
		}
	});

	ok(func('hello') === 1, 'Single string argument');
	ok(func('hello', function () {}) === 2, 'String, function arguments');
	ok(func('hello', 4) === 3, 'String, number arguments');
	ok(func('hello', 'goodbye') === 4, 'String, string arguments');
	ok(func('hello', 'goodbye', 'useful') === 5, 'String, string, any arguments');
	ok(func('hello', 'goodbye', 4, 'moo', 'foo') === 6, 'String, string, number, any arguments');

	base.dbDown();
});