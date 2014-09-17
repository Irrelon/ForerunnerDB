//
//  NSObject+NSObject_Type.m
//  orbzu
//
//  Created by Rob Evans on 25/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import "NSObject+NSObject_Type.h"

@implementation NSObject (NSObject_Type)

- (NSString *)typeName {
    if ([self isKindOfClass:[NSDictionary class]]) {
        return @"object";
    }
    
    if ([self isKindOfClass:[NSArray class]]) {
        return @"array";
    }
    
    if ([self isKindOfClass:[NSNumber class]]) {
        return @"number";
    }
    
    if ([self isKindOfClass:[NSString class]]) {
        return @"string";
    }
    
    return @"undefined";
}

- (BOOL)isTypeName:(NSString *)type {
    return [[self typeName] isEqualToString:type];
}

- (id)valueFromKey:(id)key {
    NSString *type = [self typeName];
    
    if ([type isEqualToString:@"object"]) {
        NSDictionary *myType = (NSDictionary *)self;
        return [myType objectForKey:key];
    }
    
    if ([type isEqualToString:@"array"]) {
        NSArray *myType = (NSArray *)self;
        return [myType objectAtIndex:[key integerValue]];
    }
    
    return nil;
}

@end
