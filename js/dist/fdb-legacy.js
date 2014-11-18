!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.ForerunnerDB=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var Core=_dereq_("../lib/Core"),CollectionGroup=_dereq_("../lib/CollectionGroup"),View=_dereq_("../lib/View"),OldView=_dereq_("../lib/OldView"),OldViewBind=_dereq_("../lib/OldView.Bind"),Highchart=_dereq_("../lib/Highchart"),Persist=_dereq_("../lib/Persist"),Document=_dereq_("../lib/Document"),Overview=_dereq_("../lib/Overview");module.exports=Core;
},{"../lib/CollectionGroup":4,"../lib/Core":5,"../lib/Document":7,"../lib/Highchart":8,"../lib/OldView":17,"../lib/OldView.Bind":16,"../lib/Overview":20,"../lib/Persist":22,"../lib/View":25}],2:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),Path=_dereq_("./Path"),ActiveBucket=function(t){var e;this._primaryKey="_id",this._keyArr=[],this._data=[],this._objLookup={},this._count=0;for(e in t)t.hasOwnProperty(e)&&this._keyArr.push({key:e,dir:t[e]})};Shared.addModule("ActiveBucket",ActiveBucket),Shared.synthesize(ActiveBucket.prototype,"primaryKey"),ActiveBucket.prototype.qs=function(t,e,r,i){if(!e.length)return 0;for(var o,s,c,n=-1,u=0,h=e.length-1;h>=u&&(o=Math.floor((u+h)/2),n!==o);)s=e[o],void 0!==s&&(c=i(this,t,r,s),c>0&&(u=o+1),0>c&&(h=o-1)),n=o;return c>0?o+1:o},ActiveBucket.prototype._sortFunc=function(t,e,r,i){var o,s,c,n=r.split(".:."),u=i.split(".:."),h=t._keyArr,a=h.length;for(o=0;a>o;o++)if(s=h[o],c=typeof e[s.key],"number"===c&&(n[o]=Number(n[o]),u[o]=Number(u[o])),n[o]!==u[o]){if(1===s.dir)return t.sortAsc(n[o],u[o]);if(-1===s.dir)return t.sortDesc(n[o],u[o])}},ActiveBucket.prototype.insert=function(t){var e,r;return e=this.documentKey(t),r=this._data.indexOf(e),-1===r?(r=this.qs(t,this._data,e,this._sortFunc),this._data.splice(r,0,e)):this._data.splice(r,0,e),this._objLookup[t[this._primaryKey]]=e,this._count++,r},ActiveBucket.prototype.remove=function(t){var e,r;return e=this._objLookup[t[this._primaryKey]],e?(r=this._data.indexOf(e),r>-1?(this._data.splice(r,1),delete this._objLookup[t[this._primaryKey]],this._count--,!0):!1):!1},ActiveBucket.prototype.index=function(t){var e,r;return e=this.documentKey(t),r=this._data.indexOf(e),-1===r&&(r=this.qs(t,this._data,e,this._sortFunc)),r},ActiveBucket.prototype.documentKey=function(t){var e,r,i="",o=this._keyArr,s=o.length;for(e=0;s>e;e++)r=o[e],i&&(i+=".:."),i+=t[r.key];return i+=".:."+t[this._primaryKey]},ActiveBucket.prototype.count=function(){return this._count},ActiveBucket.prototype.sortAsc=function(t,e){return"string"==typeof t&&"string"==typeof e?t.localeCompare(e):t>e?1:e>t?-1:0},ActiveBucket.prototype.sortDesc=function(t,e){return"string"==typeof t&&"string"==typeof e?e.localeCompare(t):t>e?-1:e>t?1:0},Shared.finishModule("ActiveBucket"),module.exports=ActiveBucket;
},{"./Path":21,"./Shared":24}],3:[function(_dereq_,module,exports){
var Shared,Core,Metrics,KeyValueStore,Path,Index,Crc;Shared=_dereq_("./Shared");var Collection=function(){this.init.apply(this,arguments)};Collection.prototype.init=function(e){this._primaryKey="_id",this._primaryIndex=new KeyValueStore("primary"),this._primaryCrc=new KeyValueStore("primaryCrc"),this._crcLookup=new KeyValueStore("crcLookup"),this._name=e,this._data=[],this._groups=[],this._metrics=new Metrics,this._deferQueue={insert:[],update:[],remove:[],upsert:[]},this._deferThreshold={insert:100,update:100,remove:100,upsert:100},this._deferTime={insert:1,update:1,remove:1,upsert:1},this._subsetOf(this)},Shared.addModule("Collection",Collection),Shared.mixin(Collection.prototype,"Mixin.Common"),Shared.mixin(Collection.prototype,"Mixin.Events"),Shared.mixin(Collection.prototype,"Mixin.ChainReactor"),Shared.mixin(Collection.prototype,"Mixin.CRUD"),Metrics=_dereq_("./Metrics"),KeyValueStore=_dereq_("./KeyValueStore"),Path=_dereq_("./Path"),Index=_dereq_("./Index"),Crc=_dereq_("./Crc"),Core=Shared.modules.Core,Collection.prototype.crc=Crc,Shared.synthesize(Collection.prototype,"name"),Collection.prototype.data=function(){return this._data},Collection.prototype.drop=function(){if(this._db&&this._db._collection&&this._name){this.debug()&&console.log("Dropping collection "+this._name),this.emit("drop"),delete this._db._collection[this._name];var e,t=[];for(e=0;e<this._groups.length;e++)t.push(this._groups[e]);for(e=0;e<t.length;e++)this._groups[e].removeCollection(this);return!0}return!1},Collection.prototype.primaryKey=function(e){return void 0!==e?(this._primaryKey!==e&&(this._primaryKey=e,this._primaryIndex.primaryKey(e),this.rebuildPrimaryKeyIndex()),this):this._primaryKey},Collection.prototype._onInsert=function(e,t){this.emit("insert",e,t)},Collection.prototype._onUpdate=function(e){this.emit("update",e)},Collection.prototype._onRemove=function(e){this.emit("remove",e)},Shared.synthesize(Collection.prototype,"db"),Collection.prototype.setData=function(e,t,i){if(e){var n=this._metrics.create("setData");n.start(),t=this.options(t),this.preSetData(e,t,i),t.$decouple&&(e=this.decouple(e)),e instanceof Array||(e=[e]),n.time("transformIn"),e=this.transformIn(e),n.time("transformIn");var r=[].concat(this._data);this._dataReplace(e),n.time("Rebuild Primary Key Index"),this.rebuildPrimaryKeyIndex(t),n.time("Rebuild Primary Key Index"),n.time("Resolve chains"),this.chainSend("setData",e,{oldData:r}),n.time("Resolve chains"),n.stop(),this.emit("setData",this._data,r)}return i&&i(!1),this},Collection.prototype.rebuildPrimaryKeyIndex=function(e){var t,i,n,r,o=e&&void 0!==e.$ensureKeys?e.$ensureKeys:!0,a=e&&void 0!==e.$violationCheck?e.$violationCheck:!0,s=this._primaryIndex,h=this._primaryCrc,l=this._crcLookup,u=this._primaryKey;for(s.truncate(),h.truncate(),l.truncate(),t=this._data,i=t.length;i--;){if(n=t[i],o&&this.ensurePrimaryKey(n),a){if(!s.uniqueSet(n[u],n))throw"Call to setData failed because your data violates the primary key unique constraint. One or more documents are using the same primary key: "+n[this._primaryKey]}else s.set(n[u],n);r=JSON.stringify(n),h.set(n[u],r),l.set(r,n)}},Collection.prototype.ensurePrimaryKey=function(e){void 0===e[this._primaryKey]&&(e[this._primaryKey]=this.objectId())},Collection.prototype.truncate=function(){return this.emit("truncate",this._data),this._data.length=0,this.deferEmit("change",{type:"truncate"}),this},Collection.prototype.upsert=function(e,t){if(e){var i,n,r=this._deferQueue.upsert,o=this._deferThreshold.upsert,a={};if(e instanceof Array){if(e.length>o)return this._deferQueue.upsert=r.concat(e),this.processQueue("upsert",t),{};for(a=[],n=0;n<e.length;n++)a.push(this.upsert(e[n]));return t&&t(),a}switch(e[this._primaryKey]?(i={},i[this._primaryKey]=e[this._primaryKey],a.op=this._primaryIndex.lookup(i)[0]?"update":"insert"):a.op="insert",a.op){case"insert":a.result=this.insert(e);break;case"update":a.result=this.update(i,e)}return a}return t&&t(),{}},Collection.prototype.update=function(e,t,i){t=this.decouple(t),t=this.transformIn(t),this.debug()&&console.log('Updating some collection data for collection "'+this.name()+'"');var n,r,o=this,a=this._metrics.create("update"),s=this._primaryKey,h=function(n){if(t&&void 0!==t[s]&&t[s]!=n[s]){o._removeIndex(n);var r=o.updateObject(n,t,e,i,"");if(o._insertIndex(n))return r;throw"Primary key violation in update! Key violated: "+n[s]}return o.updateObject(n,t,e,i,"")};return a.start(),a.time("Retrieve documents to update"),n=this.find(e,{$decouple:!1}),a.time("Retrieve documents to update"),n.length&&(a.time("Update documents"),r=n.filter(h),a.time("Update documents"),r.length&&(a.time("Resolve chains"),this.chainSend("update",{query:e,update:t,dataSet:n},i),a.time("Resolve chains"),this._onUpdate(r),this.deferEmit("change",{type:"update",data:r}))),a.stop(),r||[]},Collection.prototype.updateById=function(e,t){var i={};return i[this._primaryKey]=e,this.update(i,t)},Collection.prototype.updateObject=function(e,t,i,n,r,o){t=this.decouple(t),r=r||"","."===r.substr(0,1)&&(r=r.substr(1,r.length-1));var a,s,h,l,u,c,p,d,f,y=!1,m=!1;for(d in t)if(t.hasOwnProperty(d)){if(a=!1,"$"===d.substr(0,1))switch(d){case"$index":a=!0;break;default:a=!0,m=this.updateObject(e,t[d],i,n,r,d),y=y||m}if(this._isPositionalKey(d)&&(a=!0,d=d.substr(0,d.length-2),u=new Path(r+"."+d),e[d]&&e[d]instanceof Array&&e[d].length)){for(s=[],h=0;h<e[d].length;h++)this._match(e[d][h],u.value(i)[0])&&s.push(h);for(h=0;h<s.length;h++)m=this.updateObject(e[d][s[h]],t[d+".$"],i,n,r+"."+d,o),y=y||m}if(!a)if(o||"object"!=typeof t[d])switch(o){case"$inc":this._updateIncrement(e,d,t[d]),y=!0;break;case"$push":if(void 0===e[d]&&(e[d]=[]),!(e[d]instanceof Array))throw"Cannot push to a key that is not an array! ("+d+")";if(void 0!==t[d].$position&&t[d].$each instanceof Array)for($=t[d].$position,l=t[d].$each.length,h=0;l>h;h++)this._updateSplicePush(e[d],$+h,t[d].$each[h]);else if(t[d].$each instanceof Array)for(l=t[d].$each.length,h=0;l>h;h++)this._updatePush(e[d],t[d].$each[h]);else this._updatePush(e[d],t[d]);y=!0;break;case"$pull":if(e[d]instanceof Array){for(s=[],h=0;h<e[d].length;h++)this._match(e[d][h],t[d])&&s.push(h);for(l=s.length;l--;)this._updatePull(e[d],s[l]),y=!0}break;case"$pullAll":if(e[d]instanceof Array){if(!(t[d]instanceof Array))throw"Cannot pullAll without being given an array of values to pull! ("+d+")";if(s=e[d],l=s.length,l>0)for(;l--;){for($=0;$<t[d].length;$++)s[l]===t[d][$]&&(this._updatePull(e[d],l),l--,y=!0);if(0>l)break}}break;case"$addToSet":if(void 0===e[d]&&(e[d]=[]),!(e[d]instanceof Array))throw"Cannot addToSet on a key that is not an array! ("+f+")!";var _,g,v,C,b=e[d],x=b.length,k=!0,I=n&&n.$addToSet;for(I&&I.key?(v=!1,C=new Path(I.key),g=C.value(t[d])[0]):(g=JSON.stringify(t[d]),v=!0),_=0;x>_;_++)if(v){if(JSON.stringify(b[_])===g){k=!1;break}}else if(g===C.value(b[_])[0]){k=!1;break}k&&(this._updatePush(e[d],t[d]),y=!0);break;case"$splicePush":if(void 0===e[d]&&(e[d]=[]),!(e[d]instanceof Array))throw"Cannot splicePush with a key that is not an array! ("+d+")";var $=t.$index;if(void 0===$)throw"Cannot splicePush without a $index integer value!";delete t.$index,$>e[d].length&&($=e[d].length),this._updateSplicePush(e[d],$,t[d]),y=!0;break;case"$move":if(!(e[d]instanceof Array))throw"Cannot move on a key that is not an array! ("+d+")";for(h=0;h<e[d].length;h++)if(this._match(e[d][h],t[d])){var K=t.$index;if(void 0===K)throw"Cannot move without a $index integer value!";delete t.$index,this._updateSpliceMove(e[d],h,K),y=!0;break}break;case"$mul":this._updateMultiply(e,d,t[d]),y=!0;break;case"$rename":this._updateRename(e,d,t[d]),y=!0;break;case"$unset":this._updateUnset(e,d),y=!0;break;case"$pop":if(!(e[d]instanceof Array))throw"Cannot pop from a key that is not an array! ("+d+")";this._updatePop(e[d],t[d])&&(y=!0);break;default:e[d]!==t[d]&&(this._updateProperty(e,d,t[d]),y=!0)}else if(null!==e[d]&&"object"==typeof e[d])if(c=e[d]instanceof Array,p=t[d]instanceof Array,c||p)if(!p&&c)for(h=0;h<e[d].length;h++)m=this.updateObject(e[d][h],t[d],i,n,r+"."+d,o),y=y||m;else e[d]!==t[d]&&(this._updateProperty(e,d,t[d]),y=!0);else m=this.updateObject(e[d],t[d],i,n,r+"."+d,o),y=y||m;else e[d]!==t[d]&&(this._updateProperty(e,d,t[d]),y=!0)}return y},Collection.prototype._isPositionalKey=function(e){return".$"===e.substr(e.length-2,2)},Collection.prototype._updateProperty=function(e,t,i){e[t]=i,this.debug()&&console.log('ForerunnerDB.Collection: Setting non-data-bound document property "'+t+'" for collection "'+this.name()+'"')},Collection.prototype._updateIncrement=function(e,t,i){e[t]+=i},Collection.prototype._updateSpliceMove=function(e,t,i){e.splice(i,0,e.splice(t,1)[0]),this.debug()&&console.log('ForerunnerDB.Collection: Moving non-data-bound document array index from "'+t+'" to "'+i+'" for collection "'+this.name()+'"')},Collection.prototype._updateSplicePush=function(e,t,i){e.length>t?e.splice(t,0,i):e.push(i)},Collection.prototype._updatePush=function(e,t){e.push(t)},Collection.prototype._updatePull=function(e,t){e.splice(t,1)},Collection.prototype._updateMultiply=function(e,t,i){e[t]*=i},Collection.prototype._updateRename=function(e,t,i){e[i]=e[t],delete e[t]},Collection.prototype._updateUnset=function(e,t){delete e[t]},Collection.prototype._updatePop=function(e,t){var i=!1;return e.length>0&&(1===t?(e.pop(),i=!0):-1===t&&(e.shift(),i=!0)),i},Collection.prototype.remove=function(e,t){var i,n,r,o,a;if(e instanceof Array){for(a=[],o=0;o<e.length;o++)a.push(this.remove(e[o],{noEmit:!0}));return(!t||t&&!t.noEmit)&&this._onRemove(a),a}if(i=this.find(e,{$decouple:!1}),i.length){for(var s=0;s<i.length;s++)r=i[s],this._removeIndex(r),n=this._data.indexOf(r),this._dataRemoveIndex(n);this.chainSend("remove",{query:e,dataSet:i},t),(!t||t&&!t.noEmit)&&this._onRemove(i),this.deferEmit("change",{type:"remove",data:i})}return i},Collection.prototype.removeById=function(e){var t={};return t[this._primaryKey]=e,this.remove(t)},Collection.prototype.deferEmit=function(){var e,t=this;this._noEmitDefer||this._db&&(!this._db||this._db._noEmitDefer)?this.emit.apply(this,arguments):(e=arguments,this._changeTimeout&&clearTimeout(this._changeTimeout),this._changeTimeout=setTimeout(function(){t.debug()&&console.log("ForerunnerDB.Collection: Emitting "+e[0]),t.emit.apply(t,e)},100))},Collection.prototype.processQueue=function(e,t){var i=this._deferQueue[e],n=this._deferThreshold[e],r=this._deferTime[e];if(i.length){var o,a=this;i.length&&(o=i.length>n?i.splice(0,n):i.splice(0,i.length),this[e](o)),setTimeout(function(){a.processQueue(e,t)},r)}else t&&t()},Collection.prototype.insert=function(e,t,i){return"function"==typeof t?(i=t,t=this._data.length):void 0===t&&(t=this._data.length),e=this.transformIn(e),this._insertHandle(e,t,i)},Collection.prototype._insertHandle=function(e,t,i){var n,r,o=this._deferQueue.insert,a=this._deferThreshold.insert,s=(this._deferTime.insert,[]),h=[];if(e instanceof Array){if(e.length>a)return this._deferQueue.insert=o.concat(e),void this.processQueue("insert",i);for(r=0;r<e.length;r++)n=this._insert(e[r],t+r),n===!0?s.push(e[r]):h.push({doc:e[r],reason:n})}else n=this._insert(e,t),n===!0?s.push(e):h.push({doc:e,reason:n});return this.chainSend("insert",e,{index:t}),this._onInsert(s,h),i&&i(),this.deferEmit("change",{type:"insert",data:s}),{inserted:s,failed:h}},Collection.prototype._insert=function(e,t){if(e){var i;return this.ensurePrimaryKey(e),i=this.insertIndexViolation(e),i?"Index violation in index: "+i:(this._insertIndex(e),t>this._data.length&&(t=this._data.length),this._dataInsertIndex(t,e),!0)}return"No document passed to insert"},Collection.prototype._dataInsertIndex=function(e,t){this._data.splice(e,0,t)},Collection.prototype._dataRemoveIndex=function(e){this._data.splice(e,1)},Collection.prototype._dataReplace=function(e){for(;this._data.length;)this._data.pop();this._data=this._data.concat(e)},Collection.prototype._insertIndex=function(e){var t,i,n=this._indexByName,r=JSON.stringify(e);i=this._primaryIndex.uniqueSet(e[this._primaryKey],e),this._primaryCrc.uniqueSet(e[this._primaryKey],r),this._crcLookup.uniqueSet(r,e);for(t in n)n.hasOwnProperty(t)&&n[t].insert(e);return i},Collection.prototype._removeIndex=function(e){var t,i=this._indexByName,n=JSON.stringify(e);this._primaryIndex.unSet(e[this._primaryKey]),this._primaryCrc.unSet(e[this._primaryKey]),this._crcLookup.unSet(n);for(t in i)i.hasOwnProperty(t)&&i[t].remove(e)},Collection.prototype.subset=function(e,t){var i=this.find(e,t);return(new Collection)._subsetOf(this).primaryKey(this._primaryKey).setData(i)},Collection.prototype.subsetOf=function(){return this.__subsetOf},Collection.prototype._subsetOf=function(e){return this.__subsetOf=e,this},Collection.prototype.distinct=function(e,t,i){var n,r,o=this.find(t,i),a=new Path(e),s={},h=[];for(r=0;r<o.length;r++)n=a.value(o[r])[0],n&&!s[n]&&(s[n]=!0,h.push(n));return h},Collection.prototype.findById=function(e,t){var i={};return i[this._primaryKey]=e,this.find(i,t)[0]},Collection.prototype.peek=function(e,t){var i,n,r=this._data,o=r.length,a=new Collection,s=typeof e;if("string"===s){for(i=0;o>i;i++)n=JSON.stringify(r[i]),n.indexOf(e)>-1&&a.insert(r[i]);return a.find({},t)}return this.find(e,t)},Collection.prototype.explain=function(e,t){var i=this.find(e,t);return i.__fdbOp._data},Collection.prototype.options=function(e){return e=e||{},e.$decouple=void 0!==e.$decouple?e.$decouple:!0,e.$explain=void 0!==e.$explain?e.$explain:!1,e},Collection.prototype.find=function(e,t){e=e||{},t=this.options(t);var i,n,r,o,a,s,h,l,u,c,p,d,f,y,m,_,g,v,C,b=this._metrics.create("find"),x=this,k=!0,I={},$=[],K=function(t){return x._match(t,e,"and")};if(b.start(),e){if(b.time("analyseQuery"),i=this._analyseQuery(e,t,b),b.time("analyseQuery"),b.data("analysis",i),i.hasJoin&&i.queriesJoin){for(b.time("joinReferences"),a=0;a<i.joinsOn.length;a++)l=i.joinsOn[a],h=new Path(i.joinQueries[l]),s=h.value(e)[0],I[i.joinsOn[a]]=this._db.collection(i.joinsOn[a]).subset(s);b.time("joinReferences")}if(i.indexMatch.length&&(!t||t&&!t.$skipIndex)?(b.data("index.potential",i.indexMatch),b.data("index.used",i.indexMatch[0].index),b.time("indexLookup"),r=i.indexMatch[0].lookup,b.time("indexLookup"),i.indexMatch[0].keyData.totalKeyCount===i.indexMatch[0].keyData.matchedKeyCount&&(k=!1)):b.flag("usedIndex",!1),k&&(r&&r.length?(n=r.length,b.time("tableScan: "+n),r=r.filter(K)):(n=this._data.length,b.time("tableScan: "+n),r=this._data.filter(K)),t.$orderBy&&(b.time("sort"),r=this.sort(t.$orderBy,r),b.time("sort")),b.time("tableScan: "+n)),t.limit&&r&&r.length>t.limit&&(r.length=t.limit,b.data("limit",t.limit)),t.$decouple&&(b.time("decouple"),r=this.decouple(r),b.time("decouple"),b.data("flag.decouple",!0)),t.join){for(o=0;o<t.join.length;o++)for(l in t.join[o])if(t.join[o].hasOwnProperty(l))for(_=l,u=this._db.collection(l),c=t.join[o][l],g=0;g<r.length;g++){d={},f=!1,y=!1;for(p in c)if(c.hasOwnProperty(p))if("$"===p.substr(0,1))switch(p){case"$as":_=c[p];break;case"$multi":f=c[p];break;case"$require":y=c[p];break;default:"$$."===p.substr(0,3)}else d[p]=new Path(c[p]).value(r[g])[0];m=u.find(d),!y||y&&m[0]?r[g][_]=f===!1?m[0]:m:$.push(r[g])}b.data("flag.join",!0)}if($.length){for(b.time("removalQueue"),C=0;C<$.length;C++)v=r.indexOf($[C]),v>-1&&r.splice(v,1);b.time("removalQueue")}if(t.transform){for(b.time("transform"),C=0;C<r.length;C++)r.splice(C,1,t.transform(r[C]));b.time("transform"),b.data("flag.transform",!0)}return this._transformEnabled&&this._transformOut&&(b.time("transformOut"),r=this.transformOut(r),b.time("transformOut")),b.data("results",r.length),b.stop(),r.__fdbOp=b,r}return b.stop(),r=[],r.__fdbOp=b,r},Collection.prototype.indexOf=function(e){var t=this.find(e,{$decouple:!1})[0];return t?this._data.indexOf(t):void 0},Collection.prototype.transform=function(e){return void 0!==e?("object"==typeof e?(void 0!==e.enabled&&(this._transformEnabled=e.enabled),void 0!==e.dataIn&&(this._transformIn=e.dataIn),void 0!==e.dataOut&&(this._transformOut=e.dataOut)):this._transformEnabled=e===!1?!1:!0,this):{enabled:this._transformEnabled,dataIn:this._transformIn,dataOut:this._transformOut}},Collection.prototype.transformIn=function(e){if(this._transformEnabled&&this._transformIn){if(e instanceof Array){var t,i=[];for(t=0;t<e.length;t++)i[t]=this._transformIn(e[t]);return i}return this._transformIn(e)}return e},Collection.prototype.transformOut=function(e){if(this._transformEnabled&&this._transformOut){if(e instanceof Array){var t,i=[];for(t=0;t<e.length;t++)i[t]=this._transformOut(e[t]);return i}return this._transformOut(e)}return e},Collection.prototype.sort=function(e,t){t=t||[];var i,n,r=[];for(i in e)e.hasOwnProperty(i)&&(n={},n[i]=e[i],n.___fdbKey=i,r.push(n));return r.length<2?this._sort(e,t):this._bucketSort(r,t)},Collection.prototype._bucketSort=function(e,t){var i,n,r,o=e.shift(),a=[];if(e.length>0){t=this._sort(o,t),n=this.bucket(o.___fdbKey,t);for(r in n)n.hasOwnProperty(r)&&(i=[].concat(e),a=a.concat(this._bucketSort(i,n[r])));return a}return this._sort(o,t)},Collection.prototype._sort=function(e,t){var i,n=new Path,r=n.parse(e,!0)[0];if(n.path(r.path),1===r.value)i=function(e,t){var i=n.value(e)[0],r=n.value(t)[0];return"string"==typeof i&&"string"==typeof r?i.localeCompare(r):i>r?1:r>i?-1:0};else{if(-1!==r.value)throw this._name+": $orderBy clause has invalid direction: "+r.value+", accepted values are 1 or -1 for ascending or descending!";i=function(e,t){var i=n.value(e)[0],r=n.value(t)[0];return"string"==typeof i&&"string"==typeof r?r.localeCompare(i):i>r?-1:r>i?1:0}}return t.sort(i)},Collection.prototype.bucket=function(e,t){var i,n={};for(i=0;i<t.length;i++)n[t[i][e]]=n[t[i][e]]||[],n[t[i][e]].push(t[i]);return n},Collection.prototype._analyseQuery=function(e,t,i){var n,r,o,a,s,h,l,u,c,p,d={queriesOn:[this._name],indexMatch:[],hasJoin:!1,queriesJoin:!1,joinQueries:{},query:e,options:t},f=[],y=[];i.time("checkIndexes"),void 0!==e[this._primaryKey]&&(i.time("checkIndexMatch: Primary Key"),c=new Path,d.indexMatch.push({lookup:this._primaryIndex.lookup(e,t),keyData:{matchedKeys:[this._primaryKey],matchedKeyCount:1,totalKeyCount:c.countKeys(e)},index:this._primaryIndex}),i.time("checkIndexMatch: Primary Key"));for(p in this._indexById)if(this._indexById.hasOwnProperty(p)&&(h=this._indexById[p],l=h.name(),i.time("checkIndexMatch: "+l),s=h.match(e,t),u=h.lookup(e,t),s.matchedKeyCount>0&&d.indexMatch.push({lookup:u,keyData:s,index:h}),i.time("checkIndexMatch: "+l),s.totalKeyCount===s.matchedKeyCount))break;if(i.time("checkIndexes"),d.indexMatch.length>1&&(i.time("findOptimalIndex"),d.indexMatch.sort(function(e,t){return e.keyData.totalKeyCount===e.keyData.matchedKeyCount?-1:t.keyData.totalKeyCount===t.keyData.matchedKeyCount?1:e.keyData.matchedKeyCount===t.keyData.matchedKeyCount?e.lookup.length-t.lookup.length:t.keyData.matchedKeyCount-e.keyData.matchedKeyCount}),i.time("findOptimalIndex")),t.join){for(d.hasJoin=!0,n=0;n<t.join.length;n++)for(r in t.join[n])t.join[n].hasOwnProperty(r)&&(f.push(r),y.push("$as"in t.join[n][r]?t.join[n][r].$as:r));for(a=0;a<y.length;a++)o=this._queryReferencesCollection(e,y[a],""),o&&(d.joinQueries[f[a]]=o,d.queriesJoin=!0);d.joinsOn=f,d.queriesOn=d.queriesOn.concat(f)}return d},Collection.prototype._queryReferencesCollection=function(e,t,i){var n;for(n in e)if(e.hasOwnProperty(n)){if(n===t)return i&&(i+="."),i+n;if("object"==typeof e[n])return i&&(i+="."),i+=n,this._queryReferencesCollection(e[n],t,i)}return!1},Collection.prototype._match=function(e,t,i){var n,r,o,a,s,h=typeof e,l=typeof t,u=!0;if("string"!==h&&"number"!==h||"string"!==l&&"number"!==l){for(s in t)if(t.hasOwnProperty(s)){if(n=!1,"$"===s.substr(0,1))switch(s){case"$gt":if(e>t[s]){if("or"===i)return!0}else u=!1;n=!0;break;case"$gte":if(e>=t[s]){if("or"===i)return!0}else u=!1;n=!0;break;case"$lt":if(e<t[s]){if("or"===i)return!0}else u=!1;n=!0;break;case"$lte":if(e<=t[s]){if("or"===i)return!0}else u=!1;n=!0;break;case"$exists":if(void 0===e!==t[s]){if("or"===i)return!0}else u=!1;n=!0;break;case"$or":n=!0;for(var c=0;c<t[s].length;c++){if(this._match(e,t[s][c],"and"))return!0;u=!1}break;case"$and":n=!0;for(var p=0;p<t[s].length;p++)if(!this._match(e,t[s][p],"and"))return!1;break;case"$in":if(!(t[s]instanceof Array))throw"Cannot use a $nin operator on a non-array key: "+s;var d,f=t[s],y=f.length,m=!1;for(d=0;y>d;d++)if(f[d]===e){m=!0;break}if(m){if("or"===i)return!0}else u=!1;n=!0;break;case"$nin":if(!(t[s]instanceof Array))throw"Cannot use a $nin operator on a non-array key: "+s;var _,g=t[s],v=g.length,C=!0;for(_=0;v>_;_++)if(g[_]===e){C=!1;break}if(C){if("or"===i)return!0}else u=!1;n=!0;break;case"$ne":if(e!=t[s]){if("or"===i)return!0}else u=!1;n=!0}if(!n&&t[s]instanceof RegExp)if(n=!0,"object"==typeof e&&void 0!==e[s]&&t[s].test(e[s])){if("or"===i)return!0}else u=!1;if(!n)if("object"==typeof t[s])if(void 0!==e[s])if(e[s]instanceof Array&&!(t[s]instanceof Array)){for(o=!1,a=0;a<e[s].length&&!(o=this._match(e[s][a],t[s],r));a++);if(o){if("or"===i)return!0}else u=!1}else if(!(e[s]instanceof Array)&&t[s]instanceof Array){for(o=!1,a=0;a<t[s].length&&!(o=this._match(e[s],t[s][a],r));a++);if(o){if("or"===i)return!0}else u=!1}else if("object"==typeof e)if(o=this._match(e[s],t[s],r)){if("or"===i)return!0}else u=!1;else if(o=this._match(void 0,t[s],r)){if("or"===i)return!0}else u=!1;else if(t[s]&&void 0!==t[s].$exists)if(o=this._match(void 0,t[s],r)){if("or"===i)return!0}else u=!1;else u=!1;else if(e&&e[s]===t[s]){if("or"===i)return!0}else if(e&&e[s]&&e[s]instanceof Array&&t[s]&&"object"!=typeof t[s]){for(o=!1,a=0;a<e[s].length&&!(o=this._match(e[s][a],t[s],r));a++);if(o){if("or"===i)return!0}else u=!1}else u=!1;if("and"===i&&!u)return!1}}else e!==t&&(u=!1);return u},Collection.prototype.count=function(e,t){return e?this.find(e,t).length:this._data.length},Collection.prototype.findSub=function(e,t,i,n){var r,o,a,s=new Path(t),h=this.find(e),l=h.length,u=this._db.collection("__FDB_temp_"+this.objectId()),c={parents:l,subDocTotal:0,subDocs:[],pathFound:!1,err:""};for(r=0;l>r;r++)if(o=s.value(h[r])[0]){if(u.setData(o),a=u.find(i,n),n.returnFirst&&a.length)return a[0];c.subDocs.push(a),c.subDocTotal+=a.length,c.pathFound=!0}return u.drop(),n.noStats?c.subDocs:(c.pathFound||(c.err="No objects found in the parent documents with a matching path of: "+t),c)},Collection.prototype.insertIndexViolation=function(e){var t,i,n,r=this._indexByName;if(this._primaryIndex.get(e[this._primaryKey]))t=this._primaryIndex;else for(i in r)if(r.hasOwnProperty(i)&&(n=r[i],n.unique()&&n.violation(e))){t=n;break}return t?t.name():!1},Collection.prototype.ensureIndex=function(e,t){this._indexByName=this._indexByName||{},this._indexById=this._indexById||{};var i=new Index(e,t,this),n={start:(new Date).getTime()};return this._indexByName[i.name()]?{err:"Index with that name already exists"}:this._indexById[i.id()]?{err:"Index with those keys already exists"}:(i.rebuild(),this._indexByName[i.name()]=i,this._indexById[i.id()]=i,n.end=(new Date).getTime(),n.total=n.end-n.start,this._lastOp={type:"ensureIndex",stats:{time:n}},{index:i,id:i.id(),name:i.name(),state:i.state()})},Collection.prototype.index=function(e){return this._indexByName?this._indexByName[e]:void 0},Collection.prototype.lastOp=function(){return this._metrics.list()},Collection.prototype.diff=function(e){var t,i,n,r,o={insert:[],update:[],remove:[]},a=this.primaryKey();if(a!==e.primaryKey())throw"Collection diffing requires that both collections have the same primary key!";for(t=e._data;t&&!(t instanceof Array);)e=t,t=e._data;for(r=t.length,i=0;r>i;i++)n=t[i],this._primaryIndex.get(n[a])?this._primaryCrc.get(n[a])===e._primaryCrc.get(n[a])||o.update.push(n):o.insert.push(n);for(t=this._data,r=t.length,i=0;r>i;i++)n=t[i],e._primaryIndex.get(n[a])||o.remove.push(n);return o},Core.prototype.collection=function(e,t){if(e)return this._collection[e]||this.debug()&&console.log("Creating collection "+e),this._collection[e]=this._collection[e]||new Collection(e).db(this),void 0!==t&&this._collection[e].primaryKey(t),this._collection[e];throw"Cannot get collection with undefined name!"},Core.prototype.collectionExists=function(e){return Boolean(this._collection[e])},Core.prototype.collections=function(){var e,t=[];for(e in this._collection)this._collection.hasOwnProperty(e)&&t.push({name:e,count:this._collection[e].count()});return t},Shared.finishModule("Collection"),module.exports=Collection;
},{"./Crc":6,"./Index":9,"./KeyValueStore":10,"./Metrics":11,"./Path":21,"./Shared":24}],4:[function(_dereq_,module,exports){
var Shared,Core,CoreInit,Collection;Shared=_dereq_("./Shared");var CollectionGroup=function(){this.init.apply(this,arguments)};CollectionGroup.prototype.init=function(t){this._name=t,this._data=new Collection("__FDB__cg_data_"+this._name),this._collections=[],this._views=[]},Shared.addModule("CollectionGroup",CollectionGroup),Shared.mixin(CollectionGroup.prototype,"Mixin.Common"),Shared.mixin(CollectionGroup.prototype,"Mixin.ChainReactor"),Collection=_dereq_("./Collection"),Core=Shared.modules.Core,CoreInit=Shared.modules.Core.prototype.init,CollectionGroup.prototype.on=function(){this._data.on.apply(this._data,arguments)},CollectionGroup.prototype.off=function(){this._data.off.apply(this._data,arguments)},CollectionGroup.prototype.emit=function(){this._data.emit.apply(this._data,arguments)},CollectionGroup.prototype.primaryKey=function(t){return void 0!==t?(this._primaryKey=t,this):this._primaryKey},Shared.synthesize(CollectionGroup.prototype,"db"),CollectionGroup.prototype.addCollection=function(t){if(t&&-1===this._collections.indexOf(t)){if(this._collections.length){if(this._primaryKey!==t.primaryKey())throw"All collections in a collection group must have the same primary key!"}else this.primaryKey(t.primaryKey());this._collections.push(t),t._groups.push(this),t.chain(this),this._data.insert(t.find())}return this},CollectionGroup.prototype.removeCollection=function(t){if(t){var o,e=this._collections.indexOf(t);-1!==e&&(t.unChain(this),this._collections.splice(e,1),o=t._groups.indexOf(this),-1!==o&&t._groups.splice(o,1)),0===this._collections.length&&delete this._primaryKey}return this},CollectionGroup.prototype._chainHandler=function(t){switch(t.type){case"setData":t.data=this.decouple(t.data),this._data.remove(t.options.oldData),this._data.insert(t.data);break;case"insert":t.data=this.decouple(t.data),this._data.insert(t.data);break;case"update":this._data.update(t.data.query,t.data.update,t.options);break;case"remove":this._data.remove(t.data.query,t.options)}},CollectionGroup.prototype.insert=function(){this._collectionsRun("insert",arguments)},CollectionGroup.prototype.update=function(){this._collectionsRun("update",arguments)},CollectionGroup.prototype.updateById=function(){this._collectionsRun("updateById",arguments)},CollectionGroup.prototype.remove=function(){this._collectionsRun("remove",arguments)},CollectionGroup.prototype._collectionsRun=function(t,o){for(var e=0;e<this._collections.length;e++)this._collections[e][t].apply(this._collections[e],o)},CollectionGroup.prototype.find=function(t,o){return this._data.find(t,o)},CollectionGroup.prototype.removeById=function(t){for(var o=0;o<this._collections.length;o++)this._collections[o].removeById(t)},CollectionGroup.prototype.subset=function(t,o){var e=this.find(t,o);return(new Collection)._subsetOf(this).primaryKey(this._primaryKey).setData(e)},CollectionGroup.prototype.drop=function(){var t,o=[].concat(this._collections),e=[].concat(this._views);for(this._debug&&console.log("Dropping collection group "+this._name),t=0;t<o.length;t++)this.removeCollection(o[t]);for(t=0;t<e.length;t++)this._removeView(e[t]);return this.emit("drop"),!0},Core.prototype.init=function(){this._collectionGroup={},CoreInit.apply(this,arguments)},Core.prototype.collectionGroup=function(t){return t?(this._collectionGroup[t]=this._collectionGroup[t]||new CollectionGroup(t).db(this),this._collectionGroup[t]):this._collectionGroup},module.exports=CollectionGroup;
},{"./Collection":3,"./Shared":24}],5:[function(_dereq_,module,exports){
var Shared,Collection,Metrics,Crc,Overload;Shared=_dereq_("./Shared"),Overload=_dereq_("./Overload");var Core=function(){this.init.apply(this,arguments)};Core.prototype.init=function(){this._collection={},this._debug={},this._version="1.2.10"},Core.prototype.moduleLoaded=Overload({string:function(e){if(void 0!==e){e=e.replace(/ /g,"");var r,t=e.split(",");for(r=0;r<t.length;r++)if(!Shared.modules[t[r]])return!1;return!0}return!1},"string, function":function(e,r){if(void 0!==e){e=e.replace(/ /g,"");var t,o=e.split(",");for(t=0;t<o.length;t++)if(!Shared.modules[o[t]])return!1;r()}},"string, function, function":function(e,r,t){if(void 0!==e){e=e.replace(/ /g,"");var o,i=e.split(",");for(o=0;o<i.length;o++)if(!Shared.modules[i[o]])return t(),!1;r()}}}),Core.moduleLoaded=Core.prototype.moduleLoaded,Core.shared=Shared,Core.prototype.shared=Shared,Shared.addModule("Core",Core),Shared.mixin(Core.prototype,"Mixin.Common"),Shared.mixin(Core.prototype,"Mixin.ChainReactor"),Collection=_dereq_("./Collection.js"),Metrics=_dereq_("./Metrics.js"),Crc=_dereq_("./Crc.js"),Core.prototype._isServer=!1,Core.prototype.isClient=function(){return!this._isServer},Core.prototype.isServer=function(){return this._isServer},Core.prototype.crc=Crc,Core.prototype.isClient=function(){return!this._isServer},Core.prototype.isServer=function(){return this._isServer},Core.prototype.arrayToCollection=function(e){return(new Collection).setData(e)},Core.prototype.on=function(e,r){return this._listeners=this._listeners||{},this._listeners[e]=this._listeners[e]||[],this._listeners[e].push(r),this},Core.prototype.off=function(e,r){if(e in this._listeners){var t=this._listeners[e],o=t.indexOf(r);o>-1&&t.splice(o,1)}return this},Core.prototype.emit=function(e){if(this._listeners=this._listeners||{},e in this._listeners){var r,t=this._listeners[e],o=t.length;for(r=0;o>r;r++)t[r].apply(this,Array.prototype.slice.call(arguments,1))}return this},Core.prototype.peek=function(e){var r,t,o=[],i=typeof e;for(r in this._collection)this._collection.hasOwnProperty(r)&&(t=this._collection[r],o=o.concat("string"===i?t.peek(e):t.find(e)));return o},Core.prototype.peekCat=function(e){var r,t,o,i={},n=typeof e;for(r in this._collection)this._collection.hasOwnProperty(r)&&(t=this._collection[r],"string"===n?(o=t.peek(e),o&&o.length&&(i[t.name()]=o)):(o=t.find(e),o&&o.length&&(i[t.name()]=o)));return i},module.exports=Core;
},{"./Collection.js":3,"./Crc.js":6,"./Metrics.js":11,"./Overload":19,"./Shared":24}],6:[function(_dereq_,module,exports){
var crcTable=function(){var r,e,o,c=[];for(e=0;256>e;e++){for(r=e,o=0;8>o;o++)r=1&r?3988292384^r>>>1:r>>>1;c[e]=r}return c}();module.exports=function(r){var e,o=-1;for(e=0;e<r.length;e++)o=o>>>8^crcTable[255&(o^r.charCodeAt(e))];return(-1^o)>>>0};
},{}],7:[function(_dereq_,module,exports){
var Shared,Collection,Core,CoreInit;Shared=_dereq_("./Shared");var Document=function(){this.init.apply(this,arguments)};Document.prototype.init=function(e){this._name=e,this._data={}},Shared.addModule("Document",Document),Shared.mixin(Document.prototype,"Mixin.Common"),Shared.mixin(Document.prototype,"Mixin.Events"),Shared.mixin(Document.prototype,"Mixin.ChainReactor"),Collection=_dereq_("./Collection"),Core=Shared.modules.Core,CoreInit=Shared.modules.Core.prototype.init,Shared.synthesize(Document.prototype,"db"),Shared.synthesize(Document.prototype,"name"),Document.prototype.setData=function(e){var t,o;if(e)if(e=this.decouple(e),this._linked){o={};for(t in this._data)"jQuery"!==t.substr(0,6)&&this._data.hasOwnProperty(t)&&void 0===e[t]&&(o[t]=1);e.$unset=o,this.updateObject(this._data,e,{})}else this._data=e;return this},Document.prototype.update=function(e,t,o){this.updateObject(this._data,t,e,o)},Document.prototype.updateObject=Collection.prototype.updateObject,Document.prototype._isPositionalKey=function(e){return".$"===e.substr(e.length-2,2)},Document.prototype._updateProperty=function(e,t,o){this._linked?(jQuery.observable(e).setProperty(t,o),this.debug()&&console.log('ForerunnerDB.Document: Setting data-bound document property "'+t+'" for collection "'+this.name()+'"')):(e[t]=o,this.debug()&&console.log('ForerunnerDB.Document: Setting non-data-bound document property "'+t+'" for collection "'+this.name()+'"'))},Document.prototype._updateIncrement=function(e,t,o){this._linked?jQuery.observable(e).setProperty(t,e[t]+o):e[t]+=o},Document.prototype._updateSpliceMove=function(e,t,o){this._linked?(jQuery.observable(e).move(t,o),this.debug()&&console.log('ForerunnerDB.Document: Moving data-bound document array index from "'+t+'" to "'+o+'" for collection "'+this.name()+'"')):(e.splice(o,0,e.splice(t,1)[0]),this.debug()&&console.log('ForerunnerDB.Document: Moving non-data-bound document array index from "'+t+'" to "'+o+'" for collection "'+this.name()+'"'))},Document.prototype._updateSplicePush=function(e,t,o){e.length>t?this._linked?jQuery.observable(e).insert(t,o):e.splice(t,0,o):this._linked?jQuery.observable(e).insert(o):e.push(o)},Document.prototype._updatePush=function(e,t){this._linked?jQuery.observable(e).insert(t):e.push(t)},Document.prototype._updatePull=function(e,t){this._linked?jQuery.observable(e).remove(t):e.splice(t,1)},Document.prototype._updateMultiply=function(e,t,o){this._linked?jQuery.observable(e).setProperty(t,e[t]*o):e[t]*=o},Document.prototype._updateRename=function(e,t,o){var n=e[t];this._linked?(jQuery.observable(e).setProperty(o,n),jQuery.observable(e).removeProperty(t)):(e[o]=n,delete e[t])},Document.prototype._updateUnset=function(e,t){this._linked?jQuery.observable(e).removeProperty(t):delete e[t]},Document.prototype._updatePop=function(e,t){var o,n=!1;return e.length>0&&(this._linked?(1===t?o=e.length-1:-1===t&&(o=0),o>-1&&(jQuery.observable(arr).remove(o),n=!0)):1===t?(e.pop(),n=!0):-1===t&&(e.shift(),n=!0)),n},Document.prototype.drop=function(){this._db&&this._name&&this._db&&this._db._document&&this._db._document[this._name]&&(delete this._db._document[this._name],this._data={})},Core.prototype.init=function(){CoreInit.apply(this,arguments)},Core.prototype.document=function(e){return e?(this._document=this._document||{},this._document[e]=this._document[e]||new Document(e).db(this),this._document[e]):this._document},Shared.finishModule("Document"),module.exports=Document;
},{"./Collection":3,"./Shared":24}],8:[function(_dereq_,module,exports){
var Shared,Collection,CollectionInit,Overload;Shared=_dereq_("./Shared"),Overload=_dereq_("./Overload");var Highchart=function(){this.init.apply(this,arguments)};Highchart.prototype.init=function(t,e){if(this._options=e,this._selector=$(this._options.selector),!this._selector[0])throw"Chart target element does not exist via selector: "+this._options.selector;this._listeners={},this._collection=t,this._options.series=[],e.chartOptions=e.chartOptions||{},e.chartOptions.credits=!1;var i,s,r;switch(this._options.type){case"pie":this._selector.highcharts(this._options.chartOptions),this._chart=this._selector.highcharts(),i=this._collection.find(),s={allowPointSelect:!0,cursor:"pointer",dataLabels:{enabled:!0,format:"<b>{point.name}</b>: {y} ({point.percentage:.0f}%)",style:{color:Highcharts.theme&&Highcharts.theme.contrastTextColor||"black"}}},r=this.pieDataFromCollectionData(i,this._options.keyField,this._options.valField),$.extend(s,this._options.seriesOptions),$.extend(s,{name:this._options.seriesName,data:r}),this._chart.addSeries(s,!0,!0);break;case"line":case"area":case"column":case"bar":r=this.seriesDataFromCollectionData(this._options.seriesField,this._options.keyField,this._options.valField,this._options.orderBy),this._options.chartOptions.xAxis=r.xAxis,this._options.chartOptions.series=r.series,this._selector.highcharts(this._options.chartOptions),this._chart=this._selector.highcharts();break;default:throw"Chart type specified is not currently supported by ForerunnerDB: "+this._options.type}this._hookEvents()},Shared.addModule("Highchart",Highchart),Collection=Shared.modules.Collection,CollectionInit=Collection.prototype.init,Highchart.prototype.pieDataFromCollectionData=function(t,e,i){var s,r=[];for(s=0;s<t.length;s++)r.push([t[s][e],t[s][i]]);return r},Highchart.prototype.seriesDataFromCollectionData=function(t,e,i,s){var r,o,h,a,n,c,l=this._collection.distinct(t),p=[],_={categories:[]};for(n=0;n<l.length;n++){for(r=l[n],o={},o[t]=r,a=[],h=this._collection.find(o,{orderBy:s}),c=0;c<h.length;c++)_.categories.push(h[c][e]),a.push(h[c][i]);p.push({name:r,data:a})}return{xAxis:_,series:p}},Highchart.prototype._hookEvents=function(){var t=this;t._collection.on("change",function(){t._changeListener.apply(t,arguments)}),t._collection.on("drop",function(){t._dropListener.apply(t,arguments)})},Highchart.prototype._changeListener=function(){var t=this;if("undefined"!=typeof t._collection&&t._chart){var e,i=t._collection.find();switch(t._options.type){case"pie":t._chart.series[0].setData(t.pieDataFromCollectionData(i,t._options.keyField,t._options.valField),!0,!0);break;case"bar":case"line":case"area":case"column":var s=t.seriesDataFromCollectionData(t._options.seriesField,t._options.keyField,t._options.valField,t._options.orderBy);for(t._chart.xAxis[0].setCategories(s.xAxis.categories),e=0;e<s.series.length;e++)t._chart.series[e]?t._chart.series[e].setData(s.series[e].data,!0,!0):t._chart.addSeries(s.series[e],!0,!0)}}},Highchart.prototype._dropListener=function(){var t=this;t._collection.off("change",t._changeListener),t._collection.off("drop",t._dropListener)},Highchart.prototype.drop=function(){return this._chart.destroy(),this._collection.off("change",this._changeListener),this._collection.off("drop",this._dropListener),delete this._collection._highcharts[this._options.selector],delete this._chart,delete this._options,delete this._collection,this},Collection.prototype.init=function(){this._highcharts={},CollectionInit.apply(this,arguments)},Collection.prototype.pieChart=new Overload({object:function(t){return t.type="pie",t.chartOptions=t.chartOptions||{},t.chartOptions.chart=t.chartOptions.chart||{},t.chartOptions.chart.type="pie",this._highcharts[t.selector]||(this._highcharts[t.selector]=new Highchart(this,t)),this._highcharts[t.selector]},"*, string, string, string, ...":function(t,e,i,s,r){r=r||{},r.selector=t,r.keyField=e,r.valField=i,r.seriesName=s,this.pieChart(r)}}),Collection.prototype.lineChart=new Overload({object:function(t){return t.type="line",t.chartOptions=t.chartOptions||{},t.chartOptions.chart=t.chartOptions.chart||{},t.chartOptions.chart.type="line",this._highcharts[t.selector]||(this._highcharts[t.selector]=new Highchart(this,t)),this._highcharts[t.selector]},"*, string, string, string, ...":function(t,e,i,s,r){r=r||{},r.seriesField=e,r.selector=t,r.keyField=i,r.valField=s,this.lineChart(r)}}),Collection.prototype.areaChart=new Overload({object:function(t){return t.type="area",t.chartOptions=t.chartOptions||{},t.chartOptions.chart=t.chartOptions.chart||{},t.chartOptions.chart.type="area",this._highcharts[t.selector]||(this._highcharts[t.selector]=new Highchart(this,t)),this._highcharts[t.selector]},"*, string, string, string, ...":function(t,e,i,s,r){r=r||{},r.seriesField=e,r.selector=t,r.keyField=i,r.valField=s,this.areaChart(r)}}),Collection.prototype.columnChart=new Overload({object:function(t){return t.type="column",t.chartOptions=t.chartOptions||{},t.chartOptions.chart=t.chartOptions.chart||{},t.chartOptions.chart.type="column",this._highcharts[t.selector]||(this._highcharts[t.selector]=new Highchart(this,t)),this._highcharts[t.selector]},"*, string, string, string, ...":function(t,e,i,s,r){r=r||{},r.seriesField=e,r.selector=t,r.keyField=i,r.valField=s,this.columnChart(r)}}),Collection.prototype.barChart=new Overload({object:function(t){return t.type="bar",t.chartOptions=t.chartOptions||{},t.chartOptions.chart=t.chartOptions.chart||{},t.chartOptions.chart.type="bar",this._highcharts[t.selector]||(this._highcharts[t.selector]=new Highchart(this,t)),this._highcharts[t.selector]},"*, string, string, string, ...":function(t,e,i,s,r){r=r||{},r.seriesField=e,r.selector=t,r.keyField=i,r.valField=s,this.barChart(r)}}),Collection.prototype.stackedBarChart=new Overload({object:function(t){return t.type="bar",t.chartOptions=t.chartOptions||{},t.chartOptions.chart=t.chartOptions.chart||{},t.chartOptions.chart.type="bar",t.plotOptions=t.plotOptions||{},t.plotOptions.series=t.plotOptions.series||{},t.plotOptions.series.stacking=t.plotOptions.series.stacking||"normal",this._highcharts[t.selector]||(this._highcharts[t.selector]=new Highchart(this,t)),this._highcharts[t.selector]},"*, string, string, string, ...":function(t,e,i,s,r){r=r||{},r.seriesField=e,r.selector=t,r.keyField=i,r.valField=s,this.stackedBarChart(r)}}),Collection.prototype.dropChart=function(t){this._highcharts[t]&&this._highcharts[t].drop()},Shared.finishModule("Highchart"),module.exports=Highchart;
},{"./Overload":19,"./Shared":24}],9:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),Path=_dereq_("./Path"),Index=function(){this.init.apply(this,arguments)};Index.prototype.init=function(t,e,i){this._crossRef={},this._size=0,this._id=this._itemKeyHash(t,t),this.data({}),this.unique(e&&e.unique?e.unique:!1),void 0!==t&&this.keys(t),void 0!==i&&this.collection(i),this.name(e&&e.name?e.name:this._id)},Shared.addModule("Index",Index),Shared.mixin(Index.prototype,"Mixin.ChainReactor"),Index.prototype.id=function(){return this._id},Index.prototype.state=function(){return this._state},Index.prototype.size=function(){return this._size},Index.prototype.data=function(t){return void 0!==t?(this._data=t,this):this._data},Shared.synthesize(Index.prototype,"name"),Index.prototype.collection=function(t){return void 0!==t?(this._collection=t,this):this._collection},Index.prototype.keys=function(t){return void 0!==t?(this._keys=t,this._keyCount=(new Path).parse(this._keys).length,this):this._keys},Index.prototype.type=function(t){return void 0!==t?(this._type=t,this):this._type},Index.prototype.unique=function(t){return void 0!==t?(this._unique=t,this):this._unique},Index.prototype.rebuild=function(){if(this._collection){var t,e=this._collection.subset({},{$decouple:!1,$orderBy:this._keys}),i=e.find(),n=i.length;for(this._data={},this._unique&&(this._uniqueLookup={}),t=0;n>t;t++)this.insert(i[t])}this._state={name:this._name,keys:this._keys,indexSize:this._size,built:new Date,updated:new Date,ok:!0}},Index.prototype.insert=function(t){var e,i,n,o=this._unique;for(o&&(e=this._itemHash(t,this._keys),this._uniqueLookup[e]=t),i=this._itemHashArr(t,this._keys),n=0;n<i.length;n++)this.pushToPathValue(i[n],t)},Index.prototype.remove=function(t){var e,i,n,o=this._unique;for(o&&(e=this._itemHash(t,this._keys),delete this._uniqueLookup[e]),i=this._itemHashArr(t,this._keys),n=0;n<i.length;n++)this.pullFromPathValue(i[n],t)},Index.prototype.violation=function(t){var e=this._itemHash(t,this._keys);return Boolean(this._uniqueLookup[e])},Index.prototype.hashViolation=function(t){return Boolean(this._uniqueLookup[t])},Index.prototype.pushToPathValue=function(t,e){var i=this._data[t]=this._data[t]||[];-1===i.indexOf(e)&&(i.push(e),this._size++,this.pushToCrossRef(e,i))},Index.prototype.pullFromPathValue=function(t,e){var i,n=this._data[t];i=n.indexOf(e),i>-1&&(n.splice(i,1),this._size--,this.pullFromCrossRef(e,n)),n.length||delete this._data[t]},Index.prototype.pull=function(t){var e,i,n=t[this._collection.primaryKey()],o=this._crossRef[n],s=o.length;for(e=0;s>e;e++)i=o[e],this._pullFromArray(i,t);this._size--,delete this._crossRef[n]},Index.prototype._pullFromArray=function(t,e){for(var i=t.length;i--;)t[i]===e&&t.splice(i,1)},Index.prototype.pushToCrossRef=function(t,e){var i,n=t[this._collection.primaryKey()];this._crossRef[n]=this._crossRef[n]||[],i=this._crossRef[n],-1===i.indexOf(e)&&i.push(e)},Index.prototype.pullFromCrossRef=function(t){var e=t[this._collection.primaryKey()];delete this._crossRef[e]},Index.prototype.lookup=function(t){return this._data[this._itemHash(t,this._keys)]||[]},Index.prototype.match=function(t){var e=new Path;return e.countObjectPaths(this._keys,t)},Index.prototype._itemHash=function(t,e){var i,n,o=new Path,s="";for(i=o.parse(e),n=0;n<i.length;n++)s&&(s+="_"),s+=o.value(t,i[n].path).join(":");return s},Index.prototype._itemKeyHash=function(t,e){var i,n,o=new Path,s="";for(i=o.parse(e),n=0;n<i.length;n++)s&&(s+="_"),s+=o.keyValue(t,i[n].path);return s},Index.prototype._itemHashArr=function(t,e){var i,n,o,s,h,r=new Path,u=[];for(i=r.parse(e),s=0;s<i.length;s++)for(n=r.value(t,i[s].path),o=0;o<n.length;o++)if(0===s)u.push(n[o]);else for(h=0;h<u.length;h++)u[h]=u[h]+"_"+n[o];return u},Shared.finishModule("Index"),module.exports=Index;
},{"./Path":21,"./Shared":24}],10:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),KeyValueStore=function(){this.init.apply(this,arguments)};KeyValueStore.prototype.init=function(t){this._name=t,this._data={},this._primaryKey="_id"},Shared.addModule("KeyValueStore",KeyValueStore),Shared.mixin(KeyValueStore.prototype,"Mixin.ChainReactor"),Shared.synthesize(KeyValueStore.prototype,"name"),KeyValueStore.prototype.primaryKey=function(t){return void 0!==t?(this._primaryKey=t,this):this._primaryKey},KeyValueStore.prototype.truncate=function(){return this._data={},this},KeyValueStore.prototype.set=function(t,e){return this._data[t]=e?e:!0,this},KeyValueStore.prototype.get=function(t){return this._data[t]},KeyValueStore.prototype.lookup=function(t){var e,r,a,i,n=t[this._primaryKey];if(n instanceof Array){for(r=n.length,i=[],e=0;r>e;e++)a=this._data[n[e]],a&&i.push(a);return i}if(n instanceof RegExp){i=[];for(e in this._data)this._data.hasOwnProperty(e)&&n.test(e)&&i.push(this._data[e]);return i}if("object"!=typeof n)return a=this._data[n],void 0!==a?[a]:[];if(n.$ne){i=[];for(e in this._data)this._data.hasOwnProperty(e)&&e!==n.$ne&&i.push(this._data[e]);return i}if(n.$in&&n.$in instanceof Array){i=[];for(e in this._data)this._data.hasOwnProperty(e)&&n.$in.indexOf(e)>-1&&i.push(this._data[e]);return i}if(n.$nin&&n.$nin instanceof Array){i=[];for(e in this._data)this._data.hasOwnProperty(e)&&-1===n.$nin.indexOf(e)&&i.push(this._data[e]);return i}if(n.$or&&n.$or instanceof Array){for(i=[],e=0;e<n.$or.length;e++)i=i.concat(this.lookup(n.$or[e]));return i}},KeyValueStore.prototype.unSet=function(t){return delete this._data[t],this},KeyValueStore.prototype.uniqueSet=function(t,e){return void 0===this._data[t]?(this._data[t]=e,!0):!1},Shared.finishModule("KeyValueStore"),module.exports=KeyValueStore;
},{"./Shared":24}],11:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),Operation=_dereq_("./Operation"),Metrics=function(){this.init.apply(this,arguments)};Metrics.prototype.init=function(){this._data=[]},Shared.addModule("Metrics",Metrics),Shared.mixin(Metrics.prototype,"Mixin.ChainReactor"),Metrics.prototype.create=function(t){var e=new Operation(t);return this._enabled&&this._data.push(e),e},Metrics.prototype.start=function(){return this._enabled=!0,this},Metrics.prototype.stop=function(){return this._enabled=!1,this},Metrics.prototype.clear=function(){return this._data=[],this},Metrics.prototype.list=function(){return this._data},Shared.finishModule("Metrics"),module.exports=Metrics;
},{"./Operation":18,"./Shared":24}],12:[function(_dereq_,module,exports){
var CRUD={preSetData:function(){},postSetData:function(){}};module.exports=CRUD;
},{}],13:[function(_dereq_,module,exports){
var ChainReactor={chain:function(i){this._chain=this._chain||[];var n=this._chain.indexOf(i);-1===n&&this._chain.push(i)},unChain:function(i){if(this._chain){var n=this._chain.indexOf(i);n>-1&&this._chain.splice(n,1)}},chainSend:function(i,n,h){if(this._chain){var a,t=this._chain,c=t.length;for(a=0;c>a;a++)t[a].chainReceive(this,i,n,h)}},chainReceive:function(i,n,h,a){var t={sender:i,type:n,data:h,options:a};(!this._chainHandler||this._chainHandler&&!this._chainHandler(t))&&this.chainSend(t.type,t.data,t.options)}};module.exports=ChainReactor;
},{}],14:[function(_dereq_,module,exports){
var idCounter=0,Overload=_dereq_("./Overload"),Common;Common={decouple:function(t){return void 0!==t?JSON.parse(JSON.stringify(t)):void 0},objectId:function(t){var d,e=Math.pow(10,17);if(t){var i,u=0,h=t.length;for(i=0;h>i;i++)u+=t.charCodeAt(i)*e;d=u.toString(16)}else idCounter++,d=(idCounter+(Math.random()*e+Math.random()*e+Math.random()*e+Math.random()*e)).toString(16);return d},debug:Overload([function(){return this._debug&&this._debug.all},function(t){return void 0!==t?"boolean"==typeof t?(this._debug=this._debug||{},this._debug.all=t,this.chainSend("debug",this._debug),this):this._debug&&this._debug[t]||this._db&&this._db._debug&&this._db._debug[t]||this._debug&&this._debug.all:this._debug&&this._debug.all},function(t,d){return void 0!==t?void 0!==d?(this._debug=this._debug||{},this._debug[t]=d,this.chainSend("debug",this._debug),this):this._debug&&this._debug[d]||this._db&&this._db._debug&&this._db._debug[t]:this._debug&&this._debug.all}])},module.exports=Common;
},{"./Overload":19}],15:[function(_dereq_,module,exports){
var Events={on:new Overload({"string, function":function(s,i){return this._listeners=this._listeners||{},this._listeners[s]=this._listeners[s]||{},this._listeners[s]["*"]=this._listeners[s]["*"]||[],this._listeners[s]["*"].push(i),this},"string, *, function":function(s,i,t){return this._listeners=this._listeners||{},this._listeners[s]=this._listeners[s]||{},this._listeners[s][i]=this._listeners[s][i]||[],this._listeners[s][i].push(t),this}}),off:new Overload({string:function(s){return this._listeners&&this._listeners[s]&&s in this._listeners&&delete this._listeners[s],this},"string, function":function(s,i){var t,e;return"string"==typeof i?this._listeners&&this._listeners[s]&&this._listeners[s][i]&&delete this._listeners[s][i]:s in this._listeners&&(t=this._listeners[s]["*"],e=t.indexOf(i),e>-1&&t.splice(e,1)),this},"string, *, function":function(s,i,t){if(this._listeners&&s in this._listeners&&i in this.listeners[s]){var e=this._listeners[s][i],n=e.indexOf(t);n>-1&&e.splice(n,1)}},"string, *":function(s,i){this._listeners&&s in this._listeners&&i in this._listeners[s]&&delete this._listeners[s][i]}}),emit:function(s,i){if(this._listeners=this._listeners||{},s in this._listeners){if(this._listeners[s]["*"]){var t,e=this._listeners[s]["*"],n=e.length;for(t=0;n>t;t++)e[t].apply(this,Array.prototype.slice.call(arguments,1))}if(i instanceof Array&&i[0]&&i[0][this._primaryKey]){var r,l,h=this._listeners[s];for(n=i.length,t=0;n>t;t++)if(h[i[t][this._primaryKey]])for(r=h[i[t][this._primaryKey]].length,l=0;r>l;l++)h[i[t][this._primaryKey]][l].apply(this,Array.prototype.slice.call(arguments,1))}}return this}};module.exports=Events;
},{}],16:[function(_dereq_,module,exports){
var Shared,Core,OldView,OldViewInit;Shared=_dereq_("./Shared"),Core=Shared.modules.Core,OldView=Shared.modules.OldView,OldViewInit=OldView.prototype.init,OldView.prototype.init=function(){var e=this;this._binds=[],this._renderStart=0,this._renderEnd=0,this._deferQueue={insert:[],update:[],remove:[],upsert:[],_bindInsert:[],_bindUpdate:[],_bindRemove:[],_bindUpsert:[]},this._deferThreshold={insert:100,update:100,remove:100,upsert:100,_bindInsert:100,_bindUpdate:100,_bindRemove:100,_bindUpsert:100},this._deferTime={insert:100,update:1,remove:1,upsert:1,_bindInsert:100,_bindUpdate:1,_bindRemove:1,_bindUpsert:1},OldViewInit.apply(this,arguments),this.on("insert",function(t,n){e._bindEvent("insert",t,n)}),this.on("update",function(t,n){e._bindEvent("update",t,n)}),this.on("remove",function(t,n){e._bindEvent("remove",t,n)}),this.on("change",e._bindChange)},OldView.prototype.bind=function(e,t){if(!t||!t.template)throw"Cannot bind data to element, missing options information!";return this._binds[e]=t,this},OldView.prototype.unBind=function(e){return delete this._binds[e],this},OldView.prototype.isBound=function(e){return Boolean(this._binds[e])},OldView.prototype.bindSortDom=function(e,t){var n,i,r,o=$(e);for(this.debug()&&console.log("ForerunnerDB.OldView.Bind: Sorting data in DOM...",t),n=0;n<t.length;n++)i=t[n],r=o.find("#"+i[this._primaryKey]),r.length?0===n?(this.debug()&&console.log("ForerunnerDB.OldView.Bind: Sort, moving to index 0...",r),o.prepend(r)):(this.debug()&&console.log("ForerunnerDB.OldView.Bind: Sort, moving to index "+n+"...",r),r.insertAfter(o.children(":eq("+(n-1)+")"))):this.debug()&&console.log("ForerunnerDB.OldView.Bind: Warning, element for array item not found!",i)},OldView.prototype.bindRefresh=function(e){var t,n,i=this._binds;e||(e={data:this.find()});for(t in i)i.hasOwnProperty(t)&&(n=i[t],this.debug()&&console.log("ForerunnerDB.OldView.Bind: Sorting DOM..."),this.bindSortDom(t,e.data),n.afterOperation&&n.afterOperation(),n.refresh&&n.refresh())},OldView.prototype.bindRender=function(e,t){var n,i,r,o,d=this._binds[e],s=$(e),p=$("<ul></ul>");if(d){for(n=this._data.find(),o=0;o<n.length;o++)i=n[o],r=d.template(i,function(e){p.append(e)});t?t(e,p.html()):s.append(p.html())}},OldView.prototype.processQueue=function(e,t){var n=this._deferQueue[e],i=this._deferThreshold[e],r=this._deferTime[e];if(n.length){var o,d=this;n.length&&(o=n.length>i?n.splice(0,i):n.splice(0,n.length),this._bindEvent(e,o,[])),setTimeout(function(){d.processQueue(e,t)},r)}else t&&t(),this.emit("bindQueueComplete")},OldView.prototype._bindEvent=function(e,t,n){var i,r,o=(this._deferQueue[e],this._deferThreshold[e],this._deferTime[e],this._binds),d=this.find({});for(r in o)if(o.hasOwnProperty(r))switch(i=o[r].reduce?this.find(o[r].reduce.query,o[r].reduce.options):d,e){case"insert":this._bindInsert(r,o[r],t,n,i);break;case"update":this._bindUpdate(r,o[r],t,n,i);break;case"remove":this._bindRemove(r,o[r],t,n,i)}},OldView.prototype._bindChange=function(e){this.debug()&&console.log("ForerunnerDB.OldView.Bind: Bind data change, refreshing bind...",e),this.bindRefresh(e)},OldView.prototype._bindInsert=function(e,t,n,i,r){var o,d,s,p=$(e);for(s=0;s<n.length;s++)o=p.find("#"+n[s][this._primaryKey]),o.length||(d=t.template(n[s],function(e,n,i,r){return function(e){t.insert?t.insert(e,n,i,r):t.prependInsert?p.prepend(e):p.append(e),t.afterInsert&&t.afterInsert(e,n,i,r)}}(o,n[s],i,r)))},OldView.prototype._bindUpdate=function(e,t,n,i,r){var o,d,s=$(e);for(d=0;d<n.length;d++)o=s.find("#"+n[d][this._primaryKey]),t.template(n[d],function(e,n){return function(i){t.update?t.update(i,n,r,e.length?"update":"append"):e.length?e.replaceWith(i):t.prependUpdate?s.prepend(i):s.append(i),t.afterUpdate&&t.afterUpdate(i,n,r)}}(o,n[d]))},OldView.prototype._bindRemove=function(e,t,n,i,r){var o,d,s=$(e);for(d=0;d<n.length;d++)o=s.find("#"+n[d][this._primaryKey]),o.length&&(t.beforeRemove?t.beforeRemove(o,n[d],r,function(e,n,i){return function(){t.remove?t.remove(e,n,i):(e.remove(),t.afterRemove&&t.afterRemove(e,n,i))}}(o,n[d],r)):t.remove?t.remove(o,n[d],r):(o.remove(),t.afterRemove&&t.afterRemove(o,n[d],r)))};
},{"./Shared":24}],17:[function(_dereq_,module,exports){
var Shared,Core,CollectionGroup,Collection,CollectionInit,CollectionGroupInit,CoreInit;Shared=_dereq_("./Shared");var OldView=function(){this.init.apply(this,arguments)};OldView.prototype.init=function(e){var t=this;this._name=e,this._groups=[],this._listeners={},this._query={query:{},options:{}},this._onFromSetData=function(){t._onSetData.apply(t,arguments)},this._onFromInsert=function(){t._onInsert.apply(t,arguments)},this._onFromUpdate=function(){t._onUpdate.apply(t,arguments)},this._onFromRemove=function(){t._onRemove.apply(t,arguments)},this._onFromChange=function(){t.debug()&&console.log("ForerunnerDB.OldView: Received change"),t._onChange.apply(t,arguments)}},Shared.addModule("OldView",OldView),CollectionGroup=_dereq_("./CollectionGroup"),Collection=_dereq_("./Collection"),CollectionInit=Collection.prototype.init,CollectionGroupInit=CollectionGroup.prototype.init,Core=Shared.modules.Core,CoreInit=Core.prototype.init,Shared.mixin(OldView.prototype,"Mixin.Events"),OldView.prototype.drop=function(){return(this._db||this._from)&&this._name?(this.debug()&&console.log("ForerunnerDB.OldView: Dropping view "+this._name),this.emit("drop"),this._db&&delete this._db._oldViews[this._name],this._from&&delete this._from._oldViews[this._name],!0):!1},OldView.prototype.debug=function(){return!1},OldView.prototype.db=function(e){return void 0!==e?(this._db=e,this):this._db},OldView.prototype.from=function(e){if(void 0!==e){if("string"==typeof e){if(!this._db.collectionExists(e))throw"Invalid collection in view.from() call.";e=this._db.collection(e)}return this._from!==e&&(this._from&&this.removeFrom(),this.addFrom(e)),this}return this._from},OldView.prototype.addFrom=function(e){if(this._from=e,this._from)return this._from.on("setData",this._onFromSetData),this._from.on("change",this._onFromChange),this._from._addOldView(this),this._primaryKey=this._from._primaryKey,this.refresh(),this;throw"Cannot determine collection type in view.from()"},OldView.prototype.removeFrom=function(){this._from.off("setData",this._onFromSetData),this._from.off("change",this._onFromChange),this._from._removeOldView(this)},OldView.prototype.primaryKey=function(){return this._from?this._from.primaryKey():void 0},OldView.prototype.queryData=function(e,t,o){return void 0!==e&&(this._query.query=e),void 0!==t&&(this._query.options=t),void 0!==e||void 0!==t?((void 0===o||o===!0)&&this.refresh(),this):this._query},OldView.prototype.queryAdd=function(e,t,o){var i,n=this._query.query;if(void 0!==e)for(i in e)e.hasOwnProperty(i)&&(void 0===n[i]||void 0!==n[i]&&t)&&(n[i]=e[i]);(void 0===o||o===!0)&&this.refresh()},OldView.prototype.queryRemove=function(e,t){var o,i=this._query.query;if(void 0!==e)for(o in e)e.hasOwnProperty(o)&&delete i[o];(void 0===t||t===!0)&&this.refresh()},OldView.prototype.query=function(e,t){return void 0!==e?(this._query.query=e,(void 0===t||t===!0)&&this.refresh(),this):this._query.query},OldView.prototype.queryOptions=function(e,t){return void 0!==e?(this._query.options=e,(void 0===t||t===!0)&&this.refresh(),this):this._query.options},OldView.prototype.refresh=function(e){if(this._from){var t,o,i,n,r,s,d,h,l=this._data,u=[],a=[],p=[],_=!1;if(this.debug()&&(console.log("ForerunnerDB.OldView: Refreshing view "+this._name),console.log("ForerunnerDB.OldView: Existing data: "+("undefined"!=typeof this._data)),"undefined"!=typeof this._data&&console.log("ForerunnerDB.OldView: Current data rows: "+this._data.find().length)),this._query?(this.debug()&&console.log("ForerunnerDB.OldView: View has query and options, getting subset..."),this._data=this._from.subset(this._query.query,this._query.options)):this._query.options?(this.debug()&&console.log("ForerunnerDB.OldView: View has options, getting subset..."),this._data=this._from.subset({},this._query.options)):(this.debug()&&console.log("ForerunnerDB.OldView: View has no query or options, getting subset..."),this._data=this._from.subset({})),!e&&l)if(this.debug()&&console.log("ForerunnerDB.OldView: Refresh not forced, old data detected..."),i=this._data,l.subsetOf()===i.subsetOf()){for(this.debug()&&console.log("ForerunnerDB.OldView: Old and new data are from same collection..."),n=i.find(),t=l.find(),s=i._primaryKey,h=0;h<n.length;h++)d=n[h],r={},r[s]=d[s],o=l.find(r)[0],o?JSON.stringify(o)!==JSON.stringify(d)&&a.push(d):u.push(d);for(h=0;h<t.length;h++)d=t[h],r={},r[s]=d[s],i.find(r)[0]||p.push(d);this.debug()&&(console.log("ForerunnerDB.OldView: Removed "+p.length+" rows"),console.log("ForerunnerDB.OldView: Inserted "+u.length+" rows"),console.log("ForerunnerDB.OldView: Updated "+a.length+" rows")),u.length&&(this._onInsert(u,[]),_=!0),a.length&&(this._onUpdate(a,[]),_=!0),p.length&&(this._onRemove(p,[]),_=!0)}else this.debug()&&console.log("ForerunnerDB.OldView: Old and new data are from different collections..."),p=l.find(),p.length&&(this._onRemove(p),_=!0),u=i.find(),u.length&&(this._onInsert(u),_=!0);else this.debug()&&console.log("ForerunnerDB.OldView: Forcing data update",n),this._data=this._from.subset(this._query.query,this._query.options),n=this._data.find(),this.debug()&&console.log("ForerunnerDB.OldView: Emitting change event with data",n),this._onInsert(n,[]);this.debug()&&console.log("ForerunnerDB.OldView: Emitting change"),this.emit("change")}return this},OldView.prototype.count=function(){return this._data&&this._data._data?this._data._data.length:0},OldView.prototype.find=function(){return this._data?(this.debug()&&console.log("ForerunnerDB.OldView: Finding data in view collection...",this._data),this._data.find.apply(this._data,arguments)):[]},OldView.prototype.insert=function(){return this._from?this._from.insert.apply(this._from,arguments):[]},OldView.prototype.update=function(){return this._from?this._from.update.apply(this._from,arguments):[]},OldView.prototype.remove=function(){return this._from?this._from.remove.apply(this._from,arguments):[]},OldView.prototype._onSetData=function(e,t){this.emit("remove",t,[]),this.emit("insert",e,[])},OldView.prototype._onInsert=function(e,t){this.emit("insert",e,t)},OldView.prototype._onUpdate=function(e,t){this.emit("update",e,t)},OldView.prototype._onRemove=function(e,t){this.emit("remove",e,t)},OldView.prototype._onChange=function(){this.debug()&&console.log("ForerunnerDB.OldView: Refreshing data"),this.refresh()},Collection.prototype.init=function(){this._oldViews=[],CollectionInit.apply(this,arguments)},Collection.prototype._addOldView=function(e){return void 0!==e&&(this._oldViews[e._name]=e),this},Collection.prototype._removeOldView=function(e){return void 0!==e&&delete this._oldViews[e._name],this},CollectionGroup.prototype.init=function(){this._oldViews=[],CollectionGroupInit.apply(this,arguments)},CollectionGroup.prototype._addOldView=function(e){return void 0!==e&&(this._oldViews[e._name]=e),this},CollectionGroup.prototype._removeOldView=function(e){return void 0!==e&&delete this._oldViews[e._name],this},Core.prototype.init=function(){this._oldViews={},CoreInit.apply(this,arguments)},Core.prototype.oldView=function(e){return this._oldViews[e]||this.debug()&&console.log("ForerunnerDB.OldView: Creating view "+e),this._oldViews[e]=this._oldViews[e]||new OldView(e).db(this),this._oldViews[e]},Core.prototype.oldViewExists=function(e){return Boolean(this._oldViews[e])},Core.prototype.oldViews=function(){var e,t=[];for(e in this._oldViews)this._oldViews.hasOwnProperty(e)&&t.push({name:e,count:this._oldViews[e].count()});return t},Shared.finishModule("OldView"),module.exports=OldView;
},{"./Collection":3,"./CollectionGroup":4,"./Shared":24}],18:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),Path=_dereq_("./Path"),Operation=function(){this.pathSolver=new Path,this.counter=0,this.init.apply(this,arguments)};Operation.prototype.init=function(t){this._data={operation:t,index:{potential:[],used:!1},steps:[],time:{startMs:0,stopMs:0,totalMs:0,process:{}},flag:{},log:[]}},Shared.addModule("Operation",Operation),Shared.mixin(Operation.prototype,"Mixin.ChainReactor"),Operation.prototype.start=function(){this._data.time.startMs=(new Date).getTime()},Operation.prototype.log=function(t){if(t){var e=this._log.length>0?this._data.log[this._data.log.length-1].time:0,a={event:t,time:(new Date).getTime(),delta:0};return this._data.log.push(a),e&&(a.delta=a.time-e),this}return this._data.log},Operation.prototype.time=function(t){if(void 0!==t){var e=this._data.time.process,a=e[t]=e[t]||{};return a.startMs?(a.stopMs=(new Date).getTime(),a.totalMs=a.stopMs-a.startMs,a.stepObj.totalMs=a.totalMs,delete a.stepObj):(a.startMs=(new Date).getTime(),a.stepObj={name:t},this._data.steps.push(a.stepObj)),this}return this._data.time},Operation.prototype.flag=function(t,e){return void 0===t||void 0===e?void 0!==t?this._data.flag[t]:this._data.flag:void(this._data.flag[t]=e)},Operation.prototype.data=function(t,e){return void 0!==e?(this.pathSolver.set(this._data,t,e),this):this.pathSolver.get(this._data,t)},Operation.prototype.pushData=function(t,e){this.pathSolver.push(this._data,t,e)},Operation.prototype.stop=function(){this._data.time.stopMs=(new Date).getTime(),this._data.time.totalMs=this._data.time.stopMs-this._data.time.startMs},Shared.finishModule("Operation"),module.exports=Operation;
},{"./Path":21,"./Shared":24}],19:[function(_dereq_,module,exports){
Overload=function(e){if(e){var n,r,t,a,i,o;if(!(e instanceof Array)){t={};for(n in e)if(e.hasOwnProperty(n))if(a=n.replace(/ /g,""),-1===a.indexOf("*"))t[a]=e[n];else for(o=generateSignaturePermutations(a),i=0;i<o.length;i++)t[o[i]]||(t[o[i]]=e[n]);e=t}return function(){if(e instanceof Array){for(r=e.length,n=0;r>n;n++)if(e[n].length===arguments.length)return e[n].apply(this,arguments)}else{var t,a,i=[];for(n=0;n<arguments.length;n++)a=typeof arguments[n],"object"===a&&arguments[n]instanceof Array&&(a="array"),i.push(a);if(t=i.join(","),e[t])return e[t].apply(this,arguments);for(n=i.length;n>=0;n--)if(t=i.slice(0,n).join(","),e[t+",..."])return e[t+",..."].apply(this,arguments)}throw"Overloaded method does not have a matching signature for the passed arguments: "+JSON.stringify(i)}}return function(){}},generateSignaturePermutations=function(e){var n,r,t=[],a=["string","object","number","function","undefined"];if(e.indexOf("*")>-1)for(r=0;r<a.length;r++)n=e.replace("*",a[r]),t=t.concat(generateSignaturePermutations(n));else t.push(e);return t},module.exports=Overload;
},{}],20:[function(_dereq_,module,exports){
var Shared,Core,CoreInit,Collection,Document;Shared=_dereq_("./Shared");var Overview=function(){this.init.apply(this,arguments)};Overview.prototype.init=function(e){this._name=e,this._data=new Document("__FDB__dc_data_"+this._name),this._collData=new Collection,this._collections=[]},Shared.addModule("Overview",Overview),Shared.mixin(Overview.prototype,"Mixin.Common"),Shared.mixin(Overview.prototype,"Mixin.ChainReactor"),Collection=_dereq_("./Collection"),Document=_dereq_("./Document"),Core=Shared.modules.Core,CoreInit=Shared.modules.Core.prototype.init,Shared.synthesize(Overview.prototype,"db"),Shared.synthesize(Overview.prototype,"name"),Shared.synthesize(Overview.prototype,"query",function(e){var t=this.$super(e);return void 0!==e&&this._refresh(),t}),Shared.synthesize(Overview.prototype,"queryOptions",function(e){var t=this.$super(e);return void 0!==e&&this._refresh(),t}),Shared.synthesize(Overview.prototype,"reduce",function(e){var t=this.$super(e);return void 0!==e&&this._refresh(),t}),Overview.prototype.from=function(e){return void 0!==e&&("string"==typeof e&&(e=this._db.collection(e)),this._addCollection(e)),this},Overview.prototype.find=function(){return this._collData.find.apply(this._collData,arguments)},Overview.prototype.count=function(){return this._collData.count.apply(this._collData,arguments)},Overview.prototype._addCollection=function(e){return-1===this._collections.indexOf(e)&&(this._collections.push(e),e.chain(this),this._refresh()),this},Overview.prototype._removeCollection=function(e){var t=this._collections.indexOf(e);return t>-1&&(this._collections.splice(e,1),e.unChain(this),this._refresh()),this},Overview.prototype._refresh=function(){if(this._collections&&this._collections[0]){this._collData.primaryKey(this._collections[0].primaryKey());var e,t=[];for(e=0;e<this._collections.length;e++)t=t.concat(this._collections[e].find(this._query,this._queryOptions));this._collData.setData(t)}if(this._reduce){var i=this._reduce();this._data.setData(i)}},Overview.prototype._chainHandler=function(e){switch(e.type){case"setData":case"insert":case"update":case"remove":this._refresh()}},Overview.prototype.data=function(){return this._data},Core.prototype.init=function(){this._overview={},CoreInit.apply(this,arguments)},Core.prototype.overview=function(e){return e?(this._overview[e]=this._overview[e]||new Overview(e).db(this),this._overview[e]):this._overview},Shared.finishModule("Overview"),module.exports=Overview;
},{"./Collection":3,"./Document":7,"./Shared":24}],21:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),Path=function(){this.init.apply(this,arguments)};Path.prototype.init=function(t){t&&this.path(t)},Shared.addModule("Path",Path),Shared.mixin(Path.prototype,"Mixin.ChainReactor"),Path.prototype.path=function(t){return void 0!==t?(this._path=this.clean(t),this._pathParts=this._path.split("."),this):this._path},Path.prototype.hasObjectPaths=function(t,e){var r,o=!0;for(r in t)if(t.hasOwnProperty(r)){if(void 0===e[r])return!1;if("object"==typeof t[r]&&(o=this.hasObjectPaths(t[r],e[r]),!o))return!1}return o},Path.prototype.countKeys=function(t){var e,r=0;for(e in t)t.hasOwnProperty(e)&&void 0!==t[e]&&("object"!=typeof t[e]?r++:r+=this.countKeys(t[e]));return r},Path.prototype.countObjectPaths=function(t,e){var r,o,a={},h=0,n=0;for(o in e)e.hasOwnProperty(o)&&("object"==typeof e[o]?(r=this.countObjectPaths(t[o],e[o]),a[o]=r.matchedKeys,n+=r.totalKeyCount,h+=r.matchedKeyCount):(n++,t&&t[o]&&"object"!=typeof t[o]?(a[o]=!0,h++):a[o]=!1));return{matchedKeys:a,matchedKeyCount:h,totalKeyCount:n}},Path.prototype.parse=function(t,e){var r,o,a,h=[],n="";for(o in t)if(t.hasOwnProperty(o))if(n=o,"object"==typeof t[o])if(e)for(r=this.parse(t[o],e),a=0;a<r.length;a++)h.push({path:n+"."+r[a].path,value:r[a].value});else for(r=this.parse(t[o]),a=0;a<r.length;a++)h.push({path:n+"."+r[a].path});else h.push(e?{path:n,value:t[o]}:{path:n});return h},Path.prototype.parseArr=function(t,e){return e=e||{},this._parseArr(t,"",[],e)},Path.prototype._parseArr=function(t,e,r,o){var a,h="";e=e||"",r=r||[];for(a in t)t.hasOwnProperty(a)&&(!o.ignore||o.ignore&&!o.ignore.test(a))&&(h=e?e+"."+a:a,"object"==typeof t[a]?this._parseArr(t[a],h,r,o):r.push(h));return r},Path.prototype.value=function(t,e){if(void 0!==t&&"object"==typeof t){var r,o,a,h,n,i,s,p=[];for(void 0!==e&&(e=this.clean(e),r=e.split(".")),o=r||this._pathParts,a=o.length,h=t,i=0;a>i;i++){if(h=h[o[i]],n instanceof Array){for(s=0;s<n.length;s++)p=p.concat(this.value(n,s+"."+o[i]));return p}if(!h||"object"!=typeof h)break;n=h}return[h]}return[]},Path.prototype.set=function(t,e,r){if(void 0!==t&&void 0!==e){var o,a;e=this.clean(e),o=e.split("."),a=o.shift(),o.length?(t[a]=t[a]||{},this.set(t[a],o.join("."),r)):t[a]=r}return t},Path.prototype.get=function(t,e){return this.value(t,e)[0]},Path.prototype.push=function(t,e,r){if(void 0!==t&&void 0!==e){var o,a;if(e=this.clean(e),o=e.split("."),a=o.shift(),o.length)t[a]=t[a]||{},this.set(t[a],o.join("."),r);else{if(t[a]=t[a]||[],!(t[a]instanceof Array))throw"Cannot push to a path whose endpoint is not an array!";t[a].push(r)}}return t},Path.prototype.keyValue=function(t,e){var r,o,a,h,n,i,s;for(void 0!==e&&(e=this.clean(e),r=e.split(".")),o=r||this._pathParts,a=o.length,h=t,s=0;a>s;s++){if(h=h[o[s]],!h||"object"!=typeof h){i=o[s]+":"+h;break}n=h}return i},Path.prototype.clean=function(t){return"."===t.substr(0,1)&&(t=t.substr(1,t.length-1)),t},Shared.finishModule("Path"),module.exports=Path;
},{"./Shared":24}],22:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),localforage=_dereq_("localforage"),Core,Collection,CollectionDrop,CollectionGroup,CollectionInit,CoreInit,Persist;Persist=function(){this.init.apply(this,arguments)},Persist.prototype.init=function(o){o.isClient()&&void 0!==Storage&&(this.mode("localforage"),localforage.config({driver:[localforage.INDEXEDDB,localforage.WEBSQL,localforage.LOCALSTORAGE],name:"ForerunnerDB",storeName:"FDB"}))},Shared.addModule("Persist",Persist),Shared.mixin(Persist.prototype,"Mixin.ChainReactor"),Core=Shared.modules.Core,Collection=_dereq_("./Collection"),CollectionDrop=Collection.prototype.drop,CollectionGroup=_dereq_("./CollectionGroup"),CollectionInit=Collection.prototype.init,CoreInit=Core.prototype.init,Persist.prototype.mode=function(o){return void 0!==o?(this._mode=o,this):this._mode},Persist.prototype.driver=function(){return localforage.driver()},Persist.prototype.save=function(o,t,e){var a;switch(a=function(o,t){o="object"==typeof o?"json::fdb::"+JSON.stringify(o):"raw::fdb::"+o,t&&t(!1,o)},this.mode()){case"localforage":a(t,function(t,a){localforage.setItem(o,a).then(function(o){e(!1,o)},function(o){e(o)})});break;default:e&&e("No data handler.")}},Persist.prototype.load=function(o,t){var e,a,i;switch(i=function(o,t){if(o){switch(e=o.split("::fdb::"),e[0]){case"json":a=JSON.parse(e[1]);break;case"raw":a=e[1]}t&&t(!1,a)}else t(!1,o)},this.mode()){case"localforage":localforage.getItem(o).then(function(o){i(o,t)},function(o){t(o)});break;default:t&&t("No data handler or unrecognised data type.")}},Persist.prototype.drop=function(o,t){switch(this.mode()){case"localforage":localforage.removeItem(o).then(function(){t(!1)},function(o){t(o)});break;default:t&&t("No data handler or unrecognised data type.")}},Collection.prototype.drop=function(o){o&&(this._name?this._db?this._db.persist.drop(this._name):callback&&callback("Cannot drop a collection's persistent storage when the collection is not attached to a database!"):callback&&callback("Cannot drop a collection's persistent storage when no name assigned to collection!")),CollectionDrop.apply(this,arguments)},Collection.prototype.save=function(o){this._name?this._db?this._db.persist.save(this._name,this._data,o):o&&o("Cannot save a collection that is not attached to a database!"):o&&o("Cannot save a collection with no assigned name!")},Collection.prototype.load=function(o){var t=this;this._name?this._db?this._db.persist.load(this._name,function(e,a){e?o&&o(e):(a&&t.setData(a),o&&o(!1))}):o&&o("Cannot load a collection that is not attached to a database!"):o&&o("Cannot load a collection with no assigned name!")},Core.prototype.init=function(){this.persist=new Persist(this),CoreInit.apply(this,arguments)},Core.prototype.load=function(o){var t,e=this._collection,a=e.keys(),i=a.length;for(t in e)e.hasOwnProperty(t)&&e[t].load(function(t){t?o(t):(i--,0===i&&o(!1))})},Core.prototype.save=function(o){var t,e=this._collection,a=e.keys(),i=a.length;for(t in e)e.hasOwnProperty(t)&&e[t].save(function(t){t?o(t):(i--,0===i&&o(!1))})},Shared.finishModule("Persist"),module.exports=Persist;
},{"./Collection":3,"./CollectionGroup":4,"./Shared":24,"localforage":32}],23:[function(_dereq_,module,exports){
var Shared=_dereq_("./Shared"),ReactorIO=function(e,t,r){if(!(e&&t&&r))throw"ReactorIO requires an in, out and process argument to instantiate!";if(this._reactorIn=e,this._reactorOut=t,this._chainHandler=r,!e.chain||!t.chainReceive)throw"ReactorIO requires passed in and out objects to implement the ChainReactor mixin!";e.chain(this),this.chain(t)};Shared.addModule("ReactorIO",ReactorIO),ReactorIO.prototype.drop=function(){this._reactorIn.unChain(this),this.unChain(this._reactorOut),delete this._reactorIn,delete this._reactorOut,delete this._chainHandler},Shared.mixin(ReactorIO.prototype,"Mixin.ChainReactor"),Shared.finishModule("ReactorIO"),module.exports=ReactorIO;
},{"./Shared":24}],24:[function(_dereq_,module,exports){
var Shared={modules:{},_synth:{},addModule:function(i,e){this.modules[i]=e,this.emit("moduleLoad",[i,e])},finishModule:function(i){if(!this.modules[i])throw"finishModule called on a module that has not been registered with addModule(): "+i;this.modules[i]._fdbFinished=!0,this.emit("moduleFinished",[i,this.modules[i]])},moduleFinished:function(i,e){this.modules[i]&&this.modules[i]._fdbFinished?e(i,this.modules[i]):this.on("moduleFinished",e)},moduleExists:function(i){return Boolean(this.modules[i])},mixin:function(i,e){var n=this.mixins[e];if(!n)throw"Cannot find mixin named: "+e;for(var s in n)n.hasOwnProperty(s)&&(i[s]=n[s])},synthesize:function(i,e,n){if(this._synth[e]=this._synth[e]||function(i){return void 0!==i?(this["_"+e]=i,this):this["_"+e]},n){var s=this;i[e]=function(){var i,t=this.$super;return this.$super=s._synth[e],i=n.apply(this,arguments),this.$super=t,i}}else i[e]=this._synth[e]},overload:_dereq_("./Overload"),mixins:{"Mixin.Common":_dereq_("./Mixin.Common"),"Mixin.Events":_dereq_("./Mixin.Events"),"Mixin.ChainReactor":_dereq_("./Mixin.ChainReactor"),"Mixin.CRUD":_dereq_("./Mixin.CRUD")}};Shared.mixin(Shared,"Mixin.Events"),module.exports=Shared;
},{"./Mixin.CRUD":12,"./Mixin.ChainReactor":13,"./Mixin.Common":14,"./Mixin.Events":15,"./Overload":19}],25:[function(_dereq_,module,exports){
var Shared,Core,Collection,CollectionInit,CoreInit,ReactorIO,ActiveBucket;Shared=_dereq_("./Shared");var View=function(){this.init.apply(this,arguments)};View.prototype.init=function(t,e,i){this._name=t,this._groups=[],this._listeners={},this._querySettings={},this._debug={},this.query(e,!1),this.queryOptions(i,!1),this._privateData=new Collection("__FDB__view_privateData_"+this._name)},Shared.addModule("View",View),Shared.mixin(View.prototype,"Mixin.Common"),Shared.mixin(View.prototype,"Mixin.ChainReactor"),Collection=_dereq_("./Collection"),CollectionGroup=_dereq_("./CollectionGroup"),ActiveBucket=_dereq_("./ActiveBucket"),ReactorIO=_dereq_("./ReactorIO"),CollectionInit=Collection.prototype.init,Core=Shared.modules.Core,CoreInit=Core.prototype.init,Shared.synthesize(View.prototype,"name"),View.prototype.insert=function(){this._from.insert.apply(this._from,arguments)},View.prototype.update=function(){this._from.update.apply(this._from,arguments)},View.prototype.updateById=function(){this._from.updateById.apply(this._from,arguments)},View.prototype.remove=function(){this._from.remove.apply(this._from,arguments)},View.prototype.find=function(t,e){return this.publicData().find(t,e)},View.prototype.data=function(){return this._privateData},View.prototype.from=function(t){var e=this;if(void 0!==t){"string"==typeof t&&(t=this._db.collection(t)),this._from=t,this._io=new ReactorIO(t,this,function(t){var i,r,a,o,n,s,p;if(e._querySettings.query){if("insert"===t.type){if(i=t.data,i instanceof Array)for(o=[],p=0;p<i.length;p++)e._privateData._match(i[p],e._querySettings.query,"and")&&(o.push(i[p]),n=!0);else e._privateData._match(i,e._querySettings.query,"and")&&(o=i,n=!0);return n&&this.chainSend("insert",o),!0}if("update"===t.type){if(r=e._privateData.diff(e._from.subset(e._querySettings.query,e._querySettings.options)),r.insert.length||r.remove.length){if(r.insert.length&&this.chainSend("insert",r.insert),r.update.length)for(s=e._privateData.primaryKey(),p=0;p<r.update.length;p++)a={},a[s]=r.update[p][s],this.chainSend("update",{query:a,update:r.update[p]});if(r.remove.length){s=e._privateData.primaryKey();var h=[],u={query:{$or:h}};for(p=0;p<r.remove.length;p++)h.push({_id:r.remove[p][s]});this.chainSend("remove",u)}return!0}return!1}}return!1});var i=t.find(this._querySettings.query,this._querySettings.options);this._transformPrimaryKey(t.primaryKey()),this._transformSetData(i),this._privateData.primaryKey(t.primaryKey()),this._privateData.setData(i),this._querySettings.options&&this._querySettings.options.$orderBy?this.rebuildActiveBucket(this._querySettings.options.$orderBy):this.rebuildActiveBucket()}return this},View.prototype.ensureIndex=function(){return this._privateData.ensureIndex.apply(this._privateData,arguments)},View.prototype._chainHandler=function(t){var e,i,r,a,o,n,s,p,h,u;switch(t.type){case"setData":this.debug()&&console.log('ForerunnerDB.View: Setting data on view "'+this.name()+'" in underlying (internal) view collection "'+this._privateData.name()+'"');var _=this._from.find(this._querySettings.query,this._querySettings.options);this._transformSetData(_),this._privateData.setData(_);break;case"insert":if(this.debug()&&console.log('ForerunnerDB.View: Inserting some data on view "'+this.name()+'" in underlying (internal) view collection "'+this._privateData.name()+'"'),t.data=this.decouple(t.data),t.data instanceof Array||(t.data=[t.data]),this._querySettings.options&&this._querySettings.options.$orderBy)for(e=t.data,i=e.length,r=0;i>r;r++)a=this._activeBucket.insert(e[r]),this._transformInsert(t.data,a),this._privateData._insertHandle(t.data,a);else a=this._privateData._data.length,this._transformInsert(t.data,a),this._privateData._insertHandle(t.data,a);break;case"update":if(this.debug()&&console.log('ForerunnerDB.View: Updating some data on view "'+this.name()+'" in underlying (internal) view collection "'+this._privateData.name()+'"'),n=this._privateData.primaryKey(),o=this._privateData.update(t.data.query,t.data.update,t.data.options),this._querySettings.options&&this._querySettings.options.$orderBy)for(i=o.length,r=0;i>r;r++)p=o[r],this._activeBucket.remove(p),h=this._privateData._data.indexOf(p),a=this._activeBucket.insert(p),h!==a&&this._privateData._updateSpliceMove(this._privateData._data,h,a);if(this._transformEnabled&&this._transformIn)for(n=this._publicData.primaryKey(),u=0;u<o.length;u++)s={},p=o[u],s[n]=p[n],this._transformUpdate(s,p);break;case"remove":this.debug()&&console.log('ForerunnerDB.View: Removing some data on view "'+this.name()+'" in underlying (internal) view collection "'+this._privateData.name()+'"'),this._transformRemove(t.data.query,t.options),this._privateData.remove(t.data.query,t.options)}},View.prototype.on=function(){this._privateData.on.apply(this._privateData,arguments)},View.prototype.off=function(){this._privateData.off.apply(this._privateData,arguments)},View.prototype.emit=function(){this._privateData.emit.apply(this._privateData,arguments)},View.prototype.drop=function(){return this._from?((this.debug()||this._db&&this._db.debug())&&console.log("ForerunnerDB.View: Dropping view "+this._name),this._io.drop(),this._privateData.drop(),!0):!1},View.prototype.db=function(t){return void 0!==t?(this._db=t,this.privateData().db(t),this.publicData().db(t),this):this._db},View.prototype.primaryKey=function(){return this._privateData.primaryKey()},View.prototype.queryData=function(t,e,i){return void 0!==t&&(this._querySettings.query=t),void 0!==e&&(this._querySettings.options=e),void 0!==t||void 0!==e?((void 0===i||i===!0)&&this.refresh(),this):this._querySettings},View.prototype.queryAdd=function(t,e,i){var r,a=this._querySettings.query;if(void 0!==t)for(r in t)t.hasOwnProperty(r)&&(void 0===a[r]||void 0!==a[r]&&e)&&(a[r]=t[r]);(void 0===i||i===!0)&&this.refresh()},View.prototype.queryRemove=function(t,e){var i,r=this._querySettings.query;if(void 0!==t)for(i in t)t.hasOwnProperty(i)&&delete r[i];(void 0===e||e===!0)&&this.refresh()},View.prototype.query=function(t,e){return void 0!==t?(this._querySettings.query=t,(void 0===e||e===!0)&&this.refresh(),this):this._querySettings.query},View.prototype.queryOptions=function(t,e){return void 0!==t?(this._querySettings.options=t,void 0===t.$decouple&&(t.$decouple=!0),void 0===e||e===!0?this.refresh():this.rebuildActiveBucket(t.$orderBy),this):this._querySettings.options},View.prototype.rebuildActiveBucket=function(t){if(t){var e=this._privateData._data,i=e.length;this._activeBucket=new ActiveBucket(t),this._activeBucket.primaryKey(this._privateData.primaryKey());for(var r=0;i>r;r++)this._activeBucket.insert(e[r])}else delete this._activeBucket},View.prototype.refresh=function(){if(this._from){var t=this.publicData();this._privateData.remove(),t.remove(),this._privateData.insert(this._from.find(this._querySettings.query,this._querySettings.options)),t._linked}return this._querySettings.options&&this._querySettings.options.$orderBy?this.rebuildActiveBucket(this._querySettings.options.$orderBy):this.rebuildActiveBucket(),this},View.prototype.count=function(){return this._privateData&&this._privateData._data?this._privateData._data.length:0},View.prototype.transform=function(t){return void 0!==t?("object"==typeof t?(void 0!==t.enabled&&(this._transformEnabled=t.enabled),void 0!==t.dataIn&&(this._transformIn=t.dataIn),void 0!==t.dataOut&&(this._transformOut=t.dataOut)):this._transformEnabled=t===!1?!1:!0,this._transformPrimaryKey(this.privateData().primaryKey()),this._transformSetData(this.privateData().find()),this):{enabled:this._transformEnabled,dataIn:this._transformIn,dataOut:this._transformOut}},View.prototype.privateData=function(){return this._privateData},View.prototype.publicData=function(){return this._transformEnabled?this._publicData:this._privateData},View.prototype._transformSetData=function(t){this._transformEnabled&&(this._publicData=new Collection("__FDB__view_publicData_"+this._name),this._publicData.db(this._privateData._db),this._publicData.transform({enabled:!0,dataIn:this._transformIn,dataOut:this._transformOut}),this._publicData.setData(t))},View.prototype._transformInsert=function(t,e){this._transformEnabled&&this._publicData&&this._publicData.insert(t,e)},View.prototype._transformUpdate=function(t,e,i){this._transformEnabled&&this._publicData&&this._publicData.update(t,e,i)},View.prototype._transformRemove=function(t,e){this._transformEnabled&&this._publicData&&this._publicData.remove(t,e)},View.prototype._transformPrimaryKey=function(t){this._transformEnabled&&this._publicData&&this._publicData.primaryKey(t)},Collection.prototype.init=function(){this._views=[],CollectionInit.apply(this,arguments)},Collection.prototype.view=function(t,e,i){if(this._db&&this._db._views){if(this._db._views[t])throw"Cannot create a view using this collection because one with this name already exists: "+t;var r=new View(t,e,i).db(this._db)._addCollection(this);return this._views=this._views||[],this._views.push(r),r}},Collection.prototype._addView=CollectionGroup.prototype._addView=function(t){return void 0!==t&&this._views.push(t),this},Collection.prototype._removeView=CollectionGroup.prototype._removeView=function(t){if(void 0!==t){var e=this._views.indexOf(t);e>-1&&this._views.splice(e,1)}return this},Core.prototype.init=function(){this._views={},CoreInit.apply(this,arguments)},Core.prototype.view=function(t){return this._views[t]||(this.debug()||this._db&&this._db.debug())&&console.log("Core.View: Creating view "+t),this._views[t]=this._views[t]||new View(t).db(this),this._views[t]},Core.prototype.viewExists=function(t){return Boolean(this._views[t])},Core.prototype.views=function(){var t,e=[];for(t in this._views)this._views.hasOwnProperty(t)&&e.push({name:t,count:this._views[t].count()});return e},Shared.finishModule("View"),module.exports=View;
},{"./ActiveBucket":2,"./Collection":3,"./CollectionGroup":4,"./ReactorIO":23,"./Shared":24}],26:[function(_dereq_,module,exports){
'use strict';

var asap = _dereq_('asap')

module.exports = Promise
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":28}],27:[function(_dereq_,module,exports){
'use strict';

//This file contains then/promise specific extensions to the core promise API

var Promise = _dereq_('./core.js')
var asap = _dereq_('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Object.create(Promise.prototype)

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.from = Promise.cast = function (value) {
  var err = new Error('Promise.from and Promise.cast are deprecated, use Promise.resolve instead')
  err.name = 'Warning'
  console.warn(err.stack)
  return Promise.resolve(value)
}

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      fn.apply(self, args)
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    try {
      return fn.apply(this, arguments).nodeify(callback)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback(ex)
        })
      }
    }
  }
}

