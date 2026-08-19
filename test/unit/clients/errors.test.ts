import { describe, expect, it, vi } from 'vitest'

import useErrors from '#src/runtime/utils/clients/errors'

const graphQLErrors = [{ message: 'Field `nope` doesn\'t exist', path: ['products', 'nope'] }]

describe('client errors', () => {
  it('does nothing when there are no errors', async () => {
    await expect(useErrors(undefined as never, true)).resolves.toBeUndefined()
  })

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

  it('does not throw when throwing is disabled', async () => {
    await expect(useErrors({ graphQLErrors } as never, false)).resolves.toBeUndefined()
  })

  it('always calls the callback, throwing or not', async () => {
    const onErrors = vi.fn()

    await useErrors({ graphQLErrors } as never, false, onErrors)
    await useErrors({ graphQLErrors } as never, true, onErrors).catch(() => {})

    expect(onErrors).toHaveBeenCalledTimes(2)
    expect(onErrors).toHaveBeenCalledWith({ errors: { graphQLErrors } })
  })
})
