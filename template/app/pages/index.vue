<template>
    <UContainer class="py-12 lg:py-16">
        <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
            Nuxt Shopify Demo Store
        </h1>

        <p class="lg:text-lg mb-12 lg:mb-16">
            This is a demo store built with Nuxt 4 and the Shopify Storefront API.
            It showcases how to build a fully functional e-commerce storefront with Nuxt UI.
        </p>

        <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
            Women's Clothing
        </h2>

        <div class="mb-12 sm:px-12 lg:mb-16">
            <CollectionSlider
                handle="women"
                :first="12"
            />
        </div>

        <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
            Mens's Clothing
        </h2>

        <div class="mb-12 sm:px-12 lg:mb-16">
            <CollectionSlider
                handle="men"
                :first="12"
            />
        </div>

        <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
            Our Collections
        </h2>

        <CollectionGrid />
    </UContainer>
</template>
