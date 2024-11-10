export class NuxtShopifyError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'NuxtShopifyError'
    }

    static MissingClientConfiguration = () => new this(`
        Could not find any "moduleOptions.client.???" configuration.
        > Documentation: https://github.com/konkonam/nuxt-shopify/docs/configuration.md
    `)

    static throw = (id: NuxtShopifyErrorId) => {
        switch (id) {
            case NuxtShopifyErrorId.NoClientConfigs:
                return NuxtShopifyError.MissingClientConfiguration()
            default:
                return new NuxtShopifyError(id)
        }
    }
}
