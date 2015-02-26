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
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.registerTask('default', ['jshint']);
};