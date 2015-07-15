(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var Infinilist = _dereq_('../lib/Infinilist');

module.exports = Infinilist;

},{"../lib/Infinilist":2}],2:[function(_dereq_,module,exports){
"use strict";

/**
 * Provides scrolling lists with large data sets to behave in a very
 * performance-optimised fashion by controlling the DOM elements currently
 * on screen to ensure that only the visible elements are rendered and
 * all other elements are simulated by variable height divs at the top
 * and bottom of the scrolling list.
 *
 * This module requires that the AutoBind module is loaded before it
 * will work.
 * @class Infinilist
 * @requires AutoBind
 */

var Shared = window.ForerunnerDB.shared,
	View = Shared.modules.View;

var Infinilist = function (selector, template, options, view) {
	var self = this;

	selector = $(selector);

	self.ignoreScroll = false;
	self.previousScrollTop = 0;
	self.itemHeight = 30;
	self.selector = selector;
	self.template = template;
	self.view = view;
	self.itemTopMargin = $("<div class='il_topMargin'></div>");
	self.itemContainer = $("<div class='il_items'></div>");
	self.itemBottomMargin = $("<div class='il_bottomMargin'></div>");

	selector.append(self.itemTopMargin);
	selector.append(self.itemContainer);
	selector.append(self.itemBottomMargin);

	self.resize();

	view.link(self.itemContainer, template, options);

	selector.on('scroll', function () {
		self.scroll();
	});

	$(window).on('resize', function () {
		self.resize();
	});
};

Shared.addModule('Infinilist', Infinilist);

Infinilist.prototype.resize = function () {
	var self = this;

	// Calculate number of visible items
	self.maxItemCount = Math.ceil(self.selector.height() / self.itemHeight);

	self.skip = 0;
	self.limit = self.maxItemCount + 1;
	self.total = self.view.from().count();

	// Calculate the list height
	self.virtualHeight = self.total * self.itemHeight;

	// Set the bottom margin height
	self.itemBottomMargin.height(self.virtualHeight);

	self.view.queryOptions(self.currentRange());
};

Infinilist.prototype.currentRange = function () {
	return {
		$skip: this.skip,
		$limit: this.limit
	};
};

Infinilist.prototype.scroll = function () {
	var self = this,
		delta,
		skipCount,
		scrollTop = self.selector.scrollTop();

	// Debounce scroll event
	if (!self.ignoreScroll) {
		// Ignore future scroll events
		self.ignoreScroll = true;

		// Get the current scroll position
		delta = scrollTop - self.previousScrollTop;
		self.previousScrollTop = scrollTop;

		// Check if a scroll change occurred
		if (delta !== 0) {
			// Determine the new item range
			skipCount = Math.floor(scrollTop / self.itemHeight);

			self.skip = skipCount;
			self.view.queryOptions(self.currentRange());

			self.itemTopMargin.height(skipCount * self.itemHeight);
			self.itemBottomMargin.height(self.virtualHeight - (skipCount * self.itemHeight));
		}

		// Set a timeout to stop ignoring events
		setTimeout(function () {
			self.ignoreScroll = false;
		}, 16);
	} else {
		if (self.scrollDebouceTimeout) {
			clearTimeout(self.scrollDebouceTimeout);
		}

		self.scrollDebouceTimeout = setTimeout(function () {
			self.scroll(scrollTop);
		}, 16);
	}
};

Infinilist.prototype.drop = function () {
	var self = this;

	// Unlink the view from the dom
	self.view.unlink(self.itemContainer, self.template);

	// Set state to dropped
	self._state = 'dropped';

	// Kill listeners
	self.selector.off('scroll');
	self.selector.off('resize');

	// Remove references
	delete self.ignoreScroll;
	delete self.previousScrollTop;
	delete self.itemHeight;
	delete self.selector;
	delete self.template;
	delete self.view;
	delete self.itemTopMargin;
	delete self.itemContainer;
	delete self.itemBottomMargin;
};

View.prototype.infinilist = function (targetSelector, templateSelector, options) {
	var templateId;

	this._infinilist = this._infinilist || {};

	if (templateSelector && typeof templateSelector === 'object') {
		// Our second argument is an object, let's inspect
		if (templateSelector.template && typeof templateSelector.template === 'string') {
			// The template has been given to us as a string
			templateId = this.objectId(templateSelector.template);
		}
	} else {
		templateId = templateSelector;
	}

	this._infinilist[templateId] = new Infinilist(targetSelector, templateSelector, options, this);
};

View.prototype.unInfinilist = function (targetSelector, templateSelector, options) {
	var templateId;

	this._infinilist = this._infinilist || {};

	if (templateSelector && typeof templateSelector === 'object') {
		// Our second argument is an object, let's inspect
		if (templateSelector.template && typeof templateSelector.template === 'string') {
			// The template has been given to us as a string
			templateId = this.objectId(templateSelector.template);
		}
	} else {
		templateId = templateSelector;
	}

	if (this._infinilist[templateId]) {
		this._infinilist[templateId].drop();
		delete this._infinilist[templateId];

		return true;
	}

	return false;
};

Shared.moduleFinished('AutoBind', function () {
	Shared.finishModule('Infinilist');
});

module.exports = Infinilist;
},{}]},{},[1]);
