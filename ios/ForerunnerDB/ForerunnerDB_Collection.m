//
//  ForerunnerDB_Collection.m
//  ForerunnerDB
//
//  Created by Rob Evans on 22/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import "ForerunnerDB_Collection.h"
#import "NSObject+NSObject_Type.h"

@implementation ForerunnerDB_Collection

- (id)init {
    self = [super init];
    if (self) {
        // Set default primary key to _id
        [self primaryKey:@"_id"];
        self._data = [[NSMutableArray alloc] init];
		self._groups = [[NSMutableArray alloc] init];
		self._linked = 0;
		self._deferQueue = @{
			@"insert": [[NSMutableArray alloc] init],
			@"update": [[NSMutableArray alloc] init],
			@"remove": [[NSMutableArray alloc] init],
			@"upsert": [[NSMutableArray alloc] init]
		};
		self._deferQueue = @{
			@"insert": @100,
			@"update": @100,
			@"remove": @100,
			@"upsert": @100
		};
		self._deferTime = @{
			@"insert": @1,
			@"update": @1,
			@"remove": @1,
			@"upsert": @1
		};
    }
    
    return self;
}

- (id)initWithName:(NSString *)name {
	self = [self init];
	self._name = name;
	
	return self;
}

- (NSString *)name {
	return self._name;
}

- (void)name:(NSString *)val {
	self._name = val;
}

- (id)decouple:(id)data {
	if ([data isKindOfClass:[NSArray class]]) {
		return [[NSMutableArray alloc] initWithArray:data copyItems:YES];
	}
	
	if ([data isKindOfClass:[NSDictionary class]]) {
		return [[NSMutableDictionary alloc] initWithDictionary:data copyItems:YES];
	}
	
	return nil;
}

- (NSDictionary *)createIndex:(NSString *)indexName withFields:(NSDictionary *)fields andOptions:(NSDictionary *)options {
    // Check if the index already exists
    if ([self._index objectForKey:indexName] == nil) {
        // Add the index to the index dictionary
        [self._index setObject:@{@"fields":fields, @"options":options} forKey:indexName];
        
        // Check if we should fill the index immediately
        if (![[options objectForKey:@"sparse"] isEqual: @true]) {
            // Fill the index
            [self _fillIndex:indexName];
        }
        
        return @{@"err": @false};
    } else {
        return @{@"err": @"Index already exists!"};
    }
}

- (void)_fillIndex:(NSString *)indexName {
    // Get the index object
    //NSDictionary *indexObj = [self._index objectForKey:indexName];
    
    // Loop the index fields and
}

- (NSString *)primaryKey {
    return self._primaryKey;
};

- (void)primaryKey:(NSString *)fieldName {
    // Check if existing primary key is in place
    
    // Set new primary key
    self._primaryKey = fieldName;
    
    // Setup an unique index contraint on the primary key field
    [self createIndex:fieldName withFields:@{fieldName: @1} andOptions:@{@"unique": @true}];
}

- (NSMutableArray *)setData:(id)arrayOrObject {
    if ([arrayOrObject isKindOfClass:[NSDictionary class]]) {
        // Passed data is an object, assign inside a new array
        self._data = [[NSMutableArray alloc] init];
        [self._data addObject:[arrayOrObject mutableCopy]];
    }
    
    if ([arrayOrObject isKindOfClass:[NSArray class]]) {
        // Passed data is an array, assign data directly
        self._data = [arrayOrObject mutableCopy];
    }

    return self._data;
};

- (NSMutableArray *)insert:(id)arrayOrObject {
    NSMutableArray *insertedItems = [[NSMutableArray alloc] init];
    
    if ([arrayOrObject isKindOfClass:[NSDictionary class]]) {
        // Passed data is an object, assign inside the array
        [self._data addObject:[arrayOrObject mutableCopy]];
        [insertedItems addObject:[arrayOrObject mutableCopy]];
    }
    
    if ([arrayOrObject isKindOfClass:[NSArray class]]) {
        // Passed data is an array, assign data one by one
        for (int index = 0; index < [arrayOrObject count]; index++) {
            [self._data addObject:[[arrayOrObject objectAtIndex:index] mutableCopy]];
            [insertedItems addObject:[[arrayOrObject objectAtIndex:index] mutableCopy]];
        }
    }
	
	NSMutableDictionary *result = [[NSMutableDictionary alloc] init];
	[result setObject:insertedItems forKey:@"inserted"];
    NSLog(@"Insert count %lu", (unsigned long)[insertedItems count]);
    if ([insertedItems count] > 0) {
        [self _onInsert:result];
    }

    return insertedItems;
};

