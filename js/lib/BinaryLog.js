"use strict";

var Shared,
	ReactorIO,
	Collection,
	CollectionInit,
	Db,
	DbInit,
	BinaryLog;

Shared = require('./Shared');

BinaryLog = function () {
	this.init.apply(this, arguments);
};

BinaryLog.prototype.init = function (parent) {
	var self = this;

	self._logCounter = 0;
	self._parent = parent;
	self.size(1000);
};

Shared.addModule('BinaryLog', BinaryLog);
Shared.mixin(BinaryLog.prototype, 'Mixin.Common');
Shared.mixin(BinaryLog.prototype, 'Mixin.ChainReactor');
Shared.mixin(BinaryLog.prototype, 'Mixin.Events');

Collection = Shared.modules.Collection;
Db = Shared.modules.Db;
ReactorIO = Shared.modules.ReactorIO;
CollectionInit = Collection.prototype.init;
DbInit = Db.prototype.init;

Shared.synthesize(BinaryLog.prototype, 'name');
Shared.synthesize(BinaryLog.prototype, 'size');

BinaryLog.prototype.attachIO = function () {
	var self = this;

	if (!self._io) {
		self._log = new Collection(self._parent.name() + '-BinaryLog', {capped: true, size: self.size()});

		// Override the log collection's id generator so it is linear
		self._log.objectId = function (id) {
			if (!id) {
				id = ++self._logCounter;
			}

			return id;
		};

		self._io = new ReactorIO(self._parent, self, function (chainPacket) {
			self._log.insert({
				type: chainPacket.type,
				data: chainPacket.data
			});

			// Returning false informs the chain reactor to continue propagation
			// of the chain packet down the graph tree
			return false;
		});
	}
};

BinaryLog.prototype.detachIO = function () {
	var self = this;

	if (self._io) {
		self._log.drop();
		self._io.drop();

		delete self._log;
		delete self._io;
	}
};

Collection.prototype.init = function () {
	CollectionInit.apply(this, arguments);
	this._binaryLog = new BinaryLog(this);
};

Shared.finishModule('BinaryLog');
module.exports = BinaryLog;