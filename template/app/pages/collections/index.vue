<script setup lang="ts">
const { shopify: { shopName } } = useAppConfig()

useSeoMeta({
  title: `${$t('collection.all')} | ${shopName}`,
  description: $t('collection.description'),
})
</script>

<template>
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[{ label: $t('collection.all') }]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ $t('collection.all') }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ $t('collection.description') }}
    </p>

    <CollectionGrid :first="50" />
  </UContainer>
</template>
