import { describe, expect, it, vi } from 'vitest'

vi.mock('#src/utils/templates', () => ({ registerTemplates: vi.fn() }))

const { default: setupCodegen } = await import('#src/setup/codegen')

function createNuxt(options: Record<string, boolean>) {
  return { options: { dev: false, _prepare: false, ...options }, hook: vi.fn() }
}

describe('setupCodegen', () => {
  it('fails a production build on generate failures', () => {
    const nuxt = createNuxt({})

    setupCodegen(nuxt as never, { clients: {} } as never)

    expect(nuxt.hook).toHaveBeenCalledWith('build:before', expect.any(Function))
  })

  it.each(['dev', '_prepare', 'test'])('leaves %s runs alone, as @nuxt/test-utils builds the app before every test run', (mode) => {
    const nuxt = createNuxt({ [mode]: true })

    setupCodegen(nuxt as never, { clients: {} } as never)

    expect(nuxt.hook).not.toHaveBeenCalled()
  })
})
