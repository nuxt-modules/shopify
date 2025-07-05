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

        <span class="hidden text-xs sm:block">
            {{ t('search.placeholder') }}
        </span>

        <UKbd
            value="meta"
            class="hidden ml-3 text-dimmed ring-0 sm:flex"
        />

        <span class="hidden mb-1 -mx-1 text-xs text-dimmed sm:block">
            +
        </span>

        <UKbd
            value="k"
            class="hidden text-dimmed mr-0.5 ring-0 sm:flex"
        />
    </UButton>
</template>
