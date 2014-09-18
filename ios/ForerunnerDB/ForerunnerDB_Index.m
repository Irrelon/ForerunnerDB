//
//  ForerunnerDB_Index.m
//  ForerunnerDB
//
//  Created by Rob Evans on 25/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import "ForerunnerDB_Index.h"

@implementation ForerunnerDB_Index

- (id)init {
    self = [super init];
    
    if (self) {
        self.index = [[NSMutableDictionary alloc] init];
    }
    
    return self;
}

- (ForerunnerDB_Index *)initWithFields:(NSDictionary *)fields {
    self = [self init];
    self.fields = fields;
    
    return self;
}

- (ForerunnerDB_Index *)initWithFields:(NSDictionary *)fields andSparse:(NSNumber *)sparse {
    self = [self init];
    self.fields = fields;
    self.sparse = sparse;
    
    return self;
}

- (ForerunnerDB_Index *)initWithFields:(NSDictionary *)fields andSparse:(NSNumber *)sparse andUnique:(NSNumber *)unique {
    self = [self init];
    self.fields = fields;
    self.sparse = sparse;
    self.unique = unique;
    
    return self;
}

- (NSNumber *)addObject:(NSDictionary *)obj {
    // Are we a unique index?
    if ([self.unique isEqual:@YES]) {
        // Check for key violation
        if ([[self violatesIndex:obj] isEqual:@NO]) {
            // Key not violated, add to index
            return @YES;
        } else {
            // Key violation, don't add to index
            return @NO;
        }
    } else {
        // The index is not unique, add to index
        return @YES;
    }
}

- (NSNumber *)removeObject:(NSDictionary *)obj {
    return @YES;
}

- (NSNumber *)violatesIndex:(NSDictionary *)obj {
    
    return @YES;
}

@end
