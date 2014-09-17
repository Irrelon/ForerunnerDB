//
//  BaseConversion.h
//  ForerunnerDB
//
//  Created by Rob Evans on 15/09/2014.
//  Copyright (c) 2014 Irrelon Software Limited. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface BaseConversion : NSObject

-(NSString*) formatNumber:(long double)n toBase:(long double)base;
-(NSString*) formatNumber:(long double)n usingAlphabet:(NSString*)alphabet;

@end
