var packageData = require('./package.json'),
	colors = require('colors');

console.log(colors.bold('ForerunnerDB version ' + colors.green.bold(packageData.version) + ' installed') + '.\nForerunnerDB is developed with ' + colors.red.bold('❤') + ' love by Irrelon Software Limited, a UK registered company. You can find ' + ('help') + ' or ' + ('ask questions') + ' here: ' + colors.bold('https://github.com/Irrelon/ForerunnerDB/issues\n'));
console.log(('We don\'t make any money from this project or ask for anything in return.') + ' If you like ForerunnerDB please take the time to ' + colors.cyan.bold('star it on GitHub and show your support: ') + colors.bold('https://github.com/Irrelon/ForerunnerDB') + '\n');
console.log(('You can email us and say hi or tell us what you\'re working on with ForerunnerDB via ' + colors.bold('forerunnerdb@irrelon.com') + ' we\'re always happy to hear from you!\n'));