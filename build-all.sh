#!/bin/sh
rm ./js/dist/fdb-all.js
rm ./js/dist/fdb-all.min.js

rm ./js/dist/fdb-autobind.js
rm ./js/dist/fdb-autobind.min.js

browserify ./js/builds/all.js -s ForerunnerDB | derequire > ./js/dist/fdb-all.js
browserify ./js/builds/autobind.js -s ForerunnerDB_AutoBind | derequire > ./js/dist/fdb-autobind.js

java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-all.js > ./js/dist/fdb-all.min.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-autobind.js > ./js/dist/fdb-autobind.min.js