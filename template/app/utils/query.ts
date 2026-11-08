import type { MaybeRefOrGetter } from 'vue'

export const localizedKey = (...parts: Array<MaybeRefOrGetter<string | undefined>>) => {
  const { locale } = useI18n()

  return computed(() => [locale.value, ...parts.map(part => toValue(part)).filter(Boolean)].join('-'))
}
