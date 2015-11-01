var Core = require('./core'),
	Persist = require('../lib/Persist');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;