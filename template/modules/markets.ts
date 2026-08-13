import { resolve } from 'node:path'
import { defineNuxtModule } from 'nuxt/kit'
import { createStorefrontClient } from '@nuxtjs/shopify'

const toLocale = (language: string, country: string) => `${language}-${country}`.toLowerCase()

export default defineNuxtModule({
  meta: {
    name: 'shopify-markets',
  },

  async setup(_options, nuxt) {
    const config = nuxt.options.runtimeConfig._shopify

    if (!config?.clients?.storefront) return

    const { data } = await createStorefrontClient(config).request(`#graphql
      query FetchAvailableLocales {
        localization {
          country { isoCode }
          language { isoCode }
          availableCountries {
            isoCode
            availableLanguages { isoCode endonymName }
          }
        }
      }
    `)

    if (!data) return

    const { country, language, availableCountries } = data.localization

    const locales = availableCountries.flatMap(country =>
      country.availableLanguages.map(language => ({
        code: toLocale(language.isoCode, country.isoCode),
        language: `${language.isoCode.toLowerCase()}-${country.isoCode}`,
        name: language.endonymName,
        file: `${language.isoCode.toLowerCase()}.json`,
      })))

    nuxt.options.i18n.defaultLocale = toLocale(language.isoCode, country.isoCode)
    nuxt.options.i18n.locales = locales

    nuxt.hook('i18n:registerModule', register => register({
      langDir: resolve(nuxt.options.rootDir, 'i18n/locales'),
      locales,
    }))
  },
})
