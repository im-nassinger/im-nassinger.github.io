import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfig from './tsconfig.app.json' with { type: 'json' };

export default defineConfig({
    build: {
        emptyOutDir: false
    },
    plugins: [
        react(),
        svgr()
    ],
    resolve: {
        alias: {
            ...getTsConfigPaths(),
            // the package entry picks the threaded "deluxe" build on cross-origin isolated pages.
            // github pages cannot send the COOP/COEP headers that threading needs, so we always
            // use the single-threaded "compat" build and keep the unused worker out of the bundle.
            'box2d3-wasm': path.resolve('node_modules/box2d3-wasm/build/dist/es/compat/Box2D.compat.mjs')
        }
    },
    css: {
        modules: {
            localsConvention: 'camelCaseOnly'
        }
    },
    server: {
        allowedHosts: true
    },
    optimizeDeps: {
        // pre-bundling breaks the emscripten loader, which resolves its .wasm file through import.meta.url.
        exclude: ['box2d3-wasm']
    }
});

function getTsConfigPaths() {
    const result: Record<string, string> = {};
    const paths = tsconfig.compilerOptions.paths as Record<string, string[]>;

    for (const key in paths) {
        const [value] = paths[key];
        result[key] = path.resolve(value);
    }

    return result;
}