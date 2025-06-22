<script setup lang="ts">
import { queryToFilters } from '~/shared/filters'

const props = defineProps<{
    filter: ProductConnectionFieldsFragment['filters'][number]
}>()

const route = useRoute()
const { t } = useI18n()

const priceRange = computed(() => JSON.parse(props.filter.values?.[0]?.input ?? '') as Pick<ProductFilter, 'price'>)

const state = reactive(
    queryToFilters(route.query)?.price
    ?? priceRange.value?.price
    ?? { min: 0, max: 100 },
)

const update = () => {
    // emits('update:filter', 'price', state)
}
</script>

<template>
    <div>
        <p class="text-sm font-semibold mb-2">
            {{ props.filter.label }}
        </p>

        <div class="flex items-center justify-between">
            <UFormField
                name="min"
                :label="t('filters.price.min')"
                class="w-24"
            >
                <UInputNumber
                    v-model="state.min"
                    :min="0"
                    :max="state.max ?? undefined"
                    orientation="vertical"
                    class="w-24"
                    @change="update"
                />
            </UFormField>

            <UFormField
                name="max"
                :label="t('filters.price.max')"
                class="w-24"
            >
                <UInputNumber
                    v-model="state.max"
                    :min="state.min ?? undefined"
                    orientation="vertical"
                    class="w-24"
                    @change="update"
                />
            </UFormField>
        </div>
    </div>
</template>
