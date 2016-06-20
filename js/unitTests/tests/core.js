module.exports = function (TB, ForerunnerDB) {
	TB.test('Core', 'Instantiate ForerunnerDB', function (callback) {
		var fdb = new ForerunnerDB();

		TB.strictEqual(fdb instanceof ForerunnerDB, true, 'ForerunnerDB instance is instantiated');

		TB.expect(1);
		callback();
	});

	TB.test('Core', 'Instantiate a Database Instance', function (callback) {
		var fdb = new ForerunnerDB(),
			db = fdb.db('temp');

		TB.strictEqual(db instanceof ForerunnerDB.shared.modules.Db, true, 'ForerunnerDB database instance is instantiated');

		TB.expect(1);
		callback();
	});
};