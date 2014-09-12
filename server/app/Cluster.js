var Cluster = function (app, options) {
	var self = this;

	this.os = require('os');
	this.request = require('request');

	this._ip = this._getPrivateIp();
	this._options = options;
	this._app = app;
	this._apiServer = options.phpApi;
	this._clusterList = [];
	this._clusterRegister = {};
	this._httpProtocol = this._options.ssl ? 'https' : 'http';

	// Listen for signals
	this._app._server._router.post('/cluster/helo', function (req, res) {
		return self._heloReceived(req, res);
	});

	this._app._server._router.post('/cluster/heartbeat', function (req, res) {
		return self._heartbeatReceived(req, res);
	});

	this._app._server._router.post('/cluster/send', function (req, res) {
		return self._msgReceived(req, res);
	});

	// Setup a heartbeat signal every 10 seconds
	setInterval(function () {
		self.processHeartbeats();
	}, options.heartbeatIntervalMs);
};

/**
 * Adds our IP address to the cluster list using a PHP API call. The cluster list
 * is a MySQL database table that contains a list of IP addresses of each cluster
 * node. We use this list to know which other nodes are in the cluster.
 * @param callback
 */
Cluster.prototype.register = function (callback) {
	var self = this;

	if (this._ip) {
		// Register ourselves with the PHP API
		this.request({
			url: this._apiServer,
			json: {
				head: {
					command: 'NodeClusterRegister',
					output: "json"
				},
				body: {
					hash: ',4k)2c(Zp[aE[[44[=FAM#<PLC ~YNlKlc -1x{FAM>wQ@6+6`+%+oeKk-f&ro_@',
					ip: this._ip
				}
			},
			strictSSL: false,
			method: 'POST'
		}, function (err, resp, body) {
			if (!err) {
				if (body && body.data && body.data.success) {
					callback(false, body.data);
				} else {
					callback('Node PHP API error:' + JSON.stringify(body.data));
				}
			} else {
				callback('Network request error:' + JSON.stringify(err));
			}
		});
	} else {
		self._app.log('*Cluster* : Error getting private IP address (internal LAN address) from list:', this.os.networkInterfaces());
	}
};

/**
 * Gets the list of current cluster node IP addresses. If we are the first server
 * to register then this will only return our own IP (or no IPs).
 * @param callback
 */
Cluster.prototype.list = function (callback) {
	var self = this;

	// Call PHP API and get a list of existing servers
	this.request({
		url: this._apiServer,
		json: {
			head: {
				command: 'NodeClusterList',
				output: "json"
			},
			body: {
				hash: ',4k)2c(Zp[aE[[44[=FAM#<PLC ~YNlKlc -1x{FAM>wQ@6+6`+%+oeKk-f&ro_@'
			}
		},
		strictSSL: false,
		method: 'POST',
		timeout: self._options.getServerListTimeoutMs
	}, function (err, resp, body) {
		if (!err) {
			if (body && body.data && body.data.success) {
				self._clusterList = body.data.list;

				for (var i = 0; i < self._clusterList.length; i++) {
					self._clusterRegister[self._clusterList[i]] = {
						registerTs: new Date().getTime(),
						heartbeatReceivedTs: new Date().getTime(),
						heartbeatFailCount: 0
					};
				}

				callback(false, body.data);
			} else {
				callback('Node PHP API error:' + JSON.stringify(body.data));
			}
		} else {
			callback('Network request error:' + JSON.stringify(err));
		}
	});
};

/**
 * Sends a message to each node in the cluster list telling it that we
 * exist as a new node in the cluster. After we have joined the cluster
 * then any new messages received by the nodes we have connected to will
 * be forwarded to us as well so we can forward them to our clients.
 */
Cluster.prototype.joinCluster = function (callback) {
	var self = this;

	// Connect to the other servers in the cluster
	// by looping the cluster IP list and attempting a connection
	var async = require('async'),
		ipIndex,
		serverIp,
		waterfall = [],
		func;

	for (ipIndex = 0; ipIndex < this._clusterList.length; ipIndex++) {
		serverIp = this._clusterList[ipIndex];

		if (serverIp !== this._ip) {
			func = function (serverIp) {
				return function (continueFunc) {
					self._app.log('*Cluster* : Joining with cluster node ' + serverIp + '...');

					self.connect(serverIp, function () {
						continueFunc();
					});
				};
			}(serverIp);
			waterfall.push(func);
		}
	}

	async.waterfall(waterfall, function () {
		callback();
	});
};

