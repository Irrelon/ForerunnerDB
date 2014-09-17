//
//  NSObject+NSObject_Type.h
//  orbzu
//
//  Created by Rob Evans on 25/06/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface NSObject (NSObject_Type)

- (NSString *)typeName;
- (BOOL)isTypeName:(NSString *)type;
- (id)valueFromKey:(id)key;

@end
