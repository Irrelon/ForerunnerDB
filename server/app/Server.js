var Server = function (app, settings) {
	this._app = app;
	this._version = '1.0';
	this._http = require('http');
	this._https = require('https');
	this._faye = require('faye');
	this._fs = require('fs');
	this._express = require('express');
	this._router = this._express();
	this._settings = settings;
	this._apiServer = settings.server.phpApi;

	var self = this;

	this._router.use(this._express.json());
	this._router.use(this._express.urlencoded());

	if (this._settings.ssl && this._settings.ssl.enable) {
		this._ssl = {
			key: this._fs.readFileSync(this._settings.ssl.key),
			cert: this._fs.readFileSync(this._settings.ssl.cert)
		}
	}

	this._serverAuth = {
		incoming: function (message, callback) {
			if (message.channel != '/meta/subscribe') {
				return callback(message);
			}

			if (!message.appSessionKey || !message.appType || !message.uuid) {
				message.error = 'Invalid';
			}

			var request = require('request');

			request({
				url: self._apiServer,
				json: {
					head: {
						command: 'AuthenticateChannel',
						output: "json",
						appSessionKey: message.appSessionKey,
						appType: message.appType,
						uuid: message.uuid
					},
					body: {
						channel: message.subscription
					}
				},
				strictSSL: false,
				method: 'POST'
			}, function (err, resp, body) {
				if (!err) {
					if (body && body.data && body.data.valid == true) {
						// Authorized.
					} else {
						message.error = "Not authorized";
					}
				} else {
					message.error = "Not authorized";
				}
			});

			callback(message);
		}
	};

	self._app.log('*Server* : Init, ssl: ' + this._settings.ssl.enable);
};

Server.prototype.start = function () {
	var self = this;

	if (this._settings.ssl && this._settings.ssl.enable) {
		this._cfServer = this._https.createServer(this._ssl);
		this._afServer = this._https.createServer(this._ssl, this._router);
	} else {
		this._cfServer = this._http.createServer();
		this._afServer = this._http.createServer(this._router);
	}

	this._bayeux = new this._faye.NodeAdapter({
		mount: '/faye',
		timeout: 15
	});

	this._bayeux.addExtension(this._serverAuth);

	this._bayeux.attach(this._cfServer);
	self._app.log('*Server* : Creating client-facing listener on port: ' + this._settings.server.clientFacing.port);
	this._cfServer.listen(this._settings.server.clientFacing.port, this._settings.server.clientFacing.host);
	self._app.log('*Server* : Creating API-facing listener on port: ' + this._settings.server.apiFacing.port);
	this._afServer.listen(this._settings.server.apiFacing.port, this._settings.server.apiFacing.host);

	this._bayeux.bind('handshake', function (clientId) {
		//self._app.log('*Server* : Client connected', clientId);
	});

	this._bayeux.bind('subscribe', function (clientId, channel) {
		//self._app.log('*Server* : Client subscribed', clientId, channel);
	});

	this._bayeux.bind('unsubscribe', function (clientId, channel) {
		//self._app.log('*Server* : Client unsubscribed', clientId, channel);
	});

	this._bayeux.bind('publish', function (clientId, channel, data) {
		//self._app.log('*Server* : Client published', clientId, channel, data);
	});

	this._bayeux.bind('disconnect', function (clientId) {
		//self._app.log('*Server* : Client disconnect', clientId);
	});

	this._realtime = this._bayeux.getClient();
	self._app.log('*Server* : Start');
};

Server.prototype.addExtension = function (extension) {
	return this._bayeux.addExtension(extension);
};

module.exports.Server = Server;
