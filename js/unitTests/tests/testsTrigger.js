QUnit.module('Triggers');
QUnit.test("Collection.addTrigger() :: Trigger before insert", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		newData.triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);

	coll.insert({
		_id: 1,
		triggered: false
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].triggered, true, "Insert trigger fired");

	base.dbDown();
});

QUnit.test("Collection.addTrigger() :: Trigger before insert cancel insert", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		// Update the object to indicate the trigger fired
		newData.triggered = true;

		// Return false to cancel insert operation from the trigger
		return false;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);

	var obj = {
		_id: 1,
		triggered: false
	};

	coll.insert(obj);

	var result = coll.find();

	strictEqual(obj.triggered, true, "Trigger fired");
	strictEqual(result.length, 0, "Didn't Insert");

	base.dbDown();
});

QUnit.test("Collection.addTrigger() :: Trigger after insert", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		newData.triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_AFTER, triggerMethod);

	coll.insert({
		_id: 1,
		triggered: false
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].triggered, true, "Insert trigger fired");

	base.dbDown();
});

QUnit.test("Collection.addTrigger() :: Trigger alters data after insert and update", function() {
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