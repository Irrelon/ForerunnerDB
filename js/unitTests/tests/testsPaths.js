QUnit.module('Paths');
QUnit.test("Path.aggregate :: Test aggregation with complex array and object structure", function() {
	base.dbUp();
	
	var path = new ForerunnerDB.shared.modules.Path(),
		result;
	
	result = path.aggregate([{
		rangeName: "Cars",
		products: [{
			_id: 1,
			attributes: [{
				name: 'Brand',
				value: 'Ford'
			}, {
				name: 'Make',
				value: 'Mustang'
			}, {
				name: 'Fuel',
				value: 'Petrol'
			}]
		}, {
			_id: 2,
			attributes: [{
				name: 'Brand',
				value: 'Tesla'
			}, {
				name: 'Make',
				value: 'Model S'
			}, {
				name: 'Fuel',
				value: 'Electricity'
			}]
		}]
	}, {
		rangeName: "Vans",
		products: [{
			_id: 1,
			attributes: [{
				name: 'Brand',
				value: 'Ford'
			}, {
				name: 'Make',
				value: 'Pickup'
			}, {
				name: 'Fuel',
				value: 'Diesel'
			}]
		}, {
			_id: 2,
			attributes: [{
				name: 'Brand',
				value: 'Tesla'
			}, {
				name: 'Make',
				value: 'Semi'
			}, {
				name: 'Fuel',
				value: 'Electricity'
			}]
		}]
	}], 'products.attributes.name');
	
	strictEqual(result.length, 12, 'The number of aggregated results is correct');
	
	base.dbDown();
});