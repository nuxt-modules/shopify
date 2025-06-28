---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "nuxt-shopify"

  text: "Plug & play Shopify integration"

  tagline: "for Nuxt 3 & 4"

  actions:
    - theme: brand
      text: "Quickstart"
      link: "/quickstart"
    - theme: alt
      text: "Examples"
      link: "/examples/storefront"

  image:
    src: /logo.png
    alt: "nuxt-shopify logo"

features:
  - title: Storefront API
    icon: 🛍️
    details: "Integrate the Shopify storefront API into your Nuxt app"
    link: "/examples/storefront"
  - title: Admin API
    icon: 🔐
    details: "Connect to the Shopify admin API"
    link: "/examples/admin"
  - title: Fully Typed
    icon: 🔗
    details: "TypeScript types for your GraphQL operations on server and client"
  - title: Hot Reloading
    icon: 🔥
    details: "Automatically re-generates types when your GraphQL queries change"
  - title: Auto-Imports
    icon: 📦
    details: "Auto-imports your GraphQL queries and all generated types"
  - title: Error Handling
    icon: 🚩
    details: "Error handling optimized for Nuxt"
  - title: GraphQL Fragments
    icon: 🧩
    details: "Support for GraphQL fragments"
  - title: Hooks
    icon: 🔄
    details: "Hooks for customizing the module behavior"
  - title: Integrated Sandbox
    icon: 🧭
    details: "GraphiQL Explorer integration for testing and development"
---
