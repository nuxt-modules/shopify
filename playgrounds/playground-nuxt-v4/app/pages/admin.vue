<script setup lang="ts">
const { data: markets } = useFetch('/api/admin/markets')
</script>

<template>
    <div>
        <p
            v-for="market in markets"
            :key="market.name"
        >
            {{ market.name }}
        </p>

        <p>Market count: {{ markets?.length }}</p>
    </div>
</template>
