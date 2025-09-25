<script setup lang="ts">
import type { ProductFilterFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    filters?: ProductFilterFieldsFragment['filters']
}>()

const { t } = useI18n()

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
                component: resolveComponent('FilterPriceRange'),
                ...filterItem,
            }
        case 'LIST':
            return {
                component: resolveComponent('FilterList'),
                ...filterItem,
            }
        case 'BOOLEAN':
            // TODO: Implement
            return undefined
    }
})?.filter(f => f !== undefined))
</script>

<template>
    <div class="lg:mt-14 lg:me-16">
        <div class="lg:sticky lg:top-24">
            <p class="text-xl font-bold mb-4">
                {{ t('filters.title') }}
            </p>

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
