import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const playgroundDir = fileURLToPath(new URL('../playgrounds/playground', import.meta.url))
const playgroundStorefrontTypesDir = fileURLToPath(new URL('../playgrounds/playground/.nuxt/types/storefront', import.meta.url))

describe('test storefront api', async () => {
    await setup({
        server: true,
        rootDir: playgroundDir,
    })

    it('should create a working fetch client', async () => {
        const html = await $fetch('/')

        // Check that we get 5 products
        expect(html).toContain('<p>Product count: 5</p>')
    })

    it('should generate storefront api types', async () => {
        const path = join(playgroundStorefrontTypesDir, 'storefront.types.d.ts')

        expect(await access(path).then(() => true).catch(() => false)).toBe(true)

        // Read the operations file content
        const typesContent = await readFile(path, 'utf-8')

        // Check that the types exist
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
        expect(operationsContent).toContain('ProductFieldsFragment')

        // Check that it performs the necessary module type augmentation
        expect(operationsContent).toContain('declare module \'@shopify/storefront-api-client\'')
        expect(operationsContent).toContain('interface StorefrontQueries')
        expect(operationsContent).toContain('interface StorefrontMutations')
    })
})
