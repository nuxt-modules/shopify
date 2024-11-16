<script setup lang="ts">
import type { EmbeddableSandboxOptions } from '@apollo/sandbox/src/EmbeddedSandbox'

import { ApolloSandbox } from '@apollo/sandbox'

import { onMounted } from '#imports'

const props = defineProps<Omit<EmbeddableSandboxOptions, 'target'>>()
const sandbox = new ApolloSandbox({
    target: 'target',
    ...props,
})

onMounted(() => {
    sandbox.injectEmbed()
})
</script>

<template>
    <div id="target" />
</template>
