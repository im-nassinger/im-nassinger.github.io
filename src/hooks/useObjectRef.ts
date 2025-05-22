import { deepEqual } from '@/utils/objects/deepEqual';
import { useRef } from 'react';

export function useObjectRef<T>(value: T): T {
    const ref = useRef<T>(value);

    if (!deepEqual(value, ref.current)) {
        ref.current = value;
    }

    return ref.current;
}