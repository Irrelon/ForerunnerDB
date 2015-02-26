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
		}
	});

	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.registerTask('default', ['jshint', 'qunit']);
};