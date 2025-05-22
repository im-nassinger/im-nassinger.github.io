import { LocationContext } from "@/contexts/LocationContext";
import { locationState } from "@/stores/locationState";
import { getCurrentLocation } from "@/utils/misc/getCurrentLocation";
import { deepEqual } from '@/utils/objects/deepEqual';
import { debounce } from "@/utils/timing/debounce";
import { useEffect } from 'react';

const originalPush = window.history.pushState;
const originalReplace = window.history.replaceState;

export type LocationObject = {
    pathname: string;
    search: string;
    hash: string;
}

export type LocationContextType = {
    location: LocationObject,
    locationState: typeof locationState
}

export function LocationProvider(props: { children: React.ReactNode }) {
    useEffect(() => {
        const onLocationChange = debounce((_type: string) => {
            const oldLocation = location;
            const newLocation = getCurrentLocation();
            const isEqual = deepEqual(oldLocation, newLocation);

            if (isEqual) return;

            locationState.location = newLocation;
        }, 0);

        window.history.pushState = function (...args) {
            const ret = originalPush.apply(this, args);
            onLocationChange('pushState');
            return ret;
        };

        window.history.replaceState = function (...args) {
            const ret = originalReplace.apply(this, args);
            onLocationChange('replaceState');
            return ret;
        };

        const onPopState = () => onLocationChange('popstate');

        window.addEventListener('popstate', onPopState);

        return () => {
            window.history.pushState = originalPush;
            window.history.replaceState = originalReplace;
            window.removeEventListener('popstate', onPopState);
        };
    }, []);

    return (
        <LocationContext.Provider
            value={{
                locationState,
                location
            }}
        >
            {props.children}
        </LocationContext.Provider>
    )
}