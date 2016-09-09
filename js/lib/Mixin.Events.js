"use strict";

var Overload = require('./Overload');

/**
 * Provides event emitter functionality including the methods: on, off, once, emit, deferEmit.
 * @mixin
 * @name Events
 */
var Events = {
	on: new Overload({
		/**
		 * Attach an event listener to the passed event.
		 * @name on
		 * @method Events.on
		 * @param {String} event The name of the event to listen for.
		 * @param {Function} listener The method to call when the event is fired.
		 * @returns {*}
		 */
		'string, function': function (event, listener) {
			this._listeners = this._listeners || {};
			this._listeners[event] = this._listeners[event] || {};
			this._listeners[event]['*'] = this._listeners[event]['*'] || [];
			this._listeners[event]['*'].push(listener);

			return this;
		},

		/**
		 * Attach an event listener to the passed event only if the passed
		 * id matches the document id for the event being fired.
		 * @name on
		 * @method Events.on
		 * @param {String} event The name of the event to listen for.
		 * @param {*} id The document id to match against.
		 * @param {Function} listener The method to call when the event is fired.
		 * @returns {*}
		 */
		'string, *, function': function (event, id, listener) {
			this._listeners = this._listeners || {};
			this._listeners[event] = this._listeners[event] || {};
			this._listeners[event][id] = this._listeners[event][id] || [];
			this._listeners[event][id].push(listener);

			return this;
		}
	}),

	once: new Overload({
		/**
		 * Attach an event listener to the passed event that will be called only once.
		 * @name once
		 * @method Events.once
		 * @param {String} event The name of the event to listen for.
		 * @param {Function} listener The method to call when the event is fired.
		 * @returns {*}
		 */
		'string, function': function (event, listener) {
			var self = this,
				fired = false,
				internalCallback = function () {
					if (!fired) {
						self.off(event, internalCallback);
						listener.apply(self, arguments);
						fired = true;
					}
				};

			return this.on(event, internalCallback);
		},
		
		/**
		 * Attach an event listener to the passed event that will be called only once.
		 * @name once
		 * @method Events.once
		 * @param {String} event The name of the event to listen for.
		 * @param {String} id The document id to match against.
		 * @param {Function} listener The method to call when the event is fired.
		 * @returns {*}
		 */
		'string, *, function': function (event, id, listener) {
			var self = this,
				fired = false,
				internalCallback = function () {
					if (!fired) {
						self.off(event, id, internalCallback);
						listener.apply(self, arguments);
						fired = true;
					}
				};

			return this.on(event, id, internalCallback);
		}
	}),

	off: new Overload({
		/**
		 * Cancels all event listeners for the passed event.
		 * @name off
		 * @method Events.off
		 * @param {String} event The name of the event.
		 * @returns {*}
		 */
		'string': function (event) {
			var self = this;

			if (this._emitting) {
				this._eventRemovalQueue = this._eventRemovalQueue || [];
				this._eventRemovalQueue.push(function () {
					self.off(event);
				});
			} else {
				if (this._listeners && this._listeners[event] && event in this._listeners) {
					delete this._listeners[event];
				}
			}

			return this;
		},
		
		/**
		 * Cancels the event listener for the passed event and listener function.
		 * @name off
		 * @method Events.off
		 * @param {String} event The event to cancel listener for.
		 * @param {Function} listener The event listener function used in the on()
		 * or once() call to cancel.
		 * @returns {*}
		 */
		'string, function': function (event, listener) {
			var self = this,
				arr,
				index;

			if (this._emitting) {
				this._eventRemovalQueue = this._eventRemovalQueue || [];
				this._eventRemovalQueue.push(function () {
					self.off(event, listener);
				});
			} else {
				if (typeof(listener) === 'string') {
					if (this._listeners && this._listeners[event] && this._listeners[event][listener]) {
						delete this._listeners[event][listener];
					}
				} else {
					if (this._listeners && event in this._listeners) {
						arr = this._listeners[event]['*'];
						index = arr.indexOf(listener);

						if (index > -1) {
							arr.splice(index, 1);
						}
					}
				}
			}

			return this;
		},
		
		/**
		 * Cancels an event listener based on an event name, id and listener function.
		 * @name off
		 * @method Events.off
		 * @param {String} event The event to cancel listener for.
		 * @param {String} id The ID of the event to cancel listening for.
		 * @param {Function} listener The event listener function used in the on()
		 * or once() call to cancel.
		 */
		'string, *, function': function (event, id, listener) {
			var self = this;

			if (this._emitting) {
				this._eventRemovalQueue = this._eventRemovalQueue || [];
				this._eventRemovalQueue.push(function () {
					self.off(event, id, listener);
				});
			} else {
				if (this._listeners && event in this._listeners && id in this.listeners[event]) {
					var arr = this._listeners[event][id],
						index = arr.indexOf(listener);

					if (index > -1) {
						arr.splice(index, 1);
					}
				}
			}
		},

		/**
		 * Cancels all listeners for an event based on the passed event name and id.
		 * @name off
		 * @method Events.off
		 * @param {String} event The event name to cancel listeners for.
		 * @param {*} id The ID to cancel all listeners for.
		 */
		'string, *': function (event, id) {
			var self = this;

			if (this._emitting) {
				this._eventRemovalQueue = this._eventRemovalQueue || [];
				this._eventRemovalQueue.push(function () {
					self.off(event, id);
				});
			} else {
				if (this._listeners && event in this._listeners && id in this._listeners[event]) {
					// Kill all listeners for this event id
					delete this._listeners[event][id];
				}
			}
		}
	}),
	
	/**
	 * Emit an event with data.
	 * @name emit
	 * @method Events.emit
	 * @param {String} event The event to emit.
	 * @param {*} data Data to emit with the event.
	 * @returns {*}
	 */
	emit: function (event, data) {
		this._listeners = this._listeners || {};
		this._emitting = true;

		if (event in this._listeners) {
			var arrIndex,
				arrCount,
				tmpFunc,
				arr,
				listenerIdArr,
				listenerIdCount,
				listenerIdIndex;

			// Handle global emit
			if (this._listeners[event]['*']) {
				arr = this._listeners[event]['*'];
				arrCount = arr.length;

				for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
					// Check we have a function to execute
					tmpFunc = arr[arrIndex];

					if (typeof tmpFunc === 'function') {
						tmpFunc.apply(this, Array.prototype.slice.call(arguments, 1));
					}
				}
			}

			// Handle individual emit
			if (data instanceof Array) {
				// Check if the array is an array of objects in the collection
				if (data[0] && data[0][this._primaryKey]) {
					// Loop the array and check for listeners against the primary key
					listenerIdArr = this._listeners[event];
					arrCount = data.length;

					for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
						if (listenerIdArr[data[arrIndex][this._primaryKey]]) {
							// Emit for this id
							listenerIdCount = listenerIdArr[data[arrIndex][this._primaryKey]].length;
							for (listenerIdIndex = 0; listenerIdIndex < listenerIdCount; listenerIdIndex++) {
								tmpFunc = listenerIdArr[data[arrIndex][this._primaryKey]][listenerIdIndex];

								if (typeof tmpFunc === 'function') {
									listenerIdArr[data[arrIndex][this._primaryKey]][listenerIdIndex].apply(this, Array.prototype.slice.call(arguments, 1));
								}
							}
						}
					}
				}
			}
		}

		this._emitting = false;
		this._processRemovalQueue();

		return this;
	},

	/**
	 * If events are cleared with the off() method while the event emitter is
	 * actively processing any events then the off() calls get added to a
	 * queue to be executed after the event emitter is finished. This stops
	 * errors that might occur by potentially modifying the event queue while
	 * the emitter is running through them. This method is called after the
	 * event emitter is finished processing.
	 * @name _processRemovalQueue
	 * @method Events._processRemovalQueue
	 * @private
	 */
	_processRemovalQueue: function () {
		var i;

		if (this._eventRemovalQueue && this._eventRemovalQueue.length) {
			// Execute each removal call
			for (i = 0; i < this._eventRemovalQueue.length; i++) {
				this._eventRemovalQueue[i]();
			}

			// Clear the removal queue
			this._eventRemovalQueue = [];
		}
	},

	/**
	 * Queues an event to be fired. This has automatic de-bouncing so that any
	 * events of the same type that occur within 100 milliseconds of a previous
	 * one will all be wrapped into a single emit rather than emitting tons of
	 * events for lots of chained inserts etc. Only the data from the last
	 * de-bounced event will be emitted.
	 * @name deferEmit
	 * @method Events.deferEmit
	 * @param {String} eventName The name of the event to emit.
	 * @param {*=} data Optional data to emit with the event.
	 */
	deferEmit: function (eventName, data) {
		var self = this,
			args;

		if (!this._noEmitDefer && (!this._db || (this._db && !this._db._noEmitDefer))) {
			args = arguments;

			// Check for an existing timeout
			this._deferTimeout = this._deferTimeout || {};
			if (this._deferTimeout[eventName]) {
				clearTimeout(this._deferTimeout[eventName]);
			}

			// Set a timeout
			this._deferTimeout[eventName] = setTimeout(function () {
				if (self.debug()) {
					console.log(self.logIdentifier() + ' Emitting ' + args[0]);
				}

				self.emit.apply(self, args);
			}, 1);
		} else {
			this.emit.apply(this, arguments);
		}

		return this;
	}
};

module.exports = Events;