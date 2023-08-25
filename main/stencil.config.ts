import { Config } from '@stencil/core';
import nodePolyfills from 'rollup-plugin-node-polyfills';

export const config: Config = {
    namespace: 'bonono',
    outputTargets: [
        {
            type: 'dist',
            esmLoaderPath: '../loader',
        },
        {
            type: 'docs-readme',
        },
        {
            type: 'www',
            serviceWorker: null, // disable service workers
        },
    ],
    testing: {
        browserWaitUntil: "networkidle0",
        collectCoverage: true,
        collectCoverageFrom: ['src/**/*.ts', '!**/node_modules/**'],
        coverageProvider: 'v8',
        setupFilesAfterEnv: ["<rootDir>/src/test/test_util/setup.ts"]
    },
    rollupPlugins: {
        after: [
            nodePolyfills()
        ]
    }
};
