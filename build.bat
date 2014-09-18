browserify -s ForerunnerDB .\js\builds\all.js > .\js\dist\fdb-all.js
browserify -s ForerunnerDB .\js\builds\core+views.js > .\js\dist\fdb-core+views.js

browserify -s ForerunnerDB .\js\builds\core.js > .\js\dist\fdb-core.js

"C:\Program Files\nodejs\compiler.jar" --compilation_level ADVANCED_OPTIMIZATIONS --warning_level=QUIET --js .\js\dist\fdb-all.js .\js\dist\fdb-all.min.js