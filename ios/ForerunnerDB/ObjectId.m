//
//  ObjectId.m
//  ForerunnerDB
//
//  Created by Rob Evans on 16/09/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import "ObjectId.h"

@implementation ObjectId

- (int)getRandomNumberBetween:(int)from to:(int)to {
    return (int)from + arc4random() % (to-from+1);
}

- (NSString *)getHexString {
    NSString *longlongstr = [NSString stringWithFormat:@"%d%d%d%d%d%d",[self getRandomNumberBetween:100 to:999],[self getRandomNumberBetween:100 to:999],[self getRandomNumberBetween:100 to:999],[self getRandomNumberBetween:100 to:999],[self getRandomNumberBetween:100 to:999],[self getRandomNumberBetween:100 to:999]];
    long long longnumber = [longlongstr longLongValue];
    NSString *hexStr =  [NSString stringWithFormat:@"%llx",longnumber];
	
	return hexStr;
}

- (NSString *)newId {
	/*int randomNumber = [self getRandomNumberBetween:0 to:999] + [self getRandomNumberBetween:0 to:999] + [self getRandomNumberBetween:0 to:999];
	NSString *randomNumberStr = [NSString stringWithFormat:@"%d",randomNumber];
	NSString *hexStr = [self stringToHex:randomNumberStr];*/
	
	return [self getHexString];
}

@end
