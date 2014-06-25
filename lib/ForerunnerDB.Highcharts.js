(function () {
	var init = (function (ForerunnerDB) {
		// Import external names locally
		var Collection = ForerunnerDB.classes.Collection,
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
			this._selector.highcharts(this._options.chartOptions);
			this._chart = this._selector.highcharts();

			// Query the collection for the chart data
			var data = this._collection.find();

			// Set the data for the chart
			switch (this._options.type) {
				case 'pie':
					// Generate graph data from collection data
					var seriesObj = {
							allowPointSelect: true,
							cursor: 'pointer',
							dataLabels: {
								enabled: true,
								format: '<b>{point.name}</b>: {y} ({point.percentage:.0f}%)',
								style: {
									color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
								}
							}
						},
						chartData = this.pieDataFromCollectionData(data, this._options.keyField, this._options.valField);

					$.extend(seriesObj, this._options.seriesOptions);

					$.extend(seriesObj, {
						type: 'pie',
						name: this._options.seriesName,
						data: chartData
					});

					this._chart.addSeries(seriesObj);
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

		Highchart.prototype._hookEvents = function () {
			var self = this;
			this._collection.on('change', function () {
				// Update the series data on the chart
				var data = self._collection.find();

				self._chart.series[0].setData(
					self.pieDataFromCollectionData(
						data,
						self._options.keyField,
						self._options.valField
					)
				);
			});

			// If the collection is dropped, clean up after ourselves
			this._collection.on('drop', this._dropListener);
		};

		Highchart.prototype._changeListener = function () {};

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

		ForerunnerDB.classes.Highchart = Highchart;
	});

	if (typeof(define) === 'function' && define.amd) {
		// Use AMD
		define(['require', '../ForerunnerDB'], function (require, ForerunnerDB) {
			return init(ForerunnerDB);
		});
	} else {
		// Use global
		init(ForerunnerDB);
	}
})();