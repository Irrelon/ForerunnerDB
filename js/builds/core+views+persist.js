var Core = require('./core'),
	View = require('../lib/View'),
	Persist = require('../lib/Persist');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;