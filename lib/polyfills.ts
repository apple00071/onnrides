// Polyfill for setImmediate in browser environments
if (typeof window !== 'undefined' && !window.setImmediate) {
    const setImmediatePolyfill = function (callback: Function, ...args: any[]) {
        return setTimeout(() => callback(...args), 0) as unknown as NodeJS.Immediate;
    };
    
    // Add __promisify__ property
    setImmediatePolyfill.__promisify__ = function(): Promise<void> {
        return new Promise((resolve) => setImmediatePolyfill(resolve));
    };
    
    window.setImmediate = setImmediatePolyfill as unknown as typeof setImmediate;
}

// Polyfill for clearImmediate
if (typeof window !== 'undefined' && !window.clearImmediate) {
    window.clearImmediate = function (immediateId: any) {
        clearTimeout(immediateId);
    } as typeof clearImmediate;
} 