"use strict";
var Shared = require('./Shared');

/**
 * The chain reactor mixin, provides methods to the target object that allow chain
 * reaction events to propagate to the target and be handled, processed and passed
 * on down the chain.
 * @mixin
 */
var ChainReactor = {
	/**
	 *
	 * @param obj
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

	chainSend: function (type, data, options) {
		if (this._chain) {
			var arr = this._chain,
				arrItem,
				count = arr.length,
				index;

			for (index = 0; index < count; index++) {
				arrItem = arr[index];

				if (!arrItem._state || (arrItem._state && arrItem._state !== 'dropped')) {
					if (this.debug && this.debug()) {
						if (arrItem._reactorIn && arrItem._reactorOut) {
							console.log(arrItem._reactorIn.logIdentifier() + ' Sending data down the chain reactor pipe to "' + arrItem._reactorOut.instanceIdentifier() + '"');
						} else {
							console.log(this.logIdentifier() + ' Sending data down the chain reactor pipe to "' + arrItem.instanceIdentifier() + '"');
						}
					}

					arrItem.chainReceive(this, type, data, options);
				} else {
					console.log('Reactor Data:', type, data, options);
					console.log('Reactor Node:', arrItem);
					throw('Chain reactor attempting to send data to target reactor node that is in a dropped state!');
				}

			}
		}
	},

	chainReceive: function (sender, type, data, options) {
		var chainPacket = {
			sender: sender,
			type: type,
			data: data,
			options: options
		};

		if (this.debug && this.debug()) {
			console.log(this.logIdentifier() + 'Received data from parent reactor node');
		}

		// Fire our internal handler
		if (!this._chainHandler || (this._chainHandler && !this._chainHandler(chainPacket))) {
			// Propagate the message down the chain
			this.chainSend(chainPacket.type, chainPacket.data, chainPacket.options);
		}
	}
};

module.exports = ChainReactor;