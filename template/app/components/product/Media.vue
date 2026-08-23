<script setup lang="ts">
defineProps<{
  media: MediaFieldsFragment
  title?: string
  loading?: 'eager' | 'lazy'
}>()
</script>

<template>
  <iframe
    v-if="media.__typename === 'ExternalVideo'"
    :src="media.embedUrl"
    :title="media.alt ?? title"
    class="aspect-square w-full rounded-md bg-elevated"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    loading="lazy"
  />

  <video
    v-else-if="media.__typename === 'Video' && media.sources.length"
    :poster="media.previewImage?.url ?? undefined"
    class="aspect-square w-full rounded-md bg-elevated object-cover"
    controls
    playsinline
  >
    <source
      v-for="source in media.sources"
      :key="source.url"
      :src="source.url"
      :type="source.mimeType"
    >
  </video>

  <ProductImage
    v-else
    :image="media.__typename === 'MediaImage' ? (media.image ?? undefined) : (media.previewImage ?? undefined)"
    :title="media.alt ?? title"
    :loading="loading"
  />
</template>
