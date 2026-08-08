import type { Nuxt } from '@nuxt/schema'

export function onDevServerURL(nuxt: Nuxt, callback: (origin: string) => void) {
  if (!nuxt.options.dev) return

  nuxt.hook('listen', (_server, listener: { url?: string }) => {
    callback(listener?.url || nuxt.options.devServer.url)
  })
}
