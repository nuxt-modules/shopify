<script setup lang="ts">
import { ApolloSandbox } from '@apollo/sandbox'

import { ref, onMounted } from '#imports'

const props = defineProps<{
    initialEndpoint: string
    apiHeaders: Record<string, string>
}>()

const el = ref<HTMLDivElement>()

onMounted(() => {
    if (!el.value) return

    new ApolloSandbox({
        target: el.value,
        initialEndpoint: props.initialEndpoint,
        initialState: {
            includeCookies: false,
        },
        runTelemetry: false,
        endpointIsEditable: false,
        handleRequest: (endpointUrl, options) => {
            return fetch(endpointUrl, {
                ...options,
                headers: {
                    ...options.headers,
                    ...props.apiHeaders,
                    ...{
                        'Access-Control-Allow-Origin': props.initialEndpoint,
                    },
                },
            })
        },
    })
})
</script>

<template>
    <div
        ref="el"
        style="height: 100vh"
    />
</template>
