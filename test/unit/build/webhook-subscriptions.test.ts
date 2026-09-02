import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()

vi.mock('#src/runtime/utils/clients/admin', () => ({
  createAdminClient: () => ({ request }),
}))

const { getSubscribedWebhooks, subscribeWebhook, unsubscribeWebhook } = await import('#src/utils/webhooks')

const config = {
  name: 'shop',
  clients: { admin: { apiVersion: '2026-04', accessToken: 'shpat_x', retries: 0 } },
} as never

const withHooks = (hooks: unknown[]) => ({ ...(config as object), webhooks: { hooks } }) as never

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

interface MutationVariables {
  id?: string
  topic?: string
  webhookSubscription?: Record<string, unknown>
}

interface MutationCall {
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

  it('stops after a single page', async () => {
    request.mockResolvedValueOnce(page([subscription()]))

    await expect(getSubscribedWebhooks(config)).resolves.toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('stops when the API reports another page but returns no cursor', async () => {
    request.mockResolvedValue(page([subscription()], true, undefined))

    await expect(getSubscribedWebhooks(config)).resolves.toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('reports API errors', async () => {
    request.mockResolvedValueOnce({ errors: { message: 'nope' } })

    await expect(getSubscribedWebhooks(config)).rejects.toThrow(/Failed to fetch webhook subscriptions/)
  })
})

describe('creating subscriptions', () => {
  it('creates a hook that is not subscribed yet', async () => {
    const calls = mockApi([])

    const results = await subscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls.map(call => call.kind)).toStrictEqual(['create'])
    expect(results).toStrictEqual([{ action: 'created', subscription: expect.objectContaining({ topic: 'ORDERS_CREATE' }) }])
  })

  it('sends `uri` rather than the deprecated `callbackUrl`', async () => {
    const calls = mockApi([])

    await subscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls[0]?.variables.webhookSubscription).toMatchObject({ uri: 'https://example.com/hook' })
    expect(calls[0]?.variables.webhookSubscription).not.toHaveProperty('callbackUrl')
  })

  it('does not re-create a hook that is already subscribed on a later page', async () => {
    request
      .mockResolvedValueOnce(page([subscription({ id: '1', uri: 'https://example.com/1' })], true, 'cursor-1'))
      .mockResolvedValueOnce(page([subscription({ id: '2', uri: 'https://example.com/2' })]))

    const results = await subscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/2' }]))

    expect(results).toStrictEqual([])
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('updating changed subscriptions', () => {
  it('updates a subscription whose filter changed', async () => {
    const calls = mockApi([subscription({ filter: 'title:old' })])

    const results = await subscribeWebhook(withHooks([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', filter: 'title:new' },
    ]))

    expect(calls.map(call => call.kind)).toStrictEqual(['update'])
    expect(calls[0]?.variables).toMatchObject({
      id: 'gid://shopify/WebhookSubscription/1',
      webhookSubscription: { filter: 'title:new' },
    })
    expect(results).toStrictEqual([{ action: 'updated', subscription: expect.objectContaining({ filter: 'title:new' }) }])
  })

  it('updates a subscription whose filter was removed', async () => {
    const calls = mockApi([subscription({ filter: 'title:old' })])

    await subscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls.map(call => call.kind)).toStrictEqual(['update'])
  })

  it('updates a subscription whose includeFields changed', async () => {
    const calls = mockApi([subscription({ includeFields: ['id'] })])

    await subscribeWebhook(withHooks([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', includeFields: ['id', 'note'] },
    ]))

    expect(calls.map(call => call.kind)).toStrictEqual(['update'])
  })

  it('updates a subscription whose format changed', async () => {
    const calls = mockApi([subscription({ format: 'JSON' })])

    await subscribeWebhook(withHooks([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', format: 'XML' },
    ]))

    expect(calls.map(call => call.kind)).toStrictEqual(['update'])
  })

  it('updates a subscription whose metafields changed', async () => {
    const calls = mockApi([subscription({ metafields: [{ key: 'a', namespace: 'custom' }] })])

    await subscribeWebhook(withHooks([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', metafields: [{ key: 'b', namespace: 'custom' }] },
    ]))

    expect(calls.map(call => call.kind)).toStrictEqual(['update'])
  })

  it('creates rather than updates when the uri differs', async () => {
    const calls = mockApi([subscription({ uri: 'https://example.com/old' })])

    await subscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/new' }]))

    expect(calls.map(call => call.kind)).toStrictEqual(['create'])
  })

  it('reports update errors', async () => {
    request.mockImplementation(async (query: string) => {
      if (query.includes('GetWebhookSubscriptions')) return page([subscription({ filter: 'title:old' })])

      return { data: { webhookSubscriptionUpdate: { webhookSubscription: null, userErrors: [{ field: ['filter'], message: 'bad filter' }] } } }
    })

    await expect(subscribeWebhook(withHooks([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', filter: 'nope:' },
    ]))).rejects.toThrow(/Failed to update webhook subscription/)
  })
})

describe('leaving matching subscriptions alone', () => {
  it('makes no mutation when everything matches', async () => {
    const calls = mockApi([subscription({ filter: 'title:same', includeFields: ['id'] })])

    const results = await subscribeWebhook(withHooks([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook', filter: 'title:same', includeFields: ['id'] },
    ]))

    expect(calls).toStrictEqual([])
    expect(results).toStrictEqual([])
  })

  it('ignores ordering differences in list fields', async () => {
    const calls = mockApi([subscription({
      includeFields: ['note', 'id'],
      metafieldNamespaces: ['b', 'a'],
      metafields: [{ key: 'z', namespace: 'custom' }, { key: 'y', namespace: 'custom' }],
    })])

    await subscribeWebhook(withHooks([{
      topic: 'ORDERS_CREATE',
      uri: 'https://example.com/hook',
      includeFields: ['id', 'note'],
      metafieldNamespaces: ['a', 'b'],
      metafields: [{ key: 'y', namespace: 'custom' }, { key: 'z', namespace: 'custom' }],
    }]))

    expect(calls).toStrictEqual([])
  })

  it('treats an absent filter and a null filter as equal', async () => {
    const calls = mockApi([subscription({ filter: null })])

    await subscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls).toStrictEqual([])
  })

  it('treats an omitted format as JSON', async () => {
    const calls = mockApi([subscription({ format: 'JSON' })])

    await subscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls).toStrictEqual([])
  })
})

describe('unsubscribing', () => {
  it('deletes a matching subscription and returns it', async () => {
    const calls = mockApi([subscription()])

    const results = await unsubscribeWebhook(withHooks([{ topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' }]))

    expect(calls.map(call => call.kind)).toStrictEqual(['delete'])
    expect(calls[0]?.variables).toMatchObject({ id: 'gid://shopify/WebhookSubscription/1' })
    expect(results).toStrictEqual([expect.objectContaining({ uri: 'https://example.com/hook' })])
  })

  it('skips a hook that is not subscribed', async () => {
    const calls = mockApi([subscription({ uri: 'https://example.com/other' })])

    await expect(unsubscribeWebhook(withHooks([
      { topic: 'ORDERS_CREATE', uri: 'https://example.com/hook' },
    ]))).resolves.toStrictEqual([])

    expect(calls).toStrictEqual([])
  })
})
