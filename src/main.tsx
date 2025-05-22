import '@/i18n';
import '@/styles/variables.css';
import '@/utils/dom/bodyVariables';
import '@/utils/dom/disableScrollWheel';
import '@/utils/misc/subscriptions';
import 'simplebar-react/dist/simplebar.min.css';
import { createRoot } from 'react-dom/client';
import { LocationProvider } from './providers/LocationProvider';
import { SmoothScrollProvider } from '@/providers';
import { App } from '@/components';
import { ToastContainer } from 'react-toastify';

if (!location.hash) location.hash = '#start';

const shouldScan = import.meta.env.DEV && location.href.includes('?scan');

if (shouldScan) {
    import('react-scan').then(({ scan }) => {
        scan({ enabled: true });
    });
}

const root = document.getElementById('root')!;

createRoot(root).render(
    // <StrictMode>
    <>
        <LocationProvider>
            <SmoothScrollProvider>
                <App />
            </SmoothScrollProvider>
        </LocationProvider>
        <ToastContainer
            position="bottom-right"
            autoClose={4000}
            draggable={true}
            theme="dynamic"
        />
    </>
    // </StrictMode>
);