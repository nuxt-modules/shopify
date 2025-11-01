<script setup lang="ts">
const props = defineProps<{
    title: string
}>()
</script>

<template>
    <UContainer class="relative z-10 py-12 sm:py-18 lg:py-24">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl text-pretty tracking-tight font-bold text-highlighted text-center">
            {{ props.title }}
        </h2>

        <div class="mt-12 flex flex-col gap-x-8 lg:flex-row items-center sm:justify-around">
            <UCard
                class="ring-neutral-700 w-full max-w-[545px] lg:max-w-[392px] shrink-0"
            >
                <slot name="component" />

                <template #footer>
                    <p class="text-center">
                        <slot name="component-title" />
                    </p>
                </template>
            </UCard>

            <div class="grow w-full">
                <slot />
            </div>
        </div>
    </UContainer>
</template>
