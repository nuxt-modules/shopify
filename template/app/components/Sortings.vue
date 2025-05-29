<script setup lang="ts">
const { t } = useI18n()

const currentSort = ref('price')

const open = ref(false)
</script>

<template>
    <div class="flex flex-row gap-3 ml-auto md:gap-4">
        <UButton
            variant="outline"
            size="xs"
            :icon="icons.sortAsc"
            :label="`${t('sort.by')} ${currentSort}: ${t('sort.ascending')}`"
            :ui="{
                label: 'hidden sm:block',
            }"
        />

        <UPopover
            v-model:open="open"
            :content="{
                align: 'end',
                side: 'bottom',
                sideOffset: 12,
            }"
            :ui="{
                content: 'max-w-[320px] w-full',
            }"
        >
            <UButton
                variant="outline"
                size="xs"
                :icon="icons.sort"
                :label="t('sort.label')"
            />

            <template #content>
                <UNavigationMenu
                    highlight
                    highlight-color="primary"
                    orientation="vertical"
                    :items="[
                        {
                            label: t('sort.price'),
                            active: currentSort === 'price',
                            onSelect: () => {
                                currentSort = 'price'
                                open = false
                            },
                        },
                        {
                            label: t('sort.relevance'),
                            active: currentSort === 'relevance',
                            onSelect: () => {
                                currentSort = 'relevance'
                                open = false
                            },
                        },
                        {
                            label: t('sort.releaseDate'),
                            active: currentSort === 'releaseDate',
                            onSelect: () => {
                                currentSort = 'releaseDate'
                                open = false
                            },
                        },
                    ]"
                />
            </template>
        </UPopover>
    </div>
</template>
