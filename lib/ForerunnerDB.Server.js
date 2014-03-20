exports = module.exports = (function () {
	var Server = function (db) {
		this._db = db;
		this._app = require('http').createServer(function handler (req, res) {
			res.writeHead(200);
			res.end();
		});

		this._io = require('socket.io').listen(this._app);
		this._fs = require('fs');

		console.log('Init ');
	};

	Server.prototype.start = function () {
		console.log('Starting listener...');
		var self = this;
		this._app.listen(9000);

		this._io.sockets.on('connection', function (socket) {
			socket.on('auth', function (data, callback) {
				var results = self._db.collection('fdbAuth').find({
					user: data.user,
					pass: data.pass
				});

				var authSuccess = Boolean(results[0]);

				callback({err: false, result: authSuccess});
			});

			socket.on('setData', function (data, callback) {
				self._db.collection(data.collection).setData(data.query, data.options);
				callback({err: false, result: true});
			});

			socket.on('insert', function (data, callback) {
				var results = self._db.collection(data.collection).insert(data.query, data.options);
				callback({err: false, result: results});
			});

			socket.on('find', function (data, callback) {
				var results = self._db.collection(data.collection).find(data.query, data.options);
				callback({err: false, result: results});
			});

			socket.on('update', function (data, callback) {
				var results = self._db.collection(data.collection).update(data.query, data.update, data.options);
				callback({err: false, result: results});
			});

			socket.on('remove', function (data, callback) {
				var results = self._db.collection(data.collection).remove(data.query, data.options);
				callback({err: false, result: results});
			});
		});
	};

	return Server;
})();