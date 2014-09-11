# ForerunnerDB - A NoSQL JSON Document DB
## Version 1.2.0

## What is ForerunnerDB
ForerunnerDB is a NoSQL database for your browser. It supports the same queries and methods as MongoDB and runs on browsers and Node.js.

## Download
If you are using Node.js (or have it installed) you can use NPM to download ForerunnerDB via:

```
npm install forerunnerdb
```

This will also work for browser-based development, however if you prefer a more traditional download, please use the download button to the right of the github page and see "Client-Side (Browser) Setup" further down.

## Use Forerunner in Browser
Include the ForerunnerDB.js file in your HTML:

	<script src="./dist/fdb-all.min.js" type="text/javascript"></script>

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

## Inserting Documents
You can either insert a single document object or pass an array of documents. Insert a single document:

	itemCollection.insert({
		_id: 3,
		price: 400,
		name: 'Fish Bones'
	});

Or an array of documents:

	itemCollection.insert([{
		_id: 4,
		price: 267,
		name:'Scooby Snacks'
	}, {
		_id: 5,
		price: 234,
		name: 'Chicken Yum Yum'
	}]);

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

Supported search operators:

* $gt Greater Than
* $gte Greater Than / Equal To
* $lt Less Than
* $lte Less Than / Equal To
* $or Match any of the conditions inside the sub-query
* $and Match all conditions inside the sub-query
* $exists Check that a key exists in the document
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

### Supported Update Operators
* $push Used in updates to add an item to an array
* $splicePush Add an item into an array at a specified index
* $addToSet Adds an item into an array only if the item does not already exist in the array
* $pull Used in updates to remove an item from an array
* $move Move an item inside a document's array from one index to another

## Using $addToSet to push a unique item into an array
ForerunnerDB supports the $addToSet operator as detailed in the MongoDB documentation. The main difference between ForerunnerDB and MongoDB is that ForerunnerDB also allows you to specify a matching field / path to check uniqueness against:

### A Simple $addToSet, checks uniqueness against a whole document being added

	// Create a collection document
	collection.setData({
		_id: "1",
		arr: []
	});

	// Update the document by adding an object to the "arr" array
	collection.update({
		_id: "1"
	}, {
		$addToSet: {
			arr: {
				name: 'Fufu',
				test: '1'
			}
		}
	});

	// Try and do it again... this will fail because a
	// matching item already exists in the array
	collection.update({
        _id: "1"
    }, {
        $addToSet: {
            arr: {
                name: 'Fufu',
                test: '1'
            }
        }
    });

### An $addToSet using an option to tell Forerunner which key to test uniqueness against

	// Create a collection document
	collection.setData({
		_id: "1",
		arr: []
	});

	// Update the document by adding an object to the "arr" array
	collection.update({
		_id: "1"
	}, {
		$addToSet: {
			arr: {
				name: 'Fufu',
				test: '1'
			}
		}
	});

	// Try and do it again... this will work because the
	// key "test" is different for the existing and new objects
	collection.update({
        _id: "1"
    }, {
        $addToSet: {
            arr: {
                name: 'Fufu',
                test: '2'
            }
        }
    }, {
        $addToSet: {
            key: 'test'
        }
    });

You can also specify the key to check uniqueness against as an object path such as 'moo.foo'.

## Get Data Item By Reference
JavaScript objects are passed around as references to the same object. By default when you query ForerunnerDB it will "decouple" the results from the internal objects stored in the collection. If you would prefer to get the reference instead of decoupled object you can specify this in the query options like so:

	var result = db.collection('item').find({}, {
		decouple: false
	});

If you do not specify a decouple option, ForerunnerDB will default to true and return decoupled objects.

Keep in mind that if you switch off decoupling for a query and then modify any object returned, it will also modify the internal object held in ForerunnerDB, which could result in incorrect index data as well as other anomalies.

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

## Indexes & Performance
ForerunnerDB currently supports basic indexing for performance enhancements when querying a collection. You can create an index on a collection using the ensureIndex() method. ForerunnerDB will utilise the index that most closely matches the query you are executing. In the case where a query matches multiple indexes the most relevant index is automatically determined. Let's setup some data to index:

	var db = new ForerunnerDB(),
		names = ['Jim', 'Bob', 'Bill', 'Max', 'Jane', 'Kim', 'Sally', 'Sam'],
		collection = db.collection('test'),
		tempName,
		tempAge,
		i;

	for (i = 0; i < 100000; i++) {
		tempName = names[Math.ceil(Math.random() * names.length) - 1];
		tempAge = Math.ceil(Math.random() * 100);

		collection.insert({
			name: tempName,
			age: tempAge
		});
	}

