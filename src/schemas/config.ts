import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { ConsolaOptions } from 'consola'
import type { CacheOptions, StorageMounts } from 'nitropack'
import type { LRUDriverOptions } from 'unstorage/drivers/lru-cache'

import {
  getCurrentApiVersion,
  getCurrentSupportedApiVersions,
} from '@shopify/graphql-client'
import { kebabCase } from 'scule'
import { z } from 'zod'

export enum ShopifyClientType {
  Storefront = 'storefront',
  CustomerAccount = 'customerAccount',
  Admin = 'admin',
}

function enableable<S extends z.ZodTypeAny>(schema: S, fallback: z.output<S>, enabledByDefault = true) {
  return schema
    .or(z.boolean())
    .optional()
    .default((enabledByDefault ? fallback : false) as never)
    .transform((v): z.output<S> | false => (v === true || v == null ? fallback : v as z.output<S> | false))
}

const proxyPathSchema = (path: string) => enableable(z.object({ path: z.string().optional() }), { path })
const publicProxyPathSchema = (path: string) => enableable(z.object({ path: z.string().optional().default(path) }), { path })

const getDefaultDocuments = (clientType: string, { exclude }: { exclude?: boolean } = {}) => {
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

const ignores = [
  '!node_modules',
  '!dist',
  '!.nuxt',
  '!.output',
]

const defaultStorefrontDocuments = [
  '**/*.{gql,graphql,ts,js,vue}',

  ...getDefaultDocuments(ShopifyClientType.Admin, { exclude: true }),
  ...getDefaultDocuments(ShopifyClientType.CustomerAccount, { exclude: true }),
  ...getDefaultDocuments('customer', { exclude: true }),
  ...getDefaultDocuments('account', { exclude: true }),
  ...ignores,
]

const defaultCustomerAccountDocuments = [
  ...getDefaultDocuments(ShopifyClientType.CustomerAccount),
  ...getDefaultDocuments('customer'),
  ...getDefaultDocuments('account'),
  ...ignores,
]

const defaultAdminDocuments = [
  ...getDefaultDocuments(ShopifyClientType.Admin),
  ...ignores,
]

const defaultCacheOptions = {
  short: { maxAge: 1, staleMaxAge: 9, swr: true },
  long: { maxAge: 3600, staleMaxAge: 82800, swr: true },
} as Record<string, Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>>

const defaultClientCacheOptions = { ttl: 10 * 1000 } as LRUDriverOptions
const defaultProxyCacheOptions = { driver: 'lru-cache' } as StorageMounts[string]
const defaultTokenStorageOptions = { driver: 'memory' } as StorageMounts[string]

const defaultCacheConfig = { client: defaultClientCacheOptions, proxy: defaultProxyCacheOptions, options: defaultCacheOptions }

const defaultCustomerAccountSessionOptions = { name: 'shopify-customer-account', maxAge: 60 * 60 * 24 * 7 }
const defaultCustomerAccountScope = ['openid', 'email', 'customer-account-api:full']

const storageMountSchema = z.any().transform(v => v as StorageMounts[string]).or(z.string())

const clientCacheSchema = z.object({
  client: enableable(z.any().transform(v => v as LRUDriverOptions), defaultClientCacheOptions),
  proxy: enableable(storageMountSchema, defaultProxyCacheOptions),
  options: z.record(z.string(), z.any().transform(v => v as Pick<CacheOptions, 'maxAge' | 'staleMaxAge' | 'swr'>)).optional().default(defaultCacheOptions),
})

const codegenSchema = z.object({
  skip: z.boolean().optional(),
  pluginOptions: z.object({
    typescript: z.any().transform(v => v as TypeScriptPluginConfig).optional(),
  }).optional(),
})

const clientSchema = z.object({
  apiVersion: z.string().refine(v => getCurrentSupportedApiVersions().includes(v), {
    error: v => `Unsupported API version "${v}". Supported versions are: ${getCurrentSupportedApiVersions().join(', ')}`,
  }).optional().default(getCurrentApiVersion().version),
  headers: z.record(z.string(), z.string()).optional(),
  retries: z.number().optional().default(3),
  sandbox: z.boolean().optional().default(true),
  documents: z.array(z.string()).optional(),
  autoImport: z.boolean().optional(),
  codegen: codegenSchema.optional(),
})

const storefrontClientSchema = clientSchema.extend({
  publicAccessToken: z.string().optional(),
  privateAccessToken: z.string().optional(),
  mock: z.boolean().optional(),

  autoImport: z.boolean().optional().default(true),
  documents: clientSchema.shape.documents.transform(v => v || defaultStorefrontDocuments),
  proxy: proxyPathSchema('_proxy/storefront'),
  cache: enableable(clientCacheSchema, defaultCacheConfig),
})

const customerAccountSessionSchema = z.object({
  name: z.string().optional(),
  password: z.string().optional(),
  maxAge: z.number().optional(),
  cookie: z.object({
    domain: z.string().optional(),
    path: z.string().optional(),
    sameSite: z.enum(['lax', 'strict', 'none']).optional(),
    secure: z.boolean().optional(),
  }).optional(),
})

const customerAccountClientSchema = clientSchema.extend({
  apiUrl: z.string().optional(),

  clientId: z.string(),
  clientSecret: z.string().optional(),
  scope: z.array(z.string()).optional().default(defaultCustomerAccountScope).transform(v => v?.length ? v : defaultCustomerAccountScope),

  redirectURL: z.string().optional().default('/'),
  logoutRedirectURL: z.string().optional(),
  loginURL: z.string().optional().default('_auth/customer-account/callback'),
  logoutURL: z.string().optional().default('_auth/customer-account/logout'),
  sessionURL: z.string().optional().default('_auth/customer-account/session'),

  session: customerAccountSessionSchema.optional().transform(v => ({ ...defaultCustomerAccountSessionOptions, ...(v ?? {}) })),
  tokenStorage: enableable(storageMountSchema, defaultTokenStorageOptions),

  documents: clientSchema.shape.documents.transform(v => v || defaultCustomerAccountDocuments),
  proxy: proxyPathSchema('_proxy/customer-account'),

  dev: z.object({
    tunnelURL: z.string().optional(),
    bridgeURL: z.string().optional(),
  }).optional().default({ bridgeURL: '_auth/customer-account/bridge' }).transform(v => v ? { tunnelURL: v.tunnelURL, bridgeURL: v.bridgeURL || '_auth/customer-account/bridge' } : v),
})

const adminClientSchema = clientSchema.extend({
  accessToken: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  refreshToken: z.string().optional(),

  tokenStorage: enableable(storageMountSchema, defaultTokenStorageOptions),
  documents: clientSchema.shape.documents.transform(v => v || defaultAdminDocuments),
})

const webhooksSchema = z.object({
  secret: z.string(),

  hooks: z.array(z.object({
    uri: z.string(),
    topic: z.string(),
    format: z.enum(['JSON', 'XML']).default('JSON').optional(),
    filter: z.string().optional(),
    includeFields: z.array(z.string()).optional(),
    metafieldNamespaces: z.array(z.string()).optional(),
    metafields: z.array(z.object({
      key: z.string(),
      namespace: z.string().optional(),
    })).optional(),
  })).optional(),
})

const analyticsSchema = z.object({
  domain: z.string().optional(),
  shopId: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),
  storefrontId: z.union([z.string(), z.number()]).transform(v => String(v)).optional(),

  language: z.string().optional(),
  currency: z.string().optional(),

  autoPageView: z.boolean().optional().default(true),

  consent: z.object({
    checkoutDomain: z.string().optional(),
    storefrontAccessToken: z.string().optional(),
    withPrivacyBanner: z.boolean().optional().default(false),
    country: z.string().optional(),
    language: z.string().optional(),
  }).optional(),
})

