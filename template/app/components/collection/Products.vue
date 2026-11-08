<script setup lang="ts">
import type { PageInfo } from '#shopify/storefront'

import { useCollection } from '@shopify/hydrogen/vue'

const props = defineProps<{
  products: ProductFieldsFragment[]
  pageInfo?: Pick<PageInfo, 'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'>
  pending?: boolean
}>()

const route = useRoute()
const search = useRouteSearch()

const filtering = useCollection(state => state.status === 'loading')

const loading = computed(() => filtering.value || props.pending)

const pageCursor = computed(() => {
  const params = new URLSearchParams(search.value)

  return params.get('after') ?? params.get('before')
})

const pagePath = (cursor: 'after' | 'before', value?: string | null) => {
  const params = new URLSearchParams(search.value)

  params.delete('after')
  params.delete('before')

  if (value) params.set(cursor, value)

  return params.size ? `${route.path}?${params}` : route.path
}

const grid = useTemplateRef('grid')

watch(pageCursor, () => grid.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
</script>

<template>
  <div
    ref="grid"
    class="scroll-mt-[calc(var(--ui-header-height)+2rem)]"
  >
    <div
      v-if="pageInfo?.hasPreviousPage"
      class="flex w-full justify-center mb-12"
    >
      <UButton
        :to="pagePath('before', pageInfo.startCursor)"
        variant="soft"
        icon="i-lucide-arrow-up"
        :label="$t('pagination.previous')"
      />
    </div>

    <div
      class="grid w-full grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-3 transition-opacity"
      :class="{ 'opacity-50': loading }"
      :aria-busy="loading"
    >
      <ProductCard
        v-for="(product, index) in products"
        :key="product.id"
        :product="product"
        class="pb-14 border-b border-b-default"
        :loading="index < 3 ? 'eager' : 'lazy'"
        carousel
      />
    </div>

    <div
      v-if="pageInfo?.hasNextPage"
      class="flex w-full justify-center mt-14"
    >
      <UButton
        :to="pagePath('after', pageInfo.endCursor)"
        variant="soft"
        icon="i-lucide-arrow-down"
        :label="$t('pagination.next')"
      />
    </div>

    <div
      v-if="!products.length && !loading"
      class="flex items-center justify-center gap-2 py-12"
    >
      <UIcon
        name="i-lucide-triangle-alert"
        class="text-dimmed size-6"
      />

      <p class="text-xl text-dimmed">
        {{ $t('collection.products.notFound') }}
      </p>
    </div>
  </div>
</template>
