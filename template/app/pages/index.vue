<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()

useSeoMeta({
    title: `Home | ${shopName}`,
    description: $t('seo.description'),
})
</script>

<template>
    <UContainer class="py-12 lg:py-16">
        <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
            {{ $t('home.title') }}
        </h1>

        <p class="lg:text-lg mb-12 lg:mb-16">
            {{ $t('home.description') }}
        </p>

        <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
            {{ $t('collection.featured') }}
        </h2>

        <div class="mb-12 sm:px-12 lg:mb-16 2xl:px-0">
            <CollectionSlider
                handle="featured"
                :first="12"
            />
        </div>

        <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
            {{ $t('collection.unisex') }}
        </h2>

        <div class="mb-12 sm:px-12 lg:mb-16 2xl:px-0">
            <CollectionSlider
                handle="unisex"
                :first="12"
            />
        </div>

        <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
            {{ $t('collection.all') }}
        </h2>

        <CollectionGrid />
    </UContainer>
</template>
