var _ = require('lodash'),
    ui = require('./ui');

var state = {
    describes: [],
    currentSuite: null,
    running: false,
    aborted: false,
    index: 0
};

var Suite = function(name, fn) {
    // update global state
    state.describes.push(this);
    state.currentSuite = this;

    this.id = _.uniqueId('suite');
    this.sandbox = {};
    this.suite = new Benchmark.Suite({
        name: name
    });

    setTimeout(function() {
        ui.drawSuite(this);
    }.bind(this));

    fn(this.sandbox);
};

Suite.prototype = {
    setup: function(fn) {
        this.setupFn = fn;
        fn.call(this, this);
    },

    add: function(name, fn, options) {
        var suite = this;
        var bench = new Benchmark(name, fn, options);

        bench.originFn = fn;
        bench.originOption = options;

        setTimeout(function() {
            ui.drawBench(this, bench);
            this.suite.add(bench);
        }.bind(this));
    },

    run: function() {
        var stopped = !this.suite.running;
        this.suite.abort();

        if (stopped) {
            this.suite.aborted = false;
            this.suite.run({ async: true });
        }
    },

    runBenchmark: function(id) {
        this.suite.filter(function(bench) {
            if (bench.id !== id) return;

            var stopped = !bench.running;
            bench.abort();

            if (stopped) {
                bench.run({ async: true });
            }
        });
    }
};

var bench = function(name, fn, options) {
    state.currentSuite.add(name, fn, options);
};

var setup = function(fn) {
    state.currentSuite.setup(fn);
};

var run = function(options) {
    var suite = state.describes[state.index],
        onComplete = function() {
            state.index++;
            suite.suite.off('complete', onComplete);
            run(options);
        };

    if (suite && !state.aborted) {
        state.running = true;
        suite.run();
        suite.suite.on('complete', onComplete);
    } else {
        state.index = 0;
        state.running = false;
        state.aborted = false;
        if (options && options.onStop) {
            options.onStop();
        }
    }
};

var abort = function() {
    state.describes[state.index].suite.abort();

    if (state.running === true) {
        state.aborted = true;
    }
};

exports.state = state;
exports.run = run;
exports.abort = abort;

window.suite = function(name, fn) {
    return new Suite(name, fn);
};
window.setup = setup;
window.bench = bench;
window.astrobench = run;
