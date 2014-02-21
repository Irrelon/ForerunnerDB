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
			socket.on('find', function (data, callback) {
				var results = self._db.collection(data.collection).find(data.query, data.options);
				callback({err: false, results: results});
			});
		});
	};

	return Server;
})();