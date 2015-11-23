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
				self.tagRemove(self);
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
	 * @param {boolean} dropStorage Drop persistent storage as well.
	 * @returns {boolean}
	 */
	tagDrop: function (name, dropStorage) {
		var arr = this.tagLookup(name),
			i;

		if (arr.length) {
			// Loop the array and drop all items
			for (i = 0; i < arr.length; i++) {
				arr[i].drop(dropStorage);
			}
		}

		return true;
	}
};

module.exports = Tags;