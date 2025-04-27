<script setup lang="ts">
import type { UseElementBoundingReturn } from '@vueuse/core'

const { t } = useI18n()

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
                :title="t('hero.title')"
                :subtitle="t('hero.subtitle')"
                :cta-text="t('hero.cta')"
                cta-link="/collection/shirts"
                class="mt-16"
            />
        </section>
    </div>
</template>
