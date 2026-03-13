declare module '@nuxt/schema' {
    interface AppConfigInput {
        shopify?: {
            shopName?: string

            collection?: {
                perPage?: number
            }
        }
    }
}

export {}
