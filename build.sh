#!/bin/sh
browserify ./js/builds/core.js -s ForerunnerDB | derequire > ./js/dist/fdb-core.js
browserify ./js/builds/core+views.js -s ForerunnerDB | derequire > ./js/dist/fdb-core+views.js
browserify ./js/builds/all.js -s ForerunnerDB | derequire > ./js/dist/fdb-all.js

java -jar ./vendor/google/compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-core.js > ./js/dist/fdb-core.min.js
java -jar ./vendor/google/compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-core+views.js > ./js/dist/fdb-core+views.min.js
java -jar ./vendor/google/compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-all.js > ./js/dist/fdb-all.min.js