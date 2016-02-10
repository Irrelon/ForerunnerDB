var sharedObj = {};

suite('Serialiser', function (suite) {
	setup(function () {
		sharedObj.fdb = new ForerunnerDB();
		sharedObj.db = sharedObj.fdb.db('perf');
		sharedObj.coll = sharedObj.db.collection('test');
		sharedObj.jStringify = sharedObj.coll.jStringify;

		sharedObj.data = [{
			"name": "Internal Sensors",
			"alarm": 7,
			"_id": "21765aa41d95240",
			"deviceId": ["ZWayVDev_zway_43", "ZWayVDev_zway_24", "ZWayVDev_zway_25", "ZWayVDev_zway_23", "ZWayVDev_zway_4"],
			"activeDevice": [{
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}]
		}, {
			"name": "Transitional Sensors",
			"alarm": 0,
			"_id": "3a0b02e5da01480",
			"deviceId": ["ZWayVDev_zway_11"],
			"activeDevice": [{
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}]
		}, {
			"name": "External Sensors",
			"alarm": 0,
			"_id": "22e250805d87a80",
			"deviceId": ["ZWayVDev_zway_26", "ZWayVDev_zway_42", "ZWayVDev_zway_8", "ZWayVDev_zway_29", "ZWayVDev_zway_33", "ZWayVDev_zway_10", "ZWayVDev_zway_34", "ZWayVDev_zway_20", "ZWayVDev_zway_4"],
			"activeDevice": [{
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}]
		}, {
			"name": "Test Sensors",
			"alarm": 0,
			"_id": "4444",
			"deviceId": [],
			"activeDevice": [],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date("2016-02-10T15:50:19.300Z")
			}]
		}];

		sharedObj.jsextData = [{
			"name": "Internal Sensors",
			"alarm": 7,
			"_id": "21765aa41d95240",
			"deviceId": ["ZWayVDev_zway_43", "ZWayVDev_zway_24", "ZWayVDev_zway_25", "ZWayVDev_zway_23", "ZWayVDev_zway_4"],
			"activeDevice": [{
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}]
		}, {
			"name": "Transitional Sensors",
			"alarm": 0,
			"_id": "3a0b02e5da01480",
			"deviceId": ["ZWayVDev_zway_11"],
			"activeDevice": [{
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}]
		}, {
			"name": "External Sensors",
			"alarm": 0,
			"_id": "22e250805d87a80",
			"deviceId": ["ZWayVDev_zway_26", "ZWayVDev_zway_42", "ZWayVDev_zway_8", "ZWayVDev_zway_29", "ZWayVDev_zway_33", "ZWayVDev_zway_10", "ZWayVDev_zway_34", "ZWayVDev_zway_20", "ZWayVDev_zway_4"],
			"activeDevice": [{
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}]
		}, {
			"name": "Test Sensors",
			"alarm": 0,
			"_id": "4444",
			"deviceId": [],
			"activeDevice": [],
			"availableDevice": [{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			}, {
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			}, {
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			}, {
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			}, {
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": {
					"$date": "2016-02-10T14:16:58.095Z"
				}
			}]
		}];

		sharedObj.jsextStringData = '[{"name":"Internal Sensors","alarm":7,"_id":"21765aa41d95240","deviceId":["ZWayVDev_zway_43","ZWayVDev_zway_24","ZWayVDev_zway_25","ZWayVDev_zway_23","ZWayVDev_zway_4"],"activeDevice":[{"_id":"ZWayVDev_zway_43","pureId":"43","name":"Lobby Multisensor","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_24","pureId":"24","name":"Motion Sensor","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_25","pureId":"25","name":"Motion Sensor","location":{"_id":13,"title":"Second Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_23","pureId":"23","name":"Motion Sensor","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_4","pureId":"4","name":"Motion Sensor","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}}],"availableDevice":[{"_id":"LightScene_16","pureId":"16","name":"Front Room Back Right Power Switch"},{"_id":"LightScene_23","pureId":"23","name":"Front Room Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"LightScene_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_11","pureId":"11","name":"Front Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_23","pureId":"23","name":"Front Room Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_25","pureId":"25","name":"Second Floor Hallway Motion 1"},{"_id":"ZWayVDev_zway_Remote_26","pureId":"26","name":"Garage Main Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_29","pureId":"29","name":"Garage Personnel Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_42","pureId":"42","name":"Pantry Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_43","pureId":"43","name":"Lobby Multisensor"},{"_id":"ZWayVDev_zway_Remote_27","pureId":"27","name":"Bedroom 201 Air Purifier"},{"_id":"ZWayVDev_zway_Remote_4","pureId":"4","name":"Kitchen Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_28","pureId":"28","name":"Garage Power Switch 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_46","pureId":"46","name":"First Floor Hallway Light 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"BatteryPolling_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_8","pureId":"8","name":"Patio Door Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_10","pureId":"10","name":"Window 1 Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_11","pureId":"11","name":"Front Door Open","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_16","pureId":"16","name":"Fairy Lights","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_18","pureId":"18","name":"Siren","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_20","pureId":"20","name":"Window 3 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_26","pureId":"26","name":"Main Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_27","pureId":"27","name":"Air Purifier","location":{"_id":7,"title":"Bedroom 201"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_28","pureId":"28","name":"Flood Light","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_29","pureId":"29","name":"Personnel Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_33","pureId":"33","name":"Window 1 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_34","pureId":"34","name":"Window 2 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_37","pureId":"37","name":"Lobby Light","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_39","pureId":"39","name":"Siren","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_40","pureId":"40","name":"Front Door Lock","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_42","pureId":"42","name":"Pantry Door Open","location":{"_id":6,"title":"Pantry"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_44","pureId":"44","name":"Light 1","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_45","pureId":"45","name":"Light 2","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_46","pureId":"46","name":"Light 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_47","pureId":"47","name":"Light 2","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}}]},{"name":"Transitional Sensors","alarm":0,"_id":"3a0b02e5da01480","deviceId":["ZWayVDev_zway_11"],"activeDevice":[{"_id":"ZWayVDev_zway_11","pureId":"11","name":"Front Door Open","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}}],"availableDevice":[{"_id":"LightScene_16","pureId":"16","name":"Front Room Back Right Power Switch"},{"_id":"LightScene_23","pureId":"23","name":"Front Room Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"LightScene_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_11","pureId":"11","name":"Front Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_23","pureId":"23","name":"Front Room Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_25","pureId":"25","name":"Second Floor Hallway Motion 1"},{"_id":"ZWayVDev_zway_Remote_26","pureId":"26","name":"Garage Main Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_29","pureId":"29","name":"Garage Personnel Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_42","pureId":"42","name":"Pantry Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_43","pureId":"43","name":"Lobby Multisensor"},{"_id":"ZWayVDev_zway_Remote_27","pureId":"27","name":"Bedroom 201 Air Purifier"},{"_id":"ZWayVDev_zway_Remote_4","pureId":"4","name":"Kitchen Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_28","pureId":"28","name":"Garage Power Switch 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_46","pureId":"46","name":"First Floor Hallway Light 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"BatteryPolling_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_4","pureId":"4","name":"Motion Sensor","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_8","pureId":"8","name":"Patio Door Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_10","pureId":"10","name":"Window 1 Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_16","pureId":"16","name":"Fairy Lights","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_18","pureId":"18","name":"Siren","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_20","pureId":"20","name":"Window 3 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_23","pureId":"23","name":"Motion Sensor","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_24","pureId":"24","name":"Motion Sensor","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_25","pureId":"25","name":"Motion Sensor","location":{"_id":13,"title":"Second Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_26","pureId":"26","name":"Main Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_27","pureId":"27","name":"Air Purifier","location":{"_id":7,"title":"Bedroom 201"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_28","pureId":"28","name":"Flood Light","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_29","pureId":"29","name":"Personnel Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_33","pureId":"33","name":"Window 1 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_34","pureId":"34","name":"Window 2 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_37","pureId":"37","name":"Lobby Light","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_39","pureId":"39","name":"Siren","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_40","pureId":"40","name":"Front Door Lock","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_42","pureId":"42","name":"Pantry Door Open","location":{"_id":6,"title":"Pantry"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_43","pureId":"43","name":"Lobby Multisensor","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_44","pureId":"44","name":"Light 1","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_45","pureId":"45","name":"Light 2","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_46","pureId":"46","name":"Light 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_47","pureId":"47","name":"Light 2","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}}]},{"name":"External Sensors","alarm":0,"_id":"22e250805d87a80","deviceId":["ZWayVDev_zway_26","ZWayVDev_zway_42","ZWayVDev_zway_8","ZWayVDev_zway_29","ZWayVDev_zway_33","ZWayVDev_zway_10","ZWayVDev_zway_34","ZWayVDev_zway_20","ZWayVDev_zway_4"],"activeDevice":[{"_id":"ZWayVDev_zway_26","pureId":"26","name":"Main Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_42","pureId":"42","name":"Pantry Door Open","location":{"_id":6,"title":"Pantry"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_8","pureId":"8","name":"Patio Door Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_29","pureId":"29","name":"Personnel Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_33","pureId":"33","name":"Window 1 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_10","pureId":"10","name":"Window 1 Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_34","pureId":"34","name":"Window 2 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_20","pureId":"20","name":"Window 3 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_4","pureId":"4","name":"Motion Sensor","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}}],"availableDevice":[{"_id":"LightScene_16","pureId":"16","name":"Front Room Back Right Power Switch"},{"_id":"LightScene_23","pureId":"23","name":"Front Room Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"LightScene_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_11","pureId":"11","name":"Front Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_23","pureId":"23","name":"Front Room Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_25","pureId":"25","name":"Second Floor Hallway Motion 1"},{"_id":"ZWayVDev_zway_Remote_26","pureId":"26","name":"Garage Main Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_29","pureId":"29","name":"Garage Personnel Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_42","pureId":"42","name":"Pantry Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_43","pureId":"43","name":"Lobby Multisensor"},{"_id":"ZWayVDev_zway_Remote_27","pureId":"27","name":"Bedroom 201 Air Purifier"},{"_id":"ZWayVDev_zway_Remote_4","pureId":"4","name":"Kitchen Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_28","pureId":"28","name":"Garage Power Switch 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_46","pureId":"46","name":"First Floor Hallway Light 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"BatteryPolling_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_11","pureId":"11","name":"Front Door Open","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_16","pureId":"16","name":"Fairy Lights","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_18","pureId":"18","name":"Siren","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_23","pureId":"23","name":"Motion Sensor","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_24","pureId":"24","name":"Motion Sensor","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_25","pureId":"25","name":"Motion Sensor","location":{"_id":13,"title":"Second Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_27","pureId":"27","name":"Air Purifier","location":{"_id":7,"title":"Bedroom 201"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_28","pureId":"28","name":"Flood Light","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_37","pureId":"37","name":"Lobby Light","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_39","pureId":"39","name":"Siren","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_40","pureId":"40","name":"Front Door Lock","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_43","pureId":"43","name":"Lobby Multisensor","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_44","pureId":"44","name":"Light 1","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_45","pureId":"45","name":"Light 2","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_46","pureId":"46","name":"Light 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_47","pureId":"47","name":"Light 2","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}}]},{"name":"Test Sensors","alarm":0,"_id":"4444","deviceId":[],"activeDevice":[],"availableDevice":[{"_id":"LightScene_16","pureId":"16","name":"Front Room Back Right Power Switch"},{"_id":"LightScene_23","pureId":"23","name":"Front Room Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"LightScene_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_11","pureId":"11","name":"Front Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_24","pureId":"24","name":"First Floor Hallway Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_23","pureId":"23","name":"Front Room Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_25","pureId":"25","name":"Second Floor Hallway Motion 1"},{"_id":"ZWayVDev_zway_Remote_26","pureId":"26","name":"Garage Main Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_29","pureId":"29","name":"Garage Personnel Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_42","pureId":"42","name":"Pantry Door Open Sensor"},{"_id":"ZWayVDev_zway_Remote_43","pureId":"43","name":"Lobby Multisensor"},{"_id":"ZWayVDev_zway_Remote_27","pureId":"27","name":"Bedroom 201 Air Purifier"},{"_id":"ZWayVDev_zway_Remote_4","pureId":"4","name":"Kitchen Motion Sensor 1"},{"_id":"ZWayVDev_zway_Remote_28","pureId":"28","name":"Garage Power Switch 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_Remote_46","pureId":"46","name":"First Floor Hallway Light 1","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"BatteryPolling_8","pureId":"8","name":"Patio Door Open Sensor","createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_4","pureId":"4","name":"Motion Sensor","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_8","pureId":"8","name":"Patio Door Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_10","pureId":"10","name":"Window 1 Open","location":{"_id":3,"title":"Kitchen"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_11","pureId":"11","name":"Front Door Open","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_16","pureId":"16","name":"Fairy Lights","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_18","pureId":"18","name":"Siren","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_20","pureId":"20","name":"Window 3 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_23","pureId":"23","name":"Motion Sensor","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_24","pureId":"24","name":"Motion Sensor","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_25","pureId":"25","name":"Motion Sensor","location":{"_id":13,"title":"Second Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_26","pureId":"26","name":"Main Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_27","pureId":"27","name":"Air Purifier","location":{"_id":7,"title":"Bedroom 201"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_28","pureId":"28","name":"Flood Light","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_29","pureId":"29","name":"Personnel Door Open","location":{"_id":4,"title":"Garage"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_33","pureId":"33","name":"Window 1 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_34","pureId":"34","name":"Window 2 Open","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_37","pureId":"37","name":"Lobby Light","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_39","pureId":"39","name":"Siren","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_40","pureId":"40","name":"Front Door Lock","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_42","pureId":"42","name":"Pantry Door Open","location":{"_id":6,"title":"Pantry"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_43","pureId":"43","name":"Lobby Multisensor","location":{"_id":1,"title":"Lobby"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_44","pureId":"44","name":"Light 1","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_45","pureId":"45","name":"Light 2","location":{"_id":2,"title":"Front Room"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_46","pureId":"46","name":"Light 1","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}},{"_id":"ZWayVDev_zway_47","pureId":"47","name":"Light 2","location":{"_id":5,"title":"First Floor Hallway"},"createdTs":{"$date":"2016-02-10T15:50:19.300Z"}}]}]';

		sharedObj.replacer = function replacer (key, value) {
			if (this[key] instanceof Date) {
				return {"$date": value};
			}

			return value;
		};

		sharedObj.JSTRSTR = sharedObj.jStringify(sharedObj.data);
		sharedObj.JSONSTR = JSON.stringify(sharedObj.data, sharedObj.replacer);

		//console.log(sharedObj.JSONSTR);

		console.log('jStringify output validated:', sharedObj.jsextStringData === sharedObj.JSTRSTR);
		console.log('JSON.stringify with replacer output validated:', sharedObj.jsextStringData === sharedObj.JSONSTR);
	});

	bench('jStringify Traverse Object Tree', function () {
		sharedObj.JSTRSTR = sharedObj.jStringify(sharedObj.data);
	});

	bench('JSON.stringify() Baseline - No Extended Object Support', function () {
		sharedObj.JSONNOEXTSTR = JSON.stringify(sharedObj.data);
	});

	bench('JSON.stringify() with Replacer Method', function () {
		sharedObj.JSONSTR = JSON.stringify(sharedObj.data, sharedObj.replacer);
	});
});

suite('Serialiser Via toJSON Date modification', function (suite) {
	setup(function () {
		/*Date.prototype.toJSON = function () {
			return {"$date": this.toISOString()};
		};*/

		sharedObj.replacer = function replacer (key, value) {
			if (value instanceof Date) {
				value = {
					"$date": value.toISOString()
				};
			}

			return value;
		};

		sharedObj.JSONDATESTR = JSON.stringify(sharedObj.data);

		//console.log(sharedObj.JSONDATESTR);

		console.log('jStringify output validated:', sharedObj.jsextStringData === sharedObj.JSTRSTR);
		console.log('JSON.stringify with native Date modifier output validated:', sharedObj.jsextStringData === sharedObj.JSONDATESTR);
	});

	bench('JSON.stringify() with Replacer Method', function () {
		sharedObj.JSONDATESTR = JSON.stringify(sharedObj.data);
	});
});