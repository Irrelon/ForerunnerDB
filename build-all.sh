#!/bin/sh
rm ./js/dist/fdb-all.js
rm ./js/dist/fdb-all.min.js

browserify ./js/builds/all.js -s ForerunnerDB | derequire > ./js/dist/fdb-all.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-all.js > ./js/dist/fdb-all.min.js