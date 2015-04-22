var Core = require('../lib/Core'),
	Persist = require('../lib/Persist');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;