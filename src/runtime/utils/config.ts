import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { CacheOptions, CreateCartServerHandlersOptions, CreatePredictiveSearchServerHandlersOptions, I18nConfig, ShopifyRouteTemplates } from '@shopify/hydrogen'
import type { ConsolaOptions } from 'consola'
import type { StorageMounts } from 'nitropack'
import type { LRUDriverOptions } from 'unstorage/drivers/lru-cache'

import { createCartServerHandlers, createPredictiveSearchServerHandlers } from '@shopify/hydrogen'
import { kebabCase } from 'scule'
import { z } from 'zod'

import {
  DEFAULT_API_VERSION,
  DEFAULT_RETRIES,
  DEFAULT_THROW_ERRORS,
  MAX_RETRIES,
  MIN_RETRIES,
  isApiVersion,
} from './clients/defaults'
import { DEFAULT_SESSION_NAME } from './session'

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

const routeMethods = ['connect', 'delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'].join(',')

function getDefaultDocuments(name: string, { exclude }: { exclude?: boolean } = {}) {
  const kebabName = kebabCase(name)
  const fileEndings = ['gql', 'graphql', 'ts', 'js', ...(name !== ShopifyClientType.Admin ? ['vue'] : [])].join(',')

  return [
    `**/*.${kebabName}.{${fileEndings}}`,
    `**/${kebabName}.{${fileEndings}}`,
    `**/*.${kebabName}.{${routeMethods}}.{ts,js}`,
    `**/${kebabName}.{${routeMethods}}.{ts,js}`,
    `**/${kebabName}/**/*.{${fileEndings}}`,
    `**/${kebabName}/*.{${fileEndings}}`,
  ].map(glob => exclude ? `!${glob}` : glob)
}

export const IGNORED_DIRS = ['node_modules', 'dist', '.nuxt', '.output']

const ignoredDocuments = [...IGNORED_DIRS.map(dir => `!**/${dir}/**`), '!**/*.d.ts']

function resolveDocuments(defaults: string[]) {
  return (documents?: string[]) => [...new Set([...(documents?.length ? documents : defaults), ...ignoredDocuments])]
}

const defaultStorefrontDocuments = [
  '**/*.{gql,graphql,ts,js,vue}',

  ...getDefaultDocuments(ShopifyClientType.Admin, { exclude: true }),
  ...getDefaultDocuments(ShopifyClientType.CustomerAccount, { exclude: true }),
  ...getDefaultDocuments('customer', { exclude: true }),
  ...getDefaultDocuments('account', { exclude: true }),
]

const defaultCustomerAccountDocuments = [
  ...getDefaultDocuments(ShopifyClientType.CustomerAccount),
  ...getDefaultDocuments('customer'),
  ...getDefaultDocuments('account'),
]

const defaultAdminDocuments = getDefaultDocuments(ShopifyClientType.Admin)

const defaultCachePresets = {
  short: { maxAge: 1, staleWhileRevalidate: 9 },
  long: { maxAge: 3600, staleWhileRevalidate: 82800 },
} as Record<string, CacheOptions>

const defaultBrowserCacheOptions = { ttl: 10 * 1000 } as LRUDriverOptions
const defaultServerCacheOptions = { driver: 'lru-cache', maxSize: 32 * 1024 * 1024, maxEntrySize: 4 * 1024 * 1024 } as StorageMounts[string]
const defaultAdminTokenStorageOptions = { driver: 'memory' } as StorageMounts[string]
const defaultCustomerAccountTokenStorageOptions = { driver: 'lru-cache', max: 10_000 } as StorageMounts[string]

const defaultCacheConfig = { browser: defaultBrowserCacheOptions, server: defaultServerCacheOptions, presets: defaultCachePresets }

const defaultCustomerAccountSessionOptions = { name: DEFAULT_SESSION_NAME, maxAge: 60 * 60 * 24 * 7 }

const storageMountSchema = z.custom<StorageMounts[string] | string>()

const cacheSecondsSchema = z.number().nonnegative()

const cacheDurationSchema = z.union([
  cacheSecondsSchema,
  z.strictObject({
    seconds: cacheSecondsSchema.optional(),
    minutes: cacheSecondsSchema.optional(),
    hours: cacheSecondsSchema.optional(),
    days: cacheSecondsSchema.optional(),
  }),
])

const cachePresetSchema = z.object({
  mode: z.enum(['public', 'private']).optional(),
  maxAge: cacheDurationSchema.optional(),
  staleWhileRevalidate: cacheDurationSchema.optional(),
  staleIfError: cacheDurationSchema.optional(),
})

