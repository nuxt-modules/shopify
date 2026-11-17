import type { ShopifyDevtoolsRequest } from '#src/runtime/utils/devtools'

import { afterEach, describe, expect, it } from 'vitest'
import { reactive } from 'vue'

import { DEVTOOLS_CHANNEL, postRequest, toDevtoolsRequest } from '#src/runtime/utils/devtools'

const QUERY = 'query FetchProduct($handle: String!) { product(handle: $handle) { title } }'

const panels: BroadcastChannel[] = []

function openPanel() {
  const panel = new BroadcastChannel(DEVTOOLS_CHANNEL)

  panels.push(panel)

  return new Promise<ShopifyDevtoolsRequest>((resolve) => {
    panel.onmessage = (event: MessageEvent<ShopifyDevtoolsRequest>) => resolve(event.data)
  })
}

afterEach(() => {
  for (const panel of panels.splice(0)) panel.close()
})

describe('postRequest', () => {
  it('sends a response to the DevTools panel with its client, source, page, operation name, query, variables, data and duration', async () => {
    const received = openPanel()

    postRequest('storefront', 'ssr', {
      operation: QUERY,
      options: { variables: { handle: 'shirt' } },
      response: { data: { product: { title: 'Shirt' } }, extensions: { cost: { requestedQueryCost: 2 } } },
      duration: 120,
    }, '/products/shirt')

    await expect(received).resolves.toStrictEqual({
      client: 'storefront',
      source: 'ssr',
      page: '/products/shirt',
      operation: 'FetchProduct',
      query: QUERY,
      variables: { handle: 'shirt' },
      data: { product: { title: 'Shirt' } },
      errors: undefined,
      extensions: { cost: { requestedQueryCost: 2 } },
      duration: 120,
      time: expect.any(Number),
    })
  })

  it('sends the query the way Shopify gets it, without duplicate or unused fragments', async () => {
    const received = openPanel()

    const fragment = 'fragment ProductTitle on Product { title }'

    postRequest('storefront', 'ssr', { operation: `query FetchProduct { product(handle: "shirt") { ...ProductTitle } }\n${fragment}\n${fragment}\nfragment Unused on Shop { name }`, response: {}, duration: 1 })

    const { operation, query } = await received

    expect(operation).toBe('FetchProduct')
    expect(query.match(/fragment ProductTitle/g)).toHaveLength(1)
    expect(query).not.toContain('fragment Unused')
  })

  it('sends reactive variables as plain values, which would otherwise fail to cross into the Nuxt process', async () => {
    const received = openPanel()

    postRequest('storefront', 'ssr', { operation: QUERY, options: { variables: { filters: reactive([{ available: true }]) } }, response: {}, duration: 1 })

    await expect(received).resolves.toMatchObject({ variables: { filters: [{ available: true }] } })
  })

  it('keeps the errors without the raw response, which can\'t cross into the Nuxt process', async () => {
    const received = openPanel()

    const graphQLErrors = [{ message: 'Field `nope` doesn\'t exist' }]

    postRequest('admin', 'server', {
      operation: QUERY,
      response: { errors: { message: 'GraphQL Client: An error occurred', networkStatusCode: 200, graphQLErrors, response: new Response() } },
      duration: 1,
    })

    await expect(received).resolves.toMatchObject({
      errors: { message: 'GraphQL Client: An error occurred', networkStatusCode: 200, graphQLErrors },
    })
    expect((await received).errors).not.toHaveProperty('response')
  })

  it('names an operation without a name `Anonymous`', async () => {
    const received = openPanel()

    postRequest('customer-account', 'ssr', { operation: '{ customer { id } }', response: {}, duration: 1 })

    await expect(received).resolves.toMatchObject({ operation: 'Anonymous', variables: undefined })
  })
})

describe('toDevtoolsRequest', () => {
  it('builds a request from the browser without sending it, as the browser sends it over the dev server', async () => {
    const received = openPanel()
    const skipped = new Promise(resolve => setTimeout(resolve, 50, 'skipped'))

    expect(toDevtoolsRequest('storefront', 'browser', { operation: QUERY, response: {} }, '/products/shirt')).toStrictEqual({
      client: 'storefront',
      source: 'browser',
      page: '/products/shirt',
      operation: 'FetchProduct',
      query: QUERY,
      variables: undefined,
      data: undefined,
      errors: undefined,
      extensions: undefined,
      duration: undefined,
      time: expect.any(Number),
    })

    await expect(Promise.race([received, skipped])).resolves.toBe('skipped')
  })
})
