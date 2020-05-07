import CoreClass from "../core/CoreClass";
import {get as pathGet} from "@irrelon/path";
import ViolationCheckResult from "../ViolationCheckResult";
import WriteError from "../WriteError";

class IndexHashMap extends CoreClass {
	constructor (keys = {}, options = {}) {
		super();
		
		this._options = options;
		this._name = this._options.name || Object.entries(keys).reduce((name, [key, val]) => {
			name += "_" + key + ":" + val;
			return name;
		}, "");
		this._data = {};
		this.keys(keys);
	}
	
	keys (keys) {
		this._keys = keys;
		this._keyArr = Object.keys(keys);
	}
	
	documentHash (doc) {
		let hash = "";
		
		for (let i = 0; i < this._keyArr.length; i++) {
			if (hash) { hash += "_"; }
			hash += pathGet(doc, this._keyArr[i]);
		}
		
		return hash;
	}
	
	exists (hash) {
		return this._data[hash] && this._data[hash].length > 0;
	}
	
	willViolate (doc) {
		const hash = this.documentHash(doc);
		return this.willViolateByHash(hash);
	}
	
	willViolateByHash (hash) {
		return this._options.unique && this.exists(hash);
	}
	
	insert (doc) {
		const hash = this.documentHash(doc);
		const violationCheckResult = this.willViolateByHash(hash);
		if (violationCheckResult.error) {
			// This is a violation / collision
			return violationCheckResult;
		}
		
		this._data[hash] = this._data[hash] || [];
		this._data[hash].push(doc);
		
		return violationCheckResult;
	}
	
	remove (doc) {
		const hash = this.documentHash(doc);
		if (!this._data[hash]) return;
		
		const index = this._data[hash].indexOf(doc);
		
		if (index === -1) return;
		
		this._data[hash].splice(index, 1);
	}
}

export default IndexHashMap;