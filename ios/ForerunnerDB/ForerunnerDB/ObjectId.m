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

- (NSString *)stringToHex:(NSString *)str
{
    NSUInteger len = [str length];
    unichar *chars = malloc(len * sizeof(unichar));
    [str getCharacters:chars];
	
    NSMutableString *hexString = [[NSMutableString alloc] init];
	
    for(NSUInteger i = 0; i < len; i++ )
    {
        // [hexString [NSString stringWithFormat:@"%02x", chars[i]]]; /*previous input*/
        [hexString appendFormat:@"%02x", chars[i]]; /*EDITED PER COMMENT BELOW*/
    }
    free(chars);
	
    return hexString;
}

- (NSString *)newId {
	int randomNumber = [self getRandomNumberBetween:0 to:999] + [self getRandomNumberBetween:0 to:999] + [self getRandomNumberBetween:0 to:999];
	NSString *randomNumberStr = [NSString stringWithFormat:@"%d",randomNumber];
	NSString *hexStr = [self stringToHex:randomNumberStr];
	
	return hexStr;
}

@end
