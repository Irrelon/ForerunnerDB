let idCounter = 0;

/**
 * Generates a new 16-character hexadecimal unique ID or
 * generates a new 16-character hexadecimal ID based on
 * the passed string. Will always generate the same ID
 * for the same string.
 * @param {String=} str A string to generate the ID from.
 * @return {String} A string ID.
 */
const objectId = function (str) {
	const pow = Math.pow(10, 17);
	let id;
	
	if (!str) {
		idCounter++;
		
		id = (idCounter + (
			Math.random() * pow +
			Math.random() * pow +
			Math.random() * pow +
			Math.random() * pow
		)).toString(16);
	} else {
		const count = str.length;
		let val = 0;
		let i;
		
		for (i = 0; i < count; i++) {
			val += str.charCodeAt(i) * pow;
		}
		
		id = val.toString(16);
	}
	
	return id;
};

export default objectId;