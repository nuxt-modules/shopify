import { directoryToURL } from '@nuxt/kit'
import { resolveModulePath } from 'exsolve'
import { readPackageJSON } from 'pkg-types'

export function resolveInstalledPath(id: string): string | undefined {
  return resolveModulePath(id, { from: import.meta.url, try: true })
}

export function isInstalled(id: string): boolean {
  return !!resolveInstalledPath(id)
}

export function isResolvableFrom(id: string, directory: string): boolean {
  return !!resolveModulePath(id, { from: directoryToURL(directory), try: true })
}

export async function getInstalledVersion(id: string): Promise<string | undefined> {
  const packageJson = await readPackageJSON(id, { from: import.meta.url }).catch(() => undefined)

  return packageJson?.version
}
