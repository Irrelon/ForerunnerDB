// Import external names locally
var ForerunnerDB = require('../ForerunnerDB'),
	Collection = ForerunnerDB.classes.Collection,
	CollectionInit = Collection.prototype.init,
	Overload = ForerunnerDB.classes.Overload;

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
	this._selector = $(this._options.selector);
	this._listeners = {};
	this._collection = collection;

	// Setup the chart
	this._options.series = [];

	// Set the data for the chart
	var data,
		seriesObj,
		chartData,
		i;

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

			$.extend(seriesObj, this._options.seriesOptions);

			$.extend(seriesObj, {
				type: 'pie',
				name: this._options.seriesName,
				data: chartData
			});

			this._chart.addSeries(seriesObj);
			break;

		case 'line':
			// Generate graph data from collection data
			/*seriesObj = {
				allowPointSelect: true,
				cursor: 'pointer'
			};*/

			chartData = this.lineDataFromCollectionData(
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
	}

	// Hook the collection events to auto-update the chart
	this._hookEvents();
};

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
Highchart.prototype.lineDataFromCollectionData = function (seriesField, keyField, valField, orderBy) {
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

Highchart.prototype._hookEvents = function () {
	var self = this;

	self._collection.on('change', self._changeListener);

	// If the collection is dropped, clean up after ourselves
	self._collection.on('drop', self._dropListener);
};

Highchart.prototype._changeListener = function () {
	var self = this;

	// Update the series data on the chart
	if(typeof self._collection !== 'undefined' && self._chart) {
		var data = self._collection.find();

		switch (self._options.type) {
			case 'pie':
				self._chart.series[0].setData(
					self.pieDataFromCollectionData(
						data,
						self._options.keyField,
						self._options.valField
					)
				);
				break;

			case 'line':
				var lineSeriesData = self.lineDataFromCollectionData(
					self._options.seriesField,
					self._options.keyField,
					self._options.valField,
					self._options.orderBy
				);

				self._chart.xAxis[0].setCategories(
					lineSeriesData.xAxis.categories
				);

				for (var i = 0; i < lineSeriesData.series.length; i++) {
					self._chart.series[i].setData(
						lineSeriesData.series[i].data
					);
				}
				break;
		}
	}
};

Highchart.prototype._dropListener = function () {
	var self = this;

	self._collection.off('change', self._changeListener);
	self._collection.off('drop', self._dropListener);
};

Highchart.prototype.drop = function () {
	this._chart.destroy();

	this._collection.off('change', this._changeListener);
	this._collection.off('drop', this._dropListener);

	delete this._collection._highcharts[this._options.selector];
	delete this._chart;
	delete this._options;
	delete this._collection;

	return this;
};

// Extend collection with view init
Collection.prototype.init = function () {
	this._highcharts = {};
	CollectionInit.apply(this, arguments);
};

Collection.prototype.chart = function (options) {
	if (!this._highcharts[options.selector]) {
		// Store new chart in charts array
		this._highcharts[options.selector] = new Highchart(this, options);
	}

	return this._highcharts[options.selector];
};

Collection.prototype.dropChart = function (selector) {
	if (this._highcharts[selector]) {
		this._highcharts[selector].drop();
	}
};

module.exports = Highchart;