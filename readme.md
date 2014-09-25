# ForerunnerDB - A NoSQL JSON Document DB
ForerunnerDB is developed by [Irrelon Software Limited](http://www.irrelon.com/), a UK registered company.
## Version 1.2.7

## What is ForerunnerDB
ForerunnerDB is a NoSQL database for your browser. It supports the same query language as MongoDB and runs on browsers and Node.js.

## License
Forerunner is free for use if you are using it for non-commercial, non-governmental, or non-profit use. If you are doing something commercial please visit the [license page](http://www.forerunnerdb.com/#pricingboxes) to see which license best suits your requirements.

## Download
If you are using Node.js (or have it installed) you can use NPM to download ForerunnerDB via:

```
npm install forerunnerdb
```

This will also work for browser-based development, however if you prefer a more traditional download, please click [here](https://github.com/coolbloke1324/ForerunnerDB/archive/master.zip).

## Use Forerunner in Browser
Include the ForerunnerDB.js file in your HTML (change path to the location you put forerunner):

	<script src="./js/dist/fdb-all.min.js" type="text/javascript"></script>

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

Setting data on a collection will empty any existing data from the collection.

## Inserting Documents
You can either insert a single document object:

	itemCollection.insert({
		_id: 3,
		price: 400,
		name: 'Fish Bones'
	});

or pass an array of documents:

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
Much like MongoDB, searching for data in a collection is done using the find() method, which supports many of the same
operators starting with a $ that MongoDB supports. For instance, finding documents in the collection where the price
is greater than 90 but less than 150, would look like this:

	itemCollection.find({
		price: {
			'$gt': 90,
			'$lt': 150
		}
	});

And would return an array with all matching documents. If no documents match your search, an empty array is returned.

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

## Updating the Collection
This is one of the areas where ForerunnerDB and MongoDB are different. By default ForerunnerDB updates only the keys you specify in your update document, rather than outright *replacing* the matching documents like MongoDB does. In this sense ForerunnerDB behaves more like MySQL. In the call below, the update will find all documents where the price is greater than 90 and less than 150 and then update the documents' key "moo" with the value true.

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

This will update the document with the _id field of 1 to a new price of 180.

### Update Operators
#### $inc
The $inc operator increments / decrements a field value by the given number.

	db.collection.update({
		<query>
	}, {
		$inc: {
			<field>: <value>
		}
	});

In the following example, the "count" field is decremented by 1 in the document that matches the id "445324":

	db.collection.update({
		_id: "445324"
	}, {
		$inc: {
			count: -1
		}
	});

Using a positive number will increment, using a negative number will decrement.

#### $push
The $push operator appends a specified value to an array.

	db.collection.update({
		<query>
	}, {
		$push: {
			<field>: <value>
		}
	});

The following example appends "Milk" to the "shoppingList" array in the document with the id "23231":

	db.users.update({
		_id: "23231"
	}, {
		$push: {
			shoppingList: "Milk"
		}
	});

#### $splicePush
The $splicePush operator adds an item into an array at a specified index.

	db.collection.update({
		<query>
	}, {
		$splicePush: {
			<field>: <value>
			$index: <index>
		}
	});

The following example inserts "Milk" to the "shoppingList" array at index 1 in the document with the id "23231":

	db.users.update({
		_id: "23231"
	}, {
		$splicePush: {
			shoppingList: "Milk"
			$index: 1
		}
	});


#### $addToSet
Adds an item into an array only if the item does not already exist in the array.

ForerunnerDB supports the $addToSet operator as detailed in the MongoDB documentation. Unlike MongoDB, ForerunnerDB also allows you to specify a matching field / path to check uniqueness against.

In the following example $addToSet is used to check uniqueness against the whole document being added:

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

Now in the example below we specify which key to test uniqueness against:

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

#### $pull
The $pull operator removes a specified value or values that match an input query.

	db.collection.update({
		<query>
	}, {
		$pull: {
			<arrayField>: <value|query>
		}
	});

The following example removes the "Milk" entry from the "shoppingList" array:

	db.users.update({
		_id: "23231"
	}, {
		$pull: {
			shoppingList: "Milk"
		}
	});

If an array element is an embedded document (JavaScript object), the $pull operator applies its specified query to the element as though it were a top-level object.

#### $move
The $move operator moves an item that exists inside a document's array from one index to another.

	db.collection.update({
		<query>
	}, {
		$move: {
			<arrayField>: <value|query>,
			$index: <index>
		}
	});

The following example moves "Milk" in the "shoppingList" array to index 1 in the document with the id "23231":

	db.users.update({
		_id: "23231"
	}, {
		$move: {
			shoppingList: "Milk"
			$index: 1
		}
	});

## Get Data Item By Reference
JavaScript objects are passed around as references to the same object. By default when you query ForerunnerDB it will "decouple" the results from the internal objects stored in the collection. If you would prefer to get the reference instead of decoupled object you can specify this in the query options like so:

	var result = db.collection('item').find({}, {
		$decouple: false
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

### Joins
Sometimes you want to join two or more collections when running a query and return a single document with all the data you need from those multiple collections. ForerunnerDB supports collection joins via a simple options key "join". For instance, let's setup a second collection called "purchase" in which we will store some details about users who have ordered items from the "item" collection we initialised above:

	var db = new ForerunnerDB(),
		itemCollection = db.collection('item'),
		purchaseCollection = db.collection('purchase');

	itemCollection.insert([{
        _id: 1,
        name: 'Cat Litter',
        price: 200
    }, {
        _id: 2,
        name: 'Dog Food',
        price: 100
    }, {
        _id: 3,
        price: 400,
        name: 'Fish Bones'
    }, {
		_id: 4,
		price: 267,
		name:'Scooby Snacks'
	}, {
		_id: 5,
		price: 234,
		name: 'Chicken Yum Yum'
	}]);

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

## Indices & Performance
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

Examining the output from an explain() call will provide you with the most insight into how the query was executed and if a table scan was involved or not, helping you to plan your indices accordingly.

Keep in mind that indices require memory to maintain hash tables and there is always a trade-off between speed and memory usage.

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

Note that the selector string that a bind uses can match multiple elements, allowing you to bind against multiple sections of the page with the same data. For instance, instead of binding against an ID (e.g. #myList) you could bind against a class:

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
browserify ./js/build/all.js -o ./js/dist/fdb-all.js
```

## Continuous Compiling
Browserify will compile to a single-file each time you run it. If you would prefer to automatically compile each change (for faster development) you can run watchify instead. Install watchify:

```
npm install -g watchify
```

You can then run watchify using the same command line arguments as browserify:

```
watchify ./js/build/all.js -o ./js/dist/fdb-all.js
```

The fully minified version of ForerunnerDB is run through Google's Closure Compiler with simple optimisations switched on.

## Contributing to This Project
Contributions through pull requests are welcome. Please ensure that if your pull request includes code changes that you have run the unit tests and they have all passed. If your code changes include new features not currently under test coverage from existing unit tests please create new unit tests to cover your changes and ensure they work as expected.

Code style is also important. Tabs are in use instead of spaces for indentation. Braces should start at the end of lines rather than the next line down. Doc comments are in JSDoc format and must be fully written for public-facing methods in any code you write. Private methods also require doc comments in master but can be merged into the dev branch without them.

So to summarise:

* Always check unit tests are running and passing
* Create new tests when you add or modify functionality that is not currently under test coverage

# iOS Version
You may notice in the repo that there is an iOS folder containing a version of Forerunner for iOS. This project is still at an alpha level and should be considered non-production code, however you are welcome to play around with it and get a feel for what will be available soon.

The iOS version is part of the roadmap and will include data-binding for list structures like UITableView, as well as individual controls like UILabel. Data-persistence is already working as well as inserting and basic data queries, update and remove.

# Future Updates
ForerunnerDB's project road-map:

### Roadmap Completed Items
* Views that can join multiple documents together and data-bind - sort of like virtual collections
* Primary key violation checking
* Collection indexing
* Index violation checking
* Unit tests
* Server-side login and CRUD security - allow client login to server with pre-determined credentials that can be locked down to CRUD not only on particular collections but also only matching documents-- e.g. a user account could have a CRUD security record containing {profileId: '352349thj439yh43'} so that only documents that match that query can be edited by the user. This means they would only have update privilege on their own records as an example, but their read privilege could be {} allowing read on all documents.
* Query remote database from browser
* Data persistence on client-side
* NPM installation

#### Supported query operators
* $ (array positional)
* $gt
* $gte
* $lt
* $lte
* $or
* $and
* $exists
* $push
* $addToSet
* $pull
* $in
* $nin
* $mul
* $rename
* $unset
* $pop
* $position
* $each
* $pullAll

#### Operators that are unique to ForerunnerDB:
* $move
* $splicePush

### Future Updates
* Data persistence on server-side
* Collection / query paging-- e.g. select next 10, select previous 10
* Pull from server - allow client-side DB to auto-request server-side data especially useful when paging
* Push to clients - allow server-side to push changes to client-side data automatically and instantly
* Push to server - allow client-side DB changes to be pushed to the server automatically (obvious security / authentication requirements)
* Replication - allow server-side DB to replicate to other server-side DB instances on the same or different physical servers
* Native iOS version
* Native Android version

#### Query operators still to implement
* $setOnInsert
* $min
* $max
* $currentDate
* $slice
* $sort
* $bit
* $isolated

#### Scheduled Features - 1.2.7
* Rewritten data propagation system - COMPLETE
* Added new class "Document" to allow data-binding against a single document object
* Added new class "Overview" to allow data-binding against auto-propagated map-reduce data
* Remove iOS from this repo, add to its own
* Remove server from this repo, add to its own

#### Scheduled Features - 1.2.8
* Data persistence added to documentation
* Fix package.json to allow dev dependencies and production ones, also fix versions etc (https://github.com/coolbloke1324/ForerunnerDB/issues/6)

#### Scheduled Features - 1.2.9
* Add further build files to handle different combinations of modules (https://github.com/coolbloke1324/ForerunnerDB/issues/7)
* Add caching system so requests to a collection with the same query multiple times should generate once and serve the cached results next time round. Cache invalidation can be done on any CRUD op to make subsequent query re-build cache.

#### Scheduled Features - 1.3.0
* Support Angular.js by registering as a module if ajs exists (https://github.com/coolbloke1324/ForerunnerDB/issues/4)
* Support localforage for storage instead of relying on localStorage (https://github.com/coolbloke1324/ForerunnerDB/issues/5)
