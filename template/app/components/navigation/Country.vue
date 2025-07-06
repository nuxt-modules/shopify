<script setup lang="ts">
const { country: countryCode } = useCountry()
const storefront = useStorefront()
const { t, locale } = useI18n()

const key = computed(() => `countries-${locale.value}`)

const { data } = await useAsyncData(key, async () => await storefront.request(`#graphql
    query FetchCountries($language: LanguageCode, $country: CountryCode) 
    @inContext(language: $language, country: $country) {
        localization {
            availableCountries {
                ...CountryFields
            }
        }
    }
    ${COUNTRY_FRAGMENT}
`, {
    variables: localizationParamsSchema.parse({
        language: locale.value,
        country: countryCode.value,
    }),
}), {
    transform: data => data.data?.localization?.availableCountries,
})

const open = ref(false)

const country = computed(() => data.value?.find(c => c.isoCode === countryCode.value))

const getCountryLabel = (c?: typeof country.value) => `${c?.name} (${c?.currency?.isoCode} ${c?.currency?.symbol})`
</script>

<template>
    <UDrawer
        v-model:open="open"
        :title="t('country.label')"
        :description="t('country.select')"
        :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
    >
        <UButton
            :label="getCountryLabel(country)"
            icon="hugeicons:globe-02"
            variant="navigation"
            class="cursor-pointer md:px-3"
            :ui="{ label: 'font-normal' }"
            @click="open = true"
        />

        <template #body>
            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="vertical"
                :items="data?.map(country => ({
                    label: getCountryLabel(country),
                    active: country.isoCode === countryCode,
                    icon: 'hugeicons:solid-line-01',
                    onSelect: () => {
                        countryCode = country.isoCode
                        open = false
                    },
                }))"
                :ui="{
                    linkLeadingIcon: 'size-2.5 mt-0.5 text-muted',
                }"
                class="pb-6"
            />
        </template>
    </UDrawer>
</template>
