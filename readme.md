# ForerunnerDB - A NoSQL JSON Document DB
ForerunnerDB is developed with ❤ love by [Irrelon Software Limited](http://www.irrelon.com/),
a UK registered company.

> ForerunnerDB is used in live projects that serve millions of users a day, is production
ready and battle tested in real-world applications.

ForerunnerDB receives no funding or third-party backing except from patrons like yourself.
If you love ForerunnerDB and want to support its development, or if you use it in your own
products please consider becoming a patron: [https://www.patreon.com/user?u=4443427](https://www.patreon.com/user?u=4443427)

Community Support: [https://github.com/Irrelon/ForerunnerDB/issues](https://github.com/Irrelon/ForerunnerDB/issues)
Commercial Support: [forerunnerdb@irrelon.com](mailto:forerunnerdb@irrelon.com)

## Version 2.0.22

[![npm version](https://badge.fury.io/js/forerunnerdb.svg)](https://www.npmjs.com/package/forerunnerdb)
[![Security Scan](https://snyk.io/test/npm/forerunnerdb/badge.svg)](https://snyk.io/test/npm/forerunnerdb)

[![NPM Stats](https://nodei.co/npm/forerunnerdb.png?downloads=true)](https://npmjs.org/package/forerunnerdb)

#### TravisCI Build Test Status
<table>
<tr>
<th>Master</th>
<th>Dev</th>
</tr>
<tr>
<td><a href="https://travis-ci.org/Irrelon/ForerunnerDB"><img src="https://travis-ci.org/Irrelon/ForerunnerDB.svg?branch=master" title="Master Branch Build Status" /></a></td>
<td><a href="https://travis-ci.org/Irrelon/ForerunnerDB"><img src="https://travis-ci.org/Irrelon/ForerunnerDB.svg?branch=dev" title="Dev Branch Build Status" /></a></td>
</tr>
</table>

### Standout Features

* [AngularJS and Ionic Support](#angularjs-and-ionic-support) - Optional AngularJS module provides ForerunnerDB as an angular service.
* [Views](#views) - Virtual collections that are built from existing collections and limited by live queries.
* [Joins](#joins) - Query with joins across multiple collections and views.
* [Sub-Queries](#subqueries-and-subquery-syntax) - ForerunnerDB supports sub-queries across collections and views.
* [Collection Groups](#collection-groups) - Add collections to a group and operate CRUD on them as a single entity.
* [Data Binding (*Browser Only*)](#data-binding) - Optional binding module to bind data to your DOM and have it update your page in realtime as data changes.
* [Persistent Storage (*Browser & Node.js*)](#data-persistence-save-and-load-between-pages) - Optional persist module to save your data and load it back at a later time, great for multi-page apps.
* [Compression & Encryption](#data-compression-and-encryption) - Support for compressing and encrypting your persisted data.
* [Built-In REST Server (*Node.js*)](#forerunnerdb-built-in-json-rest-api-server) - Optional REST server with powerful access control, remote procedures, access collections, views etc via REST interface. Rapid prototyping is made very easy with ForerunnerDB server-side.

## What is ForerunnerDB
ForerunnerDB is a NoSQL JavaScript JSON database with a query language based on
MongoDB (with some differences) and runs on browsers and Node.js. It is in use in
many large production web applications and is transparently used by over 6 million
clients. ForerunnerDB is the most advanced, battle-tested and production ready
browser-based JSON database system available today.

## What is ForerunnerDB's Primary Use Case?
ForerunnerDB was created primarily to allow web (and mobile web / hybrid)
application developers to easily store, query and manipulate JSON data in
the browser / mobile app via a simple query language, making handling JSON
data significantly easier.

ForerunnerDB supports data persistence on both the client (via LocalForage)
and in Node.js (by saving and loading JSON data files).

If you build advanced web applications with AngularJS or perhaps your own
framework or if you are looking to build a server application / API that
needs a fast queryable in-memory store with file-based data persistence and
a very easy setup (simple installation via NPM and no requirements except
Node.js) you will also find ForerunnerDB very useful.

> An example hybrid application that runs on iOS, Android and Windows Mobile
via Ionic (AngularJS + Cordova with some nice extensions) is available in
this repository under the ionicExampleClient folder.
[See here for more details](#ionic-example-app). 

## Download

### NPM
If you are using Node.js (or have it installed) you can use NPM to download ForerunnerDB via:

```bash
npm install forerunnerdb
```

### NPM Dev Builds
You can also install the development version which usually includes new features that
are considered either unstable or untested. To install the development version you can
ask NPM for the dev tag:

```bash
npm install forerunnerdb --tag dev
```

### Bower
You can also install ForerunnerDB via the bower package manager:

```bash
bower install forerunnerdb
```


### No Package Manager
If you are still a package manager hold-out or you would prefer a more traditional download, please click [here](https://github.com/irrelon/ForerunnerDB/archive/master.zip).

# How to Use
## Use ForerunnerDB in *Browser*
> fdb-all.min.js is the entire ForerunnerDB with all the added extras. If you prefer
only the core database functionality (just collections, no views etc) you can use
fdb-core.min.js instead. A [list of the different builds](#distribution-files) is available for you to select
the best build for your purposes.

Include the fdb-all.min.js file in your HTML (change path to the location you put forerunner):

```html
<script src="./js/dist/fdb-all.min.js" type="text/javascript"></script>
```

## Use ForerunnerDB in *Node.js*
After installing via npm (see above) you can require ForerunnerDB in your code:

```js
var ForerunnerDB = require("forerunnerdb");
var fdb = new ForerunnerDB();
```

## Create a Database

```js
var db = fdb.db("myDatabaseName");
```

> If you do not specify a database name a randomly generated one is provided instead.

## Collections (Tables)
> Data Binding: Enabled

To create or get a reference to a collection object, call db.collection (where collectionName is the name of your collection):

```js
var collection = db.collection("collectionName");
```

In our examples we will use a collection called "item" which will store some fictitious items for sale:

```js
var itemCollection = db.collection("item");
```

### Auto-Creation
When you request a collection that does not yet exist it is automatically created. If
it already exists you are given the reference to the existing collection. If you want
ForerunnerDB to throw an error if a collection is requested that does not already exist
you can pass an option to the *collection()* method instead:

```js
var collection = db.collection("collectionName", {autoCreate: false});
```

### Specifying a Primary Key Up-Front
> If no primary key is specified ForerunnerDB uses "_id" by default.

On requesting a collection you can specify a primary key that the collection should be
using. For instance to use a property called "name" as the primary key field:

```js
var collection = db.collection("collectionName", {primaryKey: "name"});
```

You can also read or specify a primary key after instantiation via the primaryKey() method.

### Capped Collections
Occasionally it is useful to create a collection that will store a finite number of records.
When that number is reached, any further documents inserted into the collection will cause
the oldest inserted document to be removed from the collection on a first-in-first-out rule
(FIFO).

In this example we create a capped collection with a document limit of 5:

```js
var collection = db.collection("collectionName", {capped: true, size: 5});
```

## Inserting Documents
> If you do not specify a value for the primary key, one will be automatically
generated for any documents inserted into a collection. Auto-generated primary
keys are pseudo-random 16 character strings.

> **PLEASE NOTE**: When doing an insert into a collection, ForerunnerDB will
automatically split the insert up into smaller chunks (usually of 100 documents)
at a time to ensure the main processing thread remains unblocked. If you wish
to be informed when the insert operation is complete you can pass a callback
method to the insert call. Alternatively you can turn off this behaviour by
calling yourCollection.deferredCalls(false);

You can either insert a single document object:

```js
itemCollection.insert({
	_id: 3,
	price: 400,
	name: "Fish Bones"
});
```

or pass an array of documents:

```js
itemCollection.insert([{
	_id: 4,
	price: 267,
	name:"Scooby Snacks"
}, {
	_id: 5,
	price: 234,
	name: "Chicken Yum Yum"
}]);
```

### Inserting a Large Number of Documents

When inserting large amounts of documents ForerunnerDB may break your insert
operation into multiple smaller operations (usually of 100 documents at a time)
in order to avoid blocking the main processing thread of your browser / Node.js
application. You can find out when an insert has completed either by passing
a callback to the insert call or by switching off async behaviour.

Passing a callback:

```js
itemCollection.insert([{
	_id: 4,
	price: 267,
	name:"Scooby Snacks"
}, {
	_id: 5,
	price: 234,
	name: "Chicken Yum Yum"
}], function (result) {
	// The result object will contain two arrays (inserted and failed)
	// which represent the documents that did get inserted and those
	// that didn't for some reason (usually index violation). Failed
	// items also contain a reason. Inspect the failed array for further
	// information.
});
```

If you wish to switch off async behaviour you can do so on a per-collection basis
via:

```js
db.collection('myCollectionName').deferredCalls(false);
```

After async behaviour (deferred calls) has been disabled, you can insert records
and be sure that they will all have inserted before the next statement is
processed by the application's main thread.

### Inserting Special Objects
JSON has limitations on the types of objects it will serialise and de-serialise back to
an object. Two very good examples of this are the Date() and RegExp() objects. Both can
be serialised via JSON.stringify() but when calling JSON.parse() on the serialised
version neither type will be "re-materialised" back to their object representations.

For example:

```js
var a = {
	dt: new Date()
};

a.dt instanceof Date; // true

var b = JSON.stringify(a); // "{"dt":"2016-02-11T09:52:49.170Z"}"

var c = JSON.parse(b); // {dt: "2016-02-11T09:52:49.170Z"}

c.dt instanceof Date; // false
```

As you can see, parsing the JSON string works but the dt key no longer contains a Date
instance and only holds the string representation of the date. This is a fundamental drawback
of using JSON.stringify() and JSON.parse() in their native form.

If you want ForerunnerDB to serialise / de-serialise your object instances you must
use this format instead:

```js
var a = {
	dt: fdb.make(new Date())
};
```

By wrapping the new Date() in fdb.make() we allow ForerunnerDB to provide the Date()
object with a custom .toJSON() method that serialises it differently to the native
implementation.

For convenience the make() method is also available on all ForerunnerDB class
instances e.g. db, collection, view etc. For instance you can access make via:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db('test'),
	coll = db.collection('testCollection'),
	date = new Date();

// All of these calls will do the same thing:
date = fdb.make(date);
date = db.make(date);
date = coll.make(date);
```

You can read more about how ForerunnerDB's serialiser works [here](https://github.com/Irrelon/ForerunnerDB/wiki/Serialiser-&-Performance-Benchmarks).

#### Supported Instance Types and Usage

##### Date
```js
var a = {
	dt: fdb.make(new Date())
};
```

##### RegExp
```js
var a = {
	re: fdb.make(new RegExp(".*", "i"))
};
```

or

```js
var a = {
	re: fdb.make(/.*/i))
};
```

#### Adding Custom Types to the Serialiser
ForerunnerDB's serialisation system allows for custom type handling so that you
can expand JSON serialisation to your own custom class instances.

This can be a complex topic so it has been broken out into the Wiki section for
further reading [here](https://github.com/Irrelon/ForerunnerDB/wiki/Adding-Custom-Types-to-the-Serialiser).

## Searching the Collection
> **PLEASE NOTE** While we have tried to remain as close to MongoDB's query language
 as possible, small differences are present in the query matching logic. The main
 difference is described here: [Find behaves differently from MongoDB](https://github.com/Irrelon/ForerunnerDB/issues/43)

> See the *[Special Considerations](#special-considerations)* section for details about how names of keys / properties
in a query object can affect a query's operation.

Much like MongoDB, searching for data in a collection is done using the find() method,
which supports many of the same operators starting with a $ that MongoDB supports. For
instance, finding documents in the collection where the price is greater than 90 but
less than 150, would look like this:

```js
itemCollection.find({
	price: {
		"$gt": 90,
		"$lt": 150
	}
});
```

And would return an array with all matching documents. If no documents match your search,
an empty array is returned.

### Regular Expressions

Searches support regular expressions for advanced text-based queries. Simply pass the
regular expression object as the value for the key you wish to search, just like when
using regular expressions with MongoDB.

Insert a document:
```js
collection.insert([{
	"foo": "hello"
}]);
```

Search by regular expression:
```js
collection.find({
	"foo": /el/
});
```

You can also use the RegExp object instead:
```js
var myRegExp = new RegExp("el");

collection.find({
	"foo": myRegExp
});
```

### Query Operators
ForerunnerDB supports many of the same query operators that MongoDB does, and adds some
that are not available in MongoDB but which can help in browser-centric applications.

* [$gt](#gt) Greater Than
* [$gte](#gte) Greater Than / Equal To
* [$lt](#lt) Less Than
* [$lte](#lte) Less Than / Equal To
* [$eq](#eq) Equal To (==)
* [$eeq](#eeq) Strict Equal To (===)
* [$ne](#ne) Not Equal To (!=)
* [$nee](#nee) Strict Not Equal To (!==)
* [$not](#not) Apply boolean not to query
* [$in](#in) Match Any Value In An Array Of Values
* [$fastIn](#fastIn) Match Any String or Number In An Array Of String or Numbers
* [$nin](#nin)  Match Any Value Not In An Array Of Values
* [$distinct](#distinct) Match By Distinct Key/Value Pairs
* [$count](#count) Match By Length Of Sub-Document Array
* [$or](#or) Match any of the conditions inside the sub-query
* [$and](#and) Match all conditions inside the sub-query
* [$exists](#exists) Check that a key exists in the document
* [$elemMatch](#elemMatch) Limit sub-array documents by query
* [$elemsMatch](#elemsMatch) Multiple document version of $elemMatch
* [$aggregate](#aggregate) Converts an array of documents into an array of values base on a path / key
* [$near](#near) Geospatial operation finds outward from a central point

#### $gt
Selects those documents where the value of the field is greater than (i.e. >) the specified value.

```js
{ field: {$gt: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$gt: 1
	}
});
```
	
Result is:

```js
[{
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]
```

#### $gte
Selects the documents where the value of the field is greater than or equal to (i.e. >=) the specified
value.

```js
{ field: {$gte: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$gte: 1
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]
```

#### $lt
Selects the documents where the value of the field is less than (i.e. <) the specified value.

```js
{ field: { $lt: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$lt: 2
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}]
```

#### $lte
Selects the documents where the value of the field is less than or equal to (i.e. <=) the specified value.

```js
{ field: { $lte: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$lte: 2
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}]
	```

#### $eq
Selects the documents where the value of the field is equal (i.e. ==) to the specified value.

```js
{field: {$eq: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$eq: 2
	}
});
```
	
Result is:

```js
[{
	_id: 2,
	val: 2
}]
```

#### $eeq
Selects the documents where the value of the field is strict equal (i.e. ===) to the
specified value. This allows for strict equality checks for instance zero will not be
seen as false because 0 !== false and comparing a string with a number of the same value
will also return false e.g. ('2' == 2) is true but ('2' === 2) is false.

```js
{field: {$eeq: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: "2"
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: "2"
}]);

result = coll.find({
	val: {
		$eeq: 2
	}
});
```
	
Result is:

```js
[{
	_id: 2,
	val: 2
}]
```

#### $ne
Selects the documents where the value of the field is not equal (i.e. !=) to the specified value.
This includes documents that do not contain the field.

```js
{field: {$ne: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$ne: 2
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 3,
	val: 3
}]
```

#### $nee
Selects the documents where the value of the field is not equal equal (i.e. !==) to the
specified value. This allows for strict equality checks for instance zero will not be
seen as false because 0 !== false and comparing a string with a number of the same value
will also return false e.g. ('2' != 2) is false but ('2' !== 2) is true. This includes
documents that do not contain the field.

```js
{field: {$nee: value} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$nee: 2
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 3,
	val: 3
}]
```

#### $not
Selects the documents where the result of the query inside the $not operator
do not match the query object.

```js
{$not: query}
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");

coll.insert({
	_id: 1,
	name: 'John Doe',
	group: [{
		name: 'groupOne'
	}, {
		name: 'groupTwo'
	}]
});

coll.insert({
	_id: 2,
	name: 'Jane Doe',
	group: [{
		name: 'groupTwo'}
	]
});

result = coll.find({
	$not: {
		group: {
			name: 'groupOne'
		}
	}
});
```

Result is:

```js
[{
 	_id: 2,
 	name: 'Jane Doe',
 	group: [{
 		name: 'groupTwo'}
 	]
}]
```

#### $in
> If your field is a string or number and your array of values are also either strings
or numbers you can utilise $fastIn which is an optimised $in query that uses indexOf()
to identify matching values instead of looping over all items in the array of values
and running a new matching process against each one. If your array of values include
sub-queries or other complex logic you should use $in, not $fastIn.

Selects documents where the value of a field equals any value in the specified array.

```js
{ field: { $in: [<value1>, <value2>, ... <valueN> ] } }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$in: [1, 3]
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 3,
	val: 3
}]
```

#### $fastIn
> You can use $fastIn instead of $in when your field contains a string or number and 
your array of values contains only strings or numbers. $fastIn utilises indexOf() to
speed up performance of the query. This means that the array of values is not evaluated
for sub-queries, other operators like $gt etc, and it is assumed that the array of
values is a completely flat array, filled only with strings or numbers.

Selects documents where the string or number value of a field equals any string or number
value in the specified array.

The array of values *MUST* be a flat array and contain only strings or numbers.

```js
{ field: { $fastIn: [<value1>, <value2>, ... <valueN> ] } }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$fastIn: [1, 3]
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 3,
	val: 3
}]
```

#### $nin
Selects documents where the value of a field does not equal any value in the specified array.

```js
{ field: { $nin: [ <value1>, <value2> ... <valueN> ]} }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	val: {
		$nin: [1, 3]
	}
});
```
	
Result is:

```js
[{
	_id: 2,
	val: 2
}]
```

#### $distinct
Selects the first document matching a value of the specified field. If any further documents have the same
value for the specified field they will not be returned.

```js
{ $distinct: { field: 1 } }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 1
}, {
	_id: 3,
	val: 1
}, {
	_id: 4,
	val: 2
}]);

result = coll.find({
	$distinct: {
		val: 1
	}
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 4,
	val: 2
}]
```

#### $count
> Version >= 1.3.326

> This is equivalent to MongoDB's $size operator but please see below for usage.

Selects documents based on the length (count) of items in an array inside a document.

```js
{ $count: { field: <value> } }
```

##### Select Documents Where The "arr" Array Field Has Only 1 Item

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	arr: []
}, {
	_id: 2,
	arr: [{
		val: 1		
	}]
}, {
	_id: 3,
	arr: [{
		val: 1
	}, {
		val: 2		
	}]
}]);

result = coll.find({
	$count: {
		arr: 1
	}
});
```
	
Result is:

```js
[{
	_id: 2,
	arr: [{
		val: 1		
	}]
}]
```

##### Select Documents Where The "arr" Array Field Has More Than 1 Item

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	arr: []
}, {
	_id: 2,
	arr: [{
		val: 1		
	}]
}, {
	_id: 3,
	arr: [{
		val: 1
	}, {
		val: 2		
	}]
}]);

result = coll.find({
	$count: {
		arr: {
			$gt: 1
		}
	}
});
```
	
Result is:

```js
[{
	_id: 3,
	arr: [{
		val: 1
	}, {
		val: 2		
	}]
}]
```

#### $or
The $or operator performs a logical OR operation on an array of two or more <expressions> and selects the documents
that satisfy at least one of the <expressions>.

```js
{ $or: [ { <expression1> }, { <expression2> }, ... , { <expressionN> } ] }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	$or: [{
		val: 1
	}, {
		val: {
			$gte: 3 
		}
	}]
});
```
	
Result is:

```js
[{
	_id: 1,
	val: 1
}, {
	_id: 3,
	val: 3
}]
```

#### $and
Performs a logical AND operation on an array of two or more expressions (e.g. <expression1>, <expression2>, etc.)
and selects the documents that satisfy all the expressions in the array. The $and operator uses short-circuit
evaluation. If the first expression (e.g. <expression1>) evaluates to false, ForerunnerDB will not evaluate the
remaining expressions.

```js
{ $and: [ { <expression1> }, { <expression2> } , ... , { <expressionN> } ] }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	$and: [{
		_id: 3
	}, {
		val: {
			$gte: 3 
		}
	}]
});
```
	
Result is:

```js
[{
	_id: 3,
	val: 3
}]
```

#### $exists
When <boolean> is true, $exists matches the documents that contain the field, including documents where the field
value is null. If <boolean> is false, the query returns only the documents that do not contain the field.

```js
{ field: { $exists: <boolean> } }
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2,
	moo: "hello"
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({
	moo: {
		$exists: true
	}
});
```
	
Result is:

```js
[{
	_id: 2,
	val: 2,
	moo: "hello"
}]
```

### Projection

#### $elemMatch
The $elemMatch operator limits the contents of an *array* field from the query results to contain only the first element matching the $elemMatch condition.

The $elemMatch operator is specified in the *options* object of the find call rather than
 the query object.
 
[MongoDB $elemMatch Documentation](http://docs.mongodb.org/manual/reference/operator/projection/elemMatch/)
 
##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert({
	names: [{
		_id: 1,
		text: "Jim"
	}, {
		_id: 2,
		text: "Bob"
	}, {
		_id: 3,
		text: "Bob"
	}, {
		_id: 4,
		text: "Anne"
	}, {
		_id: 5,
		text: "Simon"
	}, {
		_id: 6,
		text: "Uber"
	}]
});

result = coll.find({}, {
	$elemMatch: {
		names: {
			text: "Bob"
		}
	}
});
```
	
Result is:

```js
{
	names: [{
		_id: 2,
		text: "Bob"
	}]
}
```

Notice that only the FIRST item matching the $elemMatch clause is returned in the names array.
If you require multiple matches use the ForerunnerDB-specific $elemsMatch operator instead.

#### $elemsMatch
The $elemsMatch operator limits the contents of an *array* field from the query results to contain only the elements matching the $elemMatch condition.

The $elemsMatch operator is specified in the *options* object of the find call rather than
 the query object.
 
##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert({
	names: [{
		_id: 1,
		text: "Jim"
	}, {
		_id: 2,
		text: "Bob"
	}, {
		_id: 3,
		text: "Bob"
	}, {
		_id: 4,
		text: "Anne"
	}, {
		_id: 5,
		text: "Simon"
	}, {
		_id: 6,
		text: "Uber"
	}]
});

