import { kebabCase } from 'scule'

import { ShopifyClientType } from '../src/schemas'

const ignores = [
  '!node_modules',
  '!dist',
  '!.nuxt',
  '!.output',
]

const getExpectedDocuments = (clientType: string, { exclude }: { exclude?: boolean } = {}) => {
  const clientName = kebabCase(clientType)
  const fileEndings = ['gql', 'graphql', 'ts', 'js', ...(clientType !== ShopifyClientType.Admin ? ['vue'] : [])].join(',')

  return [
    `${exclude ? '!' : ''}**/*.${clientName}.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/${clientName}.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/${clientName}/**/*.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/${clientName}/*.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/(${clientName})/**/*.{${fileEndings}}`,
    `${exclude ? '!' : ''}**/(${clientName})/*.{${fileEndings}}`,
  ]
}

export const expectedStorefrontDocuments = [
  '**/*.vue',
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
