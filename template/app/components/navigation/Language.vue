<script setup lang="ts">
const switchLocalePath = useSwitchLocalePath()
const { t, locale, locales } = useI18n()

const open = ref(false)

const getLanguageLabel = (l?: typeof locale['value']) => `${locales.value?.find(locale => locale.code === l)?.name}`
</script>

<template>
    <UDrawer
        v-model:open="open"
        :title="t('language.label')"
        :description="t('language.select')"
        :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
    >
        <UButton
            :label="getLanguageLabel(locale)"
            :icon="icons.language"
            variant="navigation"
            class="cursor-pointer shrink md:px-3"
            @click="open = true"
        />

        <template #body>
            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="vertical"
                :items="locales?.map(language => ({
                    label: getLanguageLabel(language.code),
                    active: language.code === locale,
                    to: switchLocalePath(language.code),
                    onSelect: () => open = false,
                }))"
                class="pb-6"
            />
        </template>
    </UDrawer>
</template>
