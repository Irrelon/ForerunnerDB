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

	var doc = db.document('moo')
		.setData({
			name: 'Goodfellow',
			age: 20
		});

	var docDataRef1 = doc._data;

	ok (typeof doc._data === 'object', 'Document is an object');
	ok (doc._data.name === 'Goodfellow' && doc._data.age === 20, 'Document data is correct');

	doc = db.document('moo')
		.setData({
			name: 'Goodfellow2',
			age: 22
		});

	var docDataRef2 = doc._data;

	ok (typeof doc._data === 'object', 'Document is an object');
	ok (doc._data.name === 'Goodfellow2' && doc._data.age === 22, 'Document data is correct');
	ok (docDataRef1 === docDataRef2, 'Document internal object reference is the same');

	base.dbDown();
});