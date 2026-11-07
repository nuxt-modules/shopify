// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => ({ public: { _shopify: { clients: { customerAccount: {} } } } }),
  useState: (_key: string, init: () => unknown) => ref(init()),
  useRequestEvent: () => undefined,
  navigateTo: vi.fn(),
}))

const { useCustomerAccountSession } = await import('#src/runtime/composables/customer-account/session')

const forms: HTMLFormElement[] = []

beforeEach(() => {
  forms.length = 0
  document.body.innerHTML = ''

  vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
    forms.push(this)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('logout', () => {
  it('posts a form to Hydrogen\'s logout route', () => {
    useCustomerAccountSession().logout()

    expect(forms).toHaveLength(1)
    expect(forms[0]!.method).toBe('post')
    expect(forms[0]!.getAttribute('action')).toBe('/account/logout')
    expect(forms[0]!.isConnected).toBe(true)
  })

  it('passes the return path on', () => {
    useCustomerAccountSession().logout({ returnTo: '/goodbye' })

    expect(new URL(forms[0]!.getAttribute('action')!, 'https://shop.test').searchParams.get('return_to')).toBe('/goodbye')
  })
})
