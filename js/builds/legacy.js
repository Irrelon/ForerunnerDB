var Core = require('../lib/Core'),
	CollectionGroup = require('../lib/CollectionGroup'),
	View = require('../lib/View'),
	Highchart = require('../lib/Highchart'),
	Persist = require('../lib/Persist'),
	Document = require('../lib/Document'),
	Overview = require('../lib/Overview'),
	OldView = require('../lib/OldView'),
	OldViewBind = require('../lib/OldView.Bind'),
	Grid = require('../lib/Grid');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}
module.exports = Core;