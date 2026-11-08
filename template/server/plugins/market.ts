import type { ShopifyScriptsI18n } from '@shopify/hydrogen'

import { CUSTOMER_ACCOUNT_LOGIN_PATH } from '@shopify/hydrogen/customer-account'

export default defineNitroPlugin((nitroApp) => {
  const locales = new Set(useRuntimeConfig().public.i18n.locales.map(locale => (locale as { code: string }).code))

  nitroApp.hooks.hook('request', (event) => {
    const { pathname } = getRequestURL(event)

    const [, segment] = pathname.split('/')

    const prefixed = segment !== 'api' && segment !== 'discount' && pathname !== CUSTOMER_ACCOUNT_LOGIN_PATH

    const locale = prefixed ? segment : getCookie(event, 'i18n_redirected')

    if (!locale || !locales.has(locale)) return

    const [language, country] = locale.split('-')

    event.context.shopifyMarket = {
      language: language!.toUpperCase(),
      country: country!.toUpperCase(),
      pathPrefix: prefixed ? `/${segment}` : undefined,
    } as ShopifyScriptsI18n
  })
})
