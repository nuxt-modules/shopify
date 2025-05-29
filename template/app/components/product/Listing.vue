<script setup lang="ts">
import type { AsyncDataRequestStatus } from '#app'
import type { ProductConnectionFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    products?: ProductConnectionFieldsFragment
    status?: AsyncDataRequestStatus
}>()

const emits = defineEmits<{
    loadPrevious: []
    loadNext: []
    resetFilters: []
}>()

const { count } = useFilters()
const { t } = useI18n()
</script>

<template>
    <div>
        <div
            v-if="props.products?.pageInfo.hasPreviousPage"
            class="flex w-full justify-center pb-8 md:mb-8"
        >
            <UButton
                variant="soft"
                color="primary"
                class="cursor-pointer"
                :icon="icons.arrowUp"
                @click="emits('loadPrevious')"
            >
                {{ t('listing.loadPrevious') }}
            </UButton>
        </div>

        <div class="grid w-full grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-3 pb-8">
            <div
                v-for="(product, index) in props.products?.edges"
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
        </div>

        <div
            v-if="props.products?.pageInfo.hasNextPage"
            class="flex w-full justify-center mt-16"
        >
            <UButton
                variant="soft"
                color="primary"
                class="cursor-pointer"
                :icon="icons.arrowDown"
                @click="emits('loadNext')"
            >
                {{ t('listing.loadNext') }}
            </UButton>
        </div>

        <div
            v-if="props.status === 'pending'"
            class="flex justify-center pt-8"
        >
            Loading...
        </div>

        <div
            v-else-if="!props.products || props.products.edges.length === 0"
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
                v-if="count > 0"
                variant="ghost"
                @click="emits('resetFilters')"
            >
                Reset filters
            </UButton>
        </div>
    </div>
</template>
