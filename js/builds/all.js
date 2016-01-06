var Core = require('./core'),
	CollectionGroup = require('../lib/CollectionGroup'),
	View = require('../lib/View'),
	Highchart = require('../lib/Highchart'),
	Persist = require('../lib/Persist'),
	Document = require('../lib/Document'),
	Overview = require('../lib/Overview'),
	Grid = require('../lib/Grid'),
	NodeApiClient = require('../lib/NodeApiClient'),
	BinaryLog = require('../lib/BinaryLog');

if (typeof window !== 'undefined') {
	window.ForerunnerDB = Core;
}

module.exports = Core;