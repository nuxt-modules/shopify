<script setup lang="ts">
import type { ProductFilterFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    filters?: ProductFilterFieldsFragment['filters']
}>()

const router = useRouter()
const route = useRoute()

const filters = computed(() => props.filters?.map((filter) => {
    const filterItem = {
        label: filter.label,
        props: {
            filter,
        },
    }

    switch (filter.type) {
        case 'PRICE_RANGE':
            return {
                component: resolveComponent('FilterTypePriceRange'),
                ...filterItem,
            }
        case 'LIST':
            return {
                component: resolveComponent('FilterTypeList'),
                ...filterItem,
            }
        case 'BOOLEAN':
            // TODO: Implement
            return undefined
    }
})?.filter(f => f !== undefined))

const quantity = computed(() => Object.keys(route.query).filter(p => p.includes('filter')).length)

const resetFilters = () => {
    router.push({ query: {} })
}
</script>

<template>
    <div class="lg:mt-14 lg:me-16">
        <div class="lg:sticky lg:top-24">
            <div class="flex justify-between items-center mb-4">
                <p class="text-xl font-bold">
                    {{ $t('filters.title') }}
                </p>

                <div
                    v-if="quantity"
                    class="relative"
                >
                    <UButton
                        variant="ghost"
                        color="primary"
                        class="ms-4"
                        label="Reset Filters"
                        @click="resetFilters"
                    />

                    <UBadge
                        class="absolute font-bold rounded-full -top-1.5 -right-2 px-1.5 font-mono lg:text-xs lg:-right-3 lg:-top-2"
                        size="xs"
                    >
                        {{ quantity }}
                    </UBadge>
                </div>
            </div>

            <UAccordion
                :items="filters"
                type="multiple"
            >
                <template #body="{ item }">
                    <component
                        :is="item.component"
                        v-bind="item.props"
                    />
                </template>
            </UAccordion>
        </div>
    </div>
</template>
