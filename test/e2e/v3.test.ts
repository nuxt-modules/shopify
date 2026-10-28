import { describe, expect, it } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils'
import { fileURLToPath } from 'node:url'

const playgroundDir = fileURLToPath(new URL('../../playgrounds/playground-v3', import.meta.url))

describe('test module with nuxt 3', async () => {
  await setup({
    server: true,
    rootDir: playgroundDir,
  })

  it('should create a working server side storefront fetch client', async () => {
    const html = await $fetch('/')

    expect(html).toContain('<p>Product count: 3</p>')
  })

  it('should render app storefront requests with injected fragments on the server', async () => {
    const html = await $fetch('/client')

    expect(html).toContain('<p>Product count: 5</p>')
  })

  it('should create a working async storefront client call', async () => {
    const html = await $fetch('/async')

    expect(html).toContain('<p>Product count: 3</p>')
  })

  it('should create a working admin fetch client', async () => {
    const html = await $fetch('/admin')

    expect(html).toContain('<p>Market count: 3</p>')
  })
})
