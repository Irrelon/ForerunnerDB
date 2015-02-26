// Import external names locally
var Shared,
	Collection,
	CollectionInit,
	Overload;

Shared = require('./Shared');
Overload = require('./Overload');

/**
 * The constructor.
 *
 * @constructor
 */
var Highchart = function (collection, options) {
	this.init.apply(this, arguments);
};

Highchart.prototype.init = function (collection, options) {
	this._options = options;
	this._selector = jQuery(this._options.selector);

	if (!this._selector[0]) {
		throw('ForerunnerDB.Highchart "' + collection.name() + '": Chart target element does not exist via selector: ' + this._options.selector);
	}

	this._listeners = {};
	this._collection = collection;

	// Setup the chart
	this._options.series = [];

	// Disable attribution on highcharts
	options.chartOptions = options.chartOptions || {};
	options.chartOptions.credits = false;

	// Set the data for the chart
	var data,
		seriesObj,
		chartData;

	switch (this._options.type) {
		case 'pie':
			// Create chart from data
			this._selector.highcharts(this._options.chartOptions);
			this._chart = this._selector.highcharts();

			// Generate graph data from collection data
			data = this._collection.find();

			seriesObj = {
				allowPointSelect: true,
				cursor: 'pointer',
				dataLabels: {
					enabled: true,
					format: '<b>{point.name}</b>: {y} ({point.percentage:.0f}%)',
					style: {
						color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
					}
				}
			};

			chartData = this.pieDataFromCollectionData(data, this._options.keyField, this._options.valField);

			jQuery.extend(seriesObj, this._options.seriesOptions);

			jQuery.extend(seriesObj, {
				name: this._options.seriesName,
				data: chartData
			});

			this._chart.addSeries(seriesObj, true, true);
			break;

		case 'line':
		case 'area':
		case 'column':
		case 'bar':
			// Generate graph data from collection data
			chartData = this.seriesDataFromCollectionData(
				this._options.seriesField,
				this._options.keyField,
				this._options.valField,
				this._options.orderBy
			);

			this._options.chartOptions.xAxis = chartData.xAxis;
			this._options.chartOptions.series = chartData.series;

			this._selector.highcharts(this._options.chartOptions);
			this._chart = this._selector.highcharts();
			break;

		default:
			throw('ForerunnerDB.Highchart "' + collection.name() + '": Chart type specified is not currently supported by ForerunnerDB: ' + this._options.type);
	}

	// Hook the collection events to auto-update the chart
	this._hookEvents();
};

Shared.addModule('Highchart', Highchart);

Collection = Shared.modules.Collection;
CollectionInit = Collection.prototype.init;

Shared.mixin(Highchart.prototype, 'Mixin.Events');

/**
 * Gets / sets the current state.
 * @param {String=} val The name of the state to set.
 * @returns {*}
 */
Shared.synthesize(Highchart.prototype, 'state');

/**
 * Generate pie-chart series data from the given collection data array.
 * @param data
 * @param keyField
 * @param valField
 * @returns {Array}
 */
Highchart.prototype.pieDataFromCollectionData = function (data, keyField, valField) {
	var graphData = [],
		i;

	for (i = 0; i < data.length; i++) {
		graphData.push([data[i][keyField], data[i][valField]]);
	}

	return graphData;
};

/**
 * Generate line-chart series data from the given collection data array.
 * @param seriesField
 * @param keyField
 * @param valField
 * @param orderBy
 */
Highchart.prototype.seriesDataFromCollectionData = function (seriesField, keyField, valField, orderBy) {
	var data = this._collection.distinct(seriesField),
		seriesData = [],
		xAxis = {
			categories: []
		},
		seriesName,
		query,
		dataSearch,
		seriesValues,
		i, k;

	// What we WANT to output:
	/*series: [{
		name: 'Responses',
		data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6]
	}]*/

	// Loop keys
	for (i = 0; i < data.length; i++) {
		seriesName = data[i];
		query = {};
		query[seriesField] = seriesName;

		seriesValues = [];
		dataSearch = this._collection.find(query, {
			orderBy: orderBy
		});

		// Loop the keySearch data and grab the value for each item
		for (k = 0; k < dataSearch.length; k++) {
			xAxis.categories.push(dataSearch[k][keyField]);
			seriesValues.push(dataSearch[k][valField]);
		}

		seriesData.push({
			name: seriesName,
			data: seriesValues
		});
	}

	return {
		xAxis: xAxis,
		series: seriesData
	};
};

/**
 * Hook the events the chart needs to know about from the internal collection.
 * @private
 */
Highchart.prototype._hookEvents = function () {
	var self = this;

	self._collection.on('change', function () { self._changeListener.apply(self, arguments); });

	// If the collection is dropped, clean up after ourselves
	self._collection.on('drop', function () { self.drop.apply(self, arguments); });
};

/**
 * Handles changes to the collection data that the chart is reading from and then
 * updates the data in the chart display.
 * @private
 */
