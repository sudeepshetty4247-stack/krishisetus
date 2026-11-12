import {createContext} from 'react';
import type {KrishiState} from './krishisetu-provider';

// Keep the context identity when Vite refreshes the provider or a consumer.
// Never persist account state globally: only the context object is retained in development.
const retained=import.meta.hot?.data['krishisetuContext'] as ReturnType<typeof createContext<KrishiState|null>>|undefined;
export const KrishisetuContext=retained??createContext<KrishiState|null>(null);
if(import.meta.hot)import.meta.hot.data['krishisetuContext']=KrishisetuContext;