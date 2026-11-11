import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'

const request = vi.fn()
const createAdminApiClient = vi.fn(() => ({ request }))

vi.mock('#src/runtime/utils/clients/admin', () => ({ createAdminApiClient }))

const { getSubscribedWebhooks, subscribeWebhooks, unsubscribeWebhooks } = await import('#src/utils/webhooks')
const { configObjectSchema } = await import('#src/runtime/utils/config')

const config = {
  name: 'shop',
  clients: { admin: { apiVersion: API_VERSION, accessToken: 'shpat_x' } },
} as never

const withSubscriptions = (subscriptions: unknown[]) => configObjectSchema.parse({ ...(config as object), webhooks: { subscriptions } }) as never

type Subscription = Record<string, unknown>

const subscription = (overrides: Subscription = {}): Subscription => ({
  id: 'gid://shopify/WebhookSubscription/1',
  topic: 'ORDERS_CREATE',
  uri: 'https://example.com/hook',
  format: 'JSON',
  filter: null,
  includeFields: [],
  metafieldNamespaces: [],
  metafields: [],
  ...overrides,
})

function page(nodes: Subscription[], hasNextPage = false, endCursor?: string) {
  return {
    data: {
      webhookSubscriptions: {
        edges: nodes.map(node => ({ node })),
        pageInfo: { hasNextPage, endCursor },
      },
    },
  }
}

type MutationVariables = {
  id?: string
  topic?: string
  webhookSubscription?: Record<string, unknown>
}

type MutationCall = {
  kind: 'create' | 'update' | 'delete'
  variables: MutationVariables
}

function mockApi(subscriptions: Subscription[]) {
  const calls: MutationCall[] = []

  request.mockImplementation(async (query: string, options?: { variables?: MutationVariables }) => {
    const variables: MutationVariables = options?.variables ?? {}

    if (query.includes('GetWebhookSubscriptions')) return page(subscriptions)

    if (query.includes('WebhookSubscriptionCreate')) {
      calls.push({ kind: 'create', variables })

      return {
        data: {
          webhookSubscriptionCreate: {
            webhookSubscription: subscription({ topic: variables.topic, ...variables.webhookSubscription }),
            userErrors: [],
          },
        },
      }
    }

    if (query.includes('WebhookSubscriptionUpdate')) {
      calls.push({ kind: 'update', variables })

      return {
        data: {
          webhookSubscriptionUpdate: {
            webhookSubscription: subscription({ id: variables.id, ...variables.webhookSubscription }),
            userErrors: [],
          },
        },
      }
    }

    if (query.includes('WebhookSubscriptionDelete')) {
      calls.push({ kind: 'delete', variables })

      return { data: { webhookSubscriptionDelete: { deletedWebhookSubscriptionId: variables.id, userErrors: [] } } }
    }

    throw new Error(`unexpected query: ${query}`)
  })

  return calls
}

beforeEach(() => {
  request.mockReset()
  createAdminApiClient.mockClear()
})

describe('listing subscriptions', () => {
  it('follows every page of subscriptions', async () => {
    request
      .mockResolvedValueOnce(page([subscription({ id: '1' }), subscription({ id: '2' })], true, 'cursor-1'))
      .mockResolvedValueOnce(page([subscription({ id: '3' })]))

    const subscriptions = await getSubscribedWebhooks(config)

    expect(subscriptions).toHaveLength(3)
    expect(request.mock.calls[0]?.[1]).toMatchObject({ variables: { first: 250, after: undefined } })
    expect(request.mock.calls[1]?.[1]).toMatchObject({ variables: { first: 250, after: 'cursor-1' } })
  })

  it.each([
    ['no next page even though it returns a cursor', false, 'cursor-1'],
    ['another page but returns no cursor', true, undefined],
  ])('stops when the API reports %s', async (_, hasNextPage, endCursor) => {
    request.mockResolvedValueOnce(page([subscription()], hasNextPage, endCursor))

    await expect(getSubscribedWebhooks(config)).resolves.toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(1)
  })
})

describe('API errors', () => {
  it.each([
    ['lists', () => getSubscribedWebhooks(config)],
    ['subscribes', () => subscribeWebhooks(config)],
    ['unsubscribes', () => unsubscribeWebhooks(config)],
  ])('lets the admin client throw on API errors when it %s, even with `errors.throw` off', async (_, run) => {
    mockApi([])

    await run()

    expect(createAdminApiClient.mock.calls).toEqual([[config, { throwOnErrors: true }]])
  })
})

