import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const playgroundDir = fileURLToPath(new URL('../playgrounds/playground', import.meta.url))
const playgroundStorefrontTypesDir = fileURLToPath(new URL('../playgrounds/playground/.nuxt/types/storefront', import.meta.url))
const playgroundAdminTypesDir = fileURLToPath(new URL('../playgrounds/playground/.nuxt/types/admin', import.meta.url))

describe('basic module test', async () => {
    await setup({
        server: true,
        rootDir: playgroundDir,
    })

    it('should correctly validate the module configuration', async () => {
        const json = await $fetch('/api/config')

        expect(json).toStrictEqual({
            name: process.env.NUXT_SHOPIFY_NAME,
            logger: '',
            autoImports: {
                graphql: true,
                storefront: true,
                admin: false,
            },
            errors: {
                throw: true,
            },
            clients: {
                storefront: {
                    apiVersion: process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_API_VERSION,
                    publicAccessToken: process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN,
                    storeDomain: `https://${process.env.NUXT_SHOPIFY_NAME}.myshopify.com`,
                    sandbox: true,
                    documents: [
                        '**/*.{gql,graphql,ts,js}',
                        '!**/*.admin.{gql,graphql,ts,js}',
                        '!**/admin/**/*.{gql,graphql,ts,js}',
                        '**/*.vue',
                        '!node_modules',
                        '!dist',
                        '!.nuxt',
                        '!.output',
                    ],
                },
                admin: {
                    apiVersion: process.env.NUXT_SHOPIFY_CLIENTS_ADMIN_API_VERSION,
                    accessToken: '<admin_access_token>',
                    storeDomain: `https://${process.env.NUXT_SHOPIFY_NAME}.myshopify.com`,
                    sandbox: true,
                    documents: [
                        '**/*.admin.{gql,graphql,ts,js}',
                        '**/admin/**/*.{gql,graphql,ts,js}',
                        '!node_modules',
                        '!dist',
                        '!.nuxt',
                        '!.output',
                    ],
                },
            },
        })
    })

    it('should create a working server side storefront fetch client', async () => {
        const html = await $fetch('/')

        // Check that we get 5 products
        expect(html).toContain('<p>Product count: 5</p>')
    })

    it('should create a working client side storefront fetch client', async () => {
        const html = await $fetch('/client')

        // Check that we get 5 products
        expect(html).toContain('<p>Product count: 5</p>')
    })

    it('should create a working admin fetch client', async () => {
        const html = await $fetch('/admin')

        // Check that we get 3 markets
        expect(html).toContain('<p>Market count: 3</p>')
    })

    it('should generate storefront api types', async () => {
        const path = join(playgroundStorefrontTypesDir, 'storefront.types.d.ts')

        expect(await access(path).then(() => true).catch(() => false)).toBe(true)

        // Read the types file content
        const typesContent = await readFile(path, 'utf-8')

        // Check that the types file exists and is not empty
        expect(typesContent).toBeDefined()
        expect(typesContent.length).toBeGreaterThan(0)
    })

    it('should generate admin api types', async () => {
        const path = join(playgroundAdminTypesDir, 'admin.types.d.ts')

        expect(await access(path).then(() => true).catch(() => false)).toBe(true)

        // Read the types file content
        const typesContent = await readFile(path, 'utf-8')

        // Check that the types file exists and is not empty
        expect(typesContent).toBeDefined()
        expect(typesContent.length).toBeGreaterThan(0)
    })

    it('should generate storefront api operations', async () => {
        const path = join(playgroundStorefrontTypesDir, 'storefront.operations.d.ts')

        expect(await access(path).then(() => true).catch(() => false)).toBe(true)

        // Read the operations file content
        const operationsContent = await readFile(path, 'utf-8')

        // Check that it contains expected GraphQL operations
        expect(operationsContent).toContain('FetchAsyncProductsQuery')
        expect(operationsContent).toContain('FetchProductsQuery')
        expect(operationsContent).toContain('FetchFirstThreeProductsQuery')

        // Check that it contains expected GraphQL fragments
        expect(operationsContent).toContain('ProductFieldsFragment')

        // Check that it performs the necessary module type augmentation
        expect(operationsContent).toContain('declare module \'@shopify/storefront-api-client\'')
        expect(operationsContent).toContain('interface StorefrontQueries')
        expect(operationsContent).toContain('interface StorefrontMutations')
    })

    it('should generate admin api operations', async () => {
        const path = join(playgroundAdminTypesDir, 'admin.operations.d.ts')

        expect(await access(path).then(() => true).catch(() => false)).toBe(true)

        // Read the operations file content
        const operationsContent = await readFile(path, 'utf-8')

        // Check that it contains expected GraphQL operations
        expect(operationsContent).toContain('FetchMarketsQuery')

        // Check that it contains expected GraphQL fragments
        expect(operationsContent).toContain('MarketFieldsFragment')

        // Check that it performs the necessary module type augmentation
        expect(operationsContent).toContain('declare module \'@shopify/admin-api-client\'')
        expect(operationsContent).toContain('interface AdminQueries')
        expect(operationsContent).toContain('interface AdminMutations')
    })
})
