# Module hooks

The module provides several hooks that can be used to customize its behavior. These hooks are available in the `hooks` property of the module configuration and within your nuxt and nitro app.

```ts
// ~/server/plugins/your-plugin.ts

export default defineNitroPlugin((nitroApp) => {
    nitroApp.hook('storefont:client:configure', ({ options }) => {
        // Modify the options of the client before it is created
        options.logger = logContent => console.log(logContent)
    })

    nitroApp.hook('storefont:client:create', ({ client }) => {
        // Do something with the client after it is created
        console.log('Storefront client created:', client)
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

| Hook                              | Arguments | Environments    | Description                                    |
| --------------------------------- | :-------: | :-------------: | ---------------------------------------------- |
| `storefront:client:configure`     | `options` | Server & Client | Called before the storefront client is created |
| `storefront:client:create`        | `client`  | Client & Client | Called after the storefront client is created  |

### Server Hooks (Runtime)

| Hook                              | Arguments | Environments | Description                                    |
| --------------------------------- | :-------: | :----------: | ---------------------------------------------- |
| `storefront:client:configure`     | `options` | Server       | Called before the storefront client is created |
| `storefront:client:create`        | `client`  | Server       | Called after the storefront client is created  |
| `admin:client:configure`          | `options` | Server       | Called before the storefront client is created |
| `admin:client:create`             | `client`  | Server       | Called after the storefront client is created  |
