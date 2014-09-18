//
//  ObjectId.h
//  ForerunnerDB
//
//  Created by Rob Evans on 16/09/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface ObjectId : NSObject

- (int)getRandomNumberBetween:(int)from to:(int)to;
- (NSString *)getHexString;
- (NSString *)newId;

@end
