import { defineBuildConfig } from 'unbuild'

// https://github.com/nuxt/module-builder/issues/242#issuecomment-2012839796
export default defineBuildConfig({
    externals: ['#imports', '#app'],
    rollup: {
        inlineDependencies: true,
    },
})