- (NSMutableArray *)insert:(id)arrayOrObject atIndex:(NSUInteger)index {
    NSMutableArray *insertedItems = [[NSMutableArray alloc] init];
    
    if ([arrayOrObject isKindOfClass:[NSDictionary class]]) {
        // Passed data is an object, assign inside the array
        [self._data insertObject:[arrayOrObject mutableCopy] atIndex:index];
        [insertedItems addObject:[arrayOrObject mutableCopy]];
    }
    
    if ([arrayOrObject isKindOfClass:[NSArray class]]) {
        // Passed data is an array, assign data one by one
        for (int arrIndex = 0; arrIndex < [arrayOrObject count]; arrIndex++) {
            [self._data insertObject:[[arrayOrObject objectAtIndex:arrIndex] mutableCopy] atIndex:index + arrIndex];
            [insertedItems addObject:[[arrayOrObject objectAtIndex:arrIndex] mutableCopy]];
        }
    }
	
	NSMutableDictionary *result = [[NSMutableDictionary alloc] init];
	[result setObject:insertedItems forKey:@"inserted"];
    NSLog(@"Insert count %lu", (unsigned long)[insertedItems count]);
    if ([insertedItems count] > 0) {
        [self _onInsert:result];
    }
	
    return insertedItems;
};

- (NSMutableArray *)find {
    return [self._data mutableCopy];
};

- (NSMutableArray *)find:(id)query {
    if (query == nil) {
        return [self._data mutableCopy];
    } else {
        NSMutableArray *result = [[NSMutableArray alloc] init];
        NSMutableDictionary *doc;
        
        // Loop data and find matching documents
        for (NSInteger index = 0; index < [self count]; index++) {
            doc = [self._data objectAtIndex:index];
            
            if ([[self _match:doc withQuery:query andOperator:@"and"] isEqual:@YES]) {
                [result addObject:[doc mutableCopy]];
            }
        }
        
        return result;
    }
};

- (NSMutableArray *)find:(id)query withOptions:(NSDictionary *)options{
    if (query == nil) {
        if ([[options objectForKey:@"decouple"] isEqual: @NO]) {
            return self._data;
        } else {
            return [self._data mutableCopy];
        }
    } else {
        NSMutableArray *result = [[NSMutableArray alloc] init];
        NSMutableDictionary *doc;
        
        // Loop data and find matching documents
        for (NSInteger index = 0; index < [self count]; index++) {
            doc = [self._data objectAtIndex:index];
            
            if ([[self _match:doc withQuery:query andOperator:@"and"] isEqual:@YES]) {
                if ([[options objectForKey:@"decouple"] isEqual: @NO]) {
                    [result addObject:doc];
                } else {
                    [result addObject:[doc mutableCopy]];
                }
            }
        }
        
        return result;
    }
};

