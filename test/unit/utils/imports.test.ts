import { describe, expect, it, vi } from 'vitest'

import { resolver } from '#test/helpers/nuxt'

const { addImports, addServerImports } = vi.hoisted(() => ({ addImports: vi.fn(), addServerImports: vi.fn() }))

vi.mock('@nuxt/kit', () => ({ addImports, addServerImports, addImportsDir: vi.fn(), addServerImportsDir: vi.fn() }))

const { registerFunctionImports } = await import('#src/utils/imports')

describe('registerFunctionImports', () => {
  it('auto-imports flattenConnection and parseGid from the module\'s own file, so Nitro can type Hydrogen\'s re-export', () => {
    registerFunctionImports(resolver)

    const imports = [
      { from: './runtime/utils/functions', name: 'flattenConnection' },
      { from: './runtime/utils/functions', name: 'parseGid' },
    ]

    expect(addImports).toHaveBeenCalledExactlyOnceWith(imports)
    expect(addServerImports).toHaveBeenCalledExactlyOnceWith(imports)
  })
})
