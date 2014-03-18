$(function () {
	test("Bind - View.on() :: Insert from Collection", function() {
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
	
	test("Bind - View.on() :: Update from Collection", function() {
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
	
	test("Bind - View.on() :: Remove from Collection", function() {
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
	
	test("Bind - View.on() :: Insert from CollectionGroup via Collection Interface", function() {
		dbUp();
		dataUp();
		viewUp();
		viewGroupUp();
		domUp();
		
		/*expect(1);
		start();*/
		
		user.on('insert', function () {
			ok(true, 'Collection insert');
		});
		
		userView.on('insert', function () {
			console.log('View insert');
			ok(true, 'View insert');
		});
		
		userGroup.on('insert', function () {
			console.log('Group insert');
			ok(true, 'Group insert');
		});
		
		userGroupView.on('insert', function () {
			console.log('View from group insert');
			ok(true, 'View from group insert');
		});
		
		userGroupView.bind('#testTarget', {
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
	
		domDown();
		viewGroupDown();
		viewDown();
		dbDown();
	});
	
	test("Bind - View.on() :: Update from CollectionGroup via Collection Interface", function() {
		dbUp();
		dataUp();
		viewUp();
		viewGroupUp();
		domUp();
		
		user.on('update', function () {
			ok(true, 'Collection update');
		});
		
		userView.on('update', function () {
			console.log('View update');
			ok(true, 'View update');
		});
		
		userGroup.on('update', function () {
			console.log('Group update');
			ok(true, 'Group update');
		});
		
		userGroupView.on('update', function () {
			console.log('View from group update');
			ok(true, 'View from group update');
		});
		
		userGroupView.bind('#testTarget', {
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
		
		//domDown();
		viewGroupDown();
		viewDown();
		dbDown();
	});
	
	test("Bind - View.on() :: Remove from CollectionGroup via Collection Interface", function() {
		dbUp();
		dataUp();
		viewUp();
		viewGroupUp();
		domUp();
		
		user.on('remove', function () {
			ok(true, 'Collection remove');
		});
		
		userView.on('remove', function () {
			console.log('View remove');
			ok(true, 'View remove');
		});
		
		userGroup.on('remove', function () {
			console.log('Group remove');
			ok(true, 'Group remove');
		});
		
		userGroupView.on('remove', function () {
			console.log('View from group remove');
			ok(true, 'View from group remove');
		});
		
		userGroupView.bind('#testTarget', {
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
	
		domDown();
		viewGroupDown();
		viewDown();
		dbDown();
	});
	
	test("Bind - View.on() :: Insert from CollectionGroup via CollectionGroup Interface", function() {
		dbUp();
		dataUp();
		viewUp();
		viewGroupUp();
		domUp();
		
		/*expect(1);
		start();*/
		
		user.on('insert', function () {
			ok(true, 'Collection insert');
		});
		
		userView.on('insert', function () {
			console.log('View insert');
			ok(true, 'View insert');
		});
		
		userGroup.on('insert', function () {
			console.log('Group insert');
			ok(true, 'Group insert');
		});
		
		userGroupView.on('insert', function () {
			console.log('View from group insert');
			ok(true, 'View from group insert');
		});
		
		userGroupView.bind('#testTarget', {
			template: function (data, callback) {
				callback('<li id="' + data._id + '">' + data.name + '</li>');
			}
		});
	
		userGroup.insert({
			_id: '2342',
			name: "hello"
		});
		
		var elem = $('#testTarget').find('#2342');
		
		ok(elem.length === 1, "Insert single document");
	
		domDown();
		viewGroupDown();
		viewDown();
		dbDown();
	});
	
	test("Bind - View.on() :: Update from CollectionGroup via CollectionGroup Interface", function() {
		dbUp();
		dataUp();
		viewUp();
		viewGroupUp();
		domUp();
		
		user.on('update', function () {
			ok(true, 'Collection update');
		});
		
		userView.on('update', function () {
			console.log('View update');
			ok(true, 'View update');
		});
		
		userGroup.on('update', function () {
			console.log('Group update');
			ok(true, 'Group update');
		});
		
		userGroupView.on('update', function () {
			console.log('View from group update');
			ok(true, 'View from group update');
		});
		
		userGroupView.bind('#testTarget', {
			template: function (data, callback) {
				callback('<li id="' + data._id + '">' + data.name + '</li>');
			}
		});
	
		userGroup.insert({
			_id: '2342',
			name: "hello"
		});
		
		var currentName = $('#testTarget').find('#2342').text();
		ok(currentName === 'hello', "Insert single document");
	
		userGroup.update({
			_id: '2342'
		}, {
			name: "hello2"
		});
		
		var newName = $('#testTarget').find('#2342').text();
		ok(newName === 'hello2', "Update single document");
		
		//domDown();
		viewGroupDown();
		viewDown();
		dbDown();
	});
	
	test("Bind - View.on() :: Remove from CollectionGroup via CollectionGroup Interface", function() {
		dbUp();
		dataUp();
		viewUp();
		viewGroupUp();
		domUp();
		
		user.on('remove', function () {
			ok(true, 'Collection remove');
		});
		
		userView.on('remove', function () {
			console.log('View remove');
			ok(true, 'View remove');
		});
		
		userGroup.on('remove', function () {
			console.log('Group remove');
			ok(true, 'Group remove');
		});
		
		userGroupView.on('remove', function () {
			console.log('View from group remove');
			ok(true, 'View from group remove');
		});
		
		userGroupView.bind('#testTarget', {
			template: function (data, callback) {
				callback('<li id="' + data._id + '">' + data.name + '</li>');
			}
		});
	
		userGroup.insert({
			_id: '2342',
			name: "hello"
		});
		
		var elem = $('#testTarget').find('#2342');
		ok(elem.length === 1, "Insert single document");
		
		userGroup.remove({
			_id: '2342'
		});
		
		elem = $('#testTarget').find('#2342');
		ok(elem.length === 0, "Remove single document");
	
		domDown();
		viewGroupDown();
		viewDown();
		dbDown();
	});
});