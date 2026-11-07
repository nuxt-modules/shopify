import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { persistSessionPassword } from '#src/utils/session'

const KEY = 'NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD'

const PASSWORD = 'generated-password-with-at-least-32-characters'

let rootDir: string

const readEnv = () => readFile(join(rootDir, '.env'), 'utf8')

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), 'shopify-session-'))
})

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true })
})

describe('persistSessionPassword', () => {
  it('creates the .env file', async () => {
    await expect(persistSessionPassword(rootDir, PASSWORD)).resolves.toBe(true)

    await expect(readEnv()).resolves.toBe(`${KEY}="${PASSWORD}"\n`)
  })

  it('appends the password to an existing .env file', async () => {
    await writeFile(join(rootDir, '.env'), 'NUXT_SHOPIFY_NAME="shop"')

    await persistSessionPassword(rootDir, PASSWORD)

    await expect(readEnv()).resolves.toBe(`NUXT_SHOPIFY_NAME="shop"\n${KEY}="${PASSWORD}"\n`)
  })

  it.each([
    ['an empty', `${KEY}=`],
    ['an empty quoted', `${KEY}=""`],
    ['the example', `${KEY}="A_RANDOM_32_CHARACTER_OR_LONGER_SECRET"`],
    ['a short', `export ${KEY}='short'`],
  ])('replaces %s password in place', async (_, line) => {
    await writeFile(join(rootDir, '.env'), `NUXT_SHOPIFY_NAME="shop"\n${line}\nNUXT_SHOPIFY_WEBHOOKS_SECRET="secret"\n`)

    await expect(persistSessionPassword(rootDir, PASSWORD)).resolves.toBe(true)

    await expect(readEnv()).resolves.toBe(`NUXT_SHOPIFY_NAME="shop"\n${KEY}="${PASSWORD}"\nNUXT_SHOPIFY_WEBHOOKS_SECRET="secret"\n`)
  })

  it('never overwrites a usable password', async () => {
    const content = `${KEY}="${'x'.repeat(48)}"\n`

    await writeFile(join(rootDir, '.env'), content)

    await expect(persistSessionPassword(rootDir, PASSWORD)).resolves.toBe(false)

    await expect(readEnv()).resolves.toBe(content)
  })
})
