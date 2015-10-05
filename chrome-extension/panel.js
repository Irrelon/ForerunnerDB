"use strict";

// TODO: The tree is too complex using a third party tool to output...
// TODO: How about we use ForerunnerDB and binding to automatically build
// TODO: and maintain udpates to the tree? That way we can have in-line
// TODO: bound updates to the tree and then just run a refresh every 5 seconds
// TODO: and any changes will then get reflected as the underlying data
// TODO: is updated! - This hasn't been started yet.

(function () {
	var self = this,
		fdb = new ForerunnerDB(),
		db = fdb.db('fdbChromeExtension');

	self._expanded = {
		'Databases': true
	};

	// Setup the main db data view collection
	db.collection('dataView').setData([]);

	var getCall = function (js, callback) {
		chrome.devtools.inspectedWindow.eval(js, callback);
	};

	var typeIcon = function (module) {
		switch (module) {
			case 'collection':
				return 'glyphicon glyphicon-th-list';

			case 'view':
				return 'glyphicon glyphicon-log-out';

			case 'overview':
				return 'glyphicon glyphicon-filter';

			case 'grid':
				return 'glyphicon glyphicon-th';

			case 'document':
				return 'glyphicon glyphicon-file';

			case 'collectionGroup':
				return 'glyphicon glyphicon-book';
		}
	};

	var expandNodes = function (tree, node) {
		var i;

		if (self._expanded[node.nodeId]) {
			tree.setExpandedState(node, true, {});
		} else {
			tree.setExpandedState(node, false, {});
		}

		// Loop node's child nodes
		tree.render();

		if (node.nodes && node.nodes.length) {
			for (i = 0; i < node.nodes.length; i++) {
				expandNodes(tree, node.nodes[i]);
			}
		}
	};

	var nodeChildren = function (node, callback) {
		var entityItem,
			entityNodes,
			dbNode,
			tree,
			tmpNode,
			postProcess,
			totalCount,
			processCount,
			i, j, processPostNodeChildRequest;

		tree = $('#tree').data('treeview').tree;

		if (node.fdb) {
			switch (node.fdb.type) {
				case 'database':
					// Loop the children of this db object
					if (node.fdb.children) {
						entityNodes = [];
						postProcess = [];
						processCount = 0;
						totalCount = 0;
						debugger;
						for (j = 0; j < node.fdb.children.length; j++) {
							entityItem = node.fdb.children[j];

							tmpNode = {
								parentId: node.nodeId,
								fdb: {
									id: entityItem.module,
									type: 'module',
									moduleData: entityItem
								},
								nodeId: db.objectId(entityItem.module),
								text: entityItem.moduleName + ' (' + entityItem.count + ')',
								icon: typeIcon(entityItem.module),
								nodes: []
							};

							entityNodes.push(tmpNode);

							if (self._expanded[tmpNode.nodeId]) {
								// Add node to post-process array
								postProcess.push(tmpNode);
								totalCount++;
							}
						}

						if (postProcess.length) {
							processPostNodeChildRequest = function (tmpNode, callback) {
								nodeChildren(tmpNode, function (err, tmpNodeData) {
									tmpNode.nodes = tmpNodeData;
									processCount++;

									if (processCount === totalCount) {
										callback(false, entityNodes);
									}
								});
							};

							while ((tmpNode = postProcess.shift())) {
								processPostNodeChildRequest(tmpNode, callback);
							}
						} else {
							callback(false, entityNodes);
						}
					}
					break;

				case 'module':
					switch (node.fdb.moduleData.module) {
						default:
							dbNode = tree.getNode(node.parentId);

							if (!dbNode || dbNode.fdb.type !== 'database') {
								debugger;
							}

							(function (dbNode, node, callback) {
								if (!dbNode) {
									debugger;
								}
								// Get collections for this DB
								getCall("ForerunnerDB.instances()[0].db('" + dbNode.fdb.id + "')." + node.fdb.moduleData.module + "s()", function (result, isException) {
									var moduleNodes = [];
									debugger;
									for (i = 0; i < result.length; i++) {
										moduleNodes.push({
											parentId: node.nodeId,
											fdb: {
												type: node.fdb.moduleData.module,
												id: result[i].name,
												linked: result[i].linked
											},
											nodeId: db.objectId(result[i].name),
											text: result[i].name + ' (' + result[i].count + ')',
											icon: typeIcon(node.fdb.moduleData.module)
										});
									}

									callback(false, moduleNodes);
								});
							})(dbNode, node, callback);
							break;
					}
					break;
			}
		}
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
						postProcess = [],
						tree,
						node,
						finishLoad,
						tmpNode,
						totalCount = 0,
						processCount = 0,
						i, processPostNodeChildRequest;

					finishLoad = function (dbNodes) {
						$('#tree').treeview({
							data: [{
								nodeId: 'Databases',
								text: "Databases",
								nodes: dbNodes
							}],

							onNodeCollapsed: function (event, data) {
								// Record tree expanded data
								self._expanded[data.nodeId] = false;
								console.log(self._expanded);
							},

							onNodeExpanded: function (event, data) {
								// Record tree expanded data
								self._expanded[data.nodeId] = true;
								console.log(self._expanded);

								// Get child node data
								tree = $('#tree').data('treeview').tree;
								node = tree.getNode(data.nodeId);
								nodeChildren(node, function (err, data) {
									node.nodes = data;
									tree.setInitialStates(node, 0);
									tree.render();
								});
							},

							onNodeSelected: function (event, data) {
								var moduleNode,
									dbNode;

								tree = $('#tree').data('treeview').tree;
								node = tree.getNode(data.nodeId);

								if (node.fdb) {
									switch (node.fdb.type) {
										case 'collection':
											moduleNode = tree.getNode(node.parentId);
											dbNode = tree.getNode(moduleNode.parentId);

											// Grab the collection data and display in the right pane
											getCall("ForerunnerDB.instances()[0].db('" + dbNode.fdb.id + "')." + moduleNode.fdb.moduleData.module + "('" + node.fdb.id + "').find()", function (result, isException) {
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

										case 'view':
										case 'document':
										case 'overview':
										case 'collectionGroup':
											moduleNode = tree.getNode(node.parentId);
											dbNode = tree.getNode(moduleNode.parentId);

											// Grab the view data and display in the right pane
											getCall("ForerunnerDB.instances()[0].db('" + dbNode.fdb.id + "')." + moduleNode.fdb.moduleData.module + "('" + node.fdb.id + "').find()", function (result, isException) {
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
											tree.setExpandedState(node, true, {});
											break;
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

						// Traverse the tree and open previously expanded
						// items
						tree = $('#tree').data('treeview').tree;
						expandNodes(tree, tree.getNode('Databases'));
					};

					for (i = 0; i < result.length; i++) {
						tmpNode = {
							fdb: {
								type: 'database',
								id: result[i].name,
								children: result[i].children
							},
							nodeId: db.objectId(result[i].name),
							text: result[i].name,
							icon: 'glyphicon glyphicon-align-justify',
							nodes: []
						};

						dbNodes.push(tmpNode);

						if (self._expanded[tmpNode.nodeId]) {
							// Add node to post-process array
							postProcess.push(tmpNode);
							totalCount++;
						}
					}

					if (postProcess.length) {
						processPostNodeChildRequest = function (tmpNode) {
							nodeChildren(tmpNode, function (err, tmpNodeData) {
								tmpNode.nodes = tmpNodeData;
								processCount++;

								if (processCount === totalCount) {
									finishLoad(dbNodes);
								}
							});
						};

						while ((tmpNode = postProcess.shift())) {
							processPostNodeChildRequest(tmpNode);
						}
					} else {
						finishLoad(dbNodes);
					}
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

		$('#refreshDatabaseTree').on('click', function (e) {
			e.stopPropagation();
			refreshDatabaseTree();
		});
	});
}());