import type { Types } from '@graphql-codegen/plugin-helpers'
import type { NuxtTemplate } from '@nuxt/schema'
import type { ShopifyConfig } from '~/src/types'

import { partition } from '@antfu/utils'
import { type CodegenConfig, generate } from '@graphql-codegen/cli'
import { addTemplate, addTypeTemplate } from '@nuxt/kit'
import { preset } from '@shopify/api-codegen-preset'
import defu from 'defu'
import { join } from 'node:path'

// @TODO: consider implementing everything with graphql-codegen only

// since we are merging the generate steps, we have to remove the importTypes preset
const createPreset = () => ({
    buildGeneratesSection: (options) => {
        const original = preset.buildGeneratesSection(options)

        return original
    },

} satisfies Types.ConfiguredOutput['preset'])

/**
 * Gets called by the template to generate its content
 */
const getContents: NuxtTemplate['getContents'] = async ({ nuxt, options }) => {
    await nuxt.callHook('shopify:codegen:generate', {
        nuxt,
        generates: options.generates,
    })

    const generated = await generate({
        cwd: nuxt.options.rootDir,
        generates: options.generates,
    }, false)

    if (generated.length === 1) {
        return generated[0].content
    }
    else if (generated.length > 1) {
        await Promise.reject(new Error('Multiple files generated'))
    }
}

// merge configs for compatibility with lodash templates
const normalizeTypeGenerates = (identifier: string, original?: CodegenConfig['generates']) => {
    const entries = Object.entries(defu(original ?? {}))
    if (!entries.length) return

    const [targets, others] = partition(entries, ([filename]) => {
        return filename.endsWith('.types.d.ts') || filename.endsWith('.generated.d.ts')
    })

    const mergedGenerates = targets
        .reduce<Types.ConfiguredOutput>(
            (acc, [_, config]) => defu(acc, config),
            {},
        )

    mergedGenerates.preset = createPreset()

    return defu(others, {
        [identifier + '.d.ts']: mergedGenerates,
    })
}

// adds custom (file)templates into the nuxt ecosystem
export function registerTemplates(config: ShopifyConfig) {
    const entries = Object.entries(defu(
        normalizeTypeGenerates('storefront', config.clients.storefront?.codegen) ?? {},
        normalizeTypeGenerates('admin', config.clients.admin?.codegen) ?? {},
    ))

    for (const [filename, generates] of entries) {
        const whatever = { [filename]: generates }

        if (filename.endsWith('.d.ts')) {
            addTypeTemplate({
                // @ts-expect-error - valid by the condition
                filename: join('types', filename),
                getContents,
                options: { generates: whatever },
            })
        }
        else if (filename.endsWith('.json')) {
            addTemplate({
                filename: join('schemas', filename),
                getContents,
                options: { generates: whatever },
            })
        }
        else {
            addTemplate({
                filename,
                getContents,
                options: { generates: whatever },
            })
        }
    }
}
