import type { Nuxt } from 'nuxt/schema'
import type { LocaleObject } from '@nuxtjs/i18n'

import { resolve } from 'node:path'
import { defineNuxtModule } from 'nuxt/kit'
import { createStorefrontClient } from '@nuxtjs/shopify'

const toLocale = (language: string, country: string) => `${language}-${country}`.toLowerCase()

const setLanguageOptions = (nuxt: Nuxt, language?: string, country?: string, locales?: LocaleObject[]) => {
  if (!locales || locales.length === 0) {
    locales = [{
      code: 'en-us',
      language: 'en-US',
      name: 'English',
      file: 'en.json',
    }]
  }

  nuxt.options.i18n.defaultLocale = toLocale(language ?? 'en', country ?? 'US')
  nuxt.options.i18n.locales = locales

  nuxt.hook('i18n:registerModule', register => register({
    langDir: resolve(nuxt.options.rootDir, 'i18n/locales'),
    locales,
  }))
}

export default defineNuxtModule({
  meta: {
    name: 'shopify-markets',
  },

  async setup(_options, nuxt) {
    const config = nuxt.options.runtimeConfig._shopify

    if (!config?.clients?.storefront) {
      setLanguageOptions(nuxt)

      return
    }

    const response = await createStorefrontClient(config).request(`#graphql
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
    `).catch(() => {
      console.log('Failed to fetch available locales from Shopify. Using default `en-US`.')

      return null
    })

    if (!response?.data) {
      setLanguageOptions(nuxt)

      return
    }

    const { country, language, availableCountries } = response.data.localization

    const locales = availableCountries.flatMap(country =>
      country.availableLanguages.map(language => ({
        code: toLocale(language.isoCode, country.isoCode),
        language: `${language.isoCode.toLowerCase()}-${country.isoCode}`,
        name: language.endonymName,
        file: `${language.isoCode.toLowerCase()}.json`,
      })))

    setLanguageOptions(nuxt, language.isoCode, country.isoCode, locales)
  },
})