result = coll.find({}, {
	$elemsMatch: {
		names: {
			text: "Bob"
		}
	}
});
```
	
Result is:

```js
{
	names: [{
		_id: 2,
		text: "Bob"
	}, {
		_id: 3,
		text: "Bob"
	}]
}
```

Notice that all items matching the $elemsMatch clause are returned in the names array.
If you require match on ONLY the first item use the MongoDB-compliant $elemMatch operator instead.

#### $aggregate
Coverts an array of documents into an array of values that are derived from a key or path in the
documents. This is very useful when combined with the $find operator to run sub-queries and return
arrays of values from the results.

```js
{ $aggregate: path}
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");
	
coll.insert([{
	_id: 1,
	val: 1
}, {
	_id: 2,
	val: 2
}, {
	_id: 3,
	val: 3
}]);

result = coll.find({}, {
	$aggregate: "val"
});
```

Result is:

```json
[1, 2, 3]
```

#### $near
> **PLEASE NOTE**: BETA STATUS - PASSES UNIT TESTING BUT MAY BE UNSTABLE

Finds other documents whose co-ordinates based on a 2d index are within the specified
distance from the specified centre point. Co-ordinates must be presented in
latitude / longitude for $near to work.

```js
{
	field: {
		$near: {
			$point: [<latitude number>, <longitude number>],
			$maxDistance: <number>,
			$distanceUnits: <units string>
		}
	}
}
```

##### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");

coll.insert([{
	latLng: [51.50722, -0.12750],
	name: 'Central London'
}, {
	latLng: [51.525745, -0.167550], // 2.18 miles
	name: 'Marylebone, London'
}, {
	latLng: [51.576981, -0.335091], // 10.54 miles
	name: 'Harrow, London'
}, {
	latLng: [51.769451, 0.086509], // 20.33 miles
	name: 'Harlow, Essex'
}]);

// Create a 2d index on the lngLat field
coll.ensureIndex({
	latLng: 1
}, {
	type: '2d'
});

// Query index by distance
// $near queries are sorted by distance from centre point by default
result = coll.find({
	latLng: {
		$near: {
			$point: [51.50722, -0.12750],
			$maxDistance: 3,
			$distanceUnits: 'miles'
		}
	}
});
```

Result is:

```json
[{
	"lngLat": [51.50722, -0.1275],
	"name": "Central London",
	"_id": "1f56c0b5885de40"
}, {
	"lngLat": [51.525745, -0.16755],
	"name": "Marylebone, London",
	"_id": "372a34d9f17fbe0"
}]
```

### Ordering / Sorting Results
You can specify an $orderBy option along with the find call to order/sort your results. This uses the same syntax as MongoDB:

```js
itemCollection.find({
	price: {
		"$gt": 90,
		"$lt": 150
	}
}, {
	$orderBy: {
		price: 1 // Sort ascending or -1 for descending
	}
});
```

### Grouping Results
> Version >= 1.3.757

You can specify a $groupBy option along with the find call to group your results:

```js
myColl = db.collection('myColl');

myColl.insert([{
	"price": "100",
	"category": "dogFood"
}, {
 	"price": "60",
 	"category": "catFood"
}, {
	"price": "70",
	"category": "catFood"
}, {
	"price": "65",
	"category": "catFood"
}, {
	"price": "35",
	"category": "dogFood"
}]);

myColl.find({}, {
	$groupBy: {
		"category": 1 // Group using the "category" field. Path's are also allowed e.g. "category.name"
	}
});
```

Result is:

```json
{
	"dogFood": [{
		"price": "100",
		"category": "dogFood"
	}, {
		"price": "35",
		"category": "dogFood"
	}],
	"catFood": [{
		"price": "60",
		"category": "catFood"
	}, {
		"price": "70",
		"category": "catFood"
	}, {
		"price": "65",
		"category": "catFood"
	}],
}
```

### Limiting Return Fields - Querying for Partial Documents / Objects
You can specify which fields are included in the return data for a query by adding them in
the options object. This returns a partial document for each matching document in your query. 

This follows the same rules specified by MongoDB here: 

