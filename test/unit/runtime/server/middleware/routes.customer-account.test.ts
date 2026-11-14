import { setResponseHeader } from 'h3'
import { withQuery } from 'ufo'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { API_VERSION } from '#test/helpers/api-version'
import {
  CLIENT_ID,
  EXPIRED,
  ORIGIN,
  SHOP_ID,
  createHttpsEvent,
  createIdToken,
  createSessionCookie,
  createShopifyConfig,
  createTokenStorages,
} from '#test/helpers/customer-account'
import { getResponseHeader, getSetCookieHeaders, toCookieHeader } from '#test/helpers/event'

const runtimeConfig: { _shopify?: Record<string, unknown> } = {}
const { storages, useTokenStorage } = createTokenStorages()

const hooks = { callHook: vi.fn<(name: string, params: Record<string, unknown>) => Promise<void>>() }

const fetchMock = vi.fn<typeof fetch>()

vi.stubGlobal('fetch', fetchMock)

vi.mock('#imports', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('#test/helpers/stubs')),
  useRuntimeConfig: () => runtimeConfig,
}))

vi.mock('nitropack/runtime', () => ({
  getRouteRules: () => ({}),
  useNitroApp: () => ({ hooks }),
  useStorage: (base: string) => useTokenStorage(base),
}))

const handler = (await import('#src/runtime/server/middleware/routes')).default
const sessionRoute = (await import('#src/runtime/server/api/customer-account/session')).default
const { applyShopifyResponseHeaders } = await import('#src/runtime/server/utils/request-context')

const TOKEN_URL = `https://shopify.com/authentication/${SHOP_ID}/oauth/token`
const STOREFRONT_API_URL = `https://test-shop.myshopify.com/api/${API_VERSION}/graphql.json`

const CART_ID = 'gid://shopify/Cart/c1'
const CART_COOKIE = 'cart=c1'

let nonce: string | null = null
let issuedIdToken: string | undefined

const tokenEndpoint = vi.fn<(body: URLSearchParams) => Response>()
const storefrontApi = vi.fn<(operation: { query: string, variables: Record<string, unknown> }) => Response>()

type SendOptions = {
  cookie?: string
  method?: string
  headers?: Record<string, string>
}

async function send(path: string, { cookie, method = 'GET', headers = {} }: SendOptions = {}) {
  const event = createHttpsEvent(cookie, { path, method, headers })

  await handler(event)

  return {
    event,
    status: event.node.res.statusCode,
    location: getResponseHeader(event, 'location'),
    cookie: toCookieHeader(event),
  }
}

async function startLogin(query = '', cookie?: string) {
  const response = await send(`/account/login${query}`, { cookie })
  const url = new URL(response.location)

  nonce = url.searchParams.get('nonce')

  return { ...response, url }
}

async function signIn(query = '?return_to=/account/orders', cookie?: string) {
  const login = await startLogin(query, cookie)

  return await send(withQuery('/account/authorize', { code: 'authorization-code', state: login.url.searchParams.get('state') }), { cookie: login.cookie })
}

function readSession(cookie: string) {
  return sessionRoute(createHttpsEvent(cookie, { path: '/account/session' }))
}

function tokenRequests(grantType: string) {
  return tokenEndpoint.mock.calls.map(([body]) => Object.fromEntries(body)).filter(body => body.grant_type === grantType)
}

function buyerIdentityUpdates() {
  return storefrontApi.mock.calls.map(([operation]) => operation).filter(({ query }) => query.includes('cartBuyerIdentityUpdate')).map(({ variables }) => variables)
}

function configure(customerAccount: Record<string, unknown> = {}) {
  const config = createShopifyConfig(customerAccount)

  runtimeConfig._shopify = { ...config, clients: { ...config.clients, storefront: { apiVersion: API_VERSION, routes: true, publicAccessToken: '' } } }
}

