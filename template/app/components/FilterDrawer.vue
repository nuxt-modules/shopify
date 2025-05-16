<script setup lang="ts">
import type { ProductConnectionFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    filters: ProductConnectionFieldsFragment['filters']
}>()

const { count } = useFilters()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const reset = async () => {
    await router.replace({ query: {
        ...route.query,
        filters: undefined,
        p: undefined,
    } })
}
</script>

<template>
    <UDrawer
        title="Filters"
        description="Quickly find the perfect vintage piece that suits you"
        :ui="{ container: 'w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8' }"
        handle-only
    >
        <UButton
            variant="outline"
            size="xs"
            :icon="icons.filter"
            :label="`${t('filter.label')} ${count > 0 ? `(${count})` : ''}`"
            class="lg:hidden"
        />

        <template #body>
            <Filters
                class="pt-4 pb-10 w-full"
                :filters="props.filters"
            />
        </template>
    </UDrawer>

    <UButton
        v-if="count > 0"
        variant="link"
        color="neutral"
        size="xs"
        :icon="icons.close"
        :label="t('filter.clear')"
        class="lg:hidden"
        @click="reset"
    />
</template>
