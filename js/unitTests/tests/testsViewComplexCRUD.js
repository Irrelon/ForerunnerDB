QUnit.module('Views Complex CRUD');
ForerunnerDB.moduleLoaded('View', function () {
	QUnit.asyncTest('Highly complex chaining scenario: View chain reactor updates from the source data', function () {
		base.dbUp();
		expect(12);

		var alarm,
			alarmView,
			zone,
			device,
			deviceView,
			state,
			zoneView, results;

		zoneView = db.view('zoneView')
			.from('zone')
			.query({}, {
				$join: [{
					'device': {
						_id: '$$.deviceId',
						'$as': 'activeDevice',
						'$require': false,
						'$multi': true
					}
				}, {
					'device': {
						"$where": {
							"$query": {
								"_id": {
									"$nin": "$$.deviceId"
								}
							}
						},
						'$as': 'availableDevice',
						'$require': false,
						'$multi': true
					}
				}]
			});

		alarmView = db.view('alarmView')
			.from('alarm')
			.query({}, {
				$join: [{
					'zone': {
						'_id': '$$.zoneList.zoneId',
						'$as': 'zone',
						'$require': false,
						'$multi': true
					},
					'deviceView': {
						'_id': '$$.switchList.switchId',
						'$sourceType': 'view',
						'$as': 'switch',
						'$require': false,
						'$multi': true
					}
				}]
			});

		deviceView = db.view('deviceView')
			.from('device')
			.query({}, {
				$join: [{
					'state': {
						'deviceId': '$$._id',
						'$as': 'state',
						'$require': false,
						'$multi': true
					},
					'zone': {
						'deviceId': '$$._id',
						'$as': 'zone',
						'$require': false,
						'$multi': true
					}
				}]
			});

		alarm = db.collection('alarm');

		alarm.insert([{
			"name": "Main House",
			"active": false,
			"triggered": false,
			"countdown": false,
			"countdownValue": 0,
			"_id": "2d71d65f2bc8d20",
			"zoneList": [
				{
					"zoneId": "22e250805d87a80",
					"timeout": 0
				},
				{
					"zoneId": "3a0b02e5da01480",
					"timeout": 20
				}
			],
			"switchList": [
				{
					"switchId": "ZWayVDev_zway_18"
				},
				{
					"switchId": "ZWayVDev_zway_39"
				}
			]
		}]);

		zone = db.collection('zone');

		zone.insert([
			{
				"name": "Internal Sensors",
				"alarm": 7,
				"_id": "21765aa41d95240",
				"deviceId": [
					"ZWayVDev_zway_43",
					"ZWayVDev_zway_24",
					"ZWayVDev_zway_25",
					"ZWayVDev_zway_23",
					"ZWayVDev_zway_4"
				]
			},
			{
				"name": "Transitional Sensors",
				"alarm": 0,
				"_id": "3a0b02e5da01480",
				"deviceId": [
					"ZWayVDev_zway_11"
				]
			},
			{
				"name": "External Sensors",
				"alarm": 0,
				"_id": "22e250805d87a80",
				"deviceId": [
					"ZWayVDev_zway_26",
					"ZWayVDev_zway_42",
					"ZWayVDev_zway_8",
					"ZWayVDev_zway_29",
					"ZWayVDev_zway_33",
					"ZWayVDev_zway_10",
					"ZWayVDev_zway_34",
					"ZWayVDev_zway_20",
					"ZWayVDev_zway_4"
				]
			}
		]);

		device = db.collection('device');

		device.insert([
			{
				"_id": "LightScene_16",
				"pureId": "16",
				"name": "Front Room Back Right Power Switch"
			},
			{
				"_id": "LightScene_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date()
			},
			{
				"_id": "LightScene_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_Remote_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_Remote_11",
				"pureId": "11",
				"name": "Front Door Open Sensor"
			},
			{
				"_id": "ZWayVDev_zway_Remote_24",
				"pureId": "24",
				"name": "First Floor Hallway Motion Sensor 1"
			},
			{
				"_id": "ZWayVDev_zway_Remote_23",
				"pureId": "23",
				"name": "Front Room Motion Sensor 1"
			},
			{
				"_id": "ZWayVDev_zway_Remote_25",
				"pureId": "25",
				"name": "Second Floor Hallway Motion 1"
			},
			{
				"_id": "ZWayVDev_zway_Remote_26",
				"pureId": "26",
				"name": "Garage Main Door Open Sensor"
			},
			{
				"_id": "ZWayVDev_zway_Remote_29",
				"pureId": "29",
				"name": "Garage Personnel Door Open Sensor"
			},
			{
				"_id": "ZWayVDev_zway_Remote_42",
				"pureId": "42",
				"name": "Pantry Door Open Sensor"
			},
			{
				"_id": "ZWayVDev_zway_Remote_43",
				"pureId": "43",
				"name": "Lobby Multisensor"
			},
			{
				"_id": "ZWayVDev_zway_Remote_27",
				"pureId": "27",
				"name": "Bedroom 201 Air Purifier"
			},
			{
				"_id": "ZWayVDev_zway_Remote_4",
				"pureId": "4",
				"name": "Kitchen Motion Sensor 1"
			},
			{
				"_id": "ZWayVDev_zway_Remote_28",
				"pureId": "28",
				"name": "Garage Power Switch 1",
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_Remote_46",
				"pureId": "46",
				"name": "First Floor Hallway Light 1",
				"createdTs": new Date()
			},
			{
				"_id": "BatteryPolling_8",
				"pureId": "8",
				"name": "Patio Door Open Sensor",
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_4",
				"pureId": "4",
				"name": "Motion Sensor",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_8",
				"pureId": "8",
				"name": "Patio Door Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_10",
				"pureId": "10",
				"name": "Window 1 Open",
				"location": {
					"_id": 3,
					"title": "Kitchen"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_11",
				"pureId": "11",
				"name": "Front Door Open",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_16",
				"pureId": "16",
				"name": "Fairy Lights",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_18",
				"pureId": "18",
				"name": "Siren",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_20",
				"pureId": "20",
				"name": "Window 3 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_23",
				"pureId": "23",
				"name": "Motion Sensor",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_24",
				"pureId": "24",
				"name": "Motion Sensor",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_25",
				"pureId": "25",
				"name": "Motion Sensor",
				"location": {
					"_id": 13,
					"title": "Second Floor Hallway"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_26",
				"pureId": "26",
				"name": "Main Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_27",
				"pureId": "27",
				"name": "Air Purifier",
				"location": {
					"_id": 7,
					"title": "Bedroom 201"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_28",
				"pureId": "28",
				"name": "Flood Light",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_29",
				"pureId": "29",
				"name": "Personnel Door Open",
				"location": {
					"_id": 4,
					"title": "Garage"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_33",
				"pureId": "33",
				"name": "Window 1 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_34",
				"pureId": "34",
				"name": "Window 2 Open",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_37",
				"pureId": "37",
				"name": "Lobby Light",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_39",
				"pureId": "39",
				"name": "Siren",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_40",
				"pureId": "40",
				"name": "Front Door Lock",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_42",
				"pureId": "42",
				"name": "Pantry Door Open",
				"location": {
					"_id": 6,
					"title": "Pantry"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_43",
				"pureId": "43",
				"name": "Lobby Multisensor",
				"location": {
					"_id": 1,
					"title": "Lobby"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_44",
				"pureId": "44",
				"name": "Light 1",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_45",
				"pureId": "45",
				"name": "Light 2",
				"location": {
					"_id": 2,
					"title": "Front Room"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_46",
				"pureId": "46",
				"name": "Light 1",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date()
			},
			{
				"_id": "ZWayVDev_zway_47",
				"pureId": "47",
				"name": "Light 2",
				"location": {
					"_id": 5,
					"title": "First Floor Hallway"
				},
				"createdTs": new Date()
			}
		]);

		state = db.collection('state');

		state.insert([
			{
				"_id": "LightScene_16_",
				"functionId": "",
				"deviceId": "LightScene_16",
				"name": "Air Purifiers On",
				"functionName": "toggleButton",
				"val": "on",
				"bool": true
			},
			{
				"_id": "LightScene_23_",
				"functionId": "",
				"deviceId": "LightScene_23",
				"name": "First Floor Hallway Lights On",
				"functionName": "toggleButton",
				"val": "on",
				"bool": true
			},
			{
				"_id": "LightScene_24_",
				"functionId": "",
				"deviceId": "LightScene_24",
				"name": "First Floor Hallway Lights Off",
				"functionName": "toggleButton",
				"val": "on",
				"bool": true
			},
			{
				"_id": "ZWayVDev_zway_Remote_8_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_8",
				"name": "Everspring (8.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_11_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_11",
				"name": "Everspring (11.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_24_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_24",
				"name": "Vision Security (24.0.0) Button",
				"functionName": "switchControl",
				"val": "on",
				"bool": true
			},
			{
				"_id": "ZWayVDev_zway_Remote_23_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_23",
				"name": "Vision Security (23.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_25_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_25",
				"name": "Vision Security (25.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_26_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_26",
				"name": "Everspring (26.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_29_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_29",
				"name": "Everspring (29.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_42_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_42",
				"name": "Vision Security (42.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_43_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_43",
				"name": " (43.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_27_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_27",
				"name": " (27.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_4_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_4",
				"name": "Vision Security (4.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_28_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_28",
				"name": " (28.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_Remote_46_0-0-B",
				"functionId": "0-0-B",
				"deviceId": "ZWayVDev_zway_Remote_46",
				"name": " (46.0.0) Button",
				"functionName": "switchControl",
				"val": "off",
				"bool": false
			},
			{
				"_id": "BatteryPolling_8_",
				"functionId": "",
				"deviceId": "BatteryPolling_8",
				"name": "Battery digest 8",
				"functionName": "battery",
				"val": 20,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_4_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_4",
				"name": "Kitchen Motion Sensor 1",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_4_0-49-1",
				"functionId": "0-49-1",
				"deviceId": "ZWayVDev_zway_4",
				"name": "Kitchen Temperature 1",
				"functionName": "sensorMultilevel",
				"val": 22,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_4_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_4",
				"name": "Vision Security Battery (4.0)",
				"functionName": "battery",
				"val": 100,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_8_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_8",
				"name": "Patio Door Open Sensor",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_8_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_8",
				"name": "Everspring Battery (8.0)",
				"functionName": "battery",
				"val": 70,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_10_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_10",
				"name": "Kitchen Window Open Sensor 1",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_10_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_10",
				"name": "Everspring Battery (10.0)",
				"functionName": "battery",
				"val": 50,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_11_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_11",
				"name": "Front Door Open Sensor",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_11_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_11",
				"name": "Everspring Battery (11.0)",
				"functionName": "battery",
				"val": 60,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_16_0-37",
				"functionId": "0-37",
				"deviceId": "ZWayVDev_zway_16",
				"name": "Front Room Back Right Power Switch",
				"functionName": "switchBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_18_0-37",
				"functionId": "0-37",
				"deviceId": "ZWayVDev_zway_18",
				"name": "Garage Siren",
				"functionName": "switchBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_18_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_18",
				"name": "Aeon Labs Battery (18.0)",
				"functionName": "battery",
				"val": 90,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_20_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_20",
				"name": "Front Room Window Open Sensor 3",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_20_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_20",
				"name": "Everspring Battery (20.0)",
				"functionName": "battery",
				"val": 70,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_23_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_23",
				"name": "Front Room Motion Sensor 1",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_23_0-49-1",
				"functionId": "0-49-1",
				"deviceId": "ZWayVDev_zway_23",
				"name": "Front Room Temperature 1",
				"functionName": "sensorMultilevel",
				"val": 20,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_23_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_23",
				"name": "Vision Security Battery (23.0)",
				"functionName": "battery",
				"val": 100,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_24_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_24",
				"name": "First Floor Hallway Motion Sensor 1",
				"functionName": "sensorBinary",
				"val": "on",
				"bool": true
			},
			{
				"_id": "ZWayVDev_zway_24_0-49-1",
				"functionId": "0-49-1",
				"deviceId": "ZWayVDev_zway_24",
				"name": "First Floor Hallway Temperature 1",
				"functionName": "sensorMultilevel",
				"val": 21,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_24_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_24",
				"name": "Vision Security Battery (24.0)",
				"functionName": "battery",
				"val": 100,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_25_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_25",
				"name": "Second Floor Hallway Motion 1",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_25_0-49-1",
				"functionId": "0-49-1",
				"deviceId": "ZWayVDev_zway_25",
				"name": "Second Floor Hallway Temperature 1",
				"functionName": "sensorMultilevel",
				"val": 22,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_25_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_25",
				"name": "Vision Security Battery (25.0)",
				"functionName": "battery",
				"val": 100,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_26_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_26",
				"name": "Garage Main Door Open Sensor",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_26_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_26",
				"name": "Everspring Battery (26.0)",
				"functionName": "battery",
				"val": 20,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_27_0-37",
				"functionId": "0-37",
				"deviceId": "ZWayVDev_zway_27",
				"name": "Bedroom 201 Air Purifier",
				"functionName": "switchBinary",
				"val": "on",
				"bool": true
			},
			{
				"_id": "ZWayVDev_zway_28_0-37",
				"functionId": "0-37",
				"deviceId": "ZWayVDev_zway_28",
				"name": "Garage Power Switch 1",
				"functionName": "switchBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_29_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_29",
				"name": "Garage Personnel Door Open Sensor",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_29_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_29",
				"name": "Everspring Battery (29.0)",
				"functionName": "battery",
				"val": 50,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_33_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_33",
				"name": "Front Room Window Open Sensor 1",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_33_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_33",
				"name": "Everspring Battery (33.0)",
				"functionName": "battery",
				"val": 70,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_34_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_34",
				"name": "Front Room Window Open Sensor 2",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_34_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_34",
				"name": "Everspring Battery (34.0)",
				"functionName": "battery",
				"val": 60,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_37_0-38",
				"functionId": "0-38",
				"deviceId": "ZWayVDev_zway_37",
				"name": "Lobby Light Dimmer",
				"functionName": "switchMultilevel",
				"val": 0,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_37_0-51-rgb",
				"functionId": "0-51-rgb",
				"deviceId": "ZWayVDev_zway_37",
				"name": "Lobby Light Color",
				"functionName": "switchRGBW",
				"val": "on",
				"bool": true
			},
			{
				"_id": "ZWayVDev_zway_37_0-51-0",
				"functionId": "0-51-0",
				"deviceId": "ZWayVDev_zway_37",
				"name": "Lobby Light Soft White",
				"functionName": "switchMultilevel",
				"val": 99,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_37_0-51-1",
				"functionId": "0-51-1",
				"deviceId": "ZWayVDev_zway_37",
				"name": "Lobby Light Cold White",
				"functionName": "switchMultilevel",
				"val": 0,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_39_0-37",
				"functionId": "0-37",
				"deviceId": "ZWayVDev_zway_39",
				"name": "Lobby Siren",
				"functionName": "switchBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_40_0-98",
				"functionId": "0-98",
				"deviceId": "ZWayVDev_zway_40",
				"name": "Yale Door Lock (40.0)",
				"functionName": "doorlock",
				"val": "close",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_40_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_40",
				"name": "Yale Battery (40.0)",
				"functionName": "battery",
				"val": 90,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_42_0-113-6-Door-A",
				"functionId": "0-113-6-Door-A",
				"deviceId": "ZWayVDev_zway_42",
				"name": "Pantry Door Open Sensor",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_42_0-113-7-3-A",
				"functionId": "0-113-7-3-A",
				"deviceId": "ZWayVDev_zway_42",
				"name": "Pantry Door Open Sensor Tamper Alarm",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_42_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_42",
				"name": "Vision Security Battery (42.0)",
				"functionName": "battery",
				"val": 100,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-48-1",
				"functionId": "0-48-1",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Lobby Multisensor Motion 2",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-49-1",
				"functionId": "0-49-1",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Lobby Multisensor Temperature",
				"functionName": "sensorMultilevel",
				"val": 23.4,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-49-3",
				"functionId": "0-49-3",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Lobby Multisensor Luminiscence",
				"functionName": "sensorMultilevel",
				"val": 31,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-49-5",
				"functionId": "0-49-5",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Lobby Multisensor Humidity",
				"functionName": "sensorMultilevel",
				"val": 43,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-49-27",
				"functionId": "0-49-27",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Lobby Multisensor Ultraviolet",
				"functionName": "sensorMultilevel",
				"val": 0,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-113-7-3-A",
				"functionId": "0-113-7-3-A",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Lobby Multisensor Tamper",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-113-7-8-A",
				"functionId": "0-113-7-8-A",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Lobby Multisensor Motion 1",
				"functionName": "sensorBinary",
				"val": "off",
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_43_0-128",
				"functionId": "0-128",
				"deviceId": "ZWayVDev_zway_43",
				"name": "Aeon Labs Battery (43.0)",
				"functionName": "battery",
				"val": 100,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_44_0-38",
				"functionId": "0-38",
				"deviceId": "ZWayVDev_zway_44",
				"name": "Dimmer (44.0)",
				"functionName": "switchMultilevel",
				"val": 99,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_45_0-38",
				"functionId": "0-38",
				"deviceId": "ZWayVDev_zway_45",
				"name": "Dimmer (45.0)",
				"functionName": "switchMultilevel",
				"val": 99,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_46_0-38",
				"functionId": "0-38",
				"deviceId": "ZWayVDev_zway_46",
				"name": "Dimmer (46.0)",
				"functionName": "switchMultilevel",
				"val": 99,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_47_0-38",
				"functionId": "0-38",
				"deviceId": "ZWayVDev_zway_47",
				"name": "Dimmer (47.0)",
				"functionName": "switchMultilevel",
				"val": 99,
				"bool": false
			},
			{
				"_id": "ZWayVDev_zway_42_0-113-7-254-A",
				"functionId": "0-113-7-254-A",
				"deviceId": "ZWayVDev_zway_42",
				"name": "Vision Security Burglar Alarm (42.0.113.7.254)",
				"functionName": "sensorBinary",
				"val": "on",
				"bool": true
			}
		]);

		results = deviceView.findById("ZWayVDev_zway_4");

		ok(results.state && results.state.length === 3, 'Device state array correct length');
		ok(results.zone && results.zone.length === 2, 'Device zone array correct length');

		results = zoneView.findById("4444");

		ok(results === undefined, 'Zone does not exist');

		zone.insert({
			"name": "Test Sensors",
			"alarm": 0,
			"_id": "4444",
			"deviceId": []
		});

		results = zoneView.findById("4444");

		ok(results !== undefined, 'Zone exists');
		ok(results.activeDevice && results.activeDevice.length === 0, 'Zone activeDevice array correct length');
		ok(results.availableDevice && results.availableDevice.length === 42, 'Zone availableDevice array correct length');

		zone.insert({
			"name": "Test Sensors",
			"alarm": 0,
			"_id": "5555",
			"deviceId": [
				"ZWayVDev_zway_26"
			]
		});

		results = zoneView.findById("5555");

		ok(results !== undefined, 'Zone exists');
		ok(results.activeDevice && results.activeDevice.length === 1, 'Zone activeDevice array correct length');
		ok(results.availableDevice && results.availableDevice.length === 41, 'Zone availableDevice array correct length');

		zone.update({
			"_id": "4444"
		}, {
			$push: {
				"deviceId": "ZWayVDev_zway_26"
			}
		});

		results = zoneView.findById("4444");

		ok(results !== undefined, 'Zone exists');
		ok(results.activeDevice && results.activeDevice.length === 1, 'Zone activeDevice array correct length');
		ok(results.availableDevice && results.availableDevice.length === 41, 'Zone availableDevice array correct length');

		start();
	});
});