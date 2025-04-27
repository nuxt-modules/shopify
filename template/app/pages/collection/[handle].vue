<script setup lang="ts">
import type { FilterState } from '~/components/Filters.vue'

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

const collection = computed(() => data.value?.collection)
const products = computed(() => collection.value?.products.edges ?? [])

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
                </template>
            </div>
        </div>
    </div>
</template>
