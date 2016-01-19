var Core = require('./core'),
	CollectionGroup = require('../lib/CollectionGroup'),
	View = require('../lib/View'),
	Document = require('../lib/Document'),
	Overview = require('../lib/Overview'),
	BinaryLog = require('../lib/BinaryLog'),
	NodePersist = require('../lib/NodePersist'),
	NodeApiServer = require('../lib/NodeApiServer');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;