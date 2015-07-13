"use strict";

var fdb = new ForerunnerDB(),
	db = fdb.db('fdbChromeExtension');

// Setup the main db data view collection
db.collection('dataView').setData([]);

var getCall = function (js, callback) {
	chrome.devtools.inspectedWindow.eval(js, callback);
};

var refreshDatabaseTree = function () {
	// Get number of instances
	getCall('ForerunnerDB.instantiatedCount()', function (result, isException) {
		//console.log('Instance count', result, isException);
		if (result > 0) {
			$('#noInstances').hide();

			getCall('ForerunnerDB.instances()[0].databases()', function (result, isException) {
				//console.log('databases', result);

				var dbNodes = [],
					entityItem,
					entityNodes,
					tree,
					node,
					dbNode,
					i, j, moduleNode;

				for (i = 0; i < result.length; i++) {
					dbNodes.push({
						fdb: {
							type: 'database',
							id: result[i].name,
							children: result[i].children
						},
						text: result[i].name
					});
				}

				$('#tree').treeview({
					data: [{
						text: "Databases",
						nodes: dbNodes
					}],

					onNodeSelected: function (event, data) {
						tree = $('#tree').data('treeview').tree;

						if (data.fdb) {
							switch (data.fdb.type) {
								case 'database':
									// Loop the children of this db object
									if (data.fdb.children) {
										entityNodes = [];

										for (j = 0; j < data.fdb.children.length; j++) {
											entityItem = data.fdb.children[j];

											entityNodes.push({
												fdb: {
													type: 'module',
													moduleData: entityItem
												},
												text: entityItem.moduleName + ' (' + entityItem.count + ')'
											});
										}

										node = tree.getNode(data.nodeId);
										node.nodes = entityNodes;

										tree.setInitialStates(node, 0);

										node.state.expanded = true;

										tree.render();
									}
									break;

								case 'module':
									switch (data.fdb.moduleData.module) {
										default:
											dbNode = tree.getNode(data.parentId);

											// Get collections for this DB
											getCall("ForerunnerDB.instances()[0].db('" + dbNode.fdb.id + "')." + data.fdb.moduleData.module + "s()", function (result, isException) {
												var moduleNodes = [];

												for (i = 0; i < result.length; i++) {
													moduleNodes.push({
														fdb: {
															type: data.fdb.moduleData.module,
															id: result[i].name
														},
														text: result[i].name + ' (' + result[i].count + ')'
													});
												}

												node = tree.getNode(data.nodeId);
												node.nodes = moduleNodes;

												tree.setInitialStates(node, 0);

												node.state.expanded = true;

												tree.render();
											});
											break;
									}
									break;

								case 'collection':
									moduleNode = tree.getNode(data.parentId);
									dbNode = tree.getNode(moduleNode.parentId);

									// Grab the collection data and display in the right pane
									getCall("ForerunnerDB.instances()[0].db('" + dbNode.fdb.id + "')." + moduleNode.fdb.moduleData.module + "('" + data.fdb.id + "').find()", function (result, isException) {
										// Unlink any previous data-binding
										db.view('dataView').unlink();
										db.view('dataView').drop();
										db.document('dataViewStatus').drop();

										// Set the new data in the data view collection
										db.collection('dataView').setData(result);

										db.view('dataView').from(db.collection('dataView'));

										db.view('dataView').queryData({}, {
											$page: 0,
											$limit: 10,
											$orderBy: {
												_id: 1
											}
										});

										// Create document to wrap data in
										var wrapperDoc = db.document('dataViewStatus')
											.setData({
												records: 0,
												page: 1,
												pages: 1
											});

										// Keep the record count up to date as changes occur to the view
										db.view('dataView').on('change', function () {
											var cursor = db.view('dataView').cursor();

											if (cursor) {
												wrapperDoc.update({}, {
													records: cursor.records,
													page: cursor.page + 1,
													pages: cursor.pages
												});
											}
										});

										// Link the data view to collection data template
										db.view('dataView').link('#dataView', '#dataViewTable', {
											$wrap: 'items',
											$wrapIn: wrapperDoc
										});
									});
									break;

								default:
							}
						}
					}
				});

				var bodyElem = $('body');

				// Handle pagination controls
				bodyElem.on('click', '.pageFirst', function (e) {
					e.stopPropagation();
					db.view('dataView').pageFirst();
				});

				bodyElem.on('click', '.pagePrev', function (e) {
					e.stopPropagation();
					db.view('dataView').pageScan(-1);
				});

				bodyElem.on('click', '.pageNext', function (e) {
					e.stopPropagation();
					db.view('dataView').pageScan(1);
				});

				bodyElem.on('click', '.pageLast', function (e) {
					e.stopPropagation();
					db.view('dataView').pageLast();
				});
			});
		} else {
			$('#noInstances').show();
		}
	});
};

$(document).ready(function () {
	// Get the forerunnerdb instance
	getCall("typeof ForerunnerDB !== 'undefined'", function (result, isException) {
		if (result) {
			refreshDatabaseTree();
		}
	});

	$('#refreshDatabaseTree').on('click', function () {
		refreshDatabaseTree();
	});
});