"use strict";

var getCall = function (js, callback) {
	chrome.devtools.inspectedWindow.eval(js, callback);
};

var refreshDatabaseTree = function () {
	getCall('fdb.databases()', function (result, isException) {
		console.log('databases', result);

		var dbNodes = [],
			i;

		for (i = 0; i < result.length; i++) {
			dbNodes.push({
				fdb: {
					type: 'database',
					id: result[i].name
				},
				text: result[i].name + ' (' + result[i].collectionCount + ')'
			});
		}

		$('#tree').treeview({
			data: [{
				text: "Databases",
				nodes: dbNodes
			}],

			onNodeSelected: function (event, data) {
				if (data.fdb) {
					switch (data.fdb.type) {
						case 'database':
							// Get collections for this DB
							getCall("fdb.db('" + data.fdb.id + "').collections()", function (result, isException) {
								var collectionNodes = [],
									tree = $('#tree').data('treeview').tree,
									node,
									i;

								for (i = 0; i < result.length; i++) {
									collectionNodes.push({
										fdb: {
											type: 'collection',
											id: result[i].name
										},
										text: result[i].name + ' (' + result[i].count + ')'
									});
								}

								node = tree.getNode(data.nodeId);
								node.nodes = collectionNodes;

								tree.setInitialStates(node, 0);

								node.state.expanded = true;

								tree.render();
							});
							break;

						default:
					}
				}
			}
		});
	});
};

$(document).ready(function () {
	// Get the forerunnerdb instance
	getCall("typeof window.fdb !== 'undefined'", function (result, isException) {
		if (result) {
			refreshDatabaseTree();
		}
	});

	$('#refreshDatabaseTree').on('click', function () {
		refreshDatabaseTree();
	});
});