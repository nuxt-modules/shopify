export default defineNuxtConfig({
    modules: [
        '../../src/module',
    ],

    runtimeConfig: {
        shopify: {
            name: '',

            clients: {
                storefront: {
                    apiVersion: '',
                    publicAccessToken: '',
                },

                admin: {
                    apiVersion: '',
                    accessToken: '',

                    autoImport: false,
                },
            },
        },
    },

    srcDir: 'app/',

    serverDir: 'server/',

    compatibilityDate: '2025-11-01',

    hooks: {
        // Fix monorepo-specific tsconfig issue when running `nuxt prepare`
        'prepare:types': (opts) => {
            opts.sharedTsConfig ||= {}
            opts.sharedTsConfig.compilerOptions ||= {}
        },
    },
})
