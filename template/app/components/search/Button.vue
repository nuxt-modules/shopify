<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const { t } = useI18n()
</script>

<template>
    <UButton
        variant="navigation"
        class="flex items-center cursor-pointer sm:border sm:border-muted sm:radius-sm hover:text-[var(--ui-text)]"
        @click="open = true"
    >
        <UIcon
            name="hugeicons:search-01"
            class="size-5 sm:mr-1"
        />

        <span class="hidden sm:block">
            {{ t('search.placeholder') }}
        </span>

        <UKbd
            value="meta"
            class="ml-3 hidden text-dimmed sm:flex"
        />

        <UKbd
            value="k"
            class="hidden text-dimmed mr-0.5 sm:flex"
        />
    </UButton>
</template>
