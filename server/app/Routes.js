var Routes = function (app, server) {
	var self = this,
		router = server._router;

	this._app = app;

	router.post('/push', function (req, res) {
		// Mash query and body vars together
		var param,
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
				// Check for method in data
				switch (data.method) {
					case 'PUT':
					case 'POST':
						// Check that we have a payload
						if (!data.payload) {
							res.send({
								"err": "POST or PUT method specified but no data payload provided!"
							});
							return;
						}
						break;
				}

				// Send to the cluster
				app._cluster.sendToCluster(paths, data);

				// All looks ok, loop the paths and send
				for (var i = 0; i < paths.length; i++) {
					path = paths[i];
					server._realtime.publish(path, data);
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
	});
};

module.exports = Routes;