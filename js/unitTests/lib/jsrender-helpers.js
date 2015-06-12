// Define jsRender helper methods
var jsRenderVars = {};
window.jsrenderHelperKvStore = {};

if ($ && $.views) {
	$.views.helpers({
		debug: function () {
			debugger;
		},

		toMoney: function (val) {
			return val.format(2, 3, ',', '.');
		},

		forVal: function (start, num, selected) {
			num = Math.round(Number(num));

			var arr = [],
				obj,
				i;

			for (i = start; i <= num; i++) {
				obj = {
					index: i,
					selected: false
				};

				if (selected === i) {
					obj.selected = true;
				}

				arr.push(obj);
			}

			return arr;
		},

		percentage: function (val, total) {
			return Math.floor((100 / total) * val);
		},

		/**
		 * Converts a date into a string with passed format.
		 */
		dateFormat: function (date, format) {
			return moment(date).format(format);
		},

		isoDateToTs: function (date) {
			return new Date(date).getTime();
		},

		nl2br: function (msg) {
			if (msg) {
				return msg.replace(/\n/ig, '<br />');
			} else {
				return '';
			}
		},

		countText: function (str) {
			return str.length;
		},

		getNewCount: function() {
			return db.collection('feed').count({
				new:true
			});
		},

		newCountIsGreaterThanZero: function() {
			return db.collection('feed').count({ new:true }) > 0;
		},

		data: function (key, value) {
			if (key !== undefined) {
				if (value !== undefined) {
					jsRenderVars[key] = value;
				} else {
					return jsRenderVars[key];
				}
			}
		},

		urlEncode: function (str) {
			if (!str) { return ''; }
			return encodeURIComponent(str);
		},

		urlDecode: function (str) {
			if (!str) { return ''; }
			return window.urlDecode(str);
		},

		strToLower: function (str) {
			if (!str) { return ''; }
			return str.toLowerCase();
		},

		strToUpper: function (str) {
			if (!str) { return ''; }
			return str.toUpperCase();
		},

		/*
		 * To Title Case 2.0.1 – http://individed.com/code/to-title-case/
		 * Copyright © 2008–2012 David Gouch. Licensed under the MIT License.
		 */
		strToTitle: function (str) {
			var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|of|on|or|the|to|vs?\.?|via)$/i;

			return str.replace(/([^\W_]+[^\s-]*) */g, function (match, p1, index, title) {
				if (index > 0 && index + p1.length !== title.length &&
					p1.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
					title.charAt(index - 1).search(/[^\s-]/) < 0) {
					return match.toLowerCase();
				}

				if (p1.substr(1).search(/[A-Z]|\../) > -1) {
					return match;
				}

				return match.charAt(0).toUpperCase() + match.substr(1);
			});
		},

		cleanText: function (str) {
			if (!str) { return ''; }
			return str.replace(/'/g, '');
		},

		limitArray: function (arr, limit) {
			if (arr && arr.length && limit) {
				var newArr = [],
					i, arrCount;

				arrCount = arr.length;

				for (i = 0; i < arrCount && i < limit; i++) {
					newArr.push(arr[i]);
				}

				return newArr;
			} else {
				return arr;
			}
		},

		log: function (obj1) {
			console.log('Log output from jsrender template:');
			console.log(obj1);
		},

		clearUnique: function () {
			window._jsRenderUniqueArr = [];
		},

		unique: function (val) {
			window._jsRenderUniqueArr = window._jsRenderUniqueArr || [];
			if (window._jsRenderUniqueArr.indexOf(val) === -1) {
				window._jsRenderUniqueArr.push(val);
				return true;
			}

			return false;
		},

		getFields: function (object) {
			var key, value,
				fieldsArray = [];

			for (key in object) {
				if (object.hasOwnProperty(key)) {
					value = object[key];

					// For each property/field add an object to the array, with key and value
					fieldsArray.push({
						key: key,
						value: value
					});
				}
			}

			// Return the array, to be rendered using {{for ~fields(object)}}
			return fieldsArray;
		},

		htmlSpecialCharsToString: function (val) {
			return PMI.htmlSpecialCharsToString(val);
		},

		convertUrls: function (msg) {
			if (msg) {
				var hyperlinkExp = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+(?![^\s]*?")([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/ig,
					results,
					replace = [],
					i, imgUrl;

				msg = msg.replace(/\n/ig, '<br />');

				results = msg.match(hyperlinkExp);

				if (results) {
					for (i = 0; i < results.length; i++) {
						if (results[i].search(/www\.youtube\.com\/watch/ig) > -1) {
							// This link is a youtube video, grab the video thumbnail
							var args = results[i].match(/v=(.*?)$/i);
							// Disabled old link code here, new code below embeds video
							//imgUrl = 'http://img.youtube.com/vi/' + args[1] + '/0.jpg';
							//msg = msg.replace(results[i], '<a href="' + results[i] + '" target="_blank" data-app-static="1" class="meta-attachment screenshot"><img class="screenshot-image" src="' + imgUrl + '" width="350" /></a>');

							// Embed video
							msg = msg.replace(results[i], '<iframe width="350" height="263" src="http://www.youtube-nocookie.com/embed/' + args[1] + '" frameborder="0" allowfullscreen></iframe>');
						} else {
							// Commented to turn off STS on hrefs
							//replace[i] = encodeURIComponent(results[i]);
							//msg = msg.replace(results[i], '<a href="' + results[i] + '" target="_blank" data-app-static="1" class="meta-attachment screenshot"><img class="screenshot-image" data-sts-url="' + results[i] + '" data-sts-options="{\'clipH\': 600, \'scaleW\': 350}" width="350" /></a>');
							msg = msg.replace(results[i], '<a href="' + results[i] + '" target="_blank" data-app-static="1">' + decodeURI(results[i]) + '</a>');
						}
					}
				}

				return msg;
			} else {
				return '';
			}
		},

		val: function (obj, path) {
			return (new ForerunnerDB.shared.modules.Path(path)).value(obj)[0];
		},

		kvStore: function (namespace, key, val) {
			if (namespace !== undefined) {
				jsrenderHelperKvStore[namespace] = jsrenderHelperKvStore[namespace] || {};

				if (key !== undefined) {
					if (val !== undefined) {
						jsrenderHelperKvStore[namespace][key] = jsrenderHelperKvStore[namespace][key] || {};
						jsrenderHelperKvStore[namespace][key] = val;

						return val;
					}

					return jsrenderHelperKvStore[namespace][key];
				}
			}
		},
	});
}