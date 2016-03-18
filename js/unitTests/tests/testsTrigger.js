QUnit.module('Triggers');
QUnit.test("Trigger before insert", function() {
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

QUnit.test("Trigger before insert cancel operation", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		// Update the object to indicate the trigger fired
		newData.triggered = true;

		// Return false to cancel operation from the trigger
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

QUnit.test("Trigger after insert", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_AFTER, triggerMethod);

	coll.insert({
		_id: 1,
		someData: true
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(triggered, true, "Insert trigger fired");

	base.dbDown();
});

QUnit.test("Trigger before update cancel operation", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered,
		result;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;

		// Return false to cancel operation from the trigger
		return false;
	};

	coll.addTrigger('availability', db.TYPE_UPDATE, db.PHASE_BEFORE, triggerMethod);

	var obj = {
		_id: 1,
		triggered: false
	};

	coll.insert(obj);

	coll.update({_id: 1}, {someData: true});

	result = coll.find();

	strictEqual(triggered, true, "Trigger fired");
	strictEqual(result[0].someData, undefined, "Update was cancelled via trigger");

	base.dbDown();
});

QUnit.test("Trigger after update", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_UPDATE, db.PHASE_AFTER, triggerMethod);

	coll.insert({
		_id: 1,
		someData: true
	});

	coll.update({_id: 1}, {someData: true});

	strictEqual(triggered, true, "Update trigger fired");

	base.dbDown();
});

QUnit.test("Trigger after update cannot modify internal document", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered,
		result;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;
		newData.myVal = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_AFTER, triggerMethod);

	coll.insert({
		_id: 1,
		someData: true
	});

	result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].myVal, undefined, "Insert doesn't have flag");

	coll.update({
		_id: 1
	}, {
		someData: false
	});

	result = coll.find();

	strictEqual(result[0].someData, false, "Update was successful");
	strictEqual(triggered, true, "Trigger was fired");
	strictEqual(result[0].myVal, undefined, "Trigger was not able to update internal document");

	base.dbDown();
});

QUnit.test("Trigger alters data before insert and update", function() {
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

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);
	coll.addTrigger('availability', db.TYPE_UPDATE, db.PHASE_BEFORE, triggerMethod);

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

QUnit.test("Trigger before remove", function() {
	base.dbUp();

	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered,
		result;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_REMOVE, db.PHASE_BEFORE, triggerMethod);

	coll.insert({
		_id: 1,
		triggered: false
	});

	result = coll.find();

	strictEqual(result.length, 1, "Insert");

	coll.remove({
		_id: 1
	});

	result = coll.find();

	strictEqual(result.length, 0, "Remove");
	strictEqual(triggered, true, "Remove trigger fired");

	base.dbDown();
});

QUnit.test("Trigger before remove cancel operation", function() {
	base.dbUp();

	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered,
		result;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;

		// Return false to cancel operation from the trigger
		return false;
	};

	coll.addTrigger('availability', db.TYPE_REMOVE, db.PHASE_BEFORE, triggerMethod);

	var obj = {
		_id: 1,
		triggered: false
	};

	coll.insert(obj);

	result = coll.find();

	strictEqual(result.length, 1, "Insert");

	coll.remove({
		_id: 1
	});

	result = coll.find();

	strictEqual(triggered, true, "Trigger fired");
	strictEqual(result.length, 1, "Didn't remove");

	base.dbDown();
});

QUnit.test("Trigger after remove", function() {
	base.dbUp();

	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered,
		result;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_REMOVE, db.PHASE_AFTER, triggerMethod);

	coll.insert({
		_id: 1,
		someData: true
	});

	result = coll.find();

	strictEqual(result.length, 1, "Insert");

	coll.remove({
		_id: 1
	});

	result = coll.find();

	strictEqual(result.length, 0, "Remove");
	strictEqual(triggered, true, "Remove trigger fired");

	base.dbDown();
});

QUnit.test("Disable trigger by id only", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		newData.triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);
	coll.disableTrigger('availability');

	coll.insert({
		_id: 1,
		triggered: false
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].triggered, false, "Insert trigger did not fire");

	base.dbDown();
});

QUnit.test("Disable trigger by id, type and phase", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		newData.triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);
	coll.disableTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE);

	coll.insert({
		_id: 1,
		triggered: false
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].triggered, false, "Insert trigger did not fire");

	base.dbDown();
});

QUnit.test("Disable trigger by type", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		newData.triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);
	coll.disableTrigger(db.TYPE_INSERT);

	coll.insert({
		_id: 1,
		triggered: false
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].triggered, false, "Insert trigger did not fire");

	base.dbDown();
});

