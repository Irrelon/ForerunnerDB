"use strict";

/**
 * The chain reactor mixin, provides methods to the target object that allow chain
 * reaction events to propagate to the target and be handled, processed and passed
 * on down the chain.
 * @mixin
 */
var ChainReactor = {
	/**
	 * Creates a chain link between the current reactor node and the passed
	 * reactor node. Chain packets that are send by this reactor node will
	 * then be propagated to the passed node for subsequent packets.
	 * @param {*} obj The chain reactor node to link to.
	 */
	chain: function (obj) {
		if (this.debug && this.debug()) {
			if (obj._reactorIn && obj._reactorOut) {
				console.log(obj._reactorIn.logIdentifier() + ' Adding target "' + obj._reactorOut.instanceIdentifier() + '" to the chain reactor target list');
			} else {
				console.log(this.logIdentifier() + ' Adding target "' + obj.instanceIdentifier() + '" to the chain reactor target list');
			}
		}

		this._chain = this._chain || [];
		var index = this._chain.indexOf(obj);

		if (index === -1) {
			this._chain.push(obj);
		}
	},

	/**
	 * Removes a chain link between the current reactor node and the passed
	 * reactor node. Chain packets sent from this reactor node will no longer
	 * be received by the passed node.
	 * @param {*} obj The chain reactor node to unlink from.
	 */
	unChain: function (obj) {
		if (this.debug && this.debug()) {
			if (obj._reactorIn && obj._reactorOut) {
				console.log(obj._reactorIn.logIdentifier() + ' Removing target "' + obj._reactorOut.instanceIdentifier() + '" from the chain reactor target list');
			} else {
				console.log(this.logIdentifier() + ' Removing target "' + obj.instanceIdentifier() + '" from the chain reactor target list');
			}
		}

		if (this._chain) {
			var index = this._chain.indexOf(obj);

			if (index > -1) {
				this._chain.splice(index, 1);
			}
		}
	},

	/**
	 * Gets / sets the flag that will enable / disable chain reactor sending
	 * from this instance. Chain reactor sending is enabled by default on all
	 * instances.
	 * @param {Boolean} val True or false to enable or disable chain sending.
	 * @returns {*}
	 */
	chainEnabled: function (val) {
		if (val !== undefined) {
			this._chainDisabled = !val;
			return this;
		}

		return !this._chainDisabled;
	},

	/**
	 * Determines if this chain reactor node has any listeners downstream.
	 * @returns {Boolean} True if there are nodes downstream of this node.
	 */
	chainWillSend: function () {
		return Boolean(this._chain && !this._chainDisabled);
	},

	/**
	 * Sends a chain reactor packet downstream from this node to any of its
	 * chained targets that were linked to this node via a call to chain().
	 * @param {String} type The type of chain reactor packet to send. This
	 * can be any string but the receiving reactor nodes will not react to
	 * it unless they recognise the string. Built-in strings include: "insert",
	 * "update", "remove", "setData" and "debug".
	 * @param {Object} data A data object that usually contains a key called
	 * "dataSet" which is an array of items to work on, and can contain other
	 * custom keys that help describe the operation.
	 * @param {Object=} options An options object. Can also contain custom
	 * key/value pairs that your custom chain reactor code can operate on.
	 */
	chainSend: function (type, data, options) {
		if (this._chain && !this._chainDisabled) {
			var arr = this._chain,
				arrItem,
				count = arr.length,
				index,
				dataCopy = this.decouple(data, count);

			for (index = 0; index < count; index++) {
				arrItem = arr[index];

				if (!arrItem._state || (arrItem._state && !arrItem.isDropped())) {
					if (this.debug && this.debug()) {
						if (arrItem._reactorIn && arrItem._reactorOut) {
							console.log(arrItem._reactorIn.logIdentifier() + ' Sending data down the chain reactor pipe to "' + arrItem._reactorOut.instanceIdentifier() + '"');
						} else {
							console.log(this.logIdentifier() + ' Sending data down the chain reactor pipe to "' + arrItem.instanceIdentifier() + '"');
						}
					}

					if (arrItem.chainReceive) {
						arrItem.chainReceive(this, type, dataCopy[index], options);
					}
				} else {
					console.log('Reactor Data:', type, data, options);
					console.log('Reactor Node:', arrItem);
					throw('Chain reactor attempting to send data to target reactor node that is in a dropped state!');
				}

			}
		}
	},

	/**
	 * Handles receiving a chain reactor message that was sent via the chainSend()
	 * method. Creates the chain packet object and then allows it to be processed.
	 * @param {Object} sender The node that is sending the packet.
	 * @param {String} type The type of packet.
	 * @param {Object} data The data related to the packet.
	 * @param {Object=} options An options object.
	 */
	chainReceive: function (sender, type, data, options) {
		var chainPacket = {
				sender: sender,
				type: type,
				data: data,
				options: options
			},
			cancelPropagate = false;

		if (this.debug && this.debug()) {
			console.log(this.logIdentifier() + ' Received data from parent reactor node');
		}

		// Check if we have a chain handler method
		if (this._chainHandler) {
			// Fire our internal handler
			cancelPropagate = this._chainHandler(chainPacket);
		}

		// Check if we were told to cancel further propagation
		if (!cancelPropagate) {
			// Propagate the message down the chain
			this.chainSend(chainPacket.type, chainPacket.data, chainPacket.options);
		}
	}
};

module.exports = ChainReactor;