Highchart.prototype._changeListener = function () {
	var self = this;

	// Update the series data on the chart
	if(typeof self._collection !== 'undefined' && self._chart) {
		var data = self._collection.find(),
			i;

		switch (self._options.type) {
			case 'pie':
				self._chart.series[0].setData(
					self.pieDataFromCollectionData(
						data,
						self._options.keyField,
						self._options.valField
					),
					true,
					true
				);
				break;

			case 'bar':
			case 'line':
			case 'area':
			case 'column':
				var seriesData = self.seriesDataFromCollectionData(
					self._options.seriesField,
					self._options.keyField,
					self._options.valField,
					self._options.orderBy
				);

				self._chart.xAxis[0].setCategories(
					seriesData.xAxis.categories
				);

				for (i = 0; i < seriesData.series.length; i++) {
					if (self._chart.series[i]) {
						// Series exists, set it's data
						self._chart.series[i].setData(
							seriesData.series[i].data,
							true,
							true
						);
					} else {
						// Series data does not yet exist, add a new series
						self._chart.addSeries(
							seriesData.series[i],
							true,
							true
						);
					}
				}
				break;

			default:
				break;
		}
	}
};

/**
 * Destroys the chart and all internal references.
 * @returns {Boolean}
 */
Highchart.prototype.drop = function () {
	if (this._state !== 'dropped') {
		this._state = 'dropped';

		if (this._chart) {
			this._chart.destroy();
		}

		if (this._collection) {
			this._collection.off('change', this._changeListener);
			this._collection.off('drop', this.drop);

			if (this._collection._highcharts) {
				delete this._collection._highcharts[this._options.selector];
			}
		}

		delete this._chart;
		delete this._options;
		delete this._collection;

		this.emit('drop', this);

		return true;
	} else {
		return true;
	}
};

// Extend collection with view init
Collection.prototype.init = function () {
	this._highcharts = {};
	CollectionInit.apply(this, arguments);
};

/**
 * Creates a pie chart from the collection.
 * @type {Overload}
 */
Collection.prototype.pieChart = new Overload({
	/**
	 * Chart via options object.
	 * @param {Object} options The options object.
	 * @returns {*}
	 */
	'object': function (options) {
		options.type = 'pie';

		options.chartOptions = options.chartOptions || {};
		options.chartOptions.chart = options.chartOptions.chart || {};
		options.chartOptions.chart.type = 'pie';

		if (!this._highcharts[options.selector]) {
			// Store new chart in charts array
			this._highcharts[options.selector] = new Highchart(this, options);
		}

		return this._highcharts[options.selector];
	},

	/**
	 * Chart via defined params and an options object.
	 * @param {String|jQuery} selector The element to render the chart to.
	 * @param {String} keyField The field to use as the data key.
	 * @param {String} valField The field to use as the data value.
	 * @param {String} seriesName The name of the series to display on the chart.
	 * @param {Object} options The options object.
	 */
	'*, string, string, string, ...': function (selector, keyField, valField, seriesName, options) {
		options = options || {};

		options.selector = selector;
		options.keyField = keyField;
		options.valField = valField;
		options.seriesName = seriesName;

		// Call the main chart method
		this.pieChart(options);
	}
});

/**
 * Creates a line chart from the collection.
 * @type {Overload}
 */
Collection.prototype.lineChart = new Overload({
	/**
	 * Chart via options object.
	 * @param {Object} options The options object.
	 * @returns {*}
	 */
	'object': function (options) {
		options.type = 'line';

		options.chartOptions = options.chartOptions || {};
		options.chartOptions.chart = options.chartOptions.chart || {};
		options.chartOptions.chart.type = 'line';

		if (!this._highcharts[options.selector]) {
			// Store new chart in charts array
			this._highcharts[options.selector] = new Highchart(this, options);
		}

		return this._highcharts[options.selector];
	},

	/**
	 * Chart via defined params and an options object.
	 * @param {String|jQuery} selector The element to render the chart to.
	 * @param {String} seriesField The name of the series to plot.
	 * @param {String} keyField The field to use as the data key.
	 * @param {String} valField The field to use as the data value.
	 * @param {Object} options The options object.
	 */
	'*, string, string, string, ...': function (selector, seriesField, keyField, valField, options) {
		options = options || {};

		options.seriesField = seriesField;
		options.selector = selector;
		options.keyField = keyField;
		options.valField = valField;

		// Call the main chart method
		this.lineChart(options);
	}
});

/**
 * Creates an area chart from the collection.
 * @type {Overload}
 */
