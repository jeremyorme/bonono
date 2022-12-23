import { Config } from '@stencil/core';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import { reactOutputTarget as react } from '@stencil/react-output-target';

export const config: Config = {
    namespace: 'bonono',
    outputTargets: [
        react({
            componentCorePackage: 'bonono',
            proxiesFile: '../bonono-react/src/components/stencil-generated/index.ts',
            includeDefineCustomElements: true,
        }),
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