- (NSNumber *)_match:(id)source withQuery:(id)test andOperator:(NSString *)opToApply {
    NSString *sourceType = [source typeName];
    NSString *testType = [test typeName];
    NSNumber *matchedAll = @YES;
    NSNumber *operation = @NO;
    NSNumber *recurseVal = @NO;
    id sourceKeyVal;
    id testKeyVal;
    id i;
    
    // Check if comparison data are both strings or both numbers
    //NSLog(@"TYPES: %@ %@", sourceType, testType);
    if (([sourceType isEqual: @"string"] || [sourceType isEqual: @"number"]) && ([testType isEqual: @"string"] || [testType isEqual: @"number"])) {
        // The source and test data are flat types that do not require recursive
        // searches so just compare them and return the result
        if (![source isEqual:test]) {
            matchedAll = @NO;
        }
    } else {
        if ([testType isEqualToString:@"object"]) {
            //NSLog(@"Scannng data");
            // Scan keys in test
            for (i in test) {
                //NSLog(@"Scannng key: %@", i);
                // Reset operation flag
                operation = @NO;
                
                // Check if the property starts with a dollar
                if ([[i typeName] isEqualToString:@"string"] && [[i substringToIndex:1] isEqualToString:@"$"]) {
                    // Check for commands
                    if ([i isEqualToString:@"$gt"]) {
                        // Greater than
                        if (source > [test objectForKey:i]) {
                            
                        }
                    }
                }
                
                // Check for regex
                
                // If no operation was done...
                if ([operation isEqual:@NO]) {
                    // Check if our query is an object
                    testKeyVal = [test valueFromKey:i];
                    
                    if ([testKeyVal isTypeName:@"object"]) {
                        // Because test[i] is an object, source must also be an object
                        
                        // Check if our source data we are checking the test query
                        // against is an object or an array
                        sourceKeyVal = [source valueFromKey:i];
                        
                        if (![sourceKeyVal isTypeName:@"undefined"]) {
                            if ([sourceKeyVal isTypeName:@"array"] && ![testKeyVal isTypeName:@"array"]) {
                                // The source data is an array so check each item
                                // until a match is found
                                recurseVal = @NO;
                                
                                for (NSInteger tmpIndex = 0; tmpIndex < [sourceKeyVal count]; tmpIndex++) {
                                    recurseVal = [self _match:[sourceKeyVal valueFromKey:[NSNumber numberWithInteger:tmpIndex]] withQuery:testKeyVal andOperator:opToApply];
                                    
                                    if (recurseVal) {
                                        // One of the array items matched the query
                                        // so we can include this item in the results
                                        // so break now
                                        break;
                                    }
                                }
                                
                                if (recurseVal) {
                                    if ([opToApply isEqualToString:@"or"]) {
                                        return @YES;
                                    }
                                }
                            } else if (![sourceKeyVal isTypeName:@"array"] && [testKeyVal isTypeName:@"array"]) {
                                // The test[i] data is an array and the source[i] data
                                // is not so check each item in the test[i] data to see
                                // if the source item matches on of them. This is
                                // effectively an $in search
                                recurseVal = @NO;
                                
                                for (NSInteger tmpIndex = 0; tmpIndex < [testKeyVal count]; tmpIndex++) {
                                    recurseVal = [self _match:sourceKeyVal withQuery:[testKeyVal valueFromKey:[NSNumber numberWithInteger:tmpIndex]] andOperator:opToApply];
                                    
                                    if (recurseVal) {
                                        // One of the array items matched the query so we can include this item in the results, so break now
                                        break;
                                    }
                                }
                                
                                if (recurseVal) {
                                    if ([opToApply isEqualToString:@"or"]) {
                                        return @YES;
                                    }
                                } else {
                                    matchedAll = @NO;
                                }
                            } else if ([sourceKeyVal isEqualToString:@"object"]) {
                                // Recurse down the object tree
                                recurseVal = [self _match:sourceKeyVal withQuery:testKeyVal andOperator:opToApply];
                                
                                if (recurseVal) {
                                    if ([opToApply isEqualToString:@"or"]) {
                                        return @YES;
                                    }
                                } else {
                                    matchedAll = @NO;
                                }
                            } else {
                                recurseVal = [self _match:nil withQuery:testKeyVal andOperator:opToApply];
                                
                                if (recurseVal) {
                                    if ([opToApply isEqualToString:@"or"]) {
                                        return @YES;
                                    }
                                } else {
                                    matchedAll = @NO;
                                }
                            }
                        } else {
                            // First check if the test match is an $exists
                            if ([testKeyVal objectForKey:@"exists"] != nil) {
                                // Push the item through another match recurse
                                recurseVal = [self _match:nil withQuery:testKeyVal andOperator:opToApply];
                                
                                if (recurseVal) {
                                    if ([opToApply isEqualToString:@"or"]) {
                                        return @YES;
                                    }
                                } else {
                                    matchedAll = @NO;
                                }
                            } else {
                                matchedAll = @NO;
                            }
                        }
                    } else {
                        // Check if the prop matches our test value
                        if (source != nil) {
                            sourceKeyVal = [source valueFromKey:i];
                            
                            if ([sourceKeyVal isEqual:testKeyVal]) {
                                if ([opToApply isEqualToString:@"or"]) {
                                    return @YES;
                                }
                            } else {
                                matchedAll = @NO;
                            }
                        } else {
                            matchedAll = @NO;
                        }
                    }
                }
                
                if ([opToApply isEqualToString:@"and"] && !matchedAll) {
                    return @NO;
                }
            }
        } else if ([testType isEqualToString:@"array"]) {
            NSLog(@"SCANNING ARRAY");
        }
    }
    
    return matchedAll;
}

