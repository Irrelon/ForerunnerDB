"use strict";

var ForerunnerDB = require('../../builds/nodecore'),
	fdb = new ForerunnerDB(),
	db = fdb.db('testApi');

// Enable database debug logging to the console
db.debug(true);

// Set encryption on the persisted data
db.persist.addStep(new db.shared.plugins.FdbCrypto({
	pass: "testing"
}));

// Set the persist plugin's data folder
db.persist.dataDir('./data');

// Tell the database to load and save data for collections automatically
db.persist.auto(true);

db.view('booksView')
	.from('books');

db.view('booksEnabledView')
	.queryData({
		enabled: true
	})
	.from('books');

db.collection('session');

// Create a remote procedure called "login" that checks for a user
// and then if found, creates a new session and returns the session
// details to the client.
db.procedure('login', function (req, res) {
	var email = req.json.email,
		password = req.json.password,
		result,
		sessionInsert;

	result = db.collection('user').findOne({
		email: email,
		password: password
	});

	if (result) {
		// Create a new session for this user
		sessionInsert = db.collection('session').insert({
			userId: result._id,
			createdTs: new Date()
		});

		if (sessionInsert.inserted[0]) {
			// Send to client
			res.status(200).send(sessionInsert.inserted[0]);
		} else {
			res.status(500).send('Session failure');
		}
	} else {
		res.status(404).send('Authentication failed');
	}
});

// Set access control on all objects to disallow access without a valid session
fdb.api.access('testApi', '*', '*', '*', function checkSession (dbName, objType, objName, httpMethod, req, callback) {
	var sid,
		session;

	if (objType === 'procedure' && objName === 'login') {
		// Allow without a session
		return callback(false, dbName, objType, objName, httpMethod, req);
	}

	// Check for a session
	if (req.json && req.json.sid) {
		sid = req.json.sid;
	}

	if (req.body && req.body.sid) {
		sid = req.body.sid;
	}

	// Validate session id
	if (sid) {
		session = db.collection('session').findById(sid);

		// Allow specific test session id
		if (sid === '4061c5730233780') {
			session = true;
		}
		
		if (session) {
			// Valid session found, allow access
			return callback(false, dbName, objType, objName, httpMethod, req);
		}
	}

	// Deny access
	return callback('No valid session', dbName, objType, objName, httpMethod, req);
});

// Set access control to allow all HTTP verbs (*) on the "books" collection in the "testApi" database
// db.api.access(<database name>, <object type>, <object name>, <http verb>, <your control method>);
fdb.api.access('testApi', 'collection', 'books', '*', function allowCollectionBooks (dbName, objType, objName, httpMethod, req, callback) {
	callback(false, dbName, objType, objName, httpMethod, req);
});

// Instead of passing a control method, you can use the strings "allow" and "deny" instead.
// In this line we allow full access to the session collection (a very bad security risk)
// for testing purposes. DO NOT USE THIS IN PRODUCTION!!!!!!
fdb.api.access('testApi', 'collection', 'session', '*', 'allow');

// Allow all HTTP verbs on all views
fdb.api.access('testApi', 'view', '*', '*', 'allow');

// Allow all clients get access to the login remote procedure
fdb.api.access('testApi', 'procedure', 'login', 'GET', 'allow');

// Ask the API server to start listening
fdb.api.start('0.0.0.0', '9011', {cors: true});

// Stop API server with stop() call
//fdb.api.stop();

// Create a user in the user collection so that login procedure can be tested
db.collection('user').insert({
	email: 'test@test.com',
	password: 'testing'
});