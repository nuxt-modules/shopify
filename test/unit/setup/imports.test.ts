import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'
import { resolver } from '#test/helpers/nuxt'

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub() }))

vi.mock('@nuxt/kit', () => ({
  addImports: vi.fn(),
  addImportsDir: vi.fn(),
  addServerImports: vi.fn(),
  addServerImportsDir: vi.fn(),
}))

const { default: setupImports } = await import('#src/setup/imports')

function setup(autoImport: boolean) {
  const nuxt = { options: { rootDir: '/shop', watch: [] as string[] } }

  setupImports(nuxt as never, { fragments: { dirs: ['graphql'], autoImport }, clients: {} } as never, resolver)

  return nuxt.options.watch
}

describe('setupImports', () => {
  it.each([true, false])('watches the fragment folders with `autoImport: %s`, so editing a fragment there regenerates the types', (autoImport) => {
    expect(setup(autoImport)).toStrictEqual([join('/shop', 'graphql')])
  })
})
