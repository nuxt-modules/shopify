import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { createUpstreamError, handleErrors } from '#src/runtime/utils/clients/errors'

const graphQLErrors = [{ message: 'Field `nope` doesn\'t exist', path: ['products', 'nope'] }]

function createLogger() {
  const log = vi.fn()

  return { log, logger: { reporters: [{ log }] } }
}

describe('client errors', () => {
  it.each([
    [{ graphQLErrors, networkStatusCode: 200 }, 502, 'Bad Gateway'],
    [{ message: 'fetch failed' }, 502, 'Bad Gateway'],
    [{ graphQLErrors, networkStatusCode: 429 }, 429, 'Too Many Requests'],
    [{ message: 'network down', networkStatusCode: 503 }, 503, 'Service Unavailable'],
  ])('hides Shopify\'s errors from the visitor and keeps only the status of %j', async (errors, statusCode, statusMessage) => {
    const error = await handleErrors(errors as never, true, undefined, createLogger().logger).catch(error => error)

    expect(error).toMatchObject({ statusCode, statusMessage, message: '[shopify] Request to Shopify failed' })
    expect(error.data).toBeUndefined()
    expect(JSON.stringify(error)).not.toMatch(/nope|network down|fetch failed/)
  })

  it('logs Shopify\'s errors in full on the server', async () => {
    const { log, logger } = createLogger()

    await handleErrors({ graphQLErrors } as never, true, undefined, logger).catch(() => undefined)
    await handleErrors({ message: 'network down', networkStatusCode: 503 } as never, true, undefined, logger).catch(() => undefined)

    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', tag: 'shopify', args: [expect.stringContaining('(at `products.nope`)')] }), expect.anything())
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', args: [expect.stringContaining('Request failed with status 503: network down')] }), expect.anything())
  })

  it('logs the status of a failed request and what Shopify answered', async () => {
    const { log, logger } = createLogger()
    const response = new Response('{"errors":"[API] Invalid API key or access token"}', { status: 401 })

    await handleErrors({ message: 'GraphQL Client: ', networkStatusCode: 401, response } as never, true, undefined, logger).catch(() => undefined)

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', args: ['Request failed with status 401: GraphQL Client:  - {"errors":"[API] Invalid API key or access token"}'] }),
      expect.anything(),
    )
  })

  it('never logs in the browser, which already has Shopify\'s answer', async () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)
    onTestFinished(() => {
      vi.stubGlobal('__NUXT_CLIENT__', undefined)
    })

    const { log, logger } = createLogger()

    await expect(handleErrors({ graphQLErrors } as never, true, undefined, logger)).rejects.toMatchObject({ statusCode: 502 })

    expect(log).not.toHaveBeenCalled()
  })

  it('keeps Shopify\'s errors on the thrown error\'s cause, so the app can tell them from a failed request', async () => {
    await expect(handleErrors({ graphQLErrors, networkStatusCode: 200 } as never, true, undefined, createLogger().logger)).rejects.toMatchObject({ cause: { graphQLErrors } })
    await expect(handleErrors({ message: 'network down', networkStatusCode: 503 } as never, true, undefined, createLogger().logger)).rejects.not.toHaveProperty('cause.graphQLErrors')
  })

  it('always calls the callback but only throws and logs when throwing is enabled', async () => {
    const onErrors = vi.fn()
    const { log, logger } = createLogger()

    await expect(handleErrors({ graphQLErrors } as never, false, onErrors, logger)).resolves.toBeUndefined()

    expect(log).not.toHaveBeenCalled()

    await expect(handleErrors({ graphQLErrors } as never, true, onErrors, logger)).rejects.toMatchObject({ statusCode: 502 })

    expect(onErrors).toHaveBeenCalledTimes(2)
    expect(onErrors).toHaveBeenCalledWith({ errors: { graphQLErrors } })
  })
})

describe('upstream errors', () => {
  it('logs the detail and hands the visitor only the status', () => {
    const { log, logger } = createLogger()
    const cause = { status: 401, data: { errors: [{ message: 'Invalid client_id shp_123' }] } }

    const error = createUpstreamError(401, 'The Customer Account API rejected the request with status 401: Invalid client_id shp_123', cause, logger)

    expect(error).toMatchObject({ statusCode: 401, statusMessage: 'Unauthorized', message: '[shopify] Request to Shopify failed', cause })
    expect(JSON.stringify(error)).not.toContain('shp_123')
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', args: ['The Customer Account API rejected the request with status 401: Invalid client_id shp_123'] }), expect.anything())
  })
})
