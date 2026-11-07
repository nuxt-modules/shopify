import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const fetch = vi.fn(() => Promise.resolve())
const isReady = ref(false)

vi.mock('#app', () => ({ defineNuxtPlugin: (plugin: unknown) => plugin }))

vi.mock('#src/runtime/composables/customer-account/session', () => ({
  useCustomerAccountSession: () => ({ fetch, isReady }),
}))

const plugin = (await import('#src/runtime/plugins/customer-account/session')).default as unknown as {
  setup: (nuxtApp: { payload: { serverRendered?: boolean }, hook: ReturnType<typeof vi.fn> }) => Promise<void>
}

function nuxtApp(serverRendered: boolean) {
  return { payload: { serverRendered }, hook: vi.fn() }
}

beforeEach(() => {
  isReady.value = false
  fetch.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('customer account session plugin', () => {
  it('reads the session while rendering on the server', async () => {
    vi.stubGlobal('__NUXT_SERVER__', true)

    await plugin.setup(nuxtApp(true))

    expect(fetch).toHaveBeenCalledOnce()
  })

  it('reads the session of a prerendered page only after hydration, so the page hydrates against its own HTML', async () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    const app = nuxtApp(true)

    await plugin.setup(app)

    expect(fetch).not.toHaveBeenCalled()
    expect(app.hook).toHaveBeenCalledExactlyOnceWith('app:mounted', fetch)
  })

  it('reads the session before rendering a page that has no server HTML', async () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    const app = nuxtApp(false)

    await plugin.setup(app)

    expect(fetch).toHaveBeenCalledOnce()
    expect(app.hook).not.toHaveBeenCalled()
  })

  it('keeps the session the server already read, without reading it again after hydration', async () => {
    vi.stubGlobal('__NUXT_CLIENT__', true)

    isReady.value = true

    const app = nuxtApp(true)

    await plugin.setup(app)

    expect(fetch).not.toHaveBeenCalled()
    expect(app.hook).not.toHaveBeenCalled()
  })
})