You can see that in our collection we have some random names and some random ages. If we ask Forerunner to explain the query plan for querying the name and age fields:

	collection.explain({
		name: 'Bill',
        age: 17
	});

The result shows that the largest amount of time was taken in the "tableScan" step:

	{
		analysis: Object,
		flag: Object,
		index: Object,
		log: Array[0],
		operation: "find",
		results: 128, // Will vary depending on your random entries inserted earlier
		steps: Array[4] // Lists the steps Forerunner took to generate the results
			[0]: Object
				name: "analyseQuery",
				totalMs: 0
			[1]: Object
				name: "checkIndexes",
                totalMs: 0
			[2]: Object
				name: "tableScan",
                totalMs: 54
			[3]: Object
				name: "decouple",
                totalMs: 1,
        time: Object
	}

From the explain output we can see that a large amount of time was taken up doing a table scan. This means that the database had to scan through every item in the collection and determine if it matched the query you passed. Let's speed this up by creating an index on the "name" field so that lookups against that field are very fast. In the index below we are indexing against the "name" field in ascending order, which is what the 1 denotes in name: 1. If we wish to index in descending order we would use name: -1 instead.

	collection.ensureIndex({
		name: 1
	});

The collection now contains an ascending index against the name field. Queries that check against the name field will now be optimised:

	collection.explain({
		name: 'Bill',
		age: 17
	});

Now the explain output has some different results:

	{
		analysis: Object,
		flag: Object,
		index: Object,
		log: Array[0],
		operation: "find",
		results: 128, // Will vary depending on your random entries inserted earlier
		steps: Array[6] // Lists the steps Forerunner took to generate the results
			[0]: Object
				name: "analyseQuery",
				totalMs: 1
			[1]: Object
				name: "checkIndexes",
                totalMs: 1
			[2]: Object
				name: "checkIndexMatch: name:1",
                totalMs: 0
			[3]: Object
				name: "indexLookup",
                totalMs: 0,
			[4]: Object
				name: "tableScan",
                totalMs: 13,
			[5]: Object
				name: "decouple",
                totalMs: 1,
        time: Object
	}

The query plan shows that the index was used because it has an "indexLookup" step, however we still have a "tableScan" step that took 13 milliseconds to execute. Why was this? If we delve into the query plan a little more by expanding the analysis object we can see why:

	{
		analysis: Object
			hasJoin: false,
			indexMatch: Array[1]
				[0]: Object
					index: Index,
					keyData: Object
						matchedKeyCount: 1,
						totalKeyCount: 2,
						matchedKeys: Object
							age: false,
							name: true
					lookup: Array[12353]
			joinQueries: Object,
			options: Object,
			queriesJoin: false,
			queriesOn: Array[1],
			query: Object
		flag: Object,
		index: Object,
		log: Array[0],
		operation: "find",
		results: 128, // Will vary depending on your random entries inserted earlier
		steps: Array[6] // Lists the steps Forerunner took to generate the results
        time: Object
	}

In the selected index to use (indexMatch[0]) the keyData shows that the index only matched 1 out of the 2 query keys.

In the case of the index and query above, Forerunner's process will be:

* Query the index for all records that match the name "Bill" (very fast)
* Iterate over the records from the index and check each one for the age 17 (slow)

This means that while the index can be used, a table scan of the index is still required. We can make our index better by using a compound index:

	collection.ensureIndex({
		name: 1,
		age: 1
	});

With the compound index, Forerunner can now pull the matching record right out of the hash table without doing a data scan which is very very fast:

	collection.explain({
		name: 'Bill',
		age: 17
	});

Which gives:

	{
		analysis: Object,
		flag: Object,
		index: Object,
		log: Array[0],
		operation: "find",
		results: 128, // Will vary depending on your random entries inserted earlier
		steps: Array[7] // Lists the steps Forerunner took to generate the results
			[0]: Object
				name: "analyseQuery",
				totalMs: 0
			[1]: Object
				name: "checkIndexes",
                totalMs: 0
			[2]: Object
				name: "checkIndexMatch: name:1",
                totalMs: 0
			[3]: Object
				name: "checkIndexMatch: name:1_age:1",
                totalMs: 0,
			[4]: Object
				name: "findOptimalIndex",
                totalMs: 0,
			[5]: Object
				name: "indexLookup",
                totalMs: 0,
			[6]: Object
				name: "decouple",
                totalMs: 0,
        time: Object
	}

