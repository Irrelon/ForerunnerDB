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
	NSString *objId = [self.db objectId];
	XCTAssertTrue([objId length] >= 15, @"Check objectId length");
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

- (void)testSaveToPersistentStorage {
	[self.coll insert:@{@"hello": @{@"test": @1, @"arr": @[@1, @2]}}];
	BOOL saved = [self.coll save];
	XCTAssertTrue(saved == true, @"Did save return true");
}

- (void)testLoadFromPersistentStorage {
	NSMutableArray *noData = [self.coll find];
	BOOL loaded = [self.coll load];
	NSMutableArray *data = [self.coll find];
	BOOL val = [[[[[data objectAtIndex:0] objectForKey:@"hello"] objectForKey:@"arr"] objectAtIndex:0] isEqualToValue:@1];
	
	XCTAssertTrue([noData count] == 0, @"Initial data has no entries");
	XCTAssertTrue([data count] == 1, @"After load, data has 1 entry");
	XCTAssertTrue(val == true, @"After load, data has correct entry");
	XCTAssertTrue(loaded == true, @"Did save return true");
}

@end
