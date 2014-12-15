var Shared = require('./Shared');

var ReactorIO = function (reactorIn, reactorOut, reactorProcess) {
	if (reactorIn && reactorOut && reactorProcess) {
		this._reactorIn = reactorIn;
		this._reactorOut = reactorOut;
		this._chainHandler = reactorProcess;

		if (!reactorIn.chain || !reactorOut.chainReceive) {
			throw('ForerunnerDB.ReactorIO: ReactorIO requires passed in and out objects to implement the ChainReactor mixin!');
		}

		// Register the reactorIO with the input
		reactorIn.chain(this);

		// Register the output with the reactorIO
		this.chain(reactorOut);
	} else {
		throw('ForerunnerDB.ReactorIO: ReactorIO requires an in, out and process argument to instantiate!');
	}
};

Shared.addModule('ReactorIO', ReactorIO);

ReactorIO.prototype.drop = function () {
	this._state = 'dropped';

	// Remove links
	if (this._reactorIn) {
		this._reactorIn.unChain(this);
	}

	if (this._reactorOut) {
		this.unChain(this._reactorOut);
	}

	delete this._reactorIn;
	delete this._reactorOut;
	delete this._chainHandler;
};


Shared.mixin(ReactorIO.prototype, 'Mixin.ChainReactor');

Shared.finishModule('ReactorIO');
module.exports = ReactorIO;