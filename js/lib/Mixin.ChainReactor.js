"use strict";
/**
 * The chain reactor mixin, provides a class with chain reaction capabilities.
 * @mixin
 */
var ChainReactor = {
	/**
	 *
	 * @param obj
	 */
	chain: function (obj) {
		this._chain = this._chain || [];
		var index = this._chain.indexOf(obj);

		if (index === -1) {
			this._chain.push(obj);
		}
	},

	unChain: function (obj) {
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

		// Fire our internal handler
		if (!this._chainHandler || (this._chainHandler && !this._chainHandler(chainPacket))) {
			// Propagate the message down the chain
			this.chainSend(chainPacket.type, chainPacket.data, chainPacket.options);
		}
	}
};

module.exports = ChainReactor;