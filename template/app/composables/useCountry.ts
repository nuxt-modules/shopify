export const useCountry = () => {
    const { locale, locales } = useI18n()

    const defaultCountry = computed(() => (locales.value.find(l =>
        l.code === locale.value)?.defaultCountry as string ?? 'US').toUpperCase())

    const country = useCookie<string>('nuxt-shopify-country', {
        default: () => defaultCountry.value,
        sameSite: 'lax',
    })

    return {
        country,
    }
}
