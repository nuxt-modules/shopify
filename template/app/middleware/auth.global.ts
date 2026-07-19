import { withLeadingSlash } from 'ufo'

export default defineNuxtRouteMiddleware(async (to) => {
  const { isLoggedIn } = useCustomerAccountSession()
  const { _shopify } = useRuntimeConfig().public

  if (to.path.startsWith('/account')) {
    useSeoMeta({
      robots: 'noindex, nofollow',
    })

    if (!isLoggedIn.value) {
      const loginLink = withLeadingSlash(_shopify?.clients?.customerAccount?.loginURL)

      return navigateTo(loginLink, { external: true })
    }
  }
})
