<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
    <div class="flex flex-col gap-16">
        <Hero
            :title="t('hero.title')"
            :subtitle="t('hero.subtitle')"
            :cta-text="t('hero.cta')"
            cta-link="/collection/shirts"
            class="mt-16"
        />
    </div>
</template>
