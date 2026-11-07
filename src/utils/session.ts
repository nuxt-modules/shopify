import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { SESSION_PASSWORD_ENV, isUsableSessionPassword } from '../runtime/utils/session'

export function generateSessionPassword(): string {
  return randomBytes(48).toString('base64url')
}

const SESSION_PASSWORD_LINE = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${SESSION_PASSWORD_ENV}[ \\t]*=(.*)$`, 'm')

const QUOTED = /^(['"])(.*)\1$/

export async function persistSessionPassword(rootDir: string, password: string): Promise<boolean> {
  const envPath = join(rootDir, '.env')
  const line = `${SESSION_PASSWORD_ENV}="${password}"`

  if (!existsSync(envPath)) {
    await writeFile(envPath, `${line}\n`, 'utf8')

    return true
  }

  const content = await readFile(envPath, 'utf8')
  const existing = content.match(SESSION_PASSWORD_LINE)

  if (existing) {
    if (isUsableSessionPassword(existing[1]?.trim().replace(QUOTED, '$2'))) return false

    await writeFile(envPath, content.replace(SESSION_PASSWORD_LINE, line), 'utf8')

    return true
  }

  await appendFile(envPath, `${content.endsWith('\n') || content.length === 0 ? '' : '\n'}${line}\n`, 'utf8')

  return true
}
