# ForerunnerDB Core
This project contains the core query/match/update functionality
that is a standalone engine and can be used for any purpose.

>forerunnerdb-core provides the core of ForerunnerDB 3.0 which
>is a complete rewrite of ForerunnerDB in ES6 instead of ES5 and
>has simplicity, modularity and extensibility as the primary
>pillars of development.

Those familiar with ForerunnerDB will be used to a query language
similar to MongoDB. ForerunnerDB 3.0 understands MongoDB query
lanugage as a first class language instead of an add-on. This means
that queries in ForerunnerDB 3.x use MongoDB query language by
default.

Version 3.x will still support 2.x query language but going forward
you should adopt MongoDB query language where possible as we will
optimise for this first.

Right now, this project is still in development but is usable.
Because of this, there is no documentation. You can check out
the unit tests to see how to use various parts of the core
engine.