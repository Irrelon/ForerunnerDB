window.fdb = new ForerunnerDB();
window.db = window.fdb.db('viewsTest');

var coll1 = db.collection('test1'),
	coll2 = db.collection('test2'),
	view1 = db.view('test1'),
	view2 = db.view('test2');

view1.from(coll1);
view2.from(coll2);

view1.link('#view1', '#col');
view2.link('#view2', '#col');

coll1.setData({
	val: 'Test 1.1'
});

coll2.setData({
	val: 'Test 2.1'
});

$('#view1')
	.find('div')
	.css('background-color', '#0000ff')
	.css('color', '#ffffff');

coll2.insert({
	val: 'Test 2.2'
});

view2.query({
	val: 'Test 2.1'
});

view2.query({
	val: 'Test 2.2'
});

coll2.setData({
	val: 'Test 2.1'
});

coll2.insert({
	val: 'Test 2.2'
});

view2.query({
	val: 'Test 2.1'
});

view2.query({
	$or: [{
		val: 'Test 2.1'
	}, {
		val: 'Test 2.2'
	}]
});