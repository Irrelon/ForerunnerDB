"use strict";

var util = require('util'),
	aliasify = require('aliasify'),
	stringify = require('stringify'),
	derequire = require('derequire');

module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks("grunt-browserify");
	//grunt.loadNpmTasks('grunt-qunit-blanket-lcov');
	grunt.loadNpmTasks('grunt-umd');
	grunt.loadNpmTasks('grunt-jsdoc');
	//grunt.loadNpmTasks('grunt-qunit-istanbul');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-node-qunit');

	grunt.initConfig({
		"jshint": {
			"ForerunnerDB": {
				"files": {
					"src": [
						"js/lib/**/*.js",
						'!js/lib/vendor/*.js'
					]
				}
			},
			options: {
				jshintrc: '.jshintrc'
			}
		},

		jsdoc : {
			all : {
				src: ['./js/lib/*.js'],
				options: {
					destination: './doc',
					template: './jsdoc-template'
				}
			}
		},

		qunit: {
			"source": {
				"src": [
					"js/unitTests/source.html"
				],
				options: {
					'--web-security': 'no',
					coverage: {
						disposeCollector: true,
						src: ['js/unitTests/lib/fdb-all.js'],
						instrumentedFiles: 'temp/',
						htmlReport: 'coverage/source',
						coberturaReport: 'coverage//source',
						linesThresholdPct: 10
					}
				}
			},

			"minified": {
				"src": [
					"js/unitTests/minified.html"
				],
				options: {
					'--web-security': 'no',
					coverage: {
						disposeCollector: true,
						src: ['js/unitTests/lib/fdb-all.min.js'],
						instrumentedFiles: 'temp/',
						htmlReport: 'coverage/minified',
						coberturaReport: 'coverage/minified',
						linesThresholdPct: 10
					}
				}
			}
		},

		"node-qunit": {
			"Core": {
				// logging options
				log: {
					// log assertions overview
					assertions: true,

					// log expected and actual values for failed tests
					errors: true,

					// log tests overview
					tests: true,

					// log summary
					summary: true,

					// log global summary (all files)
					globalSummary: true,

					// log coverage
					coverage: true,

					// log global coverage (all files)
					globalCoverage: true,

					// log currently testing code file
					testing: true
				},

				// run test coverage tool
				coverage: false,

				// define dependencies, which are required then before code
				deps: null,

				// define namespace your code will be attached to on global['your namespace']
				namespace: null,

				// max amount of ms child can be blocked, after that we assume running an infinite loop
				maxBlockDuration: 60000,

				code: "js/unitTests/tests/nodeTestsCore.js",
				tests: "js/unitTests/tests/nodeTestsCore.js",

				done: function (err, res) {

				}
			}
			/*,

			"RemoteApi": {
				// logging options
				log: {
					// log assertions overview
					assertions: true,

					// log expected and actual values for failed tests
					errors: true,

					// log tests overview
					tests: true,

					// log summary
					summary: true,

					// log global summary (all files)
					globalSummary: true,

					// log coverage
					coverage: true,

					// log global coverage (all files)
					globalCoverage: true,

					// log currently testing code file
					testing: true
				},

				// run test coverage tool
				coverage: false,

				// define dependencies, which are required then before code
				deps: null,

				// define namespace your code will be attached to on global['your namespace']
				namespace: null,

				// max amount of ms child can be blocked, after that we assume running an infinite loop
				maxBlockDuration: 2000,

				code: "js/unitTests/tests/testsNodeApi.js",
				tests: "js/unitTests/tests/testsNodeApi.js",
				done: function (err, res) {

				}
			}*/
		},

		"qunit_blanket_lcov": {
			"lib": {
				"src": "js/unitTests/lib/fdb-all.js",
				"options": {
					"dest": "coverage/fdb-all.lcov",
					force: true
				}
			}
		},

		"browserify": {
			"all": {
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
			},

			"autobind": {
				src: ["./js/builds/autobind.js"],
				dest: "./js/dist/fdb-autobind.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			},

			"angular": {
				src: ["./js/builds/angular.js"],
				dest: "./js/dist/fdb-angular.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			},

			"infinilist": {
				src: ["./js/builds/infinilist.js"],
				dest: "./js/dist/fdb-infinilist.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			},

			"core": {
				src: ["./js/builds/core.js"],
				dest: "./js/dist/fdb-core.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			},

			"core+persist": {
				src: ["./js/builds/core+persist.js"],
				dest: "./js/dist/fdb-core+persist.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			},

			"core+views": {
				src: ["./js/builds/core+views.js"],
				dest: "./js/dist/fdb-core+views.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			},
			
			"core+views+persist": {
				src: ["./js/builds/core+views+persist.js"],
				dest: "./js/dist/fdb-core+views+persist.js",
				options: {
					verbose: true,
					debug: true,
					transform: [aliasify, stringify(['.html'])],
					plugin: [
						[ "browserify-derequire" ]
					]
				}
			},

			"legacy": {
				src: ["./js/builds/legacy.js"],
				dest: "./js/dist/fdb-legacy.js",
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
			"all": {
				"files": {
					"./js/dist/fdb-all.min.js": ["./js/dist/fdb-all.js"]
				}
			},

			"autobind": {
				"files": {
					"./js/dist/fdb-autobind.min.js": ["./js/dist/fdb-autobind.js"]
				}
			},

			"angular": {
				"files": {
					"./js/dist/fdb-angular.min.js": ["./js/dist/fdb-angular.js"]
				}
			},

			"infinilist": {
				"files": {
					"./js/dist/fdb-infinilist.min.js": ["./js/dist/fdb-infinilist.js"]
				}
			},

			"core": {
				"files": {
					"./js/dist/fdb-core.min.js": ["./js/dist/fdb-core.js"]
				}
			},

			"core+views": {
				"files": {
					"./js/dist/fdb-core+views.min.js": ["./js/dist/fdb-core+views.js"]
				}
			},

			"core+persist": {
				"files": {
					"./js/dist/fdb-core+persist.min.js": ["./js/dist/fdb-core+persist.js"]
				}
			},
			
			"core+views+persist": {
				"files": {
					"./js/dist/fdb-core+views+persist.min.js": ["./js/dist/fdb-core+views+persist.js"]
				}
			},

			"legacy": {
				"files": {
					"./js/dist/fdb-legacy.min.js": ["./js/dist/fdb-legacy.js"]
				}
			}
		},

		umd: {
			all: {
				options: {
					src: './js/dist/fdb-all.js',
					globalAlias: 'ForerunnerDB'
				}
			},

			autobind: {
				options: {
					src: './js/dist/fdb-autobind.js',
					globalAlias: 'ForerunnerDB_AutoBind'
				}
			},

			angular: {
				options: {
					src: './js/dist/fdb-angular.js',
					globalAlias: 'ForerunnerDB_Angular'
				}
			},

			infinilist: {
				options: {
					src: './js/dist/fdb-infinilist.js',
					globalAlias: 'ForerunnerDB_Infinilist'
				}
			},

			core: {
				options: {
					src: './js/dist/fdb-core.js',
					globalAlias: 'ForerunnerDB'
				}
			},

			"core+views": {
				options: {
					src: './js/dist/fdb-core+views.js',
					globalAlias: 'ForerunnerDB'
				}
			},

			"core+persist": {
				options: {
					src: './js/dist/fdb-core+persist.js',
					globalAlias: 'ForerunnerDB'
				}
			},
			
			"core+views+persist": {
				options: {
					src: './js/dist/fdb-core+views+persist.js',
					globalAlias: 'ForerunnerDB'
				}
			},

			"legacy": {
				options: {
					src: './js/dist/fdb-legacy.js',
					globalAlias: 'ForerunnerDB'
				}
			}
		}
	});
	
	// Register events to output nice logs for qunit
	grunt.event.on('qunit.moduleStart', function (name) {
		grunt.log.ok('START TESTING MODULE: ' + name);
	});
	
	grunt.event.on('qunit.moduleDone', function (name) {
		grunt.log.ok('STOP TESTING MODULE: ' + name);
	});
	
	grunt.event.on('qunit.testStart', function (name) {
		grunt.log.ok('START TEST: ' + name);
	});
	
	grunt.event.on('qunit.testDone', function (name) {
		grunt.log.ok('STOP TEST: ' + name);
	});

	grunt.registerTask('postfix', 'Fix code for IE.', function () {
		var fs = require('fs-extra');

		var fixFile = function (file) {
			var code = fs.readFileSync('./js/dist/' + file, 'utf8');

			// Replace code that IE8 will die on
			code = code.replace(/\.catch\(/g, "['catch'](");
			code = code.replace(/\.continue\(/g, "['continue'](");
			code = code.replace(/\.delete\(/g, "['delete'](");

			// Write changes
			fs.writeFileSync('./js/dist/' + file, code);

			// Copy the build file to the tests folder
			if (fs.existsSync('./js/unitTests/lib/' + file)) {
				fs.unlinkSync('./js/unitTests/lib/' + file);
			}

			if (fs.existsSync('./js/perfTests/lib/' + file)) {
				fs.unlinkSync('./js/perfTests/lib/' + file);
			}

			if (fs.existsSync('./ionicExampleClient/www/lib/forerunnerdb/js/dist/' + file)) {
				fs.unlinkSync('./ionicExampleClient/www/lib/forerunnerdb/js/dist/' + file);
			}

			fs.copySync('./js/dist/' + file, './ionicExampleClient/www/lib/forerunnerdb/js/dist/' + file);
			fs.copySync('./js/dist/' + file, './js/unitTests/lib/' + file);
			fs.copySync('./js/dist/' + file, './js/perfTests/lib/' + file);
		};

		fixFile('fdb-all.js');
		fixFile('fdb-core.js');
		fixFile('fdb-autobind.js');
		fixFile('fdb-angular.js');
		fixFile('fdb-infinilist.js');
		fixFile('fdb-core+persist.js');
		fixFile('fdb-core+views.js');
		fixFile('fdb-core+views+persist.js');
		fixFile('fdb-legacy.js');
	});

	grunt.registerTask('copy', 'Copy final minified files to other folders.', function () {
		var fs = require('fs-extra');

		var copyFile = function (file) {
			// Copy the build file to the tests folder
			if (fs.existsSync('./js/perfTests/lib/' + file)) {
				fs.unlinkSync('./js/perfTests/lib/' + file);
			}

			if (fs.existsSync('./js/unitTests/lib/' + file)) {
				fs.unlinkSync('./js/unitTests/lib/' + file);
			}

			if (fs.existsSync('./chrome-extension/js/' + file)) {
				fs.unlinkSync('./chrome-extension/js/' + file);
			}

			if (fs.existsSync('./ionicExampleClient/www/lib/forerunnerdb/js/dist/' + file)) {
				fs.unlinkSync('./ionicExampleClient/www/lib/forerunnerdb/js/dist/' + file);
			}

			fs.copySync('./js/dist/' + file, './js/perfTests/lib/' + file);
			fs.copySync('./js/dist/' + file, './js/unitTests/lib/' + file);
			fs.copySync('./js/dist/' + file, './chrome-extension/js/' + file);
			fs.copySync('./js/dist/' + file, './ionicExampleClient/www/lib/forerunnerdb/js/dist/' + file);
		};

		copyFile('fdb-all.min.js');
		copyFile('fdb-autobind.min.js');
		copyFile('fdb-angular.min.js');
		copyFile('fdb-infinilist.min.js');
		copyFile('fdb-core.min.js');
		copyFile('fdb-core+persist.min.js');
		copyFile('fdb-core+views.min.js');
		copyFile('fdb-core+views+persist.min.js');
		copyFile('fdb-legacy.min.js');
	});

	grunt.registerTask('version', 'Increments the current version by a revision', function () {
		var fs = require('fs-extra'),
			packageJson,
			versionString,
			oldVersion,
			versionArr,
			revision,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;
		oldVersion = versionString;
		versionArr = versionString.split('.');
		revision = parseInt(versionArr[2], 10);

		// Increment revision number
		revision++;

		// Create new string
		versionArr[2] = String(revision);
		versionString = versionArr.join('.');

		// Save JSON
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./package.json', fileData);

		// Search project files for old version and replace
		fileData = fs.readFileSync('./js/lib/Shared.js', {encoding: 'utf8'});
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./js/lib/Shared.js', fileData);

		fileData = fs.readFileSync('./readme.md', {encoding: 'utf8'});
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./readme.md', fileData);

		fileData = fs.readFileSync('./bower.json', {encoding: 'utf8'});
		fileData = fileData.replace(oldVersion, versionString);
		fs.writeFileSync('./bower.json', fileData);
	});

	grunt.registerTask('gitCommit', 'Git Commit Updates', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git commit -am "New version build ' + versionString + '"');
	});

	grunt.registerTask('gitPushAndTagDev', 'Git Push and Tag Dev Build', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git push');
		child = execSync('git tag ' + versionString + '-dev');
		child = execSync('git push --tags');
	});

	grunt.registerTask('gitPushAndTagEdge', 'Git Push and Tag Edge Build', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git push');
		child = execSync('git tag ' + versionString + '-edge');
		child = execSync('git push --tags');
	});

	grunt.registerTask('gitMergeEdgeIntoDev', 'Git Merge Edge Into Dev', function () {
		"use strict";
		var execSync = require('child_process').execSync,
			child;

		child = execSync('git checkout dev');
		child = execSync('git merge edge');
	});

	grunt.registerTask('gitMergeDevIntoMaster', 'Git Merge Dev Into Master', function () {
		"use strict";
		var execSync = require('child_process').execSync,
			child;

		child = execSync('git checkout master');
		child = execSync('git merge dev');
	});

	grunt.registerTask('gitMergeDevIntoEdge', 'Git Merge Dev Into Edge', function () {
		"use strict";
		var execSync = require('child_process').execSync,
			child;

		child = execSync('git checkout edge');
		child = execSync('git merge dev');
	});

	grunt.registerTask('gitPushAndTagMaster', 'Git Push and Tag Master Build', function () {
		"use strict";

		var execSync = require('child_process').execSync,
			fs = require('fs-extra'),
			child,
			packageJson,
			versionString,
			fileData;

		fileData = fs.readFileSync('./package.json', {encoding: 'utf8'});
		packageJson = JSON.parse(fileData);

		versionString = packageJson.version;

		child = execSync('git push');
		child = execSync('git tag ' + versionString);
		child = execSync('git push --tags');
	});

	grunt.registerTask('npmPublish', 'NPM Publish New Version', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('npm publish');
	});

	grunt.registerTask('npmPublishDev', 'NPM Publish New Dev Version', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('npm publish --tag dev');
	});

	grunt.registerTask('npmPublishEdge', 'NPM Publish New Edge Version', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('npm publish --tag edge');
	});

	grunt.registerTask('checkoutMaster', 'Git Checkout Master Branch', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('git checkout master');
	});

	grunt.registerTask('checkoutDev', 'Git Checkout Dev Branch', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('git checkout dev');
	});

	grunt.registerTask('checkoutEdge', 'Git Checkout Edge Branch', function () {
		"use strict";

		var execSync = require('child_process').execSync;

		execSync('git checkout edge');
	});

	grunt.registerTask('generateTOC', 'Generate Table of Contents', function () {
		/*"use strict";

		 var execSync = require('child_process').execSync;

		 execSync('doctoc readme.md');*/
	});

	grunt.registerTask('testbear', 'Run testBear tests', function () {
		var self = this,
			spawn = require('child_process').spawn,
			spawnedProcess,
			done;

		done = self.async();
		spawnedProcess = spawn('node', ['js/unitTests/tests/nodeTests.js'], { stdio: 'inherit' });

		spawnedProcess.on('close', function (code, signal) {
			if (code !== 0) {
				done(new Error('Test Bear reported errors in tests!'));
			} else {
				done();
			}
		});

		spawnedProcess.on('error', function (err) {
			done(err);
		});

		spawnedProcess.on('disconnect', function () {
			done();
		});
	});

	grunt.registerTask("0: Build, Commit, Tag and Push Edge Branch", ["checkoutEdge", "version", "generateTOC", "browserify", "postfix", "uglify", "jsdoc", "gitCommit", "gitPushAndTagEdge", "npmPublishEdge"]);
	grunt.registerTask("1: Build Source File", ["browserify", "postfix", "copy"]);
	grunt.registerTask("2: Run Unit Tests", ["copy",  "testbear", "qunit"]);
	grunt.registerTask("3: Build and Test", ["version", "generateTOC", "browserify", "postfix", "uglify", "2: Run Unit Tests"]);
	grunt.registerTask("4: JSHint, Build and Test", ["jshint", "version", "generateTOC", "browserify", "postfix", "uglify", "2: Run Unit Tests"]);
	grunt.registerTask("5: Build and Test Dev Branch", ["checkoutDev", "version", "generateTOC", "browserify", "postfix", "uglify", "2: Run Unit Tests"]);
	grunt.registerTask("6: Build, Commit, Test, Tag and Push Dev Branch", ["checkoutDev", "version", "generateTOC", "jshint", "browserify", "postfix", "uglify", "2: Run Unit Tests", "jsdoc", "gitCommit", "gitPushAndTagDev", "npmPublishDev"]);
	grunt.registerTask("7: Release and Publish Master Build From Dev", ["checkoutDev", "version", "generateTOC", "jshint", "browserify", "postfix", "uglify", "2: Run Unit Tests", "jsdoc", "gitCommit", "gitPushAndTagDev", "gitMergeDevIntoMaster", "gitPushAndTagMaster", "npmPublish", "checkoutDev"]);

	grunt.registerTask("default", ["testbear", "qunit"]);
};