beforeEach(() => {
  vi.clearAllMocks()
  storages.clear()

  nonce = null
  issuedIdToken = undefined

  configure()

  hooks.callHook.mockResolvedValue()

  tokenEndpoint.mockImplementation((body) => {
    if (body.get('grant_type') !== 'authorization_code') {
      return Response.json({ access_token: 'refreshed-access-token', refresh_token: 'refreshed-refresh-token', expires_in: 3600 })
    }

    issuedIdToken = createIdToken({ nonce })

    return Response.json({ access_token: 'access-token', refresh_token: 'refresh-token', id_token: issuedIdToken, expires_in: 3600 })
  })

  storefrontApi.mockImplementation(({ query }) => query.includes('cartBuyerIdentityUpdate')
    ? Response.json({ data: { cartBuyerIdentityUpdate: { cart: { id: CART_ID }, userErrors: [] } } })
    : Response.json({ data: { cart: null } }))

  fetchMock.mockImplementation(async (input, init) => {
    if (String(input) === TOKEN_URL) return tokenEndpoint(new URLSearchParams(init?.body as URLSearchParams))
    if (String(input) === STOREFRONT_API_URL) return storefrontApi(JSON.parse(String(init?.body)))

    return new Response(null, { status: 404 })
  })
})

describe('login route', () => {
  it('sends the customer to Shopify\'s sign-in page', async () => {
    const { status, url, cookie, event } = await startLogin()

    expect(status).toBe(303)
    expect(`${url.origin}${url.pathname}`).toBe(`https://shopify.com/authentication/${SHOP_ID}/oauth/authorize`)
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: CLIENT_ID,
      redirect_uri: `${ORIGIN}/account/authorize`,
      region_country: 'US',
    })
    expect(getResponseHeader(event, 'cache-control')).toContain('no-store')
    expect(cookie).toContain('__Host-session=')
  })

  it('shows Shopify\'s sign-in page in the market of the request, whatever country its query asks for', async () => {
    runtimeConfig._shopify!.defaultMarket = { country: 'DE', language: 'DE' }

    const { url } = await startLogin('?country=FR')

    expect(url.searchParams.get('region_country')).toBe('DE')
  })
})

describe('authorize route', () => {
  it('signs the customer in, calls the success hook with the request and returns them to where they started', async () => {
    const { status, location, cookie, event } = await signIn()

    expect(status).toBe(303)
    expect(location).toBe(`${ORIGIN}/account/orders`)
    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:success', { event })
    await expect(readSession(cookie)).resolves.toEqual({ isLoggedIn: true })
  })

  it('returns to the configured page without a return path', async () => {
    configure({ afterLogin: '/welcome' })

    await expect(signIn('')).resolves.toMatchObject({ location: `${ORIGIN}/welcome` })
  })

  it('ignores a return path on another origin, returning to the configured page instead', async () => {
    configure({ afterLogin: '/welcome' })

    await expect(signIn('?return_to=https://evil.test/steal')).resolves.toMatchObject({ location: `${ORIGIN}/welcome` })
  })

  it('fails the login when the state does not match', async () => {
    const login = await startLogin()

    const { event, location, cookie } = await send(withQuery('/account/authorize', { code: 'authorization-code', state: 'forged' }), { cookie: login.cookie })

    expect(location).toBe(`${ORIGIN}/?login=failed`)
    expect(tokenEndpoint).not.toHaveBeenCalled()
    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:error', { event })
    await expect(readSession(cookie)).resolves.toEqual({ isLoggedIn: false })
  })

  it('calls the error hook when the sign-in fails with an exception', async () => {
    const login = await startLogin()

    tokenEndpoint.mockImplementation(() => {
      throw new TypeError('fetch failed')
    })

    const event = createHttpsEvent(login.cookie, { path: withQuery('/account/authorize', { code: 'authorization-code', state: login.url.searchParams.get('state') }) })

    await expect(handler(event)).rejects.toThrow()

    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:error', { event })
  })

  it('fails the login for an id token issued to another login', async () => {
    tokenEndpoint.mockImplementation(() => Response.json({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      id_token: createIdToken({ nonce: 'another-login' }),
      expires_in: 3600,
    }))

    const { location, cookie } = await signIn()

    expect(location).toBe(`${ORIGIN}/?login=failed`)
    await expect(readSession(cookie)).resolves.toEqual({ isLoggedIn: false })
  })
})

