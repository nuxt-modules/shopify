<script setup lang="ts">
const props = defineProps<{
    isFirst?: boolean
    container?: boolean
}>()
</script>

<template>
    <section>
        <UContainer
            v-if="props.container"
            class="flex flex-col gap-16"
        >
            <slot />
        </UContainer>
        <slot v-else />
    </section>
</template>
