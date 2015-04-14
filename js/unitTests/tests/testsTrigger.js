test("Triggers - Collection.addTrigger() :: Trigger alters data after insert and update", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		var slotsIndex,
			slotsArr = newData.slots,
			slotsCount,
			slotItem,
			subjectsIndex,
			subjectsArr,
			subjectsCount,
			subjectItem;

		if (slotsArr && slotsArr.length) {
			slotsCount = slotsArr.length;

			// Loop all the slots
			for (slotsIndex = 0; slotsIndex < slotsCount; slotsIndex++) {
				// Get the current slot
				slotItem = slotsArr[slotsIndex];
				subjectsArr = slotItem.subjects;

				/*update({
					slots: {

					}
				})*/
				slotItem.anyAvailable = false;

				if (subjectsArr && subjectsArr.length) {
					subjectsCount = subjectsArr.length;

					// Loop each subject in the current slot
					for (subjectsIndex = 0; subjectsIndex < subjectsCount; subjectsIndex++) {
						subjectItem = subjectsArr[subjectsIndex];

						if (subjectItem && subjectItem.available) {
							slotItem.anyAvailable = true;
							break;
						}
					}
				}
			}
		}
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_AFTER, triggerMethod);
	coll.addTrigger('availability', db.TYPE_UPDATE, db.PHASE_AFTER, triggerMethod);
debugger;
	coll.insert({
		_id: 1,
		slots: [{
			_id: 1,
			subjects: [{
				_id: 1,
				available: 0
			}, {
				_id: 2,
				available: 0
			}, {
				_id: 3,
				available: 0
			}, {
				_id: 4,
				available: 0
			}]
		}]
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].slots[0].anyAvailable, false, "Insert trigger fired");

	coll.update({
		_id: 1,
		slots: {
			_id: 1,
			subjects: {
				_id: 1
			}
		}
	}, {
		'slots.$': {
			'subjects.$': {
				available: 1
			}
		}
	});

	result = coll.find();

	strictEqual(result[0].slots[0].anyAvailable, true, "Update trigger fired");

	base.dbDown();
});