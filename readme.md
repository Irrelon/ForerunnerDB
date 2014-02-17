# ForerunnerDB Client-Side Mongo-Like Database
## Setup
Include the ForerunnerDB.js file in your HTML:

	<script src="ForerunnerDB.js" type="text/javascript"></script>

## Create a Database

	var db = new ForerunnerDB();

## Collections (Tables)
To create or get a reference to a collection object call (where collectionName is the name of your collection):

	var collection = db.collection('collectionName');

In our examples we will use a collection called "item" which will store some fictitious items for sale:

	var itemCollection = db.collection('item');

## Setting Initial Data
When you get a collection instance for the first time it will contain no data. To set data on the collection pass an
array of objects to the setData() method:

	itemCollection.setData([{
		_id: 1,
		name: 'Cat Litter',
		price: 200
	}, {
		_id: 2,
		name: 'Dog Food',
		price: 100
	}]);

## Inserting Documents
You can either insert a single document object or pass an array of documents:

	itemCollection.insert({_id: 3, price: 400, name: 'Fish Bones'});

Or...

	itemCollection.insert([{_id: 4, price: 267, name:'Scooby Snacks'}, {_id: 5, price: 234, name: 'Chicken Yum Yum'}]);

## Searching the Collection
Much like MongoDB, searching for data in a collection is done using the find() method and supports many of the same
operators starting with a $ that MongoDB supports. For instance to find documents in the collection where the price
is greater than 90 but less than 150, you can do this:

	itemCollection.find({
		price: {
			'$gt': 90,
			'$lt': 150
		}
	});

Which will return an array with all matching documents. If no documents match your search, an empty array is returned.

### Doing Joins
Sometimes you want to join two or more collections when running a query and return a single document with all the data you need from those multiple collections. ForerunnerDB supports collection joins via a simple options key "join". For instance, let's setup a second collection called "purchase" in which we will store some details about users who have ordered items from the "item" collection we initialised above:

	var purchaseCollection = db.collection('purchase');
	purchaseCollection.insert([{
		itemId: 4,
		user: 'Fred Bloggs',
		quantity: 2
	}, {
		itemId: 4,
		user: 'Jim Jones',
		quantity: 1
	}]);

Now, when we find data from the "item" collection we can grab all the users that ordered that item as well and store them in a key called "purchasedBy":

	itemCollection.find({}, {
		'join': [{
			'purchase': {
				'itemId': '_id',
				'$as': 'purchasedBy',
				'$require': false,
				'$multi': true
			}
		}]
	});

The "join" key holds an array of joins to perform, each join object has a key which denotes the collection name to pull data from, then matching criteria which in this case is to match purchase.itemId with the item._id. The three other keys are special operations (start with $) and indicate:

* $as tells the join what object key to store the join results in when returning the document
* $require is a boolean that denotes if the join must be successful for the item to be returned in the final find result
* $multi indicates if we should match just one item and then return, or match multiple items as an array

The result of the call above is:

	[{
		"_id":1,
		"name":"Cat Litter",
		"price":200,
		"purchasedBy":[]
	},{
		"_id":2,
		"name":"Dog Food",
		"price":100,
		"purchasedBy":[]
	},{
		"_id":3,
		"price":400,
		"name":"Fish Bones",
		"purchasedBy":[]
	},{
		"_id":4,
		"price":267,
		"name":"Scooby Snacks",
		"purchasedBy": [{
			"itemId":4,
			"user":"Fred Bloggs",
			"quantity":2
		}, {
			"itemId":4,
			"user":"Jim Jones",
			"quantity":1
		}]
	},{
		"_id":5,
		"price":234,
		"name":"Chicken Yum Yum",
		"purchasedBy":[]
	}]

## Updating the Collection
This is where ForerunnerDB and MongoDB are different. By default ForerunnerDB updates only the keys you specify in your update
document instead of outright *replacing* the matching documents like MongoDB does. In this sense ForerunnerDB behaves more
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

### Prerequisites
* Data-binding requires jQuery to be present on the page.
* Your items must include an id="" attribute that matches the primary key of the document it represents.
* Binding is against an entire collection at present. In the future you will be able to define distinct "views" and bind against them as well.

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

## Binding Events
Data binding also has some extra features that allow your app to respond to changes to the data. For instance, if a
document is removed, perhaps you would like to fade out the item in the HTML instead of it being instantly removed from
the DOM?

	collection.bind('#myList', {
		template: function (data, callback) {
			// Here is where we pass a rendered HTML version of the data back
			// to the database. You can use your favourite client-side templating
			// system to achieve this e.g. jsRender, jSmart, HandleBars etc
			// We have used a simple string concatenation to visibly show the process.
			callback('<li>' + data.price + '</li>');
		},
		beforeRemove: function (elem, data, allData, callback) {
			// Use jQuery to animate the element's opacity before removing it from the DOM
			elem.animate({
				opacity: 0
			}, 600, function () {
				// Now that the animation is complete, call the callback which informs the
				// data-binding system it can proceed with removing the element
				callback();
			});
		}
	});

The full list of events that can be used are:

	beforeRemove: function (jqSelector elem, array elemData, array allData, function callback);
	afterRemove: function (jqSelector elem, array elemData, array allData);
	afterInsert: function (jqSelector elem, array inserted, array failed, array allData);
	afterUpdate: function (jqSelector elem, array elemData, array allData);

Where the parameters are:

	elem: The jQuery selector object representing the element in the DOM that has changed
	elemData: The document in the collection the DOM element relates to
	allData: The entire collection's data array
	callback: The callback to use once you have finished processing
	inserted: An array of documents that were inserted
	failed: An array of documents that failed to insert

# Future Updates
More features are being actively worked on for this project:

* Views that can join multiple documents together and data-bind - sort of like virtual collections
* More support for MongoDB operators (currently support $push, $pull, $gt(e), $lt(e), $exists, $or, $and
