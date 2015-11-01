var Core = require('./core'),
	NodePersist = require('../lib/NodePersist');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;