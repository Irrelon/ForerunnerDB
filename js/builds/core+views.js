var Core = require('./Core'),
	View = require('../lib/View');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;