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

  return {
    language,
    country,

    getLanguage,
    getCountry,
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
