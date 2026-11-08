import type { Nuxt } from 'nuxt/schema'
import type { LocaleObject } from '@nuxtjs/i18n'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineNuxtModule, useLogger } from 'nuxt/kit'
import { createStorefrontApiClient } from '@nuxtjs/shopify'

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

  const defaultLocale = toLocale(language ?? 'en', country ?? 'US')

  nuxt.options.i18n.defaultLocale = locales.some(locale => locale.code === defaultLocale) ? defaultLocale : locales[0]!.code
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
    const logger = useLogger('shopify-markets')

    if (!config?.clients?.storefront) {
      setLanguageOptions(nuxt)

      return
    }

    const response = await createStorefrontApiClient(config).request(`#graphql
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
    `).catch((error) => {
      logger.warn('Failed to fetch available locales from Shopify. Using default `en-US`.', error)

      return null
    })

    if (!response?.data) {
      setLanguageOptions(nuxt)

      return
    }

    const { country, language, availableCountries } = response.data.localization

    const regionLanguages = new Set(availableCountries
      .flatMap(country => country.availableLanguages.map(language => language.isoCode))
      .filter(isoCode => isoCode.includes('_')))

    if (regionLanguages.size) {
      logger.warn(`Skipping ${[...regionLanguages].join(', ')}: the template's \`<language>-<country>\` locale codes don't support languages with a region.`)
    }

    const locales = availableCountries.flatMap(country =>
      country.availableLanguages.filter(language => !regionLanguages.has(language.isoCode)).map(language => ({
        code: toLocale(language.isoCode, country.isoCode),
        language: `${language.isoCode.toLowerCase()}-${country.isoCode}`,
        name: language.endonymName,
        file: `${language.isoCode.toLowerCase()}.json`,
      })))
      .filter(locale => existsSync(resolve(nuxt.options.rootDir, 'i18n/locales', locale.file)))

    setLanguageOptions(nuxt, language.isoCode, country.isoCode, locales)
  },
})
