import { describe, expect, it } from 'vitest'
import { setup, $fetch, fetch } from '@nuxt/test-utils'
import { fileURLToPath } from 'node:url'

import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'

const playgroundDir = fileURLToPath(new URL('../../playgrounds/playground-v4-mock', import.meta.url))

const product = { id: expect.stringMatching(/^gid:\/\/shopify\/Product\/\d+$/) }

describe('test mock.shop integration with nuxt 4', async () => {
  await setup({
    server: true,
    rootDir: playgroundDir,
    nuxtConfig: {
      routeRules: { '/**': { swr: 60 } },
      shopify: { routeTemplates: { product: '/product/:productHandle' } },
    },
  })

  it('should create a working storefront fetch client', async () => {
    const html = await $fetch('/')

    expect(html).toContain('<p>Product count: 5</p>')
  })

  it('should proxy storefront requests to mock.shop through Hydrogen\'s Storefront API proxy', async () => {
    const response = await $fetch(`/api/${DEFAULT_API_VERSION}/graphql.json`, {
      method: 'POST',
      body: { query: '{ products(first: 2) { nodes { id } } }' },
    }) as { data: { products: { nodes: unknown[] } } }

    expect(response.data.products.nodes).toEqual([product, product])
  })

  it('should redirect Shopify\'s product path to the app\'s product page', async () => {
    const response = await fetch('/products/shirt?ref=email', { redirect: 'manual' })

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('/product/shirt?ref=email')
  })

  it('should keep the not found page when Shopify knows no redirect', async () => {
    const response = await fetch('/no-such-page', { redirect: 'manual', headers: { accept: 'text/html' } })

    expect(response.status).toBe(404)
  })
})
