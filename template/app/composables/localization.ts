import type { Locale } from '#i18n'

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

export const useLocalizations = async () => {
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
  const { locale, locales } = useI18n()

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

  const select = async (locale: Locale) => await navigateTo(switchLocalePath(locale))

  return {
    countries,
    languages,
    select,
  }
}

export const useCountries = async () => {
  const { language, country } = useLocalization()
  const { locale } = useI18n()

  const { data: localization } = await useStorefrontData(`countries-${locale.value}`, `#graphql
    query AvailableCountries($language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
      localization {
        availableCountries {
          isoCode
          name
        }
      }
    }
  `, {
    variables: localizationParamsSchema.parse({
      language: language.value,
      country: country.value,
    }),
    transform: data => data?.localization,
    cache: 'long',
  })

  return computed(() => (localization.value?.availableCountries ?? [])
    .map(({ isoCode, name }) => ({ label: name, value: String(isoCode) }))
    .sort((a, b) => a.label.localeCompare(b.label)))
}