- (NSMutableDictionary *)update:(id)query withData:(id)data {
    NSMutableArray *matchingDocs = [[NSMutableArray alloc] init];
    NSMutableArray *updatedDocs = [[NSMutableArray alloc] init];
    NSMutableDictionary *result = [[NSMutableDictionary alloc] init];
    NSMutableDictionary *doc = [[NSMutableDictionary alloc] init];
    
    matchingDocs = [self find:query withOptions:@{@"decouple": @NO}];
    
    if ([matchingDocs count]) {
        for (NSInteger index = 0; index < [matchingDocs count]; index++) {
            // Get document
            doc = [matchingDocs objectAtIndex:index];
            
            // Update the document
            if ([self _updateObject:doc withData:data andQuery:query]) {
                // Since the update method returned true (updated)
                // let's add it to the updated documents array
                [updatedDocs addObject:[doc mutableCopy]];
            }
        }
    }
    
    [result setObject:updatedDocs forKey:@"updated"];
    NSLog(@"Update count %lu", (unsigned long)[updatedDocs count]);
    if ([updatedDocs count] > 0) {
        [self _onUpdate:result];
    }
    
    return result;
}

- (NSNumber *)_updateObject:(id)doc withData:(id)update andQuery:(id)query {
    NSNumber *updated = @NO;
    NSNumber *recurseUpdated = @NO;
    NSNumber *operation;
    NSString *sourceKeyValType;
    NSString *updateType = [update typeName];
    id sourceKeyVal;
    id updateKeyVal;
    NSInteger index;
    id key;
    id k;
    
    if ([updateType isEqualToString:@"array"]) {
        // Loop indexes
        for (index = 0; index < [update count]; index++) {
            updateKeyVal = [update objectAtIndex:index];
            
            // Reset operation flag
            operation = @NO;
        }
    } else if ([updateType isEqualToString:@"object"]) {
        // Loop property key names
        for (key in update) {
            updateKeyVal = [update objectForKey:key];
            
            // Reset operation flag
            operation = @NO;
            
            // Check if key has dollar operation marker
            if ([[key substringToIndex:1] isEqualToString:@"$"]) {
                // Check for an operation command
                if ([operation isEqual:@NO] && [key isEqualToString:@"$inc"]) {
                    operation = @YES;
                    
                    // Do an increment operation
                    for (k in updateKeyVal) {
                        if ([[[doc objectForKey:k] typeName] isEqualToString:@"number"]) {
                            int currentVal = [[doc objectForKey:k] intValue];
                            int incVal = [[updateKeyVal objectForKey:k] intValue];
                            NSNumber *newVal = [[NSNumber alloc] initWithInt:(currentVal + incVal)];
                            
                            [doc setValue:newVal forKey:k];
                            updated = @YES;
                        } else {
                            // Error - cannot increment non-number field
                            NSLog(@"Error, cannot increment non-number field: %@", k);
                        }
                    }
                }
                
                if ([operation isEqual:@NO] && [key isEqualToString:@"$push"]) {
                    operation = @YES;
                    
                    // Do a push operation
                    for (k in updateKeyVal) {
                        if ([[[doc objectForKey:k] typeName] isEqualToString:@"array"]) {
                            NSMutableArray *currentArr = [doc objectForKey:k];
                            [currentArr addObject:[updateKeyVal objectForKey:k]];
                            
                            updated = @YES;
                        } else {
                            NSLog(@"Cannot push to a key that is not an array! (%@)", k);
                        }
                    }
                }
                
                if ([operation isEqual:@NO] && [key isEqualToString:@"$pull"]) {
                    operation = @YES;
                    
                    // Do a pull operation
                    for (k in updateKeyVal) {
                        if ([[[doc objectForKey:k] typeName] isEqualToString:@"array"]) {
                            NSMutableArray *docKeyArr = [doc objectForKey:k];
                            NSMutableArray *tmpArray;
                            
                            // Find all matching documents
                            for (index = 0; index < [[doc objectForKey:k] count]; index++) {
                                if ([[self _match:[docKeyArr objectAtIndex:index] withQuery:query andOperator:@"and"] isEqual:@YES]) {
                                    [tmpArray addObject:[[NSNumber alloc] initWithInteger:index]];
                                }
                            }
                            
                            // Now loop array of doc indexes and pull each one
                            // from the doc array
                            index = [tmpArray count];
                            while (index--) {
                                [docKeyArr removeObjectAtIndex:index];
                                updated = @YES;
                            }
                        } else {
                            NSLog(@"Cannot pull from a key that is not an array! (%@)", k);
                        }
                    }
                }
            }
            
            // TODO: Implement positional array check here
            
            if ([operation isEqual:@NO]) {
                // Check if the doc key val is an object
                sourceKeyVal = [doc objectForKey:key];
                sourceKeyValType = [sourceKeyVal typeName];
                
                // Check for type object
                if ([sourceKeyValType isEqualToString:@"object"]) {
                    // The doc key is an object so traverse the update further
                    recurseUpdated = [self _updateObject:sourceKeyVal withData:updateKeyVal andQuery:query];
                    
                    if ([recurseUpdated isEqual:@YES]) {
                        updated = @YES;
                    }
                } else if ([sourceKeyValType isEqualToString:@"array"]) {
                    
                } else {
                    // Doc value is not an array or object, simply assign
                    if (![sourceKeyVal isEqual: updateKeyVal]) {
                        [doc setObject:updateKeyVal forKey:key];
                        updated = @YES;
                    }
                }
            }
        }
    } else {
        // Update value is not an array or object, simply assign
        [doc setObject:updateKeyVal forKey:key];
    }
    
    return updated;
}

