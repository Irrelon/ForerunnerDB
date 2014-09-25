test('Document - Document() :: Instantiate a document', function () {
	base.dbUp();

	var doc = db.document('moo');

	ok (doc instanceof db.shared.modules.Document, 'Document instantiated from correct class');

	base.dbDown();
});

test('Document - Document.setData() :: Set document data', function () {
	base.dbUp();

	var doc = db.document('moo')
		.setData({
			name: 'Goodfellow',
			age: 20
		});

	ok (typeof doc._data === 'object', 'Document is an object');
	ok (doc._data.name === 'Goodfellow' && doc._data.age === 20, 'Document data is correct');

	base.dbDown();
});

test('Document - Document.setData() :: Set document data against existing data', function () {
	base.dbUp();
	base.domUp();

	var doc = db.document('moo')
		.setData({
			_id: 1,
			name: 'Goodfellow',
			age: 20,
			houseNum: 312
		});

	var docDataRef1 = doc._data;

	ok (typeof doc._data === 'object', 'Document is an object');
	ok (doc._data.name === 'Goodfellow' && doc._data.age === 20 && doc._data.houseNum === 312, 'Document data is correct');

	doc = db.document('moo')
		.setData({
			name: 'Goodfellow2',
			age: 22
		});

	var docDataRef2 = doc._data;

	ok (typeof doc._data === 'object', 'Document is an object');
	ok (doc._data.name === 'Goodfellow2' && doc._data.age === 22 && doc._data.houseNum === undefined, 'Document data is correct');

	base.domDown();
	base.dbDown();
});

test('Document - Document.setData() :: Data-binding to DOM element', function () {
	base.dbUp();
	base.domUp();

	var doc = db.document('moo')
		.setData({
			_id: 1,
			name: 'Goodfellow',
			age: 20
		});

	doc.link('#testTarget', {
		template: '<div class="item" data-link="id{:_id} data-name{:name} data-age{:age}">{^{:name}}: {^{:age}}</div>'
	});

	var docDataRef1 = doc._data,
		elem = $('#testTarget div');

	ok (typeof doc._data === 'object', 'Document is an object');
	ok (doc._data.name === 'Goodfellow' && doc._data.age === 20, 'Document data is correct');
	ok ($(elem[0]).attr('data-name') === 'Goodfellow', 'Data-linked element contains correct data');
	ok ($(elem[0]).attr('data-age') === '20', 'Data-linked element contains correct data');

	doc = db.document('moo')
		.setData({
			name: 'Goodfellow2',
			age: 22
		});

	var docDataRef2 = doc._data;
	elem = $('#testTarget div');

	ok (typeof doc._data === 'object', 'Document is an object');
	ok (doc._data.name === 'Goodfellow2' && doc._data.age === 22, 'Document data is correct');
	ok (docDataRef1 === docDataRef2, 'Document internal object reference is the same');
	ok ($(elem[0]).attr('data-name') === 'Goodfellow2', 'Data-linked element contains correct data');
	ok ($(elem[0]).attr('data-age') === '22', 'Data-linked element contains correct data');

	base.domDown();
	base.dbDown();
});