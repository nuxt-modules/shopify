<script setup lang="ts">
import type { CheckboxGroupItem, CheckboxGroupValue } from '#ui/types'

const props = defineProps<{
    filter: ProductConnectionFieldsFragment['filters'][number]
}>()

const { filters } = useFilters()
const { t } = useI18n()

const availabilities = computed(() => props.filter.values?.map(value => ({
    input: JSON.parse(value.input ?? '') as Pick<ProductFilter, 'available'>,
    count: value.count,
})))

const items = computed<CheckboxGroupItem[]>(() => availabilities.value?.map(value => ({
    label: `${t(`filters.availability.${value.input.available}`)} (${value.count})`,
    value: String(value.input.available),
})) ?? [])

const value = ref<CheckboxGroupValue[]>(filters.value?.available !== undefined ? [String(filters.value.available)] : [])

const update = () => {
    const state: Pick<ProductFilter, 'available'> = {}

    if (value.value.length === 1) {
        if (value.value[0] === 'true') state.available = true
        else if (value.value[0] === 'false') state.available = false
    }

    // emits('update:filter', 'available', state.available)
}
</script>

<template>
    <UFormField
        :label="props.filter.label"
        name="available"
    >
        <UCheckboxGroup
            v-model="value"
            :label="props.filter.label"
            :items="items"
            name="available"
            @change="update()"
        />
    </UFormField>
</template>