const clientCacheSchema = z.object({
  browser: enableable(z.custom<LRUDriverOptions>(), defaultBrowserCacheOptions),
  server: enableable(storageMountSchema, defaultServerCacheOptions),
  presets: z.record(z.string(), cachePresetSchema).optional().default(defaultCachePresets),
})

const codegenSchema = z.object({
  plugins: z.object({
    typescript: z.custom<TypeScriptPluginConfig>().optional(),
  }).optional(),
  globalTypes: z.boolean().optional().default(false),
})

const clientSchema = z.object({
  apiVersion: z.string().refine(isApiVersion, {
    error: issue => `Malformed API version "${issue.input}". Expected a quarterly version such as "${DEFAULT_API_VERSION}", or "unstable"`,
  }).optional().default(DEFAULT_API_VERSION),
  headers: z.record(z.string(), z.string()).optional(),
  retries: z.number().int().min(MIN_RETRIES).max(MAX_RETRIES).optional().default(DEFAULT_RETRIES),
  explorer: z.boolean().optional().default(true),
  documents: z.array(z.string()).optional(),
  codegen: enableable(codegenSchema, { globalTypes: false }),
})

const storefrontClientSchema = clientSchema.extend({
  publicAccessToken: z.string().optional(),
  privateAccessToken: z.string().optional(),
  buyerIpHeader: z.string().optional(),
  mock: z.boolean().optional(),

  codegen: enableable(codegenSchema.extend({ globalTypes: z.boolean().optional().default(true) }), { globalTypes: true }),
  documents: clientSchema.shape.documents.transform(resolveDocuments(defaultStorefrontDocuments)),
  proxy: z.boolean({ error: 'Expected `true` or `false`: the Storefront API proxy is always served at `/api/<version>/graphql.json`' }).optional().default(true),
  cache: enableable(clientCacheSchema, defaultCacheConfig),
})

const customerAccountSessionSchema = z.object({
  name: z.string().optional(),
  password: z.string().optional(),
  maxAge: z.number().optional(),
  cookie: z.object({
    sameSite: z.enum(['lax', 'none'], {
      error: 'Expected "lax" or "none": with "strict", sign-in fails, because the browser doesn\'t send the cookie when Shopify sends the customer back',
    }).optional(),
  }).optional(),
})

const customerAccountClientSchema = clientSchema.extend({
  clientId: z.string().optional().default(''),

  afterLogin: z.string().optional().default('/'),
  afterLogout: z.string().optional(),

  session: customerAccountSessionSchema.optional().transform(v => ({ ...defaultCustomerAccountSessionOptions, ...(v ?? {}) })),
  tokenStorage: enableable(storageMountSchema, defaultCustomerAccountTokenStorageOptions, false),

  documents: clientSchema.shape.documents.transform(resolveDocuments(defaultCustomerAccountDocuments)),
  proxy: z.boolean({ error: 'Expected `true` or `false`: the customer account proxy is always served at `/account/customer/api/<version>/graphql`' }).optional().default(true),
})

const adminClientSchema = clientSchema.extend({
  accessToken: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  refreshToken: z.string().optional(),

  tokenStorage: enableable(storageMountSchema, defaultAdminTokenStorageOptions),
  documents: clientSchema.shape.documents.transform(resolveDocuments(defaultAdminDocuments)),
})

const webhooksSchema = z.object({
  secret: z.string().optional(),

  subscriptions: z.array(z.object({
    uri: z.string(),
    topic: z.string(),
    format: z.enum(['JSON', 'XML']).optional().default('JSON'),
    filter: z.string().optional(),
    includeFields: z.array(z.string()).optional(),
    metafieldNamespaces: z.array(z.string()).optional(),
    metafields: z.array(z.object({
      key: z.string(),
      namespace: z.string().optional(),
    })).optional(),
  })).optional(),
})

const shopIdentifierSchema = z.union([z.string(), z.number()]).transform(v => String(v))

function validatedBy(create: (options: object) => unknown) {
  return (options: object | undefined, context: z.RefinementCtx) => {
    try {
      create(options ?? {})
    }
    catch (error) {
      context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : String(error) })
    }
  }
}

const cartSchema = z.custom<Pick<CreateCartServerHandlersOptions, 'fragment'>>()
  .optional()
  .superRefine(validatedBy(createCartServerHandlers))

const predictiveSearchSchema = z.custom<Omit<CreatePredictiveSearchServerHandlersOptions, 'path'>>()
  .optional()
  .refine(options => !options || !('path' in options), { error: 'The predictive search route is always served at `/api/predictive-search`, so `path` is not supported' })
  .superRefine(validatedBy(createPredictiveSearchServerHandlers))

