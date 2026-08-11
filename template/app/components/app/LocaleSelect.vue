<script setup lang="ts">
import type { Locale } from '#i18n'

const { language, country, getLanguage, getCountry } = useLocalization()
const switchLocalePath = useSwitchLocalePath()
const { locale, locales } = useI18n()

const open = ref(false)

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
  variables: localizationParamsSchema.parse({
    language: language.value,
    country: country.value,
  }),
  transform: data => data?.localization,
  cache: 'long',
})

const toLocale = (language: string, country: string) => `${language}-${country}`.toLowerCase() as Locale

const codes = computed(() => new Set<string>(locales.value.map(l => l.code)))

const currentLanguage = computed(() => getLanguage(locale.value))
const currentCountry = computed(() => getCountry(locale.value).toUpperCase())

const flag = (isoCode: string) => String.fromCodePoint(...[...isoCode.toUpperCase()]
  .map(char => 0x1F1A5 + char.charCodeAt(0)))

const countries = computed(() => (localization.value?.availableCountries ?? [])
  .filter(c => codes.value.has(toLocale(currentLanguage.value, c.isoCode)))
  .map(c => ({
    code: String(c.isoCode),
    label: c.name,
    currency: `${c.currency.isoCode} ${c.currency.symbol}`,
  }))
  .sort((a, b) => a.label.localeCompare(b.label)))

const languages = computed(() => {
  const seen = new Map<string, { code: string, label: string }>()

  for (const l of locales.value) {
    const code = getLanguage(l.code)

    if (!seen.has(code) && codes.value.has(toLocale(code, currentCountry.value))) {
      seen.set(code, { code, label: l.name ?? code.toUpperCase() })
    }
  }

  return [...seen.values()]
})

const select = async (language: string, country: string) => {
  open.value = false

  await navigateTo(switchLocalePath(toLocale(language, country)))
}
</script>

<template>
  <UDrawer
    v-model:open="open"
    :title="$t('localization.title')"
    :description="$t('localization.description')"
    should-scale-background
    :ui="{
      header: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8',
    }"
  >
    <slot />

    <template #body>
      <UContainer>
        <div class="flex flex-col gap-6 pb-4 w-full">
          <div>
            <h3 class="text-sm font-semibold text-highlighted mb-2">
              {{ $t('localization.country') }}
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <UButton
                v-for="item in countries"
                :key="item.code"
                :variant="item.code === currentCountry ? 'soft' : 'outline'"
                :color="item.code === currentCountry ? 'primary' : 'neutral'"
                class="justify-between"
                @click="select(currentLanguage, item.code)"
              >
                <span>{{ flag(item.code) }} {{ item.label }}</span>

                <span class="text-dimmed text-xs">{{ item.currency }}</span>
              </UButton>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-highlighted mb-2">
              {{ $t('localization.language') }}
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <UButton
                v-for="item in languages"
                :key="item.code"
                :variant="item.code === currentLanguage ? 'soft' : 'outline'"
                :color="item.code === currentLanguage ? 'primary' : 'neutral'"
                :label="item.label"
                @click="select(item.code, currentCountry)"
              />
            </div>
          </div>
        </div>
      </UContainer>
    </template>
  </UDrawer>
</template>
