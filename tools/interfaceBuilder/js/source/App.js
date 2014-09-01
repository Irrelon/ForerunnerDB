var init = require('./Init'),
	synthesize = init.synthesize,
	appClass = init.appClass,
	App = appClass(),
	app;

// Synthesize the various getter / setter methods
synthesize(App.prototype, 'version');

// Create new app instance
app = new App();
app.version('1.0.0');