Promise.all = function () {
  var calledWithArray = arguments.length === 1 && Array.isArray(arguments[0])
  var args = Array.prototype.slice.call(calledWithArray ? arguments[0] : arguments)

  if (!calledWithArray) {
    var err = new Error('Promise.all should be called with a single array, calling it with multiple arguments is deprecated')
    err.name = 'Warning'
    console.warn(err.stack)
  }

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}

Promise.prototype.nodeify = function (callback) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback(null, value)
    })
  }, function (err) {
    asap(function () {
      callback(err)
    })
  })
}

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":26,"asap":28}],28:[function(_dereq_,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,_dereq_('_process'))
},{"_process":33}],29:[function(_dereq_,module,exports){
// Some code originally from async_storage.js in
// [Gaia](https://github.com/mozilla-b2g/gaia).
(function() {
    'use strict';

    // Originally found in https://github.com/mozilla-b2g/gaia/blob/e8f624e4cc9ea945727278039b3bc9bcb9f8667a/shared/js/async_storage.js

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  _dereq_('promise') : this.Promise;

    // Initialize IndexedDB; fall back to vendor-prefixed versions if needed.
    var indexedDB = indexedDB || this.indexedDB || this.webkitIndexedDB ||
                    this.mozIndexedDB || this.OIndexedDB ||
                    this.msIndexedDB;

    // If IndexedDB isn't available, we get outta here!
    if (!indexedDB) {
        return;
    }

    // Open the IndexedDB database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        return new Promise(function(resolve, reject) {
            var openreq = indexedDB.open(dbInfo.name, dbInfo.version);
            openreq.onerror = function() {
                reject(openreq.error);
            };
            openreq.onupgradeneeded = function() {
                // First time setup: create an empty object store
                openreq.result.createObjectStore(dbInfo.storeName);
            };
            openreq.onsuccess = function() {
                dbInfo.db = openreq.result;
                self._dbInfo = dbInfo;
                resolve();
            };
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);
                var req = store.get(key);

                req.onsuccess = function() {
                    var value = req.result;
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readwrite')
                              .objectStore(dbInfo.storeName);

                // The reason we don't _save_ null is because IE 10 does
                // not support saving the `null` type in IndexedDB. How
                // ironic, given the bug below!
                // See: https://github.com/mozilla/localForage/issues/161
                if (value === null) {
                    value = undefined;
                }

                var req = store.put(value, key);
                req.onsuccess = function() {
                    // Cast to undefined so the value passed to
                    // callback/promise is the same as what one would get out
                    // of `getItem()` later. This leads to some weirdness
                    // (setItem('foo', undefined) will return `null`), but
                    // it's not my fault localStorage is our baseline and that
                    // it's weird.
                    if (value === undefined) {
                        value = null;
                    }

                    resolve(value);
                };
                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readwrite')
                              .objectStore(dbInfo.storeName);

                // We use a Grunt task to make this safe for IE and some
                // versions of Android (including those used by Cordova).
                // Normally IE won't like `.delete()` and will insist on
                // using `['delete']()`, but we have a build step that
                // fixes this for us now.
                var req = store.delete(key);
                req.onsuccess = function() {
                    resolve();
                };

                req.onerror = function() {
                    reject(req.error);
                };

                // The request will be aborted if we've exceeded our storage
                // space. In this case, we will reject with a specific
                // "QuotaExceededError".
                req.onabort = function(event) {
                    var error = event.target.error;
                    if (error === 'QuotaExceededError') {
                        reject(error);
                    }
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readwrite')
                              .objectStore(dbInfo.storeName);
                var req = store.clear();

                req.onsuccess = function() {
                    resolve();
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeDeferedCallback(promise, callback);
        return promise;
    }

    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);
                var req = store.count();

                req.onsuccess = function() {
                    resolve(req.result);
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            if (n < 0) {
                resolve(null);

                return;
            }

            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var advanced = false;
                var req = store.openCursor();
                req.onsuccess = function() {
                    var cursor = req.result;
                    if (!cursor) {
                        // this means there weren't enough keys
                        resolve(null);

                        return;
                    }

                    if (n === 0) {
                        // We have the first key, return it if that's what they
                        // wanted.
                        resolve(cursor.key);
                    } else {
                        if (!advanced) {
                            // Otherwise, ask the cursor to skip ahead n
                            // records.
                            advanced = true;
                            cursor.advance(n);
                        } else {
                            // When we get here, we've got the nth key.
                            resolve(cursor.key);
                        }
                    }
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var store = dbInfo.db.transaction(dbInfo.storeName, 'readonly')
                              .objectStore(dbInfo.storeName);

                var req = store.openCursor();
                var keys = [];

                req.onsuccess = function() {
                    var cursor = req.result;

                    if (!cursor) {
                        resolve(keys);
                        return;
                    }

                    keys.push(cursor.key);
                    cursor.continue();
                };

                req.onerror = function() {
                    reject(req.error);
                };
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    function executeDeferedCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                deferCallback(callback, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    // Under Chrome the callback is called before the changes (save, clear)
    // are actually made. So we use a defer function which wait that the
    // call stack to be empty.
    // For more info : https://github.com/mozilla/localForage/issues/175
    // Pull request : https://github.com/mozilla/localForage/pull/178
    function deferCallback(callback, result) {
        if (callback) {
            return setTimeout(function() {
                return callback(null, result);
            }, 0);
        }
    }

    var asyncStorage = {
        _driver: 'asyncStorage',
        _initStorage: _initStorage,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof define === 'function' && define.amd) {
        define('asyncStorage', function() {
            return asyncStorage;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = asyncStorage;
    } else {
        this.asyncStorage = asyncStorage;
    }
}).call(window);

},{"promise":27}],30:[function(_dereq_,module,exports){
// If IndexedDB isn't available, we'll fall back to localStorage.
// Note that this will have considerable performance and storage
// side-effects (all data will be serialized on save and only data that
// can be converted to a string via `JSON.stringify()` will be saved).
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  _dereq_('promise') : this.Promise;
    var localStorage = null;

    // If the app is running inside a Google Chrome packaged webapp, or some
    // other context where localStorage isn't available, we don't use
    // localStorage. This feature detection is preferred over the old
    // `if (window.chrome && window.chrome.runtime)` code.
    // See: https://github.com/mozilla/localForage/issues/68
    try {
        // If localStorage isn't available, we get outta here!
        // This should be inside a try catch
        if (!this.localStorage || !('setItem' in this.localStorage)) {
            return;
        }
        // Initialize localStorage and create a variable to use throughout
        // the code.
        localStorage = this.localStorage;
    } catch (e) {
        return;
    }

    // Config the localStorage backend, using options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {};
        if (options) {
            for (var i in options) {
                dbInfo[i] = options[i];
            }
        }

        dbInfo.keyPrefix = dbInfo.name + '/';

        self._dbInfo = dbInfo;
        return Promise.resolve();
    }

    var SERIALIZED_MARKER = '__lfsc__:';
    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

    // OMG the serializations!
    var TYPE_ARRAYBUFFER = 'arbf';
    var TYPE_BLOB = 'blob';
    var TYPE_INT8ARRAY = 'si08';
    var TYPE_UINT8ARRAY = 'ui08';
    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
    var TYPE_INT16ARRAY = 'si16';
    var TYPE_INT32ARRAY = 'si32';
    var TYPE_UINT16ARRAY = 'ur16';
    var TYPE_UINT32ARRAY = 'ui32';
    var TYPE_FLOAT32ARRAY = 'fl32';
    var TYPE_FLOAT64ARRAY = 'fl64';
    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH +
                                        TYPE_ARRAYBUFFER.length;

    // Remove all keys from the datastore, effectively destroying all data in
    // the app's key/value store!
    function clear(callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var keyPrefix = self._dbInfo.keyPrefix;

                for (var i = localStorage.length - 1; i >= 0; i--) {
                    var key = localStorage.key(i);

                    if (key.indexOf(keyPrefix) === 0) {
                        localStorage.removeItem(key);
                    }
                }

                resolve();
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Retrieve an item from the store. Unlike the original async_storage
    // library in Gaia, we don't modify return values at all. If a key's value
    // is `undefined`, we pass that value to the callback function.
    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                try {
                    var dbInfo = self._dbInfo;
                    var result = localStorage.getItem(dbInfo.keyPrefix + key);

                    // If a result was found, parse it from the serialized
                    // string into a JS object. If result isn't truthy, the key
                    // is likely undefined and we'll pass it straight to the
                    // callback.
                    if (result) {
                        result = _deserialize(result);
                    }

                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Same as localStorage's key() method, except takes a callback.
    function key(n, callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var result;
                try {
                    result = localStorage.key(n);
                } catch (error) {
                    result = null;
                }

                // Remove the prefix from the key, if a key is found.
                if (result) {
                    result = result.substring(dbInfo.keyPrefix.length);
                }

                resolve(result);
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                var length = localStorage.length;
                var keys = [];

                for (var i = 0; i < length; i++) {
                    if (localStorage.key(i).indexOf(dbInfo.keyPrefix) === 0) {
                        keys.push(localStorage.key(i).substring(dbInfo.keyPrefix.length));
                    }
                }

                resolve(keys);
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Supply the number of keys in the datastore to the callback function.
    function length(callback) {
        var self = this;
        var promise = new Promise(function(resolve, reject) {
            self.keys().then(function(keys) {
                resolve(keys.length);
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Remove an item from the store, nice and simple.
    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                localStorage.removeItem(dbInfo.keyPrefix + key);

                resolve();
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Deserialize data we've inserted into a value column/field. We place
    // special markers into our strings to mark them as encoded; this isn't
    // as nice as a meta field, but it's the only sane thing we can do whilst
    // keeping localStorage support intact.
    //
    // Oftentimes this will just deserialize JSON content, but if we have a
    // special marker (SERIALIZED_MARKER, defined above), we will extract
    // some kind of arraybuffer/binary data/typed array out of the string.
    function _deserialize(value) {
        // If we haven't marked this string as being specially serialized (i.e.
        // something other than serialized JSON), we can just return it and be
        // done with it.
        if (value.substring(0,
            SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
            return JSON.parse(value);
        }

        // The following code deals with deserializing some kind of Blob or
        // TypedArray. First we separate out the type of data we're dealing
        // with from the data itself.
        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
        var type = value.substring(SERIALIZED_MARKER_LENGTH,
                                   TYPE_SERIALIZED_MARKER_LENGTH);

        // Fill the string into a ArrayBuffer.
        // 2 bytes for each char.
        var buffer = new ArrayBuffer(serializedString.length * 2);
        var bufferView = new Uint16Array(buffer);
        for (var i = serializedString.length - 1; i >= 0; i--) {
            bufferView[i] = serializedString.charCodeAt(i);
        }

        // Return the right type based on the code/type set during
        // serialization.
        switch (type) {
            case TYPE_ARRAYBUFFER:
                return buffer;
            case TYPE_BLOB:
                return new Blob([buffer]);
            case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
            case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
            case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
            case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
            case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
            case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
            case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
            case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
            case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
            default:
                throw new Error('Unkown type: ' + type);
        }
    }

    // Converts a buffer to a string to store, serialized, in the backend
    // storage library.
    function _bufferToString(buffer) {
        var str = '';
        var uint16Array = new Uint16Array(buffer);

        try {
            str = String.fromCharCode.apply(null, uint16Array);
        } catch (e) {
            // This is a fallback implementation in case the first one does
            // not work. This is required to get the phantomjs passing...
            for (var i = 0; i < uint16Array.length; i++) {
                str += String.fromCharCode(uint16Array[i]);
            }
        }

        return str;
    }

    // Serialize a value, afterwards executing a callback (which usually
    // instructs the `setItem()` callback/promise to be executed). This is how
    // we store binary data with localStorage.
    function _serialize(value, callback) {
        var valueString = '';
        if (value) {
            valueString = value.toString();
        }

        // Cannot use `value instanceof ArrayBuffer` or such here, as these
        // checks fail when running the tests using casper.js...
        //
        // TODO: See why those tests fail and use a better solution.
        if (value && (value.toString() === '[object ArrayBuffer]' ||
                      value.buffer &&
                      value.buffer.toString() === '[object ArrayBuffer]')) {
            // Convert binary arrays to a string and prefix the string with
            // a special marker.
            var buffer;
            var marker = SERIALIZED_MARKER;

            if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
            } else {
                buffer = value.buffer;

                if (valueString === '[object Int8Array]') {
                    marker += TYPE_INT8ARRAY;
                } else if (valueString === '[object Uint8Array]') {
                    marker += TYPE_UINT8ARRAY;
                } else if (valueString === '[object Uint8ClampedArray]') {
                    marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueString === '[object Int16Array]') {
                    marker += TYPE_INT16ARRAY;
                } else if (valueString === '[object Uint16Array]') {
                    marker += TYPE_UINT16ARRAY;
                } else if (valueString === '[object Int32Array]') {
                    marker += TYPE_INT32ARRAY;
                } else if (valueString === '[object Uint32Array]') {
                    marker += TYPE_UINT32ARRAY;
                } else if (valueString === '[object Float32Array]') {
                    marker += TYPE_FLOAT32ARRAY;
                } else if (valueString === '[object Float64Array]') {
                    marker += TYPE_FLOAT64ARRAY;
                } else {
                    callback(new Error('Failed to get type for BinaryArray'));
                }
            }

            callback(marker + _bufferToString(buffer));
        } else if (valueString === '[object Blob]') {
            // Conver the blob to a binaryArray and then to a string.
            var fileReader = new FileReader();

            fileReader.onload = function() {
                var str = _bufferToString(this.result);

                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
            };

            fileReader.readAsArrayBuffer(value);
        } else {
            try {
                callback(JSON.stringify(value));
            } catch (e) {
                window.console.error("Couldn't convert value into a JSON " +
                                     'string: ', value);

                callback(e);
            }
        }
    }

    // Set a key's value and run an optional callback once the value is set.
    // Unlike Gaia's implementation, the callback function is passed the value,
    // in case you want to operate on that value only after you're sure it
    // saved, or something like that.
    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                // Convert undefined values to null.
                // https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                var originalValue = value;

                _serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        try {
                            var dbInfo = self._dbInfo;
                            localStorage.setItem(dbInfo.keyPrefix + key, value);
                        } catch (e) {
                            // localStorage capacity exceeded.
                            // TODO: Make this a specific error/event.
                            if (e.name === 'QuotaExceededError' ||
                                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                                reject(e);
                            }
                        }

                        resolve(originalValue);
                    }
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var localStorageWrapper = {
        _driver: 'localStorageWrapper',
        _initStorage: _initStorage,
        // Default API, from Gaia/localStorage.
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof define === 'function' && define.amd) {
        define('localStorageWrapper', function() {
            return localStorageWrapper;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = localStorageWrapper;
    } else {
        this.localStorageWrapper = localStorageWrapper;
    }
}).call(window);

},{"promise":27}],31:[function(_dereq_,module,exports){
/*
 * Includes code from:
 *
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */
(function() {
    'use strict';

    // Sadly, the best way to save binary data in WebSQL is Base64 serializing
    // it, so this is how we store it to prevent very strange errors with less
    // verbose ways of binary <-> string data storage.
    var BASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  _dereq_('promise') : this.Promise;

    var openDatabase = this.openDatabase;

    var SERIALIZED_MARKER = '__lfsc__:';
    var SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

    // OMG the serializations!
    var TYPE_ARRAYBUFFER = 'arbf';
    var TYPE_BLOB = 'blob';
    var TYPE_INT8ARRAY = 'si08';
    var TYPE_UINT8ARRAY = 'ui08';
    var TYPE_UINT8CLAMPEDARRAY = 'uic8';
    var TYPE_INT16ARRAY = 'si16';
    var TYPE_INT32ARRAY = 'si32';
    var TYPE_UINT16ARRAY = 'ur16';
    var TYPE_UINT32ARRAY = 'ui32';
    var TYPE_FLOAT32ARRAY = 'fl32';
    var TYPE_FLOAT64ARRAY = 'fl64';
    var TYPE_SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER_LENGTH +
                                        TYPE_ARRAYBUFFER.length;

    // If WebSQL methods aren't available, we can stop now.
    if (!openDatabase) {
        return;
    }

    // Open the WebSQL database (automatically creates one if one didn't
    // previously exist), using any options set in the config.
    function _initStorage(options) {
        var self = this;
        var dbInfo = {
            db: null
        };

        if (options) {
            for (var i in options) {
                dbInfo[i] = typeof(options[i]) !== 'string' ?
                            options[i].toString() : options[i];
            }
        }

        return new Promise(function(resolve, reject) {
            // Open the database; the openDatabase API will automatically
            // create it for us if it doesn't exist.
            try {
                dbInfo.db = openDatabase(dbInfo.name, String(dbInfo.version),
                                         dbInfo.description, dbInfo.size);
            } catch (e) {
                return self.setDriver('localStorageWrapper')
                    .then(function() {
                        return self._initStorage(options);
                    })
                    .then(resolve)
                    .catch(reject);
            }

            // Create our key/value table if it doesn't exist.
            dbInfo.db.transaction(function(t) {
                t.executeSql('CREATE TABLE IF NOT EXISTS ' + dbInfo.storeName +
                             ' (id INTEGER PRIMARY KEY, key unique, value)', [],
                             function() {
                    self._dbInfo = dbInfo;
                    resolve();
                }, function(t, error) {
                    reject(error);
                });
            });
        });
    }

    function getItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT * FROM ' + dbInfo.storeName +
                                 ' WHERE key = ? LIMIT 1', [key],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).value : null;

                        // Check to see if this is serialized content we need to
                        // unpack.
                        if (result) {
                            result = _deserialize(result);
                        }

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function setItem(key, value, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                // The localStorage API doesn't return undefined values in an
                // "expected" way, so undefined is always cast to null in all
                // drivers. See: https://github.com/mozilla/localForage/pull/42
                if (value === undefined) {
                    value = null;
                }

                // Save the original value to pass to the callback.
                var originalValue = value;

                _serialize(value, function(value, error) {
                    if (error) {
                        reject(error);
                    } else {
                        var dbInfo = self._dbInfo;
                        dbInfo.db.transaction(function(t) {
                            t.executeSql('INSERT OR REPLACE INTO ' +
                                         dbInfo.storeName +
                                         ' (key, value) VALUES (?, ?)',
                                         [key, value], function() {
                                resolve(originalValue);
                            }, function(t, error) {
                                reject(error);
                            });
                        }, function(sqlError) { // The transaction failed; check
                                                // to see if it's a quota error.
                            if (sqlError.code === sqlError.QUOTA_ERR) {
                                // We reject the callback outright for now, but
                                // it's worth trying to re-run the transaction.
                                // Even if the user accepts the prompt to use
                                // more storage on Safari, this error will
                                // be called.
                                //
                                // TODO: Try to re-run the transaction.
                                reject(sqlError);
                            }
                        });
                    }
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function removeItem(key, callback) {
        var self = this;

        // Cast the key to a string, as that's all we can set as a key.
        if (typeof key !== 'string') {
            window.console.warn(key +
                                ' used as a key, but it is not a string.');
            key = String(key);
        }

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName +
                                 ' WHERE key = ?', [key], function() {

                        resolve();
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Deletes every item in the table.
    // TODO: Find out if this resets the AUTO_INCREMENT number.
    function clear(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('DELETE FROM ' + dbInfo.storeName, [],
                                 function() {
                        resolve();
                    }, function(t, error) {
                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Does a simple `COUNT(key)` to get the number of items stored in
    // localForage.
    function length(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    // Ahhh, SQL makes this one soooooo easy.
                    t.executeSql('SELECT COUNT(key) as c FROM ' +
                                 dbInfo.storeName, [], function(t, results) {
                        var result = results.rows.item(0).c;

                        resolve(result);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Return the key located at key index X; essentially gets the key from a
    // `WHERE id = ?`. This is the most efficient way I can think to implement
    // this rarely-used (in my experience) part of the API, but it can seem
    // inconsistent, because we do `INSERT OR REPLACE INTO` on `setItem()`, so
    // the ID of each key will change every time it's updated. Perhaps a stored
    // procedure for the `setItem()` SQL would solve this problem?
    // TODO: Don't change ID on `setItem()`.
    function key(n, callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName +
                                 ' WHERE id = ? LIMIT 1', [n + 1],
                                 function(t, results) {
                        var result = results.rows.length ?
                                     results.rows.item(0).key : null;
                        resolve(result);
                    }, function(t, error) {
                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    function keys(callback) {
        var self = this;

        var promise = new Promise(function(resolve, reject) {
            self.ready().then(function() {
                var dbInfo = self._dbInfo;
                dbInfo.db.transaction(function(t) {
                    t.executeSql('SELECT key FROM ' + dbInfo.storeName, [],
                                 function(t, results) {
                        var keys = [];

                        for (var i = 0; i < results.rows.length; i++) {
                            keys.push(results.rows.item(i).key);
                        }

                        resolve(keys);
                    }, function(t, error) {

                        reject(error);
                    });
                });
            }).catch(reject);
        });

        executeCallback(promise, callback);
        return promise;
    }

    // Converts a buffer to a string to store, serialized, in the backend
    // storage library.
    function _bufferToString(buffer) {
        // base64-arraybuffer
        var bytes = new Uint8Array(buffer);
        var i;
        var base64String = '';

        for (i = 0; i < bytes.length; i += 3) {
            /*jslint bitwise: true */
            base64String += BASE_CHARS[bytes[i] >> 2];
            base64String += BASE_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64String += BASE_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64String += BASE_CHARS[bytes[i + 2] & 63];
        }

        if ((bytes.length % 3) === 2) {
            base64String = base64String.substring(0, base64String.length - 1) + '=';
        } else if (bytes.length % 3 === 1) {
            base64String = base64String.substring(0, base64String.length - 2) + '==';
        }

        return base64String;
    }

    // Deserialize data we've inserted into a value column/field. We place
    // special markers into our strings to mark them as encoded; this isn't
    // as nice as a meta field, but it's the only sane thing we can do whilst
    // keeping localStorage support intact.
    //
    // Oftentimes this will just deserialize JSON content, but if we have a
    // special marker (SERIALIZED_MARKER, defined above), we will extract
    // some kind of arraybuffer/binary data/typed array out of the string.
    function _deserialize(value) {
        // If we haven't marked this string as being specially serialized (i.e.
        // something other than serialized JSON), we can just return it and be
        // done with it.
        if (value.substring(0,
                            SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
            return JSON.parse(value);
        }

        // The following code deals with deserializing some kind of Blob or
        // TypedArray. First we separate out the type of data we're dealing
        // with from the data itself.
        var serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
        var type = value.substring(SERIALIZED_MARKER_LENGTH,
                                   TYPE_SERIALIZED_MARKER_LENGTH);

        // Fill the string into a ArrayBuffer.
        var bufferLength = serializedString.length * 0.75;
        var len = serializedString.length;
        var i;
        var p = 0;
        var encoded1, encoded2, encoded3, encoded4;

        if (serializedString[serializedString.length - 1] === '=') {
            bufferLength--;
            if (serializedString[serializedString.length - 2] === '=') {
                bufferLength--;
            }
        }

        var buffer = new ArrayBuffer(bufferLength);
        var bytes = new Uint8Array(buffer);

        for (i = 0; i < len; i+=4) {
            encoded1 = BASE_CHARS.indexOf(serializedString[i]);
            encoded2 = BASE_CHARS.indexOf(serializedString[i+1]);
            encoded3 = BASE_CHARS.indexOf(serializedString[i+2]);
            encoded4 = BASE_CHARS.indexOf(serializedString[i+3]);

            /*jslint bitwise: true */
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        // Return the right type based on the code/type set during
        // serialization.
        switch (type) {
            case TYPE_ARRAYBUFFER:
                return buffer;
            case TYPE_BLOB:
                return new Blob([buffer]);
            case TYPE_INT8ARRAY:
                return new Int8Array(buffer);
            case TYPE_UINT8ARRAY:
                return new Uint8Array(buffer);
            case TYPE_UINT8CLAMPEDARRAY:
                return new Uint8ClampedArray(buffer);
            case TYPE_INT16ARRAY:
                return new Int16Array(buffer);
            case TYPE_UINT16ARRAY:
                return new Uint16Array(buffer);
            case TYPE_INT32ARRAY:
                return new Int32Array(buffer);
            case TYPE_UINT32ARRAY:
                return new Uint32Array(buffer);
            case TYPE_FLOAT32ARRAY:
                return new Float32Array(buffer);
            case TYPE_FLOAT64ARRAY:
                return new Float64Array(buffer);
            default:
                throw new Error('Unkown type: ' + type);
        }
    }

    // Serialize a value, afterwards executing a callback (which usually
    // instructs the `setItem()` callback/promise to be executed). This is how
    // we store binary data with localStorage.
    function _serialize(value, callback) {
        var valueString = '';
        if (value) {
            valueString = value.toString();
        }

        // Cannot use `value instanceof ArrayBuffer` or such here, as these
        // checks fail when running the tests using casper.js...
        //
        // TODO: See why those tests fail and use a better solution.
        if (value && (value.toString() === '[object ArrayBuffer]' ||
                      value.buffer &&
                      value.buffer.toString() === '[object ArrayBuffer]')) {
            // Convert binary arrays to a string and prefix the string with
            // a special marker.
            var buffer;
            var marker = SERIALIZED_MARKER;

            if (value instanceof ArrayBuffer) {
                buffer = value;
                marker += TYPE_ARRAYBUFFER;
            } else {
                buffer = value.buffer;

                if (valueString === '[object Int8Array]') {
                    marker += TYPE_INT8ARRAY;
                } else if (valueString === '[object Uint8Array]') {
                    marker += TYPE_UINT8ARRAY;
                } else if (valueString === '[object Uint8ClampedArray]') {
                    marker += TYPE_UINT8CLAMPEDARRAY;
                } else if (valueString === '[object Int16Array]') {
                    marker += TYPE_INT16ARRAY;
                } else if (valueString === '[object Uint16Array]') {
                    marker += TYPE_UINT16ARRAY;
                } else if (valueString === '[object Int32Array]') {
                    marker += TYPE_INT32ARRAY;
                } else if (valueString === '[object Uint32Array]') {
                    marker += TYPE_UINT32ARRAY;
                } else if (valueString === '[object Float32Array]') {
                    marker += TYPE_FLOAT32ARRAY;
                } else if (valueString === '[object Float64Array]') {
                    marker += TYPE_FLOAT64ARRAY;
                } else {
                    callback(new Error('Failed to get type for BinaryArray'));
                }
            }

            callback(marker + _bufferToString(buffer));
        } else if (valueString === '[object Blob]') {
            // Conver the blob to a binaryArray and then to a string.
            var fileReader = new FileReader();

            fileReader.onload = function() {
                var str = _bufferToString(this.result);

                callback(SERIALIZED_MARKER + TYPE_BLOB + str);
            };

            fileReader.readAsArrayBuffer(value);
        } else {
            try {
                callback(JSON.stringify(value));
            } catch (e) {
                window.console.error("Couldn't convert value into a JSON " +
                                     'string: ', value);

                callback(null, e);
            }
        }
    }

    function executeCallback(promise, callback) {
        if (callback) {
            promise.then(function(result) {
                callback(null, result);
            }, function(error) {
                callback(error);
            });
        }
    }

    var webSQLStorage = {
        _driver: 'webSQLStorage',
        _initStorage: _initStorage,
        getItem: getItem,
        setItem: setItem,
        removeItem: removeItem,
        clear: clear,
        length: length,
        key: key,
        keys: keys
    };

    if (typeof define === 'function' && define.amd) {
        define('webSQLStorage', function() {
            return webSQLStorage;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = webSQLStorage;
    } else {
        this.webSQLStorage = webSQLStorage;
    }
}).call(window);

},{"promise":27}],32:[function(_dereq_,module,exports){
(function() {
    'use strict';

    // Promises!
    var Promise = (typeof module !== 'undefined' && module.exports) ?
                  _dereq_('promise') : this.Promise;

    // Custom drivers are stored here when `defineDriver()` is called.
    // They are shared across all instances of localForage.
    var CustomDrivers = {};

    var DriverType = {
        INDEXEDDB: 'asyncStorage',
        LOCALSTORAGE: 'localStorageWrapper',
        WEBSQL: 'webSQLStorage'
    };

    var DefaultDriverOrder = [
        DriverType.INDEXEDDB,
        DriverType.WEBSQL,
        DriverType.LOCALSTORAGE
    ];

    var LibraryMethods = [
        'clear',
        'getItem',
        'key',
        'keys',
        'length',
        'removeItem',
        'setItem'
    ];

    var ModuleType = {
        DEFINE: 1,
        EXPORT: 2,
        WINDOW: 3
    };

    var DefaultConfig = {
        description: '',
        driver: DefaultDriverOrder.slice(),
        name: 'localforage',
        // Default DB size is _JUST UNDER_ 5MB, as it's the highest size
        // we can use without a prompt.
        size: 4980736,
        storeName: 'keyvaluepairs',
        version: 1.0
    };

    // Attaching to window (i.e. no module loader) is the assumed,
    // simple default.
    var moduleType = ModuleType.WINDOW;

    // Find out what kind of module setup we have; if none, we'll just attach
    // localForage to the main window.
    if (typeof define === 'function' && define.amd) {
        moduleType = ModuleType.DEFINE;
    } else if (typeof module !== 'undefined' && module.exports) {
        moduleType = ModuleType.EXPORT;
    }

    // Check to see if IndexedDB is available and if it is the latest
    // implementation; it's our preferred backend library. We use "_spec_test"
    // as the name of the database because it's not the one we'll operate on,
    // but it's useful to make sure its using the right spec.
    // See: https://github.com/mozilla/localForage/issues/128
    var driverSupport = (function(self) {
        // Initialize IndexedDB; fall back to vendor-prefixed versions
        // if needed.
        var indexedDB = indexedDB || self.indexedDB || self.webkitIndexedDB ||
                        self.mozIndexedDB || self.OIndexedDB ||
                        self.msIndexedDB;

        var result = {};

        result[DriverType.WEBSQL] = !!self.openDatabase;
        result[DriverType.INDEXEDDB] = !!(function() {
            // We mimic PouchDB here; just UA test for Safari (which, as of
            // iOS 8/Yosemite, doesn't properly support IndexedDB).
            // IndexedDB support is broken and different from Blink's.
            // This is faster than the test case (and it's sync), so we just
            // do this. *SIGH*
            // http://bl.ocks.org/nolanlawson/raw/c83e9039edf2278047e9/
            //
            // We test for openDatabase because IE Mobile identifies itself
            // as Safari. Oh the lulz...
            if (typeof self.openDatabase !== 'undefined' && self.navigator &&
                self.navigator.userAgent &&
                /Safari/.test(self.navigator.userAgent) &&
                !/Chrome/.test(self.navigator.userAgent)) {
                return false;
            }
            try {
                return indexedDB &&
                       typeof indexedDB.open === 'function' &&
                       // Some Samsung/HTC Android 4.0-4.3 devices
                       // have older IndexedDB specs; if this isn't available
                       // their IndexedDB is too old for us to use.
                       // (Replaces the onupgradeneeded test.)
                       typeof self.IDBKeyRange !== 'undefined';
            } catch (e) {
                return false;
            }
        })();

        result[DriverType.LOCALSTORAGE] = !!(function() {
            try {
                return (self.localStorage &&
                        ('setItem' in self.localStorage) &&
                        (self.localStorage.setItem));
            } catch (e) {
                return false;
            }
        })();

        return result;
    })(this);

    var isArray = Array.isArray || function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };

    function callWhenReady(localForageInstance, libraryMethod) {
        localForageInstance[libraryMethod] = function() {
            var _args = arguments;
            return localForageInstance.ready().then(function() {
                return localForageInstance[libraryMethod].apply(localForageInstance, _args);
            });
        };
    }

    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            var arg = arguments[i];

            if (arg) {
                for (var key in arg) {
                    if (arg.hasOwnProperty(key)) {
                        if (isArray(arg[key])) {
                            arguments[0][key] = arg[key].slice();
                        } else {
                            arguments[0][key] = arg[key];
                        }
                    }
                }
            }
        }

        return arguments[0];
    }

    function isLibraryDriver(driverName) {
        for (var driver in DriverType) {
            if (DriverType.hasOwnProperty(driver) &&
                DriverType[driver] === driverName) {
                return true;
            }
        }

        return false;
    }

    var globalObject = this;

    function LocalForage(options) {
        this._config = extend({}, DefaultConfig, options);
        this._driverSet = null;
        this._ready = false;
        this._dbInfo = null;

        // Add a stub for each driver API method that delays the call to the
        // corresponding driver method until localForage is ready. These stubs
        // will be replaced by the driver methods as soon as the driver is
        // loaded, so there is no performance impact.
        for (var i = 0; i < LibraryMethods.length; i++) {
            callWhenReady(this, LibraryMethods[i]);
        }

        this.setDriver(this._config.driver);
    }

    LocalForage.prototype.INDEXEDDB = DriverType.INDEXEDDB;
    LocalForage.prototype.LOCALSTORAGE = DriverType.LOCALSTORAGE;
    LocalForage.prototype.WEBSQL = DriverType.WEBSQL;

    // Set any config values for localForage; can be called anytime before
    // the first API call (e.g. `getItem`, `setItem`).
    // We loop through options so we don't overwrite existing config
    // values.
    LocalForage.prototype.config = function(options) {
        // If the options argument is an object, we use it to set values.
        // Otherwise, we return either a specified config value or all
        // config values.
        if (typeof(options) === 'object') {
            // If localforage is ready and fully initialized, we can't set
            // any new configuration values. Instead, we return an error.
            if (this._ready) {
                return new Error("Can't call config() after localforage " +
                                 'has been used.');
            }

            for (var i in options) {
                if (i === 'storeName') {
                    options[i] = options[i].replace(/\W/g, '_');
                }

                this._config[i] = options[i];
            }

            // after all config options are set and
            // the driver option is used, try setting it
            if ('driver' in options && options.driver) {
                this.setDriver(this._config.driver);
            }

            return true;
        } else if (typeof(options) === 'string') {
            return this._config[options];
        } else {
            return this._config;
        }
    };

    // Used to define a custom driver, shared across all instances of
    // localForage.
    LocalForage.prototype.defineDriver = function(driverObject, callback,
                                                  errorCallback) {
        var defineDriver = new Promise(function(resolve, reject) {
            try {
                var driverName = driverObject._driver;
                var complianceError = new Error(
                    'Custom driver not compliant; see ' +
                    'https://mozilla.github.io/localForage/#definedriver'
                );
                var namingError = new Error(
                    'Custom driver name already in use: ' + driverObject._driver
                );

                // A driver name should be defined and not overlap with the
                // library-defined, default drivers.
                if (!driverObject._driver) {
                    reject(complianceError);
                    return;
                }
                if (isLibraryDriver(driverObject._driver)) {
                    reject(namingError);
                    return;
                }

                var customDriverMethods = LibraryMethods.concat('_initStorage');
                for (var i = 0; i < customDriverMethods.length; i++) {
                    var customDriverMethod = customDriverMethods[i];
                    if (!customDriverMethod ||
                        !driverObject[customDriverMethod] ||
                        typeof driverObject[customDriverMethod] !== 'function') {
                        reject(complianceError);
                        return;
                    }
                }

                var supportPromise = Promise.resolve(true);
                if ('_support'  in driverObject) {
                    if (driverObject._support && typeof driverObject._support === 'function') {
                        supportPromise = driverObject._support();
                    } else {
                        supportPromise = Promise.resolve(!!driverObject._support);
                    }
                }

                supportPromise.then(function(supportResult) {
                    driverSupport[driverName] = supportResult;
                    CustomDrivers[driverName] = driverObject;
                    resolve();
                }, reject);
            } catch (e) {
                reject(e);
            }
        });

        defineDriver.then(callback, errorCallback);
        return defineDriver;
    };

    LocalForage.prototype.driver = function() {
        return this._driver || null;
    };

    LocalForage.prototype.ready = function(callback) {
        var self = this;

        var ready = new Promise(function(resolve, reject) {
            self._driverSet.then(function() {
                if (self._ready === null) {
                    self._ready = self._initStorage(self._config);
                }

                self._ready.then(resolve, reject);
            }).catch(reject);
        });

        ready.then(callback, callback);
        return ready;
    };

    LocalForage.prototype.setDriver = function(drivers, callback,
                                               errorCallback) {
        var self = this;

        if (typeof drivers === 'string') {
            drivers = [drivers];
        }

        this._driverSet = new Promise(function(resolve, reject) {
            var driverName = self._getFirstSupportedDriver(drivers);
            var error = new Error('No available storage method found.');

            if (!driverName) {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            self._dbInfo = null;
            self._ready = null;

            if (isLibraryDriver(driverName)) {
                // We allow localForage to be declared as a module or as a
                // library available without AMD/require.js.
                if (moduleType === ModuleType.DEFINE) {
                    _dereq_([driverName], function(lib) {
                        self._extend(lib);

                        resolve();
                    });

                    return;
                } else if (moduleType === ModuleType.EXPORT) {
                    // Making it browserify friendly
                    var driver;
                    switch (driverName) {
                        case self.INDEXEDDB:
                            driver = _dereq_('./drivers/indexeddb');
                            break;
                        case self.LOCALSTORAGE:
                            driver = _dereq_('./drivers/localstorage');
                            break;
                        case self.WEBSQL:
                            driver = _dereq_('./drivers/websql');
                    }

                    self._extend(driver);
                } else {
                    self._extend(globalObject[driverName]);
                }
            } else if (CustomDrivers[driverName]) {
                self._extend(CustomDrivers[driverName]);
            } else {
                self._driverSet = Promise.reject(error);
                reject(error);
                return;
            }

            resolve();
        });

        function setDriverToConfig() {
            self._config.driver = self.driver();
        }
        this._driverSet.then(setDriverToConfig, setDriverToConfig);

        this._driverSet.then(callback, errorCallback);
        return this._driverSet;
    };

    LocalForage.prototype.supports = function(driverName) {
        return !!driverSupport[driverName];
    };

    LocalForage.prototype._extend = function(libraryMethodsAndProperties) {
        extend(this, libraryMethodsAndProperties);
    };

    // Used to determine which driver we should use as the backend for this
    // instance of localForage.
    LocalForage.prototype._getFirstSupportedDriver = function(drivers) {
        if (drivers && isArray(drivers)) {
            for (var i = 0; i < drivers.length; i++) {
                var driver = drivers[i];

                if (this.supports(driver)) {
                    return driver;
                }
            }
        }

        return null;
    };

    LocalForage.prototype.createInstance = function(options) {
        return new LocalForage(options);
    };

    // The actual localForage object that we expose as a module or via a
    // global. It's extended by pulling in one of our other libraries.
    var localForage = new LocalForage();

    // We allow localForage to be declared as a module or as a library
    // available without AMD/require.js.
    if (moduleType === ModuleType.DEFINE) {
        define('localforage', function() {
            return localForage;
        });
    } else if (moduleType === ModuleType.EXPORT) {
        module.exports = localForage;
    } else {
        this.localforage = localForage;
    }
}).call(window);

},{"./drivers/indexeddb":29,"./drivers/localstorage":30,"./drivers/websql":31,"promise":27}],33:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])(1)
});
