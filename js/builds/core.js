var Core = require('../lib/Core'),
	ShimIE8 = require('../lib/Shim.IE8');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;