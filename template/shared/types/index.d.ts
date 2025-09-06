declare module '@nuxt/schema' {
    interface AppConfigInput {
        shopify?: {
            collection?: {
                perPage?: number
            }
        }
    }
}

export {}
