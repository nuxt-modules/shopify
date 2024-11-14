import type { NuxtTemplate } from '@nuxt/schema'
import type { CodegenTemplateOptions, ShopifyConfig } from '~/src/types'

import { generate } from '@graphql-codegen/cli'
import { addTemplate, addTypeTemplate } from '@nuxt/kit'
import defu from 'defu'
import { join } from 'node:path'

const getContents: NuxtTemplate['getContents'] = async ({ nuxt, options }) => {
    await nuxt.callHook('shopify:codegen:generate', {
        nuxt,
        generates: options.generates,
    })

    return generate({
        cwd: nuxt.options.rootDir,
        generates: options.generates,
        silent: nuxt.options.runtimeConfig._shopify?.debug,
        de,
    }, false).then(result => result.content)
}

export function registerTemplates(config: ShopifyConfig) {
    const entries = Object.entries(defu(
        config.clients.storefront?.codegen ?? {},
        config.clients.admin?.codegen ?? {},
    ))

    for (const entry of entries) {
        const [filename, _config] = entry
        const generates = Object.fromEntries([entry])

        if (filename.endsWith('.d.ts')) {
            addTypeTemplate<CodegenTemplateOptions>({
                // @ts-expect-error - is valid by the condition
                filename: join('types/shopify', filename),
                getContents,
                options: { generates },
            })
        }
        else if (filename.endsWith('.json')) {
            addTemplate<CodegenTemplateOptions>({
                filename: join('schema', filename),
                getContents,
                options: { generates },
            })
        }
        else {
            addTemplate<CodegenTemplateOptions>({
                filename,
                getContents,
                options: { generates },
            })
        }
    }
}
