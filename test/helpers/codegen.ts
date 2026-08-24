import { kebabCase } from 'scule'

import { ShopifyClientType } from '#src/schemas'

const IGNORED_DIRS = ['node_modules', 'dist', '.nuxt', '.output']

const ignores = IGNORED_DIRS.map(dir => `!${dir}`)

const routeMethods = ['connect', 'delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'].join(',')

function getExpectedDocuments(clientType: string, { exclude }: { exclude?: boolean } = {}) {
  const clientName = kebabCase(clientType)
  const fileEndings = ['gql', 'graphql', 'ts', 'js', ...(clientType !== ShopifyClientType.Admin ? ['vue'] : [])].join(',')

  return [
    `${exclude ? '!' : ''}**/*.${clientName}.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/${clientName}.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/*.${clientName}.{${routeMethods}}.{ts,js}`,
    `${exclude ? '!' : ''}**/${clientName}.{${routeMethods}}.{ts,js}`,
    `${exclude ? '!' : ''}**/${clientName}/**/*.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/${clientName}/*.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/(${clientName})/**/*.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/(${clientName})/*.{${fileEndings}}`,
  ]
}

export const expectedStorefrontDocuments = [
  '**/*.{gql,graphql,ts,js,vue}',
  ...getExpectedDocuments(ShopifyClientType.Admin, { exclude: true }),
  ...getExpectedDocuments(ShopifyClientType.CustomerAccount, { exclude: true }),
  ...getExpectedDocuments('customer', { exclude: true }),
  ...getExpectedDocuments('account', { exclude: true }),
  ...ignores,
]

export const expectedAdminDocuments = [
  ...getExpectedDocuments(ShopifyClientType.Admin),
  ...ignores,
]

export const expectedCustomerAccountDocuments = [
  ...getExpectedDocuments(ShopifyClientType.CustomerAccount),
  ...getExpectedDocuments('customer'),
  ...getExpectedDocuments('account'),
  ...ignores,
]

export function expectedGraphqlProject(schema: string, documents: string[]) {
  const include: string[] = []
  const exclude: string[] = []

  for (const entry of documents) {
    if (!entry.startsWith('!')) {
      include.push(entry)
      continue
    }

    const glob = entry.slice(1)
    exclude.push(IGNORED_DIRS.includes(glob) ? `**/${glob}/**` : glob)
  }

  for (const dir of IGNORED_DIRS) {
    exclude.push(`**/${dir}/**`)
  }
  exclude.push('**/*.d.ts')

  return {
    schema,
    documents: [...new Set(include)],
    exclude: [...new Set(exclude)],
  }
}
