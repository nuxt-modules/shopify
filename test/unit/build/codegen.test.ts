import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ShopifyClientType } from '#src/schemas'

const generate = vi.fn()

vi.mock('@graphql-codegen/cli', () => ({
  generate: (...args: unknown[]) => generate(...args as []),
}))

const { createIntrospectionGenerator } = await import('#src/utils/codegen')

const FILENAME = 'schema/storefront.2026-01.schema.json'

let dir: string

const pathFor = (name: string) => join(dir, name)

const nuxt = {
  options: { dev: false, _prepare: true },
  callHook: vi.fn(() => Promise.resolve()),
} as never

function introspectionData(introspection?: string) {
  return {
    nuxt,
    options: {
      filename: FILENAME,
      shopName: 'test-shop',
      clientType: ShopifyClientType.Storefront,
      clientConfig: { apiVersion: '2026-01', mock: true },
      introspection,
    },
  } as never
}

function schemaOfCall(index: number) {
  return generate.mock.calls.at(index)![0].generates[FILENAME].schema
}

const succeeds = () => Promise.resolve([{ content: '{"__schema":{}}' }])
const fails = () => Promise.reject(new Error('connect ETIMEDOUT 23.227.38.74:443'))

const MOCK_API_SCHEMA = [{ 'https://mock.shop/api': { headers: {} } }]

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'nuxt-shopify-codegen-'))

  writeFileSync(pathFor('empty.json'), '')
  writeFileSync(pathFor('populated.json'), JSON.stringify({ __schema: { types: [] } }))
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('introspection source', () => {
  beforeEach(() => {
    generate.mockImplementation(succeeds)
  })

  it('uses a stored introspection file that has content', async () => {
    await createIntrospectionGenerator()!(introspectionData(pathFor('populated.json')))

    expect(schemaOfCall(0)).toBe(pathFor('populated.json'))
  })

  it('asks the api when a failed fetch left the file empty', async () => {
    await createIntrospectionGenerator()!(introspectionData(pathFor('empty.json')))

    expect(schemaOfCall(0)).toEqual(MOCK_API_SCHEMA)
  })

  it('asks the api when the file does not exist', async () => {
    await createIntrospectionGenerator()!(introspectionData(pathFor('missing.json')))

    expect(schemaOfCall(0)).toEqual(MOCK_API_SCHEMA)
  })

  it('asks the api when no file is configured', async () => {
    await createIntrospectionGenerator()!(introspectionData())

    expect(schemaOfCall(0)).toEqual(MOCK_API_SCHEMA)
  })
})

describe('introspection retries', () => {
  it('retries when the api call fails', async () => {
    vi.useFakeTimers()

    generate.mockImplementationOnce(fails).mockImplementation(succeeds)

    const result = createIntrospectionGenerator()!(introspectionData())

    await vi.advanceTimersByTimeAsync(60_000)

    await expect(result).resolves.toBe('{"__schema":{}}')
    expect(generate).toHaveBeenCalledTimes(2)
  })

  it('gives up after three tries and uses the hydrogen schema', async () => {
    vi.useFakeTimers()

    generate.mockImplementation(fails)

    const result = createIntrospectionGenerator()!(introspectionData())

    await vi.advanceTimersByTimeAsync(60_000)

    await expect(result).resolves.toBe('')
    expect(generate).toHaveBeenCalledTimes(4)
    expect(schemaOfCall(-1)).toEqual([expect.stringContaining('storefront.schema.json')])
  })

  it('does not retry a local schema file', async () => {
    generate.mockImplementation(fails)

    await expect(createIntrospectionGenerator()!(introspectionData(pathFor('populated.json'))))
      .resolves.toBe('')

    expect(generate).toHaveBeenCalledTimes(1)
  })
})
