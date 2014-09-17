//
//  BaseConversion.m
//  ForerunnerDB
//
//  Created by Rob Evans on 15/09/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import "BaseConversion.h"

@implementation BaseConversion : NSObject

// Uses the alphabet length as base.
-(NSString*) formatNumber:(long double)n usingAlphabet:(NSString*)alphabet
{
    NSUInteger base = [alphabet length];
    if ((int)n < base){
        // direct conversion
        NSRange range = NSMakeRange((int)n, 1);
        return [alphabet substringWithRange:range];
    } else {
        return [NSString stringWithFormat:@"%@%@",
				
                // Get the number minus the last digit and do a recursive call.
                // Note that division between integer drops the decimals, eg: 769/10 = 76
                [self formatNumber:n / base usingAlphabet:alphabet],
				
                // Get the last digit and perform direct conversion with the result.
                [alphabet substringWithRange:NSMakeRange((int)fmod(n, base), 1)]];
    }
}

-(NSString*) formatNumber:(long double)n toBase:(long double)base {
    NSString *alphabet = @"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"; // 62 digits
    NSAssert([alphabet length] >= base, @"Not enough characters. Use base %ld or lower.", (unsigned long)[alphabet length]);
	NSString *trimmedAlpha = [alphabet substringWithRange:NSMakeRange(0, base)];
	
    return [self formatNumber:n usingAlphabet:trimmedAlpha];
}

@end
