import { SmoothScrollContextType } from '@/providers';
import { createContext } from 'react';

export const SmoothScrollContext = createContext<SmoothScrollContextType | null>(null);