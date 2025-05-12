<script setup lang="ts">
import type { FilterFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    filters: FilterFieldsFragment[]
}>()

const state = reactive({})
</script>

<template>
    <div class="flex flex-col gap-4">
        <UForm
            :state="state"
            :validate-on="['change']"
            class="gap-2 flex flex-col"
        >
            <template
                v-for="(filter, index) in props.filters"
                :key="index"
            >
                <FiltersPrice
                    v-if="filter.type === 'PRICE_RANGE'"
                    :filter="filter"
                />
            </template>
        </UForm>
    </div>
</template>
