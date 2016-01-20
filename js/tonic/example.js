var ForerunnerDB = require('forerunnerdb'),
	fdb = new ForerunnerDB(),
	db,
	results = {};

// Create a new database called "test"
db = fdb.db('test');

// Create / get a new collection called "books" and insert a record
db.collection('books').insert({
	name: 'Harry Potter',
	price: 15.95
});

// Insert multiple books at the same time
db.collection('books').insert([{
	name: 'George Orwell\'s 1984',
	price: 12.00
}, {
	name: 'How to Build a Computer',
	price: 9.99
}, {
	name: 'Driving for Dummies',
	price: 3.50
}]);

// Query the book collection for all books
results.allBooks = db.collection('books').find();

// Query books that cost less than 10
results.cheapBooks = db.collection('books').find({
	price: {
		$lt: 10
	}
});

// Query books with a regular expression
results.regexBooks = db.collection('books').find({
	name: /Potter/
});

// Get all the book ids as an array
results.booksIds = db.collection('books').find({}, {
	$aggregate: '_id'
});

// Output the results
console.log(results);