<script setup lang="ts">
import {
    type AdminOptions,
    type ShopifyClientConfig,
    type StorefrontOptions,
} from '~/src/types';

import { join } from 'node:path';
import { ShopifyClientType } from '~/src/utils';
import { createError, useRoute } from '#imports';
import ApolloSandbox from '../components/ApolloSandbox.vue';

const { meta } = useRoute()
const clientType = meta.clientType as ShopifyClientType
const clientConfig = meta.clientConfig as ShopifyClientConfig

let token = ''

switch(clientType) {
    case 'storefront':
        token = (clientConfig as StorefrontOptions).privateAccessToken ?? (clientConfig as StorefrontOptions).publicAccessToken ?? ''

        break
    case 'admin':
        token = (clientConfig as AdminOptions).accessToken

        break
    default: createError({
        name: 'Sandbox error',
        message: 'Could not start Sandbox',
        statusCode: 400,
    })

}

</script>

<template>
    <ApolloSandbox
        :initial-endpoint="join(clientConfig.storeDomain, clientConfig.apiVersion, 'graphql.json')"
        :endpoint-is-editable="false"
        :initial-state="{
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': token,
            }
        }"
    />
</template>
