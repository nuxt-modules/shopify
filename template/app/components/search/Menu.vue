<script setup lang="ts">
const open = defineModel<boolean>({ default: false })

const groups = ref([
    {
        id: 'queries',
        label: 'Queries',
        items: [
            {
                label: 'Jacket Yellow',
                suffix: '32 products found',
            },
        ],
    },
    {
        id: 'products',
        label: 'Products',
        items: [
            {
                label: 'Benjamin Canac',
                suffix: 'benjamincanac',
                to: 'https://github.com/benjamincanac',
                target: '_blank',
                avatar: {
                    src: 'https://github.com/benjamincanac.png',
                },
            },
            {
                label: 'Sylvain Marroufin',
                suffix: 'smarroufin',
                to: 'https://github.com/smarroufin',
                target: '_blank',
                avatar: {
                    src: 'https://github.com/smarroufin.png',
                },
            },
            {
                label: 'Sébastien Chopin',
                suffix: 'atinux',
                to: 'https://github.com/atinux',
                target: '_blank',
                avatar: {
                    src: 'https://github.com/atinux.png',
                },
            },
            {
                label: 'Romain Hamel',
                suffix: 'romhml',
                to: 'https://github.com/romhml',
                target: '_blank',
                avatar: {
                    src: 'https://github.com/romhml.png',
                },
            },
            {
                label: 'Haytham A. Salama',
                suffix: 'Haythamasalama',
                to: 'https://github.com/Haythamasalama',
                target: '_blank',
                avatar: {
                    src: 'https://github.com/Haythamasalama.png',
                },
            },
            {
                label: 'Daniel Roe',
                suffix: 'danielroe',
                to: 'https://github.com/danielroe',
                target: '_blank',
                avatar: {
                    src: 'https://github.com/danielroe.png',
                },
            },
            {
                label: 'Neil Richter',
                suffix: 'noook',
                to: 'https://github.com/noook',
                target: '_blank',
                avatar: {
                    src: 'https://github.com/noook.png',
                },
            },
        ],
    },
    {
        id: 'collections',
        label: 'Collections',
        items: [
            {
                label: 'My collection',
                suffix: 'Has collection content and such. This is a snippet of text that is not too long.',
            },
        ],
    },
    {
        id: 'pages',
        label: 'Pages',
        items: [
            {
                label: 'My page',
                suffix: 'Has page content and such. This is a snippet of text that is not too long.',
            },
        ],
    },
    {
        id: 'articles',
        label: 'Articles',
        items: [
            {
                label: 'My article',
                suffix: 'Has article content and such. This is a snippet of text that is not too long.',
            },
        ],
    },
])

defineShortcuts({
    meta_k: () => open.value = true,
})
</script>

<template>
    <UModal
        v-model:open="open"
        title="Search"
        description="Search for products, collections, pages, and articles."
    >
        <template #content>
            <UCommandPalette
                v-model:open="open"
                placeholder="Search..."
                :groups="groups"
                :close="true"
            />
        </template>
    </UModal>
</template>
