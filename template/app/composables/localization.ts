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