QUnit.test("Disable trigger by type and phase", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		newData.triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);
	coll.disableTrigger(db.TYPE_INSERT, db.PHASE_BEFORE);

	coll.insert({
		_id: 1,
		triggered: false
	});

	var result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(result[0].triggered, false, "Insert trigger did not fire");

	base.dbDown();
});

QUnit.test("Disable and then re-enable trigger by id only", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod,
		triggered = false,
		result;

	triggerMethod = function (operation, oldData, newData) {
		triggered = true;
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);

	coll.insert({
		_id: 1
	});

	result = coll.find();

	strictEqual(result.length, 1, "Insert");
	strictEqual(triggered, true, "Insert trigger did fire");

	triggered = false;

	coll.disableTrigger('availability');

	coll.insert({
		_id: 2
	});

	result = coll.find();

	strictEqual(result.length, 2, "Insert");
	strictEqual(triggered, false, "Insert trigger did not fire");

	coll.enableTrigger('availability');

	coll.insert({
		_id: 3
	});

	result = coll.find();

	strictEqual(result.length, 3, "Insert");
	strictEqual(triggered, true, "Insert trigger did fire");

	base.dbDown();
});

QUnit.test("Trigger with recursive behaviour will not cause infinite loop", function() {
	base.dbUp();
	var coll = db.collection('transformColl').truncate(),
		triggerMethod;

	triggerMethod = function (operation, oldData, newData) {
		newData.triggered = true;

		coll.insert({
			triggered: false
		});
	};

	coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);

	coll.insert({
		_id: 1,
		triggered: false
	});

	var result = coll.find();

	strictEqual(result.length, 2, "Document count correct");
	strictEqual(result[0].triggered, true, "First insert trigger fired");
	strictEqual(result[1].triggered, false, "Second insert trigger fired");

	base.dbDown();
});

ForerunnerDB.moduleLoaded('View', function () {
	QUnit.test("Trigger before insert cancel operation doesn't travel further down chain reactor", function () {
		base.dbUp();

		var coll = db.collection('transformColl').truncate(),
			view = db.view('transformColl'),
			triggerMethod,
			result;

		view.from(coll);

		triggerMethod = function (operation, oldData, newData) {
			// Update the object to indicate the trigger fired
			newData.triggered = true;

			// Return false to cancel operation from the trigger
			return false;
		};

		coll.addTrigger('availability', db.TYPE_INSERT, db.PHASE_BEFORE, triggerMethod);

		var obj = {
			_id: 1,
			triggered: false
		};

		coll.insert(obj);

		result = coll.find();

		strictEqual(obj.triggered, true, "Trigger fired");
		strictEqual(result.length, 0, "Didn't insert into collection");

		result = view.find();

		strictEqual(result.length, 0, "Didn't insert into view");

		base.dbDown();
	});

	QUnit.test("Trigger before update cancel operation doesn't travel further down chain reactor", function () {
		base.dbUp();

		var coll = db.collection('transformColl').truncate(),
			view = db.view('transformColl'),
			triggerMethod,
			triggered = false,
			result,
			obj;

		view.from(coll);

		obj = {
			_id: 1,
			triggered: false
		};

		coll.insert(obj);

		triggerMethod = function (operation, oldData, newData) {
			// Update the object to indicate the trigger fired
			triggered = true;

			// Return false to cancel operation from the trigger
			return false;
		};

		coll.addTrigger('availability', db.TYPE_UPDATE, db.PHASE_BEFORE, triggerMethod);

		coll.update({
			_id: 1
		}, {
			updated: true
		});

		result = coll.find();

		strictEqual(triggered, true, "Trigger fired");
		strictEqual(result[0].updated, undefined, "Didn't update into collection");

		result = view.find();

		strictEqual(result[0].updated, undefined, "Didn't update into view");

		base.dbDown();
	});

	QUnit.test("Trigger before remove cancel operation doesn't travel further down chain reactor", function () {
		base.dbUp();

		var coll = db.collection('transformColl').truncate(),
			view = db.view('transformColl'),
			triggerMethod,
			triggered = false,
			result,
			obj;

		view.from(coll);

		obj = {
			_id: 1,
			triggered: false
		};

		coll.insert(obj);

		triggerMethod = function (operation, oldData, newData) {
			// Update the object to indicate the trigger fired
			triggered = true;

			// Return false to cancel operation from the trigger
			return false;
		};

		coll.addTrigger('availability', db.TYPE_REMOVE, db.PHASE_BEFORE, triggerMethod);

		coll.remove({
			_id: 1
		});

		result = coll.find();

		strictEqual(triggered, true, "Trigger fired");
		strictEqual(result.length, 1, "Didn't remove from collection");

		result = view.find();

		strictEqual(result.length, 1, "Didn't remove from view");

		base.dbDown();
	});
});

