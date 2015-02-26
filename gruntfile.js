module.exports = function(grunt) {
	grunt.initConfig({
		"jshint": {
			"ForerunnerDB": {
				"files": {
					"src": ["js/lib/**/*.js"]
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.registerTask('default', ['jshint']);
};