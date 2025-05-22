// deepEqual function to compare objects deeply: deepEqual({ a: 1 }, { a: 1 }) => true
// this is useful for passing objects as props to components that use React.memo,
// or similar optimizations to avoid unnecessary re-renders.
export function deepEqual(a: any, b: any, visited = new WeakMap<any, any>()): boolean {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return a === b;
    if (visited.has(a)) return visited.get(a) === b;

    visited.set(a, b);

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i], visited)) return false;
        }
        return true;
    }

    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();

    if (a instanceof RegExp && b instanceof RegExp) return a.toString() === b.toString();

    if (a instanceof Map && b instanceof Map) {
        if (a.size !== b.size) return false;
        for (const [key, valA] of a) {
            if (!b.has(key) || !deepEqual(valA, b.get(key), visited)) return false;
        }
        return true;
    }

    if (a instanceof Set && b instanceof Set) {
        if (a.size !== b.size) return false;
        for (const valA of a) {
            let found = false;
            for (const valB of b) {
                if (deepEqual(valA, valB, visited)) {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if ([ 'children', 'ref' ].includes(key)) continue;
        if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key], visited)) return false;
    }

    return true;
}