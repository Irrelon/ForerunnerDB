test("Bind - View.on() :: Remove + Insert via setData from Collection", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.domUp();

	userView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
	});

	user.setData({
		_id: '2342',
		name: "hello"
	});

	var elem = $('#testTarget').find('#2342');

	ok(elem.length === 1, "Insert single document");

	userView.unlink('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
	});

	base.viewDown();
	base.domDown();
	base.dbDown();
});

test("Bind - View.on() :: Insert from Collection", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.domUp();

	userView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
	});

	user.insert({
		_id: '2342',
		name: "hello"
	});

	var elem = $('#testTarget').find('#2342');

	ok(elem.length === 1, "Insert single document");

	base.viewDown();
	base.domDown();
	base.dbDown();
});

test("Bind - View.on() :: Update from Collection", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.domUp();

	userView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
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

	base.viewDown();
	base.domDown();
	base.dbDown();
});

test("Bind - View.on() :: Remove from Collection", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.domUp();

	userView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
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

	base.viewDown();
	base.domDown();
	base.dbDown();
});

test("Bind - View.on() :: Insert from CollectionGroup via Collection Interface", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.viewGroupUp();
	base.domUp();

	/*expect(1);
	 start();*/

	user.on('insert', function () {
		ok(true, 'Collection insert');
	});

	userView.on('insert', function () {
		ok(true, 'View insert');
	});

	userGroup.on('insert', function () {
		ok(true, 'Group insert');
	});

	userGroupView.on('insert', function () {
		ok(true, 'View from group insert');
	});

	userGroupView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
	});

	user.insert({
		_id: '2342',
		name: "hello"
	});

	var elem = $('#testTarget').find('#2342');

	ok(elem.length === 1, "Insert single document");

	base.domDown();
	base.viewGroupDown();
	base.viewDown();
	base.dbDown();
});

test("Bind - View.on() :: Update from CollectionGroup via Collection Interface", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.viewGroupUp();
	base.domUp();

	user.on('update', function () {
		ok(true, 'Collection update');
	});

	userView.on('update', function () {
		ok(true, 'View update');
	});

	userGroup.on('update', function () {
		ok(true, 'Group update');
	});

	userGroupView.on('update', function () {
		ok(true, 'View from group update');
	});

	userGroupView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
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

	//base.domDown();
	base.viewGroupDown();
	base.viewDown();
	base.dbDown();
});

test("Bind - View.on() :: Remove from CollectionGroup via Collection Interface", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.viewGroupUp();
	base.domUp();

	user.on('remove', function () {
		ok(true, 'Collection remove');
	});

	userView.on('remove', function () {
		ok(true, 'View remove');
	});

	userGroup.on('remove', function () {
		ok(true, 'Group remove');
	});

	userGroupView.on('remove', function () {
		ok(true, 'View from group remove');
	});

	userGroupView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
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

	base.domDown();
	base.viewGroupDown();
	base.viewDown();
	base.dbDown();
});

test("Bind - View.on() :: Insert from CollectionGroup via CollectionGroup Interface", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.viewGroupUp();
	base.domUp();

	/*expect(1);
	 start();*/

	user.on('insert', function () {
		ok(true, 'Collection insert');
	});

	userView.on('insert', function () {
		ok(true, 'View insert');
	});

	userGroup.on('insert', function () {
		ok(true, 'Group insert');
	});

	userGroupView.on('insert', function () {
		ok(true, 'View from group insert');
	});

	userGroupView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
	});
debugger;
	userGroup.insert({
		_id: '2342',
		name: "hello"
	});

	var elem = $('#testTarget').find('#2342');

	ok(elem.length === 1, "Insert single document");

	base.domDown();
	base.viewGroupDown();
	base.viewDown();
	base.dbDown();
});

test("Bind - View.on() :: Update from CollectionGroup via CollectionGroup Interface", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.viewGroupUp();
	base.domUp();

	user.on('update', function () {
		ok(true, 'Collection update');
	});

	userView.on('update', function () {
		ok(true, 'View update');
	});

	userGroup.on('update', function () {
		ok(true, 'Group update');
	});

	userGroupView.on('update', function () {
		ok(true, 'View from group update');
	});

	userGroupView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
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

	//base.domDown();
	base.viewGroupDown();
	base.viewDown();
	base.dbDown();
});

test("Bind - View.on() :: Remove from CollectionGroup via CollectionGroup Interface", function() {
	base.dbUp();
	base.dataUp();
	base.viewUp();
	base.viewGroupUp();
	base.domUp();

	user.on('remove', function () {
		ok(true, 'Collection remove');
	});

	userView.on('remove', function () {
		ok(true, 'View remove');
	});

	userGroup.on('remove', function () {
		ok(true, 'Group remove');
	});

	userGroupView.on('remove', function () {
		ok(true, 'View from group remove');
	});

	userGroupView.link('#testTarget', {
		template: '<li data-link="id{:_id}">{^{:name}}</li>'
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

	base.domDown();
	base.viewGroupDown();
	base.viewDown();
	base.dbDown();
});

test("Bind - View() :: View sort", function() {
	base.dbUp();
	base.viewUp();
	base.dataUp();
	base.domUp();

	var arr = [],
		elem,
		i = 400;

	// Generate some data
	//user.truncate();

	/*while (i--) {
		user.insert({
			_id: '1' + i,
			name: Math.floor((Math.random() * 4000))
		});
	}*/

	//userView._debug = true;
	userView
		.queryOptions({
			$orderBy: {
				name: 1
			}
		}, false)
		.link('#testTarget', {
			template: '<li class="item" data-link="id{:_id}">{^{:name}}</li>'
		});

	user.insert({
		_id: '2342',
		name: "adam"
	});

	user.insert({
		_id: '23432',
		name: "zelda"
	});

	user.insert({
		_id: '2322',
		name: "beta"
	});

	userView.refresh(true);

	var viewData = userView.find(),
		elems = $('#testTarget').find('.item');

	ok(elems.length === 7, "Insert documents");

	// Check sort order
	//console.log($(elems[0]).html(), $(elems[1]).html(), $(elems[2]).html(), $(elems[3]).html(), $(elems[4]).html(), $(elems[5]).html());
	ok($(elems[0]).html() === 'adam', "Alphabetical 1");
	ok($(elems[1]).html() === 'beta', "Alphabetical 2");
	ok($(elems[2]).html() === 'Dean', "Alphabetical 3");
	ok($(elems[3]).html() === 'Dean', "Alphabetical 4");
	ok($(elems[4]).html() === 'Jim', "Alphabetical 5");
	ok($(elems[5]).html() === 'Kat', "Alphabetical 6");
	ok($(elems[6]).html() === 'zelda', "Alphabetical 7");

	//userView._debug = false;

	base.viewDown();
	base.domDown();
	base.dbDown();
});