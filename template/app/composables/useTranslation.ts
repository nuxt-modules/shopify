export const useTranslation = () => {
    const { locale, locales } = useI18n()

    const defaultCountry = computed(() => (locales.value.find(l =>
        l.code === locale.value)?.defaultCountry as string ?? 'US').toUpperCase() as CountryCode)

    const country = useCookie<CountryCode>('nuxt-shopify-country', {
        default: () => defaultCountry.value,
        sameSite: 'lax',
    })

    const language = computed(() => locale.value.toUpperCase() as LanguageCode)

    const key = computed(() => `${locale.value}-${country.value}`)

    return {
        country,
        language,
        key,
    }
}
