<script setup lang="ts">
import { Breadcrumbs } from '#components'

const sortOrder = ref<'asc' | 'desc'>('asc')
const sortBy = ref<'price' | 'title'>('price')

const sortOptions = computed(() => ({
    order: sortOrder.value,
    by: sortBy.value,
}))

watch([sortOrder, sortBy], async ([order, by], [oldOrder, oldBy]) => {
    await sortSchema.parseAsync({ order, by })
        .then((data) => {
            if (data.order !== oldOrder) {
                sortOrder.value = data.order
            }

            if (data.by !== oldBy) {
                sortBy.value = data.by
            }
        })
        .catch(() => {
            sortOrder.value = oldOrder
            sortBy.value = oldBy
        })
})

provide('listing:sort-options', sortOptions)
</script>

<template>
    <UContainer class="flex flex-col pt-4 pb-32">
        <Breadcrumbs />

        <main class="flex flex-col gap-4">
            <slot />
        </main>
    </UContainer>
</template>
