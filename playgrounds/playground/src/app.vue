<script setup lang="ts">
const config = await useFetch('/api/config')
const a = useRuntimeConfig()
</script>

<template>
    <pre>{{ config }}</pre>
    <pre>{{ a }}</pre>
</template>
