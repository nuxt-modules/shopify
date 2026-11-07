import { directoryToURL } from '@nuxt/kit'
import { resolveModulePath } from 'exsolve'

export function resolveInstalledPath(id: string): string | undefined {
  return resolveModulePath(id, { from: import.meta.url, try: true })
}

export function isResolvableFrom(id: string, directory: string): boolean {
  return !!resolveModulePath(id, { from: directoryToURL(directory), try: true })
}
