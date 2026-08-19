import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.fn()

vi.mock('#src/runtime/utils/clients/admin', () => ({
  createAdminClient: () => ({ request }),
}))

const { getSubscribedWebhooks, subscribeWebhook } = await import('#src/utils/webhooks')

const config = {
  name: 'shop',
  clients: { admin: { apiVersion: '2026-04', accessToken: 'shpat_x', retries: 0 } },
} as never

function page(ids: string[], hasNextPage: boolean, endCursor?: string) {
  return {
    data: {
      webhookSubscriptions: {
        edges: ids.map(id => ({
          node: { id, topic: 'ORDERS_CREATE', endpoint: { __typename: 'WebhookHttpEndpoint', callbackUrl: `https://example.com/${id}` } },
        })),
        pageInfo: { hasNextPage, endCursor },
      },
    },
  }
}

beforeEach(() => {
  request.mockReset()
})

describe('webhook subscriptions', () => {
  it('follows every page of subscriptions', async () => {
    request
      .mockResolvedValueOnce(page(['1', '2'], true, 'cursor-1'))
      .mockResolvedValueOnce(page(['3'], false))

    const subscriptions = await getSubscribedWebhooks(config)

    expect(subscriptions).toHaveLength(3)
    expect(request.mock.calls[0]?.[1]).toMatchObject({ variables: { first: 250, after: undefined } })
    expect(request.mock.calls[1]?.[1]).toMatchObject({ variables: { first: 250, after: 'cursor-1' } })
  })

  it('stops after a single page', async () => {
    request.mockResolvedValueOnce(page(['1'], false))

    await expect(getSubscribedWebhooks(config)).resolves.toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('stops when the API reports another page but returns no cursor', async () => {
    request.mockResolvedValue(page(['1'], true, undefined))

    await expect(getSubscribedWebhooks(config)).resolves.toHaveLength(1)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('reports API errors', async () => {
    request.mockResolvedValueOnce({ errors: { message: 'nope' } })

    await expect(getSubscribedWebhooks(config)).rejects.toThrow(/Failed to fetch webhook subscriptions/)
  })

  it('does not re-create a hook that is already subscribed on a later page', async () => {
    request
      .mockResolvedValueOnce(page(['1'], true, 'cursor-1'))
      .mockResolvedValueOnce(page(['2'], false))

    const results = await subscribeWebhook({
      ...(config as object),
      webhooks: { hooks: [{ topic: 'ORDERS_CREATE', uri: 'https://example.com/2' }] },
    } as never)

    expect(results).toStrictEqual([])
    expect(request).toHaveBeenCalledTimes(2)
  })
})
