import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfig from './tsconfig.app.json' with { type: 'json' };

export default defineConfig({
    plugins: [
        react(),
        svgr()
    ],
    resolve: {
        alias: getTsConfigPaths()
    },
    css: {
        modules: {
            localsConvention: 'camelCaseOnly'
        }
    },
    server: {
        allowedHosts: true
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