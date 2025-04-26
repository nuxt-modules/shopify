<script setup lang="ts">
const items = [
    'https://picsum.photos/468/468?random=1',
    'https://picsum.photos/468/468?random=2',
    'https://picsum.photos/468/468?random=3',
    'https://picsum.photos/468/468?random=4',
    'https://picsum.photos/468/468?random=5',
    'https://picsum.photos/468/468?random=6',
]
</script>

<template>
    <UCarousel
        v-slot="{ item }"
        :items="items"
        align="start"
        :ui="{ item: 'basis-1/3' }"
        class="w-full max-w-screen-md"
    >
        <img
            :src="item"
            width="250"
            height="250"
            class="rounded-lg"
        >
    </UCarousel>
</template>
