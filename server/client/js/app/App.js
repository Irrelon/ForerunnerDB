var App = function () {
	var self = this;
	self.realtime = new AppRealtime(this);

	this._listeners = {};

	$(function () {
		self.ready();
	});
};

App.prototype.ready = function () {
	var self = this;
	self.realtime.ready();

	// Setup realtime listeners
	self.realtime.connect('http://192.168.1.49:8000/faye');
	self.realtime.subscribe($('#viewChannel').val(), function (err, channel) {
		if (!err) {
			$('#log').append('<div>Connected to ' + '/_' + channel + '/**' + ' successfully</div>');
		} else {
			$('#log').prepend('<div style="color: red;">Error: ' + err.message + '</div>');
		}
	});

	self.realtime.on('data', function (data) {
		data.message.name = data.message.name || 'Anonymous Andy';
		$('#log').prepend('<div><b>' + data.message.name + '</b>: ' + data.message.msg + '</div>');
	});

	$('#channelForm').on('submit', function (e) {
		e.preventDefault();
		self.realtime.unsubscribe();
		self.realtime.subscribe($('#viewChannel').val(), function (err, channel) {
			if (!err) {
				$('#log').append('<div>Connected to ' + '/_' + channel + '/**' + ' successfully</div>');
			} else {
				$('#log').prepend('<div style="color: red;">Error: ' + err.message + '</div>');
			}
		});
	});

	$('#testChat').on('submit', function (e) {
		e.preventDefault();

		self.realtime.send($('#sendChannel').val(), {
			name: $('#name').val(),
			msg: $('#msg').val()
		}, function (err) {
			if (!err) {
				$('#msg').val('');
			}
		});
	});
};