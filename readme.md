# MongoCS Client-Side Mongo-Like Database
## Setup
Include the MongoCS.js file in your HTML:

	<script src="MongoCS.js" type="text/javascript"></script>

## Create a Database

	var db = new MongoCS();

## Collections (Tables)
To create or get a reference to a collection object call (where collectionName is the name of your collection):

	var collection = db.collection('collectionName');

## Setting Initial Data
When you get a collection instance for the first time it will contain no data. To set data on the collection pass an
array of objects to the setData() method:

	collection.setData([{
		_id: 1,
		someKey: 'someVal',
		price: 200
	}, {
		_id: 2,
		someKey: 'someVal',
		price: 100
	}]);

## Inserting Documents
You can either insert a single document object or pass an array of documents:

	collection.insert({_id: 3, price: 400});

Or...

	collection.insert([{_id: 4, price: 267}, {_id: 5, price: 234}]);

## Searching the Collection
Much like MongoDB, searching for data in a collection is done using the find() method and supports many of the same
operators starting with a $ that MongoDB supports. For instance to find documents in the collection where the price
is greater than 90 but less than 150, you can do this:

	collection.find({
		price: {
			'$gt': 90,
			'$lt': 150
		}
	});

Which will return an array with all matching documents. If no documents match your search, an empty array is returned.

## Updating the Collection
This is where MongoCS and MongoDB are different. By default MongoCS updates only the keys you specify in your update
document instead of outright *replacing* the matching documents like MongoDB does. In this sense MongoCS behaves more
like MySQL. In the call below the update will find all documents where the price is greater than 90 and less than 150
and then update the documents' key "moo" with the value true.

	collection.update({
		price: {
			'$gt': 90,
			'$lt': 150
		}
	}, {
		moo: true
	});

## Quick Updates
You can target individual documents for update by their id (primary key) via a quick helper method:

	collection.updateById(1, {price: 180});

That will update the document with the _id field of 1 to a new price of 180.

## Primary Keys
If your data uses different primary key fields from the default "_id" then you need to tell the collection. Simply call
the primaryKey() method with the name of the field your primary key is stored in:

	collection.primaryKey('itemId');

When you change the primary key field name, methods like updateById will use this field automatically instead of the
default one "_id".

## Removing Documents
Removing is as simple as doing a normal find() call, but with the search for docs you want to remove. Remove all
documents where the price is greater than or equal to 100:

	collection.remove({
		price: {
			'$gte': 100
		}
	});

## Data Binding
The database includes a useful data-binding system that allows your HTML to be automatically updated when data in the
collection changes. Here is a simple example of a data-bind that will keep the list of items up-to-date if you modify
the collection:

### HTML
	<ul id="myList">
	</ul>

### JS
	collection.bind('#myList', {
		template: function (data, callback) {
			// Here is where we pass a rendered HTML version of the data back
			// to the database. You can use your favourite client-side templating
			// system to achieve this e.g. jsRender, jSmart, HandleBars etc
			// We have used a simple string concatenation to visibly show the process.
			callback('<li>' + data.price + '</li>');
		}
	});

Now if you execute any insert, update or remove on the collection, the HTML will automatically update to reflect the
changes in the data.

*Please note, jQuery is REQUIRED to be loaded on the page before data-binding will work.*