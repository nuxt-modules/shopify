import { describe, expect, it } from 'vitest'
import { setup, $fetch, fetch, useTestContext } from '@nuxt/test-utils'
import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'

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
    const config = await $fetch('/api/config') as { clients: { customerAccount: { apiURL: string } } }

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

    expect(config.clients.customerAccount.apiURL).toContain('/account/customer/api/')
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

  it('should error when given invalid input', async () => {
    const error = await $fetch('/errors').catch(error => error) as { statusCode?: number, data?: { message?: string } }

    expect(error.statusCode).toBe(500)

    expect(error.data?.message).toContain('[shopify] GraphQL error:')
    expect(error.data?.message).toContain('(at `products`)')
  })

  it('should proxy storefront requests to the store', async () => {
    const response = await $fetch('/_proxy/storefront', {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN!,
      },
      body: { query: '{ products(first: 2) { nodes { id } } }' },
    }) as { data: { products: { nodes: unknown[] } } }

    expect(response.data.products.nodes).toEqual([product, product])
  })

  it('should report a logged out customer account session without a session cookie', async () => {
    const session = await $fetch('/_auth/customer-account/session')

    expect(session).toEqual({ loggedIn: false, user: null, loggedInAt: null })
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

  it('should generate storefront api operations', async () => {
    const operations = await readBuildFile('shopify/storefront/storefront.operations.d.ts')

    expect(operations).toContain('export type FetchAsyncProductsQuery =')
    expect(operations).toContain('export type FetchProductsQuery =')
    expect(operations).toContain('export type FetchFirstThreeProductsQuery =')
    expect(operations).toContain('export type FetchProductsWithErrorQuery =')
    expect(operations).toContain('export type ProductFieldsFragment =')

    expect(operations).toContain([
      `declare module '@nuxtjs/shopify/storefront' {`,
      '  type InputMaybe<T> = StorefrontTypes.InputMaybe<T>',
      '  interface StorefrontQueries extends GeneratedQueryTypes {}',
      '  interface StorefrontMutations extends GeneratedMutationTypes {}',
      '}',
    ].join('\n'))

    expect(operations).toContain('declare global {')
  })

  it('should generate admin api operations', async () => {
    const operations = await readBuildFile('shopify/admin/admin.operations.d.ts')

    expect(operations).toContain('export type FetchMarketsQuery =')
    expect(operations).toContain('export type MarketFieldsFragment =')

    expect(operations).toContain([
      `declare module '@nuxtjs/shopify/admin' {`,
      '  type InputMaybe<T> = AdminTypes.InputMaybe<T>',
      '  interface AdminQueries extends GeneratedQueryTypes {}',
      '  interface AdminMutations extends GeneratedMutationTypes {}',
      '}',
    ].join('\n'))
  })

  it('should generate customer account api operations', async () => {
    const operations = await readBuildFile('shopify/customer-account/customer-account.operations.d.ts')

    expect(operations).toContain('export type CustomerDetailsQuery =')
    expect(operations).toContain('export type CustomerFieldsFragment =')

    expect(operations).toContain([
      `declare module '@nuxtjs/shopify/customer-account' {`,
      '  type InputMaybe<T> = CustomerAccountTypes.InputMaybe<T>',
      '  interface CustomerAccountQueries extends GeneratedQueryTypes {}',
      '  interface CustomerAccountMutations extends GeneratedMutationTypes {}',
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
