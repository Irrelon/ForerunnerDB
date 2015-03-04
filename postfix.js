var fs = require('fs');

var code = fs.readFileSync('./js/dist/fdb-all.js', 'utf8');

// Replace code that IE8 will die on
code = code.replace(/\.catch\(/g, "['catch'](");
code = code.replace(/\.continue\(/g, "['continue'](");
code = code.replace(/\.delete\(/g, "['delete'](");

// Write changes
fs.writeFileSync('./js/dist/fdb-all.js', code);
