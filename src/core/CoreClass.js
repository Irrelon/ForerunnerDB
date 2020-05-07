const _synth = {};

class CoreClass {
	/**
	 * Generates a generic getter/setter method for the passed method name.
	 * @param {String} name The name of the getter/setter to generate.
	 */
	synthesize (name) {
		_synth[name] = _synth[name] || function (val) {
			if (val !== undefined) {
				this['_' + name] = val;
				return this;
			}
			
			return this['_' + name];
		};
		
		return _synth[name];
	}
}

export default CoreClass;