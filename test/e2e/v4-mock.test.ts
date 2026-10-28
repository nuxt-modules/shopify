import { describe, expect, it } from 'vitest'
import { setup, $fetch, useTestContext } from '@nuxt/test-utils'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join } from 'node:path'

const playgroundDir = fileURLToPath(new URL('../../playgrounds/playground-v4-mock', import.meta.url))

const product = { id: expect.stringMatching(/^gid:\/\/shopify\/Product\/\d+$/) }

describe('test mock.shop integration with nuxt 4', async () => {
  await setup({
    server: true,
    rootDir: playgroundDir,
  })

  it('should create a working storefront fetch client', async () => {
    const html = await $fetch('/')

    expect(html).toContain('<p>Product count: 5</p>')
  })

  it('should proxy storefront requests to mock.shop', async () => {
    const response = await $fetch('/_proxy/storefront', {
      method: 'POST',
      body: { query: '{ products(first: 2) { nodes { id } } }' },
    }) as { data: { products: { nodes: unknown[] } } }

    expect(response.data.products.nodes).toEqual([product, product])
  })

  it('should point the graphql config at the schema the build introspected', async () => {
    const { rootDir, buildDir } = useTestContext().nuxt!.options

    const { default: graphqlConfig } = await import(/* @vite-ignore */ pathToFileURL(join(buildDir, 'graphql.config.mjs')).href)

    const projects = Object.entries<{ schema: string }>(graphqlConfig.projects)

    expect(Object.fromEntries(projects.map(([name, { schema }]) => [name, existsSync(join(rootDir, schema))]))).toEqual({
      default: true,
    })
  })
})
