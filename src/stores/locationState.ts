import { LocationObject } from '@/providers/LocationProvider';
import { getCurrentLocation } from '@/utils/misc/getCurrentLocation';
import { proxy } from 'valtio';

export const locationState = proxy<{ location: LocationObject }>({
    location: getCurrentLocation()
});