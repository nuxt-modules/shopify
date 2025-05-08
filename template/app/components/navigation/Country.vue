<script setup lang="ts">
const { country: countryCode } = useCountry()
const { locale } = useI18n()

const { data: countries } = await useFetch('/api/countries', {
    method: 'POST',
    key: `countries-${locale.value}`,
    body: {
        language: locale,
    },
    watch: [locale],
    transform: data => data?.localization?.availableCountries,
})

const open = ref(false)

const country = computed(() => countries.value?.find(c => c.isoCode === countryCode.value))

const getCountryLabel = (c?: typeof country['value']) => `${c?.name} (${c?.currency?.isoCode} ${c?.currency?.symbol})`
</script>

<template>
    <UDrawer
        v-model:open="open"
        title="Country"
        description="Select your country"
        :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
    >
        <UButton
            :label="getCountryLabel(country)"
            :icon="icons.globe"
            variant="navigation"
            class="cursor-pointer"
            @click="open = true"
        />

        <template #body>
            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="vertical"
                :items="countries?.map(country => ({
                    label: getCountryLabel(country),
                    active: country.isoCode === countryCode,
                    onSelect: () => {
                        countryCode = country.isoCode
                        open = false
                    },
                }))"
                class="pb-6"
            />
        </template>
    </UDrawer>
</template>