const marketSchema = z.object({
  country: z.custom<I18nConfig['country'] | ''>(value => typeof value === 'string', { error: 'Expected a country code, such as "US"' })
    .transform(value => value.toUpperCase() as I18nConfig['country']),
  language: z.custom<I18nConfig['language'] | ''>(value => typeof value === 'string', { error: 'Expected a language code, such as "EN"' })
    .transform(value => value.toUpperCase() as I18nConfig['language']),
  currency: z.string().toUpperCase().optional(),
})

const analyticsSchema = z.object({
  autoPageView: z.boolean().optional().default(true),

  consent: z.object({
    mode: z.enum(['no-banner', 'default-banner', 'custom-banner']).optional().default('no-banner'),
  }).prefault({}),
})

export const configObjectSchema = z.object({
  name: z.string({ error: 'Shop name is required' }).min(1, { error: 'Shop name cannot be empty' }),

  origin: z.union([z.literal(''), z.url({ protocol: /^https?$/ })], {
    error: 'Expected the public origin of your app, such as "https://shop.example.com"',
  }).optional(),

  shopId: shopIdentifierSchema.refine(shopId => /^\d*$/.test(shopId), { error: 'Expected the numeric ID of your shop, such as "12345"' }).optional(),
  storefrontId: shopIdentifierSchema.optional(),
  defaultMarket: marketSchema.optional(),

  routeTemplates: z.custom<ShopifyRouteTemplates>().optional().default({}),

  cart: cartSchema,
  predictiveSearch: predictiveSearchSchema,

  clients: z.object({
    [ShopifyClientType.Storefront]: storefrontClientSchema
      .refine(client => client?.mock || client?.privateAccessToken || client?.publicAccessToken, {
        error: 'Either a public or private access token must be provided for the storefront client, or `mock: true` to use mock.shop',
      })
      .optional(),
    [ShopifyClientType.Admin]: adminClientSchema
      .refine(client => client.accessToken || (client.clientId && client.clientSecret), {
        error: 'Either an access token or both client ID and client secret must be provided for the admin client',
      })
      .optional(),
    [ShopifyClientType.CustomerAccount]: customerAccountClientSchema
      .refine(client => client.clientId, { error: 'Client ID is required for the customer account client' })
      .optional(),
  }).optional().default({}),

  errors: z.object({
    throw: z.boolean().optional().default(DEFAULT_THROW_ERRORS),
  }).prefault({}),

  fragments: z.object({
    dirs: z.array(z.string()).optional().default(['graphql']),
    autoImport: z.boolean().optional().default(true),
  }).prefault({}),

  graphql: z.object({
    generateConfig: z.boolean().optional().default(true),
    normalize: z.boolean().optional().default(true),
    injectFragments: z.boolean().optional().default(true),
  }).prefault({}),

  webhooks: webhooksSchema.optional(),

  analytics: enableable(analyticsSchema, analyticsSchema.parse({}), false),

  logger: z.custom<Partial<ConsolaOptions>>().optional(),
})

export const publicConfigSchema = configObjectSchema.omit({ clients: true, fragments: true, webhooks: true, origin: true, cart: true, predictiveSearch: true }).extend({
  clients: z.object({
    [ShopifyClientType.Storefront]: storefrontClientSchema.omit({
      privateAccessToken: true,
      buyerIpHeader: true,
      explorer: true,
      documents: true,
      codegen: true,
      cache: true,
    }).extend({
      cache: enableable(clientCacheSchema.omit({ server: true }), { browser: defaultBrowserCacheOptions, presets: defaultCachePresets }),
    }).optional(),

    [ShopifyClientType.CustomerAccount]: customerAccountClientSchema.omit({
      explorer: true,
      documents: true,
      codegen: true,
      session: true,
      tokenStorage: true,
      afterLogin: true,
      afterLogout: true,
    }).optional(),
  }).optional().default({}),
})

export function findInvalidFeatures(error: z.ZodError): string[][] | undefined {
  const features = error.issues.map(({ path }) => path.slice(0, path[0] === 'clients' ? 2 : 1).map(String))

  if (features.some(feature => !feature.length || feature[0] === 'name')) return undefined

  return [...new Map(features.map(feature => [feature.join('.'), feature])).values()]
}

export function withoutFeatures<T extends { clients?: object }>(input: T, features: string[][]): T {
  const invalid = new Set(features.map(feature => feature.join('.')))

  const keep = (prefix: string) => ([key]: [string, unknown]) => !invalid.has(`${prefix}${key}`)

  const config = Object.fromEntries(Object.entries(input).filter(keep('')))

  if (config.clients) config.clients = Object.fromEntries(Object.entries(config.clients).filter(keep('clients.')))

  return config as T
}
