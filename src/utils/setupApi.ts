import { join } from 'node:path'
import type { Nuxt } from '@nuxt/schema'
import type { ApiType } from '@shopify/api-codegen-preset'

import { addServerPlugin } from '@nuxt/kit'
import { merge } from 'lodash'
import type { NuxtShopify } from '../types'

import { NuxtShopifyError } from '../errors'
import { getCodegenOption } from './getCodegenConfig'

type SetupParams = {
    nuxt: Nuxt
    apiType: ApiType
    options: NuxtShopify.ModuleOptions
}

export async function setupApi<T extends ApiType>(params: SetupParams & { apiType: T }) {
    const apiType = params.apiType.toLowerCase() as Lowercase<T> & keyof NuxtShopify.ApiTypeOptions

    const options = params.options?.clients?.[apiType] as NuxtShopify.OptionsForApiType<T> | undefined
    if (!options) {
        throw NuxtShopifyError.MissingClientConfiguration()
    }

    const pluginPath = join(
        import.meta.url,
        `../runtime/server/plugins/${apiType}`,
    )

    addServerPlugin(pluginPath)
    params.nuxt.options.build.transpile.push(pluginPath)

    if (!params.nuxt.options.runtimeConfig._shopify) {
        params.nuxt.options.runtimeConfig._shopify = {
            name: params.options.name,
            debug: params.options.debug,
            clients: {
                [apiType]: options,
            },
        }
    }
    else {
        params.nuxt.options.runtimeConfig._shopify = merge(
            params.nuxt.options.runtimeConfig._shopify, {
                clients: {
                    [apiType]: options,
                },
            },
        )
    }

    return {
        options: params.options,
        codegenOptions: getCodegenOption({
            nuxt: params.nuxt,
            apiType: params.apiType,
            options: options,
        }),
    }
}
