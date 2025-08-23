import type { IGraphQLConfig } from 'graphql-config'

const config: IGraphQLConfig = {
    projects: {
        default: {
            schema: './playgrounds/playground/.nuxt/schema/storefront.schema.json',
            documents: [
                './playgrounds/playground/**/*.{gql,graphql,js,ts,vue}',
                '!./playgrounds/playground/**/*.admin.{gql,graphql,js,ts,vue}',
                '!./playgrounds/playground/**/admin/**/*.{gql,graphql,js,ts,vue}',
            ],
        },
        admin: {
            schema: './playgrounds/playground/.nuxt/schema/admin.schema.json',
            documents: [
                './playgrounds/playground/**/*.admin.{gql,graphql,js,ts,vue}',
                './playgrounds/playground/**/admin/**/*.{gql,graphql,js,ts,vue}',
            ],
        },
    },
}

export default config
