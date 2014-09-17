//
//  ForerunnerDB_Collection.h
//  orbzu
//
//  Created by Rob Evans on 22/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "ForerunnerDB_Index.h"
#import "EventEmitter.h"

@interface ForerunnerDB_Collection : NSObject

@property NSString *_name;
@property NSMutableArray *_data;
@property NSMutableArray *_groups;
@property NSMutableDictionary *_index;
@property NSString *_primaryKey;
@property NSNumber *_linked;
@property NSDictionary *_deferQueue;
@property NSDictionary *_deferThreshold;
@property NSDictionary *_deferTime;
@property id __subsetOf;

- (id)initWithName:(NSString *)name;
- (NSString *)primaryKey;
- (NSString *)name;
- (void)name:(NSString *)val;
- (void)primaryKey:(NSString *)fieldName;
- (id)decouple:(id)data;
- (NSDictionary *)createIndex:(NSString *)indexName withFields:(NSDictionary *)fields andOptions:(NSDictionary *)options;
- (void)_fillIndex:(NSString *)indexName;
- (NSMutableArray *)setData:(id)arrayOrObject;
- (NSMutableArray *)insert:(id)arrayOrObject;
- (NSMutableArray *)insert:(id)arrayOrObject atIndex:(NSUInteger)index;
- (NSMutableArray *)find;
- (NSMutableArray *)find:(id)query;
- (NSMutableArray *)find:(id)query withOptions:(NSDictionary *)options;
- (NSNumber *)_match:(id)doc withQuery:(id)query andOperator:(NSString *)operator;
- (NSMutableDictionary *)update:(id)query withData:(id)data;
- (NSNumber *)_updateObject:(id)doc withData:(id)update andQuery:(id)query;
- (void)_onUpdate:(NSMutableDictionary *)result;
- (NSMutableArray *)remove;
- (NSMutableArray *)remove:(id)arrayOrObject;
- (NSInteger)count;
- (NSMutableDictionary *)objectAtIndex:(NSInteger)index;
- (NSMutableDictionary *)objectAtIndex:(NSInteger)index withOptions:(NSDictionary *)options;
- (NSInteger)indexOfObject:(id)obj;
- (BOOL)save;
- (BOOL)load;

@end
