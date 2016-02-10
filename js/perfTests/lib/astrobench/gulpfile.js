var gulp = require('gulp');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var header = require('gulp-header');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var pkg = require('./package.json');
var banner = ['/*!',
  ' * <%= pkg.title %> - <%= pkg.version %>',
  ' * <%= pkg.description %>',
  ' *',
  ' * <%= pkg.homepage %>',
  ' *',
  ' * Copyright <%= pkg.author %>',
  ' * Released under the <%= pkg.license %> license.',
  ' */',
  ''].join('\n');

var browserifyConfig = {debug: false};

gulp.task('dev', function() {
  browserifyConfig = {debug: true};
});

gulp.task('browserify', function() {
  return browserify({entries:'./src/ui.js'})
    .transform('node-underscorify')
    .bundle(browserifyConfig)
    .on('error', function (err) {
      console.log(err.toString());
      this.emit('end');
    })
    .pipe(source('astrobench.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('build', ['browserify'], function() {
  return gulp.src(['./dist/astrobench.js', './node_modules/benchmark/benchmark.js'])
    .pipe(concat('astrobench.js'))
    .pipe(header(banner, {pkg: pkg}))
    .pipe(gulp.dest('./dist/'))
    .pipe(uglify({preserveComments: 'some'}))
    .pipe(concat('astrobench.min.js'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['build']);

gulp.task('watch', function() {
  gulp.watch(['src/**/*.js', 'src/**/*.html'], ['dev', 'build']);
});
