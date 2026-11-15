import type { ShopifyLocale } from '@shopify/hydrogen'
import type { Nuxt } from 'nuxt/schema'
import type { LocaleObject } from '@nuxtjs/i18n'

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineShopifyI18n } from '@shopify/hydrogen'
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
}

export default defineNuxtModule({
  meta: {
    name: 'shopify-markets',
  },

  setup(_options, nuxt) {
    const logger = useLogger('shopify-markets')

    setLanguageOptions(nuxt)

    nuxt.hook('i18n:registerModule', register => register({
      langDir: resolve(nuxt.options.rootDir, 'i18n/locales'),
      locales: nuxt.options.i18n.locales as LocaleObject[],
    }))

    nuxt.hook('shopify:config', async ({ config }) => {
      if (!config.clients.storefront) return

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

      if (!response?.data) return

      const { country, language, availableCountries } = response.data.localization

      const regionLanguages = new Set(availableCountries
        .flatMap(country => country.availableLanguages.map(language => language.isoCode))
        .filter(isoCode => isoCode.includes('_')))

      if (regionLanguages.size) {
        logger.warn(`Skipping ${[...regionLanguages].join(', ')}: the template's \`<language>-<country>\` locale codes don't support languages with a region.`)
      }

      const markets = availableCountries.flatMap(country =>
        country.availableLanguages.filter(language => !regionLanguages.has(language.isoCode)).map(language => ({
          locale: { language: language.isoCode, country: country.isoCode } as ShopifyLocale,
          name: language.endonymName,
          file: `${language.isoCode.toLowerCase()}.json`,
        })))
        .filter(market => existsSync(resolve(nuxt.options.rootDir, 'i18n/locales', market.file)))

      setLanguageOptions(nuxt, language.isoCode, country.isoCode, markets.map(({ locale, name, file }) => ({
        code: toLocale(locale.language, locale.country),
        language: `${locale.language.toLowerCase()}-${locale.country}`,
        name,
        file,
      })))

      const defaultMarket = markets.find(({ locale }) => toLocale(locale.language, locale.country) === nuxt.options.i18n.defaultLocale)

      if (!defaultMarket) return

      const locales = markets.filter(market => market !== defaultMarket).map(market => market.locale)

      config.i18n = defineShopifyI18n({
        defaultLocale: defaultMarket.locale,
        ...(locales.length ? { routing: { type: 'pathname', locales } } : {}),
      })
    })
  },
})
