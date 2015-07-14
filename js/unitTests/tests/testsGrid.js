QUnit.module('Grid');
ForerunnerDB.moduleLoaded(['Grid', 'Document'], function () {
	QUnit.test('Grid() :: Instantiate a grid', function () {
		base.dbUp();

		var grid = db.grid('.moo');

		ok(grid instanceof db.shared.modules.Grid, 'Grid instantiated from correct class');

		base.dbDown();
	});

	QUnit.test('Grid() :: Bind a grid', function () {
		base.dbUp();
		base.domUp();

		var coll = db.collection('gridTest').truncate(),
			view = db.view('gridTest').from(coll),
			grid = view.grid('#testTarget2', '#gridTable', {
				$wrapIn: {
					myData: 'Custom data wrapping object working'
				}
			});

		coll.setData([{
			firstName: 'Fred',
			lastName: 'Jones',
			age: 15
		}, {
			firstName: 'Jim',
			lastName: 'Monsoon',
			age: 34
		}, {
			firstName: 'Tilly',
			lastName: 'Monsoon',
			age: 52
		}, {
			firstName: 'Arbit',
			lastName: 'Frogsbottom',
			age: 63
		}, {
			firstName: 'Fred',
			lastName: 'Frogsbottom',
			age: 62
		}]);

		ok(grid, 'Grid active');
		grid.drop();

		base.domDown();
		base.dbDown();
	});

	QUnit.test('Grid() :: Bind a grid with a document wrapper', function () {
		base.dbUp();
		base.domUp();

		var coll = db.collection('gridTest').truncate(),
			view = db.view('gridTest').from(coll),
			doc = db.document('gridTestDoc').setData({
				myData: 'Custom data wrapping object working'
			}),
			grid = view.grid('#testTarget2', '#gridTable', {
				$wrapIn: doc
			});

		coll.setData([{
			firstName: 'Fred',
			lastName: 'Jones',
			age: 15
		}, {
			firstName: 'Jim',
			lastName: 'Monsoon',
			age: 34
		}, {
			firstName: 'Tilly',
			lastName: 'Monsoon',
			age: 52
		}, {
			firstName: 'Arbit',
			lastName: 'Frogsbottom',
			age: 63
		}, {
			firstName: 'Fred',
			lastName: 'Frogsbottom',
			age: 62
		}]);

		ok(grid, 'Grid active');

		// Check the dom element is there
		strictEqual($.trim($('#myData').text()), 'Custom data wrapping object working', 'Output is correct before change');

		// Update the wrapper doc myData property and check dom again
		doc.update({}, {
			myData: 'New text'
		});

		strictEqual($.trim($('#myData').text()), 'New text', 'Output is correct after change');

		grid.drop();

		base.domDown();
		base.dbDown();
	});
});