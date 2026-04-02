declare module 'nuxt/schema' {
    interface AppConfig {
        shopify: {
            shopName: string

            collection: {
                perPage: number
            }
        }
    }
}

export {}
