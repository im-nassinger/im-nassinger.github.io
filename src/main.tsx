import '@/i18n';
import '@/styles/variables.css';
import '@/utils/dom/bodyVariables';
import '@/utils/dom/disableScrollWheel';
import '@/utils/misc/subscriptions';
import 'simplebar-react/dist/simplebar.min.css';
import { Profiler } from 'react';
import type { ProfilerOnRenderCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { isProfilerEnabled, recordDuration } from '@/utils/profiler/profiler.ts';
import { LocationProvider } from './providers/LocationProvider';
import { SmoothScrollProvider } from '@/providers';
import { App } from '@/components';
import { ToastContainer } from 'react-toastify';

if (!location.hash) {
    const [ href, search ] = location.href.split('?');
    location.href = href + '#start' + (search ? `?${search}` : '');
}

const shouldScan = import.meta.env.DEV && location.href.includes('?scan');

if (shouldScan) {
    import('react-scan').then(({ scan }) => {
        scan({ enabled: true });
    });
}

// add "?profile" to the url to open the performance overlay (works in production builds too).
if (isProfilerEnabled) {
    import('@/utils/profiler/overlay/ProfilerOverlay.ts').then(({ mountProfilerOverlay }) => {
        mountProfilerOverlay();
    });
}

// react only reports render timings in development builds.
const onReactRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
    recordDuration(`react:${phase} (${id})`, actualDuration);
};

const root = document.getElementById('root')!;

createRoot(root).render(
    // <StrictMode>
    <>
        <LocationProvider>
            <SmoothScrollProvider>
                {isProfilerEnabled ? (
                    <Profiler id="app" onRender={onReactRender}>
                        <App />
                    </Profiler>
                ) : (
                    <App />
                )}
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