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
            type: 'dist-custom-elements',
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
        browserWaitUntil: "networkidle0"
    },
    rollupPlugins: {
        after: [
            nodePolyfills(),
        ]
    }
};
