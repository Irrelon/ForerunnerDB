var fdb = new ForerunnerDB(),
	db = fdb.db('geospatialMap'),
	coll = db.collection('cities'),
	sharedGeoHashSolver,
	map;

function initMap() {
	var result1,
		result2,
		centerPoint = [51.50722, -0.12750],
		result1Distance = 10,
		result2Distance = 1000,
		display1 = true,
		display2 = true;

	sharedGeoHashSolver = new GeoHash();

	initMapLabel();

	map = new google.maps.Map(document.getElementById('map'), {
		center: {
			lat: centerPoint[0],
			lng: centerPoint[1]
		},
		zoom: 5
	});

	// Load the data
	$.getJSON('../unitTests/data/cities.json', function (cityData) {
		coll.ensureIndex({
			lngLat: 1
		}, {
			name: 'cityLatLngIndex',
			type: '2d'
		});

		coll.insert(cityData, function () {
			var index = coll.index('cityLatLngIndex'),
				search1Hashes,
				search2Hashes,
				myLatlng,
				marker,
				i,
				geoHash,
				hashLatLng, rectangle, mapLabel, item, cityCircle, hashArr;

			// Query index by distance
			// $near queries are sorted by distance from center point by default
			result1 = coll.find({
				lngLat: {
					$near: {
						$point: centerPoint,
						$maxDistance: result1Distance,
						$distanceUnits: 'miles',
						$distanceField: 'dist',
						$geoHashField: 'geoHash'
					}
				}
			});

			result2 = coll.find({
				lngLat: {
					$near: {
						$point: centerPoint,
						$maxDistance: result2Distance,
						$distanceUnits: 'miles',
						$distanceField: 'dist',
						$geoHashField: 'geoHash'
					}
				}
			});

			console.log(result1);
			console.log(result2);

			search1Hashes = result1.__fdbOp._data.index2d.near.hashArea;
			search2Hashes = result2.__fdbOp._data.index2d.near.hashArea;

			if (display2) {
				for (i = 0; i < result2.length; i++) {
					item = result2[i];
					myLatlng = new google.maps.LatLng(item.lngLat[0], item.lngLat[1]);

					marker = new google.maps.Marker({
						position: myLatlng,
						label: item.name,
						title: item.name
					}).setMap(map);

					mapLabel = new MapLabel({
						text: item.name,
						position: myLatlng,
						map: map,
						fontSize: 16,
						align: 'center',
						fontColor: '#00ff00'
					});
				}
			}

			if (display1) {
				for (i = 0; i < result1.length; i++) {
					item = result1[i];
					myLatlng = new google.maps.LatLng(item.lngLat[0], item.lngLat[1]);

					marker = new google.maps.Marker({
						position: myLatlng,
						label: item.name,
						title: item.name
					}).setMap(map);

					mapLabel = new MapLabel({
						text: item.name,
						position: myLatlng,
						map: map,
						fontSize: 16,
						align: 'center',
						fontColor: '#ff0000'
					});
				}
			}

			if (display2) {
				for (i = 0; i < search2Hashes.length; i++) {
					geoHash = search2Hashes[i];
					hashLatLng = sharedGeoHashSolver.decode(geoHash);
					//console.log(hashLatLng.lat, hashLatLng.lng);
					myLatlng = new google.maps.LatLng(hashLatLng.lat[2], hashLatLng.lng[2]);

					mapLabel = new MapLabel({
						text: geoHash + ' (100)',
						position: myLatlng,
						map: map,
						fontSize: 20,
						align: 'center'
					});

					rectangle = new google.maps.Rectangle({
						strokeColor: '#00FF00',
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: '#00FF00',
						fillOpacity: 0.25,
						map: map,
						bounds: {
							north: hashLatLng.lat[0],
							south: hashLatLng.lat[1],
							west: hashLatLng.lng[0],
							east: hashLatLng.lng[1]
						}
					});
				}
			}

			if (display1) {
				for (i = 0; i < search1Hashes.length; i++) {
					geoHash = search1Hashes[i];
					hashLatLng = sharedGeoHashSolver.decode(geoHash);
					//console.log(hashLatLng.lat, hashLatLng.lng);
					myLatlng = new google.maps.LatLng(hashLatLng.lat[2], hashLatLng.lng[2]);

					mapLabel = new MapLabel({
						text: geoHash + ' (50)',
						position: myLatlng,
						map: map,
						fontSize: 20,
						align: 'center'
					});

					rectangle = new google.maps.Rectangle({
						strokeColor: '#FF0000',
						strokeOpacity: 0.8,
						strokeWeight: 2,
						fillColor: '#FF0000',
						fillOpacity: 0.25,
						map: map,
						bounds: {
							north: hashLatLng.lat[0],
							south: hashLatLng.lat[1],
							west: hashLatLng.lng[0],
							east: hashLatLng.lng[1]
						}
					});
				}
			}

			if (display2) {
				new google.maps.Circle({
					strokeColor: '#00FF00',
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: '#00FF00',
					fillOpacity: 0.35,
					map: map,
					center: new google.maps.LatLng(centerPoint[0], centerPoint[1]),
					radius: (result2Distance * 1000) * 1.609344
				});

				new google.maps.Marker({
					position: new google.maps.LatLng(centerPoint[0], centerPoint[1]),
					label: '#',
					title: '#'
				}).setMap(map);
			}

			if (display1) {
				new google.maps.Circle({
					strokeColor: '#FF0000',
					strokeOpacity: 0.8,
					strokeWeight: 2,
					fillColor: '#FF0000',
					fillOpacity: 0.35,
					map: map,
					center: new google.maps.LatLng(centerPoint[0], centerPoint[1]),
					radius: result1Distance * 1.609344 * 1000
				});

				new google.maps.Marker({
					position: new google.maps.LatLng(centerPoint[0], centerPoint[1]),
					label: '#',
					title: '#'
				}).setMap(map);
			}

			extent = sharedGeoHashSolver.calculateExtentByRadius(centerPoint, result2Distance * 1.609344, 3);
			new google.maps.Polyline({
				path: [
					new google.maps.LatLng(extent.lat[0], extent.lng[0]),
					new google.maps.LatLng(extent.lat[1], extent.lng[1])
				],
				geodesic: true,
				strokeColor: '#0000FF',
				strokeOpacity: 1.0,
				strokeWeight: 4
			}).setMap(map);

			new google.maps.Polyline({
				path: [
					new google.maps.LatLng(extent.lat[0], extent.lng[1]),
					new google.maps.LatLng(extent.lat[1], extent.lng[0])
				],
				geodesic: true,
				strokeColor: '#0000FF',
				strokeOpacity: 1.0,
				strokeWeight: 4
			}).setMap(map);
			//console.log(hashArr);

			/*new google.maps.Rectangle({
				strokeColor: '#0000FF',
				strokeOpacity: 0.8,
				strokeWeight: 2,
				fillColor: '#0000FF',
				fillOpacity: 0.25,
				map: map,
				bounds: {
					north: hashLatLng.lat[0],
					west: hashLatLng.lng[0],

					south: hashLatLng.lat[1],
					east: hashLatLng.lng[1]
				}
			});*/
		});
	});
}