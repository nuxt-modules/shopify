export class NuxtShopifyError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'NuxtShopifyError'
    }

    static MissingClientConfiguration = () => new this(`
        Could not find any "moduleOptions.client.???" configuration.
        > Documentation: https://github.com/konkonam/nuxt-shopify/docs/configuration.md
    `)
}
