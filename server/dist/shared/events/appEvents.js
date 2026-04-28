const listeners = new Map();
export function onAppEvent(event, fn) {
    let set = listeners.get(event);
    if (!set) {
        set = new Set();
        listeners.set(event, set);
    }
    set.add(fn);
    return () => {
        set?.delete(fn);
    };
}
export function emitAppEvent(event, payload) {
    const set = listeners.get(event);
    if (!set?.size)
        return;
    for (const fn of set) {
        try {
            void Promise.resolve(fn(payload)).catch((e) => console.error('[appEvents]', String(event), e));
        }
        catch (e) {
            console.error('[appEvents]', String(event), e);
        }
    }
}
//# sourceMappingURL=appEvents.js.map