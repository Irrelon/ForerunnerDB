$(function () {
	test("Bind - View.on() :: Insert", function() {
		dbUp();
		dataUp();
		viewUp();
		domUp();
		
		userView.bind('#testTarget', {
			template: function (data, callback) {
				callback('<li id="' + data._id + '">' + data.name + '</li>');
			}
		});
	
		user.insert({
			_id: '2342',
			name: "hello"
		});
		
		var elem = $('#testTarget').find('#2342');
		
		ok(elem.length === 1, "Insert single document");
	
		viewDown();
		domDown();
		dbDown();
	});
	
	test("Bind - View.on() :: Update", function() {
		dbUp();
		dataUp();
		viewUp();
		domUp();
		
		userView.bind('#testTarget', {
			template: function (data, callback) {
				callback('<li id="' + data._id + '">' + data.name + '</li>');
			}
		});
	
		user.insert({
			_id: '2342',
			name: "hello"
		});
		
		var currentName = $('#testTarget').find('#2342').text();
		ok(currentName === 'hello', "Insert single document");
	
		user.update({
			_id: '2342'
		}, {
			name: "hello2"
		});
		
		var newName = $('#testTarget').find('#2342').text();
		ok(newName === 'hello2', "Update single document");
		
		viewDown();
		domDown();
		dbDown();
	});
	
	test("Bind - View.on() :: Remove", function() {
		dbUp();
		dataUp();
		viewUp();
		domUp();
		
		userView.bind('#testTarget', {
			template: function (data, callback) {
				callback('<li id="' + data._id + '">' + data.name + '</li>');
			}
		});
	
		user.insert({
			_id: '2342',
			name: "hello"
		});
		
		var elem = $('#testTarget').find('#2342');
		ok(elem.length === 1, "Insert single document");
		
		user.remove({
			_id: '2342'
		});
		
		elem = $('#testTarget').find('#2342');
		ok(elem.length === 0, "Remove single document");
	
		viewDown();
		domDown();
		dbDown();
	});
});