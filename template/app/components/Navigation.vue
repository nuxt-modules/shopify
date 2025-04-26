<script setup lang="ts">
import type { FetchCollectionsQuery } from '#build/types/storefront'

const props = defineProps<{
    collections: FetchCollectionsQuery['collections']['edges']
}>()

const theme = useTheme()
const { numItems } = await useCart()

const items = computed(() => {
    const items = props.collections.map(collection => ({
        label: collection.node.title,
        to: getCollectionAppUrl(collection.node.handle),
    }))

    // @Todo: find a dynamic solution
    const selectedCollections = [
        'Shirts',
        'Jackets',
        'Jeans & Pants',
        'Sweatshirts & Pullovers',
    ]

    return [
        items.filter(item => selectedCollections.includes(item.label)),
        [
            {
                icon: theme.currentIcon,
                onSelect: theme.swap,
            },
            {
                icon: icons.account,
                to: getAccountAppUrl(),
                variant: 'ghost',
            },
            {
                icon: icons.cart,
                to: getCartAppUrl(),
                badge: numItems.value,
            },
        ],
    ]
})
</script>

<template>
    <div class="border-b border-[var(--ui-border)]">
        <UContainer class="flex flex-row justify-evenly items-center">
            <NuxtLink
                to="/"
                class="block mr-4"
            >
                marlz vintage
            </NuxtLink>

            <UNavigationMenu
                highlight
                highlight-color="primary"
                orientation="horizontal"
                :items="items"
                class="grow"
            />
        </UContainer>
    </div>
</template>
