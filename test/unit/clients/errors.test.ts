import { describe, expect, it, vi } from 'vitest'

import useErrors from '#src/runtime/utils/clients/errors'

const graphQLErrors = [{ message: 'Field `nope` doesn\'t exist', path: ['products', 'nope'] }]

describe('client errors', () => {
  it('reports graphql errors with their path', async () => {
    await expect(useErrors({ graphQLErrors } as never, true)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: expect.stringContaining('(at `products.nope`)'),
    })
  })

  it('keeps the status Shopify returned', async () => {
    await expect(useErrors({ graphQLErrors, networkStatusCode: 429 } as never, true)).rejects.toMatchObject({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
    })
  })

  it('falls back to 500 when the network status is not an error', async () => {
    await expect(useErrors({ graphQLErrors, networkStatusCode: 200 } as never, true)).rejects.toMatchObject({ statusCode: 500 })
  })

  it('reports a transport error without graphql errors', async () => {
    await expect(useErrors({ message: 'network down', networkStatusCode: 503 } as never, true)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: expect.stringContaining('Request failed: network down'),
    })
  })

  it('always calls the callback but only throws when throwing is enabled', async () => {
    const onErrors = vi.fn()

    await expect(useErrors({ graphQLErrors } as never, false, onErrors)).resolves.toBeUndefined()
    await expect(useErrors({ graphQLErrors } as never, true, onErrors)).rejects.toMatchObject({ statusCode: 500 })

    expect(onErrors).toHaveBeenCalledTimes(2)
    expect(onErrors).toHaveBeenCalledWith({ errors: { graphQLErrors } })
  })
})
