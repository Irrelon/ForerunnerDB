#!/bin/sh
rm ./js/dist/fdb-all.js
rm ./js/dist/fdb-autobind.js
rm ./js/dist/fdb-core.js
rm ./js/dist/fdb-core+views.js
rm ./js/dist/fdb-core+persist.js
rm ./js/dist/fdb-legacy.js

rm ./js/dist/fdb-all.min.js
rm ./js/dist/fdb-autobind.min.js
rm ./js/dist/fdb-core.min.js
rm ./js/dist/fdb-core+views.min.js
rm ./js/dist/fdb-core+persist.min.js
rm ./js/dist/fdb-legacy.min.js

browserify ./js/builds/all.js -s ForerunnerDB | derequire > ./js/dist/fdb-all.js
browserify ./js/builds/autobind.js -s ForerunnerDB_AutoBind | derequire > ./js/dist/fdb-autobind.js
browserify ./js/builds/core.js -s ForerunnerDB | derequire > ./js/dist/fdb-core.js
browserify ./js/builds/core+views.js -s ForerunnerDB | derequire > ./js/dist/fdb-core+views.js
browserify ./js/builds/core+persist.js -s ForerunnerDB | derequire > ./js/dist/fdb-core+persist.js
browserify ./js/builds/legacy.js -s ForerunnerDB | derequire > ./js/dist/fdb-legacy.js

#browserify ./js/builds/all.js -t uglifyify -s ForerunnerDB | derequire > ./js/dist/fdb-all.min.js
#browserify ./js/builds/autobind.js -t uglifyify -s ForerunnerDB_AutoBind | derequire > ./js/dist/fdb-autobind.min.js
#browserify ./js/builds/core.js -t uglifyify -s ForerunnerDB | derequire > ./js/dist/fdb-core.min.js
#browserify ./js/builds/core+views.js -t uglifyify -s ForerunnerDB | derequire > ./js/dist/fdb-core+views.min.js
#browserify ./js/builds/core+persist.js -t uglifyify -s ForerunnerDB | derequire > ./js/dist/fdb-core+persist.min.js
#browserify ./js/builds/legacy.js -t uglifyify -s ForerunnerDB | derequire > ./js/dist/fdb-legacy.min.js

java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-all.js > ./js/dist/fdb-all.min.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-autobind.js > ./js/dist/fdb-autobind.min.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-core.js > ./js/dist/fdb-core.min.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-core+views.js > ./js/dist/fdb-core+views.min.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-core+persist.js > ./js/dist/fdb-core+persist.min.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-all.js > ./js/dist/fdb-all.min.js
java -jar ./vendor/google/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --warning_level=QUIET --js ./js/dist/fdb-legacy.js > ./js/dist/fdb-legacy.min.js

node postfix.js

rm ./js/unitTests/lib/fdb-all.js
cp ./js/dist/fdb-all.js ./js/unitTests/lib/fdb-all.js

rm ./js/unitTests/lib/fdb-autobind.js
cp ./js/dist/fdb-autobind.js ./js/unitTests/lib/fdb-autobind.js