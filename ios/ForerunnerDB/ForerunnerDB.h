//
//  ForerunnerDB.h
//  ForerunnerDB
//
//  Created by Rob Evans on 22/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ForerunnerDB_Index.h"
#import "ForerunnerDB_Collection.h"
#import "EventEmitter.h"

@interface ForerunnerDB : NSObject

@property NSMutableDictionary *_collections;
@property NSMutableDictionary *_debug;
@property NSInteger idCounter;

+ (id)sharedInstance;
- (NSString *)crc:(NSString *)str;
- (id)decouple:(id)data;
- (id)debug;
- (id)debug:(NSString *)type;
- (void)debug:(NSString *)type val:(id)val;
- (NSString *)objectId;
- (NSString *)objectId:(NSString *)str;
- (ForerunnerDB_Collection *)collection:(NSString *)name;
- (void)drop;

@end
