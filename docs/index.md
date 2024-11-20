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
    details: "Integrate the shopify storefront API into your nuxt app"
    link: "/examples/storefront"
  - title: Admin API
    icon: 🔐
    details: "Connect to the shopify admin API"
    link: "/examples/admin"
  - title: Typed operations
    icon: ⚡️
    details: "Fully typed GraphQL operations with hot-reloading"
  - title: GraphiQL Explorer
    icon: 🧭
    details: "Integrates the GraphiQL Explorer for faster development"
---
