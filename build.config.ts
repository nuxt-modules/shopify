import { createResolver } from '@nuxt/kit'
import { readFileSync } from 'node:fs'
import { defineBuildConfig } from 'unbuild'

const resolver = createResolver(import.meta.url)

const storefront = readFileSync(resolver.resolve('./src/types/clients/storefront.d.ts'), 'utf8')
const admin = readFileSync(resolver.resolve('./src/types/clients/admin.d.ts'), 'utf8')

export default defineBuildConfig({
    declaration: true,
    entries: [
        'src/commands/init',
    ],
    externals: [
        '@shopify/graphql-client',
    ],
    replace: {
        ROLLUP_REPLACE_VIRTUAL_STOREFRONT: storefront,
        ROLLUP_REPLACE_VIRTUAL_ADMIN: admin,
    },
})
