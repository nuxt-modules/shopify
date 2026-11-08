import type { Locale } from '#i18n'

import { parseURL } from 'ufo'

type Split<S extends string, D extends string>
  = string extends S ? string[]
    : S extends '' ? []
      : S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S]

const split = <S extends string, D extends string>(s: S, d: D): Split<S, D> => s.split(d) as Split<S, D>

export const useLocalization = () => {
  const { locale } = useI18n()

  const getLanguage = (locale: Locale) => split(locale, '-')[0]
  const getCountry = (locale: Locale) => split(locale, '-')[1]

  const language = computed(() => getLanguage(locale.value))
  const country = computed(() => getCountry(locale.value))

  const params = computed(() => localizationParamsSchema.parse({
    language: language.value,
    country: country.value,
  }))

  return {
    language,
    country,
    params,

    getLanguage,
    getCountry,
  }
}

const useLocalizations = async () => {
  const { params } = useLocalization()

  const { data: localization } = await useStorefrontData(localizedKey('localizations'), `#graphql
    query AllLocalizations($language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
      localization {
        availableCountries {
          isoCode
          name
          currency {
            isoCode
            symbol
            name
          }
        }
      }
    }
  `, {
    variables: params,
    transform: data => data?.localization,
    cache: 'long',
  })

  return localization
}

export const useLocaleSelect = async () => {
  const { getLanguage, getCountry } = useLocalization()
  const switchLocalePath = useSwitchLocalePath()
  const { locale, locales, setLocaleCookie } = useI18n()
  const cartId = useCart(state => state.data.id)
  const storefront = useStorefront()

  const localization = await useLocalizations()

  const toLocale = (language: string, country: string) => `${language}-${country}`.toLowerCase() as Locale

  const toFlag = (isoCode: string) => String.fromCodePoint(...[...isoCode.toUpperCase()]
    .map(char => 0x1F1A5 + char.charCodeAt(0)))

  const codes = computed(() => new Set<string>(locales.value.map(l => l.code)))

  const currentLanguage = computed(() => getLanguage(locale.value))
  const currentCountry = computed(() => getCountry(locale.value).toUpperCase())

  const countries = computed(() => (localization.value?.availableCountries ?? [])
    .filter(c => codes.value.has(toLocale(currentLanguage.value, c.isoCode)))
    .map(c => ({
      code: String(c.isoCode),
      label: c.name,
      flag: toFlag(String(c.isoCode)),
      currency: `${c.currency.isoCode} ${c.currency.symbol}`,
      active: String(c.isoCode) === currentCountry.value,
      locale: toLocale(currentLanguage.value, String(c.isoCode)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label)))

  const languages = computed(() => {
    const seen = new Map<string, { code: string, label: string, active: boolean, locale: Locale }>()

    for (const l of locales.value) {
      const code = getLanguage(l.code)

      if (!seen.has(code) && codes.value.has(toLocale(code, currentCountry.value))) {
        seen.set(code, {
          code,
          label: l.name ?? code.toUpperCase(),
          active: code === currentLanguage.value,
          locale: toLocale(code, currentCountry.value),
        })
      }
    }

    return [...seen.values()]
  })

  const select = async (locale: Locale) => {
    setLocaleCookie(locale)

    if (cartId.value) {
      await storefront.request(`#graphql
        mutation UpdateCartCountry($cartId: ID!, $countryCode: CountryCode!) {
          cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: { countryCode: $countryCode }) {
            cart {
              id
            }
          }
        }
      `, {
        variables: {
          cartId: cartId.value,
          countryCode: localizationParamsSchema.shape.country.parse(getCountry(locale)),
        },
      }).catch(() => undefined)
    }

    const { pathname, search, hash } = parseURL(switchLocalePath(locale))
    const params = new URLSearchParams(search)

    for (const key of [...params.keys()]) {
      if (key.startsWith('filter.') || key === 'after' || key === 'before') params.delete(key)
    }

    await navigateTo(`${pathname}${params.size ? `?${params}` : ''}${hash}`, { external: true })
  }

  return {
    countries,
    languages,
    select,
  }
}

export const useCountries = async () => {
  const localization = await useLocalizations()

  return computed(() => (localization.value?.availableCountries ?? [])
    .map(({ isoCode, name }) => ({ label: name, value: String(isoCode) }))
    .sort((a, b) => a.label.localeCompare(b.label)))
}
