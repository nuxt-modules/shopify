import { describe, expect, it } from 'vitest'
import { setup, $fetch, fetch, useTestContext } from '@nuxt/test-utils'
import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'

import { DEFAULT_API_VERSION } from '#src/runtime/utils/clients/defaults'

const playgroundDir = fileURLToPath(new URL('../../playgrounds/playground-v4', import.meta.url))

const WEBHOOK_SECRET = 'e2e-webhook-secret'
const WEBHOOK_BODY = JSON.stringify({ id: 1 })

const product = { id: expect.stringMatching(/^gid:\/\/shopify\/Product\/\d+$/) }

function readBuildFile(path: string) {
  return readFile(join(useTestContext().nuxt!.options.buildDir, path), 'utf-8')
}

function sendWebhook(secret: string) {
  return fetch('/api/webhooks/test', {
    method: 'POST',
    body: WEBHOOK_BODY,
    headers: {
      'content-type': 'application/json',
      'x-shopify-hmac-sha256': createHmac('sha256', secret).update(WEBHOOK_BODY).digest('base64'),
    },
  })
}

describe('test module with nuxt 4', async () => {
  await setup({
    server: true,
    rootDir: playgroundDir,
    env: {
      NUXT_SHOPIFY_WEBHOOKS_SECRET: WEBHOOK_SECRET,
    },
  })

  it('should hand the module configuration over to the server runtime', async () => {
    const config = await $fetch('/api/config') as { shopId: string }

    expect(config).toMatchObject({
      name: process.env.NUXT_SHOPIFY_NAME,
      clients: {
        storefront: {
          apiVersion: process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_API_VERSION,
          publicAccessToken: process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN,
        },
        admin: {
          apiVersion: process.env.NUXT_SHOPIFY_CLIENTS_ADMIN_API_VERSION,
        },
        customerAccount: {
          apiVersion: process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_API_VERSION,
          clientId: process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_CLIENT_ID,
        },
      },
    })

    expect(config.shopId).toMatch(/^\d+$/)
  })

  it('should create a working server side storefront fetch client', async () => {
    const html = await $fetch('/')

    expect(html).toContain('<p>Product count: 3</p>')
  })

  it('should render app storefront requests with injected fragments on the server', async () => {
    const html = await $fetch('/client')

    expect(html).toContain('<p>Product count: 5</p>')
  })

  it('should create a working async storefront client call', async () => {
    const html = await $fetch('/async')

    expect(html).toContain('<p>Product count: 3</p>')
  })

  it('should create a working admin fetch client', async () => {
    const html = await $fetch('/admin')

    expect(html).toContain('<p>Market count: 3</p>')
  })

  it('should error when given invalid input, without showing the visitor Shopify\'s errors', async () => {
    const error = await $fetch('/errors').catch(error => error) as { statusCode?: number, data?: { message?: string } }

    expect(error.statusCode).toBe(502)

    expect(error.data?.message).toBe('[shopify] Request to Shopify failed')
    expect(JSON.stringify(error.data)).not.toMatch(/GraphQL error|\(at `products`\)/)
  })

  it('should proxy storefront requests to the store', async () => {
    const response = await $fetch(`/api/${process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_API_VERSION || DEFAULT_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN!,
      },
      body: { query: '{ products(first: 2) { nodes { id } } }' },
    }) as { data: { products: { nodes: unknown[] } } }

    expect(response.data.products.nodes).toEqual([product, product])
  })

  it('should hand a sign-in over to Shopify\'s login page of the configured shop', async () => {
    const { shopId } = await $fetch('/api/config') as { shopId: string }

    const response = await fetch('/account/login', { redirect: 'manual', headers: { 'x-forwarded-proto': 'https' } })

    expect(response.status).toBeGreaterThanOrEqual(300)
    expect(response.status).toBeLessThan(400)

    const location = new URL(response.headers.get('location')!)

    expect(`${location.origin}${location.pathname}`).toBe(`https://shopify.com/authentication/${shopId}/oauth/authorize`)
    expect(location.searchParams.get('client_id')).toBe(process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_CLIENT_ID)
  })

  it('should serve Hydrogen\'s cart route', async () => {
    const response = await fetch('/api/cart', { headers: { accept: 'application/json' } })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should render Shopify\'s scripts into server-rendered pages', async () => {
    const html = await $fetch('/analytics') as string

    expect(html).toContain('id="shopify-analytics-bus"')
  })

  it('should report a logged out customer account session without a session cookie', async () => {
    const session = await $fetch('/account/session')

    expect(session).toEqual({ isLoggedIn: false })
  })

  it('should serve the customer account proxy at its versioned path and refuse a request without a session', async () => {
    const proxy = (version: string) => fetch(`/account/customer/api/${version}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: '{ customer { id } }' }),
    })

    expect((await proxy(process.env.NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_API_VERSION || DEFAULT_API_VERSION)).status).toBe(401)
    expect((await proxy('latest')).status).toBe(400)
  })

  it('should accept a webhook signed with the runtime webhook secret', async () => {
    const response = await sendWebhook(WEBHOOK_SECRET)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
  })

  it('should reject a webhook with a wrong signature', async () => {
    const response = await sendWebhook('wrong-secret')

    expect(response.status).toBe(401)
  })

  it.each([
    ['storefront', 'storefront', 'Storefront', [
      'export type FetchAsyncProductsQuery =',
      'export type FetchProductsQuery =',
      'export type FetchFirstThreeProductsQuery =',
      'export type FetchProductsWithErrorQuery =',
      'export type ProductFieldsFragment =',
      'declare global {',
    ]],
    ['admin', 'admin', 'Admin', [
      'export type FetchMarketsQuery =',
      'export type MarketFieldsFragment =',
    ]],
    ['customer account', 'customer-account', 'CustomerAccount', [
      'export type CustomerDetailsQuery =',
      'export type CustomerFieldsFragment =',
    ]],
  ])('should generate %s api operations', async (_, client, namespace, declarations) => {
    const operations = await readBuildFile(`shopify/${client}/${client}.operations.d.ts`)

    for (const declaration of declarations) expect(operations).toContain(declaration)

    expect(operations).toContain([
      `declare module '@nuxtjs/shopify/${client}' {`,
      `  type InputMaybe<T> = ${namespace}Types.InputMaybe<T>`,
      `  interface ${namespace}Queries extends GeneratedQueryTypes {}`,
      `  interface ${namespace}Mutations extends GeneratedMutationTypes {}`,
      '}',
    ].join('\n'))
  })

  it('should point the graphql config at the schemas the build introspected', async () => {
    const { rootDir, buildDir } = useTestContext().nuxt!.options

    const { default: graphqlConfig } = await import(/* @vite-ignore */ pathToFileURL(join(buildDir, 'graphql.config.mjs')).href)

    const projects = Object.entries<{ schema: string }>(graphqlConfig.projects)

    expect(Object.fromEntries(projects.map(([name, { schema }]) => [name, existsSync(join(rootDir, schema))]))).toEqual({
      admin: true,
      customerAccount: true,
      default: true,
    })
  })
})
