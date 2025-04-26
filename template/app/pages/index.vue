<script setup lang="ts">
import type { UseElementBoundingReturn } from '@vueuse/core'

const navigationBounding = inject<UseElementBoundingReturn>('navigation:bounding')
</script>

<template>
    <div class="flex flex-col gap-16">
        <section
            :style="{
                minHeight: `calc(100vh - ${navigationBounding?.height.value}px)`,
            }"
        >
            <Hero
                title="Discover our hand picked collection of timeless vintage pieces"
                class="mt-16"
            />
        </section>

        <section class="h-screen" />

        <ProductSlider />
    </div>
</template>
