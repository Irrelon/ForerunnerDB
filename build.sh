#!/bin/sh
browserify ./js/builds/all.js -s ForerunnerDB | derequire > ./js/dist/fdb-all.js