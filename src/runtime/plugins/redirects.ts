import { defineNuxtPlugin, navigateTo } from '#imports'

export default defineNuxtPlugin({
  name: 'shopify:redirects',

  setup(nuxtApp) {
    nuxtApp.hook('app:rendered', async ({ ssrContext }) => {
      if (!ssrContext || ssrContext.error || ssrContext.payload.error?.statusCode !== 404) return

      const { event } = ssrContext

      const redirect = await event.context._shopify?.redirect?.(event)
      const location = redirect?.headers.get('location')

      if (redirect && location) await nuxtApp.runWithContext(() => navigateTo(location, { external: true, redirectCode: redirect.status }))
    })
  },
})
