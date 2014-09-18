//
//  ForerunnerDBTests.m
//  ForerunnerDBTests
//
//  Created by Rob Evans on 26/08/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "ForerunnerDB.h"

@interface ForerunnerDBTests : XCTestCase

@property ForerunnerDB *db;
@property ForerunnerDB_Collection *coll;

@end

@implementation ForerunnerDBTests

- (void)setUp
{
    [super setUp];
	self.db = [ForerunnerDB sharedInstance];
	self.coll = [self.db collection:@"test"];
}

- (void)tearDown
{
    // Put teardown code here. This method is called after the invocation of each test method in the class.
	[self.db drop];
	self.db = nil;
    [super tearDown];
}

- (void)testObjectId {
	NSString *objId;
	
	// Generate a bunch of id and check that they are all long enough
	for (int i = 0; i < 100000; i++) {
		objId = [self.db objectId];
		if ([objId length] < 15) {
			NSLog(@"%lu %@", (unsigned long)[objId length], objId);
		}
		XCTAssertTrue([objId length] >= 15, @"Check objectId length");
	}
}

- (void)testCollectionName
{
	NSString *name = [self.coll name];
	
	XCTAssertTrue([name isEqualToString:@"test"], @"Collection is correct name");
}

- (void)testEmptyCollectionCount {
	NSInteger testVal = 0;
	NSInteger count = [self.coll count];
	
	XCTAssertEqual(testVal, count, @"New collection has zero count");
}

- (void)testInsertAndFindWithNoQuery {
	[self.coll insert:@{@"test": @1}];
	NSMutableArray *results = [self.coll find];
	NSMutableDictionary *item = [results objectAtIndex:0];
	
	XCTAssertTrue([[item objectForKey:@"test"] isEqual:@1], @"Inserted object has correct value when read back");
}

- (void)testNonEmptyCollectionCount {
	[self.coll insert:@{}];
	NSInteger testVal = 1;
	NSInteger count = [self.coll count];
	
	XCTAssertEqual(testVal, count, @"Collection has correct count");
}

@end
