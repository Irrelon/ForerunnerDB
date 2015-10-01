var Core = require('./Core'),
	NodePersist = require('../lib/NodePersist');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;