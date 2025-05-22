import { LocationContext } from '@/contexts/LocationContext';
import { LocationObject } from '@/providers/LocationProvider';
import { useContext, useEffect, useState } from 'react';
import { subscribe } from 'valtio';

// replacement for the react-router-dom useLocation hook.
// this doesn't cause re-renders on location change.
export function useLocation(reRenderChecker?: (location: LocationObject) => boolean, name?: string) {
    const locationCtx = useContext(LocationContext);

    if (!locationCtx) {
        throw new Error('useLocationRef must be used within a LocationProvider');
    }

    const { locationState } = locationCtx;
    const [location, setLocation] = useState(locationCtx.location);
    const check = reRenderChecker?.(locationCtx.location) ?? true;
    const [lastBool, setLastBool] = useState(check);

    useEffect(() => {
        const unsubscribe = subscribe(locationState, () => {
            const newLocation = locationState.location;
            const newBool = reRenderChecker ? reRenderChecker(newLocation) : !lastBool;
            const isDifferent = newBool !== lastBool;

            if (isDifferent) {
                setLastBool(newBool);
                setLocation(newLocation);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [reRenderChecker, name, locationState, lastBool]);

    return location;
}