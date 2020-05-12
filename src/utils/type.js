/**
 * @typedef {"undefined"|"object"|"boolean"|"number"|"string"|"function"|"symbol"|"null"|"array"|"unknown"|"bigint"} TypeString
 */

/**
 * @typedef ExtendedTypeObject {Object}
 * @property isFlat {boolean} Is true if the type is non-recursive. Instances
 * such as Date or RegExp are considered flat as they do not contain sub-object
 * data that is usefully recursive.
 * @property {TypeString} type The name of the type
 * @property {string} [instance] If the type is an object, this will be the name
 * of the constructor as reported by obj.constructor.name.
 */

/**
 * Returns the type from the item passed. Similar to JavaScript's
 * built-in typeof except it will distinguish between arrays, nulls
 * and objects as well.
 * @param {*} item The item to get the type of.
 * @returns {TypeString}
 */
export const type = (item) => {
	if (item === null) {
		return 'null';
	}
	if (Array.isArray(item)) {
		return 'array';
	}
	
	return typeof item;
};

/**
 * Returns extended information about the type from the item passed.
 * Similar to JavaScript's built-in typeof except it will distinguish
 * between arrays, nulls and objects as well.
 * @param {*} item The item to get the type of.
 * @returns {ExtendedTypeObject} The extended type information object.
 */
export const extendedType = (item) => {
	const typeData = {
		isFlat: false,
		instance: "",
		type: "foo"
	};
	
	if (item === null) {
		typeData.type = 'null';
	} else if (Array.isArray(item)) {
		typeData.type = 'array';
	} else {
		typeData.type = typeof item;
		
		if (typeData.type === "object") {
			typeData.instance = item.constructor.name;
		}
	}
	
	if (typeData.type === "string" || typeData.type === "number" || typeData.type === "null" || typeData.type === "boolean" || typeData.instance === "Date" || typeData.instance === "RegExp") {
		typeData.isFlat = true;
	}
	
	return typeData;
};