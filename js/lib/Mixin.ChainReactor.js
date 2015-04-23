"use strict";
// TODO: Document the methods in this mixin
var ChainReactor = {
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
				count = arr.length,
				index;

			for (index = 0; index < count; index++) {
				arr[index].chainReceive(this, type, data, options);
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