"use strict";

// Define jsRender helper methods
var jsRenderVars = {};

if ($ && $.views) {
	$.views.helpers({
		debug: function () {
			debugger;
		},

		JSONStringify: function (data) {
			return JSON.stringify(data);
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

		getFields: function (object, indent, parentId) {
			var key, value, type, expandable, childObj,
				tmpArr, tmpObj,
				fieldsArray = [];

			if (!indent) { indent = 0; }

			if (indent === 0) {
				// Add the parent object
				tmpObj = {
					key: 'Object',
					value: '{' + Object.keys(object).length + ' fields}',
					type: 'object',
					expandable: true,
					expanded: true,
					children: object,
					indent: indent
				};

				return tmpObj;
			}

			for (key in object) {
				if (object.hasOwnProperty(key)) {
					value = object[key];
					type = value !== undefined ? value === null ? 'null' : typeof value : 'undefined';
					expandable = false;
					childObj = undefined;

					if (value && type === 'object') {
						childObj = value;

						if (value instanceof Array) {
							type = 'array';
							value = 'Array [' + value.length + ']';
						} else {
							value = '{' + Object.keys(childObj).length + ' fields}';
						}

						expandable = true;
					}

					// For each property/field add an object to the array, with key and value
					fieldsArray.push({
						key: key,
						value: value,
						type: type,
						expandable: expandable,
						expanded: true,
						children: childObj,
						indent: indent
					});
				}
			}

			if (tmpObj) {
				tmpObj.children = fieldsArray;
				tmpArr = [tmpObj];
				return tmpArr;
			} else {
				// Return the array, to be rendered using {{for ~fields(object)}}
				return fieldsArray;
			}
		}
	});
}