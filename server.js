var Server = (function () {
	var ForerunnerDB = require('./ForerunnerDB');
	ForerunnerDB.prototype.Plugin.Server = require('./ForerunnerDB.Server');

	var db = new ForerunnerDB();
	db.server.start();

	db.collection('stream').setData([{
		_id: '1',
		name: 'Rob'
	}, {
		_id: '2',
		name: 'Jim'
	}, {
		_id: '3',
		name: 'Bob'
	}])
})();