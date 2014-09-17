#!/bin/sh
browserify ./builds/all.js -s ForerunnerDB | derequire > ./dist/fdb-all.js