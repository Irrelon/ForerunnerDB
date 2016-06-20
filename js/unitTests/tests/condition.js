module.exports = function (TB, ForerunnerDB) {
	TB.test('Condition', 'Test IFTTT condition functionality', function (finishTest) {
		var fdb = new ForerunnerDB(),
			db = fdb.db('test'),
			coll = db.collection('stocksIOwn'),
			condition;

		condition = coll.when({
				_id: 'TSLA',
				val: {
					$gt: 210
				}
			})
			.and({
				_id: 'SCTY',
				val: {
					$gt: 23
				}
			})
			.then(function () {
				var tsla = coll.findById('TSLA'),
					scty = coll.findById('SCTY');

				TB.strictEqual(tsla.val, 214, 'TSLA value is 214');
				TB.strictEqual(scty.val, 25, 'TSLA value is 25');

				TB.expect(4);
				finishTest();
			})
			.else(function () {
				var tsla = coll.findById('TSLA'),
					scty = coll.findById('SCTY');

				TB.strictEqual(tsla.val, 214, 'TSLA value is 214');
				TB.strictEqual(scty.val, 20, 'TSLA value is 20');
			});

		coll.insert([{
			_id: 'TSLA',
			val: 214
		}, {
			_id: 'SCTY',
			val: 20
		}]);

		condition.start(undefined);

		coll.update({_id: 'SCTY'}, {val: 25});
	});
};