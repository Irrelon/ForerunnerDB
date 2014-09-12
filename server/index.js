var App = function () {
	var Server = require('./app/Server.js').Server,
		Firewall = require('./app/Firewall.js'),
		Stream = require('./app/Stream.js'),
		Routes = require('./app/Routes.js'),
		Cluster = require('./app/Cluster.js'),
		async = require('async'),
		settings = require('./package.json'),
		self = this;

	// Create the new server instance
	this._server = new Server(this, settings);
	this._routes = new Routes(this, this._server);
	this._cluster = new Cluster(this, settings.cluster);

	// Start the server listener
	this._server.start();

	// Add extensions
	//this._server.addExtension(Firewall);
	//this._server.addExtension(Stream);

	self.log('*App* : Init');
	async.waterfall([function (callback) {
		self._cluster.list(function (err, data) {
			if (!err && data) {
				self.log('*Cluster* : Got cluster server list successfully, list:', data.list);
				callback();
			} else {
				self.log('*Cluster* : Failed to get cluster list!', err, data);
				self.exit();
			}
		});
	}, function (callback) {
		self.log('*Cluster* : Registering server in cluster...');
		self._cluster.register(function (err) {
			if (!err) {
				self.log('*Cluster* : Registered on cluster list successfully!');
				callback();
			} else {
				self.log('*Cluster* : Failed to register on cluster list!', err);
				self.exit();
			}
		});
	}, function (callback) {
		self._cluster.joinCluster(function () {
			callback();
		});
	}], function () {
		// Startup complete
		self.log('*App* : Startup complete.');
	});
};

App.prototype.log = function (msg) {
	var dt = new Date();
	console.log(dt.toDateString() + ' ' + dt.toTimeString().substr(0, 8) + ': ' + msg);
};

App.prototype.exit = function () {
	setTimeout(function () {
		process.exit();
	}, 200);
};

var app = new App();