import type { AdminApiClient, AdminOperations } from '@nuxtjs/shopify/admin'

import { useNitroApp } from 'nitropack/runtime'
import { useRuntimeConfig } from '#imports'
import { createClient } from '../../utils/client'
import { createAdminConfig } from '../../utils/clients/admin'
import useErrors from '../../utils/errors'

export function useAdmin(): AdminApiClient {
    const { _shopify } = useRuntimeConfig()

    const config = createAdminConfig(_shopify)

    const nitroApp = useNitroApp()

    nitroApp.hooks.callHook('admin:client:configure', { config })

    const originalClient = createClient<AdminOperations>(config)

    const request: AdminApiClient['request'] = async (operation, options) => {
        nitroApp.hooks.callHook('admin:client:request', { operation, options })

        const response = await originalClient.request(operation, options)

        if (response.errors) useErrors(nitroApp.hooks, 'admin:client:errors', response.errors, _shopify?.errors?.throw ?? false)

        nitroApp.hooks.callHook('admin:client:response', { response, operation, options })

        return response
    }

    const client = { ...originalClient, request } satisfies AdminApiClient

    nitroApp.hooks.callHook('admin:client:create', { client })

    return client
}
