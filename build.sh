#!/bin/sh
browserify ./build/all.js -s ForerunnerDB | derequire > ./dist/fdb-all.js