//
//  EventEmitter.h
//  EventEmitter
//
//  Copyright 2012 Christoph Jerolimov
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License
//

#import <Foundation/Foundation.h>

typedef void (^EventEmitterNotifyCallback)();
typedef void (^EventEmitterDefaultCallback)(id arg0);
typedef void (^EventEmitterArrayCallback)(NSArray* data);

#pragma mark - NSObject+EventEmitterListenerHandling

@interface NSObject(EventEmitterListenerHandling)

/*
 Adds a listener to the end of the listeners array for the specified event.
 */
- (void) on:(NSString*) event notify:(EventEmitterNotifyCallback) callback;

/*
 Adds a listener to the end of the listeners array for the specified event.
 */
- (void) on:(NSString*) event callback:(EventEmitterDefaultCallback) callback;

/*
 Adds a listener to the end of the listeners array for the specified event.
 */
- (void) on:(NSString*) event array:(EventEmitterArrayCallback) callback;

// TODO? - (void) on:(NSString*) event callback:(id) callback argumentSize:length;
// TODO? - (void) onError:(NSError*) error;

/*
 Adds a __one time__ listener for the event. This listener is invoked only
 the next time the event is fired, after which it is removed.
 */
- (void) once:(NSString*) event notify:(EventEmitterNotifyCallback) callback;

/*
 Adds a __one time__ listener for the event. This listener is invoked only
 the next time the event is fired, after which it is removed.
 */
- (void) once:(NSString*) event callback:(EventEmitterDefaultCallback) callback;

/*
 Adds a __one time__ listener for the event. This listener is invoked only
 the next time the event is fired, after which it is removed.
 */
- (void) once:(NSString*) event array:(EventEmitterArrayCallback) callback;

/*
 Remove a callback from the listener array.
 */
- (void) removeCallback:(id) callback;

/*
 Remove a listener from the listener array for the specified event.
 */
- (void) removeListener:(NSString*) event callback:(id) callback;

/*
 Removes all listeners for the specified event.
 */
- (void) removeAllListener:(NSString*) event;

/*
 Removes all listeners.
 */
- (void) removeAllListener;

/*
 Returns an array of listeners.
 */
//- (NSArray*) listeners;

/*
 Returns an array of listeners for the specified event.
 */
//- (NSArray*) listeners:(NSString*) event;

@end

#pragma mark - NSObject+EventEmitterDistributionHandling

@interface NSObject(EventEmitterDistributionHandling)

- (void) emit:(NSString*) event;
- (void) emit:(NSString*) event data: (id) arg0;
- (void) emit:(NSString*) event arguments: (id) arg0, ...;
- (void) emit:(NSString*) event array: (NSArray*) array;

@end
