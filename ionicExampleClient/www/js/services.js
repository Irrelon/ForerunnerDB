"use strict";

angular.module('app.services', [])

/*.factory('BlankFactory', [function(){
	console.log('blankfactory');
}])*/

.service('$api', ['$ionicLoading', '$http', function($ionicLoading, $http) {
	var self = this,
		settings,
		tmpSettings,
		_dedupQueue = {},
		_dedup,
		_addToQueue,
		_processQueue,
		_queueTimeout,
		_scheduleTimeout,
		_queue = [],
		_api = {
			getIntoCall: null,
			getCall: null,
			postCall: null,
			putCall: null,
			deleteCall: null
		};

	_dedup = function (callId, timeout, callData) {
		if (callData.type && _api[callData.type]) {
			if (_dedupQueue[callId]) {
				// Kill the existing call timeout
				clearTimeout(_dedupQueue[callId]._timerId);
			}

			// Set the new dedup data
			_dedupQueue[callId] = {
				_timerId: setTimeout(function () {
					// Build call arguments
					var args = [];

					if (callData.url) {
						args.push(callData.url);
					}
					if (callData.data) {
						args.push(callData.data);
					}
					if (callData.callback) {
						args.push(callData.callback);
					}

					//console.log('Calling deferred method', callData, args);

					// Activate the api call
					_api[callData.type].apply(self, args);

					// Delete our record from the queue
					delete _dedupQueue[callId];
				}, timeout)
			};
		} else {
			throw('Cannot setup deferred all to unknown call type in $api');
		}
	};

	_scheduleTimeout = function () {
		if (!_queueTimeout) {
			//console.log('Timeout queued...');
			_queueTimeout = setTimeout(_processQueue, 200);
		}
	};

	_addToQueue = function (url, call) {
		//console.log('Queueing: ' + url);
		_queue.push(call);
		_scheduleTimeout();
	};

	_processQueue = function () {
		_queueTimeout = null;
		//console.log('Timeout fired...');

		if (_queue.length) {
			if (settings) {
				var item = _queue.shift();
				//console.log('Executing call...');
				item();
				_scheduleTimeout();
			} else {
				_scheduleTimeout();
			}
		}

		if (!settings) {
			// Check if we have settings yet
			tmpSettings = db.collection('settings').findOne();
			if (tmpSettings && tmpSettings.host && tmpSettings.port) {
				settings = tmpSettings;
				//console.log('Got server settings data: ', settings);
			}
		}
	};

	_api.getIntoCall = function (url, collectionName, callback) {
		_addToQueue(url, function () {
			//console.log('Getting: ' + url);

			$http.get(settings.host + ':' + settings.port + url).then(function (resp) {
				$ionicLoading.hide();

				if (resp.data && !resp.data.err) {
					// Success
					db.collection(collectionName).remove({});
					db.collection(collectionName).insert(resp.data.data);
				}

				if (callback) { callback(false); }
			}, function (err) {
				$ionicLoading.hide();
				//console.log('call error', arguments);
				if (callback) { callback(err); }
			});
		});
	};

	_api.getCall = function (url, callback, options) {
		if (options && options.callId && options.timeout) {
			_dedup(options.callId, options.timeout, {
				type: 'getCall',
				url: url,
				callback: callback
			});
		} else {
			_addToQueue(url, function () {
				$http.get(settings.host + ':' + settings.port + url).then(function (resp) {
					$ionicLoading.hide();

					if (callback) {
						callback(false, resp.data.data);
					}
				}, function (err) {
					$ionicLoading.hide();
					//console.log('call error', arguments);
					if (callback) {
						callback(err);
					}
				});
			});
		}
	};

	_api.postCall = function (url, data, callback, options) {
		if (options && options.callId && options.timeout) {
			_dedup(options.callId, options.timeout, {
				type: 'postCall',
				url: url,
				data: data,
				callback: callback
			});
		} else {
			_addToQueue(url, function () {
				//console.log('Posting: ' + url);
				$http.post(settings.host + ':' + settings.port + url, data).then(function (resp) {
					$ionicLoading.hide();

					if (callback) {
						callback(false, resp.data.data);
					}
				}, function (err) {
					$ionicLoading.hide();
					//console.log('call error', arguments);
					if (callback) {
						callback(err);
					}
				});
			});
		}
	};

	_api.putCall = function (url, data, callback, options) {
		if (options && options.callId && options.timeout) {
			_dedup(options.callId, options.timeout, {
				type: 'putCall',
				url: url,
				data: data,
				callback: callback
			});
		} else {
			_addToQueue(url, function () {
				//console.log('Posting: ' + url);
				$http.put(settings.host + ':' + settings.port + url, data).then(function (resp) {
					$ionicLoading.hide();

					if (callback) {
						callback(false, resp.data.data);
					}
				}, function (err) {
					$ionicLoading.hide();
					//console.log('call error', arguments);
					if (callback) {
						callback(err);
					}
				});
			});
		}
	};

	_api.deleteCall = function (url, callback, options) {
		if (options && options.callId && options.timeout) {
			_dedup(options.callId, options.timeout, {
				type: 'deleteCall',
				url: url,
				callback: callback
			});
		} else {
			_addToQueue(url, function () {
				$http.delete(settings.host + ':' + settings.port + url).then(function (resp) {
					$ionicLoading.hide();

					if (callback) {
						callback(false, resp.data.data);
					}
				}, function (err) {
					$ionicLoading.hide();
					//console.log('call error', arguments);
					if (callback) {
						callback(err);
					}
				});
			});
		}
	};

	return {
		'getInto': _api.getIntoCall,
		'get': _api.getCall,
		'post': _api.postCall,
		'put': _api.putCall,
		'delete': _api.deleteCall
	};
}]);

