import { useMemo, useState } from 'react';

export type PhysicsRef<T> = {
    get current(): T;
    set current(value: T);
};

export const usePhysicsRef = <T = any>(initialValue: T): PhysicsRef<T> => {
    const [ ref, setRef ] = useState<T>(initialValue);

    const result = useMemo(() => {
        return {
            get current() {
                return ref;
            },
            set current(value: T) {
                if (value === ref) return;
                setRef(value);
            }
        }
    }, [ ref ]);

    return result;
};