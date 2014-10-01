var Shared = require('./Shared');

var ReactorIO = function (reactorIn, reactorOut, reactorProcess) {
	if (reactorIn && reactorOut && reactorProcess) {
		this._reactorIn = reactorIn;
		this._reactorOut = reactorOut;
		this._chainHandler = reactorProcess;

		if (!reactorIn.chain || !reactorOut.chainReceive) {
			throw('ReactorIO requires passed in and out objects to implement the ChainReactor mixin!');
		}

		// Register the reactorIO with the input
		reactorIn.chain(this);

		// Register the output with the reactorIO
		this.chain(reactorOut);
	} else {
		throw('ReactorIO requires an in, out and process argument to instantiate!');
	}
};

ReactorIO.prototype.drop = function () {
	// Remove links
	this._reactorIn.unChain(this);
	this.unChain(this._reactorOut);

	delete this._reactorIn;
	delete this._reactorOut;
	delete this._chainHandler;
};

Shared.addModule('ReactorIO', ReactorIO);
Shared.inherit(ReactorIO.prototype, Shared.chainReactor);

module.exports = ReactorIO;