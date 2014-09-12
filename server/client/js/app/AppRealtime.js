var AppRealtime = function (app) {
	this._subscriptions = {};
};

AppRealtime.prototype.ready = function () {

};

AppRealtime.prototype.connect = function (url) {
	this._client = new Faye.Client(url);
};

AppRealtime.prototype.subscribe = function (channel, callback) {
	var self = this,
		subscription;

	// Subscribe to new channel
	subscription = this._client.subscribe('/_' + channel + '/**', function(message) {
		self._onMessage(channel, message);
	});

	subscription.then(function() {
		callback(false, channel);
	}, function (err) {
		callback(err, channel);
	});

	// Save the subscription
	this._subscriptions[channel] = subscription;

	return subscription;
};

AppRealtime.prototype.unsubscribe = function (channel) {
	if (channel) {
		this._subscriptions[channel].cancel();
		delete this._subscriptions[channel];
	} else {
		var i;

		for (i in this._subscriptions) {
			if (this._subscriptions.hasOwnProperty(i)) {
				this._subscriptions[i].cancel();
			}
		}

		this._subscriptions = {};
	}
};

AppRealtime.prototype.send = function (channel, data, callback) {
	this._client
		.publish('/_' + channel + '/all', data)
		.then(function () {
			if (callback) { callback(false); }
		}, function (err) {
			if (callback) { callback(err); }
		});
};

AppRealtime.prototype.on = function(event, listener) {
	this._listeners = this._listeners || {};

	this._listeners[event] = this._listeners[event] || [];
	this._listeners[event].push(listener);
};

AppRealtime.prototype.off = function(event, listener) {
	if (this._listeners) {
		if (event in this._listeners) {
			var arr = this._listeners[event],
				index = arr.indexOf(listener);

			if (index > -1) {
				arr.splice(index, 1);
			}
		}
	}
};

AppRealtime.prototype.emit = function(event, data) {
	this._listeners = this._listeners || {};

	if (event in this._listeners) {
		var arr = this._listeners[event],
			arrCount = arr.length,
			arrIndex;

		for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
			arr[arrIndex].apply(this, Array.prototype.slice.call(arguments, 1));
		}
	}
};

AppRealtime.prototype._onMessage = function (channel, message) {
	this.emit('data', {
		channel: channel,
		message: message
	});
};