Collection.prototype.areaChart = new Overload({
	/**
	 * Chart via options object.
	 * @param {Object} options The options object.
	 * @returns {*}
	 */
	'object': function (options) {
		options.type = 'area';

		options.chartOptions = options.chartOptions || {};
		options.chartOptions.chart = options.chartOptions.chart || {};
		options.chartOptions.chart.type = 'area';

		if (!this._highcharts[options.selector]) {
			// Store new chart in charts array
			this._highcharts[options.selector] = new Highchart(this, options);
		}

		return this._highcharts[options.selector];
	},

	/**
	 * Chart via defined params and an options object.
	 * @param {String|jQuery} selector The element to render the chart to.
	 * @param {String} seriesField The name of the series to plot.
	 * @param {String} keyField The field to use as the data key.
	 * @param {String} valField The field to use as the data value.
	 * @param {Object} options The options object.
	 */
	'*, string, string, string, ...': function (selector, seriesField, keyField, valField, options) {
		options = options || {};

		options.seriesField = seriesField;
		options.selector = selector;
		options.keyField = keyField;
		options.valField = valField;

		// Call the main chart method
		this.areaChart(options);
	}
});

/**
 * Creates a column chart from the collection.
 * @type {Overload}
 */
Collection.prototype.columnChart = new Overload({
	/**
	 * Chart via options object.
	 * @param {Object} options The options object.
	 * @returns {*}
	 */
	'object': function (options) {
		options.type = 'column';

		options.chartOptions = options.chartOptions || {};
		options.chartOptions.chart = options.chartOptions.chart || {};
		options.chartOptions.chart.type = 'column';

		if (!this._highcharts[options.selector]) {
			// Store new chart in charts array
			this._highcharts[options.selector] = new Highchart(this, options);
		}

		return this._highcharts[options.selector];
	},

	/**
	 * Chart via defined params and an options object.
	 * @param {String|jQuery} selector The element to render the chart to.
	 * @param {String} seriesField The name of the series to plot.
	 * @param {String} keyField The field to use as the data key.
	 * @param {String} valField The field to use as the data value.
	 * @param {Object} options The options object.
	 */
	'*, string, string, string, ...': function (selector, seriesField, keyField, valField, options) {
		options = options || {};

		options.seriesField = seriesField;
		options.selector = selector;
		options.keyField = keyField;
		options.valField = valField;

		// Call the main chart method
		this.columnChart(options);
	}
});

/**
 * Creates a bar chart from the collection.
 * @type {Overload}
 */
Collection.prototype.barChart = new Overload({
	/**
	 * Chart via options object.
	 * @param {Object} options The options object.
	 * @returns {*}
	 */
	'object': function (options) {
		options.type = 'bar';

		options.chartOptions = options.chartOptions || {};
		options.chartOptions.chart = options.chartOptions.chart || {};
		options.chartOptions.chart.type = 'bar';

		if (!this._highcharts[options.selector]) {
			// Store new chart in charts array
			this._highcharts[options.selector] = new Highchart(this, options);
		}

		return this._highcharts[options.selector];
	},

	/**
	 * Chart via defined params and an options object.
	 * @param {String|jQuery} selector The element to render the chart to.
	 * @param {String} seriesField The name of the series to plot.
	 * @param {String} keyField The field to use as the data key.
	 * @param {String} valField The field to use as the data value.
	 * @param {Object} options The options object.
	 */
	'*, string, string, string, ...': function (selector, seriesField, keyField, valField, options) {
		options = options || {};

		options.seriesField = seriesField;
		options.selector = selector;
		options.keyField = keyField;
		options.valField = valField;

		// Call the main chart method
		this.barChart(options);
	}
});

/**
 * Creates a stacked bar chart from the collection.
 * @type {Overload}
 */
Collection.prototype.stackedBarChart = new Overload({
	/**
	 * Chart via options object.
	 * @param {Object} options The options object.
	 * @returns {*}
	 */
	'object': function (options) {
		options.type = 'bar';

		options.chartOptions = options.chartOptions || {};
		options.chartOptions.chart = options.chartOptions.chart || {};
		options.chartOptions.chart.type = 'bar';

		options.plotOptions = options.plotOptions || {};
		options.plotOptions.series = options.plotOptions.series || {};
		options.plotOptions.series.stacking = options.plotOptions.series.stacking || 'normal';

		if (!this._highcharts[options.selector]) {
			// Store new chart in charts array
			this._highcharts[options.selector] = new Highchart(this, options);
		}

		return this._highcharts[options.selector];
	},

	/**
	 * Chart via defined params and an options object.
	 * @param {String|jQuery} selector The element to render the chart to.
	 * @param {String} seriesField The name of the series to plot.
	 * @param {String} keyField The field to use as the data key.
	 * @param {String} valField The field to use as the data value.
	 * @param {Object} options The options object.
	 */
	'*, string, string, string, ...': function (selector, seriesField, keyField, valField, options) {
		options = options || {};

		options.seriesField = seriesField;
		options.selector = selector;
		options.keyField = keyField;
		options.valField = valField;

		// Call the main chart method
		this.stackedBarChart(options);
	}
});

/**
 * Removes a chart from the page by it's selector.
 * @param {String} selector The chart selector.
 */
Collection.prototype.dropChart = function (selector) {
	if (this._highcharts && this._highcharts[selector]) {
		this._highcharts[selector].drop();
	}
};

Shared.finishModule('Highchart');
module.exports = Highchart;