- (void)_onInsert:(NSMutableDictionary *)result {
    [self emit:@"insert" data:result];
}

- (void)_onUpdate:(NSMutableDictionary *)result {
    [self emit:@"update" data:result];
}

- (NSMutableArray *)remove {
	return [self remove:@{}];
}

- (NSMutableArray *)remove:(id)arrayOrObject {
	NSMutableArray *removedItems = [[NSMutableArray alloc] init];
	NSMutableArray *searchItems = [[NSMutableArray alloc] init];
	NSMutableArray *searchResult;
	int index;
	int searchItemIndex;
    
    if ([arrayOrObject isKindOfClass:[NSDictionary class]]) {
        // Passed data is an object, assign inside the array
		[searchItems addObject:[arrayOrObject mutableCopy]];
    }
    
    if ([arrayOrObject isKindOfClass:[NSArray class]]) {
        // Passed data is an array, assign data one by one
        for (index = 0; index < [arrayOrObject count]; index++) {
            [searchItems addObject:[[arrayOrObject objectAtIndex:index] mutableCopy]];
        }
    }
	
	// Loop the search items and if items match, remove them
	for (index = 0; index < [searchItems count]; index++) {
		searchResult = [self find:[searchItems objectAtIndex:index] withOptions:@{@"decouple":@NO}];
		
		if ([searchResult count] > 0) {
			for (searchItemIndex = 0; searchItemIndex < [searchResult count]; searchItemIndex++) {
				[self._data removeObject:[searchResult objectAtIndex:searchItemIndex]];
			}
			
			[removedItems addObjectsFromArray:searchResult];
		}
	}
	
    NSLog(@"Remove count %lu", (unsigned long)[removedItems count]);
    if ([removedItems count] > 0) {
        //[self _onInsert:result];
		// TODO: Fire an onRemove
    }
	
    return removedItems;
}

- (NSInteger)count {
    return [self._data count];
}

- (NSMutableDictionary *)objectAtIndex:(NSInteger)index {
    return [[self._data objectAtIndex:index] mutableCopy];
}

- (NSMutableDictionary *)objectAtIndex:(NSInteger)index withOptions:(NSDictionary *)options {
    if ([[options objectForKey:@"decouple"] isEqual: @NO]) {
        return [self._data objectAtIndex:index];
    } else {
        return [[self._data objectAtIndex:index] mutableCopy];
    }
}

- (NSInteger)indexOfObject:(id)obj {
    NSInteger anIndex = [self._data indexOfObject:obj];
    
    if(NSNotFound == anIndex) {
        NSInteger returnVal = -1;
        return returnVal;
    } else {
        return anIndex;
    }
}

- (BOOL)save {
	NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
	NSString *basePath = ([paths count] > 0) ? [paths objectAtIndex:0] : nil;
	NSString *archivePath = [[NSString alloc] initWithFormat:@"%@%@%@%@", basePath, @"/fdb_", [self name], @".dat"];
	BOOL success = [NSKeyedArchiver archiveRootObject:self._data toFile:archivePath];
	
	return success;
}

- (BOOL)load {
	NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
	NSString *basePath = ([paths count] > 0) ? [paths objectAtIndex:0] : nil;
	NSString *archivePath = [[NSString alloc] initWithFormat:@"%@%@%@%@", basePath, @"/fdb_", [self name], @".dat"];
	
	self._data = [NSKeyedUnarchiver unarchiveObjectWithFile:archivePath];
	
	return true;
}

- (void)linkTableView:(UITableView *)view {
	
}

@end
