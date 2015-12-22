var Core = require('./core'),
	NodePersist = require('../lib/NodePersist'),
	NodeApiServer = require('../lib/NodeApiServer');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;