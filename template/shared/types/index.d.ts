declare module 'nuxt/schema' {
  interface AppConfig {
    shopify: {
      shopName: string
      version: string

      collection: {
        perPage: number
      }
    }
  }
}

export {}
