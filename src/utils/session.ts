import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const SESSION_PASSWORD_ENV = 'NUXT_SHOPIFY_CLIENTS_CUSTOMER_ACCOUNT_SESSION_PASSWORD'

export function generateSessionPassword(): string {
  return randomBytes(48).toString('base64url')
}

export async function persistSessionPassword(rootDir: string, password: string): Promise<void> {
  const envPath = join(rootDir, '.env')
  const line = `${SESSION_PASSWORD_ENV}="${password}"`

  if (!existsSync(envPath)) {
    await writeFile(envPath, `${line}\n`, 'utf8')

    return
  }

  const content = await readFile(envPath, 'utf8')

  if (content.includes(SESSION_PASSWORD_ENV)) return

  await appendFile(envPath, `${content.endsWith('\n') || content.length === 0 ? '' : '\n'}${line}\n`, 'utf8')
}