describe('creating subscriptions', () => {
  it('creates a subscription that does not exist yet, with `uri` rather than the deprecated `callbackUrl`', async () => {
    const calls = mockApi([])

    const results = await subscribeWebhooks(withSubscriptions([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls).toEqual([{
      kind: 'create',
      variables: {
        topic: 'ORDERS_CREATE',
        webhookSubscription: { uri: 'https://example.com/hook', format: 'JSON', filter: null, includeFields: null, metafieldNamespaces: null, metafields: null },
      },
    }])
    expect(results).toStrictEqual([{ action: 'created', subscription: expect.objectContaining({ topic: 'ORDERS_CREATE' }) }])
  })
})

describe('updating changed subscriptions', () => {
  it('updates a subscription whose filter changed', async () => {
    const calls = mockApi([subscription({ filter: 'title:old' })])

    const results = await subscribeWebhooks(withSubscriptions([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', filter: 'title:new' },
    ]))

    expect(calls.map(call => call.kind)).toStrictEqual(['update'])
    expect(calls[0]?.variables).toMatchObject({
      id: 'gid://shopify/WebhookSubscription/1',
      webhookSubscription: { filter: 'title:new' },
    })
    expect(results).toStrictEqual([{ action: 'updated', subscription: expect.objectContaining({ filter: 'title:new' }) }])
  })

  it('clears the settings the config no longer has, since Shopify keeps the ones an update leaves out', async () => {
    const calls = mockApi([subscription({
      filter: 'title:old',
      includeFields: ['id'],
      metafieldNamespaces: ['custom'],
      metafields: [{ key: 'a', namespace: 'custom' }],
    })])

    await subscribeWebhooks(withSubscriptions([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls).toEqual([{
      kind: 'update',
      variables: {
        id: 'gid://shopify/WebhookSubscription/1',
        webhookSubscription: { uri: 'https://example.com/hook', format: 'JSON', filter: null, includeFields: null, metafieldNamespaces: null, metafields: null },
      },
    }])
  })

  it.each([
    ['includeFields changed', { includeFields: ['id'] }, { includeFields: ['id', 'note'] }],
    ['format changed', { format: 'JSON' }, { format: 'XML' }],
    ['metafields changed', { metafields: [{ key: 'a', namespace: 'custom' }] }, { metafields: [{ key: 'b', namespace: 'custom' }] }],
  ])('updates a subscription whose %s', async (_, existing, configured) => {
    const calls = mockApi([subscription(existing)])

    await subscribeWebhooks(withSubscriptions([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', ...configured }]))

    expect(calls.map(call => call.kind)).toStrictEqual(['update'])
  })

  it('creates rather than updates when the uri differs', async () => {
    const calls = mockApi([subscription({ uri: 'https://example.com/old' })])

    await subscribeWebhooks(withSubscriptions([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/new' }]))

    expect(calls.map(call => call.kind)).toStrictEqual(['create'])
  })

  it('reports update errors', async () => {
    request.mockImplementation(async (query: string) => {
      if (query.includes('GetWebhookSubscriptions')) return page([subscription({ filter: 'title:old' })])

      return { data: { webhookSubscriptionUpdate: { webhookSubscription: null, userErrors: [{ field: ['filter'], message: 'bad filter' }] } } }
    })

    await expect(subscribeWebhooks(withSubscriptions([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', filter: 'nope:' },
    ]))).rejects.toThrow(/Failed to update webhook subscription/)
  })
})

describe('leaving matching subscriptions alone', () => {
  it.each([
    ['everything matches', { filter: 'title:same', includeFields: ['id'] }, { filter: 'title:same', includeFields: ['id'] }],
    ['list fields differ only in order', {
      includeFields: ['note', 'id'],
      metafieldNamespaces: ['b', 'a'],
      metafields: [{ key: 'z', namespace: 'custom' }, { key: 'y', namespace: 'custom' }],
    }, {
      includeFields: ['id', 'note'],
      metafieldNamespaces: ['a', 'b'],
      metafields: [{ key: 'y', namespace: 'custom' }, { key: 'z', namespace: 'custom' }],
    }],
    ['the config leaves out the filter and format, which Shopify reports as null and JSON', { filter: null, format: 'JSON' }, {}],
  ])('makes no mutation when %s', async (_, existing, configured) => {
    const calls = mockApi([subscription(existing)])

    const results = await subscribeWebhooks(withSubscriptions([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', ...configured }]))

    expect(calls).toStrictEqual([])
    expect(results).toStrictEqual([])
  })
})

describe('unsubscribing', () => {
  it('deletes a matching subscription and returns it', async () => {
    const calls = mockApi([subscription()])

    const results = await unsubscribeWebhooks(withSubscriptions([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls.map(call => call.kind)).toStrictEqual(['delete'])
    expect(calls[0]?.variables).toMatchObject({ id: 'gid://shopify/WebhookSubscription/1' })
    expect(results).toStrictEqual([expect.objectContaining({ uri: 'https://example.com/hook' })])
  })

  it('skips a subscription that does not exist', async () => {
    const calls = mockApi([subscription({ uri: 'https://example.com/other' })])

    await expect(unsubscribeWebhooks(withSubscriptions([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' },
    ]))).resolves.toStrictEqual([])

    expect(calls).toStrictEqual([])
  })
})
