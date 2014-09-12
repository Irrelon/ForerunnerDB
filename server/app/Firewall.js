var sanitizer = require('sanitizer'),
	inbound = {
		channel: {
			accept: [
				'/_',
				'/_/a',
				'/_/a/b',
				'/_/a/b/c',
				'/_/a/b/c/d'
			]
		}
	};

var Firewall = {
	incoming: function(message, request, callback) {
		// Deny clients access to publish channels except what is allowed by
		// inbound rules
		if (message.channel.indexOf('/meta/') !== 0) {

			if (inbound.channel.accept.indexOf(message.channel.substr(0, message.channel.length - 4)) === -1) {
				// Channel publish not allowed
				message.error = 'No access to this channel';
			}

			if (message.data && message.data.msg) {
				var contentLength = message.data.msg.length;

				// Content filter
				message.data.msg = sanitizer.sanitize(message.data.msg);
				message.data.msg = sanitizer.escape(message.data.msg);

				if (!message.data.msg) {
					if (contentLength) {
						message.error = 'Invalid content';
					} else {
						message.error = 'No content';
					}
				}
			}
		}

		callback(message);
	}
};

module.exports = Firewall;