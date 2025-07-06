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
            icon="hugeicons:language-circle"
            variant="navigation"
            class="cursor-pointer shrink md:px-3"
            :ui="{ label: 'font-normal' }"
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
                    icon: 'hugeicons:solid-line-01',
                    onSelect: () => open = false,
                }))"
                :ui="{
                    linkLeadingIcon: 'size-2.5 mt-0.5 text-muted',
                }"
                class="pb-6"
            />
        </template>
    </UDrawer>
</template>
