var Core = require('../lib/Core'),
	CollectionGroup = require('../lib/CollectionGroup'),
	View = require('../lib/View'),
	OldView = require('../lib/OldView'),
	OldViewBind = require('../lib/OldView.Bind'),
	Highcharts = require('../lib/Highcharts'),
	Persist = require('../lib/Persist'),
	jsviews = require('../lib/vendor/jsviews');

module.exports = Core;
window['ForerunnerDB'] = Core;