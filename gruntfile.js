var util = require('util'),
	aliasify = require('aliasify'),
	stringify = require('stringify'),
	derequire = require('derequire');

module.exports = function(grunt) {
	grunt.initConfig({
		"jshint": {
			"ForerunnerDB": {
				"files": {
					"src": [
						"js/lib/**/*.js",
						'!js/lib/vendor/*.js'
					]
				}
			}
		},

		qunit: {
			"ForerunnerDB": {
				"src": [
					"js/unitTests/index.html"
				]
			}
		},

		"browserify": {
			"core": {
				src: ["./js/builds/all.js"],
				dest: "./js/dist/fdb-all.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			}
		},

		"uglify": {
			"core": {
				"files": {
					"./js/dist/fdb-all.min.js": ["./js/dist/fdb-all.js"]
				}
			}
		},

		umd: {
			all: {
				options: {
					src: './js/dist/fdb-all.js',
					globalAlias: 'ForerunnerDB' // optional, changes the name of the global variable
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks("grunt-browserify");
	grunt.loadNpmTasks('grunt-umd');

	grunt.registerTask("0: Check & Build Distribution File", ["jshint", "browserify"]);
	grunt.registerTask("1: Check Code Cleanliness", ["jshint"]);
	grunt.registerTask("2: Build Distribution File", ["browserify"]);
	grunt.registerTask("3: Minify Distribution Source", ["uglify"]);
	grunt.registerTask("4: Run Unit Tests", ["qunit"]);
	grunt.registerTask("5: Full Build Cycle", ["jshint", "browserify", "uglify", "qunit"]);
};