import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLoggerStub } from '#test/helpers/logger'
import { resolver } from '#test/helpers/nuxt'

const { addImports, addServerImports } = vi.hoisted(() => ({ addImports: vi.fn(), addServerImports: vi.fn() }))

vi.mock('#src/utils/log', () => ({ useLogger: () => createLoggerStub() }))

vi.mock('@nuxt/kit', () => ({
  addImports,
  addImportsDir: vi.fn(),
  addServerImports,
  addServerImportsDir: vi.fn(),
}))

const { default: setupImports } = await import('#src/setup/imports')

function setup(autoImport = true) {
  const nuxt = { options: { rootDir: '/shop', watch: [] as string[] } }

  setupImports(nuxt as never, { fragments: { dirs: ['graphql'], autoImport }, clients: {} } as never, resolver)

  return nuxt.options.watch
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('setupImports', () => {
  it.each([true, false])('watches the fragment folders with `autoImport: %s`, so editing a fragment there regenerates the types', (autoImport) => {
    expect(setup(autoImport)).toStrictEqual([join('/shop', 'graphql')])
  })

  it('auto-imports flattenConnection and parseGid from the module\'s own file, so Nitro can type Hydrogen\'s re-export', () => {
    setup()

    const imports = [
      { from: './runtime/utils/functions', name: 'flattenConnection' },
      { from: './runtime/utils/functions', name: 'parseGid' },
    ]

    expect(addImports).toHaveBeenCalledExactlyOnceWith(imports)
    expect(addServerImports).toHaveBeenCalledExactlyOnceWith(imports)
  })
})
