//
//  ForerunnerDB.m
//  ForerunnerDB
//
//  Created by Rob Evans on 22/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import "ForerunnerDB.h"
#import "ObjectId.h"

#define random() (arc4random_uniform(74))
#define cPow pow(3, 19)

@implementation ForerunnerDB

+ (id)sharedInstance {
    // structure used to test whether the block has completed or not
    static dispatch_once_t p = 0;
    
    // initialize sharedObject as nil (first call only)
    __strong static id _sharedObject = nil;
    
    // executes a block object once and only once for the lifetime of an application
    dispatch_once(&p, ^{
        _sharedObject = [[self alloc] init];
    });
    
    // returns the same object each time
    return _sharedObject;
}

- (NSString *)crc:(NSString *)str {
	return [[NSString alloc] init];
}

- (ForerunnerDB *)init {
    self = [super init];
    if (self) {
		self.idCounter = 0;
        self._collections = [[NSMutableDictionary alloc] init];
		self._debug = [[NSMutableDictionary alloc] init];
		self.baseConversion = [[BaseConversion alloc] init];
    }
    
    return self;
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

- (id)debug {
	return [self._debug objectForKey:@"all"];
}

- (id)debug:(NSString *)type {
	return [self._debug objectForKey:type];
}

- (void)debug:(NSString *)type val:(id)val {
	[self._debug setObject:val forKey:type];
}

- (NSString *)objectId {
	long long val = (self.idCounter + (
		rand() * cPow +
		rand() * cPow +
		rand() * cPow +
		rand() * cPow
	));
	
	self.idCounter++;
	
	return [[NSString alloc] initWithFormat:@"%llx", val];
}

- (NSString *)objectId:(NSString *)str {
	int val;
	
	for (int i = 0; i < [str length]; i++) {
		val += [str characterAtIndex:i] * pow(10, 17);
	}
	
	return [self.baseConversion formatNumber:val toBase:16];
}

- (ForerunnerDB_Collection *)collection:(NSString *)name {
    if ([self._collections objectForKey:name] == nil) {
        // Collection does not already exist, create it
        ForerunnerDB_Collection *newCollection = [[ForerunnerDB_Collection alloc] initWithName:name];
        
        [self._collections setObject:newCollection forKey:name];
    }
    
    return [self._collections objectForKey:name];
}

- (void)drop {
	self._collections = [[NSMutableDictionary alloc] init];
}

@end
