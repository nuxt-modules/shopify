<script setup lang="ts">
import type { FilterState } from '~/components/Filters.vue'

import { useMediaQuery } from '@vueuse/core'

import { USeparator } from '#components'

definePageMeta({
    validate: route => typeof route.params.handle === 'string',
    layout: 'listing',
})

const route = useRoute()
const handle = route.params.handle as string

const { data } = await useFetch('/api/collection', {
    method: 'POST',
    body: {
        handle,
        products: {
            first: 6,
        },
    },
})

const isExtraLargeScreen = useMediaQuery('(min-width: 1280px)')
const isLargeScreen = useMediaQuery('(min-width: 1024px)')
const isMediumScreen = useMediaQuery('(min-width: 768px)')
const isSmallScreen = useMediaQuery('(min-width: 480px)')

const collection = computed(() => data.value?.collection)
const products = computed(() => collection.value?.products.edges ?? [])

const isLastColumn = (index: number) => {
    if (isExtraLargeScreen.value) {
        return (index + 1) % 3 === 0
    }

    if (isLargeScreen.value) {
        return (index + 1) % 2 === 0
    }

    if (isMediumScreen.value) {
        return (index + 1) % 2 === 0
    }

    if (isSmallScreen.value) {
        return (index + 1) % 1 === 0
    }

    return false
}

const isLastRow = (index: number) => {
    if (isExtraLargeScreen.value) {
        return index >= products.value.length - 3
    }

    if (isLargeScreen.value) {
        return index >= products.value.length - 2
    }

    if (isMediumScreen.value) {
        return index >= products.value.length - 2
    }

    if (isSmallScreen.value) {
        return index >= products.value.length - 1
    }

    return false
}

const onChange = (state: FilterState) => {
    console.log(state)
}
</script>

<template>
    <div class="flex flex-col gap-8">
        <div class="flex flex-col gap-2">
            <div class="flex flex-row gap-16 grow">
                <h2 class="text-2xl font-bold">
                    {{ collection?.title }}
                </h2>

                <div class="flex grow justify-end">
                    <div class="flex flex-row gap-2">
                        <UButton
                            variant="outline"
                            size="xs"
                            :icon="icons.sortDesc"
                        />

                        <UButton
                            variant="outline"
                            size="xs"
                            :icon="icons.sortAsc"
                            label="Sort by price: low to high"
                        />
                    </div>
                </div>
            </div>

            <USeparator />
        </div>
        <div class="flex flex-row gap-16 grow">
            <aside class="hidden lg:flex w-1/4 min-w-64 sticky">
                <Filters
                    class="sticky top-20 mb-auto"
                    @change="onChange"
                />
            </aside>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-16">
                <template
                    v-for="(product, index) in products"
                    :key="product.node.id"
                >
                    <div class="relative">
                        <ProductCard
                            :product="product"
                            :index="index"
                            padded
                        />

                        <USeparator
                            v-if="!isLastColumn(index)"
                            orientation="vertical"
                            :ui="{
                                root: 'absolute -right-8 top-0 h-full transition-colors duration-200',
                            }"
                        />

                        <USeparator
                            v-if="!isLastRow(index)"
                            orientation="horizontal"
                            :ui="{
                                root: 'absolute -bottom-8 left-0 w-full transition-colors duration-200',
                            }"
                        />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Styles handled by Nuxt UI's utility classes */
</style>
