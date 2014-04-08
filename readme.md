# ForerunnerDB - A NoSQL JSON Document DB
##### Project Status

* ForerunnerDB: **Production - Stable**
* ForerunnerDB.CollectionGroup: **Production - Stable**
* ForerunnerDB.View: **Production - Stable**
* ForerunnerDB.View.Bind: **Production - Stable**

##### Sub-Module (Optional Plugins) Status
* ForerunnerDB.Persist: *Development - Beta*
* ForerunnerDB.Server: *Development - Alpha*
* ForerunnerDB.Remote: *Development - Alpha*

##### Unit Tests
Unit tests are available in the ./unitTests folder, load index.html to run the tests.

### What Is ForerunnerDB?
ForerunnerDB (a.k.a. Forerunner or FDB) is a database system that operates as an object store. It is a NoSQL database that is queried in a very similar way to MongoDB. Forerunner's main advantages are:

* Can run in a browser as a client-side database for web-apps or server-side in Node.js
* Has a very low footprint (44KB uncompressed, 12KB minified, 3KB minified + gzipped)
* Has built-in data-binding for automatically updating the DOM when underlying data changes**

** Data-binding to the DOM requires jQuery

### ForerunnerDB & MongoDB
Forerunner and Mongo are very similar and Forerunner has been written to work with similar queries, however there are some key differences that any MongoDB user should be aware of:

* Forerunner supports joins
* Forerunner's collection update method is more like MySQL's in that only the key/value pairs you pass are updated instead of the entire document being overwritten. You can think of ForerunnerDB's update method has having the MongoDB $set wrapped around your entire passed update document.
* MongoDB is a pure server-side application so doesn't need to deal with DOM events etc, whereas ForerunnerDB can run in both a server and client environment. In a browser, Forerunner has data-binding built in so that when your data changes, DOM updates are processed automatically.
* Forerunner supports views. Views allow you to create subsets of collections with joins and other options. Those views can then also have data binding enabled on them. If you change the query that a view is built with, your DOM can automatically update as well to show the results. This allows you to visualise query changes on screen instantly without complex code.
* Forerunner is NOT persistent storage. Unlike MongoDB or MySQL, Forerunner will loose ALL data if your browser is refreshed (when operating on a client). If you are running Forerunner in a server environment you can think of it as an in-memory store that is volitile and requires populating on startup***

*** ForerunnerDB will get data persistence very soon in an upcoming release!

## Client-Side (Browser) Setup
Include the ForerunnerDB.js file in your HTML:

	<script src="ForerunnerDB.js" type="text/javascript"></script>
	
You can also include optional modules such as collection groups, views and data-binding (in this order):

	<script src="ForerunnerDB.CollectionGroup.js" type="text/javascript"></script>
	<script src="ForerunnerDB.View.js" type="text/javascript"></script>
	<script src="ForerunnerDB.View.Bind.js" type="text/javascript"></script>

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

Setting data on a collection will empty the existing data from the collection if any exists.

## Primary Keys
Collections have a primary key of "_id" by default. If you want to use a different primary key you can specify it on the
collection. Below is an example of how to set the primary key to "contactId":

    itemCollection.primaryKey('contactId');

> Please note that going forward the primary keys in all example data in this document uses "_id" and not "contactId".

## Inserting Documents
You can either insert a single document object or pass an array of documents. Insert a single document:

	itemCollection.insert({_id: 3, price: 400, name: 'Fish Bones'});

Or an array of documents:

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

Supported operators:

* $gt Greater Than
* $gte Greater Than / Equal To
* $lt Less Than
* $lte Less Than / Equal To
* $or Match any of the contitions inside the sub-query
* $and Match all conditions inside the sub-query
* $exists Check that a key exists in the document
* $push Used in updates to add an item to an array
* $pull Used in updates to remove an item from an array
* arrayKey.$ Positional selector query

Searches also support regular expressions for advanced text-based queries. Simply pass the regular expression object as the value for the key you wish to search, just like when using regular expressions with MongoDB.

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
This is one of the areas where ForerunnerDB and MongoDB are different. By default ForerunnerDB updates only the keys you specify in your update document instead of outright *replacing* the matching documents like MongoDB does. In this sense ForerunnerDB behaves more like MySQL. In the call below the update will find all documents where the price is greater than 90 and less than 150 and then update the documents' key "moo" with the value true.

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
* Data-binding requires jQuery to be present on the page
* Your items must include an id="" attribute that matches the primary key of the document it represents
* If you require a bind against a subset of the collection's data, use a view and bind against that instead

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
			callback('<li id="' + data._id + '">' + data.price + '</li>');
		}
	});

Now if you execute any insert, update or remove on the collection, the HTML will automatically update to reflect the
changes in the data.

Note that the selector string that a bind uses can match multiple elements which allows you to bind against multiple sections of the page with the same data. For instance instead of binding against an ID (e.g. #myList) you could bind against a class:

### HTML
	<ul class="myList">
	</ul>
	
	<ul class="myList">
	</ul>
	
### JS
	collection.bind('.myList', {
		template: function (data, callback) {
			// Here is where we pass a rendered HTML version of the data back
			// to the database. You can use your favourite client-side templating
			// system to achieve this e.g. jsRender, jSmart, HandleBars etc
			// We have used a simple string concatenation to visibly show the process.
			callback('<li id="' + data._id + '">' + data.price + '</li>');
		}
	});

The result of this is that both UL elements will get data binding updates when the underlying data changes.

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
			callback('<li id="' + data._id + '">' + data.price + '</li>');
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
ForerunnerDB's project road-map:

* COMPLETED - Views that can join multiple documents together and data-bind - sort of like virtual collections
* COMPLETED - Primary key violation checking
* COMPLETED - Unit tests
* COMPLETED - Server-side login and CRUD security - allow client login to server with pre-determined credentials that can be locked down to CRUD not only on particular collections but also only matching documents e.g. a user account could have a CRUD security record that has {profileId: '352349thj439yh43'} so that only documents that match that query can be edited by the user, meaning they would only have update privilage on their own records as an example, but their read privilage could be {} allowing read on all documents.
* COMPLETED - Query remote database from browser
* COMPLETED - Data persistence on client-side
* Support more of the MongoDB query operators
* Data persistence on server-side
* NPM installation
* Collection / query paging e.g. select next 10, select previous 10
* Collection indexing
* Index violation checking
* Pull from server - allow client-side DB to auto-request server-side data especially useful when paging
* Push to clients - allow server-side to push changes to client-side data automatically and instantly
* Push to server - allow client-side DB changes to be pushed to the server automatically (obvious security / authentication requirements)
* Replication - allow server-side DB to replicate to other server-side DB instances on the same or different physical servers