[MongoDB Documentation](http://docs.mongodb.org/manual/tutorial/project-fields-from-query-results/)

> Please note that the primary key field will always be returned unless explicitly excluded
from the results via "_id: 0".

#### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test");

coll.insert([{
	_id: 1,
	text: "Jim",
	val: 2131232,
	arr: [
		"foo",
		"bar",
		"you"
	]
}]);
```

Now query for only the "text" field of each document:

```js
result = coll.find({}, {
	text: 1
});
```
	
Result is:

```js
[{
	_id: 1,
	text: "Jim"
}]
```

Notice the _id field is ALWAYS included in the results unless you explicitly exclude it:

```js
result = coll.find({}, {
	_id: 0,
	text: 1
});
```
	
Result is:

```js
[{
	text: "Jim"
}]
```

### Pagination / Paging Through Results
> Version >= 1.3.55

It is often useful to limit the number of results and then page through the results one
page at a time. ForerunnerDB supports an easy pagination system via the $page and $limit
query options combination.

#### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test"),
	data = [],
	count = 100,
	result,
	i;

// Generate random data
for (i = 0; i < count; i++) {
	data.push({
		_id: String(i),
		val: i
	});
}

coll.insert(data);

// Query the first 10 records (page indexes are zero-based
// so the first page is page 0 not page 1)
result = coll.find({}, {
	$page: 0,
	$limit: 10
});

// Query the next 10 records
result = coll.find({}, {
	$page: 1,
	$limit: 10
});
```

### Skipping Records in a Query
> Version >= 1.3.55

You can skip records at the beginning of a query result by providing the $skip query
option. This operates in a similar fashion to the MongoDB [skip()](http://docs.mongodb.org/manual/reference/method/cursor.skip/) method.

#### Usage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test").truncate(),
	data = [],
	count = 100,
	result,
	i;

// Generate random data
for (i = 0; i < count; i++) {
	data.push({
		_id: String(i),
		val: i
	});
}

coll.insert(data);
result = coll.find({}, {
	$skip: 50
});
```

### Finding and Returning Sub-Documents
When you have documents that contain arrays of sub-documents it can be useful to search
and extract them. Consider this data structure:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test").truncate(),
	result,
	i;

coll.insert({
	_id: "1",
	arr: [{
		_id: "332",
		val: 20,
		on: true
	}, {
		_id: "337",
		val: 15,
		on: false
	}]
});

/**
 * Finds sub-documents from the collection's documents.
 * @param {Object} match The query object to use when matching parent documents
 * from which the sub-documents are queried.
 * @param {String} path The path string used to identify the key in which
 * sub-documents are stored in parent documents.
 * @param {Object=} subDocQuery The query to use when matching which sub-documents
 * to return.
 * @param {Object=} subDocOptions The options object to use when querying for
 * sub-documents.
 * @returns {*}
 */
result = coll.findSub({
	_id: "1"
}, "arr", {
	on: false
}, {
	//$stats: true,
	//$split: true
});
```

The result of this query is an array containing the sub-documents that matched the 
query parameters:

```js
[{
	_id: "337",
	val: 15,
	on: false
}]
```

> The result of findSub never returns a parent document's data, only data from the 
matching sub-document(s)

The fourth parameter (options object) allows you to specify if you wish to have stats
and if you wish to split your results into separate arrays for each matching parent
document.

### Subqueries and Subquery Syntax
> Version >= 1.3.469

> Subqueries are ForerunnerDB specific and do not work in MongoDB

A subquery is a query object within another query object.

Subqueries are useful when the query you wish to run is reliant on data inside another
collection or view and you do not want to run a separate query first to retrieve that
data.
 
Subqueries in ForerunnerDB are specified using the $find operator inside your query.

Take the following example data:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	users = db.collection("users"),
	admins = db.collection("admins");
	
users.insert([{
	_id: 1,
	name: "Jim"
}, {
	_id: 2,
	name: "Bob"
}, {
	_id: 3,
	name: "Bob"
}, {
	_id: 4,
	name: "Anne"
}, {
	_id: 5,
	name: "Simon"
}]);

admins.insert([{
	_id: 2,
	enabled: true
}, {
	_id: 4,
	enabled: true
}, {
	_id: 5,
	enabled: false
}]);

result = users.find({
	_id: {
		$in: {
			$find: {
				$from: "admins",
				$query: {
					enabled: true
				},
				$options: {
					$aggregate: "_id"
				}
			}
		}
	}
});
```

When this query is executed the $find sub-query object is replaced with the results from
the sub-query so that the final query with (aggregated)[#$aggregate] _id field looks like this:

```js
result = users.find({
	_id: {
		$in: [3, 4]
	}
});
```

The result of the query after execution is:

```json
[{
	"_id": 3,
	"name": "Bob"
}, {
	"_id": 4,
	"name": "Anne"
}]
```

## Updating the Collection
This is one of the areas where ForerunnerDB and MongoDB are different. By default
ForerunnerDB updates only the keys you specify in your update document, rather
than outright *replacing* the matching documents like MongoDB does. In this sense
ForerunnerDB behaves more like MySQL. In the call below, the update will find all
documents where the price is greater than 90 and less than 150 and then update
the documents' key "moo" with the value true.

```js
collection.update({
	price: {
		"$gt": 90,
		"$lt": 150
	}
}, {
	moo: true
});
```

If you wish to fully replace a document with another one you can do so using the
$replace operator described in the *Update Operators* section below.

If you want to replace a key's value you can use the $overwrite operator described
in the *Update Operators* section below.

## Quick Updates
You can target individual documents for update by their id (primary key) via a quick helper method:

```js
collection.updateById(1, {price: 180});
```

This will update the document with the _id field of 1 to a new price of 180.

### Update Operators

* [$addToSet](#addtoset)
* [$cast](#cast)
* [$each](#each)
* [$inc](#inc)
* [$move](#move)
* [$mul](#mul)
* [$overwrite](#overwrite)
* [$push](#push)
* [$pull](#pull)
* [$pullAll](#pullall)
* [$pop](#pop)
* [$rename](#rename)
* [$replace](#replace)
* [$splicePush](#splicepush)
* [$splicePull](#splicepull)
* [$toggle](#toggle)
* [$unset](#unset)
* [Array Positional in Updates (.$)](#array-positional-in-updates)

#### $addToSet
Adds an item into an array only if the item does not already exist in the array.

ForerunnerDB supports the $addToSet operator as detailed in the MongoDB documentation.
Unlike MongoDB, ForerunnerDB also allows you to specify a matching field / path to check
uniqueness against by using the $key property.

In the following example $addToSet is used to check uniqueness against the whole document
being added:

```js
// Create a collection document
db.collection("test").insert({
	_id: "1",
	arr: []
});

// Update the document by adding an object to the "arr" array
db.collection("test").update({
	_id: "1"
}, {
	$addToSet: {
		arr: {
			name: "Fufu",
			test: "1"
		}
	}
});

// Try and do it again... this will fail because a
// matching item already exists in the array
db.collection("test").update({
	_id: "1"
}, {
	$addToSet: {
		arr: {
			name: "Fufu",
			test: "1"
		}
	}
});
```

Now in the example below we specify which key to test uniqueness against:

```js
// Create a collection document
db.collection("test").insert({
	_id: "1",
	arr: []
});

// Update the document by adding an object to the "arr" array
db.collection("test").update({
	_id: "1"
}, {
	$addToSet: {
		arr: {
			name: "Fufu",
			test: "1"
		}
	}
});

// Try and do it again... this will work because the
// key "test" is different for the existing and new objects
db.collection("test").update({
	_id: "1"
}, {
	$addToSet: {
		arr: {
			$key: "test",
			name: "Fufu",
			test: "2"
		}
	}
});
```

You can also specify the key to check uniqueness against as an object path such as 'moo.foo'.

#### $cast
> Version >= 1.3.34

The $cast operator allows you to change a property's type within a document. If used to 
cast a property to an array or object the property is set to a new blank array or
object respectively.

This example changes the type of the "val" property from a string to a number:

```js
db.collection("test").insert({
	val: "1.2"
});

db.collection("test").update({}, {
	$cast: {
		val: "number"
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
	"_id": "1d6fbf16e080de0",
	"val": 1.2
}]
```

You can also use cast to ensure that an array or object exists on a property without
overwriting that property if one already exists:

```js
db.collection("test").insert({
	_id: "moo",
	arr: [{
		test: true
	}]
});

db.collection("test").update({
	_id: "moo"
}, {
	$cast: {
		arr: "array"
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
	"_id": "moo",
	"arr": [{
		"test": true
	}]
}]
```

Should you wish to initialise an array or object with specific data if the property is
not currently of that type rather than initialising as a blank array / object, you can 
specify the data to use by including a $data property in your $cast operator object:

```js
db.collection("test").insert({
	_id: "moo"
});

db.collection("test").update({
	_id: "moo"
}, {
	$cast: {
		orders: "array",
		$data: [{
			initial: true
		}]
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
	"_id": "moo",
	"orders":[{
		"initial": true
	}]
}]
```

#### $each
> Version >= 1.3.34

$each allows you to iterate through multiple update operations on the same query result.
Use $each when you wish to execute update operations in sequence or on the same query.
Using $each is slightly more performant than running each update operation one after the
other calling update().

Consider the following sequence of update calls that define a couple of nested arrays and
then push a value to the inner-nested array:

```js
db.collection("test").insert({
	_id: "445324",
	count: 5
});

db.collection("test").update({
	_id: "445324"
}, {
	$cast: {
		arr: "array",
		$data: [{}]
	}
});

db.collection("test").update({
	_id: "445324"
}, {
	arr: {
		$cast: {
			secondArr: "array"
		}
	}
});

db.collection("test").update({
	_id: "445324"
}, {
	arr: {
		$push: {
			secondArr: "moo"
		}
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[
	{
		"_id": "445324",
		"count": 5,
		"arr": [{"secondArr": ["moo"]}]
	}
]
```

These calls a wasteful because each update() call must query the collection for matching
documents before running the update against them. With $each you can pass a sequence of
update operations and they will be executed in order:

```js
db.collection("test").insert({
	_id: "445324",
	count: 5
});

db.collection("test").update({
	_id: "445324"
}, {
	$each: [{
		$cast: {
			arr: "array",
			$data: [{}]
		}
	}, {
		arr: {
			$cast: {
				secondArr: "array"
			}
		}
	}, {
		arr: {
			$push: {
				secondArr: "moo"
			}
		}
	}]
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[
	{
		"_id": "445324",
		"count": 5,
		"arr": [{"secondArr": ["moo"]}]
	}
]
```

As you can see the single sequenced call produces the same output as the multiple update()
calls but will run slightly faster and use fewer resources.

#### $inc
The $inc operator increments / decrements a field value by the given number.

```js
db.collection("test").update({
	<query>
}, {
	$inc: {
		<field>: <value>
	}
});
```

In the following example, the "count" field is decremented by 1 in the document that
matches the id "445324":

```js
db.collection("test").insert({
	_id: "445324",
	count: 5
});

db.collection("test").update({
	_id: "445324"
}, {
	$inc: {
		count: -1
	}
});

JSON.stringify(db.collection("test").find());
```
    
Result:

```js
[{
	"_id": "445324",
	"count": 4
}]
```

Using a positive number will increment, using a negative number will decrement.

#### $move
The $move operator moves an item that exists inside a document's array from one index to another.

```js
db.collection("test").update({
	<query>
}, {
	$move: {
		<arrayField>: <value|query>,
		$index: <index>
	}
});
```

The following example moves "Milk" in the "shoppingList" array to index 1 in the
document with the id "23231":

```js
db.users.update({
	_id: "23231"
}, {
	$move: {
		shoppingList: "Milk"
		$index: 1
	}
});
```

#### $mul
The $mul operator multiplies a field value by the given number and sets the result
as the field's new value.

```js
db.collection("test").update({
	<query>
}, {
	$mul: {
		<field>: <value>
	}
});
```

In the following example, the "value" field is multiplied by 2 in the document that
matches the id "445324":

```js
db.collection("test").insert({
	_id: "445324",
	value: 5
});

db.collection("test").update({
	_id: "445324"
}, {
	$mul: {
		value: 2
	}
});

JSON.stringify(db.collection("test").find());
```
    
Result:

```js
[{
	"_id": "445324",
	"value": 10
}]
```

#### $overwrite
The $overwrite operator replaces a key's value with the one passed, overwriting it
completely. This operates the same way that MongoDB's default update behaviour works
without using the $set operator.

If you wish to fully replace a document with another one you can do so using the
$replace operator instead.

The $overwrite operator is most useful when updating an array field to a new type
such as an object. By default ForerunnerDB will detect an array and step into the
array objects one at a time and apply the update to each object. When you use
$overwrite you can replace the array instead of stepping into it.

```js
db.collection("test").update({
	<query>
}, {
	$overwrite: {
		<field>: <value>,
		<field>: <value>,
		<field>: <value>
	}
});
```

In the following example the "arr" field (initially an array) is replaced by an object:

```js
db.collection("test").insert({
	_id: "445324",
	arr: [{
		foo: 1
	}]
});

db.collection("test").update({
	_id: "445324"
}, {
	$overwrite: {
		arr: {
			moo: 1
		}
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
	"_id": "445324",
	"arr": {
		"moo": 1
	}
}]
```

#### $push
The $push operator appends a specified value to an array.

```js
db.collection("test").update({
	<query>
}, {
	$push: {
		<field>: <value>
	}
});
```

The following example appends "Milk" to the "shoppingList" array in the document with the id "23231":

```js
db.collection("test").insert({
	_id: "23231",
	shoppingList: []
});

db.collection("test").update({
	_id: "23231"
}, {
	$push: {
		shoppingList: "Milk"
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
	"_id": "23231",
	"shoppingList": [
		"Milk"
	]
}]
```

#### $pull
The $pull operator removes a specified value or values that match an input query.

```js
db.collection("test").update({
	<query>
}, {
	$pull: {
		<arrayField>: <value|query>
	}
});
```

The following example removes the "Milk" entry from the "shoppingList" array:

```js
db.users.update({
	_id: "23231"
}, {
	$pull: {
		shoppingList: "Milk"
	}
});
```

If an array element is an embedded document (JavaScript object), the $pull operator applies its specified query to the element as though it were a top-level object.

#### $pullAll
The $pullAll operator removes all values / array entries that match an input
query from the target array field.

```js
db.collection("test").update({
	<query>
}, {
	$pullAll: {
		<arrayField>: <value|query>
	}
});
```

The following example removes all instances of "Milk" and "Toast from the "items" array:

```js
db.users.update({
	_id: "23231"
}, {
	$pullAll: {
		items: ["Milk", "Toast"]
	}
});
```

If an array element is an embedded document (JavaScript object), the $pullAll operator applies its specified query to the element as though it were a top-level object.

#### $pop
The $pop operator removes an element from an array at the beginning or end. If you wish to remove
an element from the end of the array pass 1 in your value. If you wish to remove an element from
the beginning of an array pass -1 in your value.

```js
db.collection("test").update({
	<query>
}, {
	$pop: {
		<field>: <value>
	}
});
```

The following example pops the item from the beginning of the "shoppingList" array:

```js
db.collection("test").insert({
	_id: "23231",
	shoppingList: [{
		_id: 1,
		name: "One"
	}, {
		_id: 2,
		name: "Two"
	}, {
		_id: 3,
		name: "Three"
	}]
});

db.collection("test").update({
	_id: "23231"
}, {
	$pop: {
		shoppingList: -1 // -1 pops from the beginning, 1 pops from the end
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
	_id: "23231",
	shoppingList: [{
		_id: 2,
		name: "Two"
	}, {
		_id: 3,
		name: "Three"
	}]
}]
```

#### $rename
Renames a field in any documents that match the query with a new name.

```js
db.collection("test").update({
	<query>
}, {
	$rename: {
		<field>: <newName>
	}
});
```

The following example renames the "action" field to "jelly":

```js
db.collection("test").insert({
	_id: "23231",
	action: "Foo"
});

db.collection("test").update({
	_id: "23231"
}, {
	$rename: {
		action: "jelly"
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
 	_id: "23231",
 	jelly: "Foo"
 }]
```

#### $replace
> PLEASE NOTE: $replace can only be used on the top-level. Nested $replace operators
 are not currently supported and may cause unexpected behaviour.

The $replace operator will take the passed object and overwrite the target document
with the object's keys and values. If a key exists in the existing document but
not in the passed object, ForerunnerDB will remove the key from the document.

The $replace operator is equivalent to calling MongoDB's update without using a 
MongoDB $set operator.

When using $replace the primary key field will *NEVER* be replaced even if it is
specified. If you wish to change a record's primary key id, remove the document
and insert a new one with your desired id.

```js
db.collection("test").update({
	<query>
}, {
	$replace: {
		<field>: <value>,
		<field>: <value>,
		<field>: <value>
	}
});
```

In the following example the existing document is outright replaced by a new one:

```js
db.collection("test").insert({
	_id: "445324",
	name: "Jill",
	age: 15
});

db.collection("test").update({
	_id: "445324"
}, {
	$replace: {
		job: "Frog Catcher"
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[{
	"_id": "445324",
	"job": "Frog Catcher"
}]
```

#### $splicePush
The $splicePush operator adds an item into an array at a specified index.

```js
db.collection("test").update({
	<query>
}, {
	$splicePush: {
		<field>: <value>
		$index: <index>
	}
});
```

The following example inserts "Milk" to the "shoppingList" array at index 1 in the document with the id "23231":

```js
db.collection("test").insert({
	_id: "23231",
	shoppingList: [
		"Sugar",
		"Tea",
		"Coffee"
	]
});

db.collection("test").update({
	_id: "23231"
}, {
	$splicePush: {
		shoppingList: "Milk",
		$index: 1
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[
	{
		"_id": "23231",
		"shoppingList": [
			"Sugar",
			"Milk",
			"Tea",
			"Coffee"
		]
	}
]
```

#### $splicePull
The $splicePull operator removes an item (or items) from an array at a specified index.
If you specify a $count operator the splicePull operation will remove from the $index
to the number of items you specify. $count defaults to 1 if it is not specified.

```js
db.collection("test").update({
	<query>
}, {
	$splicePull: {
		<field>: {
			$index: <index>,
			$count: <integer>
		}
	}
});
```

The following example inserts "Milk" to the "shoppingList" array at index 1 in the document with the id "23231":

```js
db.collection("test").insert({
	_id: "23231",
	shoppingList: [
		"Sugar",
		"Tea",
		"Coffee"
	]
});

db.collection("test").update({
	_id: "23231"
}, {
	$splicePull: {
		shoppingList: {
			$index: 1
		}
	}
});

JSON.stringify(db.collection("test").find());
```

Result:

```js
[
	{
		"_id": "23231",
		"shoppingList": [
			"Sugar",
			"Milk",
			"Tea",
			"Coffee"
		]
	}
]
```

#### $toggle
The $toggle operator inverts the value of a field with a boolean. If the value
is true before toggling, after toggling it will be false and vice versa.

```js
db.collection("test").update({
	<query>
}, {
	$toggle: {
		<field>: 1
	}
});
```

In the following example, the "running" field is toggled from true to false:

```js
db.collection("test").insert({
	_id: "445324",
	running: true
});

db.collection("test").update({
	_id: "445324"
}, {
	$toggle: {
		running: 1
	}
});

JSON.stringify(db.collection("test").find());
```
    
Result:

```js
[{
	"_id": "445324",
	"running": false
}]
```

#### $unset
The $unset operator removes a field from a document.

```js
db.collection("test").update({
	<query>
}, {
	$unset: {
		<field>: 1
	}
});
```

In the following example, the "count" field is remove from the document that
matches the id "445324":

```js
db.collection("test").insert({
	_id: "445324",
	count: 5
});

db.collection("test").update({
	_id: "445324"
}, {
	$unset: {
		count: 1
	}
});

JSON.stringify(db.collection("test").find());
```
    
Result:

```js
[{
	"_id": "445324"
}]
```

#### Array Positional in Updates (.$)
Often you want to update a sub-document stored inside an array. You can use the array positional
operator to tell ForerunnerDB that you wish to update a sub-document that matches your query
clause.

The following example updates the sub-document in the array *"arr"* with the _id *"foo"* so
that the *"name"* property is set to *"John"*:

```js
db.collection("test").insert({
	_id: "2",
	arr: [{
		_id: "foo",
		name: "Jim"
	}]
});

var result = db.collection("test").update({
	_id: "2",
	"arr": {
		"_id": "foo"
	}
}, {
	"arr.$": {
		name: "John"
	}
});
```

Internally this operation checks the update for property's ending in ".$" and then looks
at the query part of the call to see if a corresponding clause exists for it. In the example
above the "arr.$" property in the update part has a corresponding "arr" in the query part
which determines which sub-documents are to be updated based on if they match or not.

## Upsert Documents
Upserts are operations that automatically decide if the database should run an insert or an
update operation based on the data you provide.

Using upsert() is effectively the same as using insert(). You pass an object or array of
objects to the upsert() method and they are processed.

```js
// This will execute an insert operation because a document with the _id "1" does not
// currently exist in the database.
db.collection("test").upsert({
	"_id": "1",
	"test": true
});

db.collection("test").find(); // [{"_id": "1", "test": true}]

// We now perform an upsert and change "test" to false. This will perform an update operation
// since a document with the _id "1" now exists.
db.collection("test").upsert({
	"_id": "1",
	"test": false
});

db.collection("test").find(); // [{"_id": "1", "test": false}]
```

One of the restrictions of upsert() is that you cannot use any update operators in your
document because the operation *could* be an insert. For this reason, upserts should only
contain data and no $ operators like $push, $unset etc.

An upsert operation both returns an array of results and accepts a callback that will
receive the same array data on what operations were done for each document passed, as
well as the result of that operation. See the [http://forerunnerdb.com/source/doc/Collection.html#upsert](upsert documentation) for more details.

## Count Documents
The count() method is useful when you want to get a count of the number of documents in a
collection or a count of documents that match a specified query.

### Count All Documents
```js
// Cound all documents in the "test" collection
var num = db.collection("test").count();
```

### Count Documents Based on Query
```js
// Get all documents whos myField property has the value of 1
var num = db.collection("test").count({
	myField: 1
});
```

## Get Data Item By Reference
JavaScript objects are passed around as references to the same object. By default when you query ForerunnerDB it will "decouple" the results from the internal objects stored in the collection. If you would prefer to get the reference instead of decoupled object you can specify this in the query options like so:

```js
var result = db.collection("item").find({}, {
	$decouple: false
});
```

If you do not specify a decouple option, ForerunnerDB will default to true and return decoupled objects.

Keep in mind that if you switch off decoupling for a query and then modify any object returned, it will also modify the internal object held in ForerunnerDB, which could result in incorrect index data as well as other anomalies.

## Primary Keys
If your data uses different primary key fields from the default "_id" then you need to tell the collection. Simply call
the primaryKey() method with the name of the field your primary key is stored in:

```js
collection.primaryKey("itemId");
```

When you change the primary key field name, methods like updateById will use this field automatically instead of the
default one "_id".

## Removing Documents
Removing is as simple as doing a normal find() call, but with the search for docs you want to remove. Remove all
documents where the price is greater than or equal to 100:

```js
collection.remove({
	price: {
		"$gte": 100
	}
});
```

### Joins
Sometimes you want to join two or more collections when running a query and return
a single document with all the data you need from those multiple collections.
ForerunnerDB supports collection joins via a simple options key "$join". For instance,
let's setup a second collection called "purchase" in which we will store some details
about users who have ordered items from the "item" collection we initialised above:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	itemCollection = db.collection("item"),
	purchaseCollection = db.collection("purchase");

itemCollection.insert([{
	_id: 1,
	name: "Cat Litter",
	price: 200
}, {
	_id: 2,
	name: "Dog Food",
	price: 100
}, {
	_id: 3,
	price: 400,
	name: "Fish Bones"
}, {
	_id: 4,
	price: 267,
	name:"Scooby Snacks"
}, {
	_id: 5,
	price: 234,
	name: "Chicken Yum Yum"
}]);

purchaseCollection.insert([{
	itemId: 4,
	user: "Fred Bloggs",
	quantity: 2
}, {
	itemId: 4,
	user: "Jim Jones",
	quantity: 1
}]);
```

Now, when we find data from the "item" collection we can grab all the users that
ordered that item as well and store them in a key called "purchasedBy":

```js
itemCollection.find({}, {
	"$join": [{
		"purchase": {
			"itemId": "_id",
			"$as": "purchasedBy",
			"$require": false,
			"$multi": true
		}
	}]
});
```

The "$join" key holds an array of joins to perform, each join object has a key which
denotes the collection name to pull data from, then matching criteria which in this
case is to match purchase.itemId with the item._id. The three other keys are special
operations (start with $) and indicate:

* $as tells the join what object key to store the join results in when returning the document
* $require is a boolean that denotes if the join must be successful for the item to be returned in the final find result
* $multi indicates if we should match just one item and then return, or match multiple items as an array

The result of the call above is:

```json
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
```

#### Advanced Joins Using $where
> Version => 1.3.455

If your join has more advanced requirements than matching against foreign keys alone,
you can specify a custom query that will match data from the foreign collection using
the $where clause in your $join.

For instance, to achieve the same results as the join in the above example, you can
specify matching data in the foreign collection using the $$ back-reference operator:

```js
itemCollection.find({}, {
	"$join": [{
		"purchase": {
			"$where": {
				"$query": {
					"itemId": "$$._id"
				}
			},
			"$as": "purchasedBy",
			"$require": false,
			"$multi": true
		}
	}]
});
```

The $$ back-reference operator allows you to reference key/value data from the document
currently being evaluated by the join operation. In the example above the query in the
$where operator is being run against the **purchase** collection and the back-reference
will lookup the current *_id* in the **itemCollection** for the document currently undergoing
the join.

#### Placing Results $as: "$root"
Suppose we have two collections **"a"** and **"b"** and we run a find() on **"a"** and
join against **"b"**.

$root tells the join system to place the data from **"b"** into the root of the source
document in **"a"** so that it is placed as part of the return documents at root level rather
than under a new key.

If you use *"$as": "$root"* you cannot use *"$multi": true* since that would simply
overwrite the root keys in **"a"** that are copied from the foreign document over and over for
each matching document in **"b"**.

This query also copies the primary key field from matching documents in **"b"** to the document
in **"a"**. If you don't want this, you need to specify the fields that the query will return.
You can do this by specifying an "options" section in the $where clause:

```js
var result = a.find({}, {
	"$join": [{
		"b": {
			"$where": {
				"$query": {
					"_id": "$$._id"
				},
				"$options": {
					"_id": 0
				}
			},
			"$as": "$root",
			"$require": false,
			"$multi": false
		}
	}]
});
```

By providing the options object and specifying the *"_id"* field as zero we are telling
ForerunnerDB to ignore and not return that field in the join data.

    "id": 0

The options section also allows you to join **b** against other collections as well which
means you can created nested joins.

## Triggers
> Version >= 1.3.12

ForerunnerDB currently supports triggers for inserts and updates at both the
*before* and *after* operation phases. Triggers that fire on the *before* phase can
also optionally modify the operation data and actually cancel the operation entirely
allowing you to provide database-level data validation etc.

Setting up triggers is very easy.

### Example 1: Cancel Operation Before Insert Trigger 
Here is an example of a *before insert* trigger that will cancel the insert
operation before the data is inserted into the database:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	collection = db.collection("test");

collection.addTrigger("myTrigger", db.TYPE_INSERT, db.PHASE_BEFORE, function (operation, oldData, newData) {
	// By returning false inside a "before" trigger we cancel the operation
	return false;
});

collection.insert({test: true});
```

The trigger method passed to addTrigger() as parameter 4 should handle these
arguments:

|Argument|Data Type|Description|
|--------------|---------|-----------------------------------------------------|
|operation|object|Details about the operation being executed. In *before update* operations this also includes *query* and *update* objects which you can modify directly to alter the final update applied.|
|oldData|object|The data before the operation is executed. In insert triggers this is always a blank object. In update triggers this will represent what the document that *will* be updated currently looks like. You cannot modify this object.|
|newData|object|The data after the operation is executed. In insert triggers this is the new document being inserted. In update triggers this is what the document being updated *will* look like after the operation is run against it. You can update this object ONLY in *before* phase triggers.|

### Example 2: Modify a Document Before Update
In this example we insert a document into the collection and then update it afterwards.
When the update operation is run the *before update* trigger is fired and the
document is modified before the update is applied. This allows you to make changes to
an operation before the operation is carried out.

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	collection = db.collection("test");

collection.addTrigger("myTrigger", db.TYPE_UPDATE, db.PHASE_BEFORE, function (operation, oldData, newData) {
	newData.updated = String(new Date());
});

// Insert a document with the property "test" being true
collection.insert({test: true});

// Now update that document to set "test" to false - this
// will fire the trigger code registered above and cause the
// final document to have a new property "updated" which
// contains the date/time that the update occurred on that
// document
collection.update({test: true}, {test: false});

// Now inspect the document and it will show the "updated"
// property that the trigger added!
console.log(collection.find());
```

> Please keep in mind that you can only modify a document's data during a *before*
phase trigger. Modifications to the document during an *after* phase trigger will
simply be ignored and will not be applied to the document. This applies to insert
and update trigger types. Remove triggers cannot modify the document at any time.

### Enabling / Disabling Triggers
> Version >= 1.3.31

#### Enabling a Trigger
You can enable a previously disabled trigger or multiple triggers using the enableTrigger()
method on a collection.

> If you specify a type or type and phase and do not specify an ID the method will
affect all triggers that match the type / phase.

##### Enable a Trigger via Trigger ID

```js
db.collection("test").enableTrigger("myTriggerId");
```

##### Enable a Trigger via Type

```js
db.collection("test").enableTrigger(db.TYPE_INSERT);
```

##### Enable a Trigger via Type and Phase

```js
db.collection("test").enableTrigger(db.TYPE_INSERT, db.PHASE_BEFORE);
```

##### Enable a Trigger via ID, Type and Phase

```js
db.collection("test").enableTrigger("myTriggerId", db.TYPE_INSERT, db.PHASE_BEFORE);
```

#### Disabling a Trigger
You can temporarily disable a trigger or multiple triggers using the disableTrigger()
method on a collection.

> If you specify a type or type and phase and do not specify an ID the method will
affect all triggers that match the type / phase.

##### Disable a Trigger via Trigger ID

```js
db.collection("test").disableTrigger("myTriggerId");
```

##### Disable a Trigger via Type

```js
db.collection("test").disableTrigger(db.TYPE_INSERT);
```

##### Disable a Trigger via Type and Phase

```js
db.collection("test").disableTrigger(db.TYPE_INSERT, db.PHASE_BEFORE);
```

##### Disable a Trigger via ID, Type and Phase

```js
db.collection("test").disableTrigger("myTriggerId", db.TYPE_INSERT, db.PHASE_BEFORE);
```

### Trigger Recursion Protection
> Version >= 1.3.728

> Unlike some databases, ForerunnerDB allows you to execute CRUD operations from
inside trigger methods and are guaranteed safe (will not cause infinite recursion).

ForerunnerDB includes trigger recursion protection so that triggers cannot end up
calling themselves over and over again in an infinite loop.

An example of a recursive trigger is one in which an INSERT trigger is created, and
inside that trigger, some code inserts another record which would then fire the
trigger again, over and over.

ForerunnerDB does not let this happen because only one trigger with the same type,
phase and id is allowed to be executed on the trigger processing stack at any one
time.

The benefit of this protection is that you can be sure that calling CRUD operations
from inside a trigger method is safe. The downside is that CRUD operations from
inside a trigger method will not fire any triggers that have already fired previously
in the trigger stack.

A quick example is to imagine you have triggers A, B, C and D:

```
A -> B
B -> C
C -> D
D -> A <-- Trigger A will not fire.
```

The same is true here:

```
A -> B
B -> A <-- Trigger A will not fire.
```

And here:

```
A -> B
B -> C
C -> B <-- Trigger B will not fire.
```

No errors are thrown when a trigger is denied execution, however if you enable debug
mode on the database or collection the trigger is added to you will see a console
message informing you that the trigger attempted to fire but was denied because of
potential infinite recursion.

## Events
Collections emit events when they carry out CRUD operations. You can hook an event
using the on() method. Events that collections currently emit are:

### insert
Emitted after an insert operation has completed. The passed arguments to the listener
are:

* {Array} inserted An array of the successfully inserted documents.
* {Array} failed An array of the documents that failed to insert (for instance because
of an index violation or trigger cancelling the insert).

```js
var coll = db.collection("myCollection");

coll.on("insert", function (inserted, failed) {
	console.log("Inserted:", inserted);
	console.log("Failed:", failed);
});

coll.insert({moo: true});
```

### update
Emitted after an update operation has completed. The passed arguments to the listener
are:

* {Array} items An array of the documents that were updated by the update operation.

```js
var coll = db.collection("myCollection");
coll.insert({moo: true});

coll.on("update", function (updated) {
	console.log("Updated:", updated);
});

coll.update({moo: true}, {moo: false});
```

### remove
Emitted after a remove operation has completed. The passed arguments to the listener
are:

* {Array} items An array of the documents that were removed by the remove operation.

```js
var coll = db.collection("myCollection");
coll.insert({moo: true});

coll.on("remove", function (removed) {
	console.log("Removed:", removed);
});

coll.remove({moo: true});
```

### setData
Emitted after a setData operation has completed. The passed arguments to the listener
are:

* {Array} newData An array of the documents that were added to the collection by the
operation.
* {Array} oldData An array of the documents that were in the collection before the
operation.

```js
var coll = db.collection("myCollection");
coll.insert({moo: true});

coll.on("setData", function (newData, oldData) {
	console.log("New Data:", newData);
	console.log("Old Data:", oldData);
});

coll.setData({foo: -1});
```

### truncate
Emitted **BEFORE** a truncate operation has completed. The passed arguments to the
listener are:

* {Array} data An array of the documents that will be truncated from the collection.

```js
var coll = db.collection("myCollection");
coll.insert({moo: true});

coll.on("truncate", function (data) {
	console.log("New Data:", newData);
});

coll.truncate();
```

### change
Emitted after *all* CRUD operations have completed. See "immediateChange" if you need to 
know about every update operation as soon as it completes. For performance it is best to
use "change" rather than "immediateChange" if you can.

```js
var coll = db.collection("myCollection");


coll.on("change", function () {
	// This will ONLY FIRE ONCE when all three inserts below have completed
	console.log("Changed");
});

coll.insert({moo: true});
coll.insert({foo: true});
coll.insert({goo: true});
```

### immediateChange
Emitted after each CRUD operation has completed. This is different from the "change" event
in that immediateChange is emitted without any debouncing. The debounced change event will
only fire 100ms after all changes have finished. The immediateChange event will fire
on all changes straight away so you will be informed of every update call as soon as it
has happened. For performance, if you only need to run code after any change has occurred,
use "change" instead of "immediateChange".

```js
var coll = db.collection("myCollection");


coll.on("immediateChange", function () {
	// This will fire once FOR EACH of the inserts below
	console.log("Immediate Change");
});

coll.insert({moo: true});
coll.insert({foo: true});
coll.insert({goo: true});
```

### drop
Emitted after a collection is dropped.

```js
var coll = db.collection("myCollection");


coll.on("drop", function () {
	console.log("Dropped");
});

coll.drop();
```

## Conditions / Response (If This Then That - IFTTT)
Reacting to changes in data is one of the most powerful features of ForerunnerDB.
ForerunnerDB makes it easy to define what you wish to observe and what you wish to do
when an observed condition changes.

ForerunnerDB includes the ability to define an intuitive condition / response
mechanism that allows your application to respond to changing data elegantly
and with ease.

Creating IFTTT conditions is easy using expressive language methods (when,
and, then, else):

```js
var fdb = new ForerunnerDB(),
	db = fdb.db('test'),
	coll = db.collection('stocksIOwn'),
	condition;

condition = coll.when({
		_id: 'TSLA',
		val: {
			$gt: 210
		}
	})
	.and({
		_id: 'SCTY',
		val: {
			$gt: 23
		}
	})
	.then(function () {
		console.log('My stocks are worth more than I paid for them! Yay!');
	})
	.else(function () {
		console.log('I\'m loosing money :(');
	});
```

With the IFTTT condition / response set up, let's make some stock data!

```js
coll.insert([{
	_id: 'TSLA',
	val: 214
}, {
	_id: 'SCTY',
	val: 20
}]);
```

Nothing happened! That's because we have to tell the condition to start
listening for changes to its clauses:

```js
condition.start(undefined);
```

The result:

```
I'm loosing money :(
```

Notice that we passed ```undefined``` to the start() method? That's because
we want the condition to start off without a defined state. If we don't
pass undefined, the default state of a condition is false. This means that
when start() is called, if the clauses you have defined via when() and and()
evaluate to false, nothing has technically changed so your else() method will
not be called.

The starting state allows you control what happens the first time your clauses
are evaluated by the condition engine when you call start().

Now let's update Solar City's stock to a nicer value (higher than my purchase
price):

```js
coll.update({_id: 'SCTY'}, {val: 25});
```

The result:

```
My stocks are worth more than I paid for them! Yay!
```

Now let's stop the condition from evaluating any more changes:

```js
condition.stop();
```

And finally, let's drop the condition, removing it from memory:

```js
condition.drop();
```

## Indices & Performance
ForerunnerDB currently supports basic indexing for performance enhancements when
querying a collection. You can create an index on a collection using the
ensureIndex() method. ForerunnerDB will utilise the index that most closely matches
the query you are executing. In the case where a query matches multiple indexes
the most relevant index is automatically determined. Let's setup some data to index:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	names = ["Jim", "Bob", "Bill", "Max", "Jane", "Kim", "Sally", "Sam"],
	collection = db.collection("test"),
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
```

You can see that in our collection we have some random names and some random ages.
If we ask Forerunner to explain the query plan for querying the name and age fields:

```js
collection.explain({
	name: "Bill",
	age: 17
});
```

The result shows that the largest amount of time was taken in the "tableScan" step:

```
{
	"analysis": Object,
	"flag": Object,
	"index": Object,
	"log": Array[0],
	"operation": "find",
	"results": 128, // Will vary depending on your random entries inserted earlier
	"steps": Array[4] // Lists the steps Forerunner took to generate the results
		[0]: Object
			"name": "analyseQuery",
			"totalMs": 0
		[1]: Object
			"name": "checkIndexes",
			"totalMs": 0
		[2]: Object
			"name": "tableScan",
			"totalMs": 54
		[3]: Object
			"name": "decouple",
			"totalMs": 1,
	"time": Object
}
```

From the explain output we can see that a large amount of time was taken up doing a
table scan. This means that the database had to scan through every item in the
collection and determine if it matched the query you passed. Let's speed this up by
creating an index on the "name" field so that lookups against that field are very
fast. In the index below we are indexing against the "name" field in ascending order,
which is what the 1 denotes in name: 1. If we wish to index in descending order we
would use name: -1 instead.

```js
collection.ensureIndex({
	name: 1
});
```

The collection now contains an ascending index against the name field. Queries that
check against the name field will now be optimised:

```js
collection.explain({
	name: "Bill",
	age: 17
});
```

Now the explain output has some different results:

```
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
```

The query plan shows that the index was used because it has an "indexLookup" step,
however we still have a "tableScan" step that took 13 milliseconds to execute. Why
was this? If we delve into the query plan a little more by expanding the analysis
object we can see why:

```
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
```

In the selected index to use (indexMatch[0]) the keyData shows that the index only matched 1 out of the 2 query keys.

In the case of the index and query above, Forerunner's process will be:

* Query the index for all records that match the name "Bill" (very fast)
* Iterate over the records from the index and check each one for the age 17 (slow)

This means that while the index can be used, a table scan of the index is still required. We can make our index better by using a compound index:

```js
collection.ensureIndex({
	name: 1,
	age: 1
});
```

With the compound index, Forerunner can now pull the matching record right out of the hash table without doing a data scan which is very very fast:

```js
collection.explain({
	name: "Bill",
	age: 17
});
```

Which gives:

```
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
```

Now we are able to query 100,000 records instantly, requiring zero milliseconds to return the results.

Examining the output from an explain() call will provide you with the most insight into how the query
was executed and if a table scan was involved or not, helping you to plan your indices accordingly.

Keep in mind that indices require memory to maintain and there is always a trade-off between
speed and memory usage.

### Index Types (Choosing the Type of Index to Use)
> B-Tree and Geospatial indexes are currently considered beta level and although
they are passing unit tests, are provided for testing and development purposes.
We cannot guarantee their functionality or performance at this time as more
stringent tests and real-world usage must be done before they are considered
production-ready. Please DO test them and report any bugs or issues. It is only
with the help of the community that new features can get put through their paces!

> **CUSTOM INDEX** If you are interested in developing your own custom index
class for ForerunnerDB please see the wiki page on creating and registering your
index class / type: [Adding Custom Index to ForerunnerDB](https://github.com/Irrelon/ForerunnerDB/wiki/Adding-Custom-Index-to-ForerunnerDB)
 
ForerunnerDB currently defaults to a hash table index when you call ensureIndex().
There is also support for both b-tree and geospatial indexing and you can specify
the type of index you wish to use via the ensureIndex() call:

#### Example of Creating a B-Tree Index 
> Version >= 1.3.691

```js
collection.ensureIndex({
	name: 1
}, {
	type: 'btree'
});
```

#### Example of Creating a Geospatial 2d Index 
> Version >= 1.3.691

```js
collection.ensureIndex({
	lngLat: 1
}, {
	type: '2d'
});
```

#### Example of Creating a Hash Table Index 
```js
collection.ensureIndex({
	name: 1
}, {
	type: 'hashed'
});
```

## Geospatial (2d) Queries
> Version >= 1.3.691

> **PLEASE NOTE**: BETA STATUS - PASSES UNIT TESTING BUT MAY BE UNSTABLE

> Geospatial indices and queries are currently considered beta and although
unit tests for geospatial queries are passing we would recommend you use them
with caution. Please report any bugs or inconsistencies you might find when using
geospatial queries in ForerunnerDB on our GitHub issues page. 

We can insert some documents with longitude / latitude co-ordinates:

```js
var coll = db.collection('houses');

coll.insert([{
	lngLat: [51.50722, -0.12750],
	name: 'Central London'
}, {
	lngLat: [51.525745, -0.167550], // 2.18 miles
	name: 'Marylebone, London'
}, {
	lngLat: [51.576981, -0.335091], // 10.54 miles
	name: 'Harrow, London'
}, {
	lngLat: [51.769451, 0.086509], // 20.33 miles
	name: 'Harlow, Essex'
}]);
```

To query this data using a geospatial operator we need to set up a 2d index against
it:

```js
coll.ensureIndex({
	lngLat: 1
}, {
	type: '2d'
});
```

Now we can run a query with the geospatial operator "$near" to return results
ordered by the distance from the centre point we provide:

```js
// Query index by distance
// $near queries are sorted by distance from centre point by default
result = coll.find({
	lngLat: {
		$near: {
			$point: [51.50722, -0.12750],
			$maxDistance: 3,
			$distanceUnits: 'miles'
		}
	}
});
```

The result is:

```json
[{
	"lngLat": [51.50722, -0.1275],
	"name": "Central London",
	"_id": "1f56c0b5885de40"
}, {
	"lngLat": [51.525745, -0.16755],
	"name": "Marylebone, London",
	"_id": "372a34d9f17fbe0"
}]
```

These documents have lngLat co-ordinates that are within 3 miles from the $point
co-ordinate 51.50722, -0.12750 (Central London, UK). The results are ordered by
distance from the centre point ascending.

## Data Persistence (Save and Load Between Pages)

### Data Persistence In Browser
Data persistence allows your database to survive the browser being closed, page reloads and navigation
away from the current url. When you return to the page your data can be reloaded.

> Persistence calls are async so a callback should be passed to ensure the operation has completed before
relying on data either being saved or loaded.

Persistence is handled by a very simple interface in the Collection class. You can save the current state
of any collection by calling:

```js
collection.save(function (err) {
	if (!err) {
		// Save was successful
	}
});
```

You can then load the collection's data back again via:

```js
collection.load(function (err, tableStats, metaStats) {
	if (!err) {
		// Load was successful
	}
});
```

If you call collection.load() when your application starts and collection.save() when
you make changes to your collection you can ensure that your application always has
up-to-date data.

> An eager-saving mode is currently being worked on to automatically save changes to
collections, please see #41 for more information.

In the _load()_ method callback the tableStats and metaStats objects contain
information about what (if anything) was loaded for the collection and the
collection's meta-data. You can inspect these objects to determine if the collection
actually loaded any data or if the persistent storage for the collection was empty.

Here is an example stats object (tableStats and metaStats contain the same keys with
different data for the collection's data and the collection's meta-data):

```json
{
	"foundData": true,
	"rowCount": 1
}
```

Keep in mind that the _foundData_ key can be true at the same time as _rowCount_ is
zero. This is because _foundData_ is true if any previously persisted data exists,
even if there are no rows in the data file. Therefore if you wish to check if 
previous data exists and contains rows, you should do:

```js
...
if (tableStats.foundData && tableStats.rowCount > 0) { ... }
```

#### Manually Specifying Storage Engine
If you would like to manually specify the storage engine that ForerunnerDB will use you can call the
driver() method:

##### IndexedDB

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test");
db.persist.driver("IndexedDB");
```

##### WebSQL

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test");
db.persist.driver("WebSQL");
```

##### LocalStorage

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test");
db.persist.driver("LocalStorage");
```

### Data Persistence In Node.js

> Version >= 1.3.300

Persistence in Node.js is currently handled via the NodePersist.js class and is included
automatically when you require ForerunnerDB in your project.

To use persistence in Node.js you must first tell the persistence plugin where you
wish to load and save data files to. You can do this via the dataDir() call:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test");
	
db.persist.dataDir("./configData");
```

In the example above we set the data directory to be relative to the current working
directory as "./configData".

You can specify any directory path you wish but you must ensure you have permissions
to access and read/write to that directory. If the directory does not exist, ForerunnerDB
will attempt to create it for you as soon as you make the call to dataDir().

Once you have your dataDir() setup, you can save and load data as shown below.

> Persistence calls are async so a callback should be passed to ensure the operation has completed before
relying on data either being saved or loaded.

Persistence is handled by a very simple interface in the Collection class. You can
save the current state of any collection by calling:

```js
collection.save(function (err) {
	if (!err) {
		// Save was successful
	}
});
```

You can then load the collection's data back again via:

```js
collection.load(function (err) {
	if (!err) {
		// Load was successful
	}
});
```

If you call collection.load() when your application starts and collection.save() when
you make changes to your collection you can ensure that your application always has
up-to-date data.

> An eager-saving mode is currently being worked on to automatically save changes to
collections, please see #41 for more information.

### Both Browser and Node.js

#### Removing Persisted Data
When a database instance is dropped, the persistent storage that belongs to that instance
is automatically removed as well.

Please see [Dropping and Persistent Storage](#dropping-and-persistent-storage) for
more information.

#### Plugins
> Version >= 1.3.235

The persistent storage module supports adding plugins to the transcoder. The transcoder
is the part of the module that encodes data for saving to persistent storage when
.save() is called, and decodes data currently stored in persistent storage when .load()
is called.

The transcoder is made up of steps, each step can modify the data and pass it on to the
next step. By default there is only one step in the transcoder which either stringifies
JSON data (for saving) or parses it (for loading).
 
By adding a plugin as a transcoder step the plugin is able to make its own modifications
to the data before it is saved or loaded. Plugins must ensure that the final data they
provide in their callback is a string as we must allow support for LocalStorage and are
currently only able to store string data against keys in LocalStorage.

#### Data Compression and Encryption
> Version >= 1.3.235

ForerunnerDB includes compression and encryption plugins that integrate with the persistent
storage module. When compression or encryption (or both) are enabled, extra steps are executed
in the persistent storage transcoder that modify the final stored data.

> Please keep in mind that the order that you add transcoder steps is the order they are
executed in so adding compression after encryption will store data that has first been
encrypted, then compressed.

The compression and encryption plugins register themselves in the db's shared plugins
repository available via:

	db.shared.plugins.FdbCompress
	db.shared.plugins.FdbCrypto

The plugins are meant to be instantiated before use as shown in the examples below.

##### Compression
The compression plugin takes data from the previous transcoder step and performs a zip
operation on it. If the compressed data is smaller in size to the original data then the
compressed data is used. If the compressed data is not smaller, no changes are made to
the original data and it is stored uncompressed.

To enable the compression plugin in the persistent storage module you must add it as a
transcoder step:

```js
db.persist.addStep(new db.shared.plugins.FdbCompress());
```

##### Encryption
The encryption plugin takes data from the previous transcoder step and encrypts / decrypts
it based on the pass-phrase that the plugin is instantiated with. By default the plugin
uses AES-256 as the encryption cypher algorithm.

To enable the encryption plugin in the persistent storage module you must add it as a
transcoder step:

```js
db.persist.addStep(new db.shared.plugins.FdbCrypto({
	pass: "testing"
}));
```

The plugin accepts an options object as the first argument during instantiation and supports
 the following keys:

* pass: The pass-phrase that will be used to encrypt / decrypt data.
* algo: The algorithm to use. Currently defaults to "AES". Supports: "AES", "DES", "TripleDES",
"Rabbit", "RC4" and "RC4Drop".

If you need to change the encryption pass-phrase on the fly after the instantiation of the
plugin you can hold a reference to the plugin and use its pass() method:

```js
var crypto = new db.shared.plugins.FdbCrypto({
	pass: "testing"
});

db.persist.addStep(crypto);

// At a later time, change the pass-phrase
crypto.pass("myNewPassPhrase");
```

## Storing Arbitrary Key/Value Data
Sometimes it can be useful to store key/value data on a class instance such as the core db
class or a collection or view instance. This can later be retrieved somewhere else in your
code to provide a quick and easy data-store across your application that is outside of the
main storage system of ForerunnerDB, does not persist, is not indexed or maintained and will
be destroyed when the supporting instance is dropped.

To use the store, simply call the store() method on a collection or view:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test");
	
db.collection("myColl").store("myKey", "myVal");
```

You can then lookup the value at a later time:

```js
var value = db.collection("myColl").store("myKey");
console.log(value); // Will output "myVal"
```

You can also remove a key/value from the store via the unStore() method:

```js
db.collection("myColl").unStore("myKey");
```

## Collection Groups
ForerunnerDB supports aggregating collection data from multiple collections into a
single CRUD-enabled entity called a collection group. Collection groups are useful
when you have multiple collections that contain similar data and want to query the
data as a whole rather than one collection at a time.

This allows you to query and sort a super-set of data from multiple collections in
a single operation and return that data as a single array of documents.

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll1 = db.collection("test1"),
	coll2 = db.collection("test2"),
	group = db.collectionGroup("testGroup");
	
group.addCollection(coll1);
group.addCollection(coll2);

coll1.insert({
	name: "Jim"
});

coll2.insert({
	name: "Bob"
});

group.find();
```

Result:

```json
[{"name": "Jim"}, {"name": "Bob"}]
```

### Adding and Removing Collections From a Group
Collection groups work by adding collections as data sources. You can add a collection
to a group via the addCollection() method which accepts a collection instance as the
first argument.

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("test"),
	group = db.collectionGroup("test");

group.addCollection(coll);
```

You can remove a collection from a collection group via the removeCollection() method:

```js
group.removeCollection(coll);
```

## Dropping Database Instances
All database instances have a drop() method which removes the instance from memory.

You can individually drop databases, collections, views, overviews etc.

For instance, if you wish to drop an entire database:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db('test'),
	coll;

// Create a collection called testColl
coll = db.collection('testColl');

// Insert a record
coll.insert({
	_id: 1,
	name: 'Test'
});

// Ask for a list of collections
console.log('Before drop', JSON.stringify(db.collections()));

// Drop the entire database
db.drop();

// Now grab the database again (note that previous references will no longer work)
db = fdb.db('test');

// Ask for a list of collections
console.log('After drop', db.collections());
```

Output:

```json
Before drop [{"name":"testColl","count":1,"linked":false}]
After drop []
```

Dropping a database automatically drops all instances connected with that database.

### Dropping and Persistent Storage
When dropping a database or collection the persistent storage related to that
instance will be dropped as well. If you wish to keep the persistent storage
you must specify that when you call the drop() method. Passing false as the
first argument to drop() will tell ForerunnerDB not to drop the persistent
storage for the instance being dropped.

For example, to drop a collection without removing its persistent storage:

```js
db.collection('test').drop(false);
```

The same is true when dropping an entire database. If you pass false in the
first argument then no instances stored in the database will drop their
persistent storage:

```js
db.drop(false);
```

## Grid / Table Output
> Data Binding: Enabled

ForerunnerDB 1.3 includes a grid / table module that allows you to output data from a collection or view to
an HTML table that can be sorted and is data-bound so the table will react to changes in the underlying
data inside the collection / view.

#### Prerequisites
* The AutoBind module must be loaded

#### Grid Template

Grids work via a jsRender template that describes how your grid should be rendered to the browser. An
example template called "gridTable" looks like this:

```html
<script type="text/x-jsrender" id="gridTable">
	<table class="gridTable">
		<thead class="gridHead">
			<tr>
				<td data-grid-sort="firstName">First Name</td>
				<td data-grid-sort="lastName">Last Name</td>
				<td data-grid-sort="age">Age</td>
			</tr>
		</thead>
		<tbody class="gridBody">
			{^{for gridRow}}
			<tr data-link="id{:_id}">
				<td>{^{:firstName}}</td>
				<td>{^{:lastName}}</td>
				<td>{^{:age}}</td>
			</tr>
			{^{/for}}
		</tbody>
		<tfoot>
			<tr>
				<td></td>
				<td></td>
				<td></td>
			</tr>
		</tfoot>
	</table>
</script>
```

You'll note that the main body section of the table has a *for-loop* looping over the special gridRow
array. This array is the data inside your collection / view that the grid has been told to read from
and is automatically passed to your template by the grid module. Use this array to loop over and
output the row data for each row in your collection.
  
#### Creating a Grid
First you need to identify a target element that will contain the rendered grid:

```html
<div id="myGridContainer"></div>
```

You can create a grid on screen via the .grid() method, passing it your target jQuery selector as a
string:

```js
// Create our instances
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("testGrid"),
	grid;

// Insert some data into our collection
coll.insert({
	firstName: "Fred",
	lastName: "Jones",
	age: 15
});

// Create a grid from the collection using the template we defined earlier
coll.grid("#myGridContainer", "#gridTable");
```

#### Auto-Sorting Tools
The table can automatically handle sort requests when a column header is tapped/clicked on.
To enable this functionality simply add the *data-grid-sort="{column name}"* attribute
to elements you wish to use as sort elements. A good example is to use the table column
header for sorting and you can see the correct usage above in the HTML of the table
template.

## Views
> Data Binding: Enabled

A view is a queried subset of a collection that is automatically updated whenever the
underlying collection is altered. Views are accessed in the same way as a collection and
contain all the main CRUD functionality that a collection does. Inserting or updating on
a view will alter the underlying collection.

For a detailed insight into how data propagates from an underlying data source to a view
see the section on [View Data Propagation and Synchronisation](#notes_on_view_data_propagation_and_synchronisation).

#### Instantiating a View
Views are instantiated the same way collections are:

```js
var myView = db.view("myView");
```

#### Specify an Underlying Data Source
You must tell a view where to get it's data from using the *from()* method. Views can
 use collections and other views as data sources:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	myCollection = db.collection("myCollection");

myCollection.insert([{
	name: "Bob",
	age: 20
}, {
	name: "Jim",
	age: 25
}, {
	name: "Bill",
	age: 30
}]);

myView.from(myCollection);
```

#### Setting a View's Query
Since views represent live queried data / subsets of the underlying data source they
usually take a query:

```js
myView.query({
	age: {
		$gt: 24
	}
});
```

Using the collection data as defined in myCollection above, a call to the view's *find()*
 method will result in returning only records in myCollection whose age property is greater
 than 24:

```js
myView.find();
```
	
Result:

```json
[{
	"name": "Jim",
	"age": 25,
	"_id": "2aee6ba38542220"
}, {
	"name": "Bill",
	"age": 30,
	"_id": "2d3bb2f43da7aa0"
}]
```

A view query can also take an options object. If you wish to provide a query and
an options object together, call .query(<query>, <options) e.g:

```js
myView.query({
	age: {
		$gt: 24
	}
}, {
	$orderBy: {
		age: -1
	}
});
```

> Prior to version 1.3.567 you had to use queryData() instead of query() to pass
both a query and options object in the same call.

## Overviews
> Data Binding: Enabled

The Overview class provides the facility to run custom logic against the data from
multiple data sources (collections and views for example) and return a single object /
value. This is especially useful for scenarios where a summary of data is required such
as a shopping basket order summary that is updated in realtime as items are added to
the underlying cart collection, a count of some values etc.

Consider a page with a shopping cart system and a cart summary which shows the number
of items in the cart and the total cart value. Let's start by defining our cart
collection:

```js
var cart = db.collection("cart");
```

Now we add some data to the cart:

```js
cart.insert([{
	name: "Cat Food",
	price: 12.99,
	quantity: 2
}, {
	name: "Dog Food",
	price: 18.99,
	quantity: 3
}]);
```

Now we want to display a cart summary with number of items and the total cart price, so
we create an overview:

```js
var cartSummary = db.overview("cartSummary");
```

We need to tell the overview where to read data from:

```js
cartSummary.from(cart);
```

Now we give the overview some custom logic that will do our calculations against the data
 in the cart collection and return an object with our item count and price total:

```js
cartSummary.reduce(function () {
	var obj = {},
		items = this.find(), // .find() on an overview runs find() against underlying collection
		total = 0,
		i;

	for (i = 0; i < items.length; i++) {
		total += items[i].price * items[i].quantity;
	}

	obj.count = items.length;
	obj.total = total;

	return obj;
});
```

You can execute the overview's reduce() method and get the result via the exec() method:

```js
cartSummary.exec();
```

Result:

```json
{"count": 2, "total": 31.979999999999997}
```

## Data Binding
>Data binding is an optional module that is included via the fdb-autobind.min.js file.
If you wish to use data-binding please ensure you include that file in your page after
the main fdb-all.min.js file.

The database includes a useful data-binding system that allows your HTML to be
automatically updated when data in the collection changes.

> Binding a template to a collection will render the template once for each document in the
collection. If you need an array of the entire collection passed to a single template see
the section below on *wrapping data*.

Here is a simple example of a data-bind that will keep the list of items up-to-date
if you modify the collection:

### Prerequisites
* Data-binding requires jQuery to be loaded
* The AutoBind module must be loaded

### HTML
```html
<ul id="myList">
</ul>
<script id="myLinkFragment" type="text/x-jsrender">
	<li data-link="id{:_id}">{^{:name}}</li>
</script>
```

### JS
```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	collection = db.collection("test");

collection.link("#myList", "#myLinkFragment");
```

Now if you execute any insert, update or remove on the collection, the HTML will
automatically update to reflect the
changes in the data.

Note that the selector string that a bind uses can match multiple elements, allowing
you to bind against multiple sections of the page with the same data. For instance,
instead of binding against an ID (e.g. #myList) you could bind against a class:

### HTML
```html
<ul class="myList">
</ul>

<ul class="myList">
</ul>

<script id="myLinkFragment" type="text/x-jsrender">
	<li data-link="id{:_id}">{^{:name}}</li>
</script>
```
	
### JS
```js
collection.link("#myList", "#myLinkFragment");
```

The result of this is that both UL elements will get data binding updates when the
underlying data changes.

## Bespoke / Runtime Templates
You can provide a bespoke template to the link method in the second argument by passing
an object with a *template* property:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test");
	
db.collection("test").insert([{
	name: "Jim"
}, {
	name: "Bob"
}]);

db.collection("test").link("#myTargetElement", {
	template: "<div>{^{:name}}</div>"
});
```

This allows you to specify a template programmatically rather than defining your template
as a static piece of HTML on your page.

## Wrapping Data
Sometimes it is useful to provide data from a collection or view in an array form to the
template. You can wrap all the data inside a property via the $wrap option passed to the
link method like so:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test");
	
db.collection("test").insert([{
	name: "Jim"
}, {
	name: "Bob"
}]);

db.collection("test").link("#myTargetElement", {
	template: "<ul>{^{for items}}<li>{^{:name}}</li>{{/for}}</ul>"
}, {
	$wrap: "items"
});
```

Setting the $wrap option to 'items' passes the entire collection's data array into the
template inside the *items* property which can then be accessed and iterated through like
a normal array of data.

You can also wrap inside a ForerunnerDB Document instance which will allow you to control
other properties on the wrapper and have them update in realtime if you are using the
data-binding module.

To wrap inside a document instance, pass the document in the $wrapIn option:

```js
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	doc;
	
db.collection("test").insert([{
	name: "Jim"
}, {
	name: "Bob"
}]);

doc = db.document("myWrapperDoc");

doc.setData({
	loading: true
});

db.collection("test").link("#myTargetElement", {
	template: "{^{if !loading}}<ul>{^{for items}}<li>{^{:name}}</li>{{/for}}</ul>{{/if}}"
}, {
	$wrap: "items",
	$wrapIn: doc
});

doc.update({}, {loading: false});
```

## Highcharts: Charts & Visualisations
> Data Binding: Enabled

ForerunnerDB can utilise the popular Highcharts JavaScript library to generate charts from collection data
and automatically keep the charts in sync with changes to the collection.

### Prerequisites
The Highcharts JavaScript library is required to use the ForerunnerDB Highcharts module. You can
get Highcharts from (http://www.highcharts.com)

### Usage
To use the chart module you call one of the chart methods on a collection object. Charts are an optional
module so make sure that your version of ForerunnerDB has the Highcharts module included.

#### collection.pieChart()

Function definition:

```js
collection.pieChart(selector, keyField, valField, seriesName);
```
	
Example:

```js
// Create the collection
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("chartData");

// Set the collection data
coll.insert([{
	name: "Jam",
	val: 100
}, {
	name: "Pie",
	val: 33
}, {
	name: "Cake",
	val: 24
}]);

// Create a pie chart on the element with the id "demo-chart"
coll.pieChart("#demo-chart", "name", "val", "Food", {
	chartOptions: {
		title: {
			text: "Food Eaten at Event"
		}
	}
});
```

> Note that the options object passed as the 5th parameter in the call above has a
chartOptions key. This key is passed to Highcharts directly so any options that are
described in the Highcharts documentation should be added inside the chartOptions
object. You'll notice that we set the chart title in the call above using this object.

#### collection.lineChart()

Function definition:

```js
collection.lineChart(selector, seriesField, keyField, valField);
```

Example:

```js
// Create the collection
var fdb = new ForerunnerDB(),
	db = fdb.db("test"),
	coll = db.collection("chartData");

// Set the collection data
coll.insert([{
	series: "Jam",
	date: String(new Date("2014-09-13")).substr(0, 15),
	val: 100
}, {
	series: "Jam",
	date: String(new Date("2014-09-14")).substr(0, 15),
	val: 33
}, {
	series: "Jam",
	date: String(new Date("2014-09-15")).substr(0, 15),
	val: 24
}]);

// Create a pie chart on the element with the id "demo-chart"
coll.lineChart("#demo-chart", "series", "date", "val", {
	chartOptions: {
		title: {
			text: "Jam Stores Over Time"
		}
	}
});
```

> Note that the options object passed as the 5th parameter in the call above has a
chartOptions key. This key is passed to Highcharts directly so any options that are
described in the Highcharts documentation should be added inside the chartOptions
object. You'll notice that we set the chart title in the call above using this object.

#### Other Chart Types

The lineChart() function uses the same parameters as the rest of the chart types
currently supported by ForerunnerDB:

* collection.barChart()
* collection.columnChart()
* collection.areaChart()

### Removing a Chart

You can drop a chart using the dropChart() method on the collection the chart is
assigned to:

Function definition:

```js
collection.dropChart(selector);
```
	
Example:

```js
coll.dropChart("#demo-chart");
```
	
> Dropping a chart will remove it from the DOM and stop all further collection updates
from propagating to Highcharts.

# Special Considerations
## Queries
Queries are made up of properties in an object. ForerunnerDB handles some properties
differently from others. Specifically properties that start with a dollar symbol ($)
or two slashes (//) will be treated as special cases.

### The Dollar Symbol
Properties that start with a dollar symbol are treated as *operators*. These are not
handled in the same way as normal properties. Examples of operator properties are:

	$or
	$and
	$in

These operator properties allow you to indicate special operations to perform during
your query.

### The Double-Slash
> Version >= 1.3.14

Properties that start with a double-slash are treated as comments and ignored during
the query process. An example would be where you wish to store some data in the query
object but you do not want it to affect the outcome of the query.

```js
// Find documents that have a property "num" that equals 1:
db.collection("test").find({
	"num": 1
});

// Find documents that have a property "num" that equals 1
// -- this is exactly the same query as above because the //myData
// property is ignored completely
db.collection("test").find({
	"num": 1,
	"//myData": {
		"someProp": 134223
	}
});
```

# Differences Between ForerunnerDB and MongoDB
Developers familiar with the MongoDB query language will find ForerunnerDB quite
similar however there are some differences that you should be aware of when writing
queries for ForerunnerDB.

> An update is being worked on that will allow a MongoDB emulation mode flag to be set
to force ForerunnerDB to behave exactly like MongoDB when running find and update
operations. For backward compatibility we cannot enable this by default or simply
change default operation of CRUD calls.

> 7th Aug 2015: This update is now going through testing.

## find
ForerunnerDB uses objects instead of dot notation to match fields. See issue [#43](https://github.com/irrelon/ForerunnerDB/issues/43) for more
information. The reason we do this is for performance.

## update
ForerunnerDB runs an update rather than a replace against documents that match the query
clause. You can think about ForerunnerDB's update operations as having been automatically
wrapped in the MongoDB $set operator.

If you wish to fully replace a document with another one you can do so using the
$replace operator described in the *Update Operators* section. $replace is the equivalent
of calling a MongoDB update without the MongoDB $set operator.

# License
Please see licensing page for latest information: [http://www.forerunnerdb.com/licensing.html](http://www.forerunnerdb.com/licensing.html)

# Browser Compatibility
ForerunnerDB works in all modern browsers (IE8+) and mobile hybrid frameworks

* Android Browser 4
* AngularJS
* Apache Cordova / PhoneGap 1.2.0
* Blackberry 7
* Chrome 23
* Chrome for Android 32
* Firefox 18
* Firefox for Android 25
* Firefox OS 1.0
* IE 8
* IE Mobile 8.1
* IE Mobile 10
* Ionic
* Opera 15
* Opera Mobile 11
* Safari 4 (includes Mobile Safari)

# Distribution Files
The DB comes with a few different files in the ./js/dist folder that are pre-built
to help you use ForerunnerDB easily.

* fdb-all - Contains the whole of ForerunnerDB
    * Collection - CRUD on collections (tables)
    * CollectionGroup - Create groups of collections that can be CRUD on as one entity
    * View - Virtual queried view of a collection (or other view)
    * HighChart - Highcharts module to create dynamic charts from view data
    * Persist - Persistent storage module for loading and saving in browser
    * Document - Single document with CRUD
    * Overview - Live aggregation of collection or view data
    * Grid - Generate and maintain an HTML grid with sort and filter columns from data
    
* fdb-core - Contains only the core functionality
	* Collection - CRUD on collections (tables)

* fdb-core+persist - Core functionality + persistent storage
	* Collection - CRUD on collections (tables)
	* Persist - Persistent storage module for loading and saving in browser
	
* fdb-core+views - Core functionality + data views
	* Collection - CRUD on collections (tables)
	* View - Virtual queried view of a collection (or other view)

* fdb-legacy - An old version of ForerunnerDB that some clients still require.
Should not be used! This build will be removed in ForerunnerDB 2.0.

The other files in ./js/dist are builds for various plugins that are part of the
ForerunnerDB project but are entirely optional separate files that can be included
in your project and added after the main ForerunnerDB dist file has been loaded.

* fdb-angular - Adds data-binding to an angular scope back to ForerunnerDB
* fdb-autobind - Adds data-binding for vanilla js projects to ForerunnerDB
* fdb-infinilist - Adds the ability to create infinitely scrolling lists of huge
amounts of data while only rendering the visible entities in the DOM for responsive
UI even on a mobile device

# Chrome Extension: ForerunnerDB Explorer
A chrome browser extension exists in the source repo as well as in the Chrome Web Store
[available here](https://chrome.google.com/webstore/detail/forerunnerdb-explorer/gkgnafoehgghdeimbkaeeodnhbegfldm).

You can inspect and explore your ForerunnerDB instance directly from Chrome's Dev Tools.

1. [Install the extension](https://chrome.google.com/webstore/detail/forerunnerdb-explorer/gkgnafoehgghdeimbkaeeodnhbegfldm)
2. Open Chrome's developer tools
3. Navigate to a url using ForerunnerDB (either local or remote)
4. Click the ForerunnerDB tab in dev tools to inspect instances
5. Click the Refresh button (the one in the ForerunnerDB explorer tab) to see any changes reflected

# Development

## Unit Tests
Unit tests are available in the ./unitTests folder, load index.html to run the tests.

## Building / Compiling
> This step is not required unless you are modifying ForerunnerDB code and wish to
build your own version.

ForerunnerDB uses Browserify to compile to single-file distribution builds whilst
maintaining source in distinct module files. To build, ensure you have the dev
dependencies installed by navigating to the ForerunnerDB source folder and running:

```bash
npm install --dev
npm install -g grunt-cli
```

Now you can then execute grunt to build ForerunnerDB and run all the unit tests:

```bash
grunt "3: Build and Test"
```

### Development Process

1. Fork ForerunnerDB with GitHub and clone your repository to your local machine
1. On your local machine, switch to the dev branch:

```bash
git checkout dev
```

2. Branch off to your own git branch (replace <MyBranchName> with your own branch name):

```bash
git branch <MyBranchName>
```

3. Write unit tests to cover your intended update (check the ./js/unitTests folder)
4. Make changes to the source as you wish to satisfy the new unit tests
5. Commit your changes via git
5. Run the grunt command:

```bash
grunt "3: Build and Test"
```

6. If all passes successfully you can now push via:

```bash
git push
```

7. On GitHub on your ForerunnerDB forked repo, switch to your new branch and do a "Pull Request"
8. Your pull request will be evaluated and may elicit questions or further discussion
9. If your pull request is accepted it will be merged into the main repository
10. Pat yourself on the back for being a true open-source warrior! :)

### Notes on the Chain Reactor System
ForerunnerDB's chain reactor system is a graph of interconnected nodes that send
and receive data. Each node is essentially an input, process and output. A node
is defined as any instance that has utilised the Mixin.ChainReactor mixin methods.

The chain reactor system exists to allow data synchronisation between disparate
class instances that need to share data for example a view that uses a collection
as a data-source. When data is modified via CRUD on the collection, chain reactor
packets are sent down the reactor graph and one of the receiver nodes is the view.

The view receives chain reactor packets from the collection and then runs its own
custom logic during the node's process phase which can completely control packets
sent further down the graph from the view to other nodes. Packets can be created,
modified or destroyed during a node's process phase.

In order for a node to apply custom logic to the chain reactor process phase, it
only needs to implement a *chainHandler* method which takes a single argument
representing the packet being sent to the node.

The chain handler method can control the further propagation of the current packet
by returning true or false from itself. If the chain handler returns true the
packet propagation will stop and not proceed further down the graph.

The chain handler method can also utilise the chainSend() method to create new
chain reactor packets that emit from the current node down the graph. Packets
never travel up the graph, only down.

Data sent to the chain reactor system is expected to be safe to modify or operate
on by the receiver. If data sent is an array or object and you have references to
that data somewhere else it is expected that the sender will decouple the data
first before passing it down the graph by using the decouple() method available
in the Mixin.Common mixin. Since decoupling large arrays of data can incur a CPU
cost you can check if it is required before decoupling by running chainWillSend()
to see if you have any listeners that will need the data.

### Notes on View Data Propagation and Synchronisation
Views are essentially collections whose data has been pre-processed usually by a limiting
query (called an active query) and sometimes by a data transform method. Data from the
View's *data source* (collection, view etc) that is assigned via the from() method is
passed through ForerunnerDB's chain reactor system before it reaches the View itself.

ForerunnerDB's chain reactor system allows class instances to be linked together to receive
CRUD and other events from other instances, apply processing to them and then pass them on
down the chain reactor graph.

You can think of the chain reactor as a series of connected nodes that each as an **input**,
**process** and **output**. The **input** and **outputs** of a node are usually collection and view instances
although they can be any instance that implements the chain reactor mixin methods available
in the Mixin.ChainReactor.js file. The **process** is a custom method that determines how the
chain reactor "packet" data is handled. In the case of a View instance, a chain reactor node
is set up between the *data source* and the view itself.

When a change occurs on the view's source data, the chain reactor node receives the data
packet from the source which describes the type of operation that has occurred and contains
information about what documents were operated on and what queries were run on those documents.

The view's reactor node process checks over this data and determines how to handle it.

The process follows these high-level steps:

1. Check if the view has an *active join* in the view's query options. *Active joins* are
designated as any $join operator in the view's *active query*. They are operated against
the data being sent from the view's *data source*. We do this first because joined data can
be utilised by any *active query* or *active transform* which means the data must be present
before resolving queries and transforms in the next steps.

2. Check if there is an *active query*. Queries are run against the source data after any
*active joins* have been executed against the data. This allows an *active query* to operate
on data that would only exist after an *active join* has been executed. If the data coming
from the *data source* does not match the *active query* parameters then it is added to a
*removal array* to be processed in a following step. If the data *does* match the *active query*
parameters then it is added to an *upsert array*.

3. Check if there is an *active transform*. An *active transform* is a transform operation
registered against the view where the operation includes a *dataIn method*. If a transform
exists we execute it against the data after it has been run through the *active join* and
*active query* steps.

4. Process the *removal array*. We loop the *removal array* and ask the view to remove any
items that match the items in this array.

5. Process the *upsert array*. We loop the *upsert array*, determine if each item is either
an insert operation (the item does not currently exist in the view data) or an update operation
(the item DOES currently exist in the view and the data is different from the current entry).

6. Finish the process by inserting and updating data depending on the result of step 5.

## Contributing to This Project
Contributions through pull requests are welcome. Please ensure that if your pull request includes
code changes that you have run the unit tests and they have all passed. If your code changes
include new features not currently under test coverage from existing unit tests please create
new unit tests to cover your changes and ensure they work as expected.

Code style is also important. Tabs are in use instead of spaces for indentation. Braces should
start at the end of lines rather than the next line down. Doc comments are in JSDoc format and
must be fully written for methods in any code you write.

So to summarise:

* Always check unit tests are running and passing
* Create new tests when you add or modify functionality that is not currently under test coverage
* Make sure you document your code with JSDoc comments
* Smile because you are making the world a better place :)

# iOS Version
> The iOS version has now been moved to its own repository

You may notice in the repo that there is an iOS folder containing a version of Forerunner
for iOS. This project is still at an alpha level and should be considered non-production
code, however you are welcome to play around with it and get a feel for what will be
available soon.

The iOS version is part of the roadmap and will include data-binding for list structures
like UITableView, as well as individual controls like UILabel. Data-persistence is already
working as well as inserting and basic data queries, update and remove.

# Future Updates
ForerunnerDB's project road-map:

### Future Updates
* Data persistence on server-side - COMPLETED
* Pull from server - allow client-side DB to auto-request server-side data especially useful when paging
* Push to clients - allow server-side to push changes to client-side data automatically and instantly - COMPLETED
* Push to server - allow client-side DB changes to be pushed to the server automatically (obvious security / authentication requirements)
* Replication - allow server-side DB to replicate to other server-side DB instances on the same or different physical servers
* Native iOS version
* Native Android version
* ES6 Code with Babel transpilation

#### Query operators still to implement
* $setOnInsert
* $min
* $max
* $currentDate
* $slice
* $sort
* $bit
* $isolated
* $ array positional in sub arrays of objects inside arrays e.g. arr.$.idArr

#### Scheduled Features
* COMPLETE - Data-bound grid (table) output of collection / view data
* COMPLETE - $elemMatch (projection)
* COMPLETE - Return limited fields on query
* COMPLETE - Fix package.json to allow dev dependencies and production ones, also fix versions etc (https://github.com/irrelon/ForerunnerDB/issues/6)
* COMPLETE - Data persistence added to documentation
* COMPLETE - Remove iOS from this repo, add to its own
* COMPLETE - Remove server from this repo, add to its own
* COMPLETE - Trigger support
* COMPLETE - Support localforage for storage instead of relying on localStorage (https://github.com/irrelon/ForerunnerDB/issues/5)
* COMPLETE - Collection / query paging-- e.g. select next 10, select previous 10
* Highcharts support from views instead of only collections
* Fix bug in relation to index usage with range queries as per (https://github.com/irrelon/ForerunnerDB/issues/20)
* COMPLETE - Support client sync with server-sent events
* Add further build files to handle different combinations of modules (https://github.com/irrelon/ForerunnerDB/issues/7)
* PARTIALLY COMPLETE - Support Angular.js by registering as a module if ajs exists (https://github.com/irrelon/ForerunnerDB/issues/4)

#### Next Version
* Re-write with ES6 using Babel
* Add caching system so requests to a collection with the same query multiple times should generate once and serve the cached results next time round. Cache invalidation can be done on any CRUD op to make subsequent query re-build cache.
* Server-side operation in line with other production databases (e.g. command line argument support, persist to disk with binary indexed searchable data etc)

# Breaking Changes
Please check below for details of any changes that break previous operation or
behaviour of ForerunnerDB. Changes that break functionality are not taken lightly
and we do not allow them to be merged in to the master branch without good cause!

## Since Version 2.0.0
Upserting documents now returns (and calls back) an array even for a single
upserted document. This breaks compatibility with code that expects to receive an
object when upserting a single document. It is easy to fix code that uses it. This
is the only breaking change in version 2.0.0.

## Since Version 1.3.669
To provide a massive performance boost (5 times the performance) the data
serialisation system has undergone a rewrite that requires some changes to your
code if you query data with JavaScript Date() objects or use RegExp objects.
 
Before this version you could do:

```js
db.insert({
	dt: new Date(),
	reg: /*./i
});
```

After this version if you want Date objects to remain as objects and not be
converted into strings you must use:

```js
db.insert({
	dt: db.make(new Date())
	reg: db.make(/*./i)
});
```

Wrapping the Date and RegExp instances in make() provides ForerunnerDB with a way
to optimise JSON serialisation and achieve five times the stringification speed
of previous versions. Parsing this data is also 1/3 faster than the previous version.

You can read more about the benchmarking and performance optimisations made during
this change [on the wiki here](https://github.com/Irrelon/ForerunnerDB/wiki/Serialiser-&-Performance-Benchmarks).

## Since Version 1.3.36
In order to support multiple named databases Forerunner's instantiation has changed
slightly. In previous versions you only had access to a single database that you
instantiated via:

```js
var db = new ForerunnerDB();
```

Now you have access to multiple databases via the main forerunner instance but this
requires that you change your instantiation code to:

```js
var fdb = new ForerunnerDB();
var db = fdb.db("myDatabaseName");
```

Multiple database support is a key requirement that unfortunately requires we change
the instantiation pattern as detailed above. Although this is a fundamental change to
the way ForerunnerDB is instantiated we believe the impact to your projects will be
minimal as it should only require you to update at most 2 lines of your project's code
in order to "get it working" again.

To discuss this change please see the related issue: [https://github.com/Irrelon/ForerunnerDB/issues/44](https://github.com/Irrelon/ForerunnerDB/issues/44)

## Since Version 1.3.10
The join system has been updated to use "$join" as the key defining a join instead of
"join". This was done to keep joins in line with the rest of the API that now uses
the $ symbol when denoting an operation rather than a property. See the Joins section
of the documentation for examples of correct usage.

Migrating old code should be as simple as searching for instances of "join" and
replacing with "$join" within ForerunnerDB queries in your application. Be careful not
to search / replace your entire codebase for "join" to "$join" as this may break other
code in your project. Ensure that changes are limited to ForerunnerDB query sections.

# ForerunnerDB Built-In JSON REST API Server
> **PLEASE NOTE**: BETA STATUS SUBJECT TO CHANGE

When running ForerunnerDB under Node.js you can activate a powerful REST API server
that allows you to build a backend for your application in record speed, providing
persistence, access control, replication etc without having to write complex code.

To use the built-in REST API server simply install ForerunnerDB via NPM:

```bash
npm install forerunnerdb
```

Then create a JavaScript file with the contents:

```js
"use strict";

var ForerunnerDB = require('forerunnerdb'),
	fdb = new ForerunnerDB(),
	db = fdb.db('testApi');

// Enable database debug logging to the console (disable this in production)
db.debug(true);

// Set the persist plugin's data folder (where to store data files)
db.persist.dataDir('./data');

// Tell the database to load and save data for collections automatically
// this will auto-persist any data inserted in the database to disk
// and automatically load it when the server is restarted
db.persist.auto(true);

// Set access control to allow all HTTP verbs on all collections
// Note that you can also pass a callback method instead of 'allow' to
// handle custom access control with logic
fdb.api.access('testApi', 'collection', '*', '*', 'allow');

// Ask the API server to start listening on all IP addresses assigned to
// this machine on port 9010 and to allow cross-origin resource sharing (cors)
fdb.api.start('0.0.0.0', '9010', {cors: true}, function () {
	console.log('Server started!');
});
```

Execute the file under node.js via:

```bash
node <yourFileName>.js
```

You can now access your REST API via: http://0.0.0.0:9010

### Using the REST API
The REST API follows standard REST conventions for using HTTP verbs to describe
an action.

##### Accessing all collection's documents:

	GET http://0.0.0.0:9010/fdb/<database name>/collection/<collection name>

Example in jQuery:

```js
$.ajax({
	"method": "get",
	"url": "http://0.0.0.0:9010/fdb/myDatabase/collection/myCollection",
	"dataType": "json",
	"success": function (data) {
		console.log(data);
	}
});
```

##### Accessing an individual document in a collection by id:

	GET http://0.0.0.0:9010/fdb/<database name>/collection/<collection name>/<document id>

Example in jQuery:

```js
$.ajax({
	"method": "get",
	"url": "http://0.0.0.0:9010/fdb/myDatabase/collection/myCollection/myDocId",
	"dataType": "json",
	"success": function (data) {
		console.log(data);
	}
});
```

##### Creating a new document:
> If you post an array of documents instead of a single document ForerunnerDB will
insert multiple documents by iterating through the array you send. This allows you
to insert multiple records with a single API call.

	POST http://0.0.0.0:9010/fdb/<database name>/collection/<collection name>
	BODY <document contents>

Example in jQuery:

```js
$.ajax({
	"method": "post",
	"url": "http://0.0.0.0:9010/fdb/myDatabase/collection/myCollection",
	"dataType": "json",
	"data": JSON.stringify({
		"name": "test"
	}),
	"contentType": "application/json; charset=utf-8",
	"success": function (data) {
		console.log(data);
	}
});
```

##### Replacing a document by id:

	PUT http://0.0.0.0:9010/fdb/<database name>/collection/<collection name>/<document id>
	BODY <document contents>

Example in jQuery:

```js
$.ajax({
	"method": "put",
	"url": "http://0.0.0.0:9010/fdb/myDatabase/collection/myCollection/myDocId",
	"dataType": "json",
	"data": JSON.stringify({
		"name": "test"
	}),
	"contentType": "application/json; charset=utf-8",
	"success": function (data) {
		console.log(data);
	}
});
```

##### Updating a document by id:

	PATCH http://0.0.0.0:9010/fdb/<database name>/collection/<collection name>/<document id>
	BODY <document contents>

Example in jQuery:

```js
$.ajax({
	"method": "patch",
	"url": "http://0.0.0.0:9010/fdb/myDatabase/collection/myCollection/myDocId",
	"dataType": "json",
	"data": JSON.stringify({
		"name": "test"
	}),
	"contentType": "application/json; charset=utf-8",
	"success": function (data) {
		console.log(data);
	}
});
```

##### Deleting a document by id:

	DELETE http://0.0.0.0:9010/fdb/<database name>/collection/<collection name>/<document id>

Example in jQuery:

```js
$.ajax({
	"method": "delete",
	"url": "http://0.0.0.0:9010/fdb/myDatabase/myCollection/myDocId",
	"dataType": "json",
	"contentType": "application/json; charset=utf-8",
	"success": function (data) {
		console.log(data);
	}
});
```

### Creating Your Own Routes
ForerunnerDB's API utilises ExpressJS and exposes the express app should you wish
to register your own routes under the same host and port.

You can retrieve the express app via:

```js
var app = fdb.api.serverApp();
```

The response from serverApp() is the express instance like doing: app = express();

You can then register routes in the normal express way:

```js
app.get('/myRoute', function (req, res) { ... }
```

#### Serving Static Content
> You don't have to use this helper, you can define static routes via the express
app in the normal way if you prefer, this just makes it a tiny bit easier.

If you would like to serve static files we have exposed a helper method for you:

```js
/**
 * @param {String} urlPath The route to serve static files from.
 * @param {String} folderPath The actual filesystem path where the static
 * files should be read from.
 */
fdb.api.static('/mystaticroute', './www');
```

#### Customising Further

You can get hold of the express library directly (to use things like express.static)
via the express method:

```js
var express = fdb.api.express();
```

#### Routes That ForerunnerDB Uses

ForerunnerDB's routes all start with **/fdb** by default so you can register any
 other routes that don't start with /fdb and they will not interfere with
 Forerunner's routes.

#### Default Middleware

ForerunnerDB enables various middleware packages by default. These are:

1. bodyParser.json()
2. A system to turn JSON sent as the query string into an accessible object. This
should not interfere with normal query parameters.

If you start the server with {cors: true} we will also enable the cors middleware
via:

```js
// Enable cors middleware
app.use(cors({origin: true}));

// Allow preflight CORS
app.options('*', cors({origin: true}));
```

# AngularJS and Ionic Support
ForerunnerDB includes an AngularJS module that allows you to require ForerunnerDB as
a dependency in your AngularJS (or Ionic) application. In order to use ForerunnerDB
in AngularJS or Ionic you must include forerunner's library and the AngularJS module
after the angular (or Ionic) library script tag:

```html
...
<!-- Include ionic (or AngularJS) library -->
<script src="lib/ionic/js/ionic.bundle.js"></script>
...
<!-- Include ForerunnerDB -->
<script src="lib/forerunnerdb/js/dist/fdb-all.min.js"></script>
<script src="lib/forerunnerdb/js/dist/fdb-angular.min.js"></script>
```

Once you have included the library files you can require ForerunnerDB as a dependency
in the normal angular way:

```js
// Define our app and require forerunnerdb
angular.module('app', ['ionic', 'forerunnerdb', 'app.controllers', 'app.routes', 'app.services', 'app.directives'])
	// Run the app and tell angular we need the $fdb service
	.run(function ($ionicPlatform, $rootScope, $fdb) {
		// Define a ForerunnerDB database on the root scope (optional)
		$rootScope.$db = $fdb.db('myDatabase');
		
		...
```

You can then access your database from either $rootScope.$db or $fdb.db('myDatabase').

Since $fdb.db() will either create a database if one does not exist by that name, 
or return the existing instance of the database, you can use it whenever you like
to get a reference to your database from any controller just by requiring *$fdb*
as a dependency e.g:

```js
angular.module('app.controllers')
	.controller('itemListCtrl', function ($scope, $fdb) {
		var allItemsInMyCollection = $fdb
			.db('myDatabase')
			.collection('myCollection')
			.find();
```

## Binding Data from ForerunnerDB to AngularJS
Binding ForerunnerDB data from a collection or view to a scope is very easy,
just call the .ng() method, passing the current scope and the name of the
property you want the array of data to be placed in:

```js
$fdb
	.db('myDatabase')
	.collection('myCollection')
	.ng($scope, 'myData');
```

The data stored in "myCollection" is now available on your view under the
"myData" variable. You can do an ng-repeat on it or other standard angular
operations in the normal way.

```html
<div ng-repeat="obj in myData">
	<span id="{{obj._id}}">{{obj.title}}</span>
</div>
```

> When using ng-repeat on form elements, please use a tracking clause in the
ng-repeat 

When changes are made to the "myCollection" collection data, they will be
automatically reflected in the angular view.

ForerunnerDB will automatically un-bind when angular's $destroy event is
fired on the scope that you pass to .ng().

If you bind a ForerunnerDB-based data variable to an ng-model attribute you
will have two-way data binding as ForerunnerDB will be automatically updated
when changes are made on the AngularJS view and the view will be updated
when you make changes to ForerunnerDB. To control data binding see
[Switching Off Two-Way Data Binding](#switching-off-two-way-data-binding)

> TWO-WAY BINDING CAVEAT - PLEASE NOTE: Two way data binding will not work
from a ForerunnerDB view. If you need data in ForerunnerDB to update when
changes are made using ng-model you must not use a db.view()

## Binding From a Collection to a Single Scope Object
If you wish to only bind a single document inside a collection or view to
a single object in AngularJS you can do so by passing the $single option:

```js
$fdb
	.db('myDatabase')
	.collection('myCollection')
	.ng($scope, 'myData', {
		$single: true
	});
```

On the AngularJS view the myData variable is now an object instead of an array:

```html
<div ng-if="myData && myData.myFlag === true">Hello!</div>
```

If you do this from a collection it is equivalent to running a findOne() on the
collection so you will get the first document in the collection.

If you do this on a view you can limit the view to a single document via a query
first do selectively decide which document to bind the scope variable to.

## Updating Data in ForerunnerDB from an AngularJS View
ForerunnerDB hooks changes from AngularJS and automatically updates the bound
collection on updates to data that is on an AngularJS view using the ng-model
attribute. This does not work from ForerunnerDB views using db.view().

## Switching Off Two-Way Data Binding

If you do not want two-way data binding you can switch off either direction
by passing options to the ng() method:

```js
$fdb
	.db('myDatabase')
	.collection('myCollection')
	.ng($scope, 'myData', {
		$noWatch: true, // Changes to the AngularJS view will not propagate to ForerunnerDB
		$noBind: true // Changes to ForerunnerDB's collection will not propagate to AngularJS
	});
```

## Automatic Clean Up / Memory Management
ForerunnerDB automatically hooks the $destroy event of a scope so that when
the scope is removed from memory, ForerunnerDB will also remove all binding
to it. This means that angular / ionic integration is automatic and does not
require manual cleanup.

## Performance and Large Collections
As per the AngularJS documentation, you can significantly increased performance
of large collections when you provide AngularJS with a unique ID with which to
track items in an ng-repeat. Since documents in a ForerunnerDB collection will
always have a unique primary key id you can tell AngularJS to use this.

Assuming your collection's primary key is "_id" you can tell AngularJS to track
against this id in an ng-repeat attribute like this:

```html
<div ng-repeat="model in collection track by model._id">
  {{model.name}}
</div>
```

You can read more about this in [AngularJS's documentation on ng-repeat](https://docs.angularjs.org/api/ng/directive/ngRepeat).

# Ionic Example App
We've put together a very basic demo app that showcases ForerunnerDB's client-side
usage in an Ionic app (AngularJS + Apache Cordova).

## Running the Example App
> You must have node.js installed to run the example because it uses ForerunnerDB's
built-in REST API server for a quick and easy way to simulate a back-end.

> The example app requires that you have already installed ionic on your system
via *npm install -g ionic*

1. Start the app's server

```bash
cd ./ionicExampleServer
node server.js
```

2. Start ionic app

```bash
cd ./ionicExampleClient
ionic run browser
```

The app will auto-navigate to the settings screen if no settings are found in the
browser's persistent storage. Enter these details:

```
Server: http://0.0.0.0
Port: 9010
```

Click the Test Connection button to check that the connection is working.

Now you can click the menu icon top left and select "Items". Clicking the "Add"
button top right will allow you to add more items. If you open more browser windows
you can see them all synchronise as changes are made to the data on the server!
