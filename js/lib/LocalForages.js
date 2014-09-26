/*
  Extends the Persist Class to support LocalForage instead of localstorage
*/


var Shared = require('./Shared');

// dependencies for extending with localforage support
var localforage = require('localforage');
var Persist = require('./Persist');

var PersistInit = Persist.prototype.init;
var PersistSave = Persist.prototype.save;
var PersistLoad = Persist.prototype.load;
var PersistDrop = Persist.prototype.drop;

Persist.prototype.init = function(){

  if (db.isClient()) {
    if (Storage !== undefined) {
      this.mode('localForage');
    }
  }

};

Persist.prototype.save = function (key, data, callback) {
  var result;

  switch (this.mode()) {
    case 'localForage':
      result = localforage.setItem(key, data);

      if(callback){ result.then(callback); }
      else { return result; }
      break;
    default:
      return PersistSave.apply(this, arguments);
  }

};

Persist.prototype.load = function (key, callback) {
  var result;

  switch (this.mode()) {
    case 'localForage':
      result = localforage.getItem(key);

      if(callback){ result.then(callback); }
      else { return result; }
      break;
    default:
      return PersistLoad.apply(this, arguments);
  }
  
};

Persist.prototype.drop = function (key, callback) {
  var result;

  switch (this.mode()) {
    case 'localForage':
      result = localforage.removeItem(key);
      
      if(callback){ result.then(callback); }
      else { return result; }
      break;
    default:
      return PersistDrop.apply(this, arguments);
  }
  
};
