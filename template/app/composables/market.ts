type Split<S extends string, D extends string>
    = string extends S ? string[]
        : S extends '' ? []
            : S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>] : [S]

const split = <S extends string, D extends string>(s: S, d: D): Split<S, D> => s.split(d) as Split<S, D>

export const useMarket = () => {
    const { locale } = useI18n()

    const language = computed(() => split(locale.value, '-')[0])
    const country = computed(() => split(locale.value, '-')[1])

    // TODO: Implement different currencies
    const currency = 'EUR'

    return {
        language,
        country,
        currency,
    }
}
