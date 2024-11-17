<script setup lang="ts">
import { ApolloSandbox } from '@apollo/sandbox'

import { onMounted } from '#imports'

const props = defineProps<{
    initialEndpoint: string
    apiHeaders: Record<string, string>
}>()

onMounted(() => {
    new ApolloSandbox({
        target: 'target',
        initialEndpoint: props.initialEndpoint,
        endpointIsEditable: false,
        handleRequest: (endpointUrl, options) => {
            return fetch(endpointUrl, {
                ...options,
                headers: {
                    ...options.headers,
                    ...props.apiHeaders,
                },
            })
        },
    })
})
</script>

<template>
    <div id="target" />
</template>
