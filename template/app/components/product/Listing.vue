<script setup lang="ts">
import type { ProductConnectionFieldsFragment } from '#shopify/storefront'

import { queryToFilters } from '~/shared/filters'

const props = defineProps<{
    products: ProductConnectionFieldsFragment['edges']
}>()

const router = useRouter()
const route = useRoute()

const filters = computed(() => queryToFilters(route.query))

const resetFilters = async () => {
    await router.replace({ query: { ...route.query, filters: undefined } })
}
</script>

<template>
    <div class="grid w-full grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-3">
        <div
            v-for="(product, index) in props.products"
            :key="product.node.id"
            class="relative"
        >
            <ProductCard
                :product="product.node"
                class="h-full"
            />

            <USeparator
                orientation="vertical"
                :ui="{
                    root: [
                        'absolute',
                        '-right-8',
                        'top-0',
                        'h-full',
                        'transition-colors',
                        'duration-200',
                        'hidden',
                        ...[index % 2 > 0 ? 'md:hidden' : 'md:block'],
                        ...[index % 3 > 1 ? 'xl:hidden' : 'xl:block'],
                    ],
                }"
            />

            <USeparator
                orientation="horizontal"
                :ui="{
                    root: [
                        'absolute',
                        '-bottom-8',
                        'left-0',
                        'w-full',
                        'transition-colors',
                        'duration-200',
                    ],
                }"
            />
        </div>

        <div
            v-if="products.length === 0"
            class="flex flex-col justify-center items-center col-span-full text-center"
        >
            <div class="flex items-center pb-2 gap-2">
                <UIcon
                    name="hugeicons:alert-01"
                    class="text-dimmed size-6"
                />

                <p class="text-xl text-dimmed">
                    No products found
                </p>
            </div>

            <UButton
                v-if="Object.keys(filters).length > 0"
                variant="ghost"
                @click="resetFilters"
            >
                Reset filters
            </UButton>
        </div>
    </div>
</template>