Cluster.prototype.connect = function (serverIp, callback) {
	var self = this;

	self._app.log('*Cluster* : Connecting on ' + this._httpProtocol + '://' + serverIp + ':' + this._options.connectPort + '/cluster/helo');

	this.request({
		url: this._httpProtocol + '://' + serverIp + ':' + this._options.connectPort + '/cluster/helo',
		json: {
			ip: this._ip
		},
		strictSSL: false,
		method: 'POST',
		timeout: this._options.connectToClusterNodeTimeoutMs
	}, function (err, resp, body) {
		if (err || !body || body && body.err) {
			// An error occurred connecting
			callback('Server didn\'t respond');
			self._app.log('*Cluster* : Server didn\'t respond!');
			//throw('Cannot connect to node at ' + serverIp + ', quiting...');
		} else {
			self._app.log('*Cluster* : Successfully registered with existing cluster node at: ' + serverIp);
			callback(false);
		}
	});
};

Cluster.prototype.processHeartbeats = function () {
	var self = this;

	// Connect to the other servers in the cluster
	// by looping the cluster IP list and attempting a connection
	var ipIndex,
		serverIp;

	for (ipIndex = 0; ipIndex < this._clusterList.length; ipIndex++) {
		serverIp = this._clusterList[ipIndex];

		if (serverIp !== this._ip) {
			this.heartbeat(serverIp);
		}
	}
};

Cluster.prototype.sendToCluster = function (paths, data) {
	var self = this,
		ipIndex,
		serverIp;

	// Add our node to the forwarded message array
	data._forwardedBy = data._forwardedBy || [];
	data._forwardedBy.push(this._ip);

	for (ipIndex = 0; ipIndex < this._clusterList.length; ipIndex++) {
		serverIp = this._clusterList[ipIndex];

		if (serverIp !== this._ip) {
			this.send(serverIp, paths, data);
		}
	}
};

Cluster.prototype.send = function (serverIp, paths, data) {
	var self = this;

	this.request({
		url: this._httpProtocol + '://' + serverIp + ':' + this._options.connectPort + '/cluster/send',
		json: {
			paths: paths,
			data: data
		},
		strictSSL: false,
		method: 'POST',
		timeout: this._options.sendToClusterTimeoutMs
	}, function (err, resp, body) {
		if (err || !body || body && body.err) {
			self._app.log('*Cluster* : Error sending data to cluster!');
		} else {
			self._app.log('*Cluster* : Forwarded message to cluster node at: ' + serverIp);
		}
	});
};

Cluster.prototype.heartbeat = function (serverIp) {
	var self = this;
	//self._app.log('Sending heartbeat signal to ' + serverIp);

	// Send out a heartbeat signal to the cluster
	this.request({
		url: this._httpProtocol + '://' + serverIp + ':' + this._options.connectPort + '/cluster/heartbeat',
		json: {
			ip: this._ip
		},
		strictSSL: false,
		method: 'POST',
		timeout: self._options.connectToClusterNodeTimeoutMs
	}, function (err, resp, body) {
		if (err || !body || body && body.err) {
			// An error occurred connecting
			self._app.log('*Cluster* : Cannot connect to server at ' + serverIp + ', heartbeat failed, logging failure.');

			// Increment the heartbeat failure counter
			if (self._clusterRegister[serverIp]) {
				self._clusterRegister[serverIp].heartbeatFailCount++;

				if (self._clusterRegister[serverIp].heartbeatFailCount >= self._options.heartbeatFailureThreshold) {
					// Pull the server from the cluster list
					self._app.log('*Cluster* : Heartbeat signal failed over threshold, removing node from cluster list: ' + serverIp);
					self.removeNode(serverIp);
				}
			}
		} else {
			if (self._clusterRegister[serverIp]) {
				// Reset the heartbeat failure count because the heartbeat worked
				self._clusterRegister[serverIp].heartbeatFailCount = 0;
			}
		}
	});
};

