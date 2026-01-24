import type { Nuxt } from '@nuxt/schema'
import type { Resolver } from '@nuxt/kit'

export default function setupTypes(nuxt: Nuxt, resolver: Resolver) {
    nuxt.options.typescript.tsConfig.include ??= []
    nuxt.options.typescript.tsConfig.include.push(resolver.resolve('./types/index.d.ts'))
}
