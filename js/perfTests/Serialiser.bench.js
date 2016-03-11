var sharedObj = {},
	fdb;

suite('Serialiser', function (suite) {
	setup(function () {
		fdb = new ForerunnerDB();
		sharedObj.db = fdb.db('perf');
		sharedObj.coll = sharedObj.db.collection('test');
		sharedObj.jStringify = sharedObj.coll.jStringify;
		sharedObj.jParse = sharedObj.coll.jParse;
		sharedObj.dt = fdb.make(new Date("2016-02-10T15:50:19.300Z"));
		sharedObj.rei = fdb.make(new RegExp(".*?", "i"));
		sharedObj.re = fdb.make(new RegExp(".*?"));

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
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": sharedObj.dt
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": sharedObj.dt
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": sharedObj.dt
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
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
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": sharedObj.dt
			}, {
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}, {
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": sharedObj.dt
			}]
		}];

		sharedObj.jsextStringData = JSON.stringify(sharedObj.data);
		sharedObj.jsextData = JSON.parse(sharedObj.jsextStringData);

		sharedObj.JSTRSTR = sharedObj.jStringify(sharedObj.data);
		sharedObj.JSONDATESTR = JSON.stringify(sharedObj.data);

		console.log('jStringify output validated:', sharedObj.jsextStringData === sharedObj.JSTRSTR);
		console.log('JSON.stringify with Date modifier output validated:', sharedObj.jsextStringData === sharedObj.JSONDATESTR);
	});

	bench('Baseline - JSON.stringify() No Extended Object Support', function () {
		sharedObj.JSONNOEXTSTR = JSON.stringify(sharedObj.data);
	});

	bench('Current Implementation - JSON.stringify() with Custom toJSON Method', function () {
		sharedObj.JSTRSTR = sharedObj.jStringify(sharedObj.data);
	});
});

suite('Parser', function (suite) {
	sharedObj.JSONREVIVED = sharedObj.jParse(sharedObj.JSONDATESTR);

	console.log(sharedObj.JSONREVIVED);

	bench('Baseline - JSON.parse() No Extended Object Support', function () {
		JSON.parse(sharedObj.JSONDATESTR);
	});

	bench('Current Implementation - jParse with Reviver Method', function () {
		sharedObj.jParse(sharedObj.jsextStringData);
	});
});