var fdb = new ForerunnerDB(),
	db = fdb.db('testApi');

db.api.server('http://0.0.0.0:9010');

db.collection('books').link('#booksList', '#bookItem');
db.collection('books').sync();