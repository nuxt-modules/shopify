import { beforeEach, describe, expect, it, vi } from 'vitest'

const { warn } = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('#src/runtime/utils/log', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() }),
}))

const product = {
  id: 'gid://shopify/Product/1',
  title: 'Hoodie',
  price: { amount: '49.90', currencyCode: 'EUR' },
  vendor: 'Acme',
  variantId: 'gid://shopify/ProductVariant/1',
  variantTitle: 'Black / M',
  quantity: 1,
} as const

async function importValidation() {
  vi.resetModules()

  return import('#src/runtime/utils/analytics/validation')
}

beforeEach(() => {
  warn.mockClear()
})

describe('validateProducts', () => {
  it('accepts complete products without a warning', async () => {
    const { validateProducts } = await importValidation()

    expect(validateProducts([product], 'product_viewed')).toBe(true)
    expect(warn).not.toHaveBeenCalled()
  })

  it('rejects an event without products', async () => {
    const { validateProducts } = await importValidation()

    expect(validateProducts([], 'product_viewed')).toBe(false)
    expect(warn).toHaveBeenCalledWith('Cannot send analytics event `product_viewed`: no products were provided')
  })

  it('names the missing fields of an incomplete product and still sends it', async () => {
    const { validateProducts } = await importValidation()

    expect(validateProducts([{ ...product, vendor: '', price: { ...product.price, amount: '' } }], 'product_viewed')).toBe(true)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('is missing `vendor`, `price`'))
  })

  it('reports each problem once', async () => {
    const { validateProducts } = await importValidation()

    validateProducts([], 'product_viewed')
    validateProducts([], 'product_viewed')

    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('stops warning once it has reported enough distinct problems', async () => {
    const { validateProducts } = await importValidation()

    for (let index = 0; index < 200; index++) {
      validateProducts([{ ...product, id: `gid://shopify/Product/${index}`, vendor: '' }], 'product_viewed')
    }

    expect(warn).toHaveBeenCalledTimes(64)
  })
})
