# Module hooks

The module provides several hooks that can be used to customize its behavior. These hooks are available in the `hooks` property of the module configuration and within your Nuxt and nitro app.

```ts
// ~/server/plugins/your-plugin.ts

export default defineNitroPlugin((nitroApp) => {
    nitroApp.hooks.hook('storefont:client:configure', ({ config }) => {
        // Modify the config of the client before it is created
        config.logger = logContent => console.log(logContent)
    })

    nitroApp.hooks.hook('storefont:client:create', ({ client }) => {
        // Do something with the client after it is created
        console.log('Storefront client created:', client)
    })

    nitroApp.hooks.hook('storefont:client:request', ({ operation, options }) => {
        // Do something with the operation and options before the request is sent
        console.log('Storefront client request sent:', operation, options)
    })

    nitroApp.hooks.hook('storefont:client:response', ({ response, operation, options }) => {
        // Do something with the response, operations and options after a response is received
        console.log('Storefront client response received:', response, operation, options)
    })

    nitroApp.hooks.hook('storefont:client:errors', ({ errors }) => {
        // Do something with the errors
        console.log('Storefront client errors:', errors)
    })
})
```

## Hooks reference

Hooks allows you to hook into the different stages of the module lifecycle.

### Nuxt Hooks (Build Time)

| Hook                                | Arguments        | Environments | Description                                                                 |
| ----------------------------------- | :--------------: | :----------: | --------------------------------------------------------------------------- |
| `shopify:config`                    | `nuxt`, `config` | Server       | Called before the parsed module config is persisted into the runtime config |
| `storefront:generate:introspection` | `nuxt`, `config` | Server       | Called before the storefront introspection schema is generated              |
| `storefront:generate:types`         | `nuxt`, `config` | Server       | Called before the storefront types are generated                            |
| `storefront:generate:operations`    | `nuxt`, `config` | Server       | Called before the storefront operations are generated                       |
| `admin:generate:introspection`      | `nuxt`, `config` | Server       | Called before the admin introspection schema is generated                   |
| `admin:generate:types`              | `nuxt`, `config` | Server       | Called before the admin types are generated                                 |
| `admin:generate:operations`         | `nuxt`, `config` | Server       | Called before the admin operations are generated                            |

### App Hooks (Runtime)

| Hook                              | Arguments                          | Environments    | Description                                             |
| --------------------------------- | :--------------------------------: | :-------------: | ------------------------------------------------------- |
| `storefront:client:configure`     | `config`                           | Server & Client | Called before the storefront client is created          |
| `storefront:client:create`        | `client`                           | Server & Client | Called after the storefront client is created           |
| `storefront:client:request`       | `operation`, `options`             | Server & Client | Called before the storefront client sends a request     |
| `storefront:client:response`      | `response`, `operation`, `options` | Server & Client | Called after the storefront client receives a response  |
| `storefront:client:errors`        | `errors`                           | Server & Client | Called when a storefront client request contains errors |

### Server Hooks (Runtime)

| Hook                              | Arguments                          | Environments | Description                                             |
| --------------------------------- | :--------------------------------: | :----------: | ------------------------------------------------------- |
| `storefront:client:configure`     | `config`                           | Server       | Called before the storefront client is created          |
| `storefront:client:create`        | `client`                           | Server       | Called after the storefront client is created           |
| `storefront:client:request`       | `operation`, `options`             | Server       | Called before the storefront client sends a request     |
| `storefront:client:response`      | `response`, `operation`, `options` | Server       | Called after the storefront client receives a response  |
| `storefront:client:errors`        | `errors`                           | Server       | Called when a storefront client request contains errors |
| `admin:client:configure`          | `config`                           | Server       | Called before the admin client is created               |
| `admin:client:create`             | `client`                           | Server       | Called after the admin client is created                |
| `admin:client:request`            | `operation`, `options`             | Server       | Called before the admin client sends a request          |
| `admin:client:response`           | `response`, `operation`, `options` | Server       | Called after the admin client receives a response       |
| `admin:client:errors`             | `errors`                           | Server       | Called when an admin client request contains errors     |
