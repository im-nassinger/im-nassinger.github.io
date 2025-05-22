import { LocationContextType } from '@/providers/LocationProvider';
import { createContext } from 'react';

export const LocationContext = createContext<LocationContextType | null>(null);