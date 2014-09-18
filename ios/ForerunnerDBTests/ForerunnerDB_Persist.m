//
//  ForerunnerDB_Persist.m
//  ForerunnerDB
//
//  Created by Rob Evans on 18/09/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <XCTest/XCTest.h>
#import "ForerunnerDB.h"

@interface ForerunnerDB_Persist : XCTestCase

@end

@implementation ForerunnerDB_Persist

- (void)setUp
{
    [super setUp];
}

- (void)tearDown
{
    [super tearDown];
}

- (void)testSaveAndLoadFromPersistentStorage {
	ForerunnerDB *db;
	ForerunnerDB_Collection *coll;
	NSArray *results;
	
	db = [ForerunnerDB sharedInstance];
	coll = [db collection:@"testPersist"];
	[coll insert:@{@"hello": @{@"test": @1, @"arr": @[@1, @2]}}];
	
	// Check item is in the collection
	results = [coll find];
	XCTAssertTrue([results count] == 1, @"Check inserted item exists");
	
	BOOL saved = [coll save];
	XCTAssertTrue(saved == true, @"Did save return true");
	
	[db drop];
	db = nil;
	coll = nil;
	
	// Confirm the db is empty
	db = [ForerunnerDB sharedInstance];
	coll = [db collection:@"testPersist"];
	
	// Now load the data and test it is back!
	NSMutableArray *noData = [coll find];
	BOOL loaded = [coll load];
	results = [coll find];
	BOOL val = [[[[[results objectAtIndex:0] objectForKey:@"hello"] objectForKey:@"arr"] objectAtIndex:0] isEqual:@1];
	
	XCTAssertTrue([noData count] == 0, @"Initial data has no entries");
	XCTAssertTrue([results count] == 1, @"After load, data has 1 entry");
	XCTAssertTrue(val == true, @"After load, data has correct entry");
	XCTAssertTrue(loaded == true, @"Did save return true");
}

@end
