import { useMemo, useState } from 'react';

export type PlanckRef<T> = {
    get current(): T;
    set current(value: T);
};

export const usePlanckRef = <T = any>(initialValue: T): PlanckRef<T> => {
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