const storefrontClient = storefrontClientSchema
  .transform(client => ({
    ...client,
    ...((client.mock || client.publicAccessToken) ? { documents: ['**/*.vue', ...client.documents] } : {}),
  }))
  .refine(client => client?.mock || client?.privateAccessToken || client?.publicAccessToken, {
    error: 'Either a public or private access token must be provided for the storefront client',
  })

const customerAccountClient = customerAccountClientSchema
  .transform(client => ({ ...client, logoutRedirectURL: client.logoutRedirectURL ?? client.redirectURL }))
  .refine(client => client.clientId, { message: 'Client ID is required for the customer account client' })

const adminClient = adminClientSchema
  .refine(client => client.accessToken || (client.clientId && client.clientSecret), {
    message: 'Either an access token or both client ID and client secret must be provided for the admin client',
  })

export const configSchema = z.object({
  name: z.string({ error: 'Shop name is required' }),

  clients: z.object({
    [ShopifyClientType.Storefront]: storefrontClient.optional(),
    [ShopifyClientType.Admin]: adminClient.optional(),
    [ShopifyClientType.CustomerAccount]: customerAccountClient.optional(),
  }),

  errors: z.object({
    throw: z.boolean().optional().default(true),
  }).optional().default({ throw: true }),

  fragments: z.object({
    paths: z.array(z.string()).optional().default(['/graphql']),
    autoImport: z.boolean().optional().default(true),
  }).optional().default({ paths: ['/graphql'], autoImport: true }),

  graphql: z.object({
    generateConfig: z.boolean().optional().default(true),
  }).optional().default({ generateConfig: true }),

  webhooks: webhooksSchema.optional(),

  analytics: enableable(analyticsSchema, { autoPageView: true }, false),

  logger: z.any().transform(v => v as Partial<ConsolaOptions>).optional(),
})

export const publicConfigSchema = configSchema.omit({ clients: true, fragments: true, webhooks: true }).extend({
  clients: z.object({
    [ShopifyClientType.Storefront]: storefrontClientSchema.omit({
      privateAccessToken: true,
      sandbox: true,
      documents: true,
      codegen: true,
      autoImport: true,
      cache: true,
      proxy: true,
    }).extend({
      proxy: publicProxyPathSchema('_proxy/storefront'),
      cache: enableable(clientCacheSchema.omit({ proxy: true }), { client: defaultClientCacheOptions, options: defaultCacheOptions }),
    }).optional(),

    [ShopifyClientType.CustomerAccount]: customerAccountClientSchema.omit({
      sandbox: true,
      documents: true,
      codegen: true,
      autoImport: true,
      proxy: true,
      clientSecret: true,
      session: true,
      tokenStorage: true,
      logoutRedirectURL: true,
    }).extend({
      proxy: publicProxyPathSchema('_proxy/customer-account'),
    }).optional(),
  }),

  errors: configSchema.shape.errors,
})
