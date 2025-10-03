<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'
import type { Locale } from '#i18n'

const { language, country, getCountry } = useLocalization()
const switchLocalePath = useSwitchLocalePath()
const { t, locale, locales } = useI18n()

const { data: localization } = await useStorefrontData(`localizations-${locale.value}`, `#graphql
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
})

const getCountryLabel = (code: Locale) => {
    const country = localization.value?.availableCountries.find(c => c.isoCode === getCountry(code).toUpperCase())

    return `${country?.name} (${country?.currency.isoCode})`
}

const switchLocale = async (locale: string) => navigateTo(switchLocalePath(locale as Locale))

const countries = computed(() => locales.value.map(l => ({
    label: getCountryLabel(l.code),
    value: l.code,
})))

const items = computed<NavigationMenuItem[]>(() => [
    {
        to: 'https://github.com/nuxt-modules/shopify',
        label: 'Github',
    },
    {
        to: 'https://nuxt.com/modules/nuxt-shopify',
        label: 'Module Page',
    },
    {
        to: 'https://shopify.nuxtjs.org',
        label: 'Documentation',
    },
    {
        to: 'https://npmjs.com/package/@nuxtjs/shopify',
        label: 'NPM Package',
    },
].map(item => ({
    ...item,
    target: '_blank',
    icon: 'hugeicons:solid-line-01',
})))
</script>

<template>
    <footer class="pt-8 pb-6 bg-[var(--bg-ui)] border-t border-[var(--ui-border)]">
        <UContainer>
            <div class="md:flex items-center gap-4">
                <Version />

                <USeparator
                    orientation="vertical"
                    class="h-5 mx-2 mt-2 hidden md:block"
                />

                <div class="text-muted mt-2">
                    <UNavigationMenu
                        :items="items"
                        orientation="vertical"
                        :ui="{
                            list: 'md:flex',
                            linkLabel: 'font-normal',
                            linkLabelExternalIcon: 'hidden',
                            linkLeadingIcon: 'size-2.5 mt-0.5 md:hidden',
                        }"
                    />
                </div>
            </div>

            <USeparator class="my-8 md:my-6" />

            <div class="flex flex-col items-center md:flex-row">
                <p class="text-muted grow pb-5 md:pb-0">
                    {{ t('footer.message') }}
                </p>

                <USelect
                    :items="countries"
                    :default-value="locale"
                    icon="i-lucide-globe"
                    class="mr-4"
                    variant="ghost"
                    @update:model-value="async value => switchLocale(value)"
                />

                <UNavigationMenu
                    orientation="horizontal"
                    :items="[
                        {
                            icon: 'i-lucide-github',
                            to: 'https://github.com/nuxt-modules/shopify/tree/main/template',
                            label: t('footer.github'),
                            target: '_blank',
                        },
                    ]"
                    :ui="{
                        linkLabelExternalIcon: 'hidden',
                    }"
                />
            </div>
        </UContainer>
    </footer>
</template>
