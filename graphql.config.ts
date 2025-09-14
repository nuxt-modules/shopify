import type { IGraphQLConfig } from 'graphql-config'

const config: IGraphQLConfig = {
    projects: {
        default: {
            schema: './playgrounds/playground-v4/.nuxt/schema/storefront.schema.json',
        },
        admin: {
            schema: './playgrounds/playground-v4/.nuxt/schema/admin.schema.json',
        },
    },
}

export default config
