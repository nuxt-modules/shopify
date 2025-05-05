<script setup lang="ts">
const open = defineModel<boolean>({ default: false })
</script>

<template>
    <UButton
        variant="navigation"
        class="flex items-center cursor-pointer md:border md:border-muted md:radius-sm"
        @click="open = true"
    >
        <UIcon
            :name="icons.search"
            class="size-5 md:mr-1"
        />

        <span class="hidden md:block">
            Search...
        </span>

        <UKbd
            value="meta"
            class="ml-3 hidden text-dimmed md:flex"
        />

        <UKbd
            value="k"
            class="hidden text-dimmed mr-0.5 md:flex"
        />
    </UButton>
</template>
