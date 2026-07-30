import { directoryToURL, resolveModule } from '@nuxt/kit'

export function isInstalled(id: string): boolean {
  try {
    import.meta.resolve(id)
    return true
  }
  catch {
    return false
  }
}

export function isResolvableFrom(id: string, directory: string): boolean {
  try {
    resolveModule(id, { url: directoryToURL(directory) })
    return true
  }
  catch {
    return false
  }
}
