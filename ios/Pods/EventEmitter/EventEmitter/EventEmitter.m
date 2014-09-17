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

#import "EventEmitter.h"

#import <objc/runtime.h>

#pragma mark - EventEmitterListener (currently internal API) protocol

@protocol EventEmitterListener <NSObject>
@property BOOL once;
@property id callback;
- (void) notify: (NSArray*) data;
@end

@interface EventEmitterNotifyCallbackListener : NSObject <EventEmitterListener>
@end

@interface EventEmitterDefaultCallbackListener : NSObject <EventEmitterListener>
@end

@interface EventEmitterArrayCallbackListener : NSObject <EventEmitterListener>
@end

#pragma mark - EventEmitterListener (currently internal API) implementation

@implementation EventEmitterNotifyCallbackListener
@synthesize once;
@synthesize callback;

- (void) notify: (NSArray*) data {
	((EventEmitterNotifyCallback) callback)();
}

@end

@implementation EventEmitterDefaultCallbackListener
@synthesize once;
@synthesize callback;

- (void) notify: (NSArray*) data {
	if (data.count == 0) {
		((EventEmitterDefaultCallback) callback)(nil);
	} else if (data.count == 1) {
		((EventEmitterDefaultCallback) callback)(data[0]);
	} else {
		NSLog(@"Could not call block callback with array length > 1");
	}
}

@end

@implementation EventEmitterArrayCallbackListener
@synthesize once;
@synthesize callback;

- (void) notify: (NSArray*) data {
	((EventEmitterArrayCallback) callback)(data);
}

@end

#pragma mark - NSObject+EventEmitterListenerHandling

static const char* _EventEmitter_ListenerArray = "EventEmitter_ListenerArray";

@implementation NSObject(EventEmitterListenerHandling)

- (void) on:(NSString*) event notify:(EventEmitterNotifyCallback) callback {
	[self addListener:[[EventEmitterNotifyCallbackListener alloc] init] callback:callback event:event once:NO];
}

- (void) on:(NSString*) event callback:(EventEmitterDefaultCallback) callback {
	[self addListener:[[EventEmitterDefaultCallbackListener alloc] init] callback:callback event:event once:NO];
}

- (void) on:(NSString*) event array:(EventEmitterArrayCallback) callback {
	[self addListener:[[EventEmitterArrayCallbackListener alloc] init] callback:callback event:event once:NO];
}

- (void) once:(NSString*) event notify:(EventEmitterNotifyCallback) callback {
	[self addListener:[[EventEmitterNotifyCallbackListener alloc] init] callback:callback event:event once:YES];
}

- (void) once:(NSString*) event callback:(EventEmitterDefaultCallback) callback {
	[self addListener:[[EventEmitterDefaultCallbackListener alloc] init] callback:callback event:event once:YES];
}

- (void) once:(NSString*) event array:(EventEmitterArrayCallback) callback {
	[self addListener:[[EventEmitterArrayCallbackListener alloc] init] callback:callback event:event once:YES];
}

/*
 Internal helper function.
 */
- (void) addListener:(NSObject<EventEmitterListener>*) listener callback:(id) callback event:(NSString*) event once:(BOOL) once {
	
	NSMutableDictionary* eventListeners = objc_getAssociatedObject(self, _EventEmitter_ListenerArray);
	
	if (!eventListeners) {
		eventListeners = [NSMutableDictionary dictionary];
		objc_setAssociatedObject(self, _EventEmitter_ListenerArray, eventListeners, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
	}
	
	NSMutableArray* eventListener = [eventListeners objectForKey:event];
	if (!eventListener) {
		eventListener = [NSMutableArray array];
		[eventListeners setValue:eventListener forKey:event];
	}
	
	listener.once = once;
	listener.callback = callback;
	[eventListener addObject:listener];
}

- (void) removeCallback:(id) callback {
	NSMutableDictionary* eventListeners = objc_getAssociatedObject(self, _EventEmitter_ListenerArray);
	for (NSString* event in [eventListeners keyEnumerator]) {
		[self removeListener:event callback:callback];
	}
}

- (void) removeListener:(NSString*) event callback:(id) callback {
	NSMutableDictionary* eventListeners = objc_getAssociatedObject(self, _EventEmitter_ListenerArray);
	NSMutableArray* eventListener = [eventListeners valueForKey:event];
	if (!eventListener) {
		return;
	}
	
	NSMutableIndexSet* discardedItems = [NSMutableIndexSet indexSet];
	NSUInteger index = 0;
	for (NSObject<EventEmitterListener>* listener in eventListener) {
		if (listener.callback == callback) {
			[discardedItems addIndex:index];
		}
		index++;
	}
	[eventListener removeObjectsAtIndexes:discardedItems];
	
	if (eventListeners.count == 0) {
		objc_setAssociatedObject(self, _EventEmitter_ListenerArray, nil, OBJC_ASSOCIATION_ASSIGN);
	}
}

- (void) removeAllListener:(NSString*) event {
	NSMutableDictionary* eventListeners = objc_getAssociatedObject(self, _EventEmitter_ListenerArray);
	NSMutableArray* eventListener = [eventListeners valueForKey:event];
	[eventListener removeAllObjects];
	[eventListeners removeObjectForKey:event];
	
	if (eventListeners.count == 0) {
		objc_setAssociatedObject(self, _EventEmitter_ListenerArray, nil, OBJC_ASSOCIATION_ASSIGN);
	}
}

- (void) removeAllListener {
	NSMutableDictionary* eventListeners = objc_getAssociatedObject(self, _EventEmitter_ListenerArray);
	for (NSMutableArray* eventListener in [eventListeners objectEnumerator]) {
		[eventListener removeAllObjects];
	}
	[eventListeners removeAllObjects];
	
	objc_setAssociatedObject(self, _EventEmitter_ListenerArray, nil, OBJC_ASSOCIATION_ASSIGN);
}

@end

#pragma mark - NSObject+EventEmitterDistributionHandling

@implementation NSObject(EventEmitterDistributionHandling)

- (void) emit:(NSString*) event {
	[self emit:event array:[NSArray array]];
}

- (void) emit:(NSString*) event data: (id) arg0 {
	[self emit:event array:[NSArray arrayWithObject:arg0]];
}

- (void) emit:(NSString*) event arguments: (id) arg0, ... {
	NSMutableArray* array = [NSMutableArray array];
	
	id arg;
	va_list args;
	va_start(args, arg0);
	while ((arg = va_arg(args, id)) != nil) {
		[array addObject:arg];
	}
	va_end(args);
	
	[self emit:event array:array];
}

- (void) emit:(NSString*) event array: (NSArray*) array {
	NSMutableDictionary* eventListeners = objc_getAssociatedObject(self, _EventEmitter_ListenerArray);
	NSMutableArray* eventListener = [eventListeners valueForKey:event];
	NSMutableIndexSet* discardedItems = [NSMutableIndexSet indexSet];
	NSUInteger index = 0;

	for (NSObject<EventEmitterListener>* listener in eventListener) {
		[listener notify:array];
		if (listener.once) {
			[discardedItems addIndex:index];
		}
		index++;
	}
	
	if (eventListener.count == discardedItems.count) {
		[eventListeners removeObjectForKey:event];
		if (eventListener.count == 0) {
			objc_setAssociatedObject(self, _EventEmitter_ListenerArray, nil, OBJC_ASSOCIATION_ASSIGN);
		}
	} else if (discardedItems.count > 0) {
		[eventListener removeObjectsAtIndexes:discardedItems];
	}
}

@end
