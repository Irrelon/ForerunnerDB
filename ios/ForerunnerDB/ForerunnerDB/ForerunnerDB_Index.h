//
//  ForerunnerDB_Index.h
//  orbzu
//
//  Created by Rob Evans on 25/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface ForerunnerDB_Index : NSObject

@property NSMutableDictionary *index;
@property NSDictionary *fields;
@property NSNumber *sparse;
@property NSNumber *unique;

- (ForerunnerDB_Index *)initWithFields:(NSDictionary *)fields;
- (ForerunnerDB_Index *)initWithFields:(NSDictionary *)fields andSparse:(NSNumber *)sparse;
- (ForerunnerDB_Index *)initWithFields:(NSDictionary *)fields andSparse:(NSNumber *)sparse andUnique:(NSNumber *)unique;

- (NSNumber *)addObject:(NSDictionary *)obj;
- (NSNumber *)removeObject:(NSDictionary *)obj;
- (NSNumber *)violatesIndex:(NSDictionary *)obj;

@end
