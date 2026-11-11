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
  it.each([
    ['while rendering on the server', '__NUXT_SERVER__', true, false, 1, []],
    ['of a prerendered page only after hydration, so the page hydrates against its own HTML', '__NUXT_CLIENT__', true, false, 0, [['app:mounted', fetch]]],
    ['before rendering a page that has no server HTML', '__NUXT_CLIENT__', false, false, 1, []],
    ['only once, keeping what the server already read instead of reading it again after hydration', '__NUXT_CLIENT__', true, true, 0, []],
  ])('reads the session %s', async (_, side, serverRendered, ready, fetches, hooks) => {
    vi.stubGlobal(side, true)

    isReady.value = ready

    const app = nuxtApp(serverRendered)

    await plugin.setup(app)

    expect(fetch).toHaveBeenCalledTimes(fetches)
    expect(app.hook.mock.calls).toEqual(hooks)
  })
})
