var ForerunnerDB = require("./js/builds/nodecore"),
	fdb = new ForerunnerDB(),
	db = fdb.db("testApi");

db.collection("someData", {
	primaryKey: "id"
}).setData([{
	id: "1",
	content: "Hello"
}, {
	id: "2",
	content: "Goodbye"
}, {
	id: "3",
	content: "Hola!"
}]);

db.collection("someOtherData").setData([{
	_id: "1",
	content: "Hello"
}, {
	_id: "2",
	content: "Goodbye"
}, {
	_id: "3",
	content: "Hola!"
}]);

// Enable database debug logging to the console (disable this in production)
db.debug(true);

// Set the persist plugin's data folder (where to store data files)
db.persist.dataDir("./data");

// Tell the database to load and save data for collections automatically
// this will auto-persist any data inserted in the database to disk
// and automatically load it when the server is restarted
db.persist.auto(true);

// Set access control to allow all HTTP verbs on all collections
// Note that you can also pass a callback method instead of 'allow' to
// handle custom access control with logic
fdb.api.access("testApi", "collection", "*", "*", "allow");

// Ask the API server to start listening on all IP addresses assigned to
// this machine on port 9010 and to allow cross-origin resource sharing (cors)
fdb.api.start("0.0.0.0", "9011", { cors: true }, function () {
	console.log("Server started!");
});
