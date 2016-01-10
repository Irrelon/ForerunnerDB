"use strict";

var Shared = require('./Shared');

/**
 * Provides chain reactor node linking so that a chain reaction can propagate
 * down a node tree. Effectively creates a chain link between the reactorIn and
 * reactorOut objects where a chain reaction from the reactorIn is passed through
 * the reactorProcess before being passed to the reactorOut object. Reactor
 * packets are only passed through to the reactorOut if the reactor IO method
 * chainSend is used.
 * @param {*} reactorIn An object that has the Mixin.ChainReactor methods mixed
 * in to it. Chain reactions that occur inside this object will be passed through
 * to the reactorOut object.
 * @param {*} reactorOut An object that has the Mixin.ChainReactor methods mixed
 * in to it. Chain reactions that occur in the reactorIn object will be passed
 * through to this object.
 * @param {Function} reactorProcess The processing method to use when chain
 * reactions occur.
 * @constructor
 */
var ReactorIO = function (reactorIn, reactorOut, reactorProcess) {
	if (reactorIn && reactorOut && reactorProcess) {
		this._reactorIn = reactorIn;
		this._reactorOut = reactorOut;
		this._chainHandler = reactorProcess;

		if (!reactorIn.chain) {
			throw('ForerunnerDB.ReactorIO: ReactorIO requires passed in and out objects to implement the ChainReactor mixin!');
		}

		// Register the reactorIO with the input
		reactorIn.chain(this);

		// Register the output with the reactorIO
		this.chain(reactorOut);
	} else {
		throw('ForerunnerDB.ReactorIO: ReactorIO requires in, out and process arguments to instantiate!');
	}
};

Shared.addModule('ReactorIO', ReactorIO);

/**
 * Drop a reactor IO object, breaking the reactor link between the in and out
 * reactor nodes.
 * @returns {boolean}
 */
ReactorIO.prototype.drop = function () {
	if (!this.isDropped()) {
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

		this.emit('drop', this);

		delete this._listeners;
	}

	return true;
};

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(ReactorIO.prototype, 'state');

Shared.mixin(ReactorIO.prototype, 'Mixin.Common');
Shared.mixin(ReactorIO.prototype, 'Mixin.ChainReactor');
Shared.mixin(ReactorIO.prototype, 'Mixin.Events');

Shared.finishModule('ReactorIO');
module.exports = ReactorIO;