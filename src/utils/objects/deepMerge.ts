export function deepMerge<A, B>(target: Partial<A>, source: Partial<B>): A & B {
    const result = { ...target } as any;

    for (const key in source) {
        const sourceValue = (source as any)[key];
        const targetValue = (target as any)[key];

        const sourceIsObject = (
            sourceValue &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue)
        );

        const targetIsObject = (
            targetValue &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
        );

        if (sourceIsObject && targetIsObject) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            result[key] = sourceValue;
        }
    }

    return result;
}