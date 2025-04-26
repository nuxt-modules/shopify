<script setup lang="ts">
import type { UseElementBoundingReturn } from '@vueuse/core'

const props = defineProps<{
    isFirst?: boolean
    container?: boolean
}>()

const navigationBounding = inject<UseElementBoundingReturn>('navigation:bounding')
</script>

<template>
    <section
        :style="{
            height: props.isFirst ? `calc(100vh - ${navigationBounding?.height.value}px)` : '0px',
        }"
    >
        <UContainer
            v-if="props.container"
            class="flex flex-col gap-16"
        >
            <slot />
        </UContainer>
        <slot v-else />
    </section>
</template>