describe('refresh route', () => {
  it('refreshes the session and returns to the requested page', async () => {
    const { status, location, cookie, event: refresh } = await send('/account/refresh?return_to=/account', { cookie: await createSessionCookie(EXPIRED) })

    expect(status).toBe(303)
    expect(location).toBe(`${ORIGIN}/account`)
    expect(tokenRequests('refresh_token')).toEqual([{ grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: 'refresh-token' }])
    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:refresh', { event: refresh })

    fetchMock.mockClear()

    const { event } = await send('/account', { cookie })

    await expect(event.context._shopify!.customerAccount!.getAccessToken(event)).resolves.toBe('refreshed-access-token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves a usable session alone without calling the refresh hook', async () => {
    await send('/account/refresh', { cookie: await createSessionCookie() })

    expect(tokenRequests('refresh_token')).toEqual([])
    expect(hooks.callHook).not.toHaveBeenCalled()
  })
})

describe('logout route', () => {
  const logout = (cookie: string, path = '/account/logout', headers: Record<string, string> = { origin: ORIGIN }) =>
    send(path, { method: 'POST', cookie, headers })

  it('signs the customer out at Shopify, ends the session and calls the logout hook with the request', async () => {
    const { cookie } = await signIn()

    hooks.callHook.mockClear()

    const response = await logout(cookie)
    const url = new URL(response.location)

    expect(response.status).toBe(303)
    expect(`${url.origin}${url.pathname}`).toBe(`https://shopify.com/authentication/${SHOP_ID}/logout`)
    expect(url.searchParams.get('id_token_hint')).toBe(issuedIdToken)
    expect(url.searchParams.get('post_logout_redirect_uri')).toBe(`${ORIGIN}/`)
    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:logout', { event: response.event })
    await expect(readSession(response.cookie)).resolves.toEqual({ isLoggedIn: false })
  })

  it('reports no logout for a visitor who wasn\'t signed in', async () => {
    const response = await logout('')

    expect(response.status).toBe(303)
    expect(hooks.callHook).not.toHaveBeenCalledWith('shopify:customer-account:auth:logout', expect.anything())
  })

  it('returns to the configured page after logging out', async () => {
    configure({ afterLogout: '/goodbye' })

    const { cookie } = await signIn()

    const { location } = await logout(cookie)

    expect(new URL(location).searchParams.get('post_logout_redirect_uri')).toBe(`${ORIGIN}/goodbye`)
  })

  it.each([
    ['from another origin', { origin: 'https://evil.test' }],
    ['without an origin', {}],
  ])('refuses a logout %s', async (_, headers) => {
    const { cookie } = await signIn()

    hooks.callHook.mockClear()

    const response = await logout(cookie, '/account/logout', headers)

    expect(response.status).toBe(403)
    expect(hooks.callHook).not.toHaveBeenCalled()
    await expect(readSession(response.cookie)).resolves.toEqual({ isLoggedIn: true })
  })

  it('only logs out with a POST', async () => {
    const { cookie } = await signIn()

    const response = await send('/account/logout', { cookie, headers: { origin: ORIGIN } })

    expect(response.status).toBe(405)
    await expect(readSession(response.cookie)).resolves.toEqual({ isLoggedIn: true })
  })
})

describe('cart', () => {
  it('attaches the customer to their cart when they sign in', async () => {
    await signIn(undefined, CART_COOKIE)

    expect(buyerIdentityUpdates()).toEqual([{ cartId: CART_ID, buyerIdentity: { customerAccessToken: 'access-token' } }])
  })

  it('detaches the customer from the cart when they sign out', async () => {
    const { cookie } = await signIn(undefined, CART_COOKIE)

    storefrontApi.mockClear()

    const response = await send('/account/logout', { method: 'POST', cookie, headers: { origin: ORIGIN } })

    expect(buyerIdentityUpdates()).toEqual([{ cartId: CART_ID, buyerIdentity: { customerAccessToken: null } }])
    expect(getSetCookieHeaders(response.event).some(header => header.startsWith('cart='))).toBe(false)
  })

  it('drops the cart cookie when the cart cannot be detached on sign out', async () => {
    const { cookie } = await signIn(undefined, CART_COOKIE)

    storefrontApi.mockImplementation(() => new Response(null, { status: 500 }))

    const response = await send('/account/logout', { method: 'POST', cookie, headers: { origin: ORIGIN } })

    expect(response.status).toBe(303)
    expect(getSetCookieHeaders(response.event)).toContain('cart=; Path=/; SameSite=Lax; Max-Age=0')
  })

  it('calls the refresh hook when adding to the cart refreshes an expired session', async () => {
    storefrontApi.mockImplementation(({ query }) => query.includes('cartCreate')
      ? Response.json({ data: { cartCreate: { cart: { id: CART_ID }, userErrors: [], warnings: [] } } })
      : Response.json({ data: { cart: null } }))

    const event = createHttpsEvent(await createSessionCookie(EXPIRED), {
      path: '/api/cart',
      method: 'POST',
      headers: { origin: ORIGIN, accept: 'application/json' },
      body: { lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }] },
    })

    await handler(event)

    expect(tokenRequests('refresh_token')).toHaveLength(1)
    expect(hooks.callHook).toHaveBeenCalledExactlyOnceWith('shopify:customer-account:auth:refresh', { event })
  })
})

