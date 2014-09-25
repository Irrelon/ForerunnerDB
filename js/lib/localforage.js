/*
  Extends the Persist Class to support LocalForage instead of localstorage
*/


var Shared = require('./Shared');
// var Core = Shared.modules.Core;
// var Collection = require('./Collection');
// var CollectionDrop = Collection.prototype.drop;
// var CollectionGroup = require('./CollectionGroup');
// var CollectionInit = Collection.prototype.init;
// var Overload = require('./Overload');
// var CoreInit = Core.prototype.init;

// dependencies for extending with localforage support
var localForage = require('localforage');
var Persist = require('./Persist');

var PersistInit = Persist.prototype.init;
var PersistSave = Persist.prototype.save;

Persist.prototype.init = function(){

  if (db.isClient()) {
    if (Storage !== undefined) {
      this.mode('localForage');
    }
  }

};

Persist.prototype.save = function (key, data, callback) {
  var val;

  switch (this.mode()) {
    case 'localStorage':
      if (typeof data === 'object') {
        val = 'json::fdb::' + JSON.stringify(data);
      } else {
        val = 'raw::fdb::' + data;
      }

      try {
        localStorage.setItem(key, val);
      } catch (e) {
        if (callback) { callback(e); }
      }

      if (callback) { callback(false); }
      break;
  }

  if (callback) { callback('No data handler.'); }
};