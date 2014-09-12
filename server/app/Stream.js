var Stream = {
	incoming: function(message, request, callback) {
		callback(message);
	}
};

module.exports = Stream;