describe('behind a reverse proxy that rewrites the host', () => {
  const INTERNAL = { 'host': '127.0.0.1:3000', 'x-forwarded-proto': 'http' }

  beforeEach(() => {
    runtimeConfig._shopify!.origin = ORIGIN
  })

  it('signs the customer in on the configured origin', async () => {
    const login = await send('/account/login', { headers: INTERNAL })
    const loginUrl = new URL(login.location)

    expect(loginUrl.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/account/authorize`)

    nonce = loginUrl.searchParams.get('nonce')

    const { location, cookie } = await send(withQuery('/account/authorize', { code: 'authorization-code', state: loginUrl.searchParams.get('state') }), { cookie: login.cookie, headers: INTERNAL })

    expect(location).toBe(`${ORIGIN}/`)
    await expect(readSession(cookie)).resolves.toEqual({ isLoggedIn: true })
  })

  it('accepts a logout posted from the configured origin', async () => {
    const { cookie } = await signIn()

    const { status, location } = await send('/account/logout', { method: 'POST', cookie, headers: { ...INTERNAL, origin: ORIGIN } })

    expect(status).toBe(303)
    expect(new URL(location).searchParams.get('post_logout_redirect_uri')).toBe(`${ORIGIN}/`)
  })
})

describe('token storage', () => {
  it('keeps the tokens out of the cookie from sign-in to logout', async () => {
    configure({ tokenStorage: 'customer-account-token' })

    const storage = useTokenStorage('customer-account-token')

    const { cookie } = await signIn()

    expect(storage.items.size).toBe(1)
    expect([...storage.items.values()]).toEqual([expect.objectContaining({ tokens: expect.objectContaining({ accessToken: 'access-token' }) })])

    await send('/account/logout', { method: 'POST', cookie, headers: { origin: ORIGIN } })

    expect(storage.items.size).toBe(0)
  })
})

describe('server rendering', () => {
  it('renders a cached page for an anonymous visitor, although the request that triggered it is signed in', async () => {
    const { event: incoming } = await send('/', { cookie: await createSessionCookie() })

    const cachedRender = createHttpsEvent(undefined, { path: '/' })

    cachedRender.context = incoming.context

    await expect(cachedRender.context._shopify!.customerAccount!.getSession(cachedRender)).resolves.toEqual({ isLoggedIn: false })
    await expect(cachedRender.context._shopify!.customerAccount!.getAccessToken(cachedRender)).rejects.toMatchObject({ statusCode: 401 })
  })

  it.each([
    ['a signed in customer', () => createSessionCookie(), 'private, no-store, max-age=0, must-revalidate'],
    ['an anonymous visitor', () => Promise.resolve(undefined), 'public, s-maxage=60'],
  ])('sends the page of %s with the right cache headers', async (_, cookie, cacheControl) => {
    const { event } = await send('/account', { cookie: await cookie() })

    setResponseHeader(event, 'cache-control', 'public, s-maxage=60')

    await event.context._shopify!.customerAccount!.getSession(event)

    applyShopifyResponseHeaders(event)

    expect(getResponseHeader(event, 'cache-control')).toBe(cacheControl)
  })
})