Cluster.prototype.removeNode = function (serverIp) {
	var index = this._clusterList.indexOf(serverIp);

	if (index > -1) {
		this._clusterList.splice(index, 1);
	}

	delete this._clusterRegister[serverIp];

	// Tell the PHP API to remove the server
	this.request({
		url: this._apiServer,
		json: {
			head: {
				command: 'NodeClusterRemove',
				output: "json"
			},
			body: {
				hash: ',4k)2c(Zp[aE[[44[=FAM#<PLC ~YNlKlc -1x{FAM>wQ@6+6`+%+oeKk-f&ro_@',
				ip: serverIp
			}
		},
		strictSSL: false,
		method: 'POST',
		timeout: this._options.removeServerFromListTimeoutMs
	}, function () {});
};

Cluster.prototype._heloReceived = function (req, res) {
	var self = this;

	// Add the server to our cluster register with the current time
	// to indicate when they registered with us
	self._app.log('*Cluster* : Helo received with IP: ' + req.body.ip);

	if (req && req.body && req.body.ip) {
		this._clusterRegister[req.body.ip] = {
			registerTs: new Date().getTime(),
			heartbeatReceivedTs: new Date().getTime(),
			heartbeatFailCount: 0
		};

		// Add this node to the cluster list
		if (this._clusterList.indexOf(req.body.ip) === -1) {
			this._clusterList.push(req.body.ip);
		}

		self._app.log('*Cluster* : Other node just registered with us: ' + req.body.ip);

		res.send({
			"err": "",
			"data": "OK"
		});
	} else {
		self._app.log('*Cluster* : Other node tried to connect but did not send appropriate data!');

		res.send({
			"err": "Missing data in request"
		});
	}
};

Cluster.prototype._heartbeatReceived = function (req, res) {
	var self = this;

	// Heartbeat received, update the heartbeat timestamp for this node
	if (req && req.body && req.body.ip && this._clusterRegister[req.body.ip]) {
		//self._app.log('Heartbeat received from: ' + req.body.ip);
		this._clusterRegister[req.body.ip].heartbeatReceivedTs = new Date().getTime();

		res.send({
			"err": "",
			"data": "OK"
		});
	} else {
		self._app.log('*Cluster* : Invalid heartbeat received, no server registered with IP: ' + req.body.ip);
		res.send({
			"err": "Missing data in request"
		});
	}
};

/**
 * Handles receiving a message from another node that wants our node to forward it on
 * to our clients. The message will have originated from PHP connecting to the other
 * node and then that node has forwarded it to it's own clients and wants us to send it
 * to ours.
 * @param req
 * @param res
 * @private
 */
Cluster.prototype._msgReceived = function (req, res) {
	// Mash query and body vars together
	var self = this,
		param,
		paths,
		path,
		data;

	paths = req.body.paths;
	data = req.body.data;

	//self._app.log(data, paths);

	// Check for data from the call
	if (paths && data) {
		// Check we have at least one path
		if (paths.length) {
			// All looks ok, loop the paths and send
			for (var i = 0; i < paths.length; i++) {
				path = paths[i];
				this._app._server._realtime.publish(path, data);
			}

			res.send({
				"err": "",
				"data": "OK"
			});
			return;
		} else {
			res.send({
				"err": "",
				"data": "OK"
			});
			return;
		}
	} else {
		res.send({
			"err": "Missing paths or data in request body!"
		});
		return;
	}
};

/**
 * Returns true if the passed IP address is a private LAN one.
 * @param addr
 * @returns {boolean}
 * @private
 */
Cluster.prototype._isPrivateIp = function (addr) {
	return addr.match(/^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
		addr.match(/^192\.168\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
		addr.match(/^172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})/) != null;
};

/**
 * Loops the interface IPs on this server and determines which one is our internal
 * LAN IP address, then returns it.
 * @returns {*}
 * @private
 */
Cluster.prototype._getPrivateIp = function () {
	// Get current private IP of the server
	var interfaces = this.os.networkInterfaces(),
		interfaceName,
		ipIndex,
		ip;

	for (interfaceName in interfaces) {
		if (interfaces.hasOwnProperty(interfaceName)) {
			for (ipIndex in interfaces[interfaceName]) {
				if (interfaces[interfaceName].hasOwnProperty(ipIndex)) {
					if (this._isPrivateIp(interfaces[interfaceName][ipIndex].address)) {
						ip = interfaces[interfaceName][ipIndex].address;
					}
				}

				if (ip) {
					break;
				}
			}
		}

		if (ip) {
			break;
		}
	}

	return ip;
};

module.exports = Cluster;