Now we are able to query 100,000 records instantly, requiring zero milliseconds to return the results.

Examining the output from an explain() call will provide you with the most insight into how the query was executed and if a table scan was involved or not, helping you to plan your indexes accordingly.

Keep in mind that indexes require memory to maintain hash tables and there is always a trade-off between speed and memory usage.

## Data Binding
The database includes a useful data-binding system that allows your HTML to be automatically updated when data in the
collection changes. Here is a simple example of a data-bind that will keep the list of items up-to-date if you modify
the collection:

### Prerequisites
* Data-binding requires jQuery and jsViews to be loaded

### HTML
	<ul id="myList">
	</ul>
	<script id="myLinkFragment" type="text/x-jsrender">
		<li data-link="id{:_id}">{^{:name}}</li>
	</script>

### JS
	var db = new ForerunnerDB(),
		collection = db.collection('test');

	collection.link('#myList', '#myLinkFragment');

Now if you execute any insert, update or remove on the collection, the HTML will automatically update to reflect the
changes in the data.

Note that the selector string that a bind uses can match multiple elements which allows you to bind against multiple sections of the page with the same data. For instance instead of binding against an ID (e.g. #myList) you could bind against a class:

### HTML
	<ul class="myList">
	</ul>
	
	<ul class="myList">
	</ul>

	<script id="myLinkFragment" type="text/x-jsrender">
        <li data-link="id{:_id}">{^{:name}}</li>
    </script>
	
### JS
	collection.link('#myList', '#myLinkFragment');

The result of this is that both UL elements will get data binding updates when the underlying data changes.

# Development

## Unit Tests
Unit tests are available in the ./unitTests folder, load index.html to run the tests.

## Building / Compiling
> This step is not required unless you are modifying ForerunnerDB code and wish to build your own version.

ForerunnerDB uses Browserify to compile to single-file distribution builds whilst maintaining source in distinct module files. To build, ensure you have Node.js and browserify installed. To install browserify if you already have Node.js:

```
npm install -g browserify
```

Now you can then execute browserify to build ForerunnerDB:

```
browserify .\build\all.js -o .\dist\fdb-all.js
```

## Continuous Compiling
Browserify will compile to a single-file each time you run it. If you would prefer to automatically compile each change (for faster development) you can run watchify instead. Install watchify:

```
npm install -g watchify
```

You can then run watchify using the same command line arguments as browserify:

```
watchify .\build\all.js -o .\dist\fdb-all.js
```

The fully minified version of ForerunnerDB is run through Google's Closure Compiler with advanced optimisations switched on.

# Future Updates
ForerunnerDB's project road-map:

### COMPLETED
* Views that can join multiple documents together and data-bind - sort of like virtual collections
* Primary key violation checking
* Unit tests
* Server-side login and CRUD security - allow client login to server with pre-determined credentials that can be locked down to CRUD not only on particular collections but also only matching documents e.g. a user account could have a CRUD security record that has {profileId: '352349thj439yh43'} so that only documents that match that query can be edited by the user, meaning they would only have update privilage on their own records as an example, but their read privilage could be {} allowing read on all documents.
* Query remote database from browser
* Data persistence on client-side
* Collection indexing
* NPM installation

### PARTIAL

* Support more of the MongoDB query operators

	Completed:
	$ (array positional)
	$gt
    $gte
    $lt
    $lte
    $or
    $and
    $exists
    $push
    $addToSet
    $pull
    $in
    $nin

    Unique to ForerunnerDB:
    $move
    $splicePush

	Required:
	$mul,
	$rename,
	$setOnInsert,
	$unset,
	$min,
	$max,
	$currentDate,
	$pop,
	$pullAll,
	$pushAll,
	$each,
	$slice,
	$sort,
	$position (already have new operator $splicePush to achieve the same thing),
	$bit,
	$isolated

### NEEDS IMPLEMENTING
* Data persistence on server-side
* Collection / query paging e.g. select next 10, select previous 10
* Index violation checking
* Pull from server - allow client-side DB to auto-request server-side data especially useful when paging
* Push to clients - allow server-side to push changes to client-side data automatically and instantly
* Push to server - allow client-side DB changes to be pushed to the server automatically (obvious security / authentication requirements)
* Replication - allow server-side DB to replicate to other server-side DB instances on the same or different physical servers