"use strict";

var Tags,
	tagMap = {};

/**
 * Provides class instance tagging and tag operation methods.
 * @mixin
 */
Tags = {
	/**
	 * Tags a class instance for later lookup.
	 * @param {String} name The tag to add.
	 * @returns {boolean}
	 */
	tagAdd: function (name) {
		var i,
			self = this,
			mapArr = tagMap[name] = tagMap[name] || [];

		for (i = 0; i < mapArr.length; i++) {
			if (mapArr[i] === self) {
				return true;
			}
		}

		mapArr.push(self);

		// Hook the drop event for this so we can react
		if (self.on) {
			self.on('drop', function () {
				// We've been dropped so remove ourselves from the tag map
				self.tagRemove(name);
			});
		}

		return true;
	},

	/**
	 * Removes a tag from a class instance.
	 * @param {String} name The tag to remove.
	 * @returns {boolean}
	 */
	tagRemove: function (name) {
		var i,
			mapArr = tagMap[name];

		if (mapArr) {
			for (i = 0; i < mapArr.length; i++) {
				if (mapArr[i] === this) {
					mapArr.splice(i, 1);
					return true;
				}
			}
		}

		return false;
	},

	/**
	 * Gets an array of all instances tagged with the passed tag name.
	 * @param {String} name The tag to lookup.
	 * @returns {Array} The array of instances that have the passed tag.
	 */
	tagLookup: function (name) {
		return tagMap[name] || [];
	},

	/**
	 * Drops all instances that are tagged with the passed tag name.
	 * @param {String} name The tag to lookup.
	 * @param {Function} callback Callback once dropping has completed
	 * for all instances that match the passed tag name.
	 * @returns {boolean}
	 */
	tagDrop: function (name, callback) {
		var arr = this.tagLookup(name),
			dropCb,
			dropCount,
			i;

		dropCb = function () {
			dropCount--;

			if (callback && dropCount === 0) {
				callback(false);
			}
		};

		if (arr.length) {
			dropCount = arr.length;

			// Loop the array and drop all items
			for (i = arr.length - 1; i >= 0; i--) {
				arr[i].drop(dropCb);
			}
		}

		return true;
	}
};

module.exports = Tags;