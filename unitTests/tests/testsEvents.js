asyncTest("Collection.on() :: Insert", function() {
	buildUp();
	buildData();

	expect(1);

	user.on('insert', function (inserted, failed) {
		ok(inserted === 1, "Failed!");
		start();
	});

	user.insert({
		_id: '2342',
		name: "hello"
	});

